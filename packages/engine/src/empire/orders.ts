import { draw } from "../draw.js";
import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  type EmpireCityOrders,
  type EmpireHouse,
  type EmpireOrder,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
} from "../state.js";
import { citiesCovered } from "./map.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The cities' orders (decision of the owner, 1 November 2026, after Hades' Star's shipments): each
 * city a counter of the house serves fills with orders, one every interval of its size, up to a
 * cap of its size; a full city asks nothing new until an order leaves it, and the next comes an
 * interval later (nothing is lost by the absence). An order is a fixed lot of a good a workshop of
 * the house makes, worth its reference with a premium; it takes a place of a vehicle's hold, is
 * loaded at a counter serving its city (moves.ts) and paid when brought there.
 */

/** A city's orders as the house sees them: the view's. */
export interface CityOrders {
  city: string;
  region: string;
  size: number;
  orders: EmpireOrder[];
  cap: number;
  /** How full the city is (the ring around it), in bps of its cap. */
  fillBps: number;
  /** When the next order comes; null while the city is full. */
  nextAt: number | null;
}

const sizeOf = (size: number) => Math.min(5, Math.max(1, size));
const capOf = (s: EmpireSettings, size: number) => s.orders?.cap[sizeOf(size) - 1] ?? 0;
const everyMs = (s: EmpireSettings, size: number) =>
  (s.orders?.everyMinutes[sizeOf(size) - 1] ?? 120) * MINUTE_MS;

/**
 * A good's reference price for a city's order: its region's, made or wanted there; else the
 * lowest of the regions that trade it; null when none does.
 */
export function orderRefOf(s: EmpireSettings, region: string, good: string): Deniers | null {
  const r = s.regions.find((x) => x.code === region);
  const here = r?.produces[good] ?? r?.demands[good];
  if (here !== undefined) return here;
  let low: Deniers | null = null;
  for (const x of s.regions) {
    const p = x.produces[good] ?? x.demands[good];
    if (p !== undefined && (low === null || p < low)) low = p;
  }
  return low;
}

/** A good's lot: as set, else what is worth `lotDucats` at its reference (one at the least). */
export function lotOf(s: EmpireSettings, good: string, ref: Deniers): number {
  const set = s.orders?.lots[good];
  if (set !== undefined) return set;
  const worth = BigInt(s.orders?.lotDucats ?? 0) * DENIERS_PER_DUCAT;
  if (ref <= 0n) return 1;
  return Math.max(1, Number((worth + ref / 2n) / ref));
}

/** The goods the house's workshops can make, wherever they stand, sorted: the orders' goods. */
export function orderGoodsOf(ctx: WorldContext, h: EmpireHouse): string[] {
  const types = new Set(h.workshops.map((w) => w.type));
  const goods = new Set<string>();
  for (const r of ctx.theme.recipes)
    if (types.has(r.building)) for (const g of Object.keys(r.outputs)) goods.add(g);
  return [...goods].sort();
}

/** The order number `seq` of a city for a house: its good among those given, lot and pay. */
function drawOrder(
  ctx: WorldContext,
  s: EmpireSettings,
  playerId: PlayerId,
  code: string,
  region: string,
  seq: number,
  goods: string[],
): EmpireOrder | null {
  if (goods.length === 0) return null;
  const good = goods[draw(ctx, `order|${playerId}|${code}|${seq}`) % goods.length] ?? "";
  const ref = orderRefOf(s, region, good);
  if (ref === null) return null;
  const qty = lotOf(s, good, ref);
  const pay = applyBpsFloor(ref * BigInt(qty), 10_000 + (s.orders?.premiumBps ?? 0));
  return { id: `${code}#${seq}`, city: code, good, qty, pay };
}

/**
 * A city's orders at a time, from what the house keeps of them: an order every interval since
 * the last kept, while fewer than the cap wait (a good the house makes, those it can trade); at
 * the cap, the time passes without any (the next one an interval after a place is freed).
 */
export function cityOrdersAt(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  now: number,
): EmpireCityOrders {
  const c = s.map.cities.find((x) => x.code === code);
  const kept = h.orders?.[code];
  const list = [...(kept?.list ?? [])];
  if (!c || !s.orders) return { next: now, seq: kept?.seq ?? 0, list };
  const cap = capOf(s, c.size);
  const every = everyMs(s, c.size);
  const goods = orderGoodsOf(ctx, h).filter((g) => orderRefOf(s, c.region, g) !== null);
  let next = kept?.next ?? now;
  let seq = kept?.seq ?? 0;
  for (; next <= now && list.length < cap; next += every) {
    const o = drawOrder(ctx, s, playerId, code, c.region, seq, goods);
    if (!o) continue;
    list.push(o);
    seq++;
  }
  // Full: the next comes an interval after a place is freed, none owed for the time passed.
  if (list.length >= cap && next <= now) next = now + every;
  return { next, seq, list };
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
  const covered = citiesCovered(h, s);
  return s.map.cities
    .filter((c) => covered.has(c.code))
    .map((c) => {
      const rec = cityOrdersAt(ctx, h, playerId, s, c.code, now);
      const cap = capOf(s, c.size);
      const full = rec.list.length >= cap;
      return {
        city: c.code,
        region: c.region,
        size: c.size,
        orders: rec.list,
        cap,
        fillBps: Math.min(10_000, Math.floor((rec.list.length * 10_000) / Math.max(1, cap))),
        // Full, the next one waits for a place: it comes an interval after one is freed.
        nextAt: full ? null : rec.next,
      };
    });
}

/** Takes an order out of its city at a time (loaded aboard): null when it is not there. */
export function takeOrder(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  id: string,
  now: number,
): EmpireOrder | null {
  const rec = cityOrdersAt(ctx, h, playerId, s, code, now);
  const o = rec.list.find((x) => x.id === id);
  if (!o) return null;
  const c = s.map.cities.find((x) => x.code === code);
  // Full until now: the next one an interval after this place is freed.
  const next = c && rec.list.length >= capOf(s, c.size) ? now + everyMs(s, c.size) : rec.next;
  h.orders = {
    ...(h.orders ?? {}),
    [code]: { next, seq: rec.seq, list: rec.list.filter((x) => x !== o) },
  };
  return o;
}

/** Gives an order back to its city (unloaded at a counter), at a time. */
export function returnOrder(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  o: EmpireOrder,
  now: number,
): void {
  const rec = cityOrdersAt(ctx, h, playerId, s, o.city, now);
  const { id, city, good, qty, pay } = o;
  h.orders = {
    ...(h.orders ?? {}),
    [o.city]: { ...rec, list: [...rec.list, { id, city, good, qty, pay }] },
  };
}

/**
 * The cities newly served by the house's counters begin their orders now (the first one at once,
 * none for the time before); the waves of before are dropped once.
 */
export function trackOrders(h: EmpireHouse, s: EmpireSettings, now: number): void {
  if (!s.orders) return;
  const kept = Object.fromEntries(
    Object.entries(h.orders ?? {}).filter(([, r]) => r && !("waves" in r) && Array.isArray(r.list)),
  );
  const missing = [...citiesCovered(h, s)].filter((c) => !kept[c]);
  if (missing.length === 0 && Object.keys(kept).length === Object.keys(h.orders ?? {}).length)
    return;
  h.orders = {
    ...kept,
    ...Object.fromEntries(missing.map((c) => [c, { next: now, seq: 0, list: [] }])),
  };
}

/**
 * Keeps the orders come by now of every city the house serves: once kept, an order stays as it
 * was drawn, whatever the house builds after.
 */
export function settleOrders(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  now: number,
): void {
  if (!s.orders) return;
  trackOrders(h, s, now);
  const next = { ...(h.orders ?? {}) };
  for (const code of citiesCovered(h, s)) next[code] = cityOrdersAt(ctx, h, playerId, s, code, now);
  h.orders = next;
}
