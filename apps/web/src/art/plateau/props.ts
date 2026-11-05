/**
 * The board's kit (docs/plan-plateau.md): a tile, and the models laid on it, in chart units. Each
 * adds its shapes to a scene, which draws the tiles back to front, then what lies on the ground,
 * then the volumes back to front.
 */
import {
  type Shape,
  TILT,
  type Vec,
  box,
  cone,
  faceQuad,
  gable,
  lightOf,
  pointsOf,
  prism,
  project,
  rng,
  shade,
} from "./geom.js";

/** The board's colours: the palette of the night board, the only ones it uses. */
export const C = {
  // The Jour board (decision of the owner, 4 November 2026, docs/design.md § Direction Jour): a
  // pastel day — your lands butter-cream, the lands seen pale sage, the sea and the unknown a soft
  // turquoise, warm earth under the tiles, terracotta roofs.
  land: "#EEDC98",
  landSide: "#D2BB78",
  landLine: "#D2BB78",
  soil: "#C79A6E",
  mist: "#DCE9E7",
  mistSide: "#C3D7D6",
  mistSoil: "#A9CDD2",
  water: "#8FD3DF",
  pine: "#5FAF7E",
  pineMuted: "#8DB79A",
  trunk: "#9A7048",
  rock: "#CBD0D6",
  rock2: "#B5BDC7",
  rockSeen: "#C3C9CF",
  rock2Seen: "#B0B8C1",
  snow: "#FFFFFF",
  snowSeen: "#F1F4F5",
  wall: "#FBF5EA",
  roof: "#D9714E",
  roofMuted: "#D2A08A",
  roofGold: "#F0C452",
  wood: "#C9A06A",
  brick: "#D27C57",
  door: "#5B4A3A",
  plot: "#E8C86E",
  green: "#7BD3A8",
  gold: "#E8B83E",
  /** The lands seen, not yours: pale sage. */
  seen: "#DCE3CF",
  /** The sky round the board, and the fog that melts its far edge into it. */
  sky: "#CFE4E6",
  /** The unknown: a plate a shade off the sky. */
  fog: "#D7EAEA",
  /** A sector the Casa may buy: its plate, and its « + ». */
  plate: "#F4EFDF",
  plus: "#E0A93A",
  plusOff: "#B9C6C6",
} as const;

export class Scene {
  private tiles: { depth: number; shapes: Shape[] }[] = [];
  private ground: Shape[] = [];
  private fog: Shape[] = [];
  private objs: { depth: number; shapes: Shape[] }[] = [];
  tile(depth: number, shapes: Shape[]) {
    this.tiles.push({ depth, shapes });
  }
  onGround(...shapes: Shape[]) {
    this.ground.push(...shapes);
  }
  dark(...shapes: Shape[]) {
    this.fog.push(...shapes);
  }
  add(depth: number, shapes: Shape[]) {
    this.objs.push({ depth, shapes });
  }
  /** Everything, in the order it is drawn. */
  shapes(): Shape[] {
    const by = (a: { depth: number }, b: { depth: number }) => a.depth - b.depth;
    return [
      ...this.fog,
      ...[...this.tiles].sort(by).flatMap((t) => t.shapes),
      ...this.ground,
      ...[...this.objs].sort(by).flatMap((o) => o.shapes),
    ];
  }
}

/** A pointy-top hex's corners (the map's grid, art/hexmap.ts), at a height. */
export function hexCorners(cx: number, cy: number, r: number, z: number): Vec[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z] as Vec;
  });
}

export type TileKind = "own" | "seen" | "water";
/** A tile's thickness: its land, then its night-blue footing (chart units). */
export const BAND = 4.2;

/**
 * A sector: a thick hex of two layers, its top softened. `wet` says which of its two front faces
 * touch more water (a lagoon is one water, without walls between).
 */
export function tile(
  sc: Scene,
  cx: number,
  cy: number,
  r: number,
  kind: TileKind,
  wet: [boolean, boolean] = [false, false],
) {
  const [top, side, soil] =
    kind === "own"
      ? [C.land, C.landSide, C.soil]
      : kind === "seen"
        ? [C.seen, C.landSide, C.soil]
        : [C.water, C.water, C.soil];
  const t0 = kind === "water" ? -1.6 : 0;
  const ri = r - 0.6;
  const out: Shape[] = [];
  const [sx, sy] = project([cx + 1.5, cy + 3, -2 * BAND]);
  out.push({
    points: ellipse(sx, sy, r * 1.02, r * TILT * 1.02),
    path: true,
    fill: "rgba(0,0,0,.28)",
  });
  // The two front faces: between the corners at 30°–90° and 90°–150°.
  for (const [zt, zb, col] of [
    [t0, -BAND, side],
    [-BAND, -2 * BAND, soil],
  ] as const) {
    const tp = hexCorners(cx, cy, ri, zt);
    const bt = hexCorners(cx, cy, ri, zb);
    // The faces whose normals point at 60° and 120°: towards the cells « 0,+1 » and « −1,+1 ».
    for (const [k, i] of [
      [0, 1],
      [1, 2],
    ] as const) {
      if (kind === "water" && wet[k]) continue;
      const f = [bt[i], bt[i + 1], tp[i + 1], tp[i]] as Vec[];
      const na = (60 * i * Math.PI) / 180;
      const fill = shade(col, lightOf([Math.cos(na), Math.sin(na), 0], 0.62, 0.42));
      out.push({
        points: pointsOf(f),
        fill,
        stroke: fill,
        strokeWidth: 0.8,
        opacity: kind === "water" && col === C.water ? 0.72 : undefined,
      });
    }
  }
  const tc = shade(top, 0.98);
  out.push({
    points: pointsOf(hexCorners(cx, cy, ri, t0)),
    fill: tc,
    stroke: tc,
    strokeWidth: 1.2,
    opacity: kind === "water" ? 0.7 : undefined,
  });
  if (kind === "own")
    out.push({
      points: pointsOf(hexCorners(cx, cy, ri - 1, t0)),
      fill: "none",
      stroke: C.landLine,
      strokeWidth: 0.35,
      strokeOpacity: 0.6,
    });
  if (kind !== "water") {
    const bk = hexCorners(cx, cy, ri - 0.3, t0);
    out.push({
      points: `M${pointsOf([bk[3] as Vec, bk[4] as Vec, bk[5] as Vec, bk[0] as Vec]).replace(/ /g, " L")}`,
      path: true,
      fill: "none",
      stroke: "#FFFFFF",
      strokeOpacity: 0.35,
      strokeWidth: 0.4,
    });
  } else {
    for (const [dx, dy] of [
      [-r * 0.3, -r * 0.1],
      [r * 0.2, r * 0.25],
    ] as const) {
      const [ax, ay] = project([cx + dx - 3, cy + dy, t0]);
      out.push({
        points: `M${ax.toFixed(1)} ${ay.toFixed(1)} q3 -1 6 0`,
        path: true,
        fill: "none",
        stroke: "#FFFFFF",
        strokeOpacity: 0.6,
        strokeWidth: 0.45,
        cls: "plateau-wave",
      });
    }
  }
  sc.tile(cy, out);
}

/** The unknown: a flat outline that breathes. */
export function fogTile(sc: Scene, cx: number, cy: number, r: number) {
  sc.dark({
    points: pointsOf(hexCorners(cx, cy, r - 1.2, 0)),
    fill: "rgba(110,200,245,.03)",
    stroke: "rgb(159,179,204)",
    strokeOpacity: 0.16,
    strokeWidth: 0.4,
    dash: "1.2 2",
    cls: "plateau-fog",
  });
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${(cx - rx).toFixed(1)} ${cy.toFixed(1)}a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(2 * rx).toFixed(1)} 0a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(-2 * rx).toFixed(1)} 0z`;
}

/** A soft contact shadow under a model (the light comes from the left). */
function shadow(sc: Scene, x: number, y: number, r: number) {
  const [cx, cy] = project([x + 1.2, y + 1.2, 0]);
  sc.onGround({ points: ellipse(cx, cy, r, r * TILT), path: true, fill: "rgba(14,26,43,.32)" });
}

export function pine(sc: Scene, x: number, y: number, s = 1, muted = false) {
  shadow(sc, x, y, 3 * s);
  const col = muted ? C.pineMuted : C.pine;
  sc.add(y, [
    ...prism(x, y, 0, 0.8 * s, 2 * s, 5, C.trunk),
    ...cone(x, y, 1.5 * s, 3.3 * s, 5 * s, 6, col),
    ...cone(x, y, 4.5 * s, 2.5 * s, 4.5 * s, 6, col, 0.8),
  ]);
}

export function rock(sc: Scene, x: number, y: number, s = 1, seed = 1, seen = false) {
  const r = rng(seed);
  shadow(sc, x, y, 3.5 * s);
  sc.add(
    y,
    prism(x, y, 0, 3.5 * s, 3 * s, 5, seen ? C.rockSeen : C.rock, {
      r2: 1.8 * s,
      a: seed,
      jit: Array.from({ length: 5 }, () => 0.8 + 0.4 * r()),
    }),
  );
}

export function mountain(sc: Scene, x: number, y: number, s = 1, seed = 3, seen = false) {
  const r = rng(seed);
  const j = Array.from({ length: 6 }, () => 0.85 + 0.3 * r());
  const [c1, c2, sn] = seen ? [C.rock2Seen, C.rockSeen, C.snowSeen] : [C.rock2, C.rock, C.snow];
  shadow(sc, x, y, 12 * s);
  sc.add(y, [
    ...prism(x, y, 0, 12 * s, 9 * s, 6, c1, { r2: 7.5 * s, a: 0.2, jit: j }),
    ...prism(x + s, y - s, 9 * s, 7.5 * s, 7 * s, 6, c2, { r2: 3.5 * s, a: 0.5, jit: j }),
    ...prism(x + 1.5 * s, y - 1.5 * s, 16 * s, 3.5 * s, 3 * s, 5, sn, { r2: 1.2 * s, a: 0.9 }),
  ]);
}

export function house(
  sc: Scene,
  x: number,
  y: number,
  s = 1,
  a = 0.5,
  roof: string = C.roof,
  chimney = true,
) {
  const w = 7 * s;
  const d = 5.5 * s;
  const h = 4.5 * s;
  shadow(sc, x, y, 4.5 * s);
  const out = box(x, y, 0, w, d, h, a, C.wall);
  out.push(faceQuad(x, y, 0, d, a, -s, s, 0, 2.8 * s, C.door));
  if (chimney) out.push(...box(x + 2 * s, y - s, h, 1.3 * s, 1.3 * s, 3.5 * s, a, C.rock));
  out.push(...gable(x, y, h, w, d, 3 * s, a, roof));
  sc.add(y, out);
}

export function tower(
  sc: Scene,
  x: number,
  y: number,
  s = 1,
  a = 0.5,
  h = 15,
  roof: string = C.roof,
) {
  shadow(sc, x, y, 2.5 * s);
  const out = box(x, y, 0, 3.5 * s, 3.5 * s, h * s, a, C.wall);
  out.push(faceQuad(x, y, 0, 3.5 * s, a, -0.7 * s, 0.7 * s, (h - 4) * s, (h - 1.5) * s, C.door));
  out.push(...cone(x, y, h * s, 2.8 * s, 4.5 * s, 4, roof, a + Math.PI / 4));
  sc.add(y, out);
}

/** A little gold flag, the house's mark (drawn flat, it flutters). */
export function flag(sc: Scene, x: number, y: number, z: number, s = 1) {
  const [px, py] = project([x, y, z]);
  const [, ty] = project([x, y, z + 8 * s]);
  sc.add(y + 0.1, [
    {
      points: `M${px.toFixed(1)} ${py.toFixed(1)}V${ty.toFixed(1)}`,
      path: true,
      fill: "none",
      stroke: "#22385A",
      strokeWidth: 0.6,
    },
    {
      points: `M${px.toFixed(1)} ${ty.toFixed(1)}h${5 * s}l${-1.5 * s} ${1.5 * s} ${1.5 * s} ${1.5 * s}h${-5 * s}z`,
      path: true,
      fill: C.gold,
      stroke: "#9A6514",
      strokeWidth: 0.25,
      cls: "plateau-flag",
    },
  ]);
}

/** The house's fondaco: a long warehouse with arcades, its gold roof and tower, its flag. */
export function fondaco(sc: Scene, x: number, y: number, s = 1) {
  const a = 0.45;
  shadow(sc, x, y, 9.5 * s);
  const out = box(x, y, 0, 15 * s, 10 * s, 7 * s, a, C.wall);
  for (const u of [-5, -1.75, 1.5])
    out.push(faceQuad(x, y, 0, 10 * s, a, u * s, (u + 2.25) * s, 0, 4 * s, C.door));
  out.push(...gable(x, y, 7 * s, 15 * s, 10 * s, 4.5 * s, a, C.roofGold));
  sc.add(y, out);
  tower(sc, x - 6.5 * s, y - 4.5 * s, s * 0.9, a, 17, C.roofGold);
  flag(sc, x - 6.5 * s, y - 4.5 * s, 21 * s * 0.9, s);
}

/** The brickworks' kiln, its chimney and its stacks; returns its chimney's top, for the smoke. */
export function kiln(sc: Scene, x: number, y: number, s = 1): [number, number] {
  shadow(sc, x, y, 5.5 * s);
  const out = prism(x, y, 0, 5 * s, 5.5 * s, 8, C.brick, { r2: 4 * s });
  out.push(...prism(x, y, 5.5 * s, 4 * s, 2.5 * s, 8, C.brick, { r2: 2 * s }));
  out.push(...prism(x + 0.5 * s, y - 0.5 * s, 7 * s, 1.3 * s, 9 * s, 6, C.brick, { r2: 1.1 * s }));
  out.push(faceQuad(x, y, 0, 8 * s, 0, -1.5 * s, 1.5 * s, 0, 3 * s, C.gold));
  sc.add(y, out);
  for (const [dx, dy] of [
    [6, 3],
    [7, -2],
  ] as const)
    sc.add(y + dy * s, [
      ...box(x + dx * s, y + dy * s, 0, 3.5 * s, 2.5 * s, 2 * s, 0.4, C.brick),
      ...box(x + dx * s, y + dy * s, 2 * s, 3.5 * s, 2.5 * s, 1.5 * s, 0.4, C.brick),
    ]);
  return project([x + 0.5 * s, y - 0.5 * s, 16 * s]);
}

export function barn(sc: Scene, x: number, y: number, s = 1) {
  const a = 0.5;
  shadow(sc, x, y, 7.5 * s);
  const out = box(x, y, 0, 12 * s, 9 * s, 6 * s, a, C.wood);
  out.push(faceQuad(x, y, 0, 9 * s, a, -2.5 * s, 2.5 * s, 0, 4.5 * s, C.door));
  out.push(...gable(x, y, 6 * s, 12 * s, 9 * s, 4.5 * s, a, C.roof));
  sc.add(y, out);
}

export function plots(sc: Scene, x: number, y: number, s = 1) {
  for (const [dx, dy, w, d] of [
    [-5, -4, 6, 4],
    [2.5, -4, 5, 4],
    [-4, 2, 4.5, 4.5],
    [3, 2.5, 6, 4.5],
  ] as const)
    sc.add(y + dy * s - 50, box(x + dx * s, y + dy * s, 0, w * s, d * s, s, 0.12, C.plot));
}

export function dock(sc: Scene, x: number, y: number, s = 1) {
  sc.add(y, [
    ...box(x, y, -1.5, 11 * s, 3.5 * s, 0.8 * s, 0.5, C.wood),
    ...box(x - 4 * s, y + 2 * s, -4, 0.8 * s, 0.8 * s, 3.2, 0, C.wood),
  ]);
}

/** A town of `size` 1 (a market town) to 5 (a capital), its houses around a tower. */
export function town(
  sc: Scene,
  x: number,
  y: number,
  size: number,
  seed: number,
  muted = false,
  k = 1,
) {
  const r = rng(seed);
  const roof = muted ? C.roofMuted : C.roof;
  const n = Math.min(5, 1 + size);
  const s = (0.75 + size * 0.06) * k;
  tower(sc, x + 2 * k, y - 3 * k, s, 0.4 + r(), 10 + size * 2.5, muted ? C.rockSeen : roof);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r();
    const d = (4 + r() * (2 + size)) * k;
    house(
      sc,
      x + Math.cos(ang) * d,
      y + Math.sin(ang) * d * 0.8,
      s * (0.8 + r() * 0.3),
      r() * 1.5,
      roof,
      r() > 0.4,
    );
  }
}

/** A ring at a town's foot: its orders, filling (lagoon), full (gold, a wave). */
export function ring(sc: Scene, x: number, y: number, r: number, frac: number, full = false) {
  const [cx, cy] = project([x, y, 0]);
  const rx = r;
  const ry = r * TILT;
  const col = full ? C.gold : C.green;
  const ang = ((-90 + 360 * frac) * Math.PI) / 180;
  sc.onGround(
    {
      points: ellipse(cx, cy, rx, ry),
      path: true,
      fill: full ? "rgba(244,197,84,.14)" : "rgba(110,224,184,.12)",
      stroke: "rgba(14,26,43,.4)",
      strokeWidth: 1.6,
    },
    {
      points: arc(cx, cy, rx, ry, frac),
      path: true,
      fill: "none",
      stroke: col,
      strokeWidth: 1.1,
    },
  );
  if (!full && frac > 0.02)
    sc.onGround({
      points: ellipse(cx + rx * Math.cos(ang), cy + ry * Math.sin(ang), 0.9, 0.9),
      path: true,
      fill: col,
    });
}

/** An arc of an ellipse from the top, clockwise, over `frac` of its turn. */
function arc(cx: number, cy: number, rx: number, ry: number, frac: number): string {
  const f = Math.min(0.999, Math.max(0, frac));
  const a1 = ((-90 + 360 * f) * Math.PI) / 180;
  const x0 = cx;
  const y0 = cy - ry;
  const x1 = cx + rx * Math.cos(a1);
  const y1 = cy + ry * Math.sin(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 ${f > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
