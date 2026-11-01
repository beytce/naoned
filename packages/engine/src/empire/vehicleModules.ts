import type { EmpireHouse, PlayerId } from "../state.js";
import { type Tx, fail } from "../tx.js";
import { vehicleLevelOf } from "./fleet.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The trade modules fitted on the vehicles (decision of the owner, 1 November 2026, after Hades'
 * Star's ships): researched at the Scuola, a trade module counts only on the vehicles it is fitted
 * on, as a workshop's module on its workshop; a vehicle has a place a level of its model.
 */

type Vehicle = NonNullable<EmpireHouse["vehicles"]>[number];

/** A vehicle's places for trade modules: one a level of its model. */
export const vehicleSlotsOf = (h: EmpireHouse, type: string): number => vehicleLevelOf(h, type);

/** The trade modules the house has researched, the highest level first. */
function researchedTrade(h: EmpireHouse, s: EmpireSettings): string[] {
  return Object.entries(h.modules ?? {})
    .filter(
      ([code, level]) => level > 0 && s.modules.find((m) => m.code === code)?.kind === "trade",
    )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code]) => code);
}

/**
 * The vehicles never fitted (a house of before, a vehicle just bought) receive the trade modules
 * the house has researched, in their places, once; a vehicle fitted by hand is left as it is.
 */
export function ensureFitted(h: EmpireHouse, s: EmpireSettings): void {
  const codes = researchedTrade(h, s);
  for (const v of h.vehicles ?? []) {
    if (v.fitted !== undefined || !s.vehicles[v.type]) continue;
    v.fitted = codes.slice(0, vehicleSlotsOf(h, v.type));
  }
}

/** The trade modules that count on a vehicle: those fitted in its places, at their level. */
export function fittedOn(h: EmpireHouse, v: Vehicle | undefined): string[] {
  if (!v) return [];
  return (v.fitted ?? []).slice(0, vehicleSlotsOf(h, v.type)).filter((x): x is string => !!x);
}

/** Fits a researched trade module in a place of a vehicle (null: empties it): free, at once. */
export function fitVehicle(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  slot: number,
  code: string | null,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v || !s.vehicles[v.type]) fail("unknown_building");
  if (!Number.isInteger(slot) || slot < 0 || slot >= vehicleSlotsOf(h, v.type)) fail("no_room");
  const fitted = [...(v.fitted ?? [])];
  if (code !== null) {
    const m = s.modules.find((x) => x.code === code);
    if (!m || m.kind !== "trade" || !(h.modules?.[code] ?? 0)) fail("unknown_building_type");
    if (fitted.some((x, i) => x === code && i !== slot)) fail("built");
  }
  while (fitted.length <= slot) fitted.push("");
  fitted[slot] = code ?? "";
  v.fitted = fitted;
}
