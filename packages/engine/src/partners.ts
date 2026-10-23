import { decreeTaxBps } from "./decrees.js";
import { type Deniers, applyBpsCeil, applyBpsFloor } from "./money.js";
import { specialtyEffects } from "./specialties.js";
import {
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldState,
  cashAccount,
  seasonEnd,
} from "./state.js";
import { turnoverOf } from "./turnover.js";
import { type Tx, addStock, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/**
 * Deals between merchants (recommendations of 20 October 2026), off without their settings.
 *
 * A commission: a merchant orders goods of the others at its price, its ducats held until a
 * seller delivers them (or given back when cancelled or expired); the sale pays the market's tax
 * and counts in the net sales as a sale at the Rialto would.
 *
 * The colleganza, after the Venetian partnership: an investor advances ducats to a merchant who
 * takes them; at term the merchant pays back the capital and a share of the net sales it made
 * meanwhile (as far as its cash allows), a share that moves from its net sales to the investor's.
 */

/** A merchant's ducats held for its commissions and its colleganze on offer. */
export function holdAccount(playerId: PlayerId): string {
  return `hold:${playerId}`;
}

export function postCommission(
  tx: Tx,
  playerId: PlayerId,
  resource: string,
  quantity: number,
  unitPrice: Deniers,
  days: number,
  to?: PlayerId,
): void {
  const rules = tx.ctx.settings.commissions;
  if (!rules) fail("unknown_resource");
  if (!tx.ctx.theme.resources.some((r) => r.code === resource)) fail("unknown_resource");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000) fail("invalid_quantity");
  if (!Number.isInteger(days) || days < 1 || days > rules.maxDays) fail("invalid_quantity");
  if (unitPrice <= 0n) fail("invalid_price");
  if (to !== undefined && (to === playerId || !tx.s.players[to])) fail("unknown_player");
  const id = nextId(tx, "k");
  const total = unitPrice * BigInt(quantity);
  transfer(tx, cashAccount(playerId), holdAccount(playerId), total, "commission_lock", id);
  tx.s.commissions ??= {};
  tx.s.commissions[id] = {
    id,
    buyer: playerId,
    resource,
    quantity,
    unitPrice,
    ...(to ? { to } : {}),
    postedAt: tx.now,
    expiresAt: tx.now + days * DAY_MS,
  };
  emit(tx, "commission_posted", playerId, { commission: id, resource, quantity });
}

function openCommission(tx: Tx, id: string) {
  const c = tx.s.commissions?.[id];
  if (!c) fail("unknown_commission");
  if (c.filledBy || c.closed || tx.now >= c.expiresAt) fail("commission_closed");
  return c;
}

export function fillCommission(tx: Tx, playerId: PlayerId, id: string): void {
  const c = openCommission(tx, id);
  if (c.buyer === playerId) fail("own_commission");
  if (c.to && c.to !== playerId) fail("not_for_you");
  removeStock(tx, playerId, c.resource, c.quantity, "commission", id);
  addStock(tx, c.buyer, c.resource, c.quantity, "commission", id);
  const gross = c.unitPrice * BigInt(c.quantity);
  transfer(tx, holdAccount(c.buyer), cashAccount(playerId), gross, "commission", id);
  // The market's tax, as at the Rialto.
  const state = tx.s as WorldState;
  const discount = specialtyEffects(tx.ctx, state, playerId).taxDiscountBps;
  const rate = decreeTaxBps(tx.ctx, state, playerId, tx.ctx.settings.marketTaxBps, tx.now);
  const tax = applyBpsCeil(gross, Math.max(0, rate - discount));
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, tax, "market_tax", id);
  c.filledBy = playerId;
  emit(tx, "commission_filled", playerId, { commission: id, buyer: c.buyer });
}

export function cancelCommission(tx: Tx, playerId: PlayerId, id: string): void {
  const c = openCommission(tx, id);
  if (c.buyer !== playerId) fail("not_owner");
  refundCommission(tx, id);
}

function refundCommission(tx: Tx, id: string): void {
  const c = tx.s.commissions?.[id];
  if (!c || c.closed || c.filledBy) return;
  transfer(
    tx,
    holdAccount(c.buyer),
    cashAccount(c.buyer),
    c.unitPrice * BigInt(c.quantity),
    "commission_refund",
    id,
  );
  c.closed = true;
}

export function offerColleganza(
  tx: Tx,
  playerId: PlayerId,
  amount: Deniers,
  days: number,
  shareBps: number,
  to?: PlayerId,
): void {
  const rules = tx.ctx.settings.colleganza;
  if (!rules) fail("invalid_quantity");
  if (amount <= 0n) fail("invalid_quantity");
  if (!Number.isInteger(days) || days < 1 || days > rules.maxDays) fail("invalid_quantity");
  if (!Number.isInteger(shareBps) || shareBps <= 0 || shareBps > rules.maxShareBps)
    fail("invalid_quantity");
  if (to !== undefined && (to === playerId || !tx.s.players[to])) fail("unknown_player");
  const id = nextId(tx, "g");
  transfer(tx, cashAccount(playerId), holdAccount(playerId), amount, "colleganza_lock", id);
  tx.s.colleganze ??= {};
  tx.s.colleganze[id] = {
    id,
    investor: playerId,
    amount,
    days,
    shareBps,
    ...(to ? { to } : {}),
    offeredAt: tx.now,
  };
  emit(tx, "colleganza_offered", playerId, { colleganza: id });
}

function openColleganza(tx: Tx, id: string) {
  const g = tx.s.colleganze?.[id];
  if (!g) fail("unknown_colleganza");
  if (g.merchant || g.settled) fail("colleganza_closed");
  return g;
}

export function acceptColleganza(tx: Tx, playerId: PlayerId, id: string): void {
  const g = openColleganza(tx, id);
  if (g.investor === playerId) fail("own_colleganza");
  if (g.to && g.to !== playerId) fail("not_for_you");
  transfer(tx, holdAccount(g.investor), cashAccount(playerId), g.amount, "colleganza_fund", id);
  g.merchant = playerId;
  g.startedAt = tx.now;
  // Never past the season's end: the ducats come back before the books close.
  g.endsAt = Math.min(tx.now + g.days * DAY_MS, seasonEnd(tx.ctx));
  g.startTurnover = turnoverOf(tx.s as WorldState, playerId);
  emit(tx, "colleganza_accepted", playerId, { colleganza: id, investor: g.investor });
}

export function cancelColleganza(tx: Tx, playerId: PlayerId, id: string): void {
  const g = openColleganza(tx, id);
  if (g.investor !== playerId) fail("not_owner");
  transfer(tx, holdAccount(playerId), cashAccount(playerId), g.amount, "colleganza_refund", id);
  g.settled = true;
}

/** Scheduled: expired commissions given back, colleganze come to term settled. */
export function settlePartners(tx: Tx): void {
  for (const c of Object.values(tx.s.commissions ?? {}).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!c.closed && !c.filledBy && tx.now >= c.expiresAt) refundCommission(tx, c.id);
    // Forgotten a week later.
    if ((c.closed || c.filledBy) && tx.now >= c.expiresAt + 7 * DAY_MS)
      delete tx.s.commissions?.[c.id];
  }
  for (const g of Object.values(tx.s.colleganze ?? {}).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (g.settled || !g.merchant || g.startedAt === undefined) continue;
    if (tx.now < (g.endsAt ?? g.startedAt + g.days * DAY_MS)) continue;
    const merchant = g.merchant;
    const cash = tx.s.accounts[cashAccount(merchant)] ?? 0n;
    const gain = turnoverOf(tx.s as WorldState, merchant) - (g.startTurnover ?? 0n);
    const share = gain > 0n ? applyBpsFloor(gain, g.shareBps) : 0n;
    const capital = cash < g.amount ? cash : g.amount;
    const left = cash - capital;
    const paidShare = left < share ? left : share;
    if (capital > 0n)
      transfer(
        tx,
        cashAccount(merchant),
        cashAccount(g.investor),
        capital,
        "colleganza_return",
        g.id,
      );
    if (paidShare > 0n)
      transfer(
        tx,
        cashAccount(merchant),
        cashAccount(g.investor),
        paidShare,
        "colleganza_share",
        g.id,
      );
    g.settled = true;
    g.paid = capital + paidShare;
    emit(tx, "colleganza_settled", g.investor, {
      colleganza: g.id,
      merchant,
      paid: (capital + paidShare).toString(),
    });
  }
}
