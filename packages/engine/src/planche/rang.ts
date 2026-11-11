/**
 * The rank, the three laurels and the rival of the week (docs/CADRAGE-v4.md § 10;
 * docs/plan-classement.md).
 *
 * The rank starts again from nothing at each tide: only it ranks, and a newcomer can be first. Three
 * laurels, the Négoce (what threads earn by the hour of bobbin), the Passe (a cote, between people
 * only) and the Garde (the hours a tower is held, by its peril); the Doge has the smallest sum of
 * the three places. Each person has a rival each week, the house just above, a person first, never
 * the same twice in a row; on Sunday the one who sold more in the towns both serve hangs the other's
 * flag. What the rank gives is a mark, never a bobbin, a piece or a yield.
 *
 * Pure and deterministic, called by the board's slices (`planche.ts`).
 */

import { battleRatings } from "../skirmish.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The rank's rules, as `worlds.settings` would give them. */
export interface PlancheRankRules {
  /** Weeks in a tide, and the length of a week. */
  tideWeeks: number;
  weekMs: number;
  /** The hours of bobbin a house must have stretched to stand in the Négoce. */
  negoceMinMs: number;
  /** The cote of the Passe at the start of a tide, and its step. */
  coteStart: number;
  coteK: number;
  /** What an assault repelled is worth in the Garde, in hours held. */
  repelledHours: number;
}

/** A house's counters for the tide. */
export interface PlancheHouseRank {
  /** What its threads earned, and for how long its bobbins were out (ms × bobbins). */
  earned: bigint;
  threadMs: number;
  /** Its towers held (ms × peril), and the assaults it repelled. */
  guardMs: number;
  repelled: number;
  cote: number;
  /** What it earned this week, town by town. */
  week: Record<string, bigint>;
}

export type PlancheLaurelId = "negoce" | "passe" | "garde";

export interface PlancheRank {
  tide: number;
  tideStart: number;
  /** The week of the tide, from 0. */
  week: number;
  /** The houses a person plays (set by the board, or claimed): only they have a rival and a cote. */
  humans: string[];
  rivals: Record<string, string>;
  lastRivals: Record<string, string>;
  /** The flags each house hangs this week, taken from rivals it beat. */
  flags: Record<string, string[]>;
  /** Duels of the Passe this week, by pair. */
  duels: Record<string, number>;
  /** Each house's place when the day began, and that day. */
  mark: Record<string, number>;
  markDay: number;
  /** The last tide's laurels and Doge. */
  laurels: {
    tide: number;
    negoce: string | null;
    passe: string | null;
    garde: string | null;
    doge: string;
  } | null;
}

export interface PlancheLaurelRow {
  house: string;
  score: bigint;
  /** Out of the laurel (the Négoce, without a day of thread): last. */
  ranked: boolean;
  place: number;
}

export interface PlancheStandingRow {
  house: string;
  places: Record<PlancheLaurelId, number>;
  sum: number;
  place: number;
}

const fail = (code: string): never => {
  throw new Error(code);
};
const has = <T>(o: Record<string, T>, k: string) => Object.hasOwn(o, k);
const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const plancheRankHouse = (S: PlancheSetup): PlancheHouseRank => ({
  earned: 0n,
  threadMs: 0,
  guardMs: 0,
  repelled: 0,
  cote: S.rank?.coteStart ?? 0,
  week: {},
});

/** One laurel, best first; equals share a place. */
export function plancheLaurel(
  S: PlancheSetup,
  s: PlancheState,
  which: PlancheLaurelId,
): PlancheLaurelRow[] {
  const R = S.rank;
  const rows = S.houses.map(({ id }) => {
    const r = s.houses[id]?.rank ?? plancheRankHouse(S);
    if (which === "negoce") {
      const ranked = r.threadMs > 0 && r.threadMs >= (R?.negoceMinMs ?? 0);
      return {
        house: id,
        ranked,
        score: ranked ? (r.earned * BigInt(HOUR)) / BigInt(r.threadMs) : 0n,
      };
    }
    if (which === "passe") return { house: id, ranked: true, score: BigInt(r.cote) };
    const held = r.guardMs + r.repelled * (R?.repelledHours ?? 0) * HOUR;
    return { house: id, ranked: true, score: BigInt(Math.floor(held / HOUR)) };
  });
  const better = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.ranked !== b.ranked ? a.ranked : a.score > b.score;
  return rows
    .map((r) => ({
      ...r,
      place: r.ranked ? 1 + rows.filter((o) => better(o, r)).length : rows.length,
    }))
    .sort((a, b) => a.place - b.place || a.house.localeCompare(b.house));
}

/** The Doge's standing: the smallest sum of the three places first, the Négoce then the Passe. */
export function plancheStanding(S: PlancheSetup, s: PlancheState): PlancheStandingRow[] {
  const at = (which: PlancheLaurelId) =>
    new Map(plancheLaurel(S, s, which).map((r) => [r.house, r.place]));
  const negoce = at("negoce");
  const passe = at("passe");
  const garde = at("garde");
  const rows = S.houses.map(({ id }) => {
    const places = {
      negoce: negoce.get(id) ?? 0,
      passe: passe.get(id) ?? 0,
      garde: garde.get(id) ?? 0,
    };
    return { house: id, places, sum: places.negoce + places.passe + places.garde };
  });
  const cmp = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.sum - b.sum || a.places.negoce - b.places.negoce || a.places.passe - b.places.passe;
  return rows
    .map((r) => ({ ...r, place: 1 + rows.filter((o) => cmp(o, r) < 0).length }))
    .sort((a, b) => a.place - b.place || a.house.localeCompare(b.house));
}

/** Places won since the day began (negative when lost). */
export function plancheTrend(S: PlancheSetup, s: PlancheState, house: string): number {
  const now = plancheStanding(S, s).find((r) => r.house === house)?.place;
  const then = s.rank.mark[house];
  return now === undefined || then === undefined ? 0 : then - now;
}

/** A person's rival in this order: the nearest above, a person first, never last week's. */
function rivalOf(s: PlancheState, order: string[], h: string): string | undefined {
  const i = order.indexOf(h);
  if (i < 0) return undefined;
  const above = order.slice(0, i).reverse();
  const below = order.slice(i + 1);
  const last = s.rank.lastRivals[h];
  const fresh = (l: string[]) => l.filter((o) => o !== last);
  const person = (l: string[]) => l.find((o) => s.rank.humans.includes(o));
  return (
    person(fresh(above)) ??
    fresh(above)[0] ??
    person(fresh(below)) ??
    fresh(below)[0] ??
    above[0] ??
    below[0]
  );
}

/** Each person's rival for the week. */
function designate(S: PlancheSetup, s: PlancheState): void {
  const order = plancheStanding(S, s).map((r) => r.house);
  const rivals: Record<string, string> = {};
  for (const h of s.rank.humans) {
    const pick = rivalOf(s, order, h);
    if (pick) rivals[h] = pick;
  }
  s.rank.rivals = rivals;
}

/**
 * The week between two houses: the towns both have sold in, and what each sold there (in all, when
 * they share none). What Sunday settles, and what the screen tells.
 */
export function plancheWeekDuel(
  s: PlancheState,
  a: string,
  b: string,
): { shared: string[]; a: bigint; b: bigint } {
  const wa = s.houses[a]?.rank.week ?? {};
  const wb = s.houses[b]?.rank.week ?? {};
  const shared = Object.keys(wa).filter((c) => (wa[c] ?? 0n) > 0n && (wb[c] ?? 0n) > 0n);
  const sum = (w: Record<string, bigint>) =>
    (shared.length ? shared : Object.keys(w)).reduce((n, c) => n + (w[c] ?? 0n), 0n);
  return { shared, a: sum(wa), b: sum(wb) };
}

/** Sunday: who sold more in the towns both serve (else in all) hangs the other's flag. */
function settle(s: PlancheState): void {
  const flags: Record<string, string[]> = {};
  const done = new Set<string>();
  for (const [h, r] of Object.entries(s.rank.rivals)) {
    if (!s.houses[h] || !s.houses[r] || done.has(pair(h, r))) continue;
    done.add(pair(h, r));
    const d = plancheWeekDuel(s, h, r);
    if (d.a === d.b) continue;
    const [win, lose] = d.a > d.b ? [h, r] : [r, h];
    flags[win] = [...(flags[win] ?? []), lose];
  }
  s.rank.flags = flags;
}

/** The laurels and the Doge of the tide that ends. */
function proclaim(S: PlancheSetup, s: PlancheState): NonNullable<PlancheRank["laurels"]> {
  const first = (which: PlancheLaurelId, floor: bigint) => {
    const top = plancheLaurel(S, s, which)[0];
    return top?.ranked && top.score > floor ? top.house : null;
  };
  return {
    tide: s.rank.tide,
    negoce: first("negoce", 0n),
    passe: first("passe", BigInt(S.rank?.coteStart ?? 0)),
    garde: first("garde", 0n),
    doge: plancheStanding(S, s)[0]?.house ?? "",
  };
}

const markNow = (S: PlancheSetup, s: PlancheState) => {
  s.rank.mark = Object.fromEntries(plancheStanding(S, s).map((r) => [r.house, r.place]));
  s.rank.markDay = Math.floor(s.now / DAY);
};

/** The rank at the board's start: everyone level, a rival for each person. */
export function plancheRankInit(S: PlancheSetup, s: PlancheState, tideStart = s.now): void {
  s.rank = {
    tide: 0,
    tideStart,
    week: 0,
    humans: S.houses.filter((h) => !h.robot).map((h) => h.id),
    rivals: {},
    lastRivals: {},
    flags: {},
    duels: {},
    mark: {},
    markDay: 0,
    laurels: null,
  };
  designate(S, s);
  markNow(S, s);
}

/** After a slice: the weeks and the tides that ended, then the day's mark. */
export function plancheRankTurn(S: PlancheSetup, s: PlancheState): void {
  const R = S.rank;
  if (!R) return;
  while (s.now >= s.rank.tideStart + (s.rank.week + 1) * R.weekMs) {
    settle(s);
    s.rank.lastRivals = { ...s.rank.rivals };
    s.rank.duels = {};
    designate(S, s);
    for (const h of Object.values(s.houses)) h.rank.week = {};
    s.rank.week += 1;
    if (s.rank.week >= R.tideWeeks) {
      s.rank.laurels = proclaim(S, s);
      for (const h of Object.values(s.houses)) h.rank = plancheRankHouse(S);
      s.rank.tide += 1;
      s.rank.tideStart += R.tideWeeks * R.weekMs;
      s.rank.week = 0;
    }
    markNow(S, s);
  }
  if (Math.floor(s.now / DAY) !== s.rank.markDay) markNow(S, s);
}

/** A house a person takes counts as a person's from then on, and has its rival at once. */
export function plancheClaim(S: PlancheSetup, s0: PlancheState, house: string): PlancheState {
  if (!has(s0.houses, house) || !S.houses.some((h) => h.id === house))
    return fail("planche_unknown");
  if (s0.rank.humans.includes(house)) return s0;
  const s = structuredClone(s0);
  s.rank.humans.push(house);
  // A rival at once, not on Monday: the first is seen in the first minutes.
  const pick = rivalOf(
    s,
    plancheStanding(S, s).map((r) => r.house),
    house,
  );
  if (pick) s.rank.rivals[house] = pick;
  return s;
}

/** A Passe won between two people: the cote moves, half as much each time the pair meets again. */
export function plancheDuel(
  S: PlancheSetup,
  s0: PlancheState,
  winner: string,
  loser: string,
): PlancheState {
  const w0 = has(s0.houses, winner) ? s0.houses[winner] : undefined;
  const l0 = has(s0.houses, loser) ? s0.houses[loser] : undefined;
  if (!w0 || !l0 || winner === loser) return fail("planche_unknown");
  if (!s0.rank.humans.includes(winner) || !s0.rank.humans.includes(loser))
    return fail("planche_not_person");
  const s = structuredClone(s0);
  const key = pair(winner, loser);
  const met = s.rank.duels[key] ?? 0;
  s.rank.duels[key] = met + 1;
  const start = S.rank?.coteStart ?? 0;
  const k = Math.floor((S.rank?.coteK ?? 0) / 2 ** met);
  if (k <= 0) return s;
  const w = s.houses[winner] as NonNullable<typeof w0>;
  const l = s.houses[loser] as NonNullable<typeof l0>;
  const after = battleRatings(
    [
      { id: winner, rating: w.rank.cote },
      { id: loser, rating: l.rank.cote },
    ],
    { start, k, band: 1, botRating: start },
  );
  w.rank.cote = after[winner] ?? w.rank.cote;
  l.rank.cote = after[loser] ?? l.rank.cote;
  return s;
}

/** The house holding a passage repelled an assault: it counts in its Garde. */
export function plancheRepelled(S: PlancheSetup, s0: PlancheState, passage: string): PlancheState {
  const p = has(s0.passages, passage) ? s0.passages[passage] : undefined;
  if (!p || !S.passages.some((d) => d.id === passage)) return fail("planche_unknown");
  if (!has(s0.houses, p.holder)) return s0;
  const s = structuredClone(s0);
  (s.houses[p.holder] as PlancheState["houses"][string]).rank.repelled += 1;
  return s;
}
