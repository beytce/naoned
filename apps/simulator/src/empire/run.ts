import { type EmpireSettingsInput, parseEmpireSettings, venice1450Empire } from "@comptoirs/engine";
import { finishBuild, newHouse, playsNow, session } from "./bots.js";
import { DEFAULT_MODEL } from "./defaults.js";
import { type DailyRow, type MonthRow, monthSample, snapshot } from "./metrics.js";
import { type Activity, type Bent, DAY, MONTH, type SimModel, type World } from "./model.js";
import { terraWeek } from "./terra.js";
import { createWorld, newDay, newRng, relaxMarkets } from "./world.js";

export interface EmpireOptions {
  seed: number;
  months: number;
  /** Houses a cohort brings, and the months they arrive. */
  cohortSize: number;
  cohortMonths: number[];
  activityMix: Record<Activity, number>;
  bentMix: Record<Bent, number>;
  settings?: EmpireSettingsInput;
  model?: Partial<SimModel>;
}

export interface EmpireResult {
  options: EmpireOptions;
  world: World;
  daily: DailyRow[];
  monthly: MonthRow[];
  violations: string[];
  durationMs: number;
}

export const DEFAULT_EMPIRE_OPTIONS: Omit<EmpireOptions, "seed"> = {
  months: 24,
  cohortSize: 200,
  cohortMonths: [0, 3, 6, 12],
  activityMix: { assidu: 20, median: 50, occasional: 20, absent: 10 },
  bentMix: { trader: 25, miner: 25, armourer: 25, mixed: 25 },
};

/** Spreads a mix over n houses, by largest remainder. */
function spread<K extends string>(mix: Record<K, number>, n: number): K[] {
  const keys = Object.keys(mix) as K[];
  const total = keys.reduce((a, k) => a + mix[k], 0);
  const out: K[] = [];
  for (const k of keys) for (let i = 0; i < Math.floor((mix[k] * n) / total); i++) out.push(k);
  for (let i = 0; out.length < n; i++) out.push(keys[i % keys.length] as K);
  return out;
}

export function runEmpire(options: EmpireOptions): EmpireResult {
  const started = Date.now();
  const s = parseEmpireSettings(options.settings ?? venice1450Empire);
  const model = { ...DEFAULT_MODEL, ...options.model };
  // The vehicles the game sets (step 4: the mule to the wagon) are the engine's; the ships, the
  // model's until their step.
  const w = createWorld(s, { ...model, vehicles: { ...model.vehicles, ...s.vehicles } });
  const rng = newRng(options.seed, 1);
  const daily: DailyRow[] = [];
  const monthly: MonthRow[] = [];
  const violations: string[] = [];
  const end = options.months * MONTH;
  for (w.now = 0; w.now < end; w.now++) {
    const month = w.now / MONTH;
    if (Number.isInteger(month) && options.cohortMonths.includes(month)) {
      const acts = spread(options.activityMix, options.cohortSize);
      const bents = spread(options.bentMix, options.cohortSize);
      for (let i = 0; i < options.cohortSize; i++)
        newHouse(w, month, acts[i] ?? "median", bents[(i * 7) % bents.length] ?? "mixed");
    }
    if (w.now % DAY === 0) {
      newDay(w);
      shareOfCasa(w);
      if ((w.now / DAY) % 7 === 0 && w.now > 0) terraWeek(w, rng, w.now / DAY / 7);
      const cash = w.houses.reduce((a, h) => a + h.cash, 0n);
      if (cash !== w.created - w.destroyed)
        violations.push(
          `day ${w.now / DAY}: cash ${cash} ≠ created − destroyed ${w.created - w.destroyed}`,
        );
      daily.push(snapshot(w));
      if (w.now > 0 && w.now % MONTH === 0) monthly.push(monthSample(w));
    }
    relaxMarkets(w);
    for (const h of w.houses) {
      if (h.builds.length > 0) {
        const done = h.builds.filter((b) => b.endsAt <= w.now);
        if (done.length > 0) {
          h.builds = h.builds.filter((b) => b.endsAt > w.now);
          for (const b of done) finishBuild(w, h, b);
        }
      }
      if (h.research.length > 0) {
        const done = h.research.filter((r) => r.endsAt <= w.now);
        if (done.length > 0) {
          h.research = h.research.filter((r) => r.endsAt > w.now);
          for (const r of done) h.modules[r.code] = r.level;
        }
      }
    }
    // In a new order each hour: no house is always first at the cities' board.
    const order = w.houses.map((h, i) => ({ h, k: rng.next() + i * 0 }));
    order.sort((a, b) => a.k - b.k);
    for (const { h } of order) if (playsNow(w, h, rng)) session(w, h, rng);
  }
  return { options, world: w, daily, monthly, violations, durationMs: Date.now() - started };
}

/** « Le savoir circule »: the share of the active houses at each Casa level or above. */
function shareOfCasa(w: World) {
  const active = w.houses.filter((h) => h.awayUntil <= w.now);
  const n = Math.max(1, active.length);
  w.casaShare = w.s.casa.map((_, i) =>
    Math.floor((active.filter((h) => h.casa >= i + 1).length * 10_000) / n),
  );
  const best = active.map((h) => Math.max(0, ...h.workshops.map((x) => x.level)));
  w.workshopShare = Array.from({ length: w.s.workshops.maxLevel }, (_, i) =>
    Math.floor((best.filter((l) => l >= i + 1).length * 10_000) / n),
  );
}
