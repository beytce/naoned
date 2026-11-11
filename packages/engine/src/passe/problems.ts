/**
 * The problems of the Passe (docs/CADRAGE-v4.md § 9.9, docs/plan-passe.md P3): « the thread passes
 * in three pieces », as chess has its mate in three. A win is forced when, whatever the other side
 * answers (its special piece included), the side to play is through within the pieces told.
 */
import {
  type PasseMove,
  type PasseSide,
  type PasseState,
  passeDistance,
  passeLegal,
  passePlay,
} from "./board.js";

/** A position where the thread, to play, passes in `moves` pieces by `key`. */
export interface PasseProblem {
  id: string;
  width: number;
  height: number;
  cells: number[];
  moves: number;
  key: PasseMove;
}

/** After a move of `me`, no answer keeps it from winning within `left` more pieces. */
function holds(after: PasseState, me: PasseSide, left: number): boolean {
  for (const reply of passeLegal(after)) {
    const u = passePlay(after, reply);
    if (u.winner && u.winner !== me) return false;
    if (passeDistance(u, me) > left) return false;
    if (!first(u, left)) return false;
  }
  return true;
}

/** A first move by which the side to play wins within `moves` of its pieces, or null. */
function first(s: PasseState, moves: number): PasseMove | null {
  const me = s.turn;
  const next: { move: PasseMove; after: PasseState }[] = [];
  for (const move of passeLegal(s)) {
    const after = passePlay(s, move);
    if (after.winner === me) return move;
    next.push({ move, after });
  }
  if (moves <= 1) return null;
  for (const { move, after } of next) {
    // It needs at most `moves - 1` more cells after this piece, or it cannot be in time.
    if (after.winner || passeDistance(after, me) > moves - 1) continue;
    if (holds(after, me, moves - 1)) return move;
  }
  return null;
}

/** A move by which the side to play is through within `moves` of its own pieces, whatever the answers. */
export function passeForcedWin(s: PasseState, moves: number): PasseMove | null {
  if (s.winner || moves < 1) return null;
  return first(s, moves);
}

/** Every first move that forces the win within `moves` pieces (a problem has one alone). */
export function passeKeys(s: PasseState, moves: number): PasseMove[] {
  if (s.winner || moves < 1) return [];
  const me = s.turn;
  const out: PasseMove[] = [];
  for (const move of passeLegal(s)) {
    const after = passePlay(s, move);
    if (after.winner === me) out.push(move);
    else if (
      !after.winner &&
      moves > 1 &&
      passeDistance(after, me) <= moves - 1 &&
      holds(after, me, moves - 1)
    )
      out.push(move);
  }
  return out;
}
