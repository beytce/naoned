/**
 * The terroirs drawn (docs/plan-carte-vivante.md, lots 3 and 4): each kind of land told by its
 * relief, never by a colour — a forest of firs, a clay pit in steps round its pool and its reeds,
 * fields in furrows and their stacks, a pasture and its sheep behind a fence, dunes on a sandy
 * shore. On a plot to buy (`sparse`: round its « + »), on a free tile of the house's (in full), on
 * the land beyond (the horizon). What a tile's land is, the engine says (terrain.ts).
 */
import type { Group } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cone, cyl, dome, seeded, tree } from "../shapes.js";

export type TerrainKind = "forest" | "clay" | "fields" | "pasture" | "sand";
export const TERRAINS: readonly TerrainKind[] = ["forest", "clay", "fields", "pasture", "sand"];
export const isTerrain = (k: string | undefined): k is TerrainKind =>
  !!k && (TERRAINS as readonly string[]).includes(k);

export interface TerrainOpts {
  seed: number;
  /** Round a plot's « + »: fewer pieces, the middle wider. */
  sparse?: boolean;
  /** Where nothing must stand (a road), in the tile's coordinates. */
  keepOff?: (x: number, z: number) => boolean;
}

/** A sheep: a round fleece, a dark head, low on its legs. */
function sheep(P: Palette, g: Group, x: number, z: number, rot: number): void {
  const body = ball(g, 0.17, x, 0.2, z, P.m("trim"), 12);
  body.scale.set(1.3, 0.95, 1);
  body.rotation.y = rot;
  ball(g, 0.075, x + Math.cos(rot) * 0.22, 0.24, z - Math.sin(rot) * 0.22, P.m("open"), 10);
  for (const [dx, dz] of [
    [0.1, 0.07],
    [-0.1, 0.07],
    [0.1, -0.07],
    [-0.1, -0.07],
  ] as const)
    cyl(g, 0.018, 0.018, 0.1, x + dx, 0, z + dz, P.m("open"), 6);
}

/** A tuft of reeds: thin stems, a few leaning. */
export function reeds(P: Palette, g: Group, x: number, z: number, rnd: () => number, y = 0): void {
  for (let k = 0; k < 5; k++) {
    const r = cyl(
      g,
      0.012,
      0.02,
      0.38 + rnd() * 0.22,
      x + (rnd() - 0.5) * 0.24,
      y,
      z + (rnd() - 0.5) * 0.24,
      P.m("wood"),
      5,
    );
    r.rotation.z = (rnd() - 0.5) * 0.3;
    r.castShadow = false;
  }
}

/**
 * A tile's land drawn in a group, its middle kept clear (a « + », a pin): the terrain's signature
 * from its seed. Returns nothing: the pieces are still, baked with their tile.
 */
export function terrainDress(P: Palette, g: Group, kind: TerrainKind, o: TerrainOpts): void {
  const rnd = seeded(o.seed * 5 + 3);
  const clear = o.sparse ? 1.55 : 1.05;
  const off = o.keepOff ?? (() => false);
  const free = (x: number, z: number, r = 0.3) =>
    Math.hypot(x, z) > clear + r && Math.abs(x) < 2.5 - r && Math.abs(z) < 2.5 - r && !off(x, z);
  const spots = (n: number, r: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let k = 0; k < n * 6 && out.length < n; k++) {
      const x = (rnd() - 0.5) * 5;
      const z = (rnd() - 0.5) * 5;
      if (!free(x, z, r)) continue;
      if (out.some(([px, pz]) => Math.hypot(px - x, pz - z) < r * 1.5)) continue;
      out.push([x, z]);
    }
    return out;
  };

  if (kind === "forest") {
    // Firs, close together, of every height; a stump or two.
    for (const [x, z] of spots(o.sparse ? 7 : 12, 0.42))
      tree(P, g, x, z, 0.62 + rnd() * 0.5, "fir");
    for (const [x, z] of spots(2, 0.2)) cyl(g, 0.11, 0.13, 0.14, x, 0, z, P.m("wood"), 10);
    return;
  }

  if (kind === "fields") {
    // Furrows in two blocks, a stack of sheaves at their end.
    const blocks: [number, number, boolean][] = o.sparse
      ? [
          [-1.75, 0, true],
          [1.75, 0, true],
        ]
      : [
          [-1.6, -0.2, true],
          [1.55, 1.3, false],
          [1.55, -1.5, false],
        ];
    for (const [bx, bz, along] of blocks)
      for (let k = -3; k <= 3; k++) {
        const x = along ? bx + k * 0.22 : bx;
        const z = along ? bz : bz + k * 0.22;
        if (off(x, z) || Math.hypot(x, z) < clear - 0.2) continue;
        const w = along ? 0.13 : 1.5;
        const d = along ? (o.sparse ? 3.6 : 3.9) : 0.13;
        box(g, w, 0.07, d, x, 0, z, P.m("soil"), 0.03).castShadow = false;
      }
    for (const [x, z] of spots(o.sparse ? 2 : 3, 0.3))
      cone(g, 0.26, 0.44, x, 0, z, P.m("crop"), 14);
    return;
  }

  if (kind === "pasture") {
    // A fence along two sides, the flock, a tree for the shade.
    const rail = (x: number, z: number, w: number, d: number) => {
      if (off(x, z)) return;
      box(g, w, 0.045, d, x, 0.2, z, P.m("wood"), 0.012).castShadow = false;
      box(g, w, 0.045, d, x, 0.36, z, P.m("wood"), 0.012).castShadow = false;
    };
    for (let k = -2; k <= 2; k++) {
      const u = k * 1.1;
      if (!off(u, -2.45)) box(g, 0.07, 0.46, 0.07, u, 0, -2.45, P.m("wood"), 0.015);
      if (!off(-2.45, u)) box(g, 0.07, 0.46, 0.07, -2.45, 0, u, P.m("wood"), 0.015);
      if (k < 2) {
        rail(u + 0.55, -2.45, 1.1, 0.045);
        rail(-2.45, u + 0.55, 0.045, 1.1);
      }
    }
    for (const [x, z] of spots(o.sparse ? 3 : 5, 0.34)) sheep(P, g, x, z, rnd() * Math.PI * 2);
    for (const [x, z] of spots(1, 0.5)) tree(P, g, x, z, 0.9, "round");
    return;
  }

  if (kind === "clay") {
    // The pit: steps of earth round a pool, heaps of clay, reeds at the water.
    const [px, pz] = o.sparse ? [1.75, 1.6] : [1.35, -1.35];
    if (!off(px, pz)) {
      cyl(g, 1.0, 1.05, 0.06, px, 0, pz, P.m("soil"), 28).castShadow = false;
      cyl(g, 0.72, 0.76, 0.05, px, 0.06, pz, P.m("roof"), 26).castShadow = false;
      cyl(g, 0.44, 0.46, 0.03, px, 0.11, pz, P.m("water"), 24).castShadow = false;
      reeds(P, g, px + 0.62, pz + 0.3, rnd);
      reeds(P, g, px - 0.5, pz - 0.52, rnd);
    }
    for (const [x, z] of spots(o.sparse ? 3 : 5, 0.32)) {
      const heap = dome(g, 0.3, x, 0, z, P.m("soil"), 0.62);
      heap.scale.x = 1.2 + rnd() * 0.3;
    }
    return;
  }

  // The sandy shore: dunes, low and long, reeds between them.
  for (const [x, z] of spots(o.sparse ? 3 : 5, 0.55)) {
    const dune = dome(g, 0.6, x, 0, z, P.m("crop"), 0.36 + rnd() * 0.12);
    dune.scale.x = 1.25;
    dune.scale.z = 0.8;
    dune.rotation.y = rnd() * Math.PI;
  }
  for (const [x, z] of spots(o.sparse ? 2 : 4, 0.2)) reeds(P, g, x, z, rnd);
}
