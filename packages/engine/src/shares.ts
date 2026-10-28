import { type Deniers, applyBpsCeil } from "./money.js";
import { holdAccount } from "./partners.js";
import {
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  seasonEnd,
} from "./state.js";
import { type EngineErrorCode, type Tx, emit, fail, nextId, transfer } from "./tx.js";
import type { WeeklyStanding } from "./weekly.js";

/**
 * The parts of a house (R9, docs/plan-rupture.md), off without their settings.
 *
 * From day `fromDay`, a house of the people `minDays` in the world may list itself: 100 parts, of
 * which the founder always keeps all but `float`. Its parts trade on its own little book — limit
 * orders, the price of the order that waited, the market's tax on the seller — the buyers' ducats
 * held aside (`hold:`, never the Rialto's escrow), the sellers' parts reserved by their orders.
 * Raising ducats this way is no sale. Each week the holders share `dividendBps` of what the house
 * gained in net sales, pro rata, as far as its cash goes (the dividend moves net sales from the
 * house to its holders, as a colleganza's share does). `councilShares` parts sit on its council.
 * The month's last day, before the ranking closes, the book shuts and the house buys every part
 * back at the last price, as far as its cash goes, the rest lost pro rata.
 */

export const SHARES = 100;

export interface ShareOrder {
  id: string;
  house: PlayerId;
  player: PlayerId;
  side: "buy" | "sell";
  price: Deniers;
  /** Parts still wanted or offered. */
  quantity: number;
  at: number;
}

export interface HouseShares {
  listedAt: number;
  /** Parts per holder, the founder's own among them; always 100 in all. */
  holders: Record<PlayerId, number>;
  lastPrice?: Deniers;
  orders: Record<string, ShareOrder>;
  /** Dividends paid this month, per holder. */
  dividends?: Record<PlayerId, Deniers>;
}

const lastDay = (ctx: WorldContext) => seasonEnd(ctx) - DAY_MS;

function rulesOf(ctx: WorldContext) {
  const rules = ctx.settings.shares;
  if (!rules) fail("shares_off");
  return rules;
}

/** Why a merchant may not list its house now, or null when it may. */
export function listingRefusal(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): EngineErrorCode | null {
  const rules = ctx.settings.shares;
  if (!rules) return "shares_off";
  if (dayIndex(ctx, now) < rules.fromDay) return "too_early";
  if (now >= lastDay(ctx)) return "season_over";
  const player = state.players[playerId];
  if (!player) return "unknown_player";
  if (player.npc) return "not_for_npc";
  if (now - player.joinedAt < rules.minDays * DAY_MS) return "too_new";
  if (state.shares?.[playerId]) return "already_listed";
  return null;
}

export function listHouse(tx: Tx, playerId: PlayerId): void {
  const refused = listingRefusal(tx.ctx, tx.s as WorldState, playerId, tx.now);
  if (refused) fail(refused);
  tx.s.shares ??= {};
  tx.s.shares[playerId] = { listedAt: tx.now, holders: { [playerId]: SHARES }, orders: {} };
  emit(tx, "house_listed", playerId);
}

/** Parts a holder may still offer: what it holds, less its open sales and the founder's 51. */
function freeShares(ctx: WorldContext, book: HouseShares, house: PlayerId, playerId: PlayerId) {
  const offered = Object.values(book.orders)
    .filter((o) => o.player === playerId && o.side === "sell")
    .reduce((s, o) => s + o.quantity, 0);
  const kept = playerId === house ? SHARES - (ctx.settings.shares?.float ?? 0) : 0;
  return (book.holders[playerId] ?? 0) - offered - kept;
}

function moveShares(book: HouseShares, house: PlayerId, from: PlayerId, to: PlayerId, n: number) {
  book.holders[from] = (book.holders[from] ?? 0) - n;
  book.holders[to] = (book.holders[to] ?? 0) + n;
  for (const id of [from, to]) if (id !== house && book.holders[id] === 0) delete book.holders[id];
}

export function placeShareOrder(
  tx: Tx,
  playerId: PlayerId,
  house: PlayerId,
  side: "buy" | "sell",
  price: Deniers,
  quantity: number,
): void {
  const rules = rulesOf(tx.ctx);
  if (tx.now >= lastDay(tx.ctx)) fail("season_over");
  if (!tx.s.players[playerId]) fail("unknown_player");
  const book = tx.s.shares?.[house];
  if (!book) fail("not_listed");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > SHARES) fail("invalid_quantity");
  if (price <= 0n) fail("invalid_price");
  const open = Object.values(tx.s.shares ?? {}).reduce(
    (n, b) => n + Object.values(b.orders).filter((o) => o.player === playerId).length,
    0,
  );
  if (open >= rules.maxOpenOrders) fail("max_open_orders");
  const id = nextId(tx, "p");
  if (side === "sell") {
    if (quantity > freeShares(tx.ctx, book, house, playerId))
      fail(playerId === house ? "over_float" : "insufficient_shares");
  } else {
    transfer(
      tx,
      cashAccount(playerId),
      holdAccount(playerId),
      price * BigInt(quantity),
      "share_lock",
      id,
    );
  }
  const order: ShareOrder = { id, house, player: playerId, side, price, quantity, at: tx.now };
  // The orders that waited on the other side, best price first, then the oldest.
  const waiting = Object.values(book.orders)
    .filter((o) => o.side !== side && o.player !== playerId)
    .filter((o) => (side === "buy" ? o.price <= price : o.price >= price))
    .sort((a, b) =>
      a.price !== b.price
        ? (side === "buy" ? a.price < b.price : a.price > b.price)
          ? -1
          : 1
        : a.at - b.at || (a.id < b.id ? -1 : 1),
    );
  const council = tx.ctx.settings.shares?.councilShares ?? SHARES;
  for (const w of waiting) {
    if (order.quantity === 0) break;
    const n = Math.min(order.quantity, w.quantity);
    const [buy, sell] = side === "buy" ? [order, w] : [w, order];
    const gross = w.price * BigInt(n);
    transfer(tx, holdAccount(buy.player), cashAccount(sell.player), gross, "share_trade", id);
    // A buyer that offered more than the price paid gets the rest back.
    const over = (buy.price - w.price) * BigInt(n);
    transfer(tx, holdAccount(buy.player), cashAccount(buy.player), over, "share_release", id);
    const tax = applyBpsCeil(gross, tx.ctx.settings.marketTaxBps);
    transfer(tx, cashAccount(sell.player), SINK_ACCOUNT, tax, "share_tax", id);
    const before = book.holders[buy.player] ?? 0;
    moveShares(book, house, sell.player, buy.player, n);
    book.lastPrice = w.price;
    order.quantity -= n;
    w.quantity -= n;
    if (w.quantity === 0) delete book.orders[w.id];
    emit(tx, "shares_traded", house, {
      buyer: buy.player,
      seller: sell.player,
      quantity: n,
      price: w.price.toString(),
    });
    if (buy.player !== house && before < council && before + n >= council)
      emit(tx, "council_seat", house, { holder: buy.player });
  }
  if (order.quantity > 0) book.orders[id] = order;
}

function closeOrder(tx: Tx, book: HouseShares, order: ShareOrder): void {
  if (order.side === "buy")
    transfer(
      tx,
      holdAccount(order.player),
      cashAccount(order.player),
      order.price * BigInt(order.quantity),
      "share_release",
      order.id,
    );
  delete book.orders[order.id];
}

export function cancelShareOrder(tx: Tx, playerId: PlayerId, orderId: string): void {
  const book = Object.values(tx.s.shares ?? {}).find((b) => b.orders[orderId]);
  const order = book?.orders[orderId];
  if (!book || !order) fail("unknown_order");
  if (order.player !== playerId) fail("not_owner");
  closeOrder(tx, book, order);
}

/**
 * At the week's close (`closeWeek`, the week's gains known): each listed house shares
 * `dividendBps` of what it gained, pro rata of the parts, no more than its cash.
 */
export function payDividends(tx: Tx, standings: WeeklyStanding[]): void {
  const rules = tx.ctx.settings.shares;
  if (!rules || !tx.s.shares) return;
  const gains = new Map(standings.map((s) => [s.playerId, s.gain]));
  for (const house of Object.keys(tx.s.shares).sort()) {
    const book = tx.s.shares[house];
    const gain = gains.get(house) ?? 0n;
    if (!book || gain <= 0n) continue;
    const due = Object.entries(book.holders)
      .filter(([id, n]) => id !== house && n > 0)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([id, n]) => [id, (gain * BigInt(rules.dividendBps) * BigInt(n)) / 1_000_000n] as const);
    const paid = payOut(tx, house, due, "share_dividend");
    if (paid === 0n) continue;
    book.dividends ??= {};
    for (const [id, amount] of due) book.dividends[id] = (book.dividends[id] ?? 0n) + amount;
    emit(tx, "share_dividend", house, { paid: paid.toString(), holders: owed(due) });
  }
}

/** What each holder was paid, for the notices. */
const owed = (due: (readonly [PlayerId, Deniers])[]) =>
  Object.fromEntries(due.filter(([, d]) => d > 0n).map(([id, d]) => [id, d.toString()]));

/**
 * Pays each holder its due from the house's cash; short of it, pro rata (rounded down). The dues
 * are scaled in place to what was paid; returns the total.
 */
function payOut(
  tx: Tx,
  house: PlayerId,
  due: (readonly [PlayerId, Deniers])[],
  reason: "share_dividend" | "share_settle",
): Deniers {
  const total = due.reduce((s, [, d]) => s + d, 0n);
  const cash = tx.s.accounts[cashAccount(house)] ?? 0n;
  let paid = 0n;
  for (let k = 0; k < due.length; k++) {
    const [id, d] = due[k] as readonly [PlayerId, Deniers];
    const amount = total > cash ? (d * cash) / total : d;
    transfer(tx, cashAccount(house), cashAccount(id), amount, reason, house);
    due[k] = [id, amount];
    paid += amount;
  }
  return paid;
}

/**
 * Scheduled, the month's last day before its ranking closes: every book shut, its buyers' ducats
 * given back, and every part bought back by its house at the last price, as far as its cash goes.
 */
export function settleShares(tx: Tx): void {
  if (!tx.s.shares || tx.s.sharesSettled || tx.now < lastDay(tx.ctx)) return;
  for (const house of Object.keys(tx.s.shares).sort()) {
    const book = tx.s.shares[house];
    if (!book) continue;
    for (const o of Object.values(book.orders).sort((a, b) => (a.id < b.id ? -1 : 1)))
      closeOrder(tx, book, o);
    const price = book.lastPrice ?? 0n;
    const out = Object.entries(book.holders)
      .filter(([id, n]) => id !== house && n > 0)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    const due = out.map(([id, n]) => [id, price * BigInt(n)] as const);
    const paid = payOut(tx, house, due, "share_settle");
    for (const [id, n] of out) moveShares(book, house, id, house, n);
    if (out.length > 0)
      emit(tx, "shares_settled", house, { paid: paid.toString(), holders: owed(due) });
  }
  tx.s.sharesSettled = true;
}

/** A holder of `councilShares` parts sits on the house's council and sees its accounts. */
export function councilOf(
  ctx: WorldContext,
  state: WorldState,
  house: PlayerId,
  playerId: PlayerId,
): boolean {
  const rules = ctx.settings.shares;
  if (!rules || playerId === house) return false;
  return (state.shares?.[house]?.holders[playerId] ?? 0) >= rules.councilShares;
}

/** A listed house's book: its holders (most parts first), its last price, its open orders. */
export function houseBoard(state: WorldState, house: PlayerId) {
  const book = state.shares?.[house];
  if (!book) return null;
  const orders = Object.values(book.orders);
  const byPrice = (side: "buy" | "sell") =>
    orders
      .filter((o) => o.side === side)
      .sort((a, b) =>
        a.price === b.price
          ? a.at - b.at
          : (side === "buy" ? a.price > b.price : a.price < b.price)
            ? -1
            : 1,
      );
  return {
    listedAt: book.listedAt,
    lastPrice: book.lastPrice ?? null,
    holders: Object.entries(book.holders)
      .map(([playerId, shares]) => ({ playerId, shares }))
      .sort((a, b) => b.shares - a.shares || (a.playerId < b.playerId ? -1 : 1)),
    bids: byPrice("buy"),
    asks: byPrice("sell"),
    float: SHARES - (book.holders[house] ?? 0),
  };
}

/** The parts a merchant holds in other houses. */
export function sharesHeld(state: WorldState, playerId: PlayerId) {
  return Object.entries(state.shares ?? {})
    .filter(([house, b]) => house !== playerId && (b.holders[playerId] ?? 0) > 0)
    .map(([house, b]) => ({
      house,
      shares: b.holders[playerId] ?? 0,
      lastPrice: b.lastPrice ?? null,
      dividends: b.dividends?.[playerId] ?? 0n,
    }));
}
