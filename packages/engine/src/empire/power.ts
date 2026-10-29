import type { EmpireSettings } from "./settings.js";

/** What the Power reads of a house: what is built, never its treasury. */
export interface PowerParts {
  casa: number;
  workshopLevels: readonly number[];
  counterLevels: readonly number[];
  moduleLevels: readonly number[];
  staffLevels: readonly number[];
  vehicles: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);

/**
 * The Power of a house (CADRAGE-v3 § 3.6): a weighted sum of its levels. It matches houses and
 * draws the bands; the treasury never counts, so hoarding ducats never makes a house stronger.
 */
export function powerOf(h: PowerParts, s: EmpireSettings): number {
  const w = s.power;
  return (
    h.casa * w.casa +
    sum(h.workshopLevels) * w.workshopLevel +
    sum(h.counterLevels) * w.counterLevel +
    sum(h.moduleLevels) * w.moduleLevel +
    sum(h.staffLevels) * w.staffLevel +
    h.vehicles * w.vehicle
  );
}

/** The band of a Power: the index of the last lower bound it reaches. */
export function bandOf(power: number, s: EmpireSettings): number {
  let band = 0;
  s.power.bands.forEach((from, i) => {
    if (power >= from) band = i;
  });
  return band;
}
