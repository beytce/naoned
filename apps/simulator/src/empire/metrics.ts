import { type Deniers, bandOf } from "@comptoirs/engine";
import { nextCasaCost } from "./bots.js";
import { DAY, type House, MONTH, type Trade, type World } from "./model.js";
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

/**
 * Marks the houses that reach the median Power of their band, measured among the houses that
 * arrived before them (CADRAGE-v3 § 12 bis: a newcomer is measured within its band).
 */
function markBandCatch(w: World, powers: Map<House, number>) {
  const bands = new Map(w.houses.map((h) => [h, bandOf(powers.get(h) ?? 0, w.s)]));
  const medians = new Map<string, number | null>();
  const medianBefore = (joinedAt: number, band: number) => {
    const key = `${joinedAt}:${band}`;
    if (!medians.has(key)) {
      const older = w.houses.filter((o) => o.joinedAt < joinedAt && bands.get(o) === band);
      medians.set(key, older.length > 0 ? median(older.map((o) => powers.get(o) ?? 0)) : null);
    }
    return medians.get(key) ?? null;
  };
  for (const h of w.houses) {
    if (h.bandCaughtAt !== undefined || h.joinedAt === 0) continue;
    const m = medianBefore(h.joinedAt, bands.get(h) ?? 0);
    if (m !== null && (powers.get(h) ?? 0) >= m) h.bandCaughtAt = w.now;
  }
}

export function snapshot(w: World): DailyRow {
  const powers = new Map(w.houses.map((h) => [h, power(w, h)]));
  markBandCatch(w, powers);
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
      power: median(hs.map((h) => powers.get(h) ?? 0)),
      income: median(hs.map(dailyIncome)),
    };
  }
  return {
    day: w.now / DAY,
    priceIndex: n > 0 ? Math.round(index / n) : 10_000,
    spread,
    money: w.created - w.destroyed,
    cohorts,
    worldPower: median([...powers.values()]),
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

export interface MonthRow {
  month: number;
  /** Median of the next Casa's cost in days of the house's income (target 2 to 7). */
  nextCasaDays: number;
  /** Sinks ÷ sources over the month, in bps, by age: under 3 months, then older. */
  ratioYoung: number;
  ratioOld: number;
}

/** Each month: the next step in days of income, and what was destroyed against what was made. */
export function monthSample(w: World): MonthRow {
  const steps: number[] = [];
  let youngIn = 0n;
  let youngOut = 0n;
  let oldIn = 0n;
  let oldOut = 0n;
  for (const h of w.houses) {
    const income = dailyIncome(h);
    if (h.casa < w.s.casa.length && income > 0) steps.push(ducatsOf(nextCasaCost(w, h)) / income);
    const made = h.earned - h.sampled.earned;
    const spent = h.spent - h.sampled.spent;
    if (w.now - h.joinedAt <= 3 * MONTH) {
      youngIn += made;
      youngOut += spent;
    } else {
      oldIn += made;
      oldOut += spent;
    }
    h.sampled = { earned: h.earned, spent: h.spent };
  }
  const ratio = (out: bigint, made: bigint) => (made > 0n ? Number((out * 10_000n) / made) : 0);
  return {
    month: w.now / MONTH,
    nextCasaDays: median(steps),
    ratioYoung: ratio(youngOut, youngIn),
    ratioOld: ratio(oldOut, oldIn),
  };
}
