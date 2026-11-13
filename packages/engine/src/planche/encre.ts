/**
 * The ink tide (docs/plan-maree.md § 3.1, lot T1; CADRAGE-v4 § 11). The ink of the open sea rises
 * a row each Monday toward the lagoon; what the lagoon did in the week pushes it back: the towers
 * its players hold, the black straits they forced, the beacons of their companies. A tower the ink
 * reaches goes back to its corsair on Monday (told from Saturday); on the ink, towns pay more and a
 * thread loses a share of what it carries. At the tide's end the ink ebbs to where it began.
 *
 * Pure: the line is kept on the board, in hundredths of a row (the ink covers the rows at or past it).
 */

import { MAISON_KEEP } from "./maison.js";
import { plancheDecretInkLess } from "./maree.js";
import { plancheMonday } from "./noir.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const BPS = 10_000;
const ROW = 100;

/** The ink's rules, as `worlds.settings` would give them. */
export interface EncreRules {
  /** The row where the ink begins each tide (all rows from it to the far edge are ink). */
  start: number;
  /** The row it never passes, toward the lagoon. */
  limit: number;
  /** Rows it rises each Monday, in hundredths. */
  rise: number;
  /** What pushes it back, in hundredths of a row: each tower a person holds at the week's end,
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

/** The line of the ink now, in hundredths of a row (the start's when the board has none yet). */
export function plancheEncreLine(S: PlancheSetup, s: PlancheState): number {
  return s.encre?.line ?? (S.encre?.start ?? Number.POSITIVE_INFINITY) * ROW;
}

/** Whether a row is in the ink. */
export const plancheInInk = (S: PlancheSetup, s: PlancheState, y: number) =>
  !!S.encre && y * ROW >= plancheEncreLine(S, s);

/**
 * How dark a row is, from 0 (the lagoon's white) to 1 (the ink): darkening over the three rows
 * before the line; for the board's drawing and the Garde's peril.
 */
export function plancheEncrePeril(S: PlancheSetup, s: PlancheState, y: number): number {
  if (!S.encre) return 0;
  const d = (plancheEncreLine(S, s) - y * ROW) / ROW;
  if (d <= 0) return 1;
  return Math.max(0, 1 - d / 3);
}

/** What the week has done to push the ink back, in hundredths of a row. */
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
    .filter((p) => p.y * ROW >= next && !own(s.passages, p.id)?.holder.startsWith("corsair:"))
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
    if (!st || st.holder.startsWith("corsair:") || p.y * ROW < line) continue;
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
export const plancheEncrePriceBps = (S: PlancheSetup, s: PlancheState, y: number) =>
  S.encre && plancheInInk(S, s, y) ? BPS + S.encre.priceBps : BPS;

/** What a thread to a town keeps of its load, in points (10 000 off the ink). */
export const plancheEncreKeepBps = (S: PlancheSetup, s: PlancheState, y: number) =>
  S.encre && plancheInInk(S, s, y) ? BPS - S.encre.lossBps : BPS;
