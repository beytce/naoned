import { isDraft, original } from "immer";
import { marketCityBps } from "./acts.js";
import { costValue } from "./buildings.js";
import { familyAccount } from "./campaign.js";
import { hourIn, hourWithin } from "./clock.js";
import { contractsDoneToday, contractsFor } from "./contracts.js";
import {
  dogeFavourBps,
  dogeFavourOrders,
  embargoCutBps,
  favourBps,
  tollOn,
  urgentReservedUntil,
} from "./decrees.js";
import { draw, pickWeighted } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import { isMudaGood } from "./muda.js";
import { maxVehiclesFor, specialtyEffects } from "./specialties.js";
import {
  type BoardOrder,
  DAY_MS,
  type Delivery,
  type DeliveryLine,
  type DeliveryOrder,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type Vehicle,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
  dayIndex,
  isActive,
} from "./state.js";
import { supplyArrived } from "./suppliers.js";
import { terraEmbargoCutBps } from "./terraWorld.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";
import { lockedGood, makesGood } from "./unlocks.js";
import { vwap } from "./valuation.js";
import { useWarehouse, warehouseHolders } from "./warehouses.js";

/**
 * Deliveries by road. The cities' orders form a board for the world (and the Doge's are personal);
 * merchants cart the goods to the city with their own vehicles and the city pays on arrival.
 */

/** Finished deliveries stay this long in the world's state (views, notices, recap). */
export const ROAD_RETENTION_MS = 3 * DAY_MS;

/**
 * Entries of a record in a transaction, read cheaply: the state before the command for those it
 * did not touch (no draft proxies over a long history), the draft for the others. Callers that
 * change an entry must read it again from the draft.
 */
function entries<T>(record: Record<string, T> | undefined): T[] {
  if (!record) return [];
  if (!isDraft(record)) return Object.values(record);
  const base = (original(record) ?? {}) as Record<string, T>;
  return Object.keys(record).map((id) => base[id] ?? (record[id] as T));
}

/** The state before the command (for reading only: net worths, while a tick runs). */
function baseState(tx: Tx): WorldState {
  return (isDraft(tx.s) ? original(tx.s) : tx.s) as WorldState;
}

// ——— Vehicles ———

export function vehiclesOf(state: WorldState, playerId: PlayerId): Vehicle[] {
  return Object.values(state.vehicles ?? {})
    .filter((v) => v.playerId === playerId)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

export function vehicleFree(v: Vehicle, now: number): boolean {
  return v.busyUntil <= now;
}

export function addVehicle(tx: Tx, playerId: PlayerId, type: string): Vehicle {
  const def = tx.ctx.settings.deliveries.vehicles[type];
  if (!def) fail("unknown_vehicle_type");
  const id = nextId(tx, "v");
  const vehicle: Vehicle = {
    id,
    playerId,
    type,
    investedValue: costValue(tx.ctx, { ducats: def.costDucats, materials: def.costMaterials }),
    busyUntil: 0,
    since: tx.now,
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
  if (deliveries.forSale && !deliveries.forSale.includes(type)) fail("vehicle_not_for_sale");
  const state = tx.s as WorldState;
  if (vehiclesOf(state, playerId).length >= maxVehiclesFor(tx.ctx, state, playerId))
    fail("max_vehicles");
  const vehicle = addVehicle(tx, playerId, type);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, def.costDucats, "vehicle", vehicle.id);
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    removeStock(tx, playerId, res, qty, "vehicle", vehicle.id);
  }
  emit(tx, "vehicle_bought", playerId, { vehicle: vehicle.id, type });
  return vehicle;
}

/** One step up the ladder (mule, cart, wagon…) for ducats, which leave the game; at home only. */
export function upgradeVehicle(tx: Tx, playerId: PlayerId, vehicleId: string): Vehicle {
  const vehicle = tx.s.vehicles?.[vehicleId];
  if (!vehicle) fail("unknown_vehicle");
  if (vehicle.playerId !== playerId) fail("not_owner");
  if (!vehicleFree(vehicle as Vehicle, tx.now)) fail("vehicle_busy");
  const step = tx.ctx.settings.deliveries.vehicles[vehicle.type]?.upgrade;
  if (!step) fail("vehicle_max_level");
  if (!tx.ctx.settings.deliveries.vehicles[step.to]) fail("unknown_vehicle_type");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, step.costDucats, "vehicle", vehicle.id);
  const from = vehicle.type;
  vehicle.type = step.to;
  vehicle.investedValue += step.costDucats;
  emit(tx, "vehicle_upgraded", playerId, { vehicle: vehicle.id, from, type: step.to });
  return vehicle as Vehicle;
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
  /** Faster by this much (a carter's mastery). */
  speedBonusBps = 0,
): number | undefined {
  const { vehicles, maxDeliveryMinutes } = ctx.settings.deliveries;
  const road = routeMinutes(ctx, region, city);
  const base = vehicles[vehicleType]?.speedBps;
  if (road === undefined || !base) return undefined;
  const speed = Math.floor((base * (10_000 + speedBonusBps)) / 10_000);
  return Math.min(maxDeliveryMinutes, Math.ceil((road * 10_000) / speed));
}

/** Time on the road for this merchant (their region, their mastery). */
export function travelMinutesFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
  vehicleType: string,
): number | undefined {
  const player = state.players[playerId];
  if (!player) return undefined;
  const bonus = specialtyEffects(ctx, state, playerId).vehicleSpeedBps;
  return travelMinutes(ctx, player.region, city, vehicleType, bonus);
}

/** Price per unit of a city order: the reference, plus a bonus per hour of road, rounded down. */
export function orderUnitPrice(
  ctx: WorldContext,
  region: string,
  city: string,
  resource: string,
  extraBps = 0,
  /** The world and the day: the price follows the Rialto (see `marketIndex`). */
  market?: { state: WorldState; day: number },
): Deniers {
  const { cityPriceBps, distanceBonusBpsPerHour } = ctx.settings.deliveries;
  const minutes = routeMinutes(ctx, region, city) ?? 0;
  const bps = cityPriceBps + Math.floor((distanceBonusBpsPerHour * minutes) / 60) + extraBps;
  const base = market ? indexedPrice(ctx, market.state, resource, market.day) : undefined;
  return applyBpsFloor(base ?? ctx.settings.referencePrices[resource] ?? 0n, bps);
}

/**
 * The reference price of a good, blended with yesterday's traded price at the Rialto and kept
 * within bounds; the reference alone without trades enough or without the setting.
 */
/**
 * The cities' demand of the day on the shared board: per resource, how much more (or less) often
 * it is ordered as its price at the Rialto falls under (or rises over) its reference, and how much
 * larger the board is (bps; 10 000 = as set).
 */
export function boardDemand(
  ctx: WorldContext,
  state: WorldState,
  day: number,
): { factorBps: Record<string, number>; totalBps: number } {
  const cfg = ctx.settings.deliveries;
  const factorBps: Record<string, number> = {};
  let weighted = 0;
  let weights = 0;
  for (const resource of Object.keys(cfg.quantity)) {
    const reference = ctx.settings.referencePrices[resource] ?? 0n;
    const price = indexedPrice(ctx, state, resource, day);
    let factor = 10_000;
    if (cfg.elasticityBps > 0 && reference > 0n && price > 0n) {
      const ratio = Number((reference * 10_000n) / price);
      factor = Math.min(
        30_000,
        Math.max(2_500, 10_000 + Math.trunc((cfg.elasticityBps * (ratio - 10_000)) / 10_000)),
      );
    }
    factorBps[resource] = factor;
    const weight = cfg.weights[resource] ?? 1;
    weighted += weight * factor;
    weights += weight;
  }
  const average = weights > 0 ? Math.round(weighted / weights) : 10_000;
  return { factorBps, totalBps: Math.min(cfg.elasticMaxBps, Math.max(5_000, average)) };
}

export function indexedPrice(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  day: number,
): Deniers {
  const reference = ctx.settings.referencePrices[resource] ?? 0n;
  const { weightBps, floorBps, capBps } = ctx.settings.deliveries.marketIndex;
  if (weightBps === 0 || day <= 0) return reference;
  // Up to the end of yesterday: one price for the whole day.
  const traded = vwap(
    ctx,
    state,
    resource,
    ctx.startAt + day * DAY_MS - 1,
    ctx.settings.valuation.vwapDays,
  );
  if (traded === undefined) return reference;
  const blended = (reference * BigInt(10_000 - weightBps) + traded * BigInt(weightBps)) / 10_000n;
  const lo = applyBpsFloor(reference, floorBps);
  const hi = applyBpsFloor(reference, capBps);
  return blended < lo ? lo : blended > hi ? hi : blended;
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
 * A merchant's board for a day: the Doge's orders first, then the urgent
 * ones, then city orders up to a number drawn between min and max. Drawn from the world's secret
 * seed, so the board is the same on every request. Goods from overseas stay at the counter.
 */
export function deliveryOrdersFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  day: number,
  /** `board: false` leaves the world's board out (personal orders only). */
  options: { board?: boolean } = {},
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
  // The day's event and the act pay their price on every order they touch.
  const priced = (unitPrice: Deniers, city: string, resource: string) => {
    const bps = marketCityBps(ctx, dayStart, city, resource, "price");
    return bps === 10_000 ? unitPrice : applyBpsFloor(unitPrice, bps);
  };
  const push = (o: Omit<DeliveryOrder, "id" | "day">) => {
    out.push({
      ...o,
      unitPrice: priced(o.unitPrice, o.city, o.resource),
      id: `${day}:${out.length}`,
      day,
    });
  };
  const cityFor = (resource: string, key: string) => {
    const list = buyers(ctx, region, resource);
    const pool = list.length > 0 ? list : anyCity;
    return pool[draw(ctx, key) % Math.max(1, pool.length)];
  };

  // The merchant's own chain: what the starting buildings of the region make.
  const chain = regionChain(ctx, region);
  const tier = (resource: string) => ctx.theme.resources.find((r) => r.code === resource)?.tier;
  // Goods of a luxury chain: only of those who make them.
  const mayOrder = (resource: string) =>
    (tier(resource) !== "raw" || chain.has(resource)) &&
    (!lockedGood(ctx, resource) || makesGood(ctx, state, playerId, resource));

  // The welcome order: on the day of joining, to the nearest city buying the goods.
  const welcome = cfg.welcome[region];
  if (welcome && dayIndex(ctx, player.joinedAt) === day) {
    const city = buyers(ctx, region, welcome.resource).sort(
      (a, b) => (routeMinutes(ctx, region, a) ?? 0) - (routeMinutes(ctx, region, b) ?? 0),
    )[0];
    if (city) {
      push({
        kind: "city",
        city,
        resource: welcome.resource,
        quantity: welcome.quantity,
        unitPrice: orderUnitPrice(ctx, region, city, welcome.resource, 0, { state, day }),
        opensAt: dayStart,
        expiresAt,
      });
      const order = out[out.length - 1];
      if (order && welcome.reward !== undefined)
        order.unitPrice = welcome.reward / BigInt(welcome.quantity);
    }
  }

  // The Doge's orders (their own draw), at the Doge's premium; one more under his favour.
  const dogeOrders = cfg.dogeOrdersPerDay + dogeFavourOrders(ctx, state, playerId, dayStart);
  const drawn = Math.max(ctx.settings.contracts.perDay, dogeOrders);
  for (const c of contractsFor(ctx, playerId, day, {}, drawn).slice(0, dogeOrders)) {
    if (!mayOrder(c.resource)) continue;
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

  // Shared demand: the world's board, priced by the road from this merchant's region.
  if (sharedBoardOn(ctx)) {
    if (options.board === false) return out;
    const board = state.board;
    if (!board || board.day !== day) return out;
    for (const b of board.orders) {
      if (!mayOrder(b.resource) || routeMinutes(ctx, region, b.city) === undefined) continue;
      const premium = b.kind === "urgent" ? cfg.urgentPremiumBps : 0;
      out.push({
        id: b.id,
        day,
        kind: b.kind,
        city: b.city,
        resource: b.resource,
        quantity: b.quantity,
        unitPrice: priced(
          orderUnitPrice(ctx, region, b.city, b.resource, premium, { state, day }),
          b.city,
          b.resource,
        ),
        opensAt: b.opensAt,
        expiresAt: b.expiresAt,
        shared: true,
        takenBy: board.takenBy[b.id] ?? null,
      });
    }
    return out;
  }

  // City orders: home goods only (goods from overseas come with the Doge's and the families').
  const resources = Object.keys(cfg.quantity).filter(
    (r) => buyers(ctx, region, r).length > 0 && tier(r) !== "luxury" && mayOrder(r),
  );
  if (resources.length === 0 || anyCity.length === 0) return out;
  const weighted = resources.map((code) => ({ code, weight: cfg.weights[code] ?? 1 }));
  const home = weighted.filter((w) => chain.has(w.code));
  const quantityOf = (resource: string, key: string) => {
    const [lo, hi] = cfg.quantity[resource] ?? [1, 1];
    const span = Math.max(0, hi - lo);
    return Math.min(capacity, lo + (draw(ctx, `${key}:q`) % (span + 1)));
  };
  const order = (key: string, leanHome = false) => {
    const h = draw(ctx, key);
    const pool =
      leanHome && home.length > 0 && draw(ctx, `${key}:home`) % 10_000 < cfg.homeShareBps
        ? home
        : weighted;
    const resource = pickWeighted(pool, h)?.code ?? "";
    const list = buyers(ctx, region, resource);
    const city = list[(h >>> 8) % list.length] ?? "";
    return { resource, city, quantity: quantityOf(resource, key) };
  };

  // Urgent orders (in place of the Criées): an hour to load, at a premium.
  for (let i = 0; i < cfg.urgentPerDay; i++) {
    const opensAt = urgentOpening(ctx, dayStart, `delivery-urgent:${playerId}:${day}:${i}:at`);
    if (opensAt === undefined) continue;
    const o = order(`delivery-urgent:${playerId}:${day}:${i}`);
    push({
      kind: "urgent",
      ...o,
      unitPrice: orderUnitPrice(ctx, region, o.city, o.resource, cfg.urgentPremiumBps, {
        state,
        day,
      }),
      opensAt,
      expiresAt: opensAt + cfg.urgentOpenMinutes * MINUTE_MS,
    });
  }

  const { min, max } = cfg.ordersPerDay;
  const total =
    min + (draw(ctx, `delivery-count:${playerId}:${day}`) % (Math.max(0, max - min) + 1));

  // A market event asks for more somewhere: the first city orders of the day go there.
  const asked = resources.flatMap((resource) =>
    buyers(ctx, region, resource)
      .filter((city) => marketCityBps(ctx, dayStart, city, resource, "capacity") > 10_000)
      .map((city) => ({ resource, city })),
  );
  for (let i = 0; i < cfg.eventOrdersPerDay && asked.length > 0 && out.length < total; i++) {
    const key = `delivery-event:${playerId}:${day}:${i}`;
    const { resource, city } = asked[draw(ctx, key) % asked.length] as (typeof asked)[number];
    push({
      kind: "city",
      city,
      resource,
      quantity: quantityOf(resource, key),
      unitPrice: orderUnitPrice(ctx, region, city, resource, 0, { state, day }),
      opensAt: dayStart,
      expiresAt,
    });
  }

  for (let i = 0; out.length < total; i++) {
    const o = order(`delivery:${playerId}:${day}:${i}`, true);
    push({
      kind: "city",
      ...o,
      unitPrice: orderUnitPrice(ctx, region, o.city, o.resource, 0, { state, day }),
      opensAt: dayStart,
      expiresAt,
    });
  }
  return out;
}

/**
 * One order of the merchant's board, by id: a shared one is read straight from the world's board
 * (hundreds of orders, not worth pricing them all), a personal one from the merchant's own board.
 */
function findDeliveryOrder(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  day: number,
  orderId: string,
): DeliveryOrder | undefined {
  // Board ids carry a letter (`3:w12`, `3:e0`, `3:u1`); personal ones are plain ranks (`3:4`).
  if (!/^\d+:[ewu]\d+$/.test(orderId)) {
    return deliveryOrdersFor(ctx, state, playerId, day, { board: false }).find(
      (o) => o.id === orderId,
    );
  }
  const board = state.board;
  const b = board && board.day === day ? board.orders.find((x) => x.id === orderId) : undefined;
  if (!b || !board) return undefined;
  return deliveryOrdersFor(ctx, { ...state, board: { ...board, orders: [b] } }, playerId, day).find(
    (o) => o.id === orderId,
  );
}

/** What the starting buildings of a region make: its own chain. */
function regionChain(ctx: WorldContext, region: string): Set<string> {
  return new Set(
    (ctx.settings.startingBuildings[region] ?? []).flatMap((type) =>
      ctx.theme.recipes.filter((r) => r.building === type).flatMap((r) => Object.keys(r.outputs)),
    ),
  );
}

/**
 * Raw goods are asked only of those who produce them: otherwise an order would just be buying at
 * the market and selling on (goods made from bought raw goods are fine).
 */
function mayBeAsked(ctx: WorldContext, region: string, resource: string): boolean {
  const tier = ctx.theme.resources.find((r) => r.code === resource)?.tier;
  return tier !== "raw" || regionChain(ctx, region).has(resource);
}

/**
 * How many other active merchants may take each order of the world's board: those whose region
 * reaches the city and may be asked for the goods.
 */
export function boardRivals(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): (order: { city: string; resource: string }) => number {
  const byRegion = new Map<string, number>();
  for (const p of Object.values(state.players)) {
    if (p.id === playerId || !isActive(ctx, p, now)) continue;
    byRegion.set(p.region, (byRegion.get(p.region) ?? 0) + 1);
  }
  return (order) => {
    let n = 0;
    for (const [region, count] of byRegion) {
      if (routeMinutes(ctx, region, order.city) === undefined) continue;
      if (mayBeAsked(ctx, region, order.resource)) n += count;
    }
    return n;
  };
}

/** The biggest takes of the day's board, by what the load pays, with who took them. */
export function boardTakes(
  state: WorldState,
  limit: number,
): { playerId: PlayerId; city: string; resource: string; quantity: number; payment: Deniers }[] {
  const taken = state.board?.takenBy ?? {};
  return Object.values(state.deliveries ?? {})
    .filter((d) => taken[d.orderId] === d.playerId)
    .sort((a, b) => (a.payment === b.payment ? 0 : a.payment > b.payment ? -1 : 1))
    .slice(0, limit)
    .map((d) => ({
      playerId: d.playerId,
      city: d.route.split(":")[1] ?? "",
      resource: d.resource,
      quantity: d.loaded,
      payment: d.payment,
    }));
}

/** The cities' orders form one board for the world (shared demand). */
export function sharedBoardOn(ctx: WorldContext): boolean {
  return deliveriesOn(ctx) && ctx.settings.deliveries.sharedOrdersPerActivePlayer > 0;
}

/**
 * Draws the world's board of the day, once, at the first command of the day: city orders and
 * urgent ones in proportion to the active merchants, the first ones where the day's event or the
 * act asks for more. Prices are set per merchant when read (`deliveryOrdersFor`).
 */
export function ensureBoard(tx: Tx): void {
  const { ctx } = tx;
  if (!sharedBoardOn(ctx)) return;
  const day = dayIndex(ctx, tx.now);
  const active = Math.max(1, activePlayerCount(ctx, tx.s as WorldState, tx.now));
  // Drawn once a day; grown (never shrunk) when merchants arrive during the day.
  const held = tx.s.board;
  if (held?.day === day && (held.active ?? active) >= active) return;
  const cfg = ctx.settings.deliveries;
  const dayStart = ctx.startAt + day * DAY_MS;
  const expiresAt = dayStart + DAY_MS;
  const capacity = Math.max(0, ...Object.values(cfg.vehicles).map((v) => v.capacity));
  const tier = (r: string) => ctx.theme.resources.find((x) => x.code === r)?.tier;
  const citiesBuying = (r: string) =>
    ctx.theme.cities.map((c) => c.code).filter((c) => ctx.settings.cities[c]?.[r]);
  // Goods from overseas only while the galleys of the Muda bring them.
  // Goods of a luxury chain only once an active merchant makes them.
  const made = (r: string) =>
    !lockedGood(ctx, r) ||
    Object.values(tx.s.players).some(
      (p) => isActive(ctx, p, tx.now) && makesGood(ctx, tx.s as WorldState, p.id, r),
    );
  const resources = Object.keys(cfg.quantity).filter(
    (r) => (tier(r) !== "luxury" || isMudaGood(ctx, r)) && citiesBuying(r).length > 0 && made(r),
  );
  const orders: BoardOrder[] = [];
  // Elastic demand: cheap goods are ordered more, dear ones less.
  const demand = boardDemand(ctx, tx.s as WorldState, day);
  if (resources.length > 0) {
    const weighted = resources.map((code) => ({
      code,
      weight: (cfg.weights[code] ?? 1) * (demand.factorBps[code] ?? 10_000),
    }));
    const quantityOf = (resource: string, key: string) => {
      const [lo, hi] = cfg.quantity[resource] ?? [1, 1];
      return Math.min(capacity, lo + (draw(ctx, `${key}:q`) % (Math.max(0, hi - lo) + 1)));
    };
    const add = (
      id: string,
      kind: BoardOrder["kind"],
      resource: string,
      city: string,
      key: string,
      opensAt: number,
      ends: number,
    ) =>
      orders.push({
        id: `${day}:${id}`,
        kind,
        city,
        resource,
        quantity: quantityOf(resource, key),
        opensAt,
        expiresAt: ends,
      });
    const random = (key: string) => {
      const h = draw(ctx, key);
      const resource = pickWeighted(weighted, h)?.code ?? "";
      const list = citiesBuying(resource);
      return { resource, city: list[(h >>> 8) % list.length] ?? "" };
    };
    const total = Math.floor((cfg.sharedOrdersPerActivePlayer * active * demand.totalBps) / 10_000);
    // City orders by rank: the n-th goes to wave n modulo the waves of the day.
    const every = (cfg.waves?.everyHours ?? 24) * HOUR_MS;
    const perDay = Math.max(1, Math.floor(DAY_MS / every));
    let rank = 0;
    const wave = (): [number, number] => {
      const opensAt = dayStart + (rank++ % perDay) * every;
      const open = cfg.waves ? cfg.waves.openHours * HOUR_MS : DAY_MS;
      return [opensAt, Math.min(expiresAt, opensAt + open)];
    };
    // Where the market asks for more: the same share of the board as on a personal board.
    const asked = resources.flatMap((resource) =>
      citiesBuying(resource)
        .filter((city) => marketCityBps(ctx, dayStart, city, resource, "capacity") > 10_000)
        .map((city) => ({ resource, city })),
    );
    const askedCount =
      asked.length > 0
        ? Math.min(
            total,
            Math.floor((total * cfg.eventOrdersPerDay) / Math.max(1, cfg.ordersPerDay.max)),
          )
        : 0;
    for (let i = 0; i < askedCount; i++) {
      const key = `board-event:${day}:${i}`;
      const pair = asked[draw(ctx, key) % asked.length] as (typeof asked)[number];
      add(`e${i}`, "city", pair.resource, pair.city, key, ...wave());
    }
    // Keyed by rank: a larger board holds the smaller one of the same day.
    for (let i = 0; i < total - askedCount; i++) {
      const key = `board:${day}:${i}`;
      const o = random(key);
      add(`w${i}`, "city", o.resource, o.city, key, ...wave());
    }
    for (let i = 0; i < cfg.urgentPerDay * active; i++) {
      const key = `board-urgent:${day}:${i}`;
      const opensAt = urgentOpening(ctx, dayStart, `${key}:at`);
      if (opensAt === undefined) continue;
      const o = random(key);
      add(
        `u${i}`,
        "urgent",
        o.resource,
        o.city,
        key,
        opensAt,
        opensAt + cfg.urgentOpenMinutes * MINUTE_MS,
      );
    }
  }
  tx.s.board = { day, active, orders, takenBy: held?.day === day ? held.takenBy : {} };
}

/** Orders of the board already dispatched today. */
export function deliveriesDoneToday(state: WorldState, playerId: PlayerId, day: number): string[] {
  const entry = state.deliveriesDone?.[playerId];
  return entry && entry.day === day ? entry.ids : [];
}

// ——— Departure and arrival ———

/** The vehicle id of a delivery made from the merchant's warehouse in the city. */
export const WAREHOUSE = "warehouse";

/** Value of a load at the order's price. */
function loadValue(o: DeliveryOrder): Deniers {
  return o.unitPrice * BigInt(o.quantity);
}

/**
 * Loads orders of today's board on a free vehicle and sets off: one order, or several for the same
 * city (up to `maxOrdersPerLoad`) within the vehicle's capacity. The goods leave the stock now; the
 * city pays on arrival.
 */
export function dispatchDelivery(
  tx: Tx,
  playerId: PlayerId,
  orderIds: string | string[],
  vehicleId: string,
): Delivery {
  const { ctx } = tx;
  if (!deliveriesOn(ctx)) fail("unknown_delivery_order");
  resolveDeliveries(tx);
  ensureBoard(tx);
  const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
  if (ids.length === 0 || new Set(ids).size !== ids.length) fail("invalid_quantity");
  if (ids.length > ctx.settings.deliveries.maxOrdersPerLoad) fail("too_many_orders");
  const state = tx.s as WorldState;
  const player = state.players[playerId];
  if (!player) fail("unknown_player");
  const region = player.region;
  const today = dayIndex(ctx, tx.now);
  const done = deliveriesDoneToday(state, playerId, today);
  const orders: DeliveryOrder[] = [];
  for (const orderId of ids) {
    const [dayText] = orderId.split(":");
    if (Number(dayText) !== today) fail("order_expired");
    const order = findDeliveryOrder(ctx, state, playerId, today, orderId);
    if (!order) fail("unknown_delivery_order");
    if (done.includes(orderId)) fail("order_done");
    if (order.shared && order.takenBy) fail("order_taken");
    if (order.kind === "doge" && contractsDoneToday(tx, playerId, today).includes(order.ref ?? ""))
      fail("order_done");
    if (tx.now < order.opensAt) fail("order_not_open");
    if (tx.now >= order.expiresAt) fail("order_expired");
    // The favour of a city: its urgent orders are the members' for a while.
    if (order.kind === "urgent") {
      const until = urgentReservedUntil(ctx, state, playerId, order.city, order.opensAt, tx.now);
      if (until !== null && tx.now < until) fail("order_reserved");
    }
    orders.push(order);
  }
  const first = orders[0] as DeliveryOrder;
  if (orders.some((o) => o.city !== first.city)) fail("several_cities");

  const units = orders.reduce((n, o) => n + o.quantity, 0);
  // From the merchant's warehouse in the city: at once, without a vehicle, so much a day.
  const fromWarehouse = vehicleId === WAREHOUSE;
  let minutes = 0;
  const vehicle = fromWarehouse ? undefined : tx.s.vehicles?.[vehicleId];
  if (fromWarehouse) {
    if (!warehouseHolders(state, first.city).includes(playerId)) fail("no_warehouse");
    useWarehouse(tx, playerId, today, units);
  } else {
    if (!vehicle) fail("unknown_vehicle");
    if (vehicle.playerId !== playerId) fail("not_owner");
    if (!vehicleFree(vehicle as Vehicle, tx.now)) fail("vehicle_busy");
    const def = ctx.settings.deliveries.vehicles[vehicle.type];
    if (!def) fail("unknown_vehicle_type");
    if (units > def.capacity) fail("over_capacity");
    const speedBonus = specialtyEffects(ctx, state, playerId).vehicleSpeedBps;
    const road = travelMinutes(ctx, region, first.city, vehicle.type, speedBonus);
    if (road === undefined) fail("no_route");
    minutes = road;
  }

  // Shared demand: the first who sends a vehicle takes the order.
  for (const o of orders) if (o.shared && tx.s.board) tx.s.board.takenBy[o.id] = playerId;
  const id = nextId(tx, "d");
  const cargo: Record<string, number> = {};
  for (const o of orders) {
    removeStock(tx, playerId, o.resource, o.quantity, "delivery", id);
    cargo[o.resource] = (cargo[o.resource] ?? 0) + o.quantity;
  }
  const trip = minutes * MINUTE_MS;
  const lines = orders.map((o) => ({
    id: o.id,
    kind: o.kind,
    ...(o.ref ? { ref: o.ref } : {}),
    resource: o.resource,
    quantity: o.quantity,
    payment: loadValue(o),
  }));
  const delivery: Delivery = {
    id,
    playerId,
    orderId: first.id,
    kind: first.kind,
    vehicleId,
    ...(first.ref ? { ref: first.ref } : {}),
    route: routeId(region, first.city),
    resource: first.resource,
    loaded: units,
    cargo,
    payment: lines.reduce((a, l) => a + l.payment, 0n),
    ...(lines.length > 1 ? { orders: lines } : {}),
    departAt: tx.now,
    arriveAt: tx.now + trip,
    backAt: tx.now + 2 * trip,
    outcome: "en_route",
  };
  tx.s.deliveries ??= {};
  tx.s.deliveries[id] = delivery;
  if (vehicle) vehicle.busyUntil = delivery.backAt;
  tx.s.deliveriesDone ??= {};
  tx.s.deliveriesDone[playerId] = { day: today, ids: [...done, ...ids] };
  // The Doge's orders cannot be served twice (at the counter, then by road).
  const doge = orders.filter((o) => o.kind === "doge" && o.ref).map((o) => o.ref as string);
  if (doge.length > 0) {
    tx.s.contractsDone ??= {};
    tx.s.contractsDone[playerId] = {
      day: today,
      ids: [...contractsDoneToday(tx, playerId, today), ...doge],
    };
  }
  emit(tx, "delivery_dispatched", playerId, {
    delivery: id,
    kind: first.kind,
    city: first.city,
    resource: first.resource,
    quantity: units,
    orders: ids.length,
  });
  if (fromWarehouse) arrive(tx, delivery);
  return delivery;
}

/** What a delivery carries, line by line (a single order for the deliveries of one order). */
export function deliveryLines(d: Delivery): DeliveryLine[] {
  return (
    d.orders ?? [
      {
        id: d.orderId,
        kind: d.kind,
        ...(d.ref ? { ref: d.ref } : {}),
        resource: d.resource,
        quantity: d.loaded,
        payment: d.payment,
      },
    ]
  );
}

/** The goods reach the city: it pays for what arrives, pro rata of what was loaded. */
function arrive(tx: Tx, d: Delivery): void {
  // Each order is paid for its share of what is left of its good.
  const lines = deliveryLines(d);
  const loadedBy: Record<string, number> = {};
  for (const l of lines) loadedBy[l.resource] = (loadedBy[l.resource] ?? 0) + l.quantity;
  let amount = 0n;
  let doge = 0n;
  let left = 0;
  const paidFor: Record<string, Deniers> = {};
  for (const l of lines) {
    const of = loadedBy[l.resource] ?? 0;
    const there = d.cargo[l.resource] ?? 0;
    const paid = of > 0 ? (l.payment * BigInt(there)) / BigInt(of) : 0n;
    amount += paid;
    paidFor[l.resource] = (paidFor[l.resource] ?? 0n) + paid;
    if (l.kind === "doge") doge += paid;
  }
  for (const qty of Object.values(d.cargo)) left += qty;
  const city = d.route.split(":")[1] ?? "";
  const state = tx.s as WorldState;
  // The Terraferma's embargo: the city pays the others less.
  const cut = Math.max(
    embargoCutBps(tx.ctx, state, d.playerId, city, tx.now),
    terraEmbargoCutBps(tx.ctx, state, d.playerId, city),
  );
  if (cut > 0) amount -= applyBpsFloor(amount, cut);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), amount, "delivery", d.id);
  d.paid = amount;
  // The fattore's commission, destroyed.
  const commissionBps = d.fattore ? (tx.ctx.settings.deliveries.fattore?.commissionBps ?? 0) : 0;
  if (commissionBps > 0 && amount > 0n) {
    const commission = applyBpsFloor(amount, commissionBps);
    transfer(tx, cashAccount(d.playerId), SINK_ACCOUNT, commission, "fattore", d.id);
    d.paid -= commission;
  }
  d.outcome = "delivered";
  // The official supplier of the good in this city is paid more.
  d.paid += supplyArrived(tx, d.playerId, city, d.cargo, paidFor, d.id);
  // The Terraferma's favour of the Doge: his contracts pay the Signore and his allies more.
  const dogeBps = dogeFavourBps(tx.ctx, state, d.playerId, tx.now);
  if (dogeBps > 0 && doge > 0n) {
    const premium = applyBpsFloor(doge, dogeBps);
    transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), premium, "decree_favour", d.id);
    d.paid += premium;
  }
  // The decrees of the week: the favour of a city pays its family's members more, the toll of
  // the cities it held takes a share from the others.
  const favour = favourBps(tx.ctx, state, d.playerId, city, tx.now);
  if (favour > 0 && amount > 0n) {
    const premium = applyBpsFloor(amount, favour);
    transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), premium, "decree_favour", d.id);
    d.paid += premium;
  }
  const toll = tollOn(tx.ctx, state, d.playerId, city, tx.now);
  if (toll && amount > 0n) {
    const due = applyBpsFloor(amount, toll.bps);
    transfer(tx, cashAccount(d.playerId), familyAccount(toll.family), due, "decree_toll", d.id);
  }
  emit(tx, "delivery_arrived", d.playerId, {
    delivery: d.id,
    kind: d.kind,
    city,
    resource: d.resource,
    quantity: left,
    amount: amount.toString(),
  });
  for (const l of lines) {
    if (l.kind === "doge")
      emit(tx, "contract_fulfilled", d.playerId, { contract: l.ref, resource: l.resource });
  }
}

/** A delivery that arrives now, ahead of its time (rushed with Influence). */
export function arriveNow(tx: Tx, d: Delivery): void {
  if (d.outcome === "en_route") arrive(tx, d);
}

/** Scheduled (every tick) and before any delivery command: the goods due arrive, in time order. */
export function resolveDeliveries(tx: Tx): void {
  const due = entries(tx.s.deliveries as Record<string, Delivery>)
    .filter((d) => d.outcome === "en_route" && tx.now >= d.arriveAt)
    .sort((a, b) => a.arriveAt - b.arriveAt || (a.id < b.id ? -1 : 1))
    .map((d) => tx.s.deliveries?.[d.id] as Delivery);
  for (const d of due) if (d.outcome === "en_route") arrive(tx, d);
}

/**
 * Forgets finished deliveries after a few days, so that the world's state (one JSON
 * document) does not grow all season.
 */
export function pruneRoad(tx: Tx): void {
  const before = tx.now - ROAD_RETENTION_MS;
  for (const d of entries(tx.s.deliveries as Record<string, Delivery>)) {
    if (d.outcome !== "en_route" && d.backAt < before) delete tx.s.deliveries?.[d.id];
  }
}
