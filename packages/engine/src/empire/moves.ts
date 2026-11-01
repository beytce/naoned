import { applyBpsFloor } from "../money.js";
import type { EmpireHouse, EmpireLeg, PlayerId } from "../state.js";
import { type Tx, fail } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { houseEffect } from "./effects.js";
import { capacityOf } from "./fleet.js";
import { empireSettings, ownHouse } from "./house.js";
import { citiesCovered, citySpot, standingPosts, unlockedOf } from "./map.js";
import { askedOf, fillCity, ordersOf } from "./orders.js";
import type { EmpireSettings } from "./settings.js";
import { HOME_POST, putAt, storeOf, takeAt } from "./stores.js";
import { receive } from "./trade.js";

/**
 * The vehicles' hops (decision of the owner, 1 November 2026, after Hades' Star): a vehicle is
 * sent from where it stands to a place of the house's sectors (a city, a counter), one stop after
 * another; the first leaves after a few seconds (left at once, or the last stop taken back, until
 * then), each next when the one before arrives, and a hop begun is not stopped. Leaving a counter
 * for cities, it loads what their orders ask of the counter's stock; at a city it brings what its
 * orders ask of its cargo, paid at the arrival; at a counter its cargo stays aboard, to unload.
 */

type Vehicle = NonNullable<EmpireHouse["vehicles"]>[number];

const CITY = "city:";
export const cityPlace = (code: string) => `${CITY}${code}`;
export const placeCity = (place: string) =>
  place.startsWith(CITY) ? place.slice(CITY.length) : null;

/** A place's point on the chart: a standing counter's, or a city's of the house's sectors. */
export function placePoint(
  h: EmpireHouse,
  s: EmpireSettings,
  place: string,
): [number, number] | null {
  const code = placeCity(place);
  if (code !== null) {
    const c = s.map.cities.find((x) => x.code === code);
    // A city of its sectors, or one a counter of the house serves.
    const ok = c && (unlockedOf(h, s).includes(c.cell) || citiesCovered(h, s).has(c.code));
    return c && ok ? citySpot(c, s) : null;
  }
  const p = standingPosts(h, s).find((x) => x.id === place);
  return p ? [p.x, p.y] : null;
}

/** Where a vehicle stands, or its last stop to come. */
const lastPlace = (v: Vehicle) => v.legs?.at(-1)?.to ?? v.at ?? HOME_POST;

/** A hop's time, in ms: its length at the vehicles' speed, a second at the least. */
export function hopMs(s: EmpireSettings, a: [number, number], b: [number, number]): number {
  return Math.max(
    1_000,
    Math.round((Math.hypot(b[0] - a[0], b[1] - a[1]) / s.moves.unitsPerSecond) * 1_000),
  );
}

/** A vehicle's hold, its model's level and the house's effects counted. */
export function holdOf(h: EmpireHouse, v: Vehicle, s: EmpireSettings): number {
  return Math.floor(
    (capacityOf(h, v.type, s) * (10_000 + houseEffect(h, "capacity", s, { vehicleId: v.id }))) /
      10_000,
  );
}

const carried = (v: Vehicle) => Object.values(v.cargo ?? {}).reduce((n, c) => n + c.qty, 0);

/** Has the vehicle left yet: a hop begun. */
const underWay = (v: Vehicle, now: number) =>
  (v.legs?.[0]?.departAt ?? Number.POSITIVE_INFINITY) <= now;

function vehicleOf(h: EmpireHouse, s: EmpireSettings, vehicleId: string): Vehicle {
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  if (!s.vehicles[v.type]) fail("unknown_building_type");
  if (v.porta) fail("vehicle_busy");
  return v;
}

/**
 * Loads at the counter it stands at what the orders of its stops to come ask (those it does not
 * carry already), no more than it holds nor than the counter has.
 */
function loadFor(tx: Tx, h: EmpireHouse, playerId: PlayerId, v: Vehicle): void {
  const s = empireSettings(tx.ctx);
  const post = v.at ?? HOME_POST;
  if (placeCity(post) !== null) return;
  let room = holdOf(h, v, s) - carried(v);
  const cities = [...new Set((v.legs ?? []).map((l) => placeCity(l.to)).filter((c) => c !== null))];
  const want = new Map<string, number>();
  const orders = ordersOf(tx.ctx, h, playerId, s, tx.now);
  for (const code of cities)
    for (const o of orders.find((x) => x.city === code)?.orders ?? [])
      want.set(o.good, (want.get(o.good) ?? 0) + o.qty - o.filled);
  for (const [good, asked] of want) {
    if (room <= 0) break;
    const have = v.cargo?.[good]?.qty ?? 0;
    const n = Math.min(room, asked - have, storeOf(tx, h, playerId, post, good));
    if (n <= 0) continue;
    takeAt(tx, h, playerId, post, good, n, "empire_voyage");
    v.cargo = { ...(v.cargo ?? {}), [good]: { qty: have + n, from: post } };
    room -= n;
  }
}

/** Sends a vehicle to a place: a stop more at the end of its queue. */
export function moveVehicle(tx: Tx, playerId: PlayerId, vehicleId: string, to: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId);
  if ((v.legs?.length ?? 0) >= s.moves.maxStops) fail("invalid_quantity");
  const from = lastPlace(v);
  if (from === to) fail("unknown_target");
  const a = placePoint(h, s, from);
  const b = placePoint(h, s, to);
  if (!a || !b) fail("unknown_target");
  const last = v.legs?.at(-1);
  const departAt = last ? last.arrivesAt : tx.now + s.moves.departSeconds * 1_000;
  const leg: EmpireLeg = { from, to, departAt, arrivesAt: departAt + hopMs(s, a, b) };
  v.legs = [...(v.legs ?? []), leg];
  v.busyUntil = leg.arrivesAt;
  // Still at its counter: it loads for its stops to come.
  if (!underWay(v, tx.now)) loadFor(tx, h, playerId, v);
}

/** Leaves at once, if not under way yet: every stop to come as much earlier. */
export function departNow(tx: Tx, playerId: PlayerId, vehicleId: string): void {
  const s = empireSettings(tx.ctx);
  const v = vehicleOf(ownHouse(tx, playerId), s, vehicleId);
  const first = v.legs?.[0];
  if (!first || first.departAt <= tx.now) fail("building_busy");
  const early = first.departAt - tx.now;
  v.legs = (v.legs ?? []).map((l) => ({
    ...l,
    departAt: l.departAt - early,
    arrivesAt: l.arrivesAt - early,
  }));
  v.busyUntil = v.legs.at(-1)?.arrivesAt ?? tx.now;
}

/** Takes back the last stop not begun; a hop begun is not stopped. */
export function cancelStop(tx: Tx, playerId: PlayerId, vehicleId: string): void {
  const s = empireSettings(tx.ctx);
  const v = vehicleOf(ownHouse(tx, playerId), s, vehicleId);
  const last = v.legs?.at(-1);
  if (!last || last.departAt <= tx.now) fail("building_busy");
  const legs = (v.legs ?? []).slice(0, -1);
  v.legs = legs.length > 0 ? legs : undefined;
  v.busyUntil = legs.at(-1)?.arrivesAt ?? tx.now;
}

/** Loads (qty > 0) or unloads (qty < 0) by hand, the vehicle at a counter and not under way. */
export function loadVehicle(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  good: string,
  qty: number,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId);
  const post = v.at ?? HOME_POST;
  if (placeCity(post) !== null || !standingPosts(h, s).some((p) => p.id === post))
    fail("unknown_target");
  if (underWay(v, tx.now)) fail("building_busy");
  if (!Number.isInteger(qty) || qty === 0) fail("invalid_quantity");
  const have = v.cargo?.[good]?.qty ?? 0;
  if (qty > 0) {
    if (carried(v) + qty > holdOf(h, v, s)) fail("invalid_quantity");
    takeAt(tx, h, playerId, post, good, qty, "empire_voyage");
    v.cargo = { ...(v.cargo ?? {}), [good]: { qty: have + qty, from: post } };
  } else {
    if (-qty > have) fail("insufficient_stock");
    putAt(tx, h, playerId, post, good, -qty, "empire_voyage", v.id);
    setCargo(v, good, have + qty, post);
  }
}

function setCargo(v: Vehicle, good: string, qty: number, from: string): void {
  const { [good]: _, ...rest } = v.cargo ?? {};
  const next = qty > 0 ? { ...rest, [good]: { qty, from: v.cargo?.[good]?.from ?? from } } : rest;
  v.cargo = Object.keys(next).length > 0 ? next : undefined;
}

/** A vehicle arrived at a city: what its orders ask of the cargo, brought and paid. */
function arrive(tx: Tx, h: EmpireHouse, playerId: PlayerId, v: Vehicle, leg: EmpireLeg): void {
  const s = empireSettings(tx.ctx);
  v.at = leg.to;
  const code = placeCity(leg.to);
  if (code === null || !s.orders) return;
  const c = s.map.cities.find((x) => x.code === code);
  if (!c) return;
  const [cx, cy] = citySpot(c, s);
  for (const [good, load] of Object.entries(v.cargo ?? {})) {
    const { n, gross } = fillCity(tx, h, playerId, code, good, load.qty, leg.arrivesAt);
    if (n <= 0) continue;
    // The way's premium: the sectors from the counter it was loaded at.
    const post = standingPosts(h, s).find((p) => p.id === load.from);
    const sectors = post ? Math.hypot(cx - post.x, cy - post.y) / s.map.hexSize : 0;
    const way = Math.floor(s.orders.distanceBps * sectors);
    const bonus = houseEffect(h, "orderBonus", s, { region: c.region });
    receive(tx, playerId, applyBpsFloor(gross, 10_000 + way + bonus), `orders:${code}:${good}`);
    advanceCarnet(h, "deliver", n);
    setCargo(v, good, load.qty - n, load.from);
  }
}

/** The hops arrived by now, every house's, in the order of their arrival. */
export function settleMoves(tx: Tx): void {
  for (const [id, h] of Object.entries(tx.s.empire?.houses ?? {})) {
    const due: { v: Vehicle; leg: EmpireLeg }[] = [];
    for (const v of h.vehicles ?? [])
      for (const leg of v.legs ?? []) if (leg.arrivesAt <= tx.now) due.push({ v, leg });
    if (due.length === 0) continue;
    due.sort((a, b) => a.leg.arrivesAt - b.leg.arrivesAt);
    for (const { v, leg } of due) {
      arrive(tx, h, id, v, leg);
      const legs = (v.legs ?? []).filter((l) => l !== leg);
      v.legs = legs.length > 0 ? legs : undefined;
    }
  }
}

/**
 * A delivery of before (`empireDeliver`) on a world of orders: a free vehicle at a counter that
 * holds the good, sent at once to the cities whose orders ask it (the given one, or the region's),
 * loaded with what they ask, no more than it holds, then back to its counter. Returns the units.
 */
export function autoDeliver(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region: string,
  city?: string,
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const covered = citiesCovered(h, s);
  const cities = city
    ? [city]
    : s.map.cities.filter((c) => c.region === region && covered.has(c.code)).map((c) => c.code);
  for (const v of h.vehicles ?? []) {
    if (!s.vehicles[v.type] || v.porta || v.legs?.length || v.busyUntil > tx.now) continue;
    const post = v.at ?? HOME_POST;
    if (placeCity(post) !== null) continue;
    let room = Math.min(qty, holdOf(h, v, s) - carried(v));
    const stops: { code: string; n: number }[] = [];
    for (const code of cities) {
      if (room <= 0) break;
      if (!placePoint(h, s, cityPlace(code))) continue;
      const n = Math.min(room, askedOf(tx.ctx, h, playerId, s, code, good, tx.now));
      if (n <= 0) continue;
      stops.push({ code, n });
      room -= n;
    }
    const total = stops.reduce((n, x) => n + x.n, 0);
    if (total === 0) continue;
    try {
      takeAt(tx, h, playerId, post, good, total, "empire_voyage");
    } catch {
      continue;
    }
    const have = v.cargo?.[good]?.qty ?? 0;
    v.cargo = { ...(v.cargo ?? {}), [good]: { qty: have + total, from: post } };
    let at = tx.now;
    let from = post;
    const legs: EmpireLeg[] = [];
    for (const place of [...stops.map((x) => cityPlace(x.code)), post]) {
      const a = placePoint(h, s, from);
      const b = placePoint(h, s, place);
      if (!a || !b) continue;
      const arrivesAt = at + hopMs(s, a, b);
      legs.push({ from, to: place, departAt: at, arrivesAt });
      at = arrivesAt;
      from = place;
    }
    v.legs = legs;
    v.busyUntil = at;
    return total;
  }
  fail("no_liquidity");
}

/**
 * The rounds and the transfers of before (the planned rounds, 1 November): settled once at the
 * first command after the hops. What was on the road comes into its counter, the vehicles stand
 * there, free; the orders of a single period give way to the waves.
 */
export function retireRounds(tx: Tx): void {
  for (const [id, h] of Object.entries(tx.s.empire?.houses ?? {})) {
    if (!h.tours && !h.transfers && !h.filled) continue;
    for (const t of h.tours ?? []) {
      for (const stop of t.stops)
        if (!stop.done) putAt(tx, h, id, t.post, stop.good, stop.qty, "empire_voyage", t.id);
      const v = h.vehicles?.find((x) => x.id === t.vehicleId);
      if (v) {
        v.at = t.post;
        v.busyUntil = Math.min(v.busyUntil, tx.now);
      }
    }
    for (const t of h.transfers ?? []) {
      putAt(tx, h, id, t.to, t.good, t.qty, "empire_voyage", t.id);
      const v = h.vehicles?.find((x) => x.id === t.vehicleId);
      if (v) {
        v.at = t.to;
        v.busyUntil = Math.min(v.busyUntil, tx.now);
      }
    }
    h.tours = undefined;
    h.transfers = undefined;
    h.filled = undefined;
  }
}
