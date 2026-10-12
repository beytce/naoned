import { type Deniers, applyBpsCeil, applyBpsFloor } from "./money.js";
import { specialtyEffects } from "./specialties.js";
import {
  HOUR_MS,
  MARKET_MAKER,
  type Order,
  type OrderKind,
  type OrderSide,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
  dayIndex,
  escrowAccount,
  hasPass,
} from "./state.js";
import type { ResourceCode } from "./theme.js";
import {
  type Tx,
  addStock,
  emit,
  fail,
  lockStock,
  nextId,
  nextSeq,
  removeEscrowedStock,
  transfer,
  unlockStock,
} from "./tx.js";

export interface PlaceOrderInput {
  playerId: PlayerId;
  resource: ResourceCode;
  side: OrderSide;
  kind: OrderKind;
  /** Required for limit orders; ignored for instant orders. */
  price?: Deniers;
  quantity: number;
  expiresInHours?: number;
}

function opposite(side: OrderSide): OrderSide {
  return side === "buy" ? "sell" : "buy";
}

/** Better price first, then older order first. */
function compareForSide(side: OrderSide) {
  return (a: Order, b: Order) => {
    if (a.price !== b.price) {
      const better = side === "buy" ? a.price > b.price : a.price < b.price;
      return better ? -1 : 1;
    }
    return a.seq - b.seq;
  };
}

export function bookSide(
  state: WorldState,
  resource: ResourceCode,
  side: OrderSide,
  options: { excludePlayer?: PlayerId; playersOnly?: boolean } = {},
): Order[] {
  return Object.values(state.orders)
    .filter(
      (o) =>
        o.resource === resource &&
        o.side === side &&
        o.remaining > 0 &&
        o.playerId !== options.excludePlayer &&
        !(options.playersOnly && o.playerId === MARKET_MAKER),
    )
    .sort(compareForSide(side));
}

export function bestPrice(
  state: WorldState,
  resource: ResourceCode,
  side: OrderSide,
  options: { excludePlayer?: PlayerId; playersOnly?: boolean } = {},
): Deniers | undefined {
  return bookSide(state, resource, side, options)[0]?.price;
}

/** Open offers allowed: two more with the Pass Négociant. */
export function maxOpenOrdersFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): number {
  const extra = hasPass(state, playerId, now) ? ctx.settings.pass.extraOpenOrders : 0;
  return (
    ctx.settings.maxOpenOrders + extra + specialtyEffects(ctx, state, playerId).extraOpenOrders
  );
}

export function openOrderCount(state: WorldState, playerId: PlayerId): number {
  let n = 0;
  for (const o of Object.values(state.orders)) if (o.playerId === playerId) n++;
  return n;
}

function recordPrice(tx: Tx, resource: ResourceCode, price: Deniers, qty: number): void {
  const day = dayIndex(tx.ctx, tx.now);
  let byDay = tx.s.priceStats[resource];
  if (!byDay) {
    byDay = {};
    tx.s.priceStats[resource] = byDay;
  }
  const stat = byDay[day] ?? { volume: 0, value: 0n };
  stat.volume += qty;
  stat.value += price * BigInt(qty);
  byDay[day] = stat;
}

/** Today's market maker usage, started afresh on a new day. */
function usageToday(tx: Tx) {
  const day = dayIndex(tx.ctx, tx.now);
  if (tx.s.marketMaker.day !== day) tx.s.marketMaker = { day, bought: {}, sold: {}, byPlayer: {} };
  tx.s.marketMaker.byPlayer ??= {};
  return tx.s.marketMaker;
}

/** Units a player may still buy from ("bought") or sell to ("sold") the market maker today. */
/**
 * A player's daily quota with the market maker: the world's setting, shrunk to a fair share of
 * its daily cap when many players are active. Undefined: no quota.
 */
export function playerQuota(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  dir: "bought" | "sold",
  now: number,
  playerId?: PlayerId,
): number | undefined {
  const mm = ctx.settings.marketMaker;
  const base = dir === "bought" ? mm.playerDailyQuota[resource] : mm.playerDailySellQuota[resource];
  if (base === undefined) return undefined;
  const cap = mm.maxDailyDepth[resource];
  const players = Math.max(1, activePlayerCount(ctx, state, now));
  const share = cap === undefined ? base : Math.min(base, Math.max(1, Math.floor(cap / players)));
  // Pass Négociant: a fifth more of the merchant's own share; a trader's mastery adds its own.
  const pass =
    playerId && hasPass(state, playerId, now) ? ctx.settings.pass.marketMakerQuotaBps : 0;
  const mastery = specialtyEffects(ctx, state, playerId).marketMakerQuotaBps;
  const bonus = pass + mastery;
  return bonus > 0 ? share + Math.floor((share * bonus) / 10_000) : share;
}

function quotaRoom(tx: Tx, playerId: PlayerId, resource: string, dir: "bought" | "sold"): number {
  const quota = playerQuota(tx.ctx, tx.s as WorldState, resource, dir, tx.now, playerId);
  if (quota === undefined) return Number.POSITIVE_INFINITY;
  const used = usageToday(tx).byPlayer?.[playerId]?.[dir][resource] ?? 0;
  return Math.max(0, quota - used);
}

function useQuota(
  tx: Tx,
  playerId: PlayerId,
  resource: string,
  dir: "bought" | "sold",
  qty: number,
) {
  const usage = usageToday(tx);
  usage.byPlayer ??= {};
  usage.byPlayer[playerId] ??= { bought: {}, sold: {} };
  const mine = usage.byPlayer[playerId];
  mine[dir][resource] = (mine[dir][resource] ?? 0) + qty;
}

/** What a player may still trade with the market maker today; null where there is no quota. */
export function marketMakerQuotaLeft(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  resource: string,
  now: number,
): { buy: number | null; sell: number | null } {
  const today = state.marketMaker.day === dayIndex(ctx, now);
  const mine = today ? state.marketMaker.byPlayer?.[playerId] : undefined;
  const left = (dir: "bought" | "sold") => {
    const quota = playerQuota(ctx, state, resource, dir, now, playerId);
    return quota === undefined ? null : Math.max(0, quota - (mine?.[dir][resource] ?? 0));
  };
  return { buy: left("bought"), sell: left("sold") };
}

/** Settles one fill between a buy and a sell order, at `price` (the resting order's price). */
function settle(tx: Tx, buy: Order, sell: Order, price: Deniers, qty: number): void {
  const gross = price * BigInt(qty);
  const tradeId = nextId(tx, "t");
  let tax = 0n;

  if (buy.playerId === MARKET_MAKER) {
    // The market maker buys: money is created, the goods leave the economy.
    removeEscrowedStock(tx, sell.playerId, sell.resource, qty, "trade_sell", tradeId);
    transfer(tx, SOURCE_ACCOUNT, cashAccount(sell.playerId), gross, "market_maker_buy", tradeId);
    tx.s.marketMaker.bought[sell.resource] = (tx.s.marketMaker.bought[sell.resource] ?? 0) + qty;
    useQuota(tx, sell.playerId, sell.resource, "sold", qty);
  } else if (sell.playerId === MARKET_MAKER) {
    // The market maker sells: money is destroyed, the goods enter the economy.
    transfer(tx, escrowAccount(buy.playerId), SINK_ACCOUNT, gross, "market_maker_sell", tradeId);
    addStock(tx, buy.playerId, buy.resource, qty, "trade_buy", tradeId);
    tx.s.marketMaker.sold[buy.resource] = (tx.s.marketMaker.sold[buy.resource] ?? 0) + qty;
    useQuota(tx, buy.playerId, buy.resource, "bought", qty);
  } else {
    removeEscrowedStock(tx, sell.playerId, sell.resource, qty, "trade_sell", tradeId);
    addStock(tx, buy.playerId, buy.resource, qty, "trade_buy", tradeId);
    transfer(tx, escrowAccount(buy.playerId), cashAccount(sell.playerId), gross, "trade", tradeId);
    // A trader's mastery lightens the tax on their sales.
    const discount = specialtyEffects(tx.ctx, tx.s as WorldState, sell.playerId).taxDiscountBps;
    tax = applyBpsCeil(gross, Math.max(0, tx.ctx.settings.marketTaxBps - discount));
    transfer(tx, cashAccount(sell.playerId), SINK_ACCOUNT, tax, "market_tax", tradeId);
  }

  // A buyer escrowed at its own limit price: refund the price improvement.
  if (buy.playerId !== MARKET_MAKER && buy.price > price) {
    const refund = (buy.price - price) * BigInt(qty);
    transfer(
      tx,
      escrowAccount(buy.playerId),
      cashAccount(buy.playerId),
      refund,
      "escrow_release",
      tradeId,
    );
  }

  buy.remaining -= qty;
  sell.remaining -= qty;
  recordPrice(tx, buy.resource, price, qty);
  tx.fx.trades.push({
    id: tradeId,
    resource: buy.resource,
    price,
    quantity: qty,
    buyerId: buy.playerId,
    sellerId: sell.playerId,
    buyOrderId: buy.id,
    sellOrderId: sell.id,
    tax,
    at: tx.now,
  });
  for (const id of [buy.playerId, sell.playerId]) {
    if (id !== MARKET_MAKER) emit(tx, "trade_executed", id, { trade: tradeId });
  }
}

/** Matches an incoming order against the book, price then time priority. */
function match(tx: Tx, taker: Order): void {
  const makers = bookSide(tx.s as WorldState, taker.resource, opposite(taker.side), {
    excludePlayer: taker.playerId,
  });
  for (const m of makers) {
    if (taker.remaining === 0) break;
    const crosses = taker.side === "buy" ? m.price <= taker.price : m.price >= taker.price;
    if (!crosses) break;
    const maker = tx.s.orders[m.id] as Order;
    let qty = Math.min(taker.remaining, maker.remaining);
    // Quota per player with the market maker, whichever side rests.
    const player =
      maker.playerId === MARKET_MAKER ? taker : taker.playerId === MARKET_MAKER ? maker : null;
    if (player) {
      const dir = player.side === "buy" ? "bought" : "sold";
      qty = Math.min(qty, quotaRoom(tx, player.playerId, player.resource, dir));
      if (qty <= 0) continue;
    }
    if (taker.side === "buy") settle(tx, taker, maker, maker.price, qty);
    else settle(tx, maker, taker, maker.price, qty);
    // The owner of a resting offer learns that it found a taker.
    if (maker.playerId !== MARKET_MAKER) {
      emit(tx, "order_filled", maker.playerId, {
        order: maker.id,
        resource: maker.resource,
        side: maker.side,
        quantity: qty,
        price: maker.price.toString(),
        counterparty: taker.playerId,
      });
    }
    if (maker.remaining === 0) delete tx.s.orders[maker.id];
  }
}

/** Returns the escrow still held by an order to its owner and removes it from the book. */
function closeOrder(tx: Tx, order: Order): void {
  if (order.playerId !== MARKET_MAKER && order.remaining > 0) {
    if (order.side === "buy") {
      transfer(
        tx,
        escrowAccount(order.playerId),
        cashAccount(order.playerId),
        order.price * BigInt(order.remaining),
        "escrow_release",
        order.id,
      );
    } else {
      unlockStock(tx, order.playerId, order.resource, order.remaining);
    }
  }
  delete tx.s.orders[order.id];
}

export function placeOrder(tx: Tx, input: PlaceOrderInput): Order {
  const { settings, theme } = tx.ctx;
  if (!theme.resources.some((r) => r.code === input.resource)) fail("unknown_resource");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) fail("invalid_quantity");
  const isMarketMaker = input.playerId === MARKET_MAKER;

  let price: Deniers;
  if (input.kind === "instant") {
    const best = bestPrice(tx.s as WorldState, input.resource, opposite(input.side), {
      excludePlayer: input.playerId,
    });
    if (best === undefined) fail("no_liquidity");
    price =
      input.side === "buy"
        ? applyBpsFloor(best, 10_000 + settings.instantOrderSlippageBps)
        : applyBpsCeil(best, 10_000 - settings.instantOrderSlippageBps);
  } else {
    if (input.price === undefined || input.price <= 0n) fail("invalid_price");
    price = input.price;
    const band = settings.priceBand;
    const ref = settings.referencePrices[input.resource];
    if (!isMarketMaker && band.maxBps > 0 && ref !== undefined) {
      if (
        price * 10_000n < ref * BigInt(band.minBps) ||
        price * 10_000n > ref * BigInt(band.maxBps)
      ) {
        fail("price_out_of_band");
      }
    }
    if (
      !isMarketMaker &&
      openOrderCount(tx.s as WorldState, input.playerId) >=
        maxOpenOrdersFor(tx.ctx, tx.s as WorldState, input.playerId, tx.now)
    ) {
      fail("max_open_orders");
    }
  }

  const id = nextId(tx, "o");
  if (!isMarketMaker) {
    if (input.side === "buy") {
      transfer(
        tx,
        cashAccount(input.playerId),
        escrowAccount(input.playerId),
        price * BigInt(input.quantity),
        "escrow_lock",
        id,
      );
    } else {
      lockStock(tx, input.playerId, input.resource, input.quantity);
    }
  }

  const hours = Math.min(input.expiresInHours ?? settings.orderMaxHours, settings.orderMaxHours);
  const order: Order = {
    id,
    playerId: input.playerId,
    resource: input.resource,
    side: input.side,
    kind: input.kind,
    price,
    quantity: input.quantity,
    remaining: input.quantity,
    createdAt: tx.now,
    expiresAt: tx.now + hours * HOUR_MS,
    seq: nextSeq(tx),
  };
  tx.s.orders[id] = order;
  const placed = tx.s.orders[id] as Order;
  match(tx, placed);
  const result: Order = { ...placed };

  if (placed.remaining === 0 || placed.kind === "instant") closeOrder(tx, placed);
  if (!isMarketMaker) {
    emit(tx, "order_placed", input.playerId, {
      order: id,
      kind: input.kind,
      side: input.side,
      resource: input.resource,
      filled: input.quantity - result.remaining,
    });
  }
  return result;
}

export function cancelOrder(tx: Tx, playerId: PlayerId, orderId: string): void {
  const order = tx.s.orders[orderId] as Order | undefined;
  if (!order) fail("unknown_order");
  if (order.playerId !== playerId) fail("not_owner");
  closeOrder(tx, order);
  emit(tx, "order_cancelled", playerId, { order: orderId });
}

/** Cancels every open order of a player, returning what they held in escrow. */
export function cancelAllOrders(tx: Tx, playerId: PlayerId): void {
  for (const order of Object.values(tx.s.orders) as Order[]) {
    if (order.playerId === playerId) closeOrder(tx, order);
  }
}

export function expireOrders(tx: Tx): void {
  for (const order of Object.values(tx.s.orders) as Order[]) {
    if (order.expiresAt <= tx.now) {
      closeOrder(tx, order);
      if (order.playerId !== MARKET_MAKER)
        emit(tx, "order_expired", order.playerId, { order: order.id });
    }
  }
}

export function removeMarketMakerOrders(tx: Tx): void {
  for (const order of Object.values(tx.s.orders) as Order[]) {
    if (order.playerId === MARKET_MAKER) delete tx.s.orders[order.id];
  }
}
