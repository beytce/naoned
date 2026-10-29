import { type Deniers, applyBpsFloor } from "../money.js";
import { regionOf } from "./prices.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The risk a voyage to a region meets corsairs (profondeur.md § H), in bps: the region's own (none
 * in Venetia), halved for each `escortHalving` of escort strength.
 */
export function corsairRiskBps(region: string, escortStrength: number, s: EmpireSettings): number {
  const base = regionOf(region, s).corsairRiskBps;
  if (base === 0) return 0;
  return Math.round(base * 0.5 ** (Math.max(0, escortStrength) / s.corsairs.escortHalving));
}

/** What an attack takes: a share of the cargo's value, never the ship (CADRAGE-v3 § 2). */
export function cargoLoss(cargoValue: Deniers, s: EmpireSettings): Deniers {
  if (cargoValue <= 0n) return 0n;
  return applyBpsFloor(cargoValue, s.corsairs.lossShareBps);
}
