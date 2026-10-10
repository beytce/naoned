import { placeOrder, removeMarketMakerOrders } from "./market.js";
import { type Deniers, applyBpsCeil, applyBpsFloor, bigMax } from "./money.js";
import {
  DAY_MS,
  MARKET_MAKER,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  dayIndex,
} from "./state.js";
import type { Tx } from "./tx.js";
import { stockUnitValue } from "./valuation.js";

/** Current spread in bps: widens linearly from start to end over the ramp, then stays there. */
export function marketMakerSpreadBps(ctx: WorldContext, now: number): number {
  const mm = ctx.settings.marketMaker;
  const elapsed = Math.max(0, now - ctx.startAt);
  const ramp = mm.spreadRampDays * DAY_MS;
  if (elapsed >= ramp) return mm.spreadEndBps;
  return Math.floor(mm.spreadStartBps + ((mm.spreadEndBps - mm.spreadStartBps) * elapsed) / ramp);
}

export function marketMakerQuotes(
  ctx: WorldContext,
  reference: Deniers,
  now: number,
): { bid: Deniers; ask: Deniers } {
  const half = Math.floor(marketMakerSpreadBps(ctx, now) / 2);
  // Rounded away from the reference: the market maker never quotes inside its spread.
  return {
    bid: applyBpsFloor(reference, 10_000 - half),
    ask: applyBpsCeil(reference, 10_000 + half),
  };
}

/**
 * Price the market maker quotes around: the reference price, or the recent market price when it
 * is lower (prudence principle, as for valuation). It never follows the market up, so it cannot
 * be pushed into buying high, and it does not prop up a price the players have abandoned.
 */
export function marketMakerReference(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  now: number,
): Deniers {
  const reference = ctx.settings.referencePrices[resource] ?? 0n;
  const floor = applyBpsFloor(reference, ctx.settings.marketMaker.referenceFloorBps);
  return bigMax(floor, stockUnitValue(ctx, state, resource, now));
}

/**
 * Replaces the market maker's quotes. Its depth per day is capped per active player, so players
 * set prices whenever they trade inside its spread.
 */
export function requoteMarketMaker(tx: Tx): void {
  const { ctx } = tx;
  removeMarketMakerOrders(tx);
  const day = dayIndex(ctx, tx.now);
  if (tx.s.marketMaker.day !== day) {
    tx.s.marketMaker = { day, bought: {}, sold: {} };
  }
  const players = Math.max(1, activePlayerCount(ctx, tx.s, tx.now));
  for (const resource of Object.keys(ctx.settings.referencePrices)) {
    const reference = marketMakerReference(ctx, tx.s as WorldState, resource, tx.now);
    const mm = ctx.settings.marketMaker;
    const depth = Math.max(
      (mm.dailyDepthPerPlayer[resource] ?? 0) * players,
      mm.minDailyDepth[resource] ?? 0,
    );
    const { bid, ask } = marketMakerQuotes(ctx, reference, tx.now);
    const bidQty = depth - (tx.s.marketMaker.bought[resource] ?? 0);
    const askQty = depth - (tx.s.marketMaker.sold[resource] ?? 0);
    if (bidQty > 0) {
      placeOrder(tx, {
        playerId: MARKET_MAKER,
        resource,
        side: "buy",
        kind: "limit",
        price: bid,
        quantity: bidQty,
      });
    }
    if (askQty > 0) {
      placeOrder(tx, {
        playerId: MARKET_MAKER,
        resource,
        side: "sell",
        kind: "limit",
        price: ask,
        quantity: askQty,
      });
    }
  }
}
