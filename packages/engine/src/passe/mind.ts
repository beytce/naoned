/**
 * The opponent of the Passe (docs/plan-passe.md P2): the corsair captains, and the lieutenant who
 * holds a tower while its owner is away. It weighs how far each side still is from linking its
 * banks, and looks one to four pieces ahead. Nothing is drawn unless a generator is given: the same
 * board gets the same answer.
 */
import type { Rng } from "../rng.js";
import {
  PASSE_CHAIN,
  PASSE_REEF,
  PASSE_THREAD,
  type PasseMove,
  type PasseSide,
  type PasseState,
  passeDistance,
  passeLegal,
  passeNeighbours,
  passePlay,
} from "./board.js";

/** How it likes to play: wall the middle, run along the banks, or hound the other's pieces. */
export type PasseStyle = "mur" | "rives" | "meute";

export interface PasseMind {
  /** Pieces it looks ahead: 1 (its own), 2 (the reply), 3, 4. */
  depth: number;
  style?: PasseStyle;
}

const WIN = 100_000;
/** One cell nearer than the other is worth this much. */
const CELL = 100;
/** Pieces weighed at the root, and at each ply below. */
const WIDE_ROOT = 12;
const WIDE = 8;

/** The board for a side: won, lost, or how much nearer it is than the other. */
function weigh(s: PasseState, side: PasseSide): number {
  const other: PasseSide = side === 1 ? 2 : 1;
  if (s.winner === side) return WIN;
  if (s.winner === other) return -WIN;
  return (passeDistance(s, other) - passeDistance(s, side)) * CELL;
}

interface Tried {
  move: PasseMove;
  next: PasseState;
  /** What the board is worth to the one who just played, before any reply. */
  now: number;
}

/** The side's moves, the most promising first; a special piece must earn its one use. */
function tries(s: PasseState, wide: number): Tried[] {
  const me = s.turn;
  const out: Tried[] = [];
  for (const move of passeLegal(s)) {
    const next = passePlay(s, move);
    out.push({ move, next, now: weigh(next, me) - (move.fire ? CELL + CELL / 2 : 0) });
  }
  out.sort((a, b) => b.now - a.now || a.move.at - b.move.at);
  return out.slice(0, wide);
}

/** What the board is worth to the side to play, looking `depth` pieces ahead. */
function search(s: PasseState, depth: number, alpha: number, beta: number): number {
  let best = -WIN * 2;
  let a = alpha;
  for (const t of tries(s, WIDE)) {
    // A win counts more the sooner it comes; a loss, less the later.
    const v =
      t.next.winner || depth <= 1
        ? t.now + (t.next.winner ? depth : 0)
        : -search(t.next, depth - 1, -beta, -a);
    if (v > best) best = v;
    if (best > a) a = best;
    if (a >= beta) break;
  }
  return best;
}

/** How much a manner weighs against a cell of distance (`CELL`): for the bench to measure. */
export const PASSE_MANNER = { weight: Number(globalThis.process?.env?.PASSE_MANNER ?? 1) };

/**
 * A leaning by manner (docs/plan-duels.md B3): the wall keeps to the middle of the strait, the
 * banks run along its edges, the pack sticks to the other's pieces. Without a manner, a slight
 * taste for the middle.
 */
function leaning(s: PasseState, move: PasseMove, style: PasseStyle | undefined): number {
  const x = move.at % s.width;
  const y = Math.floor(move.at / s.width);
  const cx = Math.abs(x - (s.width - 1) / 2);
  const cy = Math.abs(y - (s.height - 1) / 2);
  const middle = -Math.round((cx + cy) * 2);
  const w = PASSE_MANNER.weight;
  if (style === "mur") return Math.round(middle * 6 * w);
  // The banks: along the strait's top and bottom rows, away from its middle columns (measured on
  // passe-bench, docs/calibration.md: the edges both ways were the weakest manner).
  if (style === "rives") return Math.round((Math.round(cy * 2) - Math.round(cx * 2)) * 4 * w);
  if (style === "meute") {
    const foe = s.turn === 1 ? [PASSE_CHAIN, PASSE_REEF] : [PASSE_THREAD];
    let near = 0;
    for (const j of passeNeighbours(s.width, s.height)[move.at] ?? [])
      if (foe.includes(s.cells[j] ?? -1)) near++;
    return Math.round((near * 14 + middle) * w);
  }
  return middle;
}

/** The move it plays. Throws when there is none left (somebody is through). */
export function passeThink(s: PasseState, mind: PasseMind, rng?: Rng): PasseMove {
  const depth = Math.max(1, Math.min(4, Math.floor(mind.depth)));
  let best: PasseMove | null = null;
  let bestV = Number.NEGATIVE_INFINITY;
  for (const t of tries(s, WIDE_ROOT)) {
    const deep =
      t.next.winner || depth <= 1
        ? t.now + (t.next.winner ? depth : 0)
        : -search(t.next, depth - 1, -WIN * 2, WIN * 2);
    const v = deep + leaning(s, t.move, mind.style) + (rng ? rng.int(0, 30) : 0);
    if (v > bestV) {
      bestV = v;
      best = t.move;
    }
  }
  if (!best) throw new Error("passe_over");
  return best;
}
