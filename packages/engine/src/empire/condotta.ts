import { DAY_MS, type PlayerId } from "../state.js";
import type { Tx } from "../tx.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";

/** The highest tier of the Condotta a house's Casa opens (the tier n from the Casa n + offset). */
export function condottaTierCap(casa: number, s: EmpireSettings, levels: number): number {
  return Math.max(1, Math.min(levels, casa - s.condotta.casaOffset));
}

/**
 * A won match of the Condotta (CADRAGE-v3 § 7): Seals by its tier, for one match a day. The Seals
 * are never sold (§ 10).
 */
export function rewardCondotta(tx: Tx, playerId: PlayerId, tier: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const day = Math.floor(tx.now / DAY_MS);
  if (h.condottaDay === day) return;
  const table = s.condotta.sealsByTier;
  const t = Math.max(1, Math.floor(tier));
  h.seals += table[Math.min(t, table.length) - 1] ?? 0;
  h.condottaDay = day;
}
