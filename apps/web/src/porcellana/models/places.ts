/**
 * The house's other places (docs/plan-porcellana.md § 4): the Remise at its quay (the prototype's
 * port), the Campo, the Porta on the map, the Arsenal, a trading post.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import {
  arcadeGeo,
  ball,
  box,
  cone,
  crate,
  cyl,
  dyn,
  faces,
  gable,
  hipRoof,
  put,
  tree,
  windows,
} from "../shapes.js";
import type { Built, ModelOpts } from "./model.js";

/** The Remise on its quay: the stone edge, bollards, a warehouse, a crane that loads, crates, a pier. */
export function depot(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.8, 0.12, 1.2, 0, 0, 2.3, P.m("trim"), 0.04);
  for (const x of [-2.4, -1.2, 1.2, 2.4]) cyl(g, 0.09, 0.11, 0.3, x, 0.12, 2.7, P.ink, 16);
  box(g, 1.1, 0.14, 2.6, 1.6, -0.08, 4.0, P.m("wood"), 0.03);
  for (const z of [3.0, 3.9, 4.8])
    for (const s of [-1, 1]) cyl(g, 0.07, 0.07, 0.6, 1.6 + s * 0.48, -0.55, z, P.m("wood"), 12);
  box(g, 2.6, 1.5, 2.2, -1.4, 0, -1.2, P.m("wall"), 0.04);
  gable(P, g, 2.6, 2.2, 1.5, 0.75, -1.4, -1.2, Math.PI / 2);
  box(g, 0.8, 1.0, 0.05, -1.4, 0, -0.08, P.m("open"), 0.01);
  windows(P, g, -1.4, -1.2, 2.6, 2.2, 1.1, 1, 0, 0.2, 0.3, 0.6, true, [1]);
  const spots: [number, number, number][] = [
    [-2.2, 0.9, 0],
    [-1.75, 0.9, 0],
    [-2.0, 0.9, 1],
    [1.0, 1.0, 0],
    [1.45, 1.0, 0],
    [1.2, 1.45, 0],
    [1.2, 1.0, 1],
  ];
  spots.forEach(([x, z, lvl], i) => {
    crate(g, x, lvl * 0.42, z, i % 3 === 1 ? P.accent : P.m("wood"), 0.42, (i % 2) * 0.12);
  });
  const cr = dyn(new Group());
  cr.position.set(2.4, 0, -0.6);
  g.add(cr);
  box(cr, 0.2, 2.6, 0.2, 0, 0, 0, P.m("wood"), 0.03);
  box(cr, 2.0, 0.14, 0.14, 0.7, 2.5, 0, P.m("wood"), 0.03);
  box(cr, 0.08, 1.2, 0.08, 0.38, 1.75, 0, P.m("wood"), 0.02).rotation.z = -0.75;
  cyl(cr, 0.012, 0.012, 1.0, 1.55, 1.5, 0, P.ink, 6);
  crate(cr, 1.55, 1.1, 0, P.accent, 0.4);
  return {
    group: g,
    pin: [-1.4, 3.4, -1.2],
    tick: (t) => {
      if (o.running) cr.rotation.y = -1.2 + Math.sin(t * 0.35) * 0.9;
    },
  };
}

/** The Campo: a paved square, its well-head, a portico, two trees, a bench. */
export function campo(P: Palette): Built {
  const g = new Group();
  box(g, 5.4, 0.08, 5.4, 0, 0, 0, P.m("trim"), 0.2);
  for (let i = -4; i <= 4; i++) {
    box(g, 0.03, 0.01, 5.0, i * 0.6, 0.08, 0, P.m("wall2"), 0.004);
    box(g, 5.0, 0.01, 0.03, 0, 0.08, i * 0.6, P.m("wall2"), 0.004);
  }
  // The well-head (vera da pozzo).
  cyl(g, 0.5, 0.55, 0.12, 0.4, 0.08, 0.5, P.m("wall2"), 32);
  cyl(g, 0.38, 0.42, 0.5, 0.4, 0.2, 0.5, P.m("wall"), 32);
  cyl(g, 0.26, 0.26, 0.52, 0.4, 0.2, 0.5, P.m("open"), 24);
  cyl(g, 0.44, 0.44, 0.06, 0.4, 0.7, 0.5, P.m("trim"), 32);
  // The portico on its columns.
  box(g, 3.6, 0.2, 1.2, -0.6, 0.08, -1.9, P.m("wall2"), 0.03);
  for (let i = 0; i < 5; i++) cyl(g, 0.1, 0.12, 1.6, -2.2 + i * 0.8, 0.28, -1.5, P.m("wall"), 20);
  box(g, 3.6, 1.6, 0.3, -0.6, 0.28, -2.35, P.m("wall"), 0.03);
  box(g, 3.8, 0.18, 1.3, -0.6, 1.88, -1.9, P.m("trim"), 0.03);
  gable(P, g, 1.3, 3.8, 2.06, 0.45, -0.6, -1.9, Math.PI / 2);
  tree(P, g, 2.0, -1.8, 1.0);
  tree(P, g, -2.0, 1.6, 0.9);
  box(g, 1.0, 0.25, 0.3, 1.8, 0.08, 1.7, P.m("wood"), 0.04);
  return { group: g, pin: [-0.6, 3.2, -1.9] };
}

/**
 * The Porta on the map (the door to the lands of Rome): a Roman arch between two round towers,
 * crenellated, in biscuit stone; its portcullis down while closed, up while it is open (`running`).
 */
export function porta(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.0, 0.12, 2.6, 0, 0, -0.4, P.m("wall2"), 0.05);
  box(g, 2.2, 2.6, 1.4, 0, 0.12, -0.4, P.m("wall"), 0.04);
  put(g, arcadeGeo(2.2, 2.0, 1, 1.1, 1.85, 0.12), P.m("trim"), 0, 0.12, 0.33);
  box(g, 1.0, 1.75, 1.3, 0, 0.12, -0.4, P.m("open"), 0.02);
  for (const s of [-1, 1]) {
    cyl(g, 0.85, 0.95, 3.2, s * 1.6, 0.12, -0.4, P.m("wall2"), 40);
    cyl(g, 0.98, 0.98, 0.14, s * 1.6, 3.32, -0.4, P.m("trim"), 40);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      box(
        g,
        0.24,
        0.26,
        0.24,
        s * 1.6 + Math.cos(a) * 0.82,
        3.46,
        -0.4 + Math.sin(a) * 0.82,
        P.m("wall2"),
        0.03,
      ).rotation.y = -a;
    }
    windows(P, g, s * 1.6, -0.4, 1.2, 1.2, 1.9, 1, 0, 0.14, 0.4, 1, true, [0]);
  }
  box(g, 2.4, 0.14, 1.6, 0, 2.72, -0.4, P.m("trim"), 0.03);
  for (let k = 0; k < 6; k++)
    box(g, 0.22, 0.24, 0.22, -0.9 + k * 0.36, 2.86, 0.3, P.m("wall"), 0.03);
  const grille = dyn(new Group());
  grille.position.set(0, 0.12, 0.42);
  g.add(grille);
  for (let k = 0; k < 6; k++) box(grille, 0.05, 1.7, 0.05, -0.45 + k * 0.18, 0, 0, P.ink, 0.01);
  for (const y of [0.45, 1.0, 1.5]) box(grille, 1.0, 0.05, 0.05, 0, y, 0, P.ink, 0.01);
  // The road out of it, toward the lands of Rome.
  box(g, 1.0, 0.03, 2.0, 0, 0, 1.85, P.m("roof"), 0.02);
  return {
    group: g,
    pin: [0, 4.4, -0.4],
    tick: () => {
      grille.position.y += ((o.running ? 1.6 : 0.12) - grille.position.y) * 0.08;
    },
  };
}

/** The Arsenal: two crenellated towers at a water gate, a long covered basin behind. */
export function arsenal(P: Palette): Built {
  const g = new Group();
  box(g, 5.6, 0.12, 5.6, 0, 0, 0, P.m("wall2"), 0.2);
  // The basin, its water inset, under a long roof on piers.
  box(g, 3.0, 0.02, 3.6, 0.6, 0.12, -0.6, P.m("water"), 0.05).castShadow = false;
  for (const x of [-0.9, 2.1])
    for (const z of [-2.2, -1.0, 0.2, 1.0]) box(g, 0.2, 1.4, 0.2, x, 0.12, z, P.m("wall"), 0.03);
  gable(P, g, 3.2, 3.6, 1.52, 0.9, 0.6, -0.6, 0);
  // The gate's towers, crenellated, square.
  {
    const z = 1.8;
    for (const x of [-0.6, 1.8]) {
      box(g, 1.0, 2.8, 1.0, x, 0.12, z, P.m("wall"), 0.03);
      box(g, 1.14, 0.12, 1.14, x, 2.92, z, P.m("trim"), 0.03);
      faces(g, x, z, 1.14, 1.14, (f, len, off) => {
        for (let k = 0; k < 3; k++)
          box(f, 0.2, 0.24, 0.16, (k - 1) * 0.38, 3.04, off - 0.08, P.m("wall"), 0.02);
      });
      windows(P, g, x, z, 1.0, 1.0, 1.7, 1, 0, 0.14, 0.4, 1, true, [0, 1]);
    }
    box(g, 1.4, 0.4, 0.6, 0.6, 2.2, z, P.m("wall2"), 0.03);
  }
  // The lion on its pillar, in accent: Saint Mark's.
  cyl(g, 0.16, 0.18, 1.0, -2.2, 0.12, 2.2, P.m("trim"), 20);
  ball(g, 0.18, -2.2, 1.3, 2.2, P.accent, 18);
  tree(P, g, -2.2, -2.0, 1.0, "cypress");
  return { group: g, pin: [0.6, 4.2, 0] };
}

/** A trading post: a small shop-house, its awning of accent, its crates. */
export function post(P: Palette): Built {
  const g = new Group();
  box(g, 3.4, 0.1, 3.0, 0, 0, -0.3, P.m("trim"), 0.04);
  box(g, 2.2, 1.7, 1.8, -0.2, 0.1, -0.6, P.m("wall"), 0.04);
  hipRoof(P, g, 2.2, 1.8, 1.8, 0.55, -0.2, -0.6, 0.12);
  windows(P, g, -0.2, -0.6, 2.2, 1.8, 1.0, 1, 0, 0.2, 0.42, 0.6, true, [1]);
  box(g, 0.6, 0.95, 0.05, -0.2, 0.1, 0.32, P.m("open"), 0.01);
  const awning = box(g, 2.0, 0.06, 0.8, -0.2, 1.2, 0.62, P.accent, 0.02);
  awning.rotation.x = 0.32;
  for (const x of [-1.1, 0.7]) box(g, 0.05, 1.1, 0.05, x, 0.1, 0.95, P.m("wood"), 0.01);
  crate(g, 1.3, 0.1, 0.6, P.m("wood"));
  crate(g, 1.3, 0.52, 0.62, P.m("wood"), 0.36, 0.2);
  cone(g, 0.2, 0.3, 1.9, 0.1, -0.4, P.m("wood"), 16);
  return { group: g, pin: [-0.2, 3.0, -0.6] };
}
