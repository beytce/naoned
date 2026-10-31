import { WORLD_VIEW } from "./mediterranean.js";

/**
 * The map's hex grid (the map at the centre, step 2), laid over the chart (art/mediterranean.tsx,
 * in its units): pointy-top hexes of `SIZE` across their corners, in axial cells « q,r ». The
 * engine knows the cells (packages/engine/src/themes/venice1450.map.ts, written by
 * scripts/hexmap.ts from this grid); the screen knows where they lie.
 */
export const HEX_SIZE = 11;
const W = Math.sqrt(3) * HEX_SIZE;
const H = 1.5 * HEX_SIZE;

/** The rows and columns that cover the chart, one more each way. */
export const HEX_ROWS = Math.ceil(WORLD_VIEW.h / H) + 1;
export const HEX_COLS = Math.ceil(WORLD_VIEW.w / W) + 1;

export function cellCentre(key: string): [number, number] {
  const [q = 0, r = 0] = key.split(",").map(Number);
  return [W * (q + r / 2), H * r];
}

/** The cell under a point of the chart. */
export function cellAt(x: number, y: number): string {
  const qf = ((Math.sqrt(3) / 3) * x - y / 3) / HEX_SIZE;
  const rf = ((2 / 3) * y) / HEX_SIZE;
  // Cube rounding.
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(-qf - rf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s + qf + rf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return `${q},${r}`;
}

/** Every cell of the grid over the chart, row by row. */
export function gridCells(): string[] {
  const out: string[] = [];
  for (let r = -1; r <= HEX_ROWS; r++) {
    const shift = Math.floor(r / 2);
    for (let c = -1; c <= HEX_COLS; c++) out.push(`${c - shift},${r}`);
  }
  return out;
}

/** A hex's outline around its centre, as an SVG path (in chart units). */
export function hexPath(key: string, inset = 0): string {
  const [cx, cy] = cellCentre(key);
  const r = HEX_SIZE - inset;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(" L")} Z`;
}

/** The six neighbours of a cell. */
export function neighbours(key: string): string[] {
  const [q = 0, r = 0] = key.split(",").map(Number);
  return [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ].map(([dq = 0, dr = 0]) => `${q + dq},${r + dr}`);
}
