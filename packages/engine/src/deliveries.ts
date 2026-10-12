import { isDraft, original } from "immer";
import { costValue } from "./buildings.js";
import { hourIn, hourWithin } from "./clock.js";
import { contractsDoneToday, contractsFor } from "./contracts.js";
import { draw, pickWeighted } from "./draw.js";
import { eventCityBps } from "./events.js";
import { addInfluence, familyOrdersDone, familyOrdersFor } from "./families.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import { maxVehiclesFor, specialtyEffects } from "./specialties.js";
import {
  type BanditBand,
  DAY_MS,
  type Delivery,
  type DeliveryOrder,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type Vehicle,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
} from "./state.js";
import { type Tx, addStock, emit, fail, nextId, removeStock, transfer } from "./tx.js";
import { netWorth } from "./valuation.js";

/**
 * Deliveries by road: the land side of the sea. Each merchant gets a board of personal orders
 * every day and carts the goods to the city with their own vehicles; the city pays on arrival.
 * Bandits (players or the computer) may lie in wait on a road; a merchant without escort can fight
 * back for a few minutes.
 */

/** Finished deliveries and bands stay this long in the world's state (views, notices, recap). */
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

export function vehicleUpkeep(ctx: WorldContext, v: Vehicle): Deniers {
  return ctx.settings.deliveries.vehicles[v.type]?.upkeepPerDay ?? 0n;
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
): Deniers {
  const { cityPriceBps, distanceBonusBpsPerHour } = ctx.settings.deliveries;
  const minutes = routeMinutes(ctx, region, city) ?? 0;
  const bps = cityPriceBps + Math.floor((distanceBonusBpsPerHour * minutes) / 60) + extraBps;
  return applyBpsFloor(ctx.settings.referencePrices[resource] ?? 0n, bps);
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
  // A market event of the day pays its price on every order it touches (events last a world day).
  const push = (o: Omit<DeliveryOrder, "id" | "day">) => {
    const bps = eventCityBps(ctx, dayStart, o.city, o.resource, "price");
    const unitPrice = bps === 10_000 ? o.unitPrice : applyBpsFloor(o.unitPrice, bps);
    out.push({ ...o, unitPrice, id: `${day}:${out.length}`, day });
  };
  const cityFor = (resource: string, key: string) => {
    const list = buyers(ctx, region, resource);
    const pool = list.length > 0 ? list : anyCity;
    return pool[draw(ctx, key) % Math.max(1, pool.length)];
  };

  // The merchant's own chain: what the starting buildings of the region make.
  const chain = new Set(
    (ctx.settings.startingBuildings[region] ?? []).flatMap((type) =>
      ctx.theme.recipes.filter((r) => r.building === type).flatMap((r) => Object.keys(r.outputs)),
    ),
  );
  // Raw goods are asked only of those who produce them: otherwise an order would just be buying
  // at the market and selling on (goods made from bought raw goods are fine).
  const tier = (resource: string) => ctx.theme.resources.find((r) => r.code === resource)?.tier;
  const mayOrder = (resource: string) => tier(resource) !== "raw" || chain.has(resource);

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
        unitPrice: orderUnitPrice(ctx, region, city, welcome.resource),
        opensAt: dayStart,
        expiresAt,
      });
    }
  }

  // The Doge's orders (their own draw), at the Doge's premium.
  for (const c of contractsFor(ctx, playerId, day).slice(0, cfg.dogeOrdersPerDay)) {
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
  // The family's orders, at their premium.
  for (const f of familyOrdersFor(ctx, state, playerId, day)) {
    if (!mayOrder(f.resource)) continue;
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
      unitPrice: orderUnitPrice(ctx, region, o.city, o.resource, cfg.urgentPremiumBps),
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
      .filter((city) => eventCityBps(ctx, dayStart, city, resource, "capacity") > 10_000)
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
      unitPrice: orderUnitPrice(ctx, region, city, resource),
      opensAt: dayStart,
      expiresAt,
    });
  }

  for (let i = 0; out.length < total; i++) {
    const o = order(`delivery:${playerId}:${day}:${i}`, true);
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

// ——— Departure and arrival ———

/** Value of a load at the order's price. */
function loadValue(o: DeliveryOrder): Deniers {
  return o.unitPrice * BigInt(o.quantity);
}

/** What an escort costs for this order (destroyed). */
export function escortCost(ctx: WorldContext, o: DeliveryOrder, escort: string): Deniers {
  if (escort === "none") return 0n;
  const def = ctx.settings.deliveries.escorts[escort];
  return def ? applyBpsFloor(loadValue(o), def.costBps) : 0n;
}

/** Defense of a delivery: 0 alone, the escort's otherwise. */
export function escortDefense(ctx: WorldContext, escort: string): number {
  return escort === "none" ? 0 : (ctx.settings.deliveries.escorts[escort]?.defense ?? 0);
}

/**
 * Loads an order of today's board on a free vehicle and sets off. The goods leave the stock now;
 * the city pays on arrival.
 */
export function dispatchDelivery(
  tx: Tx,
  playerId: PlayerId,
  orderId: string,
  vehicleId: string,
  escort: string,
): Delivery {
  const { ctx } = tx;
  if (!deliveriesOn(ctx)) fail("unknown_delivery_order");
  resolveDeliveries(tx);
  const state = tx.s as WorldState;
  const player = state.players[playerId];
  if (!player) fail("unknown_player");
  const today = dayIndex(ctx, tx.now);
  const [dayText] = orderId.split(":");
  if (Number(dayText) !== today) fail("order_expired");
  const order = deliveryOrdersFor(ctx, state, playerId, today).find((o) => o.id === orderId);
  if (!order) fail("unknown_delivery_order");
  const done = deliveriesDoneToday(state, playerId, today);
  if (done.includes(orderId)) fail("order_done");
  if (order.kind === "doge" && contractsDoneToday(tx, playerId, today).includes(order.ref ?? ""))
    fail("order_done");
  if (order.kind === "family" && familyOrdersDone(state, playerId, today).includes(order.ref ?? ""))
    fail("order_done");
  if (tx.now < order.opensAt) fail("order_not_open");
  if (tx.now >= order.expiresAt) fail("order_expired");

  const vehicle = tx.s.vehicles?.[vehicleId];
  if (!vehicle) fail("unknown_vehicle");
  if (vehicle.playerId !== playerId) fail("not_owner");
  if (!vehicleFree(vehicle as Vehicle, tx.now)) fail("vehicle_busy");
  const def = ctx.settings.deliveries.vehicles[vehicle.type];
  if (!def) fail("unknown_vehicle_type");
  if (order.quantity > def.capacity) fail("over_capacity");
  if (escort !== "none" && !ctx.settings.deliveries.escorts[escort]) fail("unknown_escort");
  const minutes = travelMinutesFor(ctx, state, playerId, order.city, vehicle.type);
  if (minutes === undefined) fail("no_route");

  const id = nextId(tx, "d");
  removeStock(tx, playerId, order.resource, order.quantity, "delivery", id);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, escortCost(ctx, order, escort), "escort", id);
  const trip = minutes * MINUTE_MS;
  const delivery: Delivery = {
    id,
    playerId,
    orderId,
    kind: order.kind,
    vehicleId,
    ...(order.ref ? { ref: order.ref } : {}),
    route: routeId(player.region, order.city),
    resource: order.resource,
    loaded: order.quantity,
    cargo: { [order.resource]: order.quantity },
    payment: loadValue(order),
    escort,
    departAt: tx.now,
    arriveAt: tx.now + trip,
    backAt: tx.now + 2 * trip,
    midAt: tx.now + Math.floor(trip / 2),
    outcome: "en_route",
  };
  tx.s.deliveries ??= {};
  tx.s.deliveries[id] = delivery;
  vehicle.busyUntil = delivery.backAt;
  tx.s.deliveriesDone ??= {};
  tx.s.deliveriesDone[playerId] = { day: today, ids: [...done, orderId] };
  // The Doge's and the family's orders cannot be served twice (at the counter, then by road).
  if (order.kind === "doge" && order.ref) {
    tx.s.contractsDone ??= {};
    tx.s.contractsDone[playerId] = {
      day: today,
      ids: [...contractsDoneToday(tx, playerId, today), order.ref],
    };
  }
  if (order.kind === "family" && order.ref && tx.s.families) {
    tx.s.families.ordersDone[playerId] = {
      day: today,
      ids: [...familyOrdersDone(state, playerId, today), order.ref],
    };
  }
  emit(tx, "delivery_dispatched", playerId, {
    delivery: id,
    kind: order.kind,
    city: order.city,
    resource: order.resource,
    quantity: order.quantity,
    escort,
  });
  return delivery;
}

/** The goods reach the city: it pays for what arrives, pro rata of what was loaded. */
function arrive(tx: Tx, d: Delivery): void {
  const left = d.cargo[d.resource] ?? 0;
  const amount = d.loaded > 0 ? (d.payment * BigInt(left)) / BigInt(d.loaded) : 0n;
  transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), amount, "delivery", d.id);
  d.paid = amount;
  d.outcome = d.attack?.success ? "robbed_delivered" : "delivered";
  const city = d.route.split(":")[1] ?? "";
  emit(tx, "delivery_arrived", d.playerId, {
    delivery: d.id,
    kind: d.kind,
    city,
    resource: d.resource,
    quantity: left,
    amount: amount.toString(),
  });
  if (d.kind === "doge") {
    emit(tx, "contract_fulfilled", d.playerId, { contract: d.ref, resource: d.resource });
  }
  if (d.kind === "family") {
    const family = tx.s.families?.members[d.playerId];
    if (family) {
      const influence = tx.ctx.settings.families.orderInfluence;
      addInfluence(tx, d.playerId, influence);
      emit(tx, "family_order_fulfilled", d.playerId, {
        family,
        order: d.ref,
        resource: d.resource,
        influence,
      });
    }
  }
}

/**
 * Scheduled (every tick) and before any delivery command: deliveries reach mid-way (where bands
 * may strike), the time to fight back runs out, goods arrive. In time order.
 */
export function resolveDeliveries(tx: Tx): void {
  const due = entries(tx.s.deliveries as Record<string, Delivery>)
    .filter((d) => d.outcome === "en_route" && tx.now >= Math.min(d.midAt, d.arriveAt))
    .sort((a, b) => a.midAt - b.midAt || (a.id < b.id ? -1 : 1))
    .map((d) => tx.s.deliveries?.[d.id] as Delivery);
  for (const d of due) {
    if (d.outcome !== "en_route") continue;
    if (!d.crossed && tx.now >= d.midAt) cross(tx, d);
    const a = d.attack;
    if (a && a.success === undefined && tx.now >= a.reactBy) settle(tx, d, a.reactBy);
    if (tx.now >= d.arriveAt) arrive(tx, d);
  }
  closeBands(tx);
}

// ——— Bandits ———

export function banditsOn(ctx: WorldContext): boolean {
  return ctx.settings.bandits.hoursOptions.length > 0;
}

/** Bands still able to strike at `at` (posted, not over, not broken up, attempts left). */
function bandLive(ctx: WorldContext, b: BanditBand, at: number): boolean {
  return (
    !b.dispersed &&
    b.attacks < ctx.settings.bandits.maxAttacksPerBand &&
    b.startAt <= at &&
    at < b.endAt
  );
}

/** All roads: every region to every city it reaches. */
export function allRoutes(ctx: WorldContext): string[] {
  const out: string[] = [];
  for (const [region, cities] of Object.entries(ctx.settings.deliveries.routes)) {
    for (const city of Object.keys(cities)) out.push(routeId(region, city));
  }
  return out;
}

function routeExists(ctx: WorldContext, route: string): boolean {
  const [region = "", city = ""] = route.split(":");
  return routeMinutes(ctx, region, city) !== undefined;
}

/** Roads where bandits lie in wait now (who they are stays hidden). */
export function watchedRoads(ctx: WorldContext, state: WorldState, now: number): string[] {
  const routes = new Set<string>();
  for (const b of Object.values(state.bands ?? {})) if (bandLive(ctx, b, now)) routes.add(b.route);
  return [...routes].sort();
}

/** Chance that an ambush succeeds against this defense: the entry with the largest key ≤ it. */
export function ambushChanceBps(ctx: WorldContext, defense: number): number {
  let best = -1;
  let chance = 0;
  for (const [key, bps] of Object.entries(ctx.settings.bandits.attackChanceBps)) {
    const k = Number(key);
    if (k <= defense && k > best) {
      best = k;
      chance = bps;
    }
  }
  return chance;
}

export function postBand(tx: Tx, playerId: PlayerId, route: string, hours: number): BanditBand {
  const { ctx } = tx;
  const cfg = ctx.settings.bandits;
  if (!banditsOn(ctx)) fail("no_bandits");
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (tx.now < player.joinedAt + cfg.openDay * DAY_MS) fail("bandits_locked");
  if (!routeExists(ctx, route)) fail("no_route");
  if (!cfg.hoursOptions.includes(hours)) fail("invalid_hours");
  const bands = entries(tx.s.bands as Record<string, BanditBand>);
  const mine = bands.filter((b) => b.playerId === playerId && !b.dispersed && tx.now < b.endAt);
  if (mine.length >= cfg.maxActivePerPlayer) fail("too_many_bands");
  if (
    bands.filter((b) => b.route === route && bandLive(ctx, b, tx.now)).length >=
    cfg.maxBandsPerRoute
  )
    fail("route_full");
  const id = nextId(tx, "k");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, cfg.feePerHour * BigInt(hours), "bandits", id);
  for (const [res, qty] of Object.entries(cfg.provisionsPerHour)) {
    removeStock(tx, playerId, res, qty * hours, "bandits", id);
  }
  const band = newBand(id, playerId, route, tx.now, tx.now + hours * HOUR_MS);
  tx.s.bands ??= {};
  tx.s.bands[id] = band;
  emit(tx, "band_posted", playerId, { band: id, route, hours });
  return band;
}

function newBand(
  id: string,
  playerId: PlayerId | null,
  route: string,
  startAt: number,
  endAt: number,
): BanditBand {
  return {
    id,
    playerId,
    route,
    startAt,
    endAt,
    attacks: 0,
    dispersed: false,
    booty: {},
    collected: false,
  };
}

/** May this band strike this delivery's merchant? The safeguards of the road. */
function fairPrey(tx: Tx, b: BanditBand, d: Delivery, at: number): boolean {
  const cfg = tx.ctx.settings.bandits;
  if (b.playerId === null) return true;
  if (b.playerId === d.playerId) return false;
  const members = tx.s.families?.members ?? {};
  const family = members[d.playerId];
  if (cfg.sameFamilyImmune && family && members[b.playerId] === family) return false;
  const state = baseState(tx);
  const theirs = netWorth(tx.ctx, state, d.playerId, at).total;
  const ours = netWorth(tx.ctx, state, b.playerId, at).total;
  return theirs * 10_000n >= ours * BigInt(cfg.minTargetWorthBps);
}

/** Mid-way: the oldest band lying in wait on the road may strike, once. */
function cross(tx: Tx, d: Delivery): void {
  d.crossed = true;
  const { ctx } = tx;
  const cfg = ctx.settings.bandits;
  const at = d.midAt;
  const victim = tx.s.players[d.playerId];
  if (!victim || !banditsOn(ctx)) return;
  if (hourWithin(hourIn(at), cfg.quietHours)) return;
  if (at < victim.joinedAt + cfg.newcomerDays * DAY_MS) return;
  const last = tx.s.plunderedAt?.[d.playerId];
  if (last !== undefined && at < last + cfg.cooldownHours * HOUR_MS) return;
  const band = entries(tx.s.bands as Record<string, BanditBand>)
    .filter((b) => b.route === d.route)
    .map((b) => tx.s.bands?.[b.id] as BanditBand)
    .filter((b) => bandLive(ctx, b, at))
    .sort((a, b) => a.startAt - b.startAt || (a.id < b.id ? -1 : 1))
    .find((b) => fairPrey(tx, b, d, at));
  if (!band) return;
  band.attacks += 1;
  const defense = escortDefense(ctx, d.escort);
  const escorted = d.escort !== "none";
  // Without escort the delivery halts: the merchant always has the full time to fight back,
  // counted from when the engine sees the ambush.
  const reactBy = escorted ? at : Math.max(at, tx.now) + cfg.reactionMinutes * MINUTE_MS;
  d.attack = {
    bandId: band.id,
    banditId: band.playerId,
    at,
    chanceBps: ambushChanceBps(ctx, defense),
    reactBy,
    reacted: false,
    taken: {},
  };
  if (escorted) {
    settle(tx, d, at);
    return;
  }
  const delay = reactBy - at;
  d.arriveAt += delay;
  d.backAt += delay;
  const vehicle = tx.s.vehicles?.[d.vehicleId];
  if (vehicle && vehicle.busyUntil < d.backAt) vehicle.busyUntil = d.backAt;
  emit(tx, "delivery_ambushed", d.playerId, {
    delivery: d.id,
    route: d.route,
    reactBy,
    bandit: band.playerId,
  });
}

/** The ambush is decided: a draw against the chance of the escort's defense. */
function settle(tx: Tx, d: Delivery, at: number): void {
  const a = d.attack;
  if (!a) return;
  const band = tx.s.bands?.[a.bandId];
  const success = draw(tx.ctx, `ambush:${d.id}`) % 10_000 < a.chanceBps;
  a.resolvedAt = tx.now;
  a.success = success;
  const data = { delivery: d.id, route: d.route, bandit: a.banditId, victim: d.playerId };
  if (!success) {
    emit(tx, "delivery_defended", d.playerId, { ...data, reacted: false });
    if (a.banditId) {
      emit(tx, "band_struck", a.banditId, { ...data, success: false });
      payBounty(tx, d, a.banditId);
    }
    return;
  }
  const { takeBps, keepBps } = tx.ctx.settings.bandits;
  for (const [resource, qty] of Object.entries(d.cargo)) {
    const taken = Math.floor((qty * takeBps) / 10_000);
    if (taken <= 0) continue;
    d.cargo[resource] = qty - taken;
    a.taken[resource] = taken;
    // A share may be lost in flight (keepBps).
    if (band)
      band.booty[resource] = (band.booty[resource] ?? 0) + Math.floor((taken * keepBps) / 10_000);
  }
  tx.s.plunderedAt ??= {};
  tx.s.plunderedAt[d.playerId] = Math.max(at, tx.now);
  if (a.banditId) {
    tx.s.infamy ??= {};
    tx.s.infamy[a.banditId] = (tx.s.infamy[a.banditId] ?? 0) + 1;
  }
  emit(tx, "delivery_robbed", d.playerId, { ...data, taken: { ...a.taken } });
  if (a.banditId)
    emit(tx, "band_struck", a.banditId, { ...data, success: true, taken: { ...a.taken } });
}

/** What the Doge pays for beating off this bandit: more as their infamy grows, capped. */
export function bountyFor(ctx: WorldContext, state: WorldState, banditId: PlayerId): Deniers {
  const { base, perInfamyBps, max } = ctx.settings.bandits.bounty;
  const infamy = state.infamy?.[banditId] ?? 0;
  const amount = applyBpsFloor(base, 10_000 + infamy * perInfamyBps);
  return amount < max ? amount : max;
}

/** A player's band beaten off: the Doge's bounty to the merchant, through the ledger. */
function payBounty(tx: Tx, d: Delivery, banditId: PlayerId): void {
  const amount = bountyFor(tx.ctx, tx.s as WorldState, banditId);
  if (amount <= 0n) return;
  transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), amount, "bounty", d.id);
  if (d.attack) d.attack.bounty = amount;
  tx.s.bounties ??= {};
  tx.s.bounties[d.playerId] = (tx.s.bounties[d.playerId] ?? 0n) + amount;
  emit(tx, "bounty_paid", d.playerId, {
    delivery: d.id,
    bandit: banditId,
    amount: amount.toString(),
  });
}

/** The merchant fights back in time: the ambush fails and the band breaks up. */
export function reactToAmbush(tx: Tx, playerId: PlayerId, deliveryId: string): void {
  const d = tx.s.deliveries?.[deliveryId] as Delivery | undefined;
  if (!d) fail("unknown_delivery");
  if (d.playerId !== playerId) fail("not_owner");
  const a = d.attack;
  if (!a || a.reacted || a.success !== undefined) {
    resolveDeliveries(tx);
    fail("no_ambush");
  }
  if (tx.now > a.reactBy) fail("too_late");
  a.reacted = true;
  a.resolvedAt = tx.now;
  a.success = false;
  const band = tx.s.bands?.[a.bandId];
  if (band) band.dispersed = true;
  const data = { delivery: d.id, route: d.route, bandit: a.banditId, victim: d.playerId };
  emit(tx, "delivery_defended", playerId, { ...data, reacted: true });
  if (a.banditId) {
    emit(tx, "band_dispersed", a.banditId, { ...data, band: a.bandId });
    payBounty(tx, d, a.banditId);
  }
  resolveDeliveries(tx);
}

/** An ambush of this band still waits for the merchant's answer. */
function bandWaiting(state: WorldState, bandId: string): boolean {
  return entries(state.deliveries).some(
    (d) => d.attack?.bandId === bandId && d.attack.success === undefined,
  );
}

/** The band is over (or broken up): its booty enters the bandit's stock. */
export function collectBooty(tx: Tx, playerId: PlayerId, bandId: string): void {
  resolveDeliveries(tx);
  const band = tx.s.bands?.[bandId];
  if (!band) fail("unknown_band");
  if (band.playerId !== playerId) fail("not_owner");
  if (band.collected) fail("booty_collected");
  if ((!band.dispersed && tx.now < band.endAt) || bandWaiting(tx.s as WorldState, bandId))
    fail("band_active");
  for (const [resource, qty] of Object.entries(band.booty)) {
    if (qty > 0) addStock(tx, playerId, resource, qty, "booty", band.id);
  }
  band.collected = true;
  emit(tx, "booty_collected", playerId, { band: band.id, booty: { ...band.booty } });
}

/**
 * Forgets finished deliveries and bands after a few days, so that the world's state (one JSON
 * document) does not grow all season.
 */
export function pruneRoad(tx: Tx): void {
  const before = tx.now - ROAD_RETENTION_MS;
  for (const d of entries(tx.s.deliveries as Record<string, Delivery>)) {
    if (d.outcome !== "en_route" && d.backAt < before) delete tx.s.deliveries?.[d.id];
  }
  for (const b of entries(tx.s.bands as Record<string, BanditBand>)) {
    if (b.collected && b.endAt < before) delete tx.s.bands?.[b.id];
  }
}

/** The computer's bands: posted each day; once over, their booty is lost. */
function closeBands(tx: Tx): void {
  const { ctx } = tx;
  if (!banditsOn(ctx)) return;
  const state = tx.s as WorldState;
  for (const old of entries(tx.s.bands as Record<string, BanditBand>)) {
    if (old.playerId !== null || old.collected || tx.now < old.endAt) continue;
    const b = tx.s.bands?.[old.id];
    if (b && !bandWaiting(state, b.id)) b.collected = true;
  }
  const { perDay, hours } = ctx.settings.bandits.npcBands;
  const today = dayIndex(ctx, tx.now);
  if (perDay === 0 || (tx.s.npcBandsDay ?? -1) >= today) return;
  tx.s.npcBandsDay = today;
  const routes = allRoutes(ctx);
  if (routes.length === 0) return;
  const dayStart = ctx.startAt + today * DAY_MS;
  const quiet = ctx.settings.bandits.quietHours;
  const open: number[] = [];
  for (let h = 0; h < 24; h++) {
    const at = dayStart + h * HOUR_MS;
    if (!hourWithin(hourIn(at), quiet)) open.push(at);
  }
  for (let i = 0; i < perDay; i++) {
    const h = draw(ctx, `npc-band:${today}:${i}`);
    const route = routes[h % routes.length] ?? "";
    const startAt =
      (open[(h >>> 8) % Math.max(1, open.length)] ?? dayStart) + ((h >>> 16) % 60) * MINUTE_MS;
    const id = nextId(tx, "k");
    tx.s.bands ??= {};
    tx.s.bands[id] = newBand(id, null, route, startAt, startAt + hours * HOUR_MS);
  }
}
