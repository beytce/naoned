import type { EmpireSettings } from "./settings.js";

const MAX_SUCCESS_BPS = 9_500;

function tierOf(tier: number, s: EmpireSettings) {
  const line = s.expeditions.tiers[tier - 1];
  if (!Number.isInteger(tier) || tier < 1 || !line) throw new RangeError(`no tier ${tier}`);
  return line;
}

/**
 * The chance an expedition of a tier succeeds (profondeur.md § C), in bps: the base chance at the
 * strength it asks, in proportion to the fleet's strength, never certain.
 */
export function expeditionSuccessBps(tier: number, strength: number, s: EmpireSettings): number {
  const asked = tierOf(tier, s).strength;
  const chance = Math.floor((s.expeditions.baseSuccessBps * Math.max(0, strength)) / asked);
  return Math.min(MAX_SUCCESS_BPS, chance);
}

/** The relics a successful expedition of a tier brings back. */
export function relicsOf(tier: number, s: EmpireSettings): number {
  return tierOf(tier, s).relics;
}
