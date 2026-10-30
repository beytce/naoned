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
  place?: EffectPlace,
): number {
  if (!h) return 0;
  let total = 0;
  const of = (code: string, level: number, fitted: boolean) => {
    const m = s.modules.find((x) => x.code === code);
    if (m && (m.kind === "workshop") === fitted && m.effect === effect)
      total += moduleEffectBps(code, level, s);
  };
  for (const [code, level] of Object.entries(h.modules ?? {})) of(code, level, false);
  // The workshop's own modules, at their researched level.
  const ws = place?.workshopId ? h.workshops.find((w) => w.id === place.workshopId) : undefined;
  for (const code of ws?.fitted ?? []) of(code, h.modules?.[code] ?? 0, true);
  // The Arte: its own effects, and its chain's yield where the workshop is of it.
  const arte = s.arte.artes.find((a) => a.code === h.arte);
  total += arte?.effects[effect] ?? 0;
  if (effect === "workshopYield" && ws) {
    if (arte?.buildings.includes(ws.type)) total += s.arte.chainYieldBps;
    const minor = s.arte.artes.find((a) => a.code === h.minorArte);
    if (minor?.buildings.includes(ws.type)) total += s.arte.minorYieldBps;
  }
  return total;
}
