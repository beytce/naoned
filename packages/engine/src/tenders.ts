import { draw } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type Tender,
  type WorldState,
  cashAccount,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/**
 * The Doge's tenders (recommendations of 20 October 2026): every few days the Doge asks for a
 * quantity of a good, under a ceiling price. Merchants bid sealed, a price and a quantity, and
 * lock a caution. At the close the cheapest bids win, up to the quantity; the others get their
 * caution back. A winner delivers from the counter before the deadline, paid its own price and
 * given its caution back; one who does not loses the caution, destroyed. Off without settings.
 */

/** The account holding the cautions of a tender. */
export function tenderAccount(tenderId: string): string {
  return `tender:${tenderId}`;
}

/** The tenders open to bids now. */
export function openTenders(state: WorldState, now: number): Tender[] {
  return Object.values(state.tenders ?? {})
    .filter((t) => t.openedAt <= now && now < t.closeAt)
    .sort((a, b) => a.openedAt - b.openedAt);
}

/** The caution of a bid: its share of what the bid is worth. */
function cautionOf(tx: Tx, price: Deniers, quantity: number): Deniers {
  const rules = tx.ctx.settings.tenders;
  return applyBpsFloor(price * BigInt(quantity), rules?.cautionBps ?? 0);
}

/** Scheduled: opens the tenders due, awards those whose bidding closed, forfeits the late. */
export function runTenders(tx: Tx): void {
  const rules = tx.ctx.settings.tenders;
  if (!rules) return;
  const goods = Object.keys(rules.quantity).sort();
  const end = seasonEnd(tx.ctx);
  let openedAt = tx.s.nextTenderAt ?? tx.ctx.startAt;
  while (goods.length > 0 && openedAt <= tx.now && openedAt < end) {
    const n = draw(tx.ctx, `tender:${openedAt}`);
    const resource = goods[n % goods.length] ?? "";
    const [min, max] = rules.quantity[resource] ?? [1, 1];
    const quantity = min + (Math.floor(n / goods.length) % (max - min + 1));
    const id = nextId(tx, "t");
    const closeAt = openedAt + rules.bidHours * HOUR_MS;
    tx.s.tenders ??= {};
    tx.s.tenders[id] = {
      id,
      resource,
      quantity,
      ceiling: applyBpsFloor(tx.ctx.settings.referencePrices[resource] ?? 0n, rules.ceilingBps),
      openedAt,
      closeAt,
      deadline: closeAt + rules.deliverHours * HOUR_MS,
      bids: {},
    };
    emit(tx, "tender_opened", undefined, { tender: id, resource, quantity });
    openedAt += rules.everyDays * DAY_MS;
    tx.s.nextTenderAt = openedAt;
  }
  for (const t of Object.values(tx.s.tenders ?? {}).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!t.awarded && tx.now >= t.closeAt) award(tx, t);
    if (t.awarded && !t.settled && tx.now >= t.deadline) forfeit(tx, t);
    // Forgotten a week after its deadline.
    if (t.settled && tx.now >= t.deadline + 7 * DAY_MS) delete tx.s.tenders?.[t.id];
  }
}

/** The cheapest bids win, the earliest first at the same price, up to the quantity asked. */
function award(tx: Tx, t: Tender): void {
  const bids = Object.entries(t.bids).sort(
    ([pa, a], [pb, b]) =>
      (a.price === b.price ? 0 : a.price < b.price ? -1 : 1) || a.at - b.at || pa.localeCompare(pb),
  );
  let left = t.quantity;
  t.awarded = {};
  for (const [playerId, b] of bids) {
    const quantity = Math.min(left, b.quantity);
    left -= quantity;
    const caution = quantity > 0 ? cautionOf(tx, b.price, quantity) : 0n;
    const back = b.caution - caution;
    if (back > 0n)
      transfer(tx, tenderAccount(t.id), cashAccount(playerId), back, "tender_refund", t.id);
    if (quantity > 0) t.awarded[playerId] = { quantity, price: b.price, caution, delivered: false };
  }
  if (Object.keys(t.awarded).length === 0) t.settled = true;
  emit(tx, "tender_awarded", undefined, {
    tender: t.id,
    resource: t.resource,
    winners: Object.entries(t.awarded).map(([playerId, a]) => ({
      playerId,
      quantity: a.quantity,
      price: a.price.toString(),
    })),
  });
}

/** The deadline passed: the cautions of the winners who did not deliver leave the game. */
function forfeit(tx: Tx, t: Tender): void {
  for (const [playerId, a] of Object.entries(t.awarded ?? {}).sort(([x], [y]) =>
    x.localeCompare(y),
  )) {
    if (a.delivered || a.caution <= 0n) continue;
    transfer(tx, tenderAccount(t.id), SINK_ACCOUNT, a.caution, "tender_forfeit", t.id);
    emit(tx, "tender_forfeited", playerId, { tender: t.id, caution: a.caution.toString() });
  }
  t.settled = true;
}

/** A sealed bid: a unit price under the ceiling and a quantity; replaces the merchant's last. */
export function bidTender(
  tx: Tx,
  playerId: PlayerId,
  tenderId: string,
  price: Deniers,
  quantity: number,
): void {
  const t = tx.s.tenders?.[tenderId];
  if (!t) fail("unknown_tender");
  if (tx.now < t.openedAt || tx.now >= t.closeAt) fail("tender_closed");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > t.quantity)
    fail("invalid_quantity");
  if (price <= 0n) fail("invalid_price");
  if (price > t.ceiling) fail("over_ceiling");
  const old = t.bids[playerId];
  if (old && old.caution > 0n)
    transfer(tx, tenderAccount(t.id), cashAccount(playerId), old.caution, "tender_refund", t.id);
  const caution = cautionOf(tx, price, quantity);
  if (caution > 0n)
    transfer(tx, cashAccount(playerId), tenderAccount(t.id), caution, "tender_caution", t.id);
  t.bids[playerId] = { price, quantity, caution, at: tx.now };
  emit(tx, "tender_bid", playerId, { tender: t.id });
}

/** A winner delivers from the counter: paid its price for its quantity, its caution back. */
export function deliverTender(tx: Tx, playerId: PlayerId, tenderId: string): void {
  const t = tx.s.tenders?.[tenderId];
  if (!t) fail("unknown_tender");
  const a = t.awarded?.[playerId];
  if (a?.delivered) fail("already_delivered");
  if (t.settled || tx.now >= t.deadline) fail("tender_closed");
  if (!a) fail("not_awarded");
  removeStock(tx, playerId, t.resource, a.quantity, "tender_delivery", t.id);
  transfer(
    tx,
    SOURCE_ACCOUNT,
    cashAccount(playerId),
    a.price * BigInt(a.quantity),
    "tender_delivery",
    t.id,
  );
  if (a.caution > 0n)
    transfer(tx, tenderAccount(t.id), cashAccount(playerId), a.caution, "tender_refund", t.id);
  a.delivered = true;
  if (Object.values(t.awarded ?? {}).every((x) => x.delivered)) t.settled = true;
  emit(tx, "tender_delivered", playerId, { tender: t.id, quantity: a.quantity });
}
