/**
 * The growth of a house (docs/plan-progression-maison.md): its Prestige, earned week after week
 * and capped each week; its level, from 1 to the last, which never goes back; its title; and what
 * each level opens on the board (bobbins, the size of its island, the tiers of its workshops, the
 * towers it may hold). A level gives room and choice, never a yield (CADRAGE-v4, the owner's D1).
 *
 * Pure: the server keeps the Prestige; the board keeps the level of each house.
 */

const BPS = 10_000;
const DUCAT = 100n;

/** The growth's rules, as `worlds.settings` would give them. */
export interface MaisonRules {
  /** Prestige to reach level n: `curve × (n − 1)²`. */
  curve: number;
  maxLevel: number;
  /** The titles, each from its level on. */
  titles: { from: number; name: string }[];
  /** What a level opens, kept by the levels above it; level 1 gives everything's start. */
  unlocks: {
    level: number;
    bobbins?: number;
    tiles?: number;
    tier?: number;
    towers?: number;
  }[];
  /** Prestige a week at most; what was not earned under it carried to the next, in part. */
  weeklyCap: number;
  catchUpBps: number;
  /** The day's trade: a point for so many ducats sold, so many at most a day. */
  commerce: { perDucats: number; dailyCap: number };
}

/** What a level opens on the board, all told. */
export interface MaisonCaps {
  bobbins: number;
  tiles: number;
  tier: number;
  towers: number;
}

/** The Prestige a level starts at. */
export const maisonThreshold = (R: MaisonRules, level: number) =>
  R.curve * (Math.max(1, level) - 1) ** 2;

/** A house's level for its Prestige, the bounds of that level (no next one at the last), its title. */
export function maisonLevel(
  R: MaisonRules,
  prestige: number,
): { level: number; from: number; to: number | null; title: string } {
  let level = 1;
  while (level < R.maxLevel && prestige >= maisonThreshold(R, level + 1)) level++;
  const title =
    [...R.titles].reverse().find((t) => t.from <= level)?.name ?? R.titles[0]?.name ?? "";
  return {
    level,
    from: maisonThreshold(R, level),
    to: level < R.maxLevel ? maisonThreshold(R, level + 1) : null,
    title,
  };
}

/** What a level opens: the last word of each level up to it. */
export function maisonUnlocks(R: MaisonRules, level: number): MaisonCaps {
  const caps: MaisonCaps = { bobbins: 0, tiles: 0, tier: 0, towers: 0 };
  for (const u of [...R.unlocks].sort((a, b) => a.level - b.level)) {
    if (u.level > level) break;
    if (u.bobbins !== undefined) caps.bobbins = u.bobbins;
    if (u.tiles !== undefined) caps.tiles = u.tiles;
    if (u.tier !== undefined) caps.tier = u.tier;
    if (u.towers !== undefined) caps.towers = u.towers;
  }
  return caps;
}

/**
 * A week's Prestige: what was earned, up to the cap and what the last week carried; what was left
 * under the cap is carried in part to the next (a week missed is not all lost).
 */
export function maisonWeek(
  R: MaisonRules,
  earned: number,
  carryIn: number,
): { credited: number; carry: number } {
  const credited = Math.max(0, Math.min(earned, R.weeklyCap + carryIn));
  const left = Math.max(0, R.weeklyCap - credited);
  return { credited, carry: Math.floor((left * R.catchUpBps) / BPS) };
}

/** The day's trade in Prestige: a point for so many ducats sold (in deniers), capped. */
export function maisonCommerce(R: MaisonRules, soldDeniers: bigint): number {
  const points = soldDeniers / (BigInt(R.commerce.perDucats) * DUCAT);
  return Math.min(R.commerce.dailyCap, Number(points));
}
