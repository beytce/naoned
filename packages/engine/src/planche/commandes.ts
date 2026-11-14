/**
 * The sealed orders (docs/plan-hex-commerce.md § 3.3, lot H2).
 *
 * Each day, each sestiere sees a few orders on towns behind a tower: a good, a quantity, twice the
 * town's price, a few hours to deliver them. Delivering one is playing a Passe position, once per
 * house; the first house of the sestiere that wins it takes the order. A lost try costs nothing.
 *
 * Pure: the orders of a day are drawn from the date and the sestiere, the same on every server.
 */

import type { PlancheHouse, PlancheSetup, PlancheState } from "./planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BPS = 10_000;

export interface PlancheOrderRules {
  /** Orders a sestiere sees each day. */
  perSestiere: number;
  /** The hour (UTC) each of a day's orders opens, in turn. */
  hours: number[];
  /** How long an order stays open. */
  durationMs: number;
  /** What it pays, in points of the town's full price (20 000: twice). */
  priceBps: number;
  /** Units it asks. */
  units: number;
  /** The Passe problems its position is drawn from. */
  problems: string[];
}

export interface PlancheOrder {
  id: string;
  day: number;
  sestiere: string;
  city: string;
  good: string;
  units: number;
  /** Deniers a unit. */
  price: number;
  from: number;
  to: number;
  /** The Passe problem to win to deliver it. */
  problem: string;
}

/** Who took an order, and the houses that tried it. */
export interface PlancheOrderState {
  by?: string;
  tried: string[];
}

const fail = (code: string): never => {
  throw new Error(code);
};

/** A number drawn from words, the same everywhere (FNV-1a). */
function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** The sestieri of a board, in the order of its houses. */
export function plancheSestieri(S: PlancheSetup): string[] {
  return [...new Set(S.houses.map((h) => h.sestiere).filter((x): x is string => !!x))];
}

/** The sealed orders of a day (days since the epoch, UTC), for every sestiere. */
export function plancheOrders(S: PlancheSetup, day: number): PlancheOrder[] {
  const R = S.orders;
  if (!R || !R.problems.length || !R.hours.length) return [];
  const behind = S.cities.filter((c) => c.via.length > 0);
  if (!behind.length) return [];
  const out: PlancheOrder[] = [];
  for (const sestiere of plancheSestieri(S)) {
    // What the sestiere's houses make, when they say it (a board without islands): asked first.
    const made = new Set(
      S.houses.filter((h) => h.sestiere === sestiere).flatMap((h) => Object.keys(h.makes)),
    );
    const used = new Set<string>();
    for (let k = 0; k < R.perSestiere; k++) {
      // Another town each time, while there are.
      const free = behind.filter((c) => !used.has(c.id));
      const pool = free.length ? free : behind;
      const city = pool[hash(day, sestiere, k, "city") % pool.length];
      if (!city) continue;
      used.add(city.id);
      const wanted = Object.keys(city.wants);
      const goods = wanted.filter((g) => made.has(g)).length
        ? wanted.filter((g) => made.has(g))
        : wanted;
      const good = goods[hash(day, sestiere, k, "good") % goods.length];
      const want = good ? city.wants[good] : undefined;
      if (!good || !want) continue;
      const from = day * DAY + (R.hours[k % R.hours.length] ?? 0) * HOUR;
      out.push({
        id: `${day}:${sestiere}:${k}`,
        day,
        sestiere,
        city: city.id,
        good,
        units: R.units,
        price: Math.floor((want.price * R.priceBps) / BPS),
        from,
        to: from + R.durationMs,
        problem: R.problems[hash(day, sestiere, k, "problem") % R.problems.length] ?? "",
      });
    }
  }
  return out;
}

/** The order an id names, if it is one of its day's. */
export function plancheOrder(S: PlancheSetup, id: string): PlancheOrder | undefined {
  const day = Number(id.split(":")[0]);
  if (!Number.isInteger(day)) return undefined;
  return plancheOrders(S, day).find((o) => o.id === id);
}

/** Why a house may not try an order now, or nothing if it may. */
export function plancheOrderRefusal(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  id: string,
  now: number,
): string | undefined {
  const o = plancheOrder(S, id);
  const h = Object.hasOwn(s.houses, house) ? s.houses[house] : undefined;
  const hs = S.houses.find((x) => x.id === house);
  if (!o || !h || !hs) return "planche_unknown";
  if (now < o.from || now > o.to) return "planche_order_closed";
  if (hs.sestiere !== o.sestiere) return "planche_order_elsewhere";
  const st = s.orders?.[id];
  if (st?.by) return "planche_order_taken";
  if (st?.tried.includes(house)) return "planche_order_tried";
  if ((h.stock[o.good] ?? 0) < o.units) return "planche_order_short";
  return undefined;
}

/**
 * A house plays an order's position: won, its goods leave the warehouse, paid by the town at the
 * order's price (written as a sale); lost, nothing is taken. Either way it may not try again.
 */
export function plancheOrderTry(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  id: string,
  now: number,
  won: boolean,
): PlancheState {
  const why = plancheOrderRefusal(S, s0, house, id, now);
  if (why) return fail(why);
  const o = plancheOrder(S, id) as PlancheOrder;
  const s = structuredClone(s0);
  // Only the orders of the last two days are kept.
  const orders: Record<string, PlancheOrderState> = {};
  for (const [k, v] of Object.entries(s.orders ?? {}))
    if (Number(k.split(":")[0]) >= o.day - 1) orders[k] = v;
  const st = orders[id] ?? { tried: [] };
  st.tried.push(house);
  orders[id] = st;
  s.orders = orders;
  if (!won) return s;
  st.by = house;
  const h = s.houses[house] as PlancheHouse;
  const paid = BigInt(o.price) * BigInt(o.units);
  h.stock[o.good] = (h.stock[o.good] ?? 0) - o.units;
  h.delivered += o.units;
  h.ducats += paid;
  h.earned += paid;
  h.book.sold += paid;
  h.rank.earned += paid;
  h.rank.week[o.city] = (h.rank.week[o.city] ?? 0n) + paid;
  s.minted += paid;
  return s;
}

/**
 * A sealed order won, its try written when the duel began (docs/plan-duels.md B1): delivered and
 * paid, unless another house of the sestiere delivered it meanwhile, or the store fell short.
 */
export function plancheOrderWin(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  id: string,
  _now: number,
): PlancheState {
  const o = plancheOrder(S, id);
  const st = s0.orders?.[id];
  const h0 = Object.hasOwn(s0.houses, house) ? s0.houses[house] : undefined;
  if (!o || !st?.tried.includes(house) || !h0) return fail("planche_unknown");
  if (st.by) return fail("planche_order_taken");
  if ((h0.stock[o.good] ?? 0) < o.units) return fail("planche_order_short");
  const s = structuredClone(s0);
  (s.orders as Record<string, PlancheOrderState>)[id] = { ...st, by: house };
  const h = s.houses[house] as PlancheHouse;
  const paid = BigInt(o.price) * BigInt(o.units);
  h.stock[o.good] = (h.stock[o.good] ?? 0) - o.units;
  h.delivered += o.units;
  h.ducats += paid;
  h.earned += paid;
  h.book.sold += paid;
  h.rank.earned += paid;
  h.rank.week[o.city] = (h.rank.week[o.city] ?? 0n) + paid;
  s.minted += paid;
  return s;
}
