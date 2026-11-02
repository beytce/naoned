/**
 * The night board (docs/plan-plateau.md): a tiny low-poly renderer to SVG polygons. A point of the
 * chart (x, y) at a height z is seen at (x, y·TILT − z): the ground is tilted, the volumes stand.
 * One light, from the upper left; each face is shaded by it and drawn only when it faces the eye.
 * Pure and deterministic: the same cell gives the same drawing, at every render.
 */

/** How flat the board lies: the chart's height on screen, for one of its width. */
export const TILT = 0.58;

export type Vec = readonly [number, number, number];

/** A polygon to draw, in chart units already projected. */
export interface Shape {
  /** The polygon's points, "x,y x,y …", or a path when `path` is set. */
  points: string;
  fill: string;
  /** A path instead of a polygon (strokes, curves). */
  path?: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeOpacity?: number;
  dash?: string;
  /** A CSS class, for the few that move (smoke, waves, sails). */
  cls?: string;
}

const L: Vec = normalise([-0.45, 0.55, 0.85]);

function normalise(v: Vec): Vec {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** The face's normal (Newell's method). */
function normalOf(pts: readonly Vec[]): Vec {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1, z1] = pts[i] as Vec;
    const [x2, y2, z2] = pts[(i + 1) % pts.length] as Vec;
    nx += (y1 - y2) * (z1 + z2);
    ny += (z1 - z2) * (x1 + x2);
    nz += (x1 - x2) * (y1 + y2);
  }
  return normalise([nx, ny, nz]);
}
function centroid(pts: readonly Vec[]): Vec {
  const n = pts.length;
  return [
    pts.reduce((s, p) => s + p[0], 0) / n,
    pts.reduce((s, p) => s + p[1], 0) / n,
    pts.reduce((s, p) => s + p[2], 0) / n,
  ];
}

/** A point of the chart, at a height, on the board. */
export function project([x, y, z]: Vec): [number, number] {
  return [x, y * TILT - z];
}
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
export function pointsOf(pts: readonly Vec[]): string {
  return pts.map((p) => project(p).map(fmt).join(",")).join(" ");
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
/** A colour darkened (b < 1) or lightened (b > 1). */
export function shade(hex: string, b: number): string {
  const c = rgb(hex).map((v) => (b <= 1 ? v * b : v + (255 - v) * (b - 1)));
  return `#${c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Whether a face turned this way faces the eye. */
export const facesEye = (n: Vec) => n[1] + TILT * n[2] > 1e-4;
/** A face's light, between `lo` (turned away) and `lo + hi` (facing the light). */
export const lightOf = (n: Vec, lo = 0.48, hi = 0.6) => lo + hi * Math.max(0, dot(n, L));

export type Face = readonly Vec[] | { pts: readonly Vec[]; col: string };

/** The faces of a convex volume that face the eye, shaded. */
export function faces(
  list: readonly Face[],
  centre: Vec,
  col: string,
  lo = 0.48,
  hi = 0.6,
): Shape[] {
  const out: Shape[] = [];
  for (const f of list) {
    const pts = "pts" in f ? f.pts : (f as readonly Vec[]);
    const c = "pts" in f ? f.col : col;
    let n = normalOf(pts);
    if (dot(n, sub(centroid(pts), centre)) < 0) n = [-n[0], -n[1], -n[2]];
    if (!facesEye(n)) continue;
    const fill = shade(c, lightOf(n, lo, hi));
    out.push({ points: pointsOf(pts), fill, stroke: fill, strokeWidth: 0.25 });
  }
  return out;
}

const rot = (x: number, y: number, a: number): [number, number] => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];

/** A box standing on (cx, cy, z0), turned by `a`. */
export function box(
  cx: number,
  cy: number,
  z0: number,
  w: number,
  d: number,
  h: number,
  a: number,
  col: string,
  top?: string,
): Shape[] {
  const cs = (
    [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ] as const
  ).map(([lx, ly]) => {
    const [rx, ry] = rot(lx, ly, a);
    return [cx + rx, cy + ry] as const;
  });
  const b = cs.map(([x, y]) => [x, y, z0] as Vec);
  const t = cs.map(([x, y]) => [x, y, z0 + h] as Vec);
  const list: Face[] = [{ pts: t, col: top ?? col }];
  for (let i = 0; i < 4; i++)
    list.push([b[i] as Vec, b[(i + 1) % 4] as Vec, t[(i + 1) % 4] as Vec, t[i] as Vec]);
  return faces(list, [cx, cy, z0 + h / 2], col);
}

/** A prism of `n` sides (a frustum when r2 differs), jittered for rocks. */
export function prism(
  cx: number,
  cy: number,
  z0: number,
  r: number,
  h: number,
  n: number,
  col: string,
  opts: { r2?: number; a?: number; top?: string; jit?: number[] } = {},
): Shape[] {
  const r2 = opts.r2 ?? r;
  const a = opts.a ?? 0;
  const b: Vec[] = [];
  const t: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const ang = a + (2 * Math.PI * i) / n;
    const j = opts.jit?.[i] ?? 1;
    b.push([cx + r * j * Math.cos(ang), cy + r * j * Math.sin(ang), z0]);
    t.push([cx + r2 * j * Math.cos(ang), cy + r2 * j * Math.sin(ang), z0 + h]);
  }
  const list: Face[] = [];
  for (let i = 0; i < n; i++)
    list.push([b[i] as Vec, b[(i + 1) % n] as Vec, t[(i + 1) % n] as Vec, t[i] as Vec]);
  if (r2 > 0.01) list.push({ pts: t, col: opts.top ?? col });
  return faces(list, [cx, cy, z0 + h / 2], col);
}

/** A cone of `n` faces. */
export function cone(
  cx: number,
  cy: number,
  z0: number,
  r: number,
  h: number,
  n: number,
  col: string,
  a = 0.3,
): Shape[] {
  const b: Vec[] = Array.from({ length: n }, (_, i) => [
    cx + r * Math.cos(a + (2 * Math.PI * i) / n),
    cy + r * Math.sin(a + (2 * Math.PI * i) / n),
    z0,
  ]);
  const apex: Vec = [cx, cy, z0 + h];
  const list: Face[] = b.map((p, i) => [p, b[(i + 1) % n] as Vec, apex]);
  return faces(list, [cx, cy, z0 + h / 3], col, 0.45, 0.62);
}

/** A gabled roof over a box of w × d, its ridge along the width. */
export function gable(
  cx: number,
  cy: number,
  z0: number,
  w: number,
  d: number,
  rh: number,
  a: number,
  col: string,
  over = 1.12,
): Shape[] {
  const W = (w / 2) * over;
  const D = (d / 2) * over;
  const q = (lx: number, ly: number, z: number): Vec => {
    const [rx, ry] = rot(lx, ly, a);
    return [cx + rx, cy + ry, z];
  };
  const b1 = q(-W, -D, z0);
  const b2 = q(W, -D, z0);
  const b3 = q(W, D, z0);
  const b4 = q(-W, D, z0);
  const r1 = q(-W, 0, z0 + rh);
  const r2 = q(W, 0, z0 + rh);
  return faces(
    [
      [b4, b3, r2, r1],
      [b1, r1, r2, b2],
      [b1, b4, r1],
      [b2, r2, b3],
    ],
    [cx, cy, z0 + rh / 3],
    col,
    0.5,
    0.58,
  );
}

/** A flat quad (a door, a window) on the front (+y) face of a box. */
export function faceQuad(
  cx: number,
  cy: number,
  z0: number,
  d: number,
  a: number,
  u0: number,
  u1: number,
  z1: number,
  z2: number,
  col: string,
): Shape {
  const q = (lx: number, ly: number, z: number): Vec => {
    const [rx, ry] = rot(lx, ly, a);
    return [cx + rx, cy + ry, z];
  };
  const y = d / 2 + 0.1;
  return {
    points: pointsOf([q(u0, y, z0 + z1), q(u1, y, z0 + z1), q(u1, y, z0 + z2), q(u0, y, z0 + z2)]),
    fill: col,
  };
}

/** A seeded random draw (mulberry32), the same for the same seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A number from a text (a cell's key), for its seed. */
export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
