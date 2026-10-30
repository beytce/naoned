import type { EmpireHouse } from "../state.js";
import { moduleEffectBps } from "./modules.js";
import type { EmpireSettings } from "./settings.js";

/** Where an effect is read: the staff placed there and the modules fitted there count too. */
export interface EffectPlace {
  workshopId?: string;
  region?: string;
  vehicleId?: string;
}

/**
 * The one reading of an effect for a house (bps): its researched modules but the workshops' (those
 * count where they are fitted), and, as the step 5 brings them, its knowledge, its Arte, the staff
 * placed at `place`, its lineage's traits. Every hook of the engine reads its effects here.
 */
export function houseEffect(
  h: EmpireHouse | undefined,
  effect: string,
  s: EmpireSettings,
  _place?: EffectPlace,
): number {
  if (!h) return 0;
  let total = 0;
  for (const [code, level] of Object.entries(h.modules ?? {})) {
    const m = s.modules.find((x) => x.code === code);
    if (m && m.kind !== "workshop" && m.effect === effect) total += moduleEffectBps(code, level, s);
  }
  return total;
}
