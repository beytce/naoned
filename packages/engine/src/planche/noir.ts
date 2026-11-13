/**
 * The black straits (docs/plan-muda.md § 3.1 and 3.2, lot N1): three straits at the edge of the
 * open sea that no one ever holds, each guarded by a power's captain (the Turk, Genoa, Milan) with
 * his style, on the largest board. A house of the level that opens them risks a cargo of its
 * choosing: forced, the cargo sells at the far port, dearer than anywhere, and a relic of the power
 * falls; lost, the cargo sinks (rule 2: the loss its player chose). Each strait forced in a week
 * hardens its guard, by phases, back to the first on Monday; its opening changes every day.
 * Three relics of a power make a plan; the high works ask a plan besides their goods (rule 5).
 *
 * Pure. The board of the Passe is the theme's: it is given, the engine of the board not knowing it.
 */

import { PASSE_CHAIN, PASSE_EMPTY } from "../passe/board.js";
import type { PasseStyle } from "../passe/mind.js";
import { MAISON_KEEP } from "./maison.js";
import type { PlancheHouse, PlancheSetup, PlancheState } from "./planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const BPS = 10_000;

export interface NoirStrait {
  id: string;
  name: string;
  /** The power that keeps it, whose relics it gives. */
  power: string;
  captain: string;
  style: PasseStyle;
  /** Where it is drawn, at the edge of the open sea. */
  x: number;
  y: number;
  /** Its board of the Passe. */
  board: string;
  /** The far port its cargo sells at. */
  port: string;
}

/** The black straits' rules, as `worlds.settings` would give them. */
export interface NoirRules {
  /** The house's level that opens them. */
  minLevel: number;
  straits: NoirStrait[];
  /** Pieces the captains look ahead. */
  depth: number;
  /** Links laid in advance at each phase (straits forced this week); the last stays. */
  phases: number[];
  /** Tries a house has a day, all straits told. */
  triesPerDay: number;
  /** Units of cargo at most, from each level of the house. */
  cargo: { level: number; n: number }[];
  /** What the far port pays, in points of the best price a town of the board pays for the good. */
  priceBps: number;
  /** Relics of one power that make a plan. */
  relicsPerPlan: number;
  /** The high works that ask a plan: the Arsenal from this level, these ships, workshops of this tier. */
  plans: { arsenalLevel?: number; ships?: string[]; tier?: number };
}

/** A strait forced this week, for the Gazette. */
export interface NoirFeat {
  house: string;
  strait: string;
  at: number;
}

/** The black straits on the board: this week's, and every week's. */
export interface NoirState {
  /** The Monday (UTC) of the week counted. */
  monday: number;
  forced: Record<string, number>;
  feats: NoirFeat[];
  /** Straits forced since the board began: the ink they push back (step 9). */
  total: Record<string, number>;
  /** Today's tries, by house. */
  day: number;
  tries: Record<string, number>;
}

const fail = (code: string): never => {
  throw new Error(code);
};
const own = <T>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined;

/** A number drawn from words, the same everywhere (FNV-1a). */
function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** The Monday (UTC, midnight) of the week of `t`. */
export function plancheMonday(t: number): number {
  // The epoch was a Thursday.
  return Math.floor((t + 3 * DAY) / WEEK) * WEEK - 3 * DAY;
}

const straitOf = (S: PlancheSetup, id: string) => S.noir?.straits.find((x) => x.id === id);

/** Times a strait was forced this week (none if the board's count is an older week's). */
export function plancheNoirForced(s: PlancheState, strait: string, now: number): number {
  if (!s.noir || s.noir.monday !== plancheMonday(now)) return 0;
  return own(s.noir.forced, strait) ?? 0;
}

/** A strait's phase this week, from 0: the links its captain lays in advance. */
export function plancheNoirPhase(S: PlancheSetup, s: PlancheState, strait: string, now: number) {
  const phases = S.noir?.phases ?? [0];
  const phase = Math.min(phases.length - 1, plancheNoirForced(s, strait, now));
  return { phase, links: phases[phase] ?? 0 };
}

/**
 * The board a strait's duel begins on today: its captain's links laid on empty cells, drawn from
 * the day, the strait and the phase, the same on every server; another opening each day.
 */
export function plancheNoirBoard(
  S: PlancheSetup,
  s: PlancheState,
  strait: string,
  now: number,
  board: readonly number[],
): number[] {
  const { phase, links } = plancheNoirPhase(S, s, strait, now);
  const cells = [...board];
  const empty = cells.flatMap((c, i) => (c === PASSE_EMPTY ? [i] : []));
  const day = Math.floor(now / DAY);
  for (let k = 0; k < links && empty.length; k++) {
    const [at] = empty.splice(hash(day, strait, phase, k) % empty.length, 1);
    if (at !== undefined) cells[at] = PASSE_CHAIN;
  }
  return cells;
}

/** How a strait's captain plays the chain. */
export function plancheNoirMind(S: PlancheSetup, strait: string) {
  const x = straitOf(S, strait);
  return { depth: S.noir?.depth ?? 3, ...(x ? { style: x.style } : {}) };
}

/** Units of cargo a house may risk, by its level. */
export function plancheNoirCargoCap(S: PlancheSetup, h: PlancheHouse): number {
  const rows = [...(S.noir?.cargo ?? [])].sort((a, b) => a.level - b.level);
  return rows.reduce((n, r) => (r.level <= (h.level ?? 1) ? r.n : n), 0);
}

/** What the far port pays a unit of a good: the board's best price for it, multiplied. */
export function plancheNoirPrice(S: PlancheSetup, good: string): number {
  const best = Math.max(0, ...S.cities.map((c) => own(c.wants, good)?.price ?? 0));
  return Math.floor((best * (S.noir?.priceBps ?? 0)) / BPS);
}

/** Tries a house has had today. */
export function plancheNoirTries(s: PlancheState, house: string, now: number): number {
  if (!s.noir || s.noir.day !== Math.floor(now / DAY)) return 0;
  return own(s.noir.tries, house) ?? 0;
}

/** Why a house may not try a strait with this cargo now, or nothing if it may. */
export function plancheNoirRefusal(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  strait: string,
  cargo: { good: string; n: number },
  now: number,
): string | undefined {
  const h = own(s.houses, house);
  if (!S.noir || !h || !straitOf(S, strait)) return "planche_unknown";
  if ((h.level ?? 1) < S.noir.minLevel) return "planche_level";
  if (plancheNoirTries(s, house, now) >= S.noir.triesPerDay) return "planche_noir_tried";
  const n = Math.floor(cargo.n);
  if (
    !(n >= 1) ||
    n > plancheNoirCargoCap(S, h) ||
    (h.stock[cargo.good] ?? 0) < n ||
    plancheNoirPrice(S, cargo.good) <= 0
  )
    return "planche_noir_cargo";
  return undefined;
}

/**
 * A house has played a black strait with a cargo: either way the cargo leaves its warehouse and a
 * try is spent; won, the far port pays it (written as a sale), a relic of the power falls, and the
 * strait's guard hardens for the week; lost, the cargo has sunk.
 */
export function plancheNoirTry(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  strait: string,
  cargo: { good: string; n: number },
  won: boolean,
  now: number,
): PlancheState {
  const why = plancheNoirRefusal(S, s0, house, strait, cargo, now);
  if (why) return fail(why);
  const x = straitOf(S, strait) as NoirStrait;
  const s = structuredClone(s0);
  const monday = plancheMonday(now);
  const day = Math.floor(now / DAY);
  const st: NoirState = s.noir ?? { monday, forced: {}, feats: [], total: {}, day, tries: {} };
  if (st.monday !== monday) {
    st.monday = monday;
    st.forced = {};
    st.feats = [];
  }
  if (st.day !== day) {
    st.day = day;
    st.tries = {};
  }
  st.tries[house] = (own(st.tries, house) ?? 0) + 1;
  s.noir = st;
  const h = s.houses[house] as PlancheHouse;
  const n = Math.floor(cargo.n);
  h.stock[cargo.good] = (h.stock[cargo.good] ?? 0) - n;
  if (!won) return s;
  const paid = BigInt(plancheNoirPrice(S, cargo.good)) * BigInt(n);
  h.delivered += n;
  h.ducats += paid;
  h.earned += paid;
  h.book.sold += paid;
  h.rank.earned += paid;
  s.minted += paid;
  h.relics = { ...(h.relics ?? {}), [x.power]: (own(h.relics, x.power) ?? 0) + 1 };
  st.forced[strait] = (own(st.forced, strait) ?? 0) + 1;
  st.total[strait] = (own(st.total, strait) ?? 0) + 1;
  st.feats.push({ house, strait, at: now });
  if (h.maison) {
    h.maison.noir = (h.maison.noir ?? 0) + 1;
    h.maison.log.push({ at: now, kind: "relic", data: x.power });
    if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
  }
  return s;
}

/** Three relics of a power make a plan, in the house's Livre. */
export function plancheAssemble(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  power: string,
  now: number,
): PlancheState {
  const h0 = own(s0.houses, house);
  if (!S.noir || !h0) return fail("planche_unknown");
  const per = S.noir.relicsPerPlan;
  if ((own(h0.relics, power) ?? 0) < per) return fail("planche_few_relics");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  h.relics = { ...(h.relics ?? {}), [power]: (own(h.relics, power) ?? 0) - per };
  h.plans = (h.plans ?? 0) + 1;
  if (h.maison) {
    h.maison.log.push({ at: now, kind: "plan", data: power });
    if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
  }
  return s;
}

/** Whether a high work asks a plan: the Arsenal raised to `level`, a ship, a workshop of a tier. */
export function plancheNeedsPlan(
  S: PlancheSetup,
  work: { arsenalTo?: number; ship?: string; tier?: number },
): boolean {
  const P = S.noir?.plans;
  if (!P) return false;
  if (work.arsenalTo !== undefined && P.arsenalLevel !== undefined)
    return work.arsenalTo >= P.arsenalLevel;
  if (work.ship !== undefined) return !!P.ships?.includes(work.ship);
  if (work.tier !== undefined && P.tier !== undefined) return work.tier >= P.tier;
  return false;
}

/** A plan is spent from a house (in a state already cloned); refused when it has none. */
export function plancheSpendPlan(h: PlancheHouse): void {
  if ((h.plans ?? 0) < 1) fail("planche_no_plan");
  h.plans = (h.plans ?? 0) - 1;
}
