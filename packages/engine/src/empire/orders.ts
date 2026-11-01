import { draw } from "../draw.js";
import { type Deniers, applyBpsFloor } from "../money.js";
import { type EmpireHouse, MINUTE_MS, type PlayerId, type WorldContext } from "../state.js";
import { type Tx, fail, nextId } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { houseEffect } from "./effects.js";
import { capacityOf } from "./fleet.js";
import { empireSettings, ownHouse } from "./house.js";
import { citiesCovered, citySpot, standingPosts } from "./map.js";
import type { EmpireSettings } from "./settings.js";
import { HOME_POST, postsServing, putAt, takeAt } from "./stores.js";
import { receive } from "./trade.js";

/**
 * The cities' orders (decision of the owner, 1 November 2026), after Hades' Star's shipments: each
 * city a counter of the house serves asks a few goods of its region every period (two hours),
 * as many orders as its size; a vehicle of the counter brings them on a round, each unit paid at
 * its arrival. The orders are drawn from the world's seed, the house, the city and the period:
 * nothing is kept until something is brought, and what is not brought is simply no longer asked.
 */

export interface CityOrder {
  good: string;
  qty: number;
  filled: number;
  /** A unit's pay, before the way's premium. */
  unit: Deniers;
}

export interface CityOrders {
  city: string;
  region: string;
  size: number;
  orders: CityOrder[];
  /** How far its orders are filled, in bps. */
  fillBps: number;
  renewsAt: number;
}

const periodMs = (s: EmpireSettings) => (s.orders?.periodMinutes ?? 120) * MINUTE_MS;

/** The period of the orders at a time. */
export const periodOf = (now: number, s: EmpireSettings) => Math.floor(now / periodMs(s));

/** A city's orders of a period, for a house, before what it brought. */
export function cityOrders(
  ctx: WorldContext,
  s: EmpireSettings,
  playerId: PlayerId,
  code: string,
  period: number,
): Omit<CityOrder, "filled">[] {
  const o = s.orders;
  const c = s.map.cities.find((x) => x.code === code);
  const r = s.regions.find((x) => x.code === c?.region);
  if (!o || !c || !r) return [];
  const goods = Object.keys(r.demands).sort();
  if (goods.length === 0) return [];
  const size = Math.min(5, Math.max(1, c.size));
  const count = o.perSize[size - 1] ?? 1;
  const least = o.qtyPerSize * size;
  return Array.from({ length: count }, (_, i) => {
    const key = `order|${playerId}|${code}|${period}|${i}`;
    const good = goods[draw(ctx, `${key}|good`) % goods.length] ?? goods[0] ?? "";
    const qty = least + (draw(ctx, `${key}|qty`) % least);
    const ref = r.demands[good] ?? 0n;
    const unit = applyBpsFloor(ref, 10_000 + o.premiumBps + o.sizeBps * (size - 1));
    return { good, qty, unit };
  });
}

/** What the house brought of a city's orders in the period. */
function filledOf(h: EmpireHouse, code: string, period: number): number[] {
  return h.filled?.period === period ? (h.filled.cities[code] ?? []) : [];
}

/** The orders of every city the house's counters serve, at a time. */
export function ordersOf(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  now: number,
): CityOrders[] {
  if (!s.orders) return [];
  const period = periodOf(now, s);
  const covered = citiesCovered(h, s);
  return s.map.cities
    .filter((c) => covered.has(c.code))
    .map((c) => {
      const done = filledOf(h, c.code, period);
      const orders = cityOrders(ctx, s, playerId, c.code, period).map((x, i) => ({
        ...x,
        filled: Math.min(x.qty, done[i] ?? 0),
      }));
      const asked = orders.reduce((n, x) => n + x.qty, 0);
      const brought = orders.reduce((n, x) => n + x.filled, 0);
      return {
        city: c.code,
        region: c.region,
        size: c.size,
        orders,
        fillBps: asked > 0 ? Math.floor((brought * 10_000) / asked) : 0,
        renewsAt: (period + 1) * periodMs(s),
      };
    });
}

/**
 * Sends a land vehicle of a counter on a round to the cities' orders (after Hades' Star): its
 * load taken from the counter's stock, no more than it holds; each stop a city within the
 * counter's reach, in the order given; it comes back to its counter after the last.
 */
export function startTour(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  stops: { city: string; order: number; qty: number }[],
): void {
  const s = empireSettings(tx.ctx);
  const o = s.orders;
  if (!o) fail("unknown_building_type");
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  const spec = s.vehicles[v.type];
  if (!spec || spec.build) fail("unknown_building_type");
  if (v.busyUntil > tx.now) fail("building_busy");
  if (!Array.isArray(stops) || stops.length === 0 || stops.length > 8) fail("invalid_quantity");
  const post = standingPosts(h, s).find((p) => p.id === (v.at ?? HOME_POST));
  if (!post) fail("unknown_target");
  const period = periodOf(tx.now, s);
  const hold = Math.floor(
    (capacityOf(h, v.type, s) * (10_000 + houseEffect(h, "capacity", s, { vehicleId }))) / 10_000,
  );
  const planned: { city: string; order: number; good: string; qty: number }[] = [];
  for (const stop of stops) {
    if (!postsServing(h, s, stop.city).includes(post.id)) fail("out_of_reach");
    const asked = cityOrders(tx.ctx, s, playerId, stop.city, period)[stop.order];
    if (!asked) fail("unknown_target");
    const done = filledOf(h, stop.city, period)[stop.order] ?? 0;
    const already = planned
      .filter((p) => p.city === stop.city && p.order === stop.order)
      .reduce((n, p) => n + p.qty, 0);
    if (!Number.isInteger(stop.qty) || stop.qty <= 0 || stop.qty > asked.qty - done - already)
      fail("invalid_quantity");
    planned.push({ city: stop.city, order: stop.order, good: asked.good, qty: stop.qty });
  }
  if (planned.reduce((n, p) => n + p.qty, 0) > hold) fail("invalid_quantity");
  for (const p of planned) takeAt(tx, h, playerId, post.id, p.good, p.qty, "empire_voyage");
  // The way: from the counter through each city in turn, then home.
  const msBetween = (a: [number, number], b: [number, number]) =>
    Math.round((Math.hypot(b[0] - a[0], b[1] - a[1]) / o.unitsPerMinute) * MINUTE_MS);
  let at = tx.now;
  let from: [number, number] = [post.x, post.y];
  const timed = planned.map((p) => {
    const c = s.map.cities.find((x) => x.code === p.city);
    const to = c ? citySpot(c, s) : from;
    at += msBetween(from, to);
    from = to;
    return { ...p, at };
  });
  const backAt = at + msBetween(from, [post.x, post.y]);
  v.busyUntil = backAt;
  h.tours = [
    ...(h.tours ?? []),
    { id: nextId(tx, "r"), vehicleId, post: post.id, period, stops: timed, backAt },
  ];
}

/**
 * The rounds' stops reached by now, every house's: each unit an order still asks is paid (the
 * way from the counter adds its premium), the rest goes back to the counter's stock; a round
 * whose vehicle is home is over.
 */
export function settleTours(tx: Tx): void {
  const s = empireSettings(tx.ctx);
  const o = s.orders;
  if (!o) return;
  for (const [id, h] of Object.entries(tx.s.empire?.houses ?? {})) {
    if (!h.tours?.length) continue;
    for (const tour of h.tours) {
      const post = standingPosts(h, s).find((p) => p.id === tour.post);
      for (const stop of tour.stops) {
        if (stop.done || stop.at > tx.now) continue;
        stop.done = true;
        let paid = 0;
        // An order of a period gone is no longer asked: its goods come back.
        if (periodOf(stop.at, s) === tour.period) {
          const asked = cityOrders(tx.ctx, s, id, stop.city, tour.period)[stop.order];
          const done = filledOf(h, stop.city, tour.period);
          const left = Math.max(0, (asked?.qty ?? 0) - (done[stop.order] ?? 0));
          paid = Math.min(stop.qty, left);
          if (asked && paid > 0) {
            const c = s.map.cities.find((x) => x.code === stop.city);
            const [cx, cy] = c ? citySpot(c, s) : [0, 0];
            const sectors = post ? Math.hypot(cx - post.x, cy - post.y) / s.map.hexSize : 0;
            const way = Math.floor(o.distanceBps * sectors);
            const bonus = houseEffect(h, "orderBonus", s, { region: c?.region ?? "" });
            receive(
              tx,
              id,
              applyBpsFloor(asked.unit * BigInt(paid), 10_000 + way + bonus),
              `orders:${stop.city}:${stop.good}`,
            );
            const cities = h.filled?.period === tour.period ? { ...h.filled.cities } : {};
            const row = [...(cities[stop.city] ?? [])];
            row[stop.order] = (row[stop.order] ?? 0) + paid;
            cities[stop.city] = row;
            h.filled = { period: tour.period, cities };
            advanceCarnet(h, "deliver", paid);
          }
        }
        if (stop.qty > paid)
          putAt(tx, h, id, tour.post, stop.good, stop.qty - paid, "empire_voyage", tour.id);
      }
    }
    const left = h.tours.filter((t) => t.backAt > tx.now || t.stops.some((x) => !x.done));
    h.tours = left.length > 0 ? left : undefined;
  }
}

/**
 * A delivery of before (`empireDeliver`) on a world of orders: a round made for the player, of a
 * free land vehicle of a counter serving the city (or the region's cities), loaded with what the
 * orders of that good still ask, no more than it holds. Returns the units sent.
 */
export function autoTour(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region: string,
  city?: string,
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const period = periodOf(tx.now, s);
  const cities = city
    ? [city]
    : ordersOf(tx.ctx, h, playerId, s, tx.now)
        .filter((c) => c.region === region)
        .map((c) => c.city);
  for (const v of h.vehicles ?? []) {
    const spec = s.vehicles[v.type];
    if (!spec || spec.build || v.busyUntil > tx.now) continue;
    const at = v.at ?? HOME_POST;
    let room = Math.min(qty, capacityOf(h, v.type, s));
    const stops: { city: string; order: number; qty: number }[] = [];
    for (const code of cities) {
      if (!postsServing(h, s, code).includes(at)) continue;
      const done = filledOf(h, code, period);
      cityOrders(tx.ctx, s, playerId, code, period).forEach((x, i) => {
        if (room <= 0 || x.good !== good) return;
        const n = Math.min(room, x.qty - (done[i] ?? 0));
        if (n <= 0) return;
        stops.push({ city: code, order: i, qty: n });
        room -= n;
      });
    }
    const held = stops.length > 0 ? stops.reduce((n, x) => n + x.qty, 0) : 0;
    if (held === 0) continue;
    startTour(tx, playerId, v.id, stops);
    return held;
  }
  fail("no_liquidity");
}
