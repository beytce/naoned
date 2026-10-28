import { dayStartIn } from "./clock.js";
import type { Deniers } from "./money.js";
import { holdAccount } from "./partners.js";
import {
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, addStock, balance, emit, fail, transfer } from "./tx.js";

/**
 * The incanto (R11 of the audit of 27 October 2026, docs/plan-rupture.md), after the auction of
 * the Venetian galleys: at each arrival of the Muda a share of its lot is put up in a few lots, to
 * close at the Sera of that day, one after another. A bid is a maximum left ahead (one may bid in
 * the morning and be away at 20 h): the price is the second maximum and a step, never above the
 * leader's. The leader's maximum waits on its hold; passed, it comes back at once. At the close the
 * leader pays the price (it leaves the game, like the Muda's sales) and gets the goods; an unsold
 * lot goes back to the quay. A bid in the last minutes extends its lot. A merchant leads one lot
 * of a Sera at most. Off without its settings.
 */

export type IncantoRules = NonNullable<WorldContext["settings"]["incanto"]>;

export interface IncantoLot {
  id: string;
  goods: Record<string, number>;
  /** The goods at their reference: what the opening price is a share of. */
  value: Deniers;
  /** The Sera it belongs to (its day's start, Paris). */
  sera: number;
  closesAt: number;
  /** Each bidder's maximum. */
  bids: Record<PlayerId, Deniers>;
  leader?: PlayerId;
  /** Settled: who won it (null: unsold, back on the quay) and at what price. */
  done?: { winner: PlayerId | null; price: Deniers };
}

/** The lots of the incanto, the soonest to close first. */
export function incantoLots(state: WorldState): IncantoLot[] {
  return Object.values(state.incanto?.lots ?? {}).sort(
    (a, b) => a.closesAt - b.closesAt || a.id.localeCompare(b.id),
  );
}

const share = (amount: Deniers, bps: number) => (amount * BigInt(bps)) / 10_000n;

/** The lot's price now: its opening, or the second maximum and a step, never above the leader's. */
export function incantoPrice(ctx: WorldContext, lot: IncantoLot): Deniers {
  const rules = ctx.settings.incanto;
  const start = share(lot.value, rules?.startBps ?? 10_000);
  if (lot.done) return lot.done.price;
  const lead = lot.leader ? (lot.bids[lot.leader] ?? 0n) : 0n;
  const others = Object.entries(lot.bids)
    .filter(([id]) => id !== lot.leader)
    .map(([, max]) => max);
  if (others.length === 0) return start;
  const second = others.reduce((a, b) => (b > a ? b : a));
  const stepped = second + share(second, rules?.stepBps ?? 0);
  const price = stepped > start ? stepped : start;
  return price < lead ? price : lead;
}

/** The least a new maximum must reach on this lot. */
export function incantoMinimum(ctx: WorldContext, lot: IncantoLot): Deniers {
  const price = incantoPrice(ctx, lot);
  if (!lot.leader) return price;
  return price + share(price, ctx.settings.incanto?.stepBps ?? 0);
}

/**
 * At an arrival of the Muda (from `arriveMuda`): `shareBps` of each good taken off the quay and
 * spread over `lots` lots, closing at the Sera of the arrival's day.
 */
export function openIncanto(tx: Tx, arrival: number, at: number): void {
  const rules = tx.ctx.settings.incanto;
  const muda = tx.s.muda;
  if (!rules || !muda || rules.lots <= 0) return;
  const day = dayStartIn(at).start;
  const goods: Record<string, number>[] = Array.from({ length: rules.lots }, () => ({}));
  for (const [resource, stock] of Object.entries(muda.stock).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const taken = Math.floor((stock * rules.shareBps) / 10_000);
    if (taken <= 0) continue;
    muda.stock[resource] = stock - taken;
    for (let i = 0; i < rules.lots; i++) {
      const n = Math.floor(taken / rules.lots) + (i < taken % rules.lots ? 1 : 0);
      const lot = goods[i];
      if (n > 0 && lot) lot[resource] = n;
    }
  }
  tx.s.incanto ??= { lots: {} };
  goods.forEach((g, i) => {
    if (Object.keys(g).length === 0) return;
    const id = `${arrival}:${i}`;
    let value = 0n;
    for (const [r, n] of Object.entries(g))
      value += (tx.ctx.settings.referencePrices[r] ?? 0n) * BigInt(n);
    const closesAt =
      day + (rules.hour * 60 + rules.firstMinute + i * rules.everyMinutes) * MINUTE_MS;
    (tx.s.incanto as NonNullable<WorldState["incanto"]>).lots[id] = {
      id,
      goods: g,
      value,
      sera: day,
      closesAt,
      bids: {},
    };
  });
  emit(tx, "incanto_opened", undefined, { arrival, lots: goods.length });
}

/** Lots of the same Sera a merchant leads, this one aside. */
function ledElsewhere(state: WorldState, playerId: PlayerId, lot: IncantoLot): number {
  return incantoLots(state).filter(
    (l) =>
      l.id !== lot.id &&
      l.sera === lot.sera &&
      (l.done ? l.done.winner === playerId : l.leader === playerId),
  ).length;
}

/** A merchant's maximum on a lot. */
export function bidIncanto(tx: Tx, playerId: PlayerId, lotId: string, max: Deniers): void {
  const rules = tx.ctx.settings.incanto;
  if (!rules) fail("incanto_off");
  if (!tx.s.players[playerId]) fail("unknown_player");
  const lot = tx.s.incanto?.lots[lotId] as IncantoLot | undefined;
  if (!lot) fail("unknown_lot");
  if (lot.done || tx.now >= lot.closesAt) fail("lot_closed");
  if (typeof max !== "bigint" || max <= 0n) fail("invalid_quantity");
  const state = tx.s as WorldState;
  const leading = lot.leader === playerId;
  if (!leading && ledElsewhere(state, playerId, lot) >= rules.perPlayer) fail("one_lot");
  const held = leading ? (lot.bids[playerId] ?? 0n) : 0n;
  if (leading) {
    if (max <= held) fail("bid_too_low");
  } else if (max < incantoMinimum(tx.ctx, lot)) fail("bid_too_low");
  const lead = lot.leader ? (lot.bids[lot.leader] ?? 0n) : 0n;
  if (leading || max > lead) {
    // The new leader's maximum waits on its hold; the one passed comes back.
    const more = max - held;
    if (balance(tx, cashAccount(playerId)) < more) fail("insufficient_funds");
    transfer(tx, cashAccount(playerId), holdAccount(playerId), more, "incanto_lock", lot.id);
    if (lot.leader && lot.leader !== playerId) {
      transfer(
        tx,
        holdAccount(lot.leader),
        cashAccount(lot.leader),
        lead,
        "incanto_refund",
        lot.id,
      );
      emit(tx, "incanto_outbid", lot.leader, { lot: lot.id, by: playerId });
    }
    lot.leader = playerId;
  }
  lot.bids[playerId] = max;
  // A bid in the last minutes: the lot waits a little longer.
  const extend = rules.extendMinutes * MINUTE_MS;
  if (lot.closesAt - tx.now < extend) lot.closesAt = tx.now + extend;
  emit(tx, "incanto_bid", playerId, { lot: lot.id });
}

/**
 * Scheduled: the lots whose hour has come close. The leader pays the price out of its hold (the
 * rest comes back) and gets the goods; an unsold lot goes back to the quay. Lots settled two days
 * ago are forgotten.
 */
export function closeIncantoLots(tx: Tx): void {
  const incanto = tx.s.incanto;
  if (!incanto) return;
  const forget = new Set<string>();
  for (const lot of incantoLots(tx.s as WorldState)) {
    if (lot.done) {
      if (tx.now - lot.closesAt > 2 * 24 * 60 * MINUTE_MS) forget.add(lot.id);
      continue;
    }
    if (tx.now < lot.closesAt) continue;
    const live = incanto.lots[lot.id] as IncantoLot;
    const winner = live.leader ?? null;
    const price = incantoPrice(tx.ctx, live);
    if (winner) {
      const max = live.bids[winner] ?? 0n;
      transfer(tx, holdAccount(winner), SINK_ACCOUNT, price, "incanto", lot.id);
      if (max > price)
        transfer(
          tx,
          holdAccount(winner),
          cashAccount(winner),
          max - price,
          "incanto_refund",
          lot.id,
        );
      for (const [r, n] of Object.entries(live.goods))
        addStock(tx, winner, r, n, "incanto", lot.id);
      emit(tx, "incanto_won", winner, { lot: lot.id, price: price.toString(), goods: live.goods });
    } else if (tx.s.muda) {
      for (const [r, n] of Object.entries(live.goods))
        tx.s.muda.stock[r] = (tx.s.muda.stock[r] ?? 0) + n;
    }
    live.done = { winner, price: winner ? price : 0n };
  }
  if (forget.size > 0)
    incanto.lots = Object.fromEntries(
      Object.entries(incanto.lots).filter(([id]) => !forget.has(id)),
    );
}
