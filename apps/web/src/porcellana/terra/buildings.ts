/**
 * The Terraferma's buildings on the board (lot T4), the pure part: a bombard's shot read from what
 * changed hands, since the view tells the cells and the buildings, not the shots. Cells of one
 * holder turned back to free land together, within reach of another's bombard, are its shot.
 */
import { terraNeighbors } from "@comptoirs/engine";
import type { GridOf } from "./glaze.js";

export type BuildingKind = "rocca" | "borgo" | "porto" | "bombarda" | "mura";

export interface BuildingPic {
  cell: number;
  kind: BuildingKind;
  /** Its holder (an index of the picture's holders). */
  owner: number;
}

export interface Shot {
  /** The bombard's cell. */
  from: number;
  /** The cells it turned back to free land. */
  cells: number[];
}

export function shotsBetween(
  g: GridOf,
  before: number[],
  after: number[],
  buildings: BuildingPic[],
  reach = 6,
): Shot[] {
  const map = {
    width: g.width,
    height: g.height,
    ...(g.grid === "square" ? { grid: "square" as const } : {}),
  };
  const freed = new Set<number>();
  for (let c = 0; c < after.length; c++)
    if ((before[c] ?? -1) >= 0 && (after[c] ?? -1) < 0) freed.add(c);
  const d = (a: number, b: number) =>
    Math.abs((a % g.width) - (b % g.width)) +
    Math.abs(Math.floor(a / g.width) - Math.floor(b / g.width));
  const out: Shot[] = [];
  const done = new Set<number>();
  for (const start of [...freed].sort((a, b) => a - b)) {
    if (done.has(start)) continue;
    // The cells freed together, of the same holder, side by side.
    const holder = before[start];
    const cells: number[] = [];
    const queue = [start];
    done.add(start);
    while (queue.length) {
      const c = queue.shift() as number;
      cells.push(c);
      for (const n of terraNeighbors(map, c))
        if (freed.has(n) && !done.has(n) && before[n] === holder) {
          done.add(n);
          queue.push(n);
        }
    }
    cells.sort((a, b) => a - b);
    const gun = buildings
      .filter((b) => b.kind === "bombarda" && b.owner !== holder && after[b.cell] === b.owner)
      .map((b) => ({ b, far: Math.min(...cells.map((c) => d(c, b.cell))) }))
      .filter((x) => x.far <= reach)
      .sort((x, y) => x.far - y.far || x.b.cell - y.b.cell)[0];
    if (gun) out.push({ from: gun.b.cell, cells });
  }
  return out;
}
