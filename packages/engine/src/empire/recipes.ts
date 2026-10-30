import type { EmpireSettings } from "./settings.js";

/**
 * The raw goods of Venetia a workshop of this level eats to make `units` (CADRAGE-v3 § 12 bis):
 * nothing below the threshold, then a share of a unit per level from it, rounded up to whole units.
 */
export function highRecipeRaw(level: number, units: number, s: EmpireSettings): number {
  const r = s.highRecipes;
  if (level < r.fromLevel || units <= 0 || r.rawPerLevelBps === 0) return 0;
  const steps = level - r.fromLevel + 1;
  return Math.ceil((units * steps * r.rawPerLevelBps) / 10_000);
}
