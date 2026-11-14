/**
 * The common pieces of the Céladon direction (docs/plan-celadon.md C1): trestles, the slide and
 * what rides it, crates, tubs, barrels, bollards, railings, planters, trees, the barge. Each is put
 * in its parent at a place; the ground is y = 0.
 */
import { ExtrudeGeometry, type Group, type Object3D, Shape } from "three";
import type { Palette } from "../materials.js";
import { cached, cone, cyl, put } from "../shapes.js";
import { C, bx, group, heap, ring, rod } from "./kit.js";

/** A trestle: two celadon legs on ink feet, a brace; `w` apart across `along`. */
export function trestle(p: Object3D, x: number, z: number, h: number, w = 0.84, along = "x"): void {
  for (const s of [-1, 1]) {
    const dx = along === "x" ? 0 : (s * w) / 2;
    const dz = along === "x" ? (s * w) / 2 : 0;
    bx(p, 0.13, h, 0.13, x + dx, 0, z + dz, C("celadon"), 0.03);
    bx(p, 0.3, 0.07, 0.3, x + dx, 0, z + dz, C("ink"));
  }
  if (along === "x") bx(p, 0.08, 0.08, w, x, h * 0.45, z, C("celadon2"));
  else bx(p, w, 0.08, 0.08, x, h * 0.45, z, C("celadon2"));
}

/**
 * The slide: a slate bed between two porcelain rails with their rivets, on celadon trestles.
 * Straight, along x or z, from (x1, z1) to (x2, z2), its bed at `y`.
 */
export function slide(
  p: Object3D,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y = 0.85,
): Group {
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const g = group(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, alongX ? 0 : Math.PI / 2);
  bx(g, len, 0.12, 0.86, 0, y, 0, C("slate"), 0.03);
  for (let k = -len / 2 + 0.3; k < len / 2 - 0.1; k += 0.34)
    bx(g, 0.035, 0.012, 0.8, k, y + 0.115, 0, C("ink")).castShadow = false;
  for (const s of [-1, 1]) {
    bx(g, len + 0.1, 0.3, 0.15, 0, y - 0.04, s * 0.5, C("porcelain"), 0.05);
    let n = 0;
    for (let k = -len / 2 + 0.25; k < len / 2; k += 0.5)
      cyl(g, 0.035, 0.035, 0.02, k, y + 0.26, s * 0.5, C(n++ % 3 === 1 ? "brick" : "celadon2"), 8);
    bx(g, len, 0.07, 0.07, 0, y - 0.3, s * 0.42, C("celadon"));
  }
  const n = Math.max(2, Math.round(len / 2.2) + 1);
  for (let k = 0; k < n; k++)
    trestle(g, -len / 2 + 0.35 + (k * (len - 0.7)) / (n - 1), 0, y - 0.05);
  return g;
}

export function crate(p: Object3D, x: number, y: number, z: number, s = 0.46, rot = 0): Group {
  const g = group(p, x, y, z, rot);
  bx(g, s, s * 0.8, s, 0, 0, 0, C("blond"), 0.04);
  bx(g, s + 0.012, s * 0.2, s + 0.012, 0, s * 0.3, 0, C("celadon"), 0.02);
  bx(g, 0.14, 0.012, 0.09, 0, s * 0.8, 0, C("ink"));
  return g;
}

/** A log lying along an axis, its ends paler; its underside at y. */
export function log(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  len = 1,
  r = 0.15,
  axis: "x" | "z" = "x",
): void {
  rod(p, r, len, x, y + r, z, axis, C("blond2"), 10);
  rod(p, r * 0.8, len + 0.012, x, y + r, z, axis, C("blond"), 10);
}

/** A celadon tub heaped with a matter (sand, salt, clay). */
export function tub(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  fill: "sand" | "salt" | "brick" = "sand",
): void {
  cyl(p, 0.26, 0.21, 0.3, x, y, z, C("celadon2"), 14);
  ring(p, 0.26, 0.025, x, y + 0.3, z, C("celadon"));
  heap(p, 0.23, x, y + 0.29, z, C(fill), 0.45);
}

export function barrel(p: Object3D, x: number, y: number, z: number): void {
  cyl(p, 0.22, 0.2, 0.5, x, y, z, C("blond2"), 14);
  ring(p, 0.225, 0.02, x, y + 0.15, z, C("celadon2"));
  ring(p, 0.225, 0.02, x, y + 0.38, z, C("celadon2"));
}

export function sack(p: Object3D, x: number, y: number, z: number, tone: "trim" | "wheat"): void {
  heap(p, 0.24, x, y + 0.2, z, C(tone), 0.9);
  cyl(p, 0.06, 0.09, 0.1, x, y + 0.38, z, C(tone), 8);
}

export function bottle(p: Object3D, x: number, y: number, z: number, s = 1): void {
  cyl(p, 0.075 * s, 0.085 * s, 0.2 * s, x, y, z, C("glass"), 10);
  cyl(p, 0.03 * s, 0.06 * s, 0.12 * s, x, y + 0.2 * s, z, C("glass"), 8);
}

export function glassTray(p: Object3D, x: number, y: number, z: number): void {
  bx(p, 0.5, 0.1, 0.5, x, y, z, C("blond"), 0.03);
  for (const [a, b] of [
    [-0.12, -0.12],
    [0.12, -0.12],
    [-0.12, 0.12],
    [0.12, 0.12],
  ] as const)
    bottle(p, x + a, y + 0.1, z + b, 0.9);
}

/** A stack of planks (or of bricks, shorter and pink) on two battens. */
export function stack(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  layers: number,
  of: "planks" | "bricks" = "planks",
  rot = 0,
): Group {
  const g = group(p, x, y, z, rot);
  const len = of === "planks" ? 1.6 : 0.9;
  bx(g, 0.12, 0.1, 1.0, -len * 0.3, 0, 0, C("ink"));
  bx(g, 0.12, 0.1, 1.0, len * 0.3, 0, 0, C("ink"));
  for (let l = 0; l < layers; l++)
    for (let k = 0; k < 4; k++)
      bx(
        g,
        len,
        0.07,
        0.2,
        (l % 2) * 0.05,
        0.1 + l * 0.08,
        -0.36 + k * 0.24,
        C(of === "bricks" ? "brick" : l % 2 ? "blond" : "blond2"),
        0.01,
      );
  return g;
}

/** A coil of rope. */
export function coil(p: Object3D, x: number, y: number, z: number, s = 1): void {
  for (let k = 0; k < 3; k++)
    ring(p, 0.2 * s, 0.05 * s, x, y + 0.05 * s + k * 0.085 * s, z, C("wheat"));
}

export function bollard(p: Object3D, x: number, y: number, z: number): void {
  cyl(p, 0.14, 0.17, 0.5, x, y, z, C("porcelain"), 12);
  cyl(p, 0.19, 0.19, 0.1, x, y + 0.46, z, C("celadon"), 12);
}

/** A railing of celadon tubes, straight along x or z. */
export function railing(p: Object3D, x1: number, z1: number, x2: number, z2: number, y = 0): void {
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  rod(p, 0.055, len, cx, y + 0.72, cz, alongX ? "x" : "z", C("celadon"), 8);
  rod(p, 0.035, len, cx, y + 0.4, cz, alongX ? "x" : "z", C("celadon"), 8);
  const n = Math.max(2, Math.round(len / 2.4) + 1);
  for (let k = 0; k < n; k++) {
    const t = -len / 2 + (k * len) / (n - 1);
    const x = alongX ? cx + t : cx;
    const z = alongX ? cz : cz + t;
    cyl(p, 0.055, 0.055, 0.74, x, y, z, C("celadon"), 8);
    cyl(p, 0.11, 0.11, 0.06, x, y, z, C("celadon2"), 10);
  }
}

export function fir(p: Object3D, x: number, z: number, s = 1): void {
  cyl(p, 0.1 * s, 0.13 * s, 0.6 * s, x, 0, z, C("blond2"), 8);
  cone(p, 0.75 * s, 1.1 * s, x, 0.45 * s, z, C("leaf"), 14);
  cone(p, 0.58 * s, 1.0 * s, x, 1.05 * s, z, C("leaf2"), 14);
  cone(p, 0.4 * s, 0.9 * s, x, 1.65 * s, z, C("leaf"), 14);
}

export function cypress(p: Object3D, x: number, y: number, z: number, s = 1): void {
  cyl(p, 0.05 * s, 0.06 * s, 0.3 * s, x, y, z, C("blond2"), 8);
  heap(p, 0.3 * s, x, y + 0.75 * s, z, C("leaf"), 2.5);
}

export function planter(p: Object3D, x: number, y: number, z: number): void {
  bx(p, 1.1, 0.42, 1.1, x, y, z, C("porcelain"), 0.1);
  bx(p, 0.9, 0.05, 0.9, x, y + 0.4, z, C("blond2"));
  cypress(p, x, y + 0.42, z, 1.15);
  heap(p, 0.22, x + 0.26, y + 0.5, z + 0.22, C("leaf2"), 0.8);
  heap(p, 0.18, x - 0.25, y + 0.48, z + 0.2, C("leaf2"), 0.8);
}

/** A barge with its load and its pennant: the accent when it is the player's, ink otherwise. */
export function barge(
  P: Palette,
  p: Object3D,
  x: number,
  y: number,
  z: number,
  rot = 0,
  mine = false,
  s = 1,
): Group {
  const g = group(p, x, y, z, rot);
  g.scale.setScalar(s);
  const geo = cached("celadon:hull", () => {
    const sh = new Shape();
    sh.moveTo(-1.2, 0);
    sh.quadraticCurveTo(-0.6, 0.48, 0.5, 0.42);
    sh.quadraticCurveTo(1.2, 0.3, 1.5, 0);
    sh.quadraticCurveTo(1.2, -0.3, 0.5, -0.42);
    sh.quadraticCurveTo(-0.6, -0.48, -1.2, 0);
    const e = new ExtrudeGeometry(sh, {
      depth: 0.26,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.05,
      bevelSegments: 2,
      curveSegments: 8,
    });
    e.rotateX(-Math.PI / 2);
    return e;
  });
  put(g, geo, C("porcelain"), 0, 0.05, 0);
  bx(g, 1.5, 0.05, 0.6, 0.05, 0.33, 0, C("blond"));
  crate(g, -0.2, 0.38, 0, 0.36);
  crate(g, 0.3, 0.38, 0.05, 0.36);
  cyl(g, 0.03, 0.03, 1.3, 0.75, 0.36, 0, C("ink"), 6);
  bx(g, 0.5, 0.28, 0.025, 1.02, 1.36, 0, mine ? P.accentCloth : C("ink"));
  return g;
}

/** The goods as they ride a slide: one small object each. */
export const RIDERS: Record<string, (p: Object3D) => void> = {
  wheat: (p) => sack(p, 0, 0, 0, "wheat"),
  flour: (p) => sack(p, 0, 0, 0, "trim"),
  clay: (p) => tub(p, 0, 0, 0, "brick"),
  sand: (p) => tub(p, 0, 0, 0, "sand"),
  salt: (p) => tub(p, 0, 0, 0, "salt"),
  wood: (p) => log(p, 0, 0, 0, 0.9, 0.15, "x"),
  hemp: (p) => {
    rod(p, 0.14, 0.7, 0, 0.14, 0, "x", C("leaf2"), 8);
    ring(p, 0.145, 0.02, 0, 0.14, 0, C("blond2"), "x");
  },
  planks: (p) => {
    for (const z of [-0.14, 0, 0.14]) bx(p, 0.9, 0.05, 0.12, 0, 0, z, C("blond"), 0.01);
    for (const z of [-0.07, 0.07]) bx(p, 0.9, 0.05, 0.12, 0, 0.05, z, C("blond2"), 0.01);
  },
  bricks: (p) => {
    for (let l = 0; l < 2; l++)
      for (const z of [-0.12, 0.12]) bx(p, 0.5, 0.1, 0.2, 0, l * 0.11, z, C("brick"), 0.01);
  },
  glass: (p) => glassTray(p, 0, 0, 0),
  rope: (p) => coil(p, 0, 0, 0),
};

/** What rides a slide for a good: its own object, or a crate. */
export function rider(p: Object3D, good: string): void {
  const make = Object.hasOwn(RIDERS, good) ? RIDERS[good] : undefined;
  if (make) make(p);
  else crate(p, 0, 0, 0);
}
