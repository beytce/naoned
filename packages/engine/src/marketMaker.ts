import { placeOrder, playerQuota, removeMarketMakerOrders } from "./market.js";
import { type Deniers, applyBpsCeil, applyBpsFloor, bigMax } from "./money.js";
import { isMudaGood, mudaPrice } from "./muda.js";
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
  // Supply and demand: the price the Dogana's own trades have set.
  if (ctx.settings.marketMaker.drift) {
    return applyBpsFloor(reference, state.marketMaker.anchorBps?.[resource] ?? 10_000);
  }
  const floor = applyBpsFloor(reference, ctx.settings.marketMaker.referenceFloorBps);
  return bigMax(floor, stockUnitValue(ctx, state, resource, now));
}

/** Daily depth of the market maker for a resource (each direction). */
function dailyDepth(ctx: WorldContext, resource: string, players: number): number {
  const mm = ctx.settings.marketMaker;
  return Math.max(
    (mm.dailyDepthPerPlayer[resource] ?? 0) * players,
    mm.minDailyDepth[resource] ?? 0,
  );
}

/**
 * The day closed: each price moves with what the Dogana sold (demand) less what it bought
 * (supply), as a share of its depth, by a step at most, within bounds; and it comes back part of
 * the way to the reference.
 */
function driftAnchors(tx: Tx, players: number): Record<string, number> | undefined {
  const drift = tx.ctx.settings.marketMaker.drift;
  const usage = tx.s.marketMaker;
  if (!drift) return usage.anchorBps;
  const anchors = { ...(usage.anchorBps ?? {}) };
  for (const resource of Object.keys(tx.ctx.settings.referencePrices)) {
    const sold = usage.sold[resource] ?? 0;
    const bought = usage.bought[resource] ?? 0;
    const scale = Math.max(sold + bought, dailyDepth(tx.ctx, resource, players), 1);
    const step = Math.trunc((drift.stepBps * (sold - bought)) / scale);
    const was = anchors[resource] ?? 10_000;
    const back = Math.trunc(((10_000 - was) * drift.revertBps) / 10_000);
    const next = Math.min(drift.maxBps, Math.max(drift.minBps, was + back + step));
    if (next === 10_000) delete anchors[resource];
    else anchors[resource] = next;
  }
  return anchors;
}

/**
 * Replaces the market maker's quotes. Its depth per day is capped per active player, so players
 * set prices whenever they trade inside its spread.
 */
export function requoteMarketMaker(tx: Tx): void {
  const { ctx } = tx;
  removeMarketMakerOrders(tx);
  const day = dayIndex(ctx, tx.now);
  const players = Math.max(1, activePlayerCount(ctx, tx.s, tx.now));
  if (tx.s.marketMaker.day !== day) {
    const anchorBps = driftAnchors(tx, players);
    tx.s.marketMaker = {
      day,
      bought: {},
      sold: {},
      byPlayer: {},
      ...(anchorBps ? { anchorBps } : {}),
    };
  }
  for (const resource of Object.keys(ctx.settings.referencePrices)) {
    const reference = marketMakerReference(ctx, tx.s as WorldState, resource, tx.now);
    const depth = dailyDepth(ctx, resource, players);
    const { bid, ask } = marketMakerQuotes(ctx, reference, tx.now);
    // With a quota per player, its stock covers every active player's share.
    const state = tx.s as WorldState;
    const buyQuota = playerQuota(ctx, state, resource, "bought", tx.now) ?? 0;
    const sellQuota = playerQuota(ctx, state, resource, "sold", tx.now) ?? 0;
    const askDepth = Math.max(depth, buyQuota * players);
    const bidDepth = Math.max(depth, sellQuota * players);
    const bidQty = bidDepth - (tx.s.marketMaker.bought[resource] ?? 0);
    const askQty = askDepth - (tx.s.marketMaker.sold[resource] ?? 0);
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
    // Goods from overseas: the Dogana sells only what the galleys of the Muda brought.
    const muda = isMudaGood(ctx, resource);
    const lot = muda ? (state.muda?.stock[resource] ?? 0) : askQty;
    if (lot > 0) {
      placeOrder(tx, {
        playerId: MARKET_MAKER,
        resource,
        side: "sell",
        kind: "limit",
        price: muda ? mudaPrice(ctx, state, resource) : ask,
        quantity: lot,
      });
    }
  }
}
