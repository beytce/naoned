/**
 * The buildings of an island in the Céladon direction (docs/plan-celadon.md C2): each workshop
 * shows what comes in, what works, what goes out; its level adds to it. A model is drawn in a
 * square of five across and set at `MODEL_SCALE` on its tile, so that the slides between
 * neighbours (ile.ts) find the tile's edges free. The Fondaco, the Arsenal and the works of
 * prestige, which no slide reaches, fill their tile.
 */
import { ConeGeometry, Group, type Material, type Mesh, type Object3D } from "three";
import type { Palette } from "../materials.js";
import { cached, cone, cyl, dome, dyn, put } from "../shapes.js";
import { C, bx, glowing, group, heap, ring, rod } from "./kit.js";
import {
  barge,
  barrel,
  bollard,
  bottle,
  coil,
  crate,
  fir,
  glassTray,
  log,
  sack,
  slide,
  stack,
  trestle,
  tub,
} from "./pieces.js";

export interface WorkshopOpts {
  /** 1 to 3: what the level adds is seen. */
  level: number;
  seed: number;
}
export interface WorkshopBuilt {
  group: Group;
  /** How high its pin stands. */
  top: number;
  /** What turns while it works (a wheel, sails): called at each frame while it runs. */
  tick?: (t: number) => void;
}
export type WorkshopMaker = (P: Palette, o: WorkshopOpts) => WorkshopBuilt;

/** A workshop's model against its tile: the edges stay free for the slides. */
export const MODEL_SCALE = 0.78;

/* ---------- parts ---------- */

/** A dark arched opening on a face (`z`: the face looks to +z; `x`: to +x). */
function arch(p: Object3D, x: number, y: number, z: number, w: number, h: number, face: "x" | "z") {
  const m = C("shade");
  const t = 0.06;
  if (face === "z") {
    bx(p, w, h, t, x, y, z, m).castShadow = false;
    rod(p, w / 2, t, x, y + h, z, "z", m, 14).castShadow = false;
  } else {
    bx(p, t, h, w, x, y, z, m).castShadow = false;
    rod(p, w / 2, t, x, y + h, z, "x", m, 14).castShadow = false;
  }
}

/** A hip roof: a four-sided pyramid over a w×d block. */
function hip(
  p: Object3D,
  w: number,
  d: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
): Mesh {
  const m = put(
    p,
    cached("celadon:hip", () => new ConeGeometry(1, 1, 4, 1)),
    mat,
    x,
    y + h / 2,
    z,
  );
  m.rotation.y = Math.PI / 4;
  m.scale.set(w * 0.72, h, d * 0.72);
  return m;
}

/** A pitched roof, its ridge along x: two battened slabs, a ridge beam. Its eaves at y. */
function pitched(
  p: Object3D,
  len: number,
  span: number,
  x: number,
  y: number,
  z: number,
  tone: "roof" | "blond" = "roof",
) {
  const tilt = 0.52;
  const half = span / 2 / Math.cos(tilt) + 0.15;
  for (const s of [-1, 1]) {
    const r = group(p, x, y + (Math.sin(tilt) * half) / 2 + 0.02, z + (s * span) / 4);
    r.rotation.x = s * tilt;
    bx(r, len, 0.12, half, 0, 0, 0, C(tone), 0.04);
    for (let k = -Math.floor(len / 1.3); k <= Math.floor(len / 1.3); k++)
      bx(r, 0.05, 0.03, half - 0.04, k * 0.6, 0.12, 0, C("trim"));
  }
  bx(p, len, 0.1, 0.16, x, y + Math.sin(tilt) * half - 0.02, z, C("trim"), 0.04);
}

/** Four posts on ink feet under a frame of beams: an open shed, `h` high. */
function posts(p: Object3D, x0: number, x1: number, z0: number, z1: number, h: number) {
  for (const x of [x0, x1])
    for (const z of [z0, z1]) {
      bx(p, 0.16, h, 0.16, x, 0, z, C("blond"), 0.03);
      bx(p, 0.3, 0.1, 0.3, x, 0, z, C("ink"));
    }
  for (const z of [z0, z1]) bx(p, x1 - x0 + 0.3, 0.12, 0.12, (x0 + x1) / 2, h, z, C("blond2"));
}

/** A table on celadon legs, a shelf under it. */
function bench(p: Object3D, w: number, d: number, h = 0.8) {
  bx(p, w, 0.1, d, 0, h, 0, C("blond"), 0.03);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1])
    for (const z of [-d / 2 + 0.1, d / 2 - 0.1]) {
      bx(p, 0.1, h, 0.1, x, 0, z, C("celadon"));
      bx(p, 0.22, 0.06, 0.22, x, 0, z, C("ink"));
    }
  bx(p, w - 0.2, 0.06, d - 0.2, 0, h * 0.38, 0, C("celadon2"));
}

/** A kiln's mouth on a face: a porcelain frame, an ink hollow, the fire. */
function mouth(p: Object3D, off: number, y = 0.42) {
  bx(p, 0.72, 0.5, 0.2, 0, y, off, C("porcelain"), 0.04);
  rod(p, 0.36, 0.2, 0, y + 0.5, off, "z", C("porcelain"), 16);
  bx(p, 0.5, 0.42, 0.06, 0, y + 0.08, off + 0.09, C("ink"));
  rod(p, 0.25, 0.06, 0, y + 0.5, off + 0.09, "z", C("ink"), 14);
  bx(p, 0.36, 0.2, 0.05, 0, y + 0.08, off + 0.11, glowing());
  bx(p, 0.9, 0.08, 0.36, 0, y - 0.06, off + 0.16, C("trim"));
}

/** A crane: a post on its foot, a braced jib turned by `rot`, a rope, a bucket. */
function crane(p: Object3D, x: number, z: number, rot: number, fill: "sand" | "brick" | "salt") {
  bx(p, 0.5, 0.14, 0.5, x, 0, z, C("ink"), 0.03);
  bx(p, 0.18, 2.6, 0.18, x, 0.1, z, C("celadon"), 0.04);
  const jib = group(p, x, 2.6, z, rot);
  bx(jib, 2.6, 0.14, 0.14, -0.9, 0, 0, C("celadon"), 0.03);
  bx(jib, 0.3, 0.3, 0.3, 0.45, -0.1, 0, C("celadon2"), 0.05);
  cyl(jib, 0.012, 0.012, 1.3, -2.0, -1.3, 0, C("ink"), 5);
  cyl(jib, 0.2, 0.15, 0.26, -2.0, -1.55, 0, C("celadon2"), 12);
  heap(jib, 0.18, -2.0, -1.3, 0, C(fill), 0.5);
  const br = bx(jib, 0.08, 1.4, 0.08, -0.45, -1.2, 0, C("celadon2"));
  br.rotation.z = -0.6;
}

function wheelbarrow(
  p: Object3D,
  x: number,
  z: number,
  rot: number,
  fill: "sand" | "brick" | "salt",
) {
  const wb = group(p, x, 0, z, rot);
  bx(wb, 0.7, 0.26, 0.5, 0, 0.2, 0, C("blond"), 0.05);
  heap(wb, 0.24, 0, 0.44, 0, C(fill), 0.5);
  rod(wb, 0.16, 0.08, -0.45, 0.16, 0, "z", C("ink"), 12);
  for (const z2 of [-0.2, 0.2]) bx(wb, 0.6, 0.04, 0.04, 0.6, 0.36, z2, C("blond2"));
}

const built = (group: Group, top: number, tick?: (t: number) => void): WorkshopBuilt => ({
  group,
  top,
  ...(tick ? { tick } : {}),
});
/** A workshop's group, at the scale that leaves its tile's edges free. */
const scaled = (): Group => {
  const g = new Group();
  g.scale.setScalar(MODEL_SCALE);
  return g;
};

/* ---------- the raw ---------- */

export const lumberCamp: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  const trees: [number, number, number][] = [
    [-2.1, -2.1, 1.25],
    [-0.6, -2.3, 1.05],
    [0.9, -2.0, 1.3],
    [2.2, -2.3, 1.0],
    [-2.3, -0.5, 1.0],
    [2.3, -0.7, 0.85],
  ];
  for (const [x, z, s] of trees) fir(p, x, z, s);
  if (level >= 3) fir(p, 2.2, 0.9, 0.9);
  for (const [x, z] of [
    [-1.2, -0.9],
    [0.3, -1.1],
  ] as const) {
    cyl(p, 0.2, 0.24, 0.18, x, 0, z, C("blond2"), 12);
    cyl(p, 0.15, 0.15, 0.012, x, 0.18, z, C("blond"), 12);
  }
  // the axe in its stump
  const ax = group(p, 0.3, 0.18, -1.1);
  ax.rotation.z = -0.5;
  bx(ax, 0.05, 0.6, 0.05, 0, 0, 0, C("blond"));
  bx(ax, 0.2, 0.14, 0.04, 0.07, 0.02, 0, C("slate"));
  // the pile of logs between its stakes, higher with the level
  const pile = group(p, -1.5, 0, 1.2);
  for (const x of [-0.62, 0.62])
    for (const z of [-0.55, 0.55]) bx(pile, 0.1, 0.5, 0.1, x, 0, z, C("celadon"));
  for (let row = 0; row < 1 + level; row++)
    for (let k = 0; k < 4 - row; k++)
      log(pile, -0.48 + row * 0.16 + k * 0.32, row * 0.27, 0, 1.3, 0.15, "z");
  // the sawbuck
  const sb = group(p, 0.5, 0, 0.5);
  for (const s of [-0.4, 0.4])
    for (const a of [-0.5, 0.5]) {
      const l = bx(sb, 0.07, 0.75, 0.07, s, 0, a * 0.1, C("celadon"));
      l.rotation.x = a;
    }
  log(sb, 0, 0.5, 0, 1.3, 0.14, "x");
  if (level >= 2) crate(p, 1.9, 0, 1.9);
  return built(p, 3.1);
};

export const sandPit: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  const rim = C("porcelain");
  bx(p, 3.6, 0.3, 0.2, -0.8, 0, -2.5, rim, 0.05);
  bx(p, 3.6, 0.3, 0.2, -0.8, 0, 0.3, rim, 0.05);
  bx(p, 0.2, 0.3, 3.0, -2.6, 0, -1.1, rim, 0.05);
  bx(p, 0.2, 0.3, 3.0, 1.0, 0, -1.1, rim, 0.05);
  const heaps: [number, number, number][] = [
    [-1.6, -1.5, 0.95],
    [-0.2, -1.0, 0.8],
    [-1.1, -0.4, 0.6],
    [0.3, -1.9, 0.5],
  ];
  for (const [x, z, r] of heaps) heap(p, r, x, 0.05, z, C("sand"), 0.55);
  crane(p, 2.0, -2.2, 0.5, "sand");
  // the sieve
  const sv = group(p, -1.9, 0, 1.7);
  sv.rotation.z = -0.5;
  bx(sv, 0.9, 0.06, 1.1, 0, 0.5, 0, C("blond"));
  bx(sv, 0.74, 0.07, 0.94, 0, 0.5, 0, C("shade"));
  for (const z of [1.25, 2.15]) bx(p, 0.08, 0.75, 0.08, -1.5, 0, z, C("blond2"));
  heap(p, 0.4, -2.3, 0, 1.7, C("sand"), 0.45);
  // tubs filled, waiting: more with the level
  const tubs: [number, number][] = [
    [0.4, 2.3],
    [1.05, 2.3],
    [0.72, 1.75],
    [1.7, 2.3],
    [1.4, 1.75],
  ];
  for (const [x, z] of tubs.slice(0, 1 + level * 1.5)) tub(p, x, 0, z);
  wheelbarrow(p, 2.2, 0.2, 0.4, "sand");
  return built(p, 3.2);
};

export const clayPit: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the pit, cut in steps
  cyl(p, 2.0, 2.1, 0.22, -0.5, 0, -0.8, C("brick"), 28);
  cyl(p, 1.45, 1.5, 0.16, -0.5, 0.2, -0.8, C("argile"), 28).castShadow = false;
  cyl(p, 0.9, 0.95, 0.12, -0.5, 0.34, -0.8, C("brick"), 24).castShadow = false;
  for (const [x, z, r] of [
    [-1.6, -1.9, 0.5],
    [0.6, -2.0, 0.45],
    [-0.6, -0.7, 0.42],
  ] as const)
    heap(p, r, x, 0.3, z, C("brick"), 0.6);
  crane(p, 2.0, -2.2, 0.55, "brick");
  // a ladder down, a spade stuck in
  const ld = group(p, 0.9, 0, 0.2);
  ld.rotation.z = 0.35;
  for (const z of [-0.18, 0.18]) bx(ld, 0.05, 1.3, 0.05, 0, 0, z, C("blond2"));
  for (let k = 0; k < 5; k++) bx(ld, 0.04, 0.04, 0.36, 0, 0.2 + k * 0.24, 0, C("blond"));
  bx(p, 0.05, 0.8, 0.05, -1.6, 0.3, -0.2, C("blond"));
  bx(p, 0.2, 0.26, 0.03, -1.6, 0.25, -0.2, C("slate"));
  // tubs of clay, a barrow
  const tubs: [number, number][] = [
    [-2.0, 2.2],
    [-1.35, 2.2],
    [-1.7, 1.65],
    [-0.7, 2.25],
    [-1.0, 1.7],
  ];
  for (const [x, z] of tubs.slice(0, 1 + level * 1.5)) tub(p, x, 0, z, "brick");
  wheelbarrow(p, 1.6, 1.8, -0.5, "brick");
  return built(p, 3.2);
};

export const farm: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the barn at the back
  bx(p, 2.4, 1.3, 1.6, 1.2, 0, -1.7, C("porcelain"), 0.06);
  pitched(p, 2.7, 1.9, 1.2, 1.3, -1.7);
  arch(p, 1.2, 0, -0.9 + 0.005, 0.7, 0.6, "z");
  bx(p, 0.34, 0.3, 0.05, 2.0, 0.6, -0.89, C("shade")).castShadow = false;
  // the furrows of wheat
  for (let k = 0; k < 4; k++) {
    const z = 0.1 + k * 0.7;
    bx(p, 4.4, 0.08, 0.3, -0.1, 0, z, C("blond2"), 0.03).castShadow = false;
    for (let j = 0; j < 10; j++) cyl(p, 0.1, 0.06, 0.34, -2.1 + j * 0.44, 0.06, z, C("wheat"), 6);
  }
  // sheaves, a stack of hay, sacks
  cone(p, 0.6, 0.95, -1.9, 0, -1.9, C("wheat"), 14);
  if (level >= 2) cone(p, 0.5, 0.8, -0.8, 0, -2.1, C("wheat"), 14);
  if (level >= 3) cone(p, 0.45, 0.7, -1.4, 0, -1.0, C("wheat"), 14);
  sack(p, -0.2, 0, -0.8, "wheat");
  sack(p, 0.25, 0, -0.65, "wheat");
  // a fence along the back
  for (let k = 0; k < 4; k++) bx(p, 0.08, 0.5, 0.08, -2.5 + k * 0.6, 0, -2.6, C("blond2"));
  bx(p, 2.0, 0.06, 0.05, -1.6, 0.36, -2.6, C("blond"));
  return built(p, 2.9);
};

export const saltPans: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // four pans between porcelain dykes, the water drying in them
  for (const [i, j] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    const x = -1.25 + i * 2.2;
    const z = -1.4 + j * 2.0;
    bx(p, 2.1, 0.2, 1.9, x, 0, z, C("porcelain"), 0.05);
    bx(p, 1.8, 0.03, 1.6, x, 0.19, z, C((i + j) % 2 ? "salt" : "water")).castShadow = false;
    if ((i + j) % 2)
      for (let k = 0; k < 2 + level; k++)
        cone(
          p,
          0.26,
          0.36,
          x - 0.5 + (k % 3) * 0.5,
          0.2,
          z - 0.3 + Math.floor(k / 3) * 0.6,
          C("salt"),
          12,
        );
  }
  // the sluice
  bx(p, 0.12, 0.9, 0.12, -2.4, 0, -0.4, C("celadon"));
  bx(p, 0.12, 0.9, 0.12, -2.4, 0, 0.3, C("celadon"));
  bx(p, 0.14, 0.12, 0.9, -2.4, 0.86, -0.05, C("celadon2"));
  bx(p, 0.05, 0.5, 0.6, -2.4, 0.2, -0.05, C("slate"));
  // a rake, tubs of salt
  const rk = group(p, 2.3, 0, -2.3);
  rk.rotation.z = 0.3;
  bx(rk, 0.05, 1.5, 0.05, 0, 0, 0, C("blond"));
  bx(rk, 0.05, 0.06, 0.6, 0, 0, 0, C("blond2"));
  tub(p, 2.25, 0, 2.3, "salt");
  tub(p, 1.6, 0, 2.3, "salt");
  if (level >= 2) tub(p, 1.9, 0, 1.75, "salt");
  return built(p, 1.9);
};

export const hempField: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the rows of hemp, tall
  for (let k = 0; k < 4; k++) {
    const z = -2.2 + k * 0.75;
    bx(p, 4.6, 0.08, 0.34, 0, 0, z, C("leaf2"), 0.03).castShadow = false;
    for (let j = 0; j < 11; j++)
      cyl(p, 0.07, 0.1, 0.8 + ((j * 7 + k * 3) % 4) * 0.08, -2.1 + j * 0.42, 0.06, z, C("leaf"), 6);
  }
  // the retting pond
  bx(p, 2.4, 0.22, 1.5, -1.2, 0, 1.6, C("porcelain"), 0.06);
  bx(p, 2.1, 0.03, 1.2, -1.2, 0.21, 1.6, C("water")).castShadow = false;
  for (const x of [-1.7, -1.1]) rod(p, 0.1, 0.9, x, 0.26, 1.6, "z", C("leaf2"), 8);
  // the drying rack, its bundles
  for (const x of [0.8, 2.4]) bx(p, 0.1, 1.2, 0.1, x, 0, 1.6, C("celadon"));
  rod(p, 0.04, 1.8, 1.6, 1.16, 1.6, "x", C("celadon2"), 8);
  for (let k = 0; k < 2 + level; k++)
    bx(p, 0.16, 0.8, 0.12, 0.95 + k * 0.32, 0.36, 1.6, C("wheat"), 0.05);
  return built(p, 2.2);
};

/* ---------- the worked ---------- */

export const sawmill: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the mill race at the back, and its wheel
  bx(p, 5.0, 0.06, 1.2, 0, 0, -2.0, C("water"), 0.02).castShadow = false;
  bx(p, 5.0, 0.22, 0.14, 0, 0, -1.35, C("porcelain"), 0.04);
  const wheel = dyn(group(p, 1.0, 1.05, -2.0));
  ring(wheel, 1.0, 0.07, 0, 0, -0.22, C("celadon"), "z");
  ring(wheel, 1.0, 0.07, 0, 0, 0.22, C("celadon"), "z");
  for (let k = 0; k < 8; k++) {
    const s = group(wheel);
    s.rotation.z = (k * Math.PI) / 4;
    bx(s, 0.07, 1.0, 0.07, 0, 0, -0.22, C("celadon2"));
    bx(s, 0.07, 1.0, 0.07, 0, 0, 0.22, C("celadon2"));
    bx(s, 0.34, 0.05, 0.52, 0, 0.98, 0, C("blond"));
  }
  rod(wheel, 0.09, 1.3, 0, 0, 0.3, "z", C("ink"), 10);
  bx(p, 0.16, 1.1, 0.16, 1.0, 0, -1.35, C("porcelain"), 0.03);
  // the shed
  posts(p, -1.7, 1.9, -1.1, 1.0, 2.1);
  pitched(p, 4.3, 2.5, 0.1, 2.1, -0.05);
  // the saw frame
  bx(p, 0.14, 1.5, 0.14, 0.1, 0, -0.65, C("celadon"), 0.03);
  bx(p, 0.14, 1.5, 0.14, 0.1, 0, 0.55, C("celadon"), 0.03);
  bx(p, 0.18, 0.14, 1.4, 0.1, 1.5, -0.05, C("celadon2"), 0.03);
  bx(p, 0.03, 1.0, 0.4, 0.1, 0.6, -0.05, C("slate"));
  rod(p, 0.05, 1.0, 0.1, 1.0, -0.9, "z", C("ink"), 8);
  // the bed through the saw: a log going in, planks coming out
  slide(p, -2.5, -0.05, 2.5, -0.05, 0.7);
  log(p, -1.5, 0.82, -0.05, 1.3, 0.16, "x");
  for (const z of [-0.2, -0.05, 0.1]) bx(p, 1.1, 0.05, 0.13, 1.3, 0.83, z, C("blond"), 0.01);
  // the stacks of planks, sawdust
  stack(p, 1.5, 0, 2.05, 2 + level);
  if (level >= 3) stack(p, -0.5, 0, 2.1, 3);
  heap(p, 0.3, -1.9, 0, 1.9, C("sand"), 0.4);
  heap(p, 0.2, -1.5, 0, 2.2, C("sand"), 0.4);
  return built(p, 3.6, (t) => {
    wheel.rotation.z = -t * 0.9;
  });
};

export const glassworks: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the furnace: a brick base, banded, a dome, its mouths alight, a chimney
  const f = group(p, -0.5, 0, -1.2);
  cyl(f, 1.3, 1.36, 0.9, 0, 0, 0, C("brick"), 28);
  ring(f, 1.33, 0.05, 0, 0.9, 0, C("celadon"));
  ring(f, 1.36, 0.045, 0, 0.25, 0, C("celadon"));
  dome(f, 1.26, 0, 0.92, 0, C("brick"));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    cyl(f, 0.04, 0.04, 0.03, Math.cos(a) * 1.36, 0.56, Math.sin(a) * 1.36, C("celadon2"), 6);
  }
  cyl(f, 0.3, 0.36, 0.9, -0.3, 1.85, -0.3, C("porcelain"), 16);
  cyl(f, 0.38, 0.38, 0.1, -0.3, 2.72, -0.3, C("celadon"), 16);
  cyl(f, 0.22, 0.22, 0.04, -0.3, 2.82, -0.3, C("ink"), 14);
  for (const a of [0, Math.PI / 2]) mouth(group(f, 0, 0, 0, a), 1.24);
  // the bench: blowpipes, pieces cooling
  const b = group(p, 1.75, 0, -0.9);
  bench(b, 1.1, 2.0);
  for (let k = 0; k < 2 + level; k++) bottle(b, -0.2 + (k % 2) * 0.35, 0.9, -0.75 + k * 0.28, 1.1);
  cyl(b, 0.16, 0.1, 0.2, 0.15, 0.9, 0.75, C("glass"), 12);
  rod(b, 0.02, 1.5, -0.38, 0.94, 0.1, "z", C("ink"), 5);
  heap(b, 0.08, -0.38, 0.94, -0.65, glowing(), 1);
  crate(b, 0, 0.36, -0.4, 0.4);
  // the rack of finished glass, fuller with the level
  const r = group(p, 2.3, 0, 1.5);
  for (const z of [-0.5, 0.5]) bx(r, 0.1, 1.5, 0.1, 0, 0, z, C("celadon"));
  for (let l = 0; l < 3; l++) {
    bx(r, 0.36, 0.05, 1.1, 0, 0.3 + l * 0.48, 0, C("blond"));
    if (l < level) for (let k = 0; k < 4; k++) bottle(r, 0, 0.35 + l * 0.48, -0.38 + k * 0.25, 0.9);
  }
  // sand for the pot, wood for the fire, a bucket
  const h = group(p, -2.1, 0, 1.3);
  for (const [x, z] of [
    [-0.35, -0.35],
    [0.35, -0.35],
    [-0.35, 0.35],
    [0.35, 0.35],
  ] as const)
    bx(h, 0.1, 1.2, 0.1, x, 0, z, C("celadon"));
  const fn = cyl(h, 0.55, 0.18, 0.6, 0, 0.85, 0, C("celadon2"), 4);
  fn.rotation.y = Math.PI / 4;
  bx(h, 0.92, 0.1, 0.92, 0, 1.4, 0, C("celadon"), 0.03);
  heap(h, 0.36, 0, 1.45, 0, C("sand"), 0.5);
  for (let k = 0; k < 3; k++) log(p, -2.2, 0, -2.4 + k * 0.3, 0.8, 0.13, "x");
  for (let k = 0; k < 2; k++) log(p, -2.2, 0.24, -2.25 + k * 0.3, 0.8, 0.13, "x");
  cyl(p, 0.18, 0.15, 0.26, 0.7, 0, 0.9, C("celadon2"), 12);
  cyl(p, 0.15, 0.15, 0.01, 0.7, 0.25, 0.9, C("water"), 12).castShadow = false;
  glassTray(p, 0.2, 0, 2.0);
  return built(p, 3.9);
};

export const mill: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the tower, its cap, its door
  cyl(p, 1.0, 1.25, 2.6, 0.3, 0, -0.9, C("porcelain"), 24);
  ring(p, 1.12, 0.05, 0.3, 1.3, -0.9, C("celadon"));
  cone(p, 1.2, 1.0, 0.3, 2.6, -0.9, C("roof"), 24);
  arch(p, 0.3, 0, 0.36, 0.5, 0.6, "z");
  bx(p, 0.26, 0.3, 0.06, 0.3, 1.6, 0.08, C("shade")).castShadow = false;
  // the sails, turning toward the camera's side
  rod(p, 0.09, 0.7, 0.3, 2.5, 0.3, "z", C("ink"), 8);
  const sails = dyn(group(p, 0.3, 2.5, 0.62));
  for (let k = 0; k < 4; k++) {
    const s = group(sails);
    s.rotation.z = (k * Math.PI) / 2 + 0.3;
    bx(s, 0.07, 1.9, 0.05, 0, 0, 0, C("celadon"));
    bx(s, 0.5, 1.3, 0.03, 0.28, 0.5, 0, C("trim"));
    for (let j = 0; j < 4; j++) bx(s, 0.5, 0.03, 0.04, 0.28, 0.6 + j * 0.34, 0.01, C("celadon2"));
  }
  cyl(sails, 0.14, 0.14, 0.12, 0, -0.06, 0, C("celadon2"), 10).rotation.x = Math.PI / 2;
  // a millstone, sacks of flour: more with the level
  const ms = cyl(p, 0.42, 0.42, 0.16, -1.8, 0.42, -0.6, C("stone2"), 18);
  ms.rotation.z = Math.PI / 2;
  ms.rotation.y = 0.5;
  bx(p, 0.5, 0.1, 0.3, -1.8, 0, -0.6, C("ink"));
  const sacks: [number, number][] = [
    [1.9, 0.9],
    [2.3, 0.6],
    [1.7, 1.5],
    [2.25, 1.3],
    [1.3, 1.1],
  ];
  for (const [x, z] of sacks.slice(0, 1 + level * 1.5)) sack(p, x, 0, z, "trim");
  sack(p, -1.9, 0, 1.6, "wheat");
  sack(p, -1.4, 0, 1.8, "wheat");
  bench(group(p, -0.2, 0, 1.9), 1.4, 0.7, 0.6);
  sack(p, -0.2, 0.7, 1.9, "trim");
  return built(p, 4.6, (t) => {
    sails.rotation.z = t * 0.7;
  });
};

export const brickworks: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the kiln: a long brick block, banded, two mouths, a tall chimney
  const k = group(p, 0.2, 0, -1.6);
  bx(k, 3.4, 1.5, 1.7, 0, 0, 0, C("brick"), 0.12);
  bx(k, 3.5, 0.1, 1.8, 0, 0.5, 0, C("celadon"), 0.03);
  bx(k, 3.5, 0.1, 1.8, 0, 1.25, 0, C("celadon"), 0.03);
  rod(k, 0.85, 3.3, 0, 1.5, 0, "x", C("brick"), 20);
  for (const x of [-0.9, 0.9]) mouth(group(k, x, 0, 0), 0.86, 0.3);
  bx(k, 0.6, 3.2, 0.6, 1.5, 0, -0.5, C("porcelain"), 0.06);
  bx(k, 0.74, 0.12, 0.74, 1.5, 3.2, -0.5, C("celadon"), 0.03);
  bx(k, 0.4, 0.05, 0.4, 1.5, 3.32, -0.5, C("ink"));
  // the drying racks
  for (let n = 0; n < Math.min(2, level); n++) {
    const r = group(p, -1.7 + n * 1.5, 0, 1.2);
    for (const x of [-0.5, 0.5])
      for (const z of [-0.4, 0.4]) bx(r, 0.08, 1.2, 0.08, x, 0, z, C("celadon"));
    for (let l = 0; l < 3; l++) {
      bx(r, 1.1, 0.04, 0.9, 0, 0.25 + l * 0.4, 0, C("blond"));
      for (let j = 0; j < 4; j++)
        bx(r, 0.2, 0.1, 0.6, -0.39 + j * 0.26, 0.29 + l * 0.4, 0, C("brick"), 0.01);
    }
  }
  // stacks of bricks, clay waiting, wood for the fire
  stack(p, 1.8, 0, 1.0, 2 + level, "bricks");
  if (level >= 3) stack(p, 1.8, 0, 2.1, 3, "bricks");
  tub(p, -2.3, 0, -0.3, "brick");
  tub(p, -2.3, 0, 0.35, "brick");
  for (let n = 0; n < 3; n++) log(p, -2.0, 0, -2.4 + n * 0.3, 0.8, 0.13, "x");
  return built(p, 4.0);
};

export const ropeWalk: WorkshopMaker = (_P, { level }) => {
  const p = scaled();
  // the long shed
  posts(p, -2.3, 2.3, -1.5, 0.1, 1.7);
  pitched(p, 5.0, 2.0, 0, 1.7, -0.7);
  // the wheel that twists, the strands stretched to the sled
  const w = group(p, -2.0, 0, -0.7);
  trestle(w, 0, 0, 0.9, 0.7, "z");
  ring(w, 0.55, 0.05, 0, 1.0, 0, C("celadon"), "x");
  for (let k = 0; k < 4; k++) {
    const s = group(w, 0, 1.0, 0);
    s.rotation.x = (k * Math.PI) / 4;
    bx(s, 0.04, 1.06, 0.04, 0, -0.53, 0, C("celadon2"));
  }
  for (const [z, y] of [
    [-0.9, 0.95],
    [-0.7, 1.05],
    [-0.5, 0.95],
  ] as const)
    rod(p, 0.035, 3.6, -0.1, y, z, "x", C("wheat"), 6);
  const sl = group(p, 1.8, 0, -0.7);
  bx(sl, 0.5, 0.12, 0.9, 0, 0, 0, C("blond2"));
  bx(sl, 0.12, 1.1, 0.12, 0, 0.1, 0, C("celadon"));
  bx(sl, 0.14, 0.12, 0.7, 0, 0.95, 0, C("celadon2"));
  // the coils, more with the level; hemp waiting
  const coils: [number, number][] = [
    [1.9, 1.6],
    [1.2, 1.9],
    [2.2, 2.2],
    [0.5, 1.5],
    [1.5, 1.2],
  ];
  for (const [x, z] of coils.slice(0, 1 + level * 1.5)) coil(p, x, 0, z, 1.3);
  for (let k = 0; k < 3; k++)
    rod(
      p,
      0.14,
      0.9,
      -1.9,
      0.14 + (k === 2 ? 0.25 : 0),
      1.4 + (k % 2) * 0.3 + (k === 2 ? 0.15 : 0),
      "x",
      C("leaf2"),
      8,
    );
  barrel(p, -0.6, 0, 1.9);
  return built(p, 3.0);
};

/* ---------- the house, the Arsenal ---------- */

export const fondaco: WorkshopMaker = (P) => {
  const p = new Group();
  const w = 4.4;
  const d = 3.4;
  const z0 = -0.5;
  bx(p, w + 0.5, 0.22, d + 0.5, 0, 0, z0, C("stone2"), 0.06);
  bx(p, w, 1.5, d, 0, 0.22, z0, C("porcelain"), 0.06);
  bx(p, w + 0.16, 0.14, d + 0.16, 0, 1.72, z0, C("trim"), 0.04);
  bx(p, w, 1.3, d, 0, 1.86, z0, C("porcelain"), 0.06);
  bx(p, w + 0.24, 0.16, d + 0.24, 0, 3.16, z0, C("trim"), 0.05);
  hip(p, w, d, 0.9, 0, 3.32, z0, C("roof"));
  bx(p, 0.5, 0.3, 0.5, 0, 4.05, z0, C("trim"), 0.05);
  for (let k = 0; k < 7; k++)
    bx(
      p,
      0.22,
      0.2,
      0.12,
      -w / 2 + 0.3 + k * ((w - 0.6) / 6),
      3.32,
      z0 + d / 2 + 0.03,
      C("trim"),
      0.03,
    );
  for (let k = 0; k < 6; k++)
    bx(
      p,
      0.12,
      0.2,
      0.22,
      w / 2 + 0.03,
      3.32,
      z0 - d / 2 + 0.3 + k * ((d - 0.6) / 5),
      C("trim"),
      0.03,
    );
  // the arcade on the two faces one sees, the windows above
  const fz = z0 + d / 2 + 0.005;
  const fx = w / 2 + 0.005;
  for (let k = 0; k < 5; k++) {
    const x = -w / 2 + 0.52 + k * ((w - 1.04) / 4);
    arch(p, x, 0.26, fz, 0.52, 0.72, "z");
    arch(p, x, 2.05, fz, 0.3, 0.55, "z");
    bx(p, 0.4, 0.05, 0.1, x, 2.0, fz + 0.03, C("trim"));
  }
  for (let k = 0; k < 4; k++) {
    const z = z0 - d / 2 + 0.5 + k * ((d - 1.0) / 3);
    arch(p, fx, 0.26, z, 0.5, 0.72, "x");
    arch(p, fx, 2.05, z, 0.3, 0.55, "x");
    bx(p, 0.1, 0.05, 0.4, fx + 0.03, 2.0, z, C("trim"));
  }
  // the flag: the accent, yours
  cyl(p, 0.035, 0.035, 1.5, 0, 4.3, z0, C("ink"), 6);
  bx(p, 0.72, 0.42, 0.03, 0.38, 5.3, z0, P.accentCloth);
  // the quay in front
  crate(p, -1.9, 0, 2.2);
  crate(p, -1.35, 0, 2.3);
  crate(p, -1.62, 0.37, 2.24, 0.42);
  barrel(p, 2.2, 0, 2.2);
  bollard(p, 0.4, 0, 2.6);
  bollard(p, -0.5, 0, 2.6);
  return built(p, 6.0);
};

export const arsenal: WorkshopMaker = (P, { level }) => {
  const p = new Group();
  // the hall: three great arches open on the slip
  bx(p, 5.2, 2.2, 1.8, 0, 0, -1.9, C("porcelain"), 0.08);
  bx(p, 5.4, 0.16, 2.0, 0, 2.2, -1.9, C("trim"), 0.05);
  for (let k = 0; k < 9; k++) bx(p, 0.3, 0.26, 0.2, -2.4 + k * 0.6, 2.36, -1.0, C("trim"), 0.03);
  for (const x of [-1.65, 0, 1.65]) arch(p, x, 0, -0.995, 1.1, 1.0, "z");
  pitched(p, 5.4, 2.0, 0, 2.36, -1.9);
  // the slip: a blond ramp down to the water, a hull on its stocks
  bx(p, 3.2, 0.14, 2.6, -0.6, 0, 1.0, C("blond"), 0.03);
  for (let k = 0; k < 7; k++)
    bx(p, 0.04, 0.012, 2.56, -2.0 + k * 0.46, 0.14, 1.0, C("blond2")).castShadow = false;
  bx(p, 5.4, 0.06, 0.9, 0, -0.02, 2.5, C("water"), 0.02).castShadow = false;
  for (const z of [0.3, 1.0, 1.7]) bx(p, 1.5, 0.3, 0.16, -0.6, 0.14, z, C("celadon"), 0.03);
  barge(P, p, -0.6, 0.4, 1.0, Math.PI / 2, true, 1.15);
  for (let k = 0; k < 4; k++)
    bx(
      p,
      0.08,
      1.1,
      0.08,
      -1.45 + (k % 2) * 1.7,
      0.14,
      0.3 + Math.floor(k / 2) * 1.4,
      C("celadon2"),
    );
  // the crane, timber, a second keel with the level
  crane(p, 2.3, 0.2, 2.9, "sand");
  stack(p, 2.1, 0, 1.6, 2 + level, "planks", Math.PI / 2);
  for (let k = 0; k < 3; k++) log(p, 1.9, 0, -0.1 + k * 0.32, 1.4, 0.15, "x");
  coil(p, -2.5, 0, -0.4, 1.3);
  if (level >= 2) barrel(p, -2.5, 0, 0.4);
  if (level >= 3) crate(p, -2.5, 0, 1.2);
  return built(p, 4.4);
};

/* ---------- the works of prestige ---------- */

export const fontaine: WorkshopMaker = () => {
  const p = new Group();
  cyl(p, 2.0, 2.1, 0.14, 0, 0, 0, C("stone2"), 8);
  cyl(p, 1.5, 1.6, 0.5, 0, 0.14, 0, C("porcelain"), 8);
  cyl(p, 1.3, 1.3, 0.04, 0, 0.6, 0, C("water"), 8).castShadow = false;
  cyl(p, 0.22, 0.3, 1.2, 0, 0.5, 0, C("porcelain"), 12);
  cyl(p, 0.8, 0.3, 0.26, 0, 1.7, 0, C("porcelain"), 16);
  cyl(p, 0.7, 0.7, 0.03, 0, 1.94, 0, C("water"), 16).castShadow = false;
  cyl(p, 0.1, 0.14, 0.5, 0, 1.9, 0, C("celadon"), 10);
  heap(p, 0.16, 0, 2.5, 0, C("celadon2"), 1);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    bollard(p, Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5);
  }
  return built(p, 3.2);
};

export const loggia: WorkshopMaker = () => {
  const p = new Group();
  bx(p, 4.8, 0.22, 3.2, 0, 0, 0, C("stone2"), 0.06);
  bx(p, 4.4, 0.12, 2.8, 0, 0.22, 0, C("porcelain"), 0.04);
  for (let k = 0; k < 5; k++)
    for (const z of [-1.2, 1.2]) {
      const x = -2.0 + k * 1.0;
      cyl(p, 0.13, 0.15, 1.7, x, 0.34, z, C("porcelain"), 12);
      bx(p, 0.4, 0.1, 0.4, x, 0.34, z, C("trim"), 0.02);
      bx(p, 0.4, 0.12, 0.4, x, 2.0, z, C("trim"), 0.02);
    }
  bx(p, 4.6, 0.5, 3.0, 0, 2.12, 0, C("porcelain"), 0.06);
  for (let k = 0; k < 4; k++) {
    rod(p, 0.36, 0.06, -1.5 + k * 1.0, 2.12, 1.5, "z", C("shade"), 14).castShadow = false;
  }
  bx(p, 4.8, 0.14, 3.2, 0, 2.62, 0, C("trim"), 0.04);
  hip(p, 4.6, 3.0, 0.7, 0, 2.76, 0, C("roof"));
  for (let k = 0; k < 9; k++) bx(p, 0.08, 0.4, 0.08, -2.0 + k * 0.5, 0.34, 1.35, C("celadon"));
  bx(p, 4.3, 0.07, 0.1, 0, 0.74, 1.35, C("celadon"));
  return built(p, 4.0);
};

export const campanile: WorkshopMaker = () => {
  const p = new Group();
  bx(p, 2.2, 0.3, 2.2, 0, 0, 0, C("stone2"), 0.06);
  bx(p, 1.6, 5.0, 1.6, 0, 0.3, 0, C("porcelain"), 0.06);
  for (let k = 0; k < 4; k++) {
    bx(p, 0.14, 0.5, 0.05, 0, 1.2 + k * 1.0, 0.81, C("shade")).castShadow = false;
    bx(p, 0.05, 0.5, 0.14, 0.81, 1.2 + k * 1.0, 0, C("shade")).castShadow = false;
  }
  bx(p, 1.8, 0.14, 1.8, 0, 5.3, 0, C("trim"), 0.04);
  // the belfry: arches on the faces one sees, the bell within
  bx(p, 1.5, 1.2, 1.5, 0, 5.44, 0, C("porcelain"), 0.05);
  for (const x of [-0.35, 0.35]) {
    arch(p, x, 5.6, 0.755, 0.34, 0.6, "z");
    arch(p, 0.755, 5.6, x, 0.34, 0.6, "x");
  }
  bx(p, 1.8, 0.14, 1.8, 0, 6.64, 0, C("trim"), 0.04);
  hip(p, 1.7, 1.7, 1.8, 0, 6.78, 0, C("celadon"));
  heap(p, 0.12, 0, 8.62, 0, C("celadon2"), 1);
  return built(p, 9.0);
};

export const scuola: WorkshopMaker = () => {
  const p = new Group();
  bx(p, 5.0, 0.2, 4.0, 0, 0, -0.2, C("stone2"), 0.06);
  for (let k = 0; k < 2; k++)
    bx(p, 3.4 - k * 0.5, 0.12, 0.5, 0, 0.2 + k * 0.12, 2.0 - k * 0.2, C("porcelain"), 0.03);
  bx(p, 4.4, 2.8, 3.2, 0, 0.2, -0.4, C("porcelain"), 0.08);
  bx(p, 4.6, 0.16, 3.4, 0, 3.0, -0.4, C("trim"), 0.05);
  pitched(p, 4.6, 3.4, 0, 3.16, -0.4);
  // the front: four columns, the door, the round window
  for (let k = 0; k < 4; k++) {
    const x = -1.65 + k * 1.1;
    cyl(p, 0.14, 0.16, 2.3, x, 0.44, 1.3, C("trim"), 12);
    bx(p, 0.4, 0.1, 0.4, x, 0.44, 1.3, C("trim"), 0.02);
    bx(p, 0.4, 0.12, 0.4, x, 2.7, 1.3, C("trim"), 0.02);
  }
  bx(p, 4.2, 0.2, 0.5, 0, 2.82, 1.3, C("porcelain"), 0.04);
  arch(p, 0, 0.44, 1.205, 0.8, 1.2, "z");
  for (const x of [-1.1, 1.1]) arch(p, x, 1.0, 1.205, 0.4, 0.8, "z");
  for (let k = 0; k < 3; k++) arch(p, 2.205, 1.0, -1.4 + k * 1.0, 0.4, 0.9, "x");
  ring(p, 0.3, 0.05, 0, 3.6, 1.32, C("celadon"), "z");
  return built(p, 5.0);
};

export const basilique: WorkshopMaker = () => {
  const p = new Group();
  bx(p, 5.2, 0.24, 5.0, 0, 0, 0, C("stone2"), 0.06);
  bx(p, 4.6, 2.4, 4.2, 0, 0.24, -0.1, C("porcelain"), 0.08);
  bx(p, 4.8, 0.16, 4.4, 0, 2.64, -0.1, C("trim"), 0.05);
  // five domes, celadon lanterns
  const domes: [number, number, number][] = [
    [0, -0.1, 1.15],
    [-1.4, -1.3, 0.7],
    [1.4, -1.3, 0.7],
    [-1.4, 1.1, 0.7],
    [1.4, 1.1, 0.7],
  ];
  for (const [x, z, r] of domes) {
    cyl(p, r, r, 0.4, x, 2.8, z, C("porcelain"), 20);
    dome(p, r, x, 3.2, z, C("stone"));
    cyl(p, r * 0.16, r * 0.2, r * 0.4, x, 3.2 + r * 0.96, z, C("celadon"), 10);
    heap(p, r * 0.12, x, 3.2 + r * 1.46, z, C("celadon2"), 1);
  }
  // the front: three portals, the gallery above
  for (const [x, w] of [
    [-1.4, 0.8],
    [0, 1.1],
    [1.4, 0.8],
  ] as const)
    arch(p, x, 0.24, 2.005, w, 0.9, "z");
  for (let k = 0; k < 4; k++) arch(p, 2.305, 0.9, -1.5 + k * 0.95, 0.4, 0.8, "x");
  for (let k = 0; k < 9; k++) bx(p, 0.08, 0.34, 0.08, -2.0 + k * 0.5, 2.8, 2.05, C("celadon"));
  bx(p, 4.3, 0.06, 0.1, 0, 3.14, 2.05, C("celadon"));
  return built(p, 6.0);
};

/** The model of each building of an island, by its key in the rules. */
export const WORKSHOPS: Record<string, WorkshopMaker> = {
  fondaco,
  farm,
  clay_pit: clayPit,
  lumber_camp: lumberCamp,
  sand_pit: sandPit,
  salt_pans: saltPans,
  hemp_field: hempField,
  mill,
  sawmill,
  brickworks,
  glassworks,
  rope_walk: ropeWalk,
  arsenal,
  fontaine,
  loggia,
  campanile,
  scuola,
  basilique,
};
