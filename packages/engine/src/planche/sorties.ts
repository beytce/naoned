/**
 * The captains' sorties (docs/plan-maree.md § 3.2, lot T2; CADRAGE-v4 § 8). Each Monday, each
 * corsair captain of the lagoon (whether he still holds his tower or not: a tower taken does not
 * end a captain) draws a sortie against the nearest tower a person holds:
 * a day of the week (Tuesday to Saturday) and an hour, told 24 hours before. At its hour, the
 * captain plays the thread against the tower's guard (its lieutenant, and the links its holder laid
 * in advance), unless the holder went before him and played the chain himself. Lost, the tower
 * loses a seal, and with its last it goes back to the corsair; held, it is an assault repelled.
 *
 * Pure. The duel's board is the theme's: it is given, the engine of the board not knowing it.
 */

import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  type PasseMove,
  type PasseSetup,
  passeInit,
  passePlay,
} from "../passe/board.js";
import { type PasseStyle, passeThink } from "../passe/mind.js";
import { MAISON_KEEP } from "./maison.js";
import { plancheMonday } from "./noir.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The sorties' rules, as `worlds.settings` would give them. */
export interface SortiesRules {
  /** The hour (UTC) the sorties come out. */
  hour: number;
  /** How long before they are told. */
  announceMs: number;
  /** Pieces the captains look ahead, and the lieutenant who guards a tower. */
  depth: number;
  guardDepth: number;
}

export interface PlancheSortie {
  id: string;
  captain: string;
  /** The captain's tower, and the tower it sallies against. */
  from: string;
  target: string;
  at: number;
  style: PasseStyle;
}

export interface PlancheSortiesState {
  monday: number;
  list: PlancheSortie[];
  /** How each went: the captain won (a seal lost) or not, and who held the chain. */
  done: Record<string, { won: boolean; by: "garde" | "tenant"; at: number }>;
}

const STYLES: PasseStyle[] = ["mur", "rives", "meute"];

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

/** A captain's own manner, the same in its sorties and at its tower (docs/plan-duels.md B3). */
export const plancheCaptainStyle = (holder: string): PasseStyle =>
  STYLES[hash(holder.replace(/^corsair:/, ""), "manner") % STYLES.length] ?? "mur";

/**
 * The week's sorties, drawn on Monday (called by the board at each week's turn): each captain of the
 * lagoon against the nearest tower a person holds, on a day from Tuesday to Saturday.
 */
export function plancheSortiesWeek(S: PlancheSetup, s: PlancheState, monday: number): void {
  const R = S.sorties;
  if (!R) return;
  const held = S.passages.filter((p) =>
    s.rank.humans.includes(own(s.passages, p.id)?.holder ?? ""),
  );
  const list: PlancheSortie[] = [];
  const seen = new Set<string>();
  const sought = new Map<string, number>();
  // Every captain of the lagoon sallies, whether he still holds his tower or not: from his own.
  for (const p of S.passages) {
    const holder = p.holder;
    if (!holder.startsWith("corsair:") || seen.has(holder) || !held.length) continue;
    seen.add(holder);
    // The nearest tower held by a person that is the least sought this week; two at most against
    // one tower (docs/plan-duels.md B2).
    const target = [...held]
      .filter((t) => (sought.get(t.id) ?? 0) < 2)
      .sort(
        (a, b) =>
          (sought.get(a.id) ?? 0) - (sought.get(b.id) ?? 0) ||
          Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)) ||
          (a.id < b.id ? -1 : 1),
      )[0];
    if (!target) continue;
    sought.set(target.id, (sought.get(target.id) ?? 0) + 1);
    const captain = holder.slice(8);
    const day = 1 + (hash(monday, captain, "day") % 5);
    list.push({
      id: `${monday}:${p.id}`,
      captain,
      from: p.id,
      target: target.id,
      at: monday + day * DAY + R.hour * HOUR,
      style: plancheCaptainStyle(captain),
    });
  }
  s.sorties = { monday, list, done: {} };
}

/** The sorties of the week still to come, the soonest first. */
export function plancheSortiesAhead(s: PlancheState, now: number): PlancheSortie[] {
  const st = s.sorties;
  if (!st || st.monday !== plancheMonday(now)) return [];
  return st.list.filter((x) => !st.done[x.id] && x.at > now).sort((a, b) => a.at - b.at);
}

/** The sorties whose hour has come and that are not yet played. */
export function plancheSortiesDue(s: PlancheState, now: number): PlancheSortie[] {
  const st = s.sorties;
  if (!st) return [];
  return st.list.filter((x) => !st.done[x.id] && x.at <= now);
}

/** Whether a sortie is told: within its announcement, before its hour. */
export const plancheSortieTold = (S: PlancheSetup, x: PlancheSortie, now: number) =>
  now < x.at && now >= x.at - (S.sorties?.announceMs ?? DAY);

/** The board of a sortie's duel: the tower's own, with the links its holder laid in advance. */
export function plancheSortieBoard(
  s: PlancheState,
  x: PlancheSortie,
  board: Pick<PasseSetup, "width" | "height" | "cells">,
): number[] {
  const cells = [...board.cells];
  for (const i of own(s.passages, x.target)?.guard ?? [])
    if (cells[i] === PASSE_EMPTY) cells[i] = PASSE_CHAIN;
  return cells;
}

/**
 * A sortie played without the holder: the captain lays the thread, the lieutenant the chain, both
 * as their minds say, to the end. True: the captain passed.
 */
export function plancheSortieDuel(S: PlancheSetup, x: PlancheSortie, setup: PasseSetup): boolean {
  const R = S.sorties;
  let s = passeInit({ ...setup, first: 1 });
  for (let n = 0; !s.winner && n < setup.width * setup.height * 2; n++)
    s = passePlay(
      s,
      passeThink(
        s,
        s.turn === 1 ? { depth: R?.depth ?? 3, style: x.style } : { depth: R?.guardDepth ?? 3 },
      ),
    );
  return s.winner === 1;
}

/**
 * The holder going before the captain: its own links of the chain, the captain answering. Null: a
 * piece was illegal. True: the captain passed (the holder's chain did not hold).
 */
export function plancheSortieMeet(
  S: PlancheSetup,
  x: PlancheSortie,
  setup: PasseSetup,
  moves: PasseMove[],
): boolean | null {
  const mind = { depth: S.sorties?.depth ?? 3, style: x.style };
  let s = passeInit({ ...setup, first: 1 });
  for (const m of moves) {
    if (s.winner) break;
    if (s.turn !== 2) s = passePlay(s, passeThink(s, mind));
    if (s.winner) break;
    try {
      s = passePlay(s, m.fire ? { at: m.at, fire: true } : { at: m.at });
    } catch {
      return null;
    }
  }
  // The holder stopped before the end: the captain plays on against an idle chain.
  if (!s.winner && s.turn === 1) s = passePlay(s, passeThink(s, mind));
  return s.winner !== 2;
}

/** Why a sortie may not be met by a house now, or nothing if it may. */
export function plancheSortieRefusal(
  s: PlancheState,
  house: string,
  id: string,
  now: number,
): string | undefined {
  const x = s.sorties?.list.find((y) => y.id === id);
  if (!x) return "planche_unknown";
  if (s.sorties?.done[id]) return "planche_sortie_done";
  if (own(s.passages, x.target)?.holder !== house) return "planche_not_holder";
  if (now >= x.at) return "planche_sortie_past";
  return undefined;
}

/**
 * A sortie's end: won by the captain, the tower loses a seal (and goes back to the corsair with its
 * last); held, an assault repelled at the Garde. Told in its holder's Livre either way.
 */
export function plancheSortieEnd(
  S: PlancheSetup,
  s0: PlancheState,
  id: string,
  won: boolean,
  by: "garde" | "tenant",
  now: number,
): PlancheState {
  const x = s0.sorties?.list.find((y) => y.id === id);
  if (!x || !s0.sorties) return fail("planche_unknown");
  if (s0.sorties.done[id]) return fail("planche_sortie_done");
  const s = structuredClone(s0);
  const st = s.sorties as PlancheSortiesState;
  st.done[id] = { won, by, at: now };
  const p = own(s.passages, x.target);
  const def = S.passages.find((q) => q.id === x.target);
  if (!p || !def) return s;
  const h = own(s.houses, p.holder);
  if (won) {
    p.seals -= 1;
    if (p.seals <= 0)
      s.passages[x.target] = { holder: def.holder, tollBps: def.tollBps, seals: def.seals };
  } else if (h) h.rank.repelled += 1;
  if (h?.maison) {
    h.maison.log.push({ at: now, kind: "sortie", data: `${x.captain}:${won ? "perdu" : "tenu"}` });
    if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
  }
  return s;
}

/**
 * Every sortie whose hour has come, played without its holder against the tower's guard, in the
 * order of their hours (`boardOf` gives a passage's board of the Passe, with the duel's rules).
 */
export function plancheSortiesSettle(
  S: PlancheSetup,
  s0: PlancheState,
  now: number,
  boardOf: (passage: string) => PasseSetup | undefined,
): PlancheState {
  let s = s0;
  for (const x of plancheSortiesDue(s0, now).sort((a, b) => a.at - b.at)) {
    const b = boardOf(x.target);
    // A tower that changed hands since Monday: the sortie finds no one, and goes home.
    const holder = own(s.passages, x.target)?.holder ?? "";
    if (!b || !s.rank.humans.includes(holder)) {
      s = structuredClone(s);
      (s.sorties as PlancheSortiesState).done[x.id] = { won: false, by: "garde", at: x.at };
      continue;
    }
    const won = plancheSortieDuel(S, x, { ...b, cells: plancheSortieBoard(s, x, b) });
    s = plancheSortieEnd(S, s, x.id, won, "garde", x.at);
  }
  return s;
}
