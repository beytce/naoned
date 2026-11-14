/**
 * The works of prestige of an island (docs/plan-economie.md C3): they make nothing, and are seen by
 * all. Porcellana's white, a touch of accent at the top of each, as on the Salute.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { arcadeGeo, ball, box, cone, cyl, dome, hipRoof, put, tree, windows } from "../shapes.js";
import type { Built } from "./model.js";

/** The pavement every work stands on. */
function pavement(P: Palette, g: Group): number {
  box(g, 5.4, 0.08, 5.4, 0, 0, 0, P.m("trim"), 0.2);
  return 0.08;
}

/** A fountain: a well-head on its steps, the lion's ball of accent on its post. */
export function fontaine(P: Palette): Built {
  const g = new Group();
  const y = pavement(P, g);
  cyl(g, 1.5, 1.6, 0.16, 0, y, 0, P.m("wall2"), 40);
  cyl(g, 1.2, 1.3, 0.16, 0, y + 0.16, 0, P.m("trim"), 40);
  cyl(g, 0.9, 0.95, 0.75, 0, y + 0.32, 0, P.m("wall"), 32);
  cyl(g, 0.72, 0.72, 0.04, 0, y + 1.05, 0, P.m("water"), 32).castShadow = false;
  for (const s of [-1, 1]) box(g, 0.12, 1.1, 0.12, s * 0.75, y + 1.07, 0, P.m("wall2"), 0.02);
  box(g, 1.7, 0.12, 0.16, 0, y + 2.17, 0, P.m("trim"), 0.02);
  ball(g, 0.14, 0, y + 2.45, 0, P.accent, 18);
  tree(P, g, -1.9, 1.8, 0.9, "cypress");
  tree(P, g, 1.9, -1.8, 0.9, "cypress");
  return { group: g, pin: [0, 3.2, 0] };
}

/** A loggia: a light arcade under a hip roof, open to the quay. */
export function loggia(P: Palette): Built {
  const g = new Group();
  const y = pavement(P, g);
  box(g, 3.8, 0.2, 2.4, 0, y, 0, P.m("wall2"), 0.04);
  put(g, arcadeGeo(3.6, 1.8, 3, 0.8, 1.45, 0.16), P.m("wall"), 0, y + 0.2, 1.1);
  put(g, arcadeGeo(3.6, 1.8, 3, 0.8, 1.45, 0.16), P.m("wall"), 0, y + 0.2, -1.1);
  box(g, 3.8, 0.5, 2.4, 0, y + 2.0, 0, P.m("wall2"), 0.03);
  windows(P, g, 0, 0, 3.6, 2.2, y + 2.08, 1, 0, 0.18, 0.28, 0.7, true, [0, 2]);
  hipRoof(P, g, 3.9, 2.5, y + 2.5, 0.6, 0, 0, 0.1);
  ball(g, 0.1, 0, y + 3.2, 0, P.accent, 16);
  return { group: g, pin: [0, 4.0, 0] };
}

/** A campanile: the tall square tower of brick, its belfry open, its spire, its angel of accent. */
export function campanile(P: Palette): Built {
  const g = new Group();
  const y = pavement(P, g);
  box(g, 1.5, 0.3, 1.5, 0, y, 0, P.m("trim"), 0.03);
  box(g, 1.3, 4.2, 1.3, 0, y + 0.3, 0, P.m("wall2"), 0.03);
  windows(P, g, 0, 0, 1.3, 1.3, y + 1.4, 3, 1.0, 0.14, 0.42, 1, true, [0, 1, 2, 3]);
  box(g, 1.44, 0.12, 1.44, 0, y + 4.5, 0, P.m("trim"), 0.02);
  // The belfry: four piers, the bells' shadow inside.
  for (const [x, z] of [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ] as const)
    box(g, 0.2, 0.9, 0.2, x, y + 4.62, z, P.m("wall"), 0.02);
  box(g, 0.6, 0.6, 0.6, 0, y + 4.7, 0, P.m("open"), 0.02);
  box(g, 1.44, 0.14, 1.44, 0, y + 5.52, 0, P.m("trim"), 0.02);
  box(g, 1.0, 0.7, 1.0, 0, y + 5.66, 0, P.m("wall"), 0.02);
  cone(g, 0.72, 1.6, 0, y + 6.36, 0, P.m("roof"), 4).rotation.y = Math.PI / 4;
  ball(g, 0.12, 0, y + 8.05, 0, P.accent, 16);
  return { group: g, pin: [0, 8.8, 0] };
}

/** A Scuola Grande: a long front of arcades over two storeys, a crowning of accent. */
export function scuola(P: Palette): Built {
  const g = new Group();
  const y = pavement(P, g);
  box(g, 4.6, 0.2, 3.4, 0, y, -0.2, P.m("trim"), 0.04);
  box(g, 4.2, 3.4, 3.0, 0, y + 0.2, -0.2, P.m("wall"), 0.04);
  put(g, arcadeGeo(4.2, 1.5, 4, 0.7, 1.2, 0.1), P.m("wall2"), 0, y + 0.2, 1.36);
  windows(P, g, 0, -0.2, 4.2, 3.0, y + 2.0, 1, 0, 0.3, 0.8, 0.95, true, [0]);
  box(g, 4.4, 0.16, 3.2, 0, y + 3.6, -0.2, P.m("trim"), 0.02);
  // The crowning: three half-moons of the Venetian front, the middle one higher.
  for (const [x, r] of [
    [-1.4, 0.55],
    [0, 0.75],
    [1.4, 0.55],
  ] as const) {
    const d = dome(g, r, x, y + 3.76, 1.1, P.m("wall"), 1);
    d.scale.z = 0.25;
  }
  ball(g, 0.12, 0, y + 4.66, 1.1, P.accent, 16);
  return { group: g, pin: [0, 5.4, 0] };
}

/** A basilica: the domes of Saint Mark's, five on a cross, the great one in the middle. */
export function basilique(P: Palette): Built {
  const g = new Group();
  const y = pavement(P, g);
  box(g, 4.8, 0.24, 4.8, 0, y, 0, P.m("trim"), 0.04);
  box(g, 4.2, 2.2, 2.0, 0, y + 0.24, 0, P.m("wall"), 0.04);
  box(g, 2.0, 2.2, 4.2, 0, y + 0.24, 0, P.m("wall"), 0.04);
  put(g, arcadeGeo(4.2, 1.6, 5, 0.6, 1.35, 0.1), P.m("wall2"), 0, y + 0.24, 1.06);
  for (const [x, z, r, h] of [
    [0, 0, 1.0, 0.7],
    [-1.6, 0, 0.6, 0.4],
    [1.6, 0, 0.6, 0.4],
    [0, -1.6, 0.6, 0.4],
    [0, 1.6, 0.6, 0.4],
  ] as const) {
    cyl(g, r * 0.9, r * 0.9, h, x, y + 2.44, z, P.m("wall2"), 24);
    dome(g, r, x, y + 2.44 + h, z, P.m("wall"), 1.15);
    ball(g, r * 0.12, x, y + 2.44 + h + r * 1.2, z, P.accent, 12);
  }
  return { group: g, pin: [0, 5.6, 0] };
}
