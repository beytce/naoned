import * as THREE from "three";
import { type Model, box, cone, cyl, house, shadowBlob, sphere } from "../domain3d/models.js";

/**
 * The cities of the Veneto as models on the map (about three units across, centred on the
 * origin): ramparts and towers, a campanile, roofs; each with what it is known for. Venice
 * stands on the water, without walls.
 */

export interface Town {
  group: THREE.Group;
  /** Windows, lit at night. */
  windows: THREE.Mesh[];
  /** Flags that sway. */
  flags: THREE.Object3D[];
  /** Height of the highest roof, for the label above it. */
  top: number;
}

function blank(): Model {
  return {
    group: new THREE.Group(),
    spin: [],
    sway: [],
    smoke: [],
    fire: [],
    windows: [],
    top: 1,
  };
}

/** A deterministic draw from the city's name, so each town keeps its look. */
function seeded(code: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

function walls(g: THREE.Group, half: number) {
  const h = 0.36;
  const t = 0.14;
  box(g, half * 2, h, t, "stone", 0, 0, -half, 0.03);
  box(g, half * 2, h, t, "stone", 0, 0, half, 0.03);
  box(g, t, h, half * 2, "stone", -half, 0, 0, 0.03);
  box(g, t, h, half * 2, "stone", half, 0, 0, 0.03);
  // Battlements along the two seen faces.
  for (let i = -half + 0.12; i < half; i += 0.24) {
    box(g, 0.1, 0.08, t, "stone", i, h, half, 0.01);
    box(g, t, 0.08, 0.1, "stone", half, h, i, 0.01);
  }
  for (const [x, z] of [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ] as const) {
    cyl(g, 0.17, 0.19, 0.58, "stone", x, 0, z, 12);
    cone(g, 0.22, 0.3, "roof", x, 0.58, z, 12);
  }
  // The gate on the south face.
  box(g, 0.34, 0.5, 0.2, "stone", 0.2, 0, half, 0.03);
  box(g, 0.18, 0.28, 0.04, "#3A2A1E", 0.2, 0, half + 0.1, 0.01);
}

function campanile(m: Model, g: THREE.Group, x: number, z: number, h: number): number {
  box(g, 0.3, h, 0.3, "brick", x, 0, z, 0.02);
  box(g, 0.34, 0.18, 0.34, "stone", x, h, z, 0.02);
  const bell = box(g, 0.12, 0.1, 0.02, "window", x, h + 0.04, z + 0.17, 0.005);
  m.windows.push(bell);
  const roof = cone(g, 0.25, 0.5, "roof", x, h + 0.18, z, 4);
  roof.rotation.y = Math.PI / 4;
  return h + 0.7;
}

function flag(g: THREE.Group, flags: THREE.Object3D[], x: number, y: number, z: number) {
  cyl(g, 0.018, 0.018, 0.5, "#C98E52", x, y, z, 6);
  const f = new THREE.Group();
  f.position.set(x, y + 0.42, z);
  box(f, 0.24, 0.13, 0.015, "#C8462A", 0.12, 0, 0, 0.005);
  g.add(f);
  flags.push(f);
}

/** The town of `code` (venezia, padova, verona, vicenza, treviso, mantova, ferrara). */
export function townModel(code: string): Town {
  const m = blank();
  const g = m.group;
  const flags: THREE.Object3D[] = [];
  const rnd = seeded(code);
  let top = 1;
  const venice = code === "venezia";
  if (venice) {
    // Quays around an island of houses; St Mark's domes and its campanile.
    box(g, 3.2, 0.12, 2.6, "stone", 0, 0, 0, 0.04);
    box(g, 1.1, 0.5, 0.7, "plaster-warm", 0.6, 0.12, 0.6, 0.04);
    for (const [dx, dz, r] of [
      [0.6, 0.6, 0.26],
      [0.25, 0.6, 0.18],
      [0.95, 0.6, 0.18],
    ] as const) {
      cyl(g, r * 0.9, r * 0.9, 0.12, "plaster-warm", dx, 0.62, dz, 14);
      sphere(g, r, "#C9B79A", dx, 0.74, dz, 0.9);
      sphere(g, 0.04, "gold", dx, 0.74 + r * 0.9, dz);
    }
    top = Math.max(top, campanile(m, g, -0.25, 0.75, 1.8));
  } else {
    box(g, 2.8, 0.06, 2.8, "paving", 0, 0, 0, 0.03);
    walls(g, 1.3);
  }
  // Houses on a loose grid, avoiding the town's landmark at the front right.
  const spots: [number, number][] = venice
    ? [
        [-1.1, -0.8],
        [-0.4, -0.8],
        [0.4, -0.8],
        [1.1, -0.8],
        [-1.15, 0.1],
        [1.2, -0.1],
        [-0.5, 0.05],
      ]
    : [
        [-0.75, -0.75],
        [0.05, -0.8],
        [0.8, -0.75],
        [-0.8, 0.05],
        [-0.75, 0.8],
        [0.0, 0.0],
      ];
  for (const [x, z] of spots) {
    const w = 0.42 + rnd() * 0.22;
    const d = 0.4 + rnd() * 0.18;
    const h = 0.38 + rnd() * 0.32;
    top = Math.max(
      top,
      house(m, g, {
        w,
        d,
        h,
        wall: rnd() > 0.5 ? "plaster" : "plaster-warm",
        roof: rnd() > 0.6 ? "roof-dark" : "roof",
        x,
        z,
        y: venice ? 0.12 : 0.06,
        along: rnd() > 0.5 ? "x" : "z",
        rise: 0.22,
      }),
    );
  }
  // What each town is known for.
  if (code === "verona") {
    // The Arena.
    cyl(g, 0.62, 0.66, 0.34, "stone", 0.62, 0.06, 0.62, 24);
    cyl(g, 0.44, 0.44, 0.36, "dirt", 0.62, 0.06, 0.62, 20);
  } else if (code === "ferrara") {
    // The Este castle, its four towers and its moat.
    cyl(g, 0.78, 0.78, 0.04, "water", 0.62, 0.05, 0.62, 4).rotation.y = Math.PI / 4;
    box(g, 0.8, 0.6, 0.8, "brick", 0.62, 0.06, 0.62, 0.03);
    for (const [dx, dz] of [
      [-0.38, -0.38],
      [0.38, -0.38],
      [-0.38, 0.38],
      [0.38, 0.38],
    ] as const) {
      box(g, 0.26, 0.85, 0.26, "brick", 0.62 + dx, 0.06, 0.62 + dz, 0.02);
      box(g, 0.3, 0.12, 0.3, "roof", 0.62 + dx, 0.91, 0.62 + dz, 0.02);
    }
    top = Math.max(top, 1.1);
  } else if (code === "padova") {
    // The Santo's domes.
    box(g, 0.9, 0.42, 0.6, "brick", 0.62, 0.06, 0.62, 0.03);
    for (const dx of [0.35, 0.62, 0.89]) sphere(g, 0.15, "#9AA5A0", dx, 0.52, 0.62, 0.9);
  } else if (code === "mantova") {
    // The palazzo by the lakes.
    box(g, 0.9, 0.55, 0.6, "plaster-warm", 0.62, 0.06, 0.62, 0.03);
    box(g, 0.94, 0.06, 0.64, "stone", 0.62, 0.61, 0.62, 0.02);
  } else if (!venice) {
    top = Math.max(top, campanile(m, g, 0.62, 0.62, 1.2));
  }
  if (!venice && code !== "ferrara") top = Math.max(top, campanile(m, g, 0.75, -0.2, 1.0));
  flag(g, flags, -1.3, 0.58, 1.3);
  shadowBlob(g, 3.4, 3.4);
  return { group: g, windows: m.windows, flags, top };
}

/** The merchant's counting house at the head of its roads: a warehouse, a yard, a gold banner. */
export function depotModel(mine: boolean): Town {
  const m = blank();
  const g = m.group;
  const flags: THREE.Object3D[] = [];
  box(g, 1.7, 0.05, 1.3, "paving", 0, 0, 0, 0.03);
  const top = house(m, g, {
    w: 0.9,
    d: 0.6,
    h: 0.5,
    wall: mine ? "plaster-warm" : "plaster",
    roof: mine ? "roof-gold" : "roof-dark",
    x: -0.25,
    z: -0.2,
    y: 0.05,
    along: "x",
    rise: 0.26,
  });
  for (const [x, z] of [
    [0.45, 0.25],
    [0.6, 0.4],
  ] as const) {
    box(g, 0.2, 0.18, 0.2, "wood", x, 0.05, z, 0.02);
  }
  if (mine) {
    cyl(g, 0.02, 0.025, 1.1, "#C98E52", 0.65, 0.05, -0.4, 8);
    const f = new THREE.Group();
    f.position.set(0.65, 1.0, -0.4);
    box(f, 0.34, 0.2, 0.02, "#E8B24C", 0.17, 0, 0, 0.01);
    g.add(f);
    flags.push(f);
  }
  shadowBlob(g, 2, 1.6);
  return { group: g, windows: m.windows, flags, top: Math.max(top, mine ? 1.2 : top) };
}

/** A bandits' camp beside the road: a red tent and a fire. */
export function campModel(): { group: THREE.Group; fire: THREE.Mesh } {
  const g = new THREE.Group();
  const tent = cone(g, 0.32, 0.42, "#B8432F", 0, 0, 0, 4);
  tent.rotation.y = Math.PI / 4;
  for (let i = 0; i < 3; i++) {
    const log = cyl(g, 0.025, 0.025, 0.22, "wood", 0.42, 0.02, 0.1, 6);
    log.rotation.set(Math.PI / 2, i * 1.05, 0);
  }
  const fire = cone(g, 0.07, 0.16, "glow", 0.42, 0.02, 0.1, 8);
  shadowBlob(g, 0.9, 0.8);
  return { group: g, fire };
}
