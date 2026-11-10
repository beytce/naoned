/**
 * What grows on the house's own land (docs/plan-carte-vivante.md, lot 2): a workshop's dressing by
 * its level's tier (« the workshop changes its shape every five levels », CADRAGE-v3 § 3), a free
 * tile of the house's inhabited as its Fondaco rises, a site whose walls rise with its progress.
 * Each is read at a glance, from afar: what one built is seen.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cone, crate, cyl, gable, seeded, tree } from "../shapes.js";
import { banner } from "./fondaco.js";
import type { Built } from "./model.js";
import { isTerrain, terrainDress } from "./terrain.js";

/** A workshop's tier, 0 to 4: a step every five levels. */
export const tierOf = (level: number | undefined) =>
  Math.min(4, Math.max(0, Math.floor((level ?? 1) / 5)));

/**
 * A workshop's tier, added round its model whatever it is: a paved yard and a pennant on its mast
 * (5), stone posts at its corners (10), low walls behind it and a greater banner (15), a dovecote
 * and a second banner (20). Returns what waves.
 */
export function tierDress(P: Palette, g: Group, tier: number): ((t: number) => void) | null {
  if (tier <= 0) return null;
  const ticks: ((t: number) => void)[] = [];
  // The yard, paved: the model stands on it.
  box(g, 5.56, 0.035, 5.56, 0, 0, 0, P.m("trim"), 0.012).castShadow = false;
  const mast = (x: number, z: number, h: number, w: number, lag: number) => {
    cyl(g, 0.03, 0.04, h, x, 0, z, P.ink, 10);
    ball(g, 0.055, x, h + 0.04, z, P.m("trim"), 12);
    const cloth = banner(P, w, w * 0.62);
    cloth.mesh.position.set(x, h - 0.04, z);
    // It flies inward, over its own yard: never over a neighbour's tile.
    if (x > 0) cloth.mesh.rotation.y = Math.PI;
    g.add(cloth.mesh);
    ticks.push((t) => cloth.tick(t + lag));
  };
  mast(2.68, -2.68, tier >= 3 ? 3.3 : 2.4, tier >= 3 ? 0.85 : 0.5, 0);
  if (tier >= 2)
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      box(g, 0.24, 0.5, 0.24, sx * 2.68, 0, sz * 2.68, P.m("wall2"), 0.03);
      box(g, 0.3, 0.06, 0.3, sx * 2.68, 0.5, sz * 2.68, P.m("trim"), 0.015);
      ball(g, 0.09, sx * 2.68, 0.65, sz * 2.68, P.m("trim"), 14);
    }
  if (tier >= 3) {
    // Low walls along its two back sides, a gap in each for those who walk.
    for (const [a, b] of [
      [-2.5, -0.6],
      [0.6, 2.45],
    ] as const) {
      box(g, b - a, 0.3, 0.1, (a + b) / 2, 0, -2.74, P.m("wall2"), 0.02);
      box(g, 0.1, 0.3, b - a, -2.74, 0, (a + b) / 2, P.m("wall2"), 0.02);
    }
  }
  if (tier >= 4) {
    // The dovecote at the back corner, and a second banner at the front.
    cyl(g, 0.3, 0.33, 1.5, -2.5, 0, -2.5, P.m("wall"), 20);
    cyl(g, 0.36, 0.36, 0.06, -2.5, 1.5, -2.5, P.m("trim"), 20);
    cone(g, 0.4, 0.5, -2.5, 1.56, -2.5, P.m("roof"), 20);
    ball(g, 0.06, -2.5, 2.12, -2.5, P.accent, 12);
    for (const y of [0.75, 1.1]) box(g, 0.1, 0.12, 0.04, -2.5, y, -2.2, P.m("open"), 0.01);
    mast(-2.68, 2.68, 2.4, 0.5, 0.9);
  }
  return (t) => {
    for (const f of ticks) f(t);
  };
}

/** A small house of the mainland: plain walls under a gable, a door. */
function cottage(P: Palette, g: Group, x: number, z: number, rot: number, s: number): void {
  const h = new Group();
  h.position.set(x, 0, z);
  h.rotation.y = rot;
  g.add(h);
  box(h, 0.95 * s, 0.6 * s, 0.75 * s, 0, 0, 0, P.m("wall"), 0.03);
  gable(P, h, 0.95 * s, 0.75 * s, 0.6 * s, 0.36 * s, 0, 0, 0, P.m("wall"), 0.1, 0.07);
  box(h, 0.2 * s, 0.36 * s, 0.04, 0, 0, 0.375 * s + 0.01, P.m("open"), 0.01);
}

/**
 * The looks a free tile of plain land takes, from its seed: trees and hedges only, nothing that
 * reads as a terroir (no furrows, no flock: those are the fields' and the pasture's, terrain.ts).
 */
const LOOKS = ["garden", "grove", "orchard"] as const;

/**
 * A free tile of the house's (it was four trees): its terroir drawn in full when it has one (lot
 * 3), else a garden, a grove or an orchard from its seed; a cottage once the Fondaco is at its third
 * level, on one tile in two, then on every one (7), then a second and a shrine (12): the land is
 * lived on as the house grows. Its middle stays clear for its « + », its roads stay clear
 * (`keepOff`).
 */
export function domainTile(
  P: Palette,
  seed: number,
  casa: number,
  keepOff: (x: number, z: number) => boolean = () => false,
  terrain?: string,
): Built {
  const g = new Group();
  const rnd = seeded(seed * 3 + 11);
  // Its people's houses first, as the Fondaco rises: the land is dressed round them.
  const homes = casa >= 12 ? 2 : casa >= 7 ? 1 : casa >= 3 && seed % 2 === 0 ? 1 : 0;
  const corners: [number, number][] = [
    [-1.95, -1.95],
    [1.95, 1.9],
    [1.95, -1.95],
    [-1.95, 1.9],
  ];
  const built: [number, number][] = [];
  for (let k = 0; k < corners.length && built.length < homes; k++) {
    const [x, z] = corners[(k + seed) % corners.length] as [number, number];
    // The clay's pit holds that corner.
    if (keepOff(x, z) || (terrain === "clay" && x > 0 && z < 0)) continue;
    cottage(P, g, x, z, (rnd() - 0.5) * 0.5 + (k % 2 ? Math.PI / 2 : 0), casa >= 12 ? 1.12 : 1);
    // Its woodpile, a crate.
    if (!keepOff(x * 0.62, z)) crate(g, x * 0.62, 0, z, P.m("wood"), 0.22, rnd());
    built.push([x, z]);
  }
  const taken = (x: number, z: number) =>
    keepOff(x, z) || built.some(([bx, bz]) => Math.abs(bx - x) < 1.0 && Math.abs(bz - z) < 0.95);
  // Round its « + », off its roads and its houses.
  const free = (x: number, z: number, r = 0.5) =>
    Math.hypot(x, z) > 1.0 + r && !taken(x, z) && Math.abs(x) < 2.3 && Math.abs(z) < 2.3;
  const spot = (r = 0.5): [number, number] | null => {
    for (let k = 0; k < 14; k++) {
      const x = (rnd() - 0.5) * 4.6;
      const z = (rnd() - 0.5) * 4.6;
      if (free(x, z, r)) return [x, z];
    }
    return null;
  };

  if (isTerrain(terrain)) terrainDress(P, g, terrain, { seed, keepOff: taken });
  else {
    const look = LOOKS[seed % LOOKS.length];
    if (look === "garden") {
      // A hedge along a side, a cypress or two.
      const side = seed % 2 ? 2.55 : -2.55;
      for (let k = -4; k <= 4; k++) {
        const u = k * 0.52;
        if (!taken(u, side))
          ball(g, 0.26, u, 0.19, side, P.m("leaf"), 14).scale.set(1.15, 0.8, 0.9);
      }
      for (let k = 0; k < 2; k++) {
        const at = spot(0.3);
        if (at) tree(P, g, at[0], at[1], 0.85 + rnd() * 0.2, "cypress");
      }
    } else if (look === "grove") {
      for (let k = 0; k < 4; k++) {
        const at = spot(0.4);
        if (at) tree(P, g, at[0], at[1], 0.75 + rnd() * 0.4, k % 3 === 2 ? "cypress" : "round");
      }
    } else {
      // An orchard: small round trees in rows.
      for (const x of [-1.9, 1.9])
        for (const z of [-1.9, -0.65, 0.65, 1.9]) {
          const px = x + (rnd() - 0.5) * 0.2;
          if (free(px, z, 0.3)) tree(P, g, px, z, 0.62 + rnd() * 0.12, "round");
        }
    }
  }
  if (casa >= 12 && seed % 3 === 0) {
    // A wayside shrine: a pillar under a small roof.
    const at = spot(0.3);
    if (at) {
      box(g, 0.26, 0.7, 0.26, at[0], 0, at[1], P.m("wall2"), 0.03);
      const roof = cone(g, 0.3, 0.26, at[0], 0.7, at[1], P.m("roof", true), 4);
      roof.rotation.y = Math.PI / 4;
    }
  }
  return { group: g, pin: [0, 2, 0] };
}

/**
 * A site under way: its plot, its scaffold, its walls as high as its work is far (`progress`, 0 to
 * 1, by quarters), crates of accent.
 */
export function site(P: Palette, progress = 0): Built {
  const g = new Group();
  const k = Math.min(3, Math.max(0, Math.floor(progress * 4)));
  box(g, 4.4, 0.05, 4.4, 0, 0, 0, P.m("soil"), 0.25);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    box(g, 0.1, 1.8, 0.1, x, 0.05, z, P.m("wood"), 0.02);
  for (const y of [0.9, 1.75]) {
    box(g, 2.1, 0.07, 0.07, 0, y, -1, P.m("wood"), 0.015);
    box(g, 2.1, 0.07, 0.07, 0, y, 1, P.m("wood"), 0.015);
  }
  // A plank across at each stage reached, the walls rising under them.
  for (let n = 0; n <= k; n++) box(g, 0.07, 0.05, 2.1, -1 + n * 0.66, 0.9, 0, P.m("wood"), 0.012);
  box(g, 1.8, 0.4 + k * 0.38, 1.8, 0, 0.05, 0, P.m("wall2"), 0.03);
  if (k >= 2) box(g, 1.9, 0.06, 1.9, 0, 0.45 + k * 0.38, 0, P.m("trim"), 0.02);
  crate(g, 1.6, 0.05, 1.6, P.accent, 0.4);
  crate(g, 1.6, 0.45, 1.62, P.m("wood"), 0.34, 0.3);
  if (k >= 1) crate(g, -1.65, 0.05, 1.55, P.m("wood"), 0.36, 0.5);
  return { group: g, pin: [0, 2.4, 0] };
}
