/**
 * The Terraferma's glaze (docs/plan-terraferme-porcellana.md § 1, lot T2): each holder's land is
 * a sheet of glaze laid on the tops of its cells, its edges rounded, a joint of porcelain between
 * two holders. One field a holder (a soft bump on each of its cells), thresholded by marching
 * squares; a cell just taken fills from the neighbour the attack comes from, the bump gliding from
 * there into it. Pure: the board draws what this returns.
 */
import { terraNeighbors } from "@comptoirs/engine";

/** How long a cell takes to change hands on the board. */
export const FLOW_MS = 800;
/** The field's reach around a cell's middle, in cells, and the threshold of the outline. */
export const REACH = 1.05;
export const THRESHOLD = 0.66;

export interface GridOf {
  width: number;
  height: number;
  grid?: "hex" | "square";
}

/** A cell changing hands: who held it, the winner's neighbour it pours from (-1: none), when. */
export interface Flow {
  cell: number;
  from: number;
  src: number;
  start: number;
}

const easeOut = (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - (1 - p) ** 3);

/** A rectangle of cells: from (i0, j0) included to (i1, j1) excluded. */
export interface Region {
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

/**
 * Each holder's field (-1, free land, has none) over a region of the map (the whole map by
 * default), `per` samples a cell, ((i1−i0)·per+1) by ((j1−j0)·per+1): a bump of 1 at the middle of
 * each cell it holds, none past `REACH`. Sample (i, j) stands at cell coordinates
 * (i0 + i/per, j0 + j/per).
 */
export function glazeFields(
  g: GridOf,
  owner: number[],
  flows: Flow[],
  now: number,
  per: number,
  region: Region = { i0: 0, j0: 0, i1: g.width, j1: g.height },
): Map<number, Float32Array> {
  const { i0: ri, j0: rj } = region;
  const nx = (region.i1 - ri) * per + 1;
  const ny = (region.j1 - rj) * per + 1;
  const fields = new Map<number, Float32Array>();
  const field = (h: number) => {
    let f = fields.get(h);
    if (!f) {
      f = new Float32Array(nx * ny);
      fields.set(h, f);
    }
    return f;
  };
  const r2 = REACH * REACH;
  const add = (h: number, bx: number, by: number, w: number) => {
    if (h < 0 || w <= 0) return;
    const f = field(h);
    const lx = bx - ri;
    const ly = by - rj;
    const i0 = Math.max(0, Math.floor((lx - REACH) * per));
    const i1 = Math.min(nx - 1, Math.ceil((lx + REACH) * per));
    const j0 = Math.max(0, Math.floor((ly - REACH) * per));
    const j1 = Math.min(ny - 1, Math.ceil((ly + REACH) * per));
    if (i0 > i1 || j0 > j1) return;
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = i / per - lx;
        const dy = j / per - ly;
        const d2 = (dx * dx + dy * dy) / r2;
        if (d2 < 1) {
          const k = 1 - d2;
          f[j * nx + i] = (f[j * nx + i] ?? 0) + w * k * k;
        }
      }
  };
  const live = new Map<number, Flow>();
  for (const fl of flows) if (now >= fl.start && now < fl.start + FLOW_MS) live.set(fl.cell, fl);
  const before = new Set(flows.filter((fl) => now < fl.start).map((fl) => fl.cell));
  for (let c = 0; c < owner.length; c++) {
    const cx = (c % g.width) + 0.5;
    const cy = Math.floor(c / g.width) + 0.5;
    // Only the cells whose bump (or whose pour) can reach the region.
    if (cx < ri - 2 || cx > region.i1 + 2 || cy < rj - 2 || cy > region.j1 + 2) continue;
    const fl = live.get(c);
    const h = owner[c] ?? -1;
    if (before.has(c)) {
      // Not begun yet: still the loser's.
      const waiting = flows.find((x) => x.cell === c && now < x.start);
      add(waiting?.from ?? h, cx, cy, 1);
      continue;
    }
    if (!fl) {
      add(h, cx, cy, 1);
      continue;
    }
    const p = (now - fl.start) / FLOW_MS;
    const e = easeOut(p);
    if (fl.src >= 0) {
      // The winner's glaze runs from its neighbour into the cell, swelling as it goes.
      const sx = (fl.src % g.width) + 0.5;
      const sy = Math.floor(fl.src / g.width) + 0.5;
      add(h, sx + (cx - sx) * e, sy + (cy - sy) * e, 1 + 0.3 * Math.sin(Math.PI * p));
    } else add(h, cx, cy, e);
    add(fl.from, cx, cy, 1 - e);
  }
  return fields;
}

type Pt = [number, number];

/**
 * The outline of a field above `thr` (marching squares): the filled polygons, square by square
 * (their union is the land), and the edge's segments. In the field's units times `step`.
 */
export function contour(
  vals: Float32Array,
  nx: number,
  ny: number,
  step: number,
  thr: number,
): { fill: Pt[][]; line: [Pt, Pt][] } {
  const fill: Pt[][] = [];
  const line: [Pt, Pt][] = [];
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = vals[j * nx + i] ?? 0;
      const b = vals[j * nx + i + 1] ?? 0;
      const c = vals[(j + 1) * nx + i + 1] ?? 0;
      const d = vals[(j + 1) * nx + i] ?? 0;
      if (a <= thr && b <= thr && c <= thr && d <= thr) continue;
      const x0 = i * step;
      const y0 = j * step;
      const x1 = x0 + step;
      const y1 = y0 + step;
      if (a > thr && b > thr && c > thr && d > thr) {
        fill.push([
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ]);
        continue;
      }
      const corners: [number, number, number][] = [
        [x0, y0, a],
        [x1, y0, b],
        [x1, y1, c],
        [x0, y1, d],
      ];
      const pts: Pt[] = [];
      const cross: { pt: Pt; out: boolean }[] = [];
      for (let k = 0; k < 4; k++) {
        const p = corners[k] as [number, number, number];
        const q = corners[(k + 1) & 3] as [number, number, number];
        if (p[2] > thr) pts.push([p[0], p[1]]);
        if (p[2] > thr !== q[2] > thr) {
          const t = (thr - p[2]) / (q[2] - p[2]);
          const pt: Pt = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
          pts.push(pt);
          cross.push({ pt, out: p[2] > thr });
        }
      }
      fill.push(pts);
      // Each crossing from inside to outside pairs with the next (the polygon's cut edge).
      for (let m = 0; m < cross.length; m++) {
        const here = cross[m] as { pt: Pt; out: boolean };
        if (here.out) line.push([here.pt, (cross[(m + 1) % cross.length] as { pt: Pt }).pt]);
      }
    }
  return { fill, line };
}

/** The cells that changed hands between two views, each poured from a winner's neighbour. */
export function flowsBetween(g: GridOf, before: number[], after: number[], now: number): Flow[] {
  const out: Flow[] = [];
  const map = {
    width: g.width,
    height: g.height,
    ...(g.grid === "square" ? { grid: "square" as const } : {}),
  };
  for (let c = 0; c < after.length; c++) {
    const was = before[c] ?? -1;
    const is = after[c] ?? -1;
    if (was === is) continue;
    const src = is < 0 ? -1 : (terraNeighbors(map, c).find((n) => before[n] === is) ?? -1);
    out.push({ cell: c, from: was, src, start: now });
  }
  return out;
}

export interface HolderLike {
  me: boolean;
  ally: boolean;
  nation: string | null;
}

export interface HolderStyle {
  colour: string;
  alpha: number;
  hatch: boolean;
  /** The edge's colour when it is not the glaze's own (the allies' lagoon). */
  edge?: string;
}

/**
 * The colour rule « Encres » (docs/plan-terraferme-porcellana.md § 1): the merchant in red of
 * Venice; the other merchants in values of ink, one of three densities by their place; its allies
 * pale with a lagoon edge; the nations in hatched biscuit (the only hatching: forty merchants
 * hatched turn the board to noise).
 */
export function holderStyle(h: HolderLike, index: number): HolderStyle {
  if (h.me) return { colour: "#C23B2E", alpha: 0.55, hatch: false };
  if (h.ally) return { colour: "#7A736A", alpha: 0.12, hatch: false, edge: "#16897A" };
  if (h.nation) return { colour: "#B39470", alpha: 0.36, hatch: true };
  const densities = [0.26, 0.18, 0.13];
  return {
    colour: "#2A2725",
    alpha: densities[index % 3] as number,
    hatch: false,
  };
}
