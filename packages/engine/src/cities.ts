import { eventCityBps } from "./events.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  type CityDemandState,
  DAY_MS,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, removeStock, transfer } from "./tx.js";

/** Largest quantity sold in one call, to bound the per-unit pricing loop. */
export const MAX_CITY_SALE = 10_000;

function capacity(
  ctx: WorldContext,
  state: WorldState,
  city: string,
  resource: string,
  now: number,
) {
  const demand = ctx.settings.cities[city]?.[resource];
  if (!demand) return undefined;
  const players = Math.max(1, activePlayerCount(ctx, state, now));
  const capacityBps = eventCityBps(ctx, now, city, resource, "capacity");
  const priceBps = eventCityBps(ctx, now, city, resource, "price");
  return {
    demand,
    capacity: Math.max(
      1,
      Math.floor((demand.dailyCapacityPerPlayer * players * capacityBps) / 10_000),
    ),
    basePrice: applyBpsFloor(demand.basePrice, priceBps),
  };
}

/** Pressure after linear regeneration: the daily capacity is absorbed over 24 h. */
function decayedPressureMilli(cityState: CityDemandState, capacity: number, now: number): number {
  const elapsed = Math.max(0, now - cityState.updatedAt);
  const decay = Math.floor((capacity * 1000 * elapsed) / DAY_MS);
  return Math.max(0, cityState.pressureMilli - decay);
}

/** Price of one unit when `sold` units already weigh on demand: linear drop, then a floor. */
function unitPrice(base: Deniers, maxDropBps: number, capacity: number, sold: number): Deniers {
  const s = BigInt(Math.min(sold, capacity));
  const q = BigInt(capacity);
  // Rounded down: a city never pays more than its curve.
  return (base * (10_000n * q - BigInt(maxDropBps) * s)) / (10_000n * q);
}

export function quoteCitySale(
  ctx: WorldContext,
  state: WorldState,
  city: string,
  resource: string,
  quantity: number,
  now: number,
): Deniers | undefined {
  const c = capacity(ctx, state, city, resource, now);
  const cityState = state.cities[city]?.[resource];
  if (!c || !cityState) return undefined;
  const start = Math.floor(decayedPressureMilli(cityState, c.capacity, now) / 1000);
  let total = 0n;
  for (let i = 0; i < quantity; i++) {
    total += unitPrice(c.basePrice, c.demand.maxDropBps, c.capacity, start + i);
  }
  return total;
}

export function sellToCity(
  tx: Tx,
  playerId: string,
  city: string,
  resource: string,
  quantity: number,
): Deniers {
  // Deliveries by road replace the instant sale to cities.
  if (tx.ctx.settings.deliveries.ordersPerDay.max > 0) fail("city_sales_closed");
  if (!(city in tx.ctx.settings.cities)) fail("unknown_city");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_CITY_SALE) {
    fail("invalid_quantity");
  }
  const c = capacity(tx.ctx, tx.s, city, resource, tx.now);
  const cityState = tx.s.cities[city]?.[resource];
  if (!c || !cityState) fail("not_bought_here");
  const amount = quoteCitySale(tx.ctx, tx.s as WorldState, city, resource, quantity, tx.now) ?? 0n;
  const ref = `${city}:${resource}`;
  removeStock(tx, playerId, resource, quantity, "city_sale", ref);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), amount, "city_sale", ref);
  cityState.pressureMilli = decayedPressureMilli(cityState, c.capacity, tx.now) + quantity * 1000;
  cityState.updatedAt = tx.now;
  emit(tx, "city_sale", playerId, { city, resource, quantity, amount: amount.toString() });
  return amount;
}
