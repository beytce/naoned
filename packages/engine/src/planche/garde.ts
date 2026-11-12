/**
 * The prepared guard (docs/plan-hex-commerce.md § 3.6, lot H4): the house holding a tower lays a
 * few links of its chain on the board of its Passe in advance (two, three on a strait); its
 * lieutenant defends from them. Changed once a day (the rule of the War's ruses, 11 November 2026);
 * lost with the tower.
 *
 * Pure. The board of the Passe is the theme's: it is given, the engine of the board not knowing it.
 */

import { PASSE_CHAIN, PASSE_EMPTY } from "../passe/board.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const DAY = 86_400_000;

const fail = (code: string): never => {
  throw new Error(code);
};

/** The holder of a passage lays its guard: links on empty cells of `board`, at most its number. */
export function plancheGuard(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  passage: string,
  cells: readonly number[],
  now: number,
  board: readonly number[],
): PlancheState {
  const def = S.passages.find((p) => p.id === passage);
  const p0 = Object.hasOwn(s0.passages, passage) ? s0.passages[passage] : undefined;
  if (!def || !p0 || !Object.hasOwn(s0.houses, house)) return fail("planche_unknown");
  if (p0.holder !== house) return fail("planche_not_holder");
  if (!def.guard) return fail("planche_guard_none");
  if (cells.length > def.guard) return fail("planche_guard_many");
  if (
    new Set(cells).size !== cells.length ||
    cells.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= board.length || board[i] !== PASSE_EMPTY,
    )
  )
    return fail("planche_guard_cell");
  const day = Math.floor(now / DAY);
  if (p0.guardDay === day) return fail("planche_guard_today");
  const s = structuredClone(s0);
  const p = s.passages[passage] as PlancheState["passages"][string];
  p.guard = [...cells];
  p.guardDay = day;
  return s;
}

/** The board of a tower's Passe with its guard laid: the cells the duel begins on. */
export function plancheGuardBoard(board: readonly number[], guard?: readonly number[]): number[] {
  const cells = [...board];
  for (const i of guard ?? []) if (cells[i] === PASSE_EMPTY) cells[i] = PASSE_CHAIN;
  return cells;
}
