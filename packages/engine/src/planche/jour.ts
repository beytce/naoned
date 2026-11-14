/**
 * The problem of the day (docs/plan-hex-commerce.md § 3.4, lot H3): each day one position of the
 * Passe, drawn from the date, the same for the whole lagoon. One try a house; solved, a little
 * Prestige (counted in the week, under its cap) and a knot on its façade. The day before is kept
 * for its results (how many solved it, in how many pieces).
 *
 * Pure: drawn from the date alone, the same on every server.
 */

import type { PlancheSetup, PlancheState } from "./planche.js";

const DAY = 86_400_000;

export interface PlancheDailyRules {
  /** The positions, by their ids; each comes once before any comes back. */
  problems: string[];
  /** The Prestige of a problem solved. */
  prestige: number;
}

/** A house's try of a day: solved or not, and in how many of its pieces. */
export interface PlancheDailyTry {
  won: boolean;
  moves: number;
}

const fail = (code: string): never => {
  throw new Error(code);
};

/** A number drawn from a word, the same everywhere (FNV-1a). */
function hash(word: string): number {
  let h = 2166136261;
  for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** The problem of a day (days since the epoch, UTC), or none on a board without them. */
export function plancheDaily(S: PlancheSetup, day: number): string | undefined {
  const ps = S.daily?.problems ?? [];
  if (!ps.length) return undefined;
  // A fixed shuffle, gone through in turn: every problem comes once before one comes back.
  const order = [...ps].sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1));
  return order[((day % order.length) + order.length) % order.length];
}

/** A house's try at the day's problem: solved, its Prestige and a knot; either way, its only one. */
export function plancheDailyTry(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  now: number,
  won: boolean,
  moves: number,
): PlancheState {
  const day = Math.floor(now / DAY);
  if (!S.daily || !plancheDaily(S, day) || !Object.hasOwn(s0.houses, house))
    return fail("planche_unknown");
  if (s0.daily?.[day]?.[house]) return fail("planche_daily_tried");
  const s = structuredClone(s0);
  // Today and the day before only.
  const kept: Record<number, Record<string, PlancheDailyTry>> = {};
  for (const [d, tries] of Object.entries(s.daily ?? {}))
    if (Number(d) >= day - 1) kept[Number(d)] = tries;
  kept[day] = { ...(kept[day] ?? {}), [house]: { won, moves } };
  s.daily = kept;
  const m = s.houses[house]?.maison;
  if (won && m) {
    m.week += S.daily.prestige;
    m.knots = (m.knots ?? 0) + 1;
  }
  return s;
}

/** How a day went for the lagoon: how many tried, how many solved, the fewest pieces it took. */
export function plancheDailyResults(
  s: PlancheState,
  day: number,
): { tried: number; solved: number; best: number | null } {
  const tries = Object.values(s.daily?.[day] ?? {});
  const won = tries.filter((t) => t.won);
  return {
    tried: tries.length,
    solved: won.length,
    best: won.length ? Math.min(...won.map((t) => t.moves)) : null,
  };
}

/** The day's problem solved, its try written as lost when it began (docs/plan-duels.md B1). */
export function plancheDailyWin(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  now: number,
  moves: number,
): PlancheState {
  const day = Math.floor(now / DAY);
  const t = s0.daily?.[day]?.[house];
  if (!S.daily || !t) return fail("planche_unknown");
  if (t.won) return s0;
  const s = structuredClone(s0);
  (s.daily as Record<number, Record<string, PlancheDailyTry>>)[day] = {
    ...s.daily?.[day],
    [house]: { won: true, moves },
  };
  const m = s.houses[house]?.maison;
  if (m) {
    m.week += S.daily.prestige;
    m.knots = (m.knots ?? 0) + 1;
  }
  return s;
}
