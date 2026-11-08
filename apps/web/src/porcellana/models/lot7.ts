/**
 * The chains of Venice (docs/plan-publication.md lot 7, D11): proposals for the owner to validate
 * before their mechanics — Chioggia's salt pans, Murano's furnace on its quay with the soda of the
 * Levant, the Tana's rope walk for the Arsenal, and the Cadore's raft of logs on the river.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cyl, dome, gable, hipRoof, tree, windows } from "../shapes.js";
import { kilnGlow, smoke } from "./life.js";
import type { Built, ModelOpts } from "./model.js";

/**
 * The salt pans of Chioggia: shallow square basins of lagoon water, one drying white, heaps of salt
 * that grow while it works, a wooden sluice, the salter's hut.
 */
export function saltPans(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.2, 0.1, 5.2, 0, 0, 0, P.m("soil"), 0.05);
  const pans: [number, number, boolean][] = [
    [-1.3, -1.3, false],
    [1.3, -1.3, true],
    [-1.3, 1.1, true],
    [1.3, 1.1, false],
  ];
  for (const [x, z, dry] of pans) {
    box(g, 2.2, 0.14, 2.0, x, 0.1, z, P.m("trim"), 0.04);
    box(g, 1.9, 0.02, 1.7, x, 0.24, z, dry ? P.m("trim") : P.m("water"), 0.02).castShadow = false;
  }
  // The heaps of salt, white cones on the dry pans: the more the pans work, the higher.
  const heaps = new Group();
  for (const [x, z] of [
    [1.0, -1.1],
    [1.6, -1.6],
    [-1.6, 0.9],
  ] as [number, number][]) {
    const h = ball(heaps, 0.42, x, 0.3, z, P.m("trim"));
    h.scale.set(1, 1.1, 1);
  }
  g.add(heaps);
  // The sluice between the lagoon and the pans, of wood.
  box(g, 0.2, 0.5, 2.0, -2.45, 0.1, -0.1, P.m("wood"), 0.02);
  box(g, 0.5, 0.08, 0.5, -2.45, 0.6, -0.1, P.m("wood"), 0.02);
  // The salter's hut, a rake of accent leaning on it.
  box(g, 1.0, 0.8, 0.8, 2.1, 0.1, 2.25, P.m("wall"), 0.03);
  gable(P, g, 1.0, 0.8, 0.9, 0.4, 2.1, 2.25, 0);
  const rake = cyl(g, 0.025, 0.025, 1.0, 1.5, 0.1, 2.5, P.accent, 8);
  rake.rotation.z = 0.35;
  return {
    group: g,
    pin: [0, 1.8, 0],
    tick: (t) => {
      heaps.scale.y = o.running ? 1 + Math.sin(t * 0.4) * 0.05 : 0.8;
    },
  };
}

/**
 * Murano's furnace on its quay: the domed fornace with its mouth of accent and its tall chimney,
 * the casks of soda of the Levant stacked by the water, a boat of cristallo moored.
 */
export function muranoFurnace(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.2, 0.16, 3.6, 0, 0, -0.8, P.m("wall2"), 0.05);
  // The quay's stone edge on the lagoon side.
  box(g, 5.2, 0.24, 0.3, 0, 0, 1.15, P.m("trim"), 0.03);
  cyl(g, 1.1, 1.2, 0.9, -0.6, 0.16, -1.0, P.m("wall"), 48);
  dome(g, 1.1, -0.6, 1.06, -1.0, P.m("wall"));
  const mouth = box(g, 0.6, 0.55, 0.06, -0.6, 0.2, 0.18, P.glow, 0.02);
  const glow = kilnGlow(P, g, mouth, -0.6, 0.6, 0.7, o);
  box(g, 0.5, 3.8, 0.5, 0.4, 0.16, -2.0, P.m("wall2"), 0.03);
  box(g, 0.66, 0.14, 0.66, 0.4, 3.96, -2.0, P.m("trim"), 0.03);
  const puffs = smoke(g, 0.4, 4.15, -2.0, o);
  // The masters' house beside it, its windows arched.
  box(g, 1.6, 1.5, 1.4, 1.6, 0.16, -1.3, P.m("wall"), 0.04);
  hipRoof(P, g, 1.6, 1.4, 1.66, 0.5, 1.6, -1.3, 0.12);
  windows(P, g, 1.6, -1.3, 1.6, 1.4, 0.5, 1, 0, 0.2, 0.42, 0.5, true, [0]);
  // The soda of the Levant, in casks by the water: the glass's other half.
  for (const [x, z] of [
    [1.0, 0.6],
    [1.5, 0.6],
    [1.25, 0.6],
  ] as [number, number][])
    cyl(g, 0.2, 0.2, 0.45, x, 0.16 + (x === 1.25 ? 0.45 : 0), z, P.m("wood"), 18);
  // Cristallo on a bench: three vases, one of accent.
  for (const [i, x] of [-2.0, -1.7, -1.4].entries()) {
    const v = cyl(g, 0.06, 0.1, 0.32, x, 0.66, 0.6, i === 1 ? P.accent : P.m("trim"), 16);
    v.scale.y = 1 + (i % 2) * 0.3;
  }
  box(g, 1.1, 0.5, 0.4, -1.7, 0.16, 0.6, P.m("wood"), 0.03);
  return {
    group: g,
    pin: [-0.6, 3.0, -1.0],
    tick: (t, dt) => {
      glow(t);
      puffs(t);
      void dt;
    },
  };
}

/**
 * The Tana's rope walk for the Arsenal: a long low hall, its coils of hemp rope, a spinning wheel
 * that turns while it works, a rope of accent stretched along it.
 */
export function ropeWalk(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.4, 0.12, 4.0, 0, 0, 0, P.m("wall2"), 0.05);
  box(g, 5.0, 1.0, 1.2, 0, 0.12, -1.0, P.m("wall"), 0.04);
  gable(P, g, 5.0, 1.2, 1.12, 0.45, 0, -1.0, 0);
  windows(P, g, 0, -1.0, 5.0, 1.2, 0.3, 1, 0, 0.18, 0.36, 0.6, true, [0]);
  // The rope stretched along the yard, of accent, on its trestles.
  for (const x of [-2.0, -0.7, 0.6, 1.9]) box(g, 0.08, 0.6, 0.3, x, 0.12, 0.6, P.m("wood"), 0.02);
  box(g, 4.2, 0.05, 0.05, 0, 0.68, 0.6, P.accent, 0.01);
  // The coils of rope, round.
  for (const [x, z] of [
    [-2.1, 1.5],
    [-1.6, 1.5],
    [-1.85, 1.5],
  ] as [number, number][])
    cyl(g, 0.24, 0.24, 0.16, x, 0.12 + (x === -1.85 ? 0.16 : 0), z, P.m("wood"), 24);
  // The spinning wheel at the walk's head: it turns while the walk works.
  const wheel = new Group();
  wheel.position.set(2.3, 0.75, 0.6);
  const rim = cyl(wheel, 0.5, 0.5, 0.06, 0, -0.03, 0, P.m("wood"), 28);
  rim.rotation.x = Math.PI / 2;
  box(wheel, 0.9, 0.05, 0.05, 0, -0.025, 0, P.m("wood"), 0.01);
  box(wheel, 0.05, 0.9, 0.05, 0, -0.45, 0, P.m("wood"), 0.01);
  g.add(wheel);
  box(g, 0.2, 0.7, 0.2, 2.3, 0.12, 0.35, P.m("wood"), 0.02);
  tree(P, g, -2.4, -2.3, 0.9, "cypress");
  return {
    group: g,
    pin: [0, 2.2, -1.0],
    tick: (_t, dt) => {
      if (o.running) wheel.rotation.z += dt * 2.2;
    },
  };
}

/**
 * The Cadore's raft (« zattera »): logs of fir bound together, floated down the Piave to Venice,
 * its raftsman at the stern with his oar of accent. It rocks on the water.
 */
export function zattera(P: Palette): Built {
  const g = new Group();
  const raft = new Group();
  for (let k = 0; k < 6; k++) {
    const log = cyl(raft, 0.14, 0.14, 2.6, -0.75 + k * 0.3, 0.1, 0, P.m("wood"), 14);
    log.rotation.x = Math.PI / 2;
    log.position.y = 0.1;
  }
  box(raft, 1.9, 0.05, 0.12, 0, 0.22, -0.9, P.m("wood"), 0.01);
  box(raft, 1.9, 0.05, 0.12, 0, 0.22, 0.9, P.m("wood"), 0.01);
  // The raftsman and his oar.
  cyl(raft, 0.09, 0.13, 0.42, 0.2, 0.24, 1.0, P.m("trim"), 12);
  ball(raft, 0.09, 0.2, 0.76, 1.0, P.m("trim"), 12);
  const oar = cyl(raft, 0.025, 0.025, 1.4, 0.45, 0.2, 1.2, P.accent, 8);
  oar.rotation.x = 0.6;
  g.add(raft);
  return {
    group: g,
    pin: [0, 1.2, 0],
    tick: (t) => {
      raft.rotation.z = Math.sin(t * 1.2) * 0.03;
      raft.position.y = Math.sin(t * 1.5) * 0.03;
    },
  };
}
