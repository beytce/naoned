/**
 * A house of the board seen by the assault (docs/plan-guerre.md W1): its port as it laid it (the
 * defenses of the Arsenal's step, its secret ruses) and the ships of its fleet fit to sail.
 */
import { plancheShipStats } from "../planche/arsenal.js";
import type { PlancheSetup, PlancheState } from "../planche/planche.js";
import type { AssautFleetShip, AssautPort, AssautRuse } from "./assaut.js";

const DAY = 86_400_000;
export const ASSAUT_RUSES: readonly AssautRuse[] = ["chaine", "brulot", "renforts"];

const fail = (code: string): never => {
  throw new Error(code);
};

/** A house's port, as an assault meets it. */
export function assautPortOf(S: PlancheSetup, s: PlancheState, house: string): AssautPort {
  const h = Object.hasOwn(s.houses, house) ? s.houses[house] : undefined;
  const passes: AssautPort["passes"] = {};
  for (const pass of S.arsenal?.port.passes ?? []) {
    const ruse = h?.ruses?.[pass];
    passes[pass] = { defenses: [...(h?.port?.[pass] ?? [])], ...(ruse ? { ruse } : {}) };
  }
  return { passes };
}

/** A house's ships fit to sail: not damaged, with their level's hull. */
export function assautFleetOf(S: PlancheSetup, s: PlancheState, house: string): AssautFleetShip[] {
  const h = Object.hasOwn(s.houses, house) ? s.houses[house] : undefined;
  return (h?.fleet?.ships ?? [])
    .filter((x) => !x.damaged)
    .map((x) => {
      const { force, hull } = plancheShipStats(S, x);
      return {
        id: x.id,
        kind: x.kind,
        force,
        hull,
        keyword: S.arsenal?.ships[x.kind]?.keyword ?? "",
      };
    });
}

/** The master of a port sets its secret ruses, one a pass, once a day (the owner's choice). */
export function plancheRuses(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  ruses: Record<string, AssautRuse>,
  now: number,
): PlancheState {
  const h0 = Object.hasOwn(s0.houses, house) ? s0.houses[house] : undefined;
  const passes = S.arsenal?.port.passes ?? [];
  if (!h0 || !passes.length) return fail("planche_unknown");
  for (const [pass, r] of Object.entries(ruses))
    if (!passes.includes(pass) || !ASSAUT_RUSES.includes(r)) return fail("planche_unknown");
  const day = Math.floor(now / DAY);
  if (h0.rusesDay === day) return fail("planche_ruses_today");
  const s = structuredClone(s0);
  const h = s.houses[house];
  if (h) {
    h.ruses = { ...ruses };
    h.rusesDay = day;
  }
  return s;
}
