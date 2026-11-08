import { applyBpsFloor } from "../money.js";
import type { EmpireHouse, EmpireLeg, PlayerId } from "../state.js";
import { type Tx, fail } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { houseEffect } from "./effects.js";
import { holdPlacesOf } from "./fleet.js";
import { roadLength } from "./grid.js";
import { empireSettings, ownHouse } from "./house.js";
import {
  CAMPO,
  campoPoint,
  citiesCovered,
  citySpot,
  linkedBy,
  standingPosts,
  unlockedOf,
  walkableOf,
} from "./map.js";
import { cityOrdersAt, isWelcomeOrder, returnOrder, takeOrder } from "./orders.js";
import type { EmpireSettings } from "./settings.js";
import { roadBetween } from "./slots.js";
import { HOME_POST, postsServing, putAt, storeOf, takeAt } from "./stores.js";
import { receive } from "./trade.js";

/**
 * The vehicles' hops (decision of the owner, 1 November 2026, after Hades' Star): a vehicle is
 * sent from where it stands to a place of the house's sectors (a city, a counter), one stop after
 * another; the first leaves after a few seconds (left at once, or the last stop taken back, until
 * then), each next when the one before arrives, and a hop begun is not stopped. At a counter it
 * is loaded by hand with the orders of the cities the counter serves, one place each, out of the
 * counter's stock; at a city it brings the orders of that city it carries, paid at the arrival,
 * and stays there.
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
  if (code === CAMPO) return campoPoint(h, s);
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

/**
 * A hop's time, in ms: its length at the vehicles' speed (seconds a unit when set, the long
 * voyages; else units a second), a second at the least. With `owned`, the road walks the house's
 * own tiles (7 November 2026).
 */
export function hopMs(
  s: EmpireSettings,
  a: [number, number],
  b: [number, number],
  owned?: Set<string>,
): number {
  // On the small tiles, the road's length (3 November: the mules walk roads); else straight.
  const d = s.map.tiles
    ? roadLength(roadBetween(a, b, s, owned))
    : Math.hypot(b[0] - a[0], b[1] - a[1]);
  const per = s.moves.secondsPerUnit;
  return Math.max(1_000, Math.round(per ? d * per * 1_000 : (d / s.moves.unitsPerSecond) * 1_000));
}

/** A vehicle's places of hold, its model's level and the house's effects counted. */
export function holdOf(h: EmpireHouse, v: Vehicle, s: EmpireSettings): number {
  const places = holdPlacesOf(h, v.type, s);
  const bps = houseEffect(h, "capacity", s, { vehicleId: v.id });
  return places + Math.floor((places * bps) / 10_000);
}

/** Has the vehicle left yet: a hop begun. */
const underWay = (v: Vehicle, now: number) =>
  (v.legs?.[0]?.departAt ?? Number.POSITIVE_INFINITY) <= now;

function vehicleOf(h: EmpireHouse, s: EmpireSettings, vehicleId: string, now = 0): Vehicle {
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  if (!s.vehicles[v.type]) fail("unknown_building_type");
  if (v.porta) fail("vehicle_busy");
  // Fallen in combat at the Porta: damaged at the Remise until then (2 November).
  if ((v.repairUntil ?? 0) > now) fail("vehicle_busy");
  return v;
}

/** The counter a vehicle stands at, not under way: its id (it may be loaded or unloaded there). */
function dockedAt(h: EmpireHouse, s: EmpireSettings, v: Vehicle, now: number): string {
  const post = v.at ?? HOME_POST;
  if (placeCity(post) !== null || !standingPosts(h, s).some((p) => p.id === post))
    fail("unknown_target");
  if (underWay(v, now)) fail("building_busy");
  return post;
}

/** Sends a vehicle to a place: a stop more at the end of its queue. */
export function moveVehicle(tx: Tx, playerId: PlayerId, vehicleId: string, to: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId, tx.now);
  if ((v.legs?.length ?? 0) >= s.moves.maxStops) fail("invalid_quantity");
  const from = lastPlace(v);
  if (from === to) fail("unknown_target");
  const a = placePoint(h, s, from);
  const b = placePoint(h, s, to);
  if (!a || !b) fail("unknown_target");
  // No hop where the house's own tiles do not lead (7 November 2026): not on the sea, nor on land
  // not bought.
  const owned = walkableOf(h, s);
  if (!linkedBy(owned, a, b, s)) fail("not_linked");
  const last = v.legs?.at(-1);
  const departAt = last ? last.arrivesAt : tx.now + s.moves.departSeconds * 1_000;
  // The welcome (the first steps, lot 2): the order of welcome's delivery goes quickly, once.
  const code = placeCity(to);
  const welcome =
    s.welcome &&
    h.welcome &&
    !h.welcome.trip &&
    (v.loads ?? []).some((o) => o.city === code && isWelcomeOrder(o.id));
  const ms = welcome && s.welcome ? s.welcome.tripSeconds * 1_000 : hopMs(s, a, b, owned);
  if (welcome && h.welcome) h.welcome.trip = true;
  const leg: EmpireLeg = { from, to, departAt, arrivesAt: departAt + ms };
  v.legs = [...(v.legs ?? []), leg];
  v.busyUntil = leg.arrivesAt;
}

/** Leaves at once, if not under way yet: every stop to come as much earlier. */
export function departNow(tx: Tx, playerId: PlayerId, vehicleId: string): void {
  const s = empireSettings(tx.ctx);
  const v = vehicleOf(ownHouse(tx, playerId), s, vehicleId, tx.now);
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
  const v = vehicleOf(ownHouse(tx, playerId), s, vehicleId, tx.now);
  const last = v.legs?.at(-1);
  if (!last || last.departAt <= tx.now) fail("building_busy");
  const legs = (v.legs ?? []).slice(0, -1);
  v.legs = legs.length > 0 ? legs : undefined;
  v.busyUntil = legs.at(-1)?.arrivesAt ?? tx.now;
}

/**
 * Loads an order of a city the counter serves (the vehicle docked there): a place of its hold,
 * the lot taken out of the counter's stock; the order leaves its city.
 */
/**
 * With the insides (docs/plan-ateliers.md lot A8, « B »), a good's better pieces count for its
 * orders: the exquisite first, then the fine, then the plain; else only the plain.
 */
function qualitiesOn(s: EmpireSettings): boolean {
  const q = s.interior?.orderQuality;
  return !!q && (q.fineBps > 10_000 || q.exquisiteBps > 10_000);
}

/** What a counter holds of a good for its orders, its better pieces counted where they count. */
function orderStock(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  post: string,
  good: string,
): number {
  const plain = storeOf(tx, h, playerId, post, good);
  if (!qualitiesOn(s)) return plain;
  return (
    plain +
    storeOf(tx, h, playerId, post, `${good}:fine`) +
    storeOf(tx, h, playerId, post, `${good}:exquisite`)
  );
}

export function loadOrder(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  city: string,
  orderId: string,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId, tx.now);
  const post = dockedAt(h, s, v, tx.now);
  if (!s.orders || !postsServing(h, s, city).includes(post)) fail("unknown_target");
  if ((v.loads?.length ?? 0) >= holdOf(h, v, s)) fail("no_room");
  const o = cityOrdersAt(tx.ctx, h, playerId, s, city, tx.now).list.find((x) => x.id === orderId);
  if (!o) fail("not_ordered");
  if (orderStock(tx, h, playerId, s, post, o.good) < o.qty) fail("insufficient_stock");
  takeOrder(tx.ctx, h, playerId, s, city, orderId, tx.now);
  // The best pieces first, where they count (the insides' worlds); then the plain.
  let left = o.qty;
  const took = { exquisite: 0, fine: 0 };
  if (qualitiesOn(s))
    for (const q of ["exquisite", "fine"] as const) {
      const n = Math.min(left, storeOf(tx, h, playerId, post, `${o.good}:${q}`));
      if (n > 0) takeAt(tx, h, playerId, post, `${o.good}:${q}`, n, "empire_voyage");
      took[q] = n;
      left -= n;
    }
  if (left > 0) takeAt(tx, h, playerId, post, o.good, left, "empire_voyage");
  v.loads = [
    ...(v.loads ?? []),
    {
      ...o,
      from: post,
      ...(took.fine > 0 ? { fine: took.fine } : {}),
      ...(took.exquisite > 0 ? { exquisite: took.exquisite } : {}),
    },
  ];
}

/**
 * Unloads an order aboard at the counter the vehicle is docked at: the lot into that counter's
 * stock, the order back to its city.
 */
export function unloadOrder(tx: Tx, playerId: PlayerId, vehicleId: string, orderId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId, tx.now);
  const post = dockedAt(h, s, v, tx.now);
  const o = v.loads?.find((x) => x.id === orderId);
  if (!o) fail("not_ordered");
  // The very pieces it took, back.
  const plain = o.qty - (o.fine ?? 0) - (o.exquisite ?? 0);
  if (plain > 0) putAt(tx, h, playerId, post, o.good, plain, "empire_voyage", v.id);
  if (o.fine) putAt(tx, h, playerId, post, `${o.good}:fine`, o.fine, "empire_voyage", v.id);
  if (o.exquisite)
    putAt(tx, h, playerId, post, `${o.good}:exquisite`, o.exquisite, "empire_voyage", v.id);
  returnOrder(tx.ctx, h, playerId, s, o, tx.now);
  const rest = (v.loads ?? []).filter((x) => x !== o);
  v.loads = rest.length > 0 ? rest : undefined;
}

/** A vehicle arrived at a place: at a city, the orders of that city aboard, brought and paid. */
function arrive(tx: Tx, h: EmpireHouse, playerId: PlayerId, v: Vehicle, leg: EmpireLeg): void {
  const s = empireSettings(tx.ctx);
  v.at = leg.to;
  const code = placeCity(leg.to);
  if (code === null) return;
  if (code === CAMPO) {
    bringToCampo(h, v);
    return;
  }
  const c = s.map.cities.find((x) => x.code === code);
  const here = (v.loads ?? []).filter((o) => o.city === code);
  if (!c || here.length === 0) return;
  const bonus = houseEffect(h, "orderBonus", s, { region: c.region, vehicleId: v.id });
  let paid = 0n;
  const q = s.interior?.orderQuality;
  for (const o of here) {
    // Its better pieces paid more, by their share (lot A8, « B »).
    const fine = o.fine ?? 0;
    const exquisite = o.exquisite ?? 0;
    const weight =
      (o.qty - fine - exquisite) * 10_000 +
      fine * (q?.fineBps ?? 10_000) +
      exquisite * (q?.exquisiteBps ?? 10_000);
    const base = o.qty > 0 ? (o.pay * BigInt(weight)) / BigInt(o.qty * 10_000) : o.pay;
    const pay = applyBpsFloor(base, 10_000 + bonus);
    if (isWelcomeOrder(o.id) && h.welcome) h.welcome.done = true;
    receive(tx, playerId, pay, `orders:${code}:${o.good}`);
    advanceCarnet(h, "deliver", o.qty);
    paid += pay;
  }
  // Kept for the player's return (the board plays them again, decision of the owner, 3 November).
  h.delivered = [...(h.delivered ?? []), { city: code, pay: paid, at: leg.arrivesAt }].slice(-12);
  // The town knows the house the more it is served (P3-07 of the players' audit).
  h.served = { ...(h.served ?? {}), [code]: (h.served?.[code] ?? 0) + 1 };
  const rest = (v.loads ?? []).filter((o) => o.city !== code);
  v.loads = rest.length > 0 ? rest : undefined;
}

/** At the Campo: the orders of the Campo aboard go into its store, paid nothing (8 November 2026). */
function bringToCampo(h: EmpireHouse, v: Vehicle): void {
  const here = (v.loads ?? []).filter((o) => o.city === CAMPO);
  if (here.length === 0) return;
  const store = { ...(h.campo?.stock ?? {}) };
  for (const o of here) store[o.good] = (store[o.good] ?? 0) + o.qty;
  h.campo = { day: h.campo?.day ?? -1, week: h.campo?.week ?? -1, stock: store };
  const rest = (v.loads ?? []).filter((o) => o.city !== CAMPO);
  v.loads = rest.length > 0 ? rest : undefined;
}

/**
 * A vehicle standing at a city, its stops all done, sent back to its fondaco (the counter that
 * serves the city, else the house's first), leaving `at`.
 */
function sendBack(h: EmpireHouse, s: EmpireSettings, v: Vehicle, at: number): void {
  const code = placeCity(v.at ?? "");
  if (code === null || v.legs?.length || v.porta) return;
  const posts = standingPosts(h, s);
  const home = postsServing(h, s, code).find((p) => posts.some((x) => x.id === p)) ?? HOME_POST;
  const a = placePoint(h, s, v.at ?? "");
  const b = placePoint(h, s, home);
  if (!a || !b) {
    v.at = home;
    return;
  }
  const leg: EmpireLeg = {
    from: v.at ?? "",
    to: home,
    departAt: at,
    arrivesAt: at + hopMs(s, a, b, walkableOf(h, s)),
  };
  v.legs = [leg];
  v.busyUntil = leg.arrivesAt;
}

/** The hops arrived by now, every house's, in the order of their times. */
export function settleMoves(tx: Tx): void {
  const s = empireSettings(tx.ctx);
  for (const [id, h] of Object.entries(tx.s.empire?.houses ?? {})) {
    // Hop after hop until none is due (a way back may be due too, once its vehicle is away long).
    for (let round = 0; round < 4; round++) {
      const due: { v: Vehicle; leg: EmpireLeg }[] = [];
      for (const v of h.vehicles ?? [])
        for (const leg of v.legs ?? []) if (leg.arrivesAt <= tx.now) due.push({ v, leg });
      if (due.length === 0) break;
      due.sort((a, b) => a.leg.arrivesAt - b.leg.arrivesAt);
      for (const { v, leg } of due) {
        arrive(tx, h, id, v, leg);
        const legs = (v.legs ?? []).filter((l) => l !== leg);
        v.legs = legs.length > 0 ? legs : undefined;
        if (s.moves.returnHome && !v.legs) sendBack(h, s, v, leg.arrivesAt);
      }
    }
    // A vehicle left standing at a city (before the ways back): home it goes, now.
    if (s.moves.returnHome) for (const v of h.vehicles ?? []) sendBack(h, s, v, tx.now);
  }
}

/**
 * « Livrer » from a city (decision of the owner, 3 November 2026): the orders asked (every one, by
 * default) that the stock covers, the best paid first, loaded on the smallest free vehicle docked at
 * a counter serving the city that takes them all (else the one that takes the most), which leaves at
 * once. Returns how many orders went.
 */
export function deliverCity(tx: Tx, playerId: PlayerId, city: string, orderIds?: string[]): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!s.orders) fail("unknown_target");
  if (city !== CAMPO && !s.map.cities.some((c) => c.code === city)) fail("unknown_city");
  const asked = cityOrdersAt(tx.ctx, h, playerId, s, city, tx.now)
    .list.filter((o) => !orderIds || orderIds.includes(o.id))
    .sort((a, b) => (b.pay > a.pay ? 1 : b.pay < a.pay ? -1 : 0));
  if (asked.length === 0) fail("not_ordered");
  const serving = postsServing(h, s, city);
  // In reach but not linked by the house's own tiles (7 November 2026): say so.
  if (serving.length === 0 && walkableOf(h, s) && citiesCovered(h, s).has(city)) fail("not_linked");
  if (serving.length === 0) fail("out_of_reach");
  let best: { v: Vehicle; picks: string[]; hold: number } | null = null;
  let anyFree = false;
  for (const v of h.vehicles ?? []) {
    if (!s.vehicles[v.type] || v.porta || v.legs?.length || (v.repairUntil ?? 0) > tx.now) continue;
    const post = v.at ?? HOME_POST;
    if (placeCity(post) !== null || !standingPosts(h, s).some((p) => p.id === post)) continue;
    if (!serving.includes(post)) continue;
    anyFree = true;
    const hold = holdOf(h, v, s);
    let room = hold - (v.loads?.length ?? 0);
    const left = new Map<string, number>();
    const picks: string[] = [];
    for (const o of asked) {
      if (room <= 0) break;
      const have = left.get(o.good) ?? orderStock(tx, h, playerId, s, post, o.good);
      if (have < o.qty) continue;
      left.set(o.good, have - o.qty);
      picks.push(o.id);
      room--;
    }
    if (picks.length === 0) continue;
    if (
      !best ||
      picks.length > best.picks.length ||
      (picks.length === best.picks.length && hold < best.hold)
    )
      best = { v, picks, hold };
  }
  if (!best) fail(anyFree ? "insufficient_stock" : "vehicle_busy");
  for (const id of best.picks) loadOrder(tx, playerId, best.v.id, city, id);
  moveVehicle(tx, playerId, best.v.id, cityPlace(city));
  departNow(tx, playerId, best.v.id);
  return best.picks.length;
}

/**
 * A round drawn by finger (the gameplay audit, 5 November 2026, P1): the vehicle chosen, standing
 * at its fondaco, loads there every order asked of each town (the stock and its hold permitting),
 * then goes from town to town in the order drawn, leaving at once; it comes back alone once the
 * last is served. A stop that cannot be refuses the whole round (the command's transaction).
 */
export function driveRound(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  stops: { city: string; orderIds: string[] }[],
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId, tx.now);
  if (stops.length === 0 || stops.length > s.moves.maxStops) fail("invalid_quantity");
  if (v.porta || v.legs?.length || (v.repairUntil ?? 0) > tx.now) fail("vehicle_busy");
  for (const stop of stops)
    for (const id of stop.orderIds) loadOrder(tx, playerId, vehicleId, stop.city, id);
  for (const stop of stops) moveVehicle(tx, playerId, vehicleId, cityPlace(stop.city));
  departNow(tx, playerId, vehicleId);
}

/**
 * Called back a few seconds after it left (`recallSeconds`): the vehicle stands again at the
 * counter it left, its orders unloaded there, back in their cities.
 */
export function recallVehicle(tx: Tx, playerId: PlayerId, vehicleId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = vehicleOf(h, s, vehicleId, tx.now);
  const first = v.legs?.[0];
  // Only on its way out of a counter, within its few seconds (never on its way back).
  if (
    !first ||
    placeCity(first.from) !== null ||
    tx.now - first.departAt > s.moves.recallSeconds * 1_000
  )
    fail("building_busy");
  const post = first.from;
  for (const o of v.loads ?? []) {
    putAt(tx, h, playerId, o.from, o.good, o.qty, "empire_voyage", v.id);
    returnOrder(tx.ctx, h, playerId, s, o, tx.now);
  }
  v.loads = undefined;
  v.legs = undefined;
  v.at = post;
  v.busyUntil = tx.now;
}

/**
 * A delivery of before (`empireDeliver`) on a world of orders: a free vehicle docked at a counter
 * that holds the good, loaded with the orders of it of the cities asked (the given one, or the
 * region's) the counter serves, no more than its places nor its stock, and sent to them at once.
 * Returns the units.
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
    if (placeCity(post) !== null || !standingPosts(h, s).some((p) => p.id === post)) continue;
    let room = holdOf(h, v, s) - (v.loads?.length ?? 0);
    let stock = Math.min(qty, storeOf(tx, h, playerId, post, good));
    let total = 0;
    const stops: string[] = [];
    for (const code of cities) {
      if (!postsServing(h, s, code).includes(post) || !placePoint(h, s, cityPlace(code))) continue;
      for (const o of cityOrdersAt(tx.ctx, h, playerId, s, code, tx.now).list) {
        if (room <= 0 || o.good !== good || o.qty > stock) continue;
        loadOrder(tx, playerId, v.id, code, o.id);
        room--;
        stock -= o.qty;
        total += o.qty;
        if (!stops.includes(code)) stops.push(code);
      }
    }
    if (total === 0) continue;
    for (const code of stops) moveVehicle(tx, playerId, v.id, cityPlace(code));
    departNow(tx, playerId, v.id);
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

/**
 * The goods in bulk of before (the orders by good, 1 November): put back once into the counter
 * they were loaded at (or the one the vehicle stands at, else Venice's).
 */
export function retireCargo(tx: Tx): void {
  const s = empireSettings(tx.ctx);
  for (const [id, h] of Object.entries(tx.s.empire?.houses ?? {}))
    for (const v of h.vehicles ?? []) {
      if (!v.cargo) continue;
      const posts = new Set(standingPosts(h, s).map((p) => p.id));
      for (const [good, c] of Object.entries(v.cargo)) {
        if (c.qty <= 0) continue;
        const post = posts.has(c.from) ? c.from : posts.has(v.at ?? "") ? (v.at ?? "") : HOME_POST;
        putAt(tx, h, id, post, good, c.qty, "empire_voyage", v.id);
      }
      v.cargo = undefined;
    }
}
