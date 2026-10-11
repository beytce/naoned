import { costValue } from "./buildings.js";
import { hourIn, hourWithin } from "./clock.js";
import { contractsFor } from "./contracts.js";
import { draw } from "./draw.js";
import { familyOrdersFor } from "./families.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type DeliveryOrder,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type Vehicle,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/**
 * Deliveries by road: the land side of the sea. Each merchant gets a board of personal orders
 * every day and carts the goods to the city with their own vehicles; the city pays on arrival.
 * Bandits (players or the computer) may lie in wait on a road; a merchant without escort can fight
 * back for a few minutes.
 */

// ——— Vehicles ———

export function vehiclesOf(state: WorldState, playerId: PlayerId): Vehicle[] {
  return Object.values(state.vehicles ?? {})
    .filter((v) => v.playerId === playerId)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

export function vehicleFree(v: Vehicle, now: number): boolean {
  return v.busyUntil <= now;
}

export function vehicleUpkeep(ctx: WorldContext, v: Vehicle): Deniers {
  return ctx.settings.deliveries.vehicles[v.type]?.upkeepPerDay ?? 0n;
}

function addVehicle(tx: Tx, playerId: PlayerId, type: string): Vehicle {
  const def = tx.ctx.settings.deliveries.vehicles[type];
  if (!def) fail("unknown_vehicle_type");
  const id = nextId(tx, "v");
  const vehicle: Vehicle = {
    id,
    playerId,
    type,
    investedValue: costValue(tx.ctx, { ducats: def.costDucats, materials: def.costMaterials }),
    busyUntil: 0,
  };
  tx.s.vehicles ??= {};
  tx.s.vehicles[id] = vehicle;
  return vehicle;
}

/** The vehicles given on joining (not paid for, like the starting buildings). */
export function grantStartingVehicles(tx: Tx, playerId: PlayerId): void {
  for (const type of tx.ctx.settings.deliveries.startingVehicles) addVehicle(tx, playerId, type);
}

export function buyVehicle(tx: Tx, playerId: PlayerId, type: string): Vehicle {
  const { deliveries } = tx.ctx.settings;
  const def = deliveries.vehicles[type];
  if (!def) fail("unknown_vehicle_type");
  if (vehiclesOf(tx.s as WorldState, playerId).length >= deliveries.maxVehicles)
    fail("max_vehicles");
  const vehicle = addVehicle(tx, playerId, type);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, def.costDucats, "vehicle", vehicle.id);
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    removeStock(tx, playerId, res, qty, "vehicle", vehicle.id);
  }
  emit(tx, "vehicle_bought", playerId, { vehicle: vehicle.id, type });
  return vehicle;
}

// ——— Roads ———

/** Deliveries are on: the board has orders and the instant sale to cities is closed. */
export function deliveriesOn(ctx: WorldContext): boolean {
  return ctx.settings.deliveries.ordersPerDay.max > 0;
}

export function routeId(region: string, city: string): string {
  return `${region}:${city}`;
}

/** Minutes of road one way at normal speed, if the road exists. */
export function routeMinutes(ctx: WorldContext, region: string, city: string): number | undefined {
  return ctx.settings.deliveries.routes[region]?.[city];
}

/** Minutes one way for this vehicle: the road × 10 000 / speed, two hours at most. */
export function travelMinutes(
  ctx: WorldContext,
  region: string,
  city: string,
  vehicleType: string,
): number | undefined {
  const { vehicles, maxDeliveryMinutes } = ctx.settings.deliveries;
  const road = routeMinutes(ctx, region, city);
  const speed = vehicles[vehicleType]?.speedBps;
  if (road === undefined || !speed) return undefined;
  return Math.min(maxDeliveryMinutes, Math.ceil((road * 10_000) / speed));
}

/** Price per unit of a city order: the reference, plus a bonus per hour of road, rounded down. */
export function orderUnitPrice(
  ctx: WorldContext,
  region: string,
  city: string,
  resource: string,
  extraBps = 0,
): Deniers {
  const { cityPriceBps, distanceBonusBpsPerHour } = ctx.settings.deliveries;
  const minutes = routeMinutes(ctx, region, city) ?? 0;
  const bps = cityPriceBps + Math.floor((distanceBonusBpsPerHour * minutes) / 60) + extraBps;
  return applyBpsFloor(ctx.settings.referencePrices[resource] ?? 0n, bps);
}

function isLuxury(ctx: WorldContext, resource: string): boolean {
  return ctx.theme.resources.find((r) => r.code === resource)?.tier === "luxury";
}

/** Cities on a road from the region that buy this resource. */
function buyers(ctx: WorldContext, region: string, resource: string): string[] {
  return ctx.theme.cities
    .map((c) => c.code)
    .filter(
      (c) => ctx.settings.cities[c]?.[resource] && routeMinutes(ctx, region, c) !== undefined,
    );
}

function routedCities(ctx: WorldContext, region: string): string[] {
  return ctx.theme.cities
    .map((c) => c.code)
    .filter((c) => routeMinutes(ctx, region, c) !== undefined);
}

/** When an urgent order opens: a minute drawn among the day's opening hours (Paris). */
function urgentOpening(ctx: WorldContext, dayStart: number, key: string): number | undefined {
  const { urgentHours, urgentOpenMinutes } = ctx.settings.deliveries;
  const dayEnd = dayStart + DAY_MS;
  const slots: number[] = [];
  for (let h = 0; h < 24; h++) {
    const at = dayStart + h * HOUR_MS;
    if (at + HOUR_MS + urgentOpenMinutes * MINUTE_MS > dayEnd) break;
    if (hourWithin(hourIn(at), urgentHours)) slots.push(at);
  }
  if (slots.length === 0) return undefined;
  const h = draw(ctx, key);
  return (slots[h % slots.length] ?? dayStart) + ((h >>> 8) % 60) * MINUTE_MS;
}

/**
 * A merchant's board for a day: the Doge's orders first, then their family's, then the urgent
 * ones, then city orders up to a number drawn between min and max. Drawn from the world's secret
 * seed, so the board is the same on every request. Goods from overseas stay at the counter.
 */
export function deliveryOrdersFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  day: number,
): DeliveryOrder[] {
  const cfg = ctx.settings.deliveries;
  const player = state.players[playerId];
  if (!deliveriesOn(ctx) || !player) return [];
  const region = player.region;
  const dayStart = ctx.startAt + day * DAY_MS;
  // An order of the day expires at the end of the day (midnight in Paris, the world's day).
  const expiresAt = dayStart + DAY_MS;
  const capacity = Math.max(0, ...Object.values(cfg.vehicles).map((v) => v.capacity));
  const anyCity = routedCities(ctx, region);
  const out: DeliveryOrder[] = [];
  const push = (o: Omit<DeliveryOrder, "id" | "day">) =>
    out.push({ ...o, id: `${day}:${out.length}`, day });
  const cityFor = (resource: string, key: string) => {
    const list = buyers(ctx, region, resource);
    const pool = list.length > 0 ? list : anyCity;
    return pool[draw(ctx, key) % Math.max(1, pool.length)];
  };

  // The Doge's orders (their own draw), at the Doge's premium.
  for (const c of contractsFor(ctx, playerId, day).slice(0, cfg.dogeOrdersPerDay)) {
    if (isLuxury(ctx, c.resource)) continue;
    const city = routeMinutes(ctx, region, c.city) !== undefined ? c.city : anyCity[0];
    if (!city) continue;
    push({
      kind: "doge",
      city,
      resource: c.resource,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      opensAt: dayStart,
      expiresAt,
      ref: c.id,
    });
  }
  // The family's orders, at their premium.
  for (const f of familyOrdersFor(ctx, state, playerId, day)) {
    if (isLuxury(ctx, f.resource)) continue;
    const city = cityFor(f.resource, `delivery-family:${playerId}:${day}:${f.id}`);
    if (!city) continue;
    push({
      kind: "family",
      city,
      resource: f.resource,
      quantity: f.quantity,
      unitPrice: f.unitPrice,
      opensAt: dayStart,
      expiresAt,
      ref: f.id,
    });
  }

  const resources = Object.keys(cfg.quantity).filter((r) => buyers(ctx, region, r).length > 0);
  if (resources.length === 0 || anyCity.length === 0) return out;
  const order = (key: string) => {
    const h = draw(ctx, key);
    const resource = resources[h % resources.length] ?? "";
    const list = buyers(ctx, region, resource);
    const city = list[(h >>> 8) % list.length] ?? "";
    const [lo, hi] = cfg.quantity[resource] ?? [1, 1];
    const span = Math.max(0, hi - lo);
    const quantity = Math.min(capacity, lo + (draw(ctx, `${key}:q`) % (span + 1)));
    return { resource, city, quantity };
  };

  // Urgent orders (in place of the Criées): an hour to load, at a premium.
  for (let i = 0; i < cfg.urgentPerDay; i++) {
    const opensAt = urgentOpening(ctx, dayStart, `delivery-urgent:${playerId}:${day}:${i}:at`);
    if (opensAt === undefined) continue;
    const o = order(`delivery-urgent:${playerId}:${day}:${i}`);
    push({
      kind: "urgent",
      ...o,
      unitPrice: orderUnitPrice(ctx, region, o.city, o.resource, cfg.urgentPremiumBps),
      opensAt,
      expiresAt: opensAt + cfg.urgentOpenMinutes * MINUTE_MS,
    });
  }

  const { min, max } = cfg.ordersPerDay;
  const total =
    min + (draw(ctx, `delivery-count:${playerId}:${day}`) % (Math.max(0, max - min) + 1));
  for (let i = 0; out.length < total; i++) {
    const o = order(`delivery:${playerId}:${day}:${i}`);
    push({
      kind: "city",
      ...o,
      unitPrice: orderUnitPrice(ctx, region, o.city, o.resource),
      opensAt: dayStart,
      expiresAt,
    });
  }
  return out;
}

/** Orders of the board already dispatched today. */
export function deliveriesDoneToday(state: WorldState, playerId: PlayerId, day: number): string[] {
  const entry = state.deliveriesDone?.[playerId];
  return entry && entry.day === day ? entry.ids : [];
}
