import { DENIERS_PER_DUCAT, type Deniers, applyBpsCeil } from "../money.js";
import type { EmpireSettings, ModuleSettings } from "./settings.js";

/** A module of the catalog (profondeur.md § B), by its code. */
export function moduleOf(code: string, s: EmpireSettings): ModuleSettings {
  const m = s.modules.find((x) => x.code === code);
  if (!m) throw new RangeError(`no module ${code}`);
  return m;
}

/** A module's effect at a level (0: not researched), in bps. */
export function moduleEffectBps(code: string, level: number, s: EmpireSettings): number {
  const m = moduleOf(code, s);
  if (level <= 0) return 0;
  return m.firstLevelBps + m.perLevelBps * (level - 1);
}

/** The sum of one effect over the modules a ship, team or company carries ({ code: level }). */
export function effectOf(
  carried: Readonly<Record<string, number>>,
  effect: string,
  s: EmpireSettings,
): number {
  let total = 0;
  for (const [code, level] of Object.entries(carried))
    if (moduleOf(code, s).effect === effect) total += moduleEffectBps(code, level, s);
  return total;
}

/** What researching a module's level n costs: base × growth^(n − 1), in deniers. */
export function researchCost(level: number, s: EmpireSettings): Deniers {
  let cost = s.research.baseCostDucats * DENIERS_PER_DUCAT;
  for (let n = 2; n <= level; n++) cost = applyBpsCeil(cost, s.research.costGrowthBps);
  return cost;
}

/** Minutes of research of a module's level n; past the table, its last line. */
export function researchMinutesOf(level: number, s: EmpireSettings): number {
  const table = s.research.minutes;
  return table[Math.min(level, table.length) - 1] ?? 0;
}

/** The plans (from relics) a module's level n asks: none below `plansFromLevel`, then more. */
export function plansFor(level: number, s: EmpireSettings): number {
  const { plansFromLevel, plansPerLevel } = s.research;
  return level < plansFromLevel ? 0 : plansPerLevel * (level - plansFromLevel + 1);
}
