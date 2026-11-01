import { draw } from "../draw.js";
import { type Deniers, applyBpsFloor } from "../money.js";
import {
  type EmpireCityWaves,
  type EmpireHouse,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
} from "../state.js";
import type { Tx } from "../tx.js";
import { empireSettings } from "./house.js";
import { citiesCovered, standingPosts } from "./map.js";
import type { EmpireSettings } from "./settings.js";
import { postsServing } from "./stores.js";

/**
 * The cities' orders (decision of the owner, 1 November 2026), after Hades' Star's shipments: each
 * city a counter of the house serves asks a few goods of its region, a wave every period (two
 * hours), as many orders a wave as its size. The waves pile up to a cap (six, twelve hours): beyond,
 * no new wave comes until something is brought; nothing is lost by the absence. A vehicle brings
 * them hop by hop (moves.ts), each unit paid at its arrival.
 */

export interface CityOrder {
  good: string;
  /** Asked by the open waves, what was brought included. */
  qty: number;
  filled: number;
  /** A unit's pay, before the way's premium. */
  unit: Deniers;
}

export interface CityOrders {
  city: string;
  region: string;
  size: number;
  /** By good, the open waves together. */
  orders: CityOrder[];
  /** The open waves, and how full the city is of them (the ring around it), in bps of the cap. */
  waves: number;
  fillBps: number;
  /** When the next wave comes (if the cap leaves room). */
  renewsAt: number;
}

const periodMs = (s: EmpireSettings) => (s.orders?.periodMinutes ?? 120) * MINUTE_MS;

/** The period of the orders at a time. */
export const periodOf = (now: number, s: EmpireSettings) => Math.floor(now / periodMs(s));

/** A city's orders of a period's wave, for a house: their goods, quantities and unit pay. */
export function cityOrders(
  ctx: WorldContext,
  s: EmpireSettings,
  playerId: PlayerId,
  code: string,
  period: number,
  boostBps = 0,
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
    // A greater counter serving it, greater orders (its level, as the book of before grew).
    const qty = Math.floor(
      ((least + (draw(ctx, `${key}|qty`) % least)) * (10_000 + boostBps)) / 10_000,
    );
    const ref = r.demands[good] ?? 0n;
    const unit = applyBpsFloor(ref, 10_000 + o.premiumBps + o.sizeBps * (size - 1));
    return { good, qty, unit };
  });
}

/** How much greater a city's orders are for the best counter of the house serving it. */
export function orderBoostBps(h: EmpireHouse, s: EmpireSettings, code: string): number {
  const ids = new Set(postsServing(h, s, code));
  const level = Math.max(
    1,
    ...standingPosts(h, s)
      .filter((p) => ids.has(p.id))
      .map((p) => p.level),
  );
  return s.counters.bookStepBps * (level - 1);
}

const isOpen = (w: EmpireCityWaves["waves"][number]) =>
  w.qty.some((q, i) => (w.filled[i] ?? 0) < q);

/**
 * A city's waves at a time, from what the house keeps of them: the periods come since, each its
 * wave while fewer than the cap are open; at the cap, the periods pass without a wave.
 */
export function wavesAt(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  now: number,
): EmpireCityWaves {
  const period = periodOf(now, s);
  const kept = h.orders?.[code];
  const waves = (kept?.waves ?? []).filter(isOpen).map((w) => ({ ...w, filled: [...w.filled] }));
  const max = s.orders?.maxWaves ?? 6;
  // The oldest periods first: what the house sees stays as it was until something is brought.
  const start = kept?.next ?? period;
  const boost = orderBoostBps(h, s, code);
  let next = start;
  for (; next <= period && waves.length < max; next++) {
    const qty = cityOrders(ctx, s, playerId, code, next, boost).map((x) => x.qty);
    waves.push({ period: next, qty, filled: qty.map(() => 0) });
  }
  // At the cap, the periods go by without a wave: none owed for later.
  return { next: Math.max(next, period + 1), waves };
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
  const max = s.orders.maxWaves;
  const covered = citiesCovered(h, s);
  return s.map.cities
    .filter((c) => covered.has(c.code))
    .map((c) => {
      const { waves } = wavesAt(ctx, h, playerId, s, c.code, now);
      const byGood = new Map<string, CityOrder>();
      for (const w of waves) {
        cityOrders(ctx, s, playerId, c.code, w.period).forEach((x, i) => {
          const o = byGood.get(x.good) ?? { good: x.good, qty: 0, filled: 0, unit: x.unit };
          o.qty += w.qty[i] ?? 0;
          o.filled += Math.min(w.qty[i] ?? 0, w.filled[i] ?? 0);
          byGood.set(x.good, o);
        });
      }
      return {
        city: c.code,
        region: c.region,
        size: c.size,
        orders: [...byGood.values()].sort((a, b) => a.good.localeCompare(b.good)),
        waves: waves.length,
        fillBps: Math.min(10_000, Math.floor((waves.length * 10_000) / max)),
        renewsAt: (periodOf(now, s) + 1) * periodMs(s),
      };
    });
}

/** What a city's open orders still ask of a good, for a house, at a time. */
export function askedOf(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  good: string,
  now: number,
): number {
  if (!s.orders || !citiesCovered(h, s).has(code)) return 0;
  let left = 0;
  for (const w of wavesAt(ctx, h, playerId, s, code, now).waves)
    cityOrders(ctx, s, playerId, code, w.period).forEach((x, i) => {
      if (x.good === good) left += Math.max(0, (w.qty[i] ?? 0) - (w.filled[i] ?? 0));
    });
  return left;
}

/**
 * Brings up to `qty` of a good to a city's open orders at a time, the oldest wave first: keeps the
 * waves, and returns what was taken and its pay before the way's premium.
 */
export function fillCity(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  code: string,
  good: string,
  qty: number,
  at: number,
): { n: number; gross: Deniers } {
  const s = empireSettings(tx.ctx);
  if (!s.orders || !citiesCovered(h, s).has(code)) return { n: 0, gross: 0n };
  const rec = wavesAt(tx.ctx, h, playerId, s, code, at);
  let left = qty;
  let gross = 0n;
  for (const w of rec.waves) {
    cityOrders(tx.ctx, s, playerId, code, w.period).forEach((x, i) => {
      if (left <= 0 || x.good !== good) return;
      const n = Math.min(left, Math.max(0, (w.qty[i] ?? 0) - (w.filled[i] ?? 0)));
      if (n <= 0) return;
      w.filled[i] = (w.filled[i] ?? 0) + n;
      left -= n;
      gross += x.unit * BigInt(n);
    });
  }
  h.orders = { ...(h.orders ?? {}), [code]: { next: rec.next, waves: rec.waves.filter(isOpen) } };
  return { n: qty - left, gross };
}

/**
 * The cities newly served by the house's counters begin their waves now (the waves come from the
 * period a city is first served, never from before).
 */
export function trackOrders(h: EmpireHouse, s: EmpireSettings, now: number): void {
  if (!s.orders) return;
  const period = periodOf(now, s);
  const missing = [...citiesCovered(h, s)].filter((c) => !h.orders?.[c]);
  if (missing.length === 0) return;
  h.orders = {
    ...(h.orders ?? {}),
    ...Object.fromEntries(missing.map((c) => [c, { next: period, waves: [] }])),
  };
}
