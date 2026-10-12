/**
 * The domain's land, in cells (one cell = one world unit): twelve plots of 2 × 2 with paths
 * between them, filled from the yard outwards; the palace's place of honour behind; the yard in
 * front with the store, the vehicles and the gate to the road. The same land as the drawn scene.
 *
 * World axes: x along the grid's x, z along the grid's y, y up.
 */

export interface Cell {
  x: number;
  y: number;
}

export const SLOTS: Cell[] = [
  { x: 0, y: 6 },
  { x: 3, y: 6 },
  { x: 6, y: 6 },
  { x: 0, y: 3 },
  { x: 3, y: 3 },
  { x: 6, y: 3 },
  { x: 9, y: 6 },
  { x: 9, y: 3 },
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 6, y: 0 },
  { x: 9, y: 0 },
];
export const HONOUR: Cell = { x: 4.5, y: -3.2 };
export const YARD = { x: 0, y: 9.2, w: 9, d: 2 };
export const GATE = { x: 9.4, y: 9.2 };
/** Where the store stands in the yard, and where vehicles park. */
export const STORE = { x: 0, y: 9.4, w: 2.2, d: 1.6 };
export const PARKING = (i: number): Cell => ({ x: 3.4 + i * 1.4, y: 10.2 });
/** The road beyond the gate: where a vehicle stands at a share of its leg (0 at the gate). */
export function onRoad(share: number, lane: number): Cell {
  return { x: GATE.x + 0.9 + Math.max(0, Math.min(1, share)) * 4.2, y: YARD.y + 0.65 + lane * 0.6 };
}
/** Empty plots shown ahead: the next ones to build on, not the whole land. */
export const EMPTY_SHOWN = 2;

export interface Placed<T> {
  item: T;
  at: Cell;
}

/**
 * Where each workshop stands: the first palace in the place of honour, the others on the plots
 * from the yard out; and the next empty plots shown, as many as may still be built (two at most).
 */
export function placeWorkshops<T extends { type: string }>(
  items: T[],
  maxPlots: number,
): { placed: Placed<T>[]; empties: Cell[] } {
  const palaces = items.filter((p) => p.type === "palazzo");
  const others = items.filter((p) => p.type !== "palazzo");
  const placed: Placed<T>[] = [];
  const queue = [...palaces.slice(1), ...others];
  const first = palaces[0];
  if (first) placed.push({ item: first, at: HONOUR });
  queue.slice(0, SLOTS.length).forEach((item, i) => {
    const at = SLOTS[i];
    if (at) placed.push({ item, at });
  });
  const used = Math.min(queue.length, SLOTS.length);
  const free = Math.max(0, Math.min(maxPlots, SLOTS.length + 1) - items.length);
  const empties = SLOTS.slice(used, used + Math.min(free, EMPTY_SHOWN));
  return { placed, empties };
}

/** The part of the land to frame: what is built, the next plots, the yard and the gate. */
export function frameBounds(shown: Cell[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const xs = [YARD.x - 2, GATE.x + 2.6, ...shown.flatMap((c) => [c.x, c.x + 2])];
  const ys = [YARD.y + YARD.d, YARD.y - 1, ...shown.flatMap((c) => [c.y, c.y + 2])];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** A worker's round: from the door of their workshop, along the lane, to the store, and back. */
export function workerRound(home: Cell, index: number): Cell[] {
  const door = { x: home.x + 1, y: home.y + 2.25 };
  const lane = { x: home.x + 1, y: 8.65 };
  const store = { x: 1.1 + (index % 3) * 0.3, y: 8.75 };
  return [door, lane, store, lane, door];
}

/** The point at a share (0 to 1) of a path, and the heading there. */
export function alongPath(path: Cell[], share: number): { at: Cell; heading: number } {
  const legs = path.slice(1).map((p, i) => {
    const q = path[i] as Cell;
    return { from: q, to: p, len: Math.hypot(p.x - q.x, p.y - q.y) };
  });
  const total = legs.reduce((n, l) => n + l.len, 0) || 1;
  let left = (((share % 1) + 1) % 1) * total;
  for (const l of legs) {
    if (left <= l.len || l === legs[legs.length - 1]) {
      const k = l.len ? Math.min(1, left / l.len) : 0;
      return {
        at: { x: l.from.x + (l.to.x - l.from.x) * k, y: l.from.y + (l.to.y - l.from.y) * k },
        heading: Math.atan2(l.to.x - l.from.x, l.to.y - l.from.y),
      };
    }
    left -= l.len;
  }
  return { at: path[0] ?? { x: 0, y: 0 }, heading: 0 };
}

export function pathLength(path: Cell[]): number {
  return path.slice(1).reduce((n, p, i) => {
    const q = path[i] as Cell;
    return n + Math.hypot(p.x - q.x, p.y - q.y);
  }, 0);
}
