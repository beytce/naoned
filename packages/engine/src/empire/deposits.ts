import type { Rng } from "../rng.js";
import type { EmpireSettings } from "./settings.js";

/** A fresh deposit's stock (profondeur.md § A), between the settings' bounds. */
export function depositStock(rng: Rng, s: EmpireSettings): number {
  return rng.int(s.deposits.minStock, s.deposits.maxStock);
}

/** Units an hour a team takes, with its yield modules (bps). */
export function teamRate(yieldBps: number, s: EmpireSettings): number {
  return Math.floor((s.deposits.teamPerHour * (10_000 + Math.max(0, yieldBps))) / 10_000);
}

/**
 * Teams working one deposit for some hours: each takes its rate, or, when the stock runs short, a
 * share of what is left in proportion to its rate (the units left over to the largest rates).
 * Whole units, never more than the stock.
 */
export function extract(
  stock: number,
  rates: readonly number[],
  hours: number,
): { taken: number[]; left: number } {
  const wants = rates.map((r) => Math.max(0, Math.floor(r * hours)));
  const total = wants.reduce((a, x) => a + x, 0);
  if (total <= stock) return { taken: wants, left: stock - total };
  const taken = wants.map((w) => Math.floor((w * stock) / total));
  let rest = stock - taken.reduce((a, x) => a + x, 0);
  const order = wants.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
  for (let k = 0; rest > 0; k = (k + 1) % order.length) {
    const at = order[k]?.i ?? 0;
    taken[at] = (taken[at] ?? 0) + 1;
    rest--;
  }
  return { taken, left: 0 };
}
