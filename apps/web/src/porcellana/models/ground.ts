/**
 * The ground's models (docs/plan-porcellana.md § 1 and 4): a land tile (thick, its edges rounded),
 * the water (lower, in one piece with its neighbours), a grove, and the « + » plot of a tile one
 * may buy.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { type TreeKind, box, dyn, seeded, tree } from "../shapes.js";
import { BOARD } from "../tokens.js";
import type { Built } from "./model.js";

/** A tile's slab, its top at y = 0 (land) or at the water's level. */
export function slab(P: Palette, water: boolean): Group {
  const g = new Group();
  if (water) {
    const s = BOARD.tile + BOARD.gap + 0.01;
    box(g, s, 1.2, s, 0, BOARD.waterY - 1.2, 0, P.m("water"), 0.02).castShadow = false;
  } else {
    box(g, BOARD.tile, BOARD.thick, BOARD.tile, 0, -BOARD.thick, 0, P.m("ground"), BOARD.radius);
  }
  return g;
}

/**
 * Trees scattered on a tile from its seed, `n` tries, kept off what `keepOff` refuses (a road, a
 * building), in the tile's own coordinates.
 */
export function grove(
  P: Palette,
  seed: number,
  n = 9,
  kinds: TreeKind[] = ["round", "cypress", "fir"],
  keepOff: (x: number, z: number) => boolean = () => false,
): Built {
  const g = new Group();
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * 4.6;
    const z = (rnd() - 0.5) * 4.6;
    const s = 0.75 + rnd() * 0.45;
    const k = kinds[Math.floor(rnd() * kinds.length)] ?? "round";
    if (keepOff(x, z)) continue;
    tree(P, g, x, z, s, k);
  }
  return { group: g, pin: [0, 2, 0] };
}

/** A tile one may buy: a plate of earth, a « + » in relief, four corner marks. */
export function plot(P: Palette): Built {
  const g = new Group();
  box(g, 4.4, 0.05, 4.4, 0, 0, 0, P.m("soil"), 0.25);
  const plus = dyn(new Group());
  g.add(plus);
  box(plus, 1.3, 0.1, 0.28, 0, 0.05, 0, P.m("roof"), 0.06);
  box(plus, 0.28, 0.1, 1.3, 0, 0.05, 0, P.m("roof"), 0.06);
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    box(g, 0.6, 0.06, 0.1, sx * 1.75, 0.05, sz * 2.0, P.m("roof"), 0.03);
    box(g, 0.1, 0.06, 0.6, sx * 2.0, 0.05, sz * 1.75, P.m("roof"), 0.03);
  }
  return { group: g, pin: [0, 0.9, 0], plus };
}
