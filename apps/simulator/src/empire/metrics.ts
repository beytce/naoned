import type { Deniers } from "@comptoirs/engine";
import { DAY, type House, type Trade, type World } from "./model.js";
import { power, priceOf } from "./world.js";

export interface CohortRow {
  houses: number;
  casa: number;
  power: number;
  /** Median receipts a day over the last week, in ducats. */
  income: number;
}

export interface DailyRow {
  day: number;
  /** Mean of price ÷ reference over the traded markets, in bps (target 8 000 to 13 000). */
  priceIndex: number;
  /** The widest spread between two regions for one good, in bps of the lower price. */
  spread: number;
  money: Deniers;
  cohorts: Record<number, CohortRow>;
  worldPower: number;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export const ducatsOf = (x: Deniers) => Number(x / 100n);

export function dailyIncome(h: House): number {
  const days = Math.max(1, h.recent.length - 1);
  const sum = h.recent.slice(0, -1).reduce((a, x) => a + x, 0n);
  return ducatsOf(sum) / days;
}

export function snapshot(w: World): DailyRow {
  let index = 0;
  let n = 0;
  const byGood = new Map<string, number[]>();
  for (const mk of w.markets.values()) {
    const r = w.s.regions.find((x) => x.code === mk.region);
    if (!r || (r.produces[mk.good] === undefined && r.demands[mk.good] === undefined)) continue;
    const p = Number(priceOf(w, mk));
    index += (p * 10_000) / Number(mk.ref);
    n++;
    byGood.set(mk.good, [...(byGood.get(mk.good) ?? []), p]);
  }
  let spread = 0;
  for (const prices of byGood.values()) {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    if (lo > 0) spread = Math.max(spread, Math.round(((hi - lo) * 10_000) / lo));
  }
  const cohorts: Record<number, CohortRow> = {};
  for (const c of new Set(w.houses.map((h) => h.cohort))) {
    const hs = w.houses.filter((h) => h.cohort === c);
    cohorts[c] = {
      houses: hs.length,
      casa: median(hs.map((h) => h.casa)),
      power: median(hs.map((h) => power(w, h))),
      income: median(hs.map(dailyIncome)),
    };
  }
  return {
    day: w.now / DAY,
    priceIndex: n > 0 ? Math.round(index / n) : 10_000,
    spread,
    money: w.created - w.destroyed,
    cohorts,
    worldPower: median(w.houses.map((h) => power(w, h))),
  };
}

export const TRADES: Trade[] = [
  "orders",
  "market",
  "voyages",
  "extraction",
  "expeditions",
  "terra",
];
