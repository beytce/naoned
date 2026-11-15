/**
 * An island in the Céladon direction (docs/plan-celadon.md C3): its quay (a hull, a deck of blond
 * planks), its tiles in the colour of their terrain, the plots one may buy, a site under way, and
 * the slides between two neighbours where one feeds the other.
 */
import type { IleTerrain } from "@comptoirs/engine";
import { Group, type Object3D } from "three";
import type { Palette } from "../materials.js";
import { cyl, dyn } from "../shapes.js";
import { BOARD, type CeladonTone, QUAY } from "../tokens.js";
import { C, bx, group, heap, planked, plate } from "./kit.js";
import { barge, bollard, crate, fir, planter, railing, rider, slide } from "./pieces.js";

const T = BOARD.tile;
const TERRAIN_TONE: Record<IleTerrain, CeladonTone> = {
  rive: "rive",
  argile: "argile",
  foret: "foret",
  pre: "pre",
  sable: "sable",
};

/** A tile of an island on its deck: its top at y = 0, in the colour of its terrain (`null`: paved). */
export function ileSlab(p: Object3D, terrain: IleTerrain | null): void {
  const w = T - QUAY.joint;
  bx(p, w, QUAY.tile, w, 0, -QUAY.tile, 0, C(terrain ? TERRAIN_TONE[terrain] : "stone"), 0.06);
  if (terrain) return;
  bx(p, w - 0.14, 0.01, 0.035, 0, -0.004, 0, C("stone2")).castShadow = false;
  bx(p, 0.035, 0.01, w - 0.14, 0, -0.004, 0, C("stone2")).castShadow = false;
}

/** What a free tile shows of its terrain. */
export function terrainMark(p: Object3D, terrain: IleTerrain): void {
  if (terrain === "foret") {
    const trees: [number, number, number][] = [
      [-1.6, -1.5, 1.1],
      [0.4, -1.8, 0.9],
      [1.7, -0.6, 1.0],
      [-0.6, 0.5, 0.85],
      [1.2, 1.5, 0.95],
    ];
    for (const [x, z, s] of trees) fir(p, x, z, s);
  } else if (terrain === "rive") {
    bx(p, T - QUAY.joint, 0.06, 1.6, 0, -0.02, 2.15, C("water")).castShadow = false;
    bx(p, T - QUAY.joint, 0.2, 0.2, 0, 0, 1.3, C("porcelain"), 0.05);
    bx(p, 0.7, 0.12, 1.5, 1.4, 0.02, 2.1, C("blond"), 0.03);
    bollard(p, -1.6, 0, 0.9);
  } else if (terrain === "sable") {
    for (const [x, z, r] of [
      [-1.2, -1, 1.0],
      [1.1, 0.4, 0.8],
      [-0.3, 1.4, 0.6],
    ] as const)
      heap(p, r, x, 0, z, C("sand"), 0.4);
  } else if (terrain === "argile") {
    bx(p, 2.6, 0.08, 1.9, -0.5, 0, -0.4, C("brick"), 0.2).castShadow = false;
    for (const [x, z, r] of [
      [1.4, 1.1, 0.5],
      [0.9, 1.6, 0.35],
      [-1.5, 1.3, 0.4],
    ] as const)
      heap(p, r, x, 0, z, C("brick"), 0.6);
  } else {
    for (let k = -2; k <= 2; k++) {
      bx(p, 4.6, 0.09, 0.3, 0, 0, k * 0.95, C("leaf2"), 0.04).castShadow = false;
      for (let j = -4; j <= 4; j++) heap(p, 0.11, j * 0.5, 0.12, k * 0.95, C("leaf"), 1.2);
    }
  }
}

/** A plot one may buy: a pale plate of its terrain on the deck, dashed round its edge. */
export function ilePlot(p: Object3D, terrain: IleTerrain): void {
  const w = T - 0.7;
  bx(p, w, 0.08, w, 0, -QUAY.tile, 0, C(TERRAIN_TONE[terrain], true), 0.03);
  const n = 7;
  const st = w / n;
  for (let k = 0; k < n; k++) {
    const at = -w / 2 + st * (k + 0.5);
    for (const s of [-1, 1]) {
      bx(p, st * 0.5, 0.04, 0.1, at, -QUAY.tile + 0.08, (s * w) / 2, C("shade"));
      bx(p, 0.1, 0.04, st * 0.5, (s * w) / 2, -QUAY.tile + 0.08, at, C("shade"));
    }
  }
}

/** A site under way: four poles, two beams, a hoist, crates. */
export function scaffold(p: Object3D): void {
  for (const x of [-1.6, 1.6])
    for (const z of [-1.6, 1.6]) {
      bx(p, 0.14, 3.0, 0.14, x, 0, z, C("blond"));
      bx(p, 0.3, 0.08, 0.3, x, 0, z, C("ink"));
    }
  for (const z of [-1.6, 1.6]) bx(p, 3.5, 0.14, 0.14, 0, 2.9, z, C("blond2"));
  for (const x of [-1.6, 1.6]) bx(p, 0.14, 0.14, 3.5, x, 1.6, 0, C("blond2"));
  bx(p, 0.12, 0.12, 3.4, 0.4, 3.04, 0, C("celadon"));
  cyl(p, 0.012, 0.012, 1.2, 0.4, 1.84, 0.3, C("ink"), 5);
  crate(p, 0.4, 1.5, 0.3, 0.4);
  crate(p, -0.9, 0, 0.8);
  crate(p, -0.35, 0, 1.0);
}

/**
 * The quay under an island whose tiles span `nx` by `nz`, centred on the origin: the hull, the
 * planked deck, its planters, bollards and railings, a barge moored at the player's pennant.
 */
export function quay(P: Palette, nx: number, nz: number): Group {
  const g = new Group();
  const w = nx * T + QUAY.margin * 2;
  const d = nz * T + QUAY.margin * 2;
  const top = -QUAY.tile;
  const r = QUAY.corner;
  plate(g, w - 1.2, d - 1.2, r - 0.2, 0.5, top - QUAY.deck - QUAY.hull - 0.4, C("stone2"), 0.1);
  plate(
    g,
    w - 0.5,
    d - 0.5,
    r - 0.1,
    QUAY.hull + 0.05,
    top - QUAY.deck - QUAY.hull,
    C("porcelain"),
    0.2,
  );
  plate(g, w, d, r, QUAY.deck, top - QUAY.deck, C("blond"), 0.14);
  planked(g, w - 0.3, d - 0.3, r - 0.15, top + 0.002);
  // grilles in the hull, on the two sides one sees
  const hy = top - QUAY.deck - 1.3;
  for (const face of ["z", "x"] as const) {
    const len = face === "z" ? w : d;
    const n = Math.max(2, Math.round(len / 5));
    for (let k = 0; k < n; k++) {
      const at = -len / 2 + r + ((len - 2 * r) * k) / (n - 1);
      const f = group(
        g,
        face === "z" ? at : w / 2 - 0.27,
        hy,
        face === "z" ? d / 2 - 0.27 : at,
        face === "x" ? Math.PI / 2 : 0,
      );
      bx(f, 1.7, 0.6, 0.06, 0, 0, 0.02, C("celadon2"), 0.05);
      for (let j = -3; j <= 3; j++) bx(f, 0.1, 0.42, 0.04, j * 0.22, 0.09, 0.06, C("ink"));
    }
  }
  const ex = w / 2 - 1.3;
  const ez = d / 2 - 1.3;
  for (const [x, z] of [
    [-ex, -ez],
    [ex, -ez],
    [-ex, ez],
    [ex, ez],
  ] as const)
    planter(g, x, top, z);
  railing(g, -w / 2 + r + 1, -d / 2 + 0.6, w / 2 - r - 1, -d / 2 + 0.6, top);
  railing(g, -w / 2 + 0.6, -d / 2 + r + 1, -w / 2 + 0.6, d / 2 - r - 1, top);
  for (let x = -w / 2 + r + 1; x <= w / 2 - r - 1; x += 3.5) bollard(g, x, top, d / 2 - 0.7);
  for (let z = -d / 2 + r + 1; z <= d / 2 - r - 1; z += 3.5) bollard(g, w / 2 - 0.7, top, z);
  crate(g, ex - 0.2, top, 2.0);
  crate(g, ex - 0.2, top, 2.6);
  barge(P, g, w / 2 + 1.7, QUAY.waterY, 1.5, Math.PI / 2 + 0.1, true, 1.5);
  return g;
}

export interface SlideBuilt {
  group: Group;
  /** What rides it, and how to place a rider at `u` (0 at the supplier, 1 at the workshop it feeds). */
  riders: Group[];
  place: (rider: Group, u: number) => void;
}

/** How far a slide reaches into each of its two tiles. */
const REACH = T / 2 - (T / 2) * 0.78 + 0.4;

/**
 * The slide from a tile to its neighbour, in the island's space (`a` and `b` are the tiles'
 * centres), with two of the good's objects riding it.
 */
export function ileSlide(a: [number, number], b: [number, number], good: string): SlideBuilt {
  const dx = Math.sign(b[0] - a[0]);
  const dz = Math.sign(b[1] - a[1]);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const g = new Group();
  slide(g, mx - dx * REACH, mz - dz * REACH, mx + dx * REACH, mz + dz * REACH, QUAY.slideY);
  const riders = [0, 1].map(() => {
    const r = dyn(group(g, 0, QUAY.slideY + 0.12, 0, dx ? 0 : Math.PI / 2));
    r.scale.setScalar(0.85);
    rider(r, good);
    return r;
  });
  const run = REACH - 0.3;
  return {
    group: g,
    riders,
    place: (r, u) => {
      const t = (u * 2 - 1) * run;
      r.position.x = mx + dx * t;
      r.position.z = mz + dz * t;
    },
  };
}
