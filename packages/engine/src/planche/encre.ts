/**
 * The ink tide (docs/plan-maree.md § 3.1, lot T1; CADRAGE-v4 § 11). The ink of the open sea closes
 * in a tile each Monday, from the board's edges toward its middle (docs/plan-lagune-ronde.md L2:
 * a crown round the lagoon); what the lagoon did in the week pushes it back: the towers
 * its players hold, the black straits they forced, the beacons of their companies. A tower the ink
 * reaches goes back to its corsair on Monday (told from Saturday); on the ink, towns pay more and a
 * thread loses a share of what it carries. At the tide's end the ink ebbs to where it began.
 *
 * Pure: the line is kept on the board, in hundredths of a tile from the board's middle (the ink
 * covers the tiles at or past it).
 */

import { MAISON_KEEP } from "./maison.js";
import { plancheDecretInkLess } from "./maree.js";
import { plancheMonday } from "./noir.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const BPS = 10_000;
const ROW = 100;

/** A tile of the board. */
type At = { x: number; y: number };

/**
 * How far a tile is from the board's middle, in hundredths of a tile: a whole number, the same on
 * every machine (the square root of a whole number, floored).
 */
export function plancheDepth(S: Pick<PlancheSetup, "width" | "height">, x: number, y: number) {
  const dx = 2 * x - (S.width - 1);
  const dy = 2 * y - (S.height - 1);
  return Math.floor(Math.sqrt((dx * dx + dy * dy) * 2_500));
}

/** The ink's rules, as `worlds.settings` would give them. */
export interface EncreRules {
  /** How far from the middle the ink begins each tide, in tiles (all tiles from there out are ink). */
  start: number;
  /** How near the middle it never comes, in tiles. */
  limit: number;
  /** What it closes in each Monday, in hundredths of a tile. */
  rise: number;
  /** What pushes it back, in hundredths of a tile: each tower a person holds at the week's end,
   * each black strait forced in the week, each level of the highest beacon of the lagoon. */
  push: { tower: number; noir: number; beacon: number };
  /** On the ink, what towns pay more, and what a thread to them loses of its load. */
  priceBps: number;
  lossBps: number;
}

/** The ink of a board: its line, and the last week it moved (weeks since the board's tide began). */
export interface EncreState {
  line: number;
  /** The rise and the push of the last week, for the screen and the Gazette. */
  last?: { rise: number; push: number; retaken: string[] };
}

const own = <T>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined;

/** The line of the ink now, in hundredths of a tile (the start's when the board has none yet). */
export function plancheEncreLine(S: PlancheSetup, s: PlancheState): number {
  return s.encre?.line ?? (S.encre?.start ?? Number.POSITIVE_INFINITY) * ROW;
}

/** Whether a tile is in the ink. */
export const plancheInInk = (S: PlancheSetup, s: PlancheState, at: At) =>
  !!S.encre && plancheDepth(S, at.x, at.y) >= plancheEncreLine(S, s);

/**
 * How dark a tile is, from 0 (the lagoon's white) to 1 (the ink): darkening over the three tiles
 * before the line; for the board's drawing and the Garde's peril.
 */
export function plancheEncrePeril(S: PlancheSetup, s: PlancheState, at: At): number {
  if (!S.encre) return 0;
  const d = (plancheEncreLine(S, s) - plancheDepth(S, at.x, at.y)) / ROW;
  if (d <= 0) return 1;
  return Math.max(0, 1 - d / 3);
}

/** What the week has done to push the ink back, in hundredths of a tile. */
export function plancheEncrePush(S: PlancheSetup, s: PlancheState, now: number): number {
  const E = S.encre;
  if (!E) return 0;
  const held = S.passages.filter((p) =>
    s.rank.humans.includes(own(s.passages, p.id)?.holder ?? ""),
  ).length;
  // The black straits forced in the week that ends (the Monday before `now`'s).
  const week = plancheMonday(now - 1);
  const forced = s.noir?.monday === week ? s.noir.feats.length : 0;
  const beacon = Math.max(0, ...Object.values(s.houses).map((h) => h.beacon ?? 0));
  return held * E.push.tower + forced * E.push.noir + beacon * E.push.beacon;
}

/** The towers the ink will reach on Monday if nothing pushes it back: told from Saturday. */
export function plancheEncreThreat(S: PlancheSetup, s: PlancheState): string[] {
  const E = S.encre;
  if (!E) return [];
  const next = Math.max(E.limit * ROW, plancheEncreLine(S, s) - E.rise);
  return S.passages
    .filter(
      (p) =>
        plancheDepth(S, p.x, p.y) >= next && !own(s.passages, p.id)?.holder.startsWith("corsair:"),
    )
    .map((p) => p.id);
}

/**
 * The ink's Monday (called by the board at each week's turn, `now` the new week's start): it rises,
 * less the week's push, never back behind its start nor past its limit; the towers it covers go
 * back to their corsairs, their seals whole.
 */
export function plancheEncreWeek(S: PlancheSetup, s: PlancheState, now: number): void {
  const E = S.encre;
  if (!E) return;
  const push = plancheEncrePush(S, s, now);
  const before = plancheEncreLine(S, s);
  // The Doge's decree may hold it (docs/plan-maree.md T3).
  const rise = Math.max(0, E.rise - plancheDecretInkLess(s, now));
  const line = Math.min(E.start * ROW, Math.max(E.limit * ROW, before - rise + push));
  const retaken: string[] = [];
  for (const p of S.passages) {
    const st = own(s.passages, p.id);
    if (!st || st.holder.startsWith("corsair:") || plancheDepth(S, p.x, p.y) < line) continue;
    const holder = own(s.houses, st.holder);
    s.passages[p.id] = { holder: p.holder, tollBps: p.tollBps, seals: p.seals };
    retaken.push(p.id);
    if (holder?.maison) {
      holder.maison.log.push({ at: now, kind: "ink", data: p.id });
      if (holder.maison.log.length > MAISON_KEEP) holder.maison.log.shift();
    }
  }
  s.encre = { line, last: { rise, push, retaken } };
}

/** The ink ebbs at the tide's end: back to where it began. */
export function plancheEncreEbb(S: PlancheSetup, s: PlancheState): void {
  if (!S.encre) return;
  s.encre = { line: S.encre.start * ROW };
}

/** What a town pays on the ink, in points of its price (10 000 off the ink). */
export const plancheEncrePriceBps = (S: PlancheSetup, s: PlancheState, at: At) =>
  S.encre && plancheInInk(S, s, at) ? BPS + S.encre.priceBps : BPS;

/** What a thread to a town keeps of its load, in points (10 000 off the ink). */
export const plancheEncreKeepBps = (S: PlancheSetup, s: PlancheState, at: At) =>
  S.encre && plancheInInk(S, s, at) ? BPS - S.encre.lossBps : BPS;
