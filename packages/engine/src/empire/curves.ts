import { DENIERS_PER_DUCAT, type Deniers, applyBpsCeil } from "../money.js";
import type { EmpireSettings } from "./settings.js";

/**
 * A workshop's lot at level n, in basis points of the base lot: Y(n) = n × (1 + k × (n − 1))
 * (CADRAGE-v3 § 3.2). Level 20 makes about 77 lots of base: figures that are felt.
 */
export function lotYieldBps(level: number, s: EmpireSettings): number {
  if (level < 1) return 0;
  return level * (10_000 + s.workshops.yieldStepBps * (level - 1));
}

/** What a workshop's level n costs: base × g^(n − 1), rounded up at each step, in deniers. */
export function levelCost(level: number, s: EmpireSettings): Deniers {
  let cost = s.workshops.baseCostDucats * DENIERS_PER_DUCAT;
  for (let n = 2; n <= level; n++) cost = applyBpsCeil(cost, s.workshops.costGrowthBps);
  return cost;
}

/**
 * The cost of level n for each base lot it adds: it grows with n, so a level pays itself back
 * later and later (the brake of the large houses, without a cap). For calibration only.
 */
export function paybackRatio(level: number, s: EmpireSettings): number {
  const added = lotYieldBps(level, s) - lotYieldBps(level - 1, s);
  return Number(levelCost(level, s)) / added;
}

/** Building minutes of a workshop's level n; past the table, its last line. */
export function buildMinutesOf(level: number, s: EmpireSettings): number {
  const table = s.workshops.buildMinutes;
  return table[Math.min(level, table.length) - 1] ?? 0;
}

/** The Casa's level n (1 to the table's length). */
export function casaLevelOf(level: number, s: EmpireSettings): EmpireSettings["casa"][number] {
  const line = s.casa[level - 1];
  if (!Number.isInteger(level) || level < 1 || !line)
    throw new RangeError(`no Casa level ${level}`);
  return line;
}
