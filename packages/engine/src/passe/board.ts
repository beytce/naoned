/**
 * La Passe (docs/CADRAGE-v4.md § 9, docs/plan-passe.md P1): the thread against the chain.
 *
 * The strait is a board of square cells. The thread (the one who forces the passage) wins by linking
 * the south bank to the north bank; the chain (the one who holds it) by linking the west bank to the
 * east bank. Each lays one piece in turn; a piece laid never moves. Two pieces hold together side by
 * side, or along the one diagonal the current runs (north-east / south-west). With these six
 * neighbours the square board has the geometry of the connection games (Hex): on a full board
 * exactly one of the two sides is through, so a game is never drawn.
 *
 * Pure and deterministic: no clock, no draw, no state but the one returned.
 */

export const PASSE_EMPTY = 0;
export const PASSE_THREAD = 1;
export const PASSE_CHAIN = 2;
/** A reef: no one lays there, and the chain hooks onto it. */
export const PASSE_REEF = 3;
/** The distance of a side that can no longer link its banks. */
export const PASSE_CUT = 99;

/** 1 the thread (south to north), 2 the chain (west to east). */
export type PasseSide = 1 | 2;

/** A passage's board and its rules, as `worlds.settings` would give them. */
export interface PasseSetup {
  width: number;
  height: number;
  /** Row by row from the north: empty, a chain post laid in advance, or a reef. */
  cells: number[];
  first: PasseSide;
  /** The pieces of character each side may play once: the thread's fireship, the chain's bombard. */
  fire: { thread: number; chain: number };
  /** The cargo: `holds` are saved when the thread passes in `full` barges or fewer, one less per `step` more. */
  cargo: { holds: number; full: number; step: number };
}

export interface PasseState {
  width: number;
  height: number;
  cells: number[];
  turn: PasseSide;
  /** Pieces laid by the thread, by the chain (a special piece is not one). */
  laid: [number, number];
  /** Special pieces left to the thread, to the chain. */
  fire: [number, number];
  winner: 0 | PasseSide;
}

/** Lay a piece at a cell, or play one's special piece on it. */
export interface PasseMove {
  at: number;
  fire?: true;
}

/** North, north-east (the current), east, south, south-west (the current), west. */
const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

const grids = new Map<string, number[][]>();
/** The cells that hold with a cell, on a board of that size. */
export function passeNeighbours(width: number, height: number): number[][] {
  const key = `${width}x${height}`;
  let g = grids.get(key);
  if (!g) {
    g = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const out: number[] = [];
        for (const [dx, dy] of STEPS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) out.push(ny * width + nx);
        }
        g.push(out);
      }
    grids.set(key, g);
  }
  return g;
}

const owns = (side: PasseSide, v: number | undefined) =>
  side === 1 ? v === PASSE_THREAD : v === PASSE_CHAIN || v === PASSE_REEF;

export function passeInit(setup: PasseSetup): PasseState {
  const { width, height, cells } = setup;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2)
    throw new Error("passe_board");
  if (cells.length !== width * height) throw new Error("passe_board");
  for (const v of cells)
    if (v !== PASSE_EMPTY && v !== PASSE_THREAD && v !== PASSE_CHAIN && v !== PASSE_REEF)
      throw new Error("passe_board");
  const s: PasseState = {
    width,
    height,
    cells: cells.slice(),
    turn: setup.first,
    laid: [0, 0],
    fire: [Math.max(0, setup.fire.thread), Math.max(0, setup.fire.chain)],
    winner: 0,
  };
  s.winner = through(s);
  return s;
}

/**
 * The cost of the cheapest way from a side's first bank to each cell (its own pieces are free, an
 * empty cell costs one, the rest is shut), and where each cell was reached from.
 */
function field(s: PasseState, side: PasseSide): { cost: Int16Array; from: Int16Array } {
  const { width, height, cells } = s;
  const n = cells.length;
  const near = passeNeighbours(width, height);
  const cost = new Int16Array(n).fill(PASSE_CUT);
  const from = new Int16Array(n).fill(-1);
  // A deque on a ring: free steps in front, paid steps behind.
  const ring = new Int16Array(n * 8 + 8);
  const size = ring.length;
  let head = 0;
  let tail = 0;
  const step = (v: number | undefined) => (owns(side, v) ? 0 : v === PASSE_EMPTY ? 1 : PASSE_CUT);
  const reach = (i: number, c: number, by: number, free: boolean) => {
    if (c >= (cost[i] ?? 0)) return;
    cost[i] = c;
    from[i] = by;
    if (free) {
      head = (head - 1 + size) % size;
      ring[head] = i;
    } else {
      ring[tail] = i;
      tail = (tail + 1) % size;
    }
  };
  if (side === 1)
    for (let x = 0; x < width; x++) {
      const i = (height - 1) * width + x;
      const c = step(cells[i]);
      if (c < PASSE_CUT) reach(i, c, -1, c === 0);
    }
  else
    for (let y = 0; y < height; y++) {
      const i = y * width;
      const c = step(cells[i]);
      if (c < PASSE_CUT) reach(i, c, -1, c === 0);
    }
  while (head !== tail) {
    const i = ring[head] ?? 0;
    head = (head + 1) % size;
    const ci = cost[i] ?? PASSE_CUT;
    for (const j of near[i] ?? []) {
      const c = step(cells[j]);
      if (c < PASSE_CUT) reach(j, ci + c, i, c === 0);
    }
  }
  return { cost, from };
}

/** The far bank's cell a side reaches most cheaply, and at what cost. */
function landing(s: PasseState, side: PasseSide, cost: Int16Array): { at: number; cost: number } {
  let at = -1;
  let best = PASSE_CUT;
  const far = (k: number) => (side === 1 ? k : k * s.width + s.width - 1);
  const count = side === 1 ? s.width : s.height;
  for (let k = 0; k < count; k++) {
    const i = far(k);
    const c = cost[i] ?? PASSE_CUT;
    if (c < best) {
      best = c;
      at = i;
    }
  }
  return { at, cost: best };
}

/** How many empty cells a side must still take to link its two banks (`PASSE_CUT`: it cannot). */
export function passeDistance(s: PasseState, side: PasseSide): number {
  return landing(s, side, field(s, side).cost).cost;
}

function through(s: PasseState): 0 | PasseSide {
  if (passeDistance(s, 1) === 0) return 1;
  if (passeDistance(s, 2) === 0) return 2;
  return 0;
}

/** The winner's line, from its first bank (south, or west) to the other; empty while nobody is through. */
export function passeWinningLine(s: PasseState): number[] {
  if (!s.winner) return [];
  const f = field(s, s.winner);
  const end = landing(s, s.winner, f.cost);
  if (end.cost !== 0) return [];
  const line: number[] = [];
  for (let i = end.at; i >= 0; i = f.from[i] ?? -1) line.push(i);
  return line.reverse();
}

/** The cells on a side's cheapest way across now (its own pieces and the empty cells it would take). */
export function passeShortestWay(s: PasseState, side: PasseSide): number[] {
  const f = field(s, side);
  const end = landing(s, side, f.cost);
  if (end.at < 0) return [];
  const line: number[] = [];
  for (let i = end.at; i >= 0; i = f.from[i] ?? -1) line.push(i);
  return line.reverse();
}

/** Every pair of a side's pieces that hold together (the chain's reefs count), each pair once. */
export function passeLinks(s: PasseState, side: PasseSide): [number, number][] {
  const out: [number, number][] = [];
  const near = passeNeighbours(s.width, s.height);
  for (let i = 0; i < s.cells.length; i++) {
    if (!owns(side, s.cells[i])) continue;
    for (const j of near[i] ?? []) if (j > i && owns(side, s.cells[j])) out.push([i, j]);
  }
  return out;
}

function touches(s: PasseState, i: number, value: number): boolean {
  for (const j of passeNeighbours(s.width, s.height)[i] ?? []) if (s.cells[j] === value) return true;
  return false;
}

function fireAllowed(s: PasseState, i: number): boolean {
  const v = s.cells[i];
  // The thread's fireship burns a chain post next to one of its barges (never a reef).
  if (s.turn === 1) return s.fire[0] > 0 && v === PASSE_CHAIN && touches(s, i, PASSE_THREAD);
  // The chain's bombard sinks a barge that stands alone.
  return s.fire[1] > 0 && v === PASSE_THREAD && !touches(s, i, PASSE_THREAD);
}

/** Every move the side to play may make; none once somebody is through. */
export function passeLegal(s: PasseState): PasseMove[] {
  if (s.winner) return [];
  const out: PasseMove[] = [];
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] === PASSE_EMPTY) out.push({ at: i });
    else if (fireAllowed(s, i)) out.push({ at: i, fire: true });
  }
  return out;
}

/** The state after a move; throws on a move that is not allowed. The state given is left as it was. */
export function passePlay(s: PasseState, move: PasseMove): PasseState {
  const i = move.at;
  if (s.winner || !Number.isInteger(i) || i < 0 || i >= s.cells.length)
    throw new Error("passe_illegal");
  const cells = s.cells.slice();
  const laid: [number, number] = [s.laid[0], s.laid[1]];
  const fire: [number, number] = [s.fire[0], s.fire[1]];
  if (move.fire) {
    if (!fireAllowed(s, i)) throw new Error("passe_illegal");
    cells[i] = PASSE_EMPTY;
    fire[s.turn - 1] -= 1;
  } else {
    if (cells[i] !== PASSE_EMPTY) throw new Error("passe_illegal");
    cells[i] = s.turn;
    laid[s.turn - 1] += 1;
  }
  const next: PasseState = {
    width: s.width,
    height: s.height,
    cells,
    turn: s.turn === 1 ? 2 : 1,
    laid,
    fire,
    winner: 0,
  };
  next.winner = through(next);
  return next;
}

/** The holds the thread saves: all of them when it passes in few barges, one less per `step` more, never none. */
export function passeCargo(setup: PasseSetup, s: PasseState): number {
  if (s.winner !== 1) return 0;
  const { holds, full, step } = setup.cargo;
  const over = Math.max(0, s.laid[0] - full);
  return Math.max(1, holds - Math.ceil(over / Math.max(1, step)));
}
