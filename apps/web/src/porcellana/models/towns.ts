/**
 * The towns (docs/plan-porcellana.md § 4), by their size: a hamlet of two or three houses, a
 * market town of five round a small bell tower, a city on its block round its church; Venice's
 * houses with their funnel chimneys, and the Salute. A town out of reach stands in silhouette, its
 * windows filled. Its orders lie in crates on its quay (the map, lot 3).
 */
import { Group } from "three";
import { Shape } from "three";
import type { Palette } from "../materials.js";
import {
  arcadeGeo,
  ball,
  box,
  chimney,
  cone,
  cyl,
  dome,
  extrude,
  faces,
  gable,
  hipRoof,
  put,
  seeded,
  tree,
  windowGeo,
  windows,
} from "../shapes.js";
import type { Built, ModelOpts } from "./model.js";

/** A Venetian house: its string course, its arched windows, its water door, a hip roof, chimneys. */
export function venetianHouse(
  P: Palette,
  g: Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  tone: "wall" | "wall2",
  seed: number,
): void {
  box(g, w, h, d, x, 0, z, P.m(tone), 0.035);
  box(g, w + 0.06, 0.06, d + 0.06, x, 0.75, z, P.m("trim"), 0.01);
  const rows = Math.max(1, Math.floor((h - 0.95) / 0.62) + 1);
  windows(P, g, x, z, w, d, 0.95, rows, 0.62, 0.17, 0.36, 0.42, true);
  faces(
    g,
    x,
    z,
    w,
    d,
    (f, _len, off) => {
      put(f, windowGeo(0.36, 0.55, true), P.m("open"), 0, 0.02, off + 0.012);
    },
    [seed % 2 ? 0 : 1],
  );
  box(g, w + 0.14, 0.08, d + 0.14, x, h, z, P.m("trim"), 0.02);
  hipRoof(P, g, w, d, h + 0.08, 0.42 + (seed % 3) * 0.06, x, z, 0.1);
  chimney(P, g, x + w * 0.28, h + 0.15, z - d * 0.22);
  if (seed % 2) chimney(P, g, x - w * 0.3, h + 0.1, z + d * 0.18);
}

/** A house of the mainland: plain walls, a gable roof, a door, two windows. */
function mainlandHouse(
  P: Palette,
  g: Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  rot: number,
  tone: "wall" | "wall2",
) {
  const hg = new Group();
  hg.position.set(x, 0, z);
  hg.rotation.y = rot;
  g.add(hg);
  box(hg, w, h, d, 0, 0, 0, P.m(tone), 0.035);
  gable(P, hg, w, d, h, w * 0.42, 0, 0, 0, P.m(tone), 0.12, 0.08);
  box(hg, 0.32, 0.6, 0.05, 0, 0, d / 2 + 0.01, P.m("open"), 0.01);
  windows(P, hg, 0, 0, w, d, h * 0.45, 1, 0, 0.18, 0.28, 0.55, false, [1]);
}

/** A small bell tower: shaft, belfry of arches, pyramid. */
function bellTower(P: Palette, g: Group, x: number, z: number, h: number) {
  box(g, 0.8, h, 0.8, x, 0, z, P.m("wall2"), 0.03);
  box(g, 0.92, 0.08, 0.92, x, h, z, P.m("trim"), 0.02);
  box(g, 0.66, 0.6, 0.66, x, h + 0.08, z, P.m("open"), 0.02);
  faces(g, x, z, 0.8, 0.8, (f, _l, off) =>
    put(f, arcadeGeo(0.8, 0.6, 2, 0.2, 0.5, 0.07), P.m("wall"), 0, h + 0.08, off - 0.035),
  );
  box(g, 0.92, 0.08, 0.92, x, h + 0.68, z, P.m("trim"), 0.02);
  const sp = cone(g, 0.58, 1.1, x, h + 0.76, z, P.m("roof", true), 4);
  sp.rotation.y = Math.PI / 4;
}

/**
 * A town by its size (1 to 5): 1–2 a hamlet, 3 a market town round its bell tower, 4–5 a city
 * round its domed church. Its houses drawn from its seed. Pass `venetian` for the lagoon's towns.
 */
export function town(P: Palette, o: ModelOpts & { size: number; venetian?: boolean }): Built {
  const g = new Group();
  const rnd = seeded(o.seed * 7 + 3);
  box(g, 5.4, 0.08, 5.4, 0, 0, 0, P.m("trim"), 0.2);
  const house = (x: number, z: number, w: number, d: number, h: number, i: number) => {
    const tone = (i + o.seed) % 2 ? "wall" : "wall2";
    if (o.venetian) venetianHouse(P, g, x, z, w, d, h + 0.08, tone, i + o.seed);
    else mainlandHouse(P, g, x, z + 0, w, d, h, (rnd() - 0.5) * 0.3, tone);
  };
  let pin: [number, number, number] = [0, 3, 0];
  if (o.size <= 2) {
    const n = o.size === 1 ? 2 : 3;
    const spots: [number, number][] = [
      [-1.2, -0.8],
      [1.0, -1.2],
      [0.2, 1.1],
    ];
    for (let i = 0; i < n; i++) {
      const [x, z] = spots[i] as [number, number];
      house(x, z, 1.3 + rnd() * 0.3, 1.1 + rnd() * 0.3, 1.0 + rnd() * 0.3, i);
    }
    tree(P, g, -1.9, 1.6, 1.0);
    tree(P, g, 2.0, 1.4, 0.9, "cypress");
    // The well of the hamlet.
    cyl(g, 0.22, 0.24, 0.3, 1.6, 0.08, -0.1, P.m("wall2"), 24);
    pin = [0, 2.6, 0];
  } else if (o.size === 3) {
    const spots: [number, number, number][] = [
      [-1.6, -1.5, 1.6],
      [0.4, -1.8, 1.9],
      [1.9, -0.6, 1.5],
      [-1.8, 0.7, 1.4],
      [1.5, 1.6, 1.7],
    ];
    spots.forEach(([x, z, h], i) => house(x, z, 1.4, 1.2, h + rnd() * 0.4, i));
    bellTower(P, g, -0.1, 0.4, 3.0);
    tree(P, g, -0.6, 2.2, 0.8);
    pin = [-0.1, 5.4, 0.4];
  } else {
    // A city: a block of houses round its church and its dome.
    const spots: [number, number, number, number][] = [
      [-1.9, -1.9, 1.3, 2.3],
      [-0.5, -2.0, 1.2, 2.7],
      [1.0, -2.0, 1.4, 2.1],
      [2.1, -0.6, 1.0, 2.5],
      [-2.0, -0.3, 1.1, 2.0],
      [-1.9, 1.6, 1.4, 1.8],
      [2.0, 1.4, 1.2, 2.2],
    ];
    spots.forEach(([x, z, w, h], i) => house(x, z, w, 1.1, h + (o.size - 4) * 0.4, i));
    box(g, 2.0, 1.6, 2.6, 0.1, 0.08, 0.5, P.m("wall"), 0.04);
    faces(
      g,
      0.1,
      0.5,
      2.0,
      2.6,
      (f, len, off) =>
        put(f, arcadeGeo(len, 1.0, 3, 0.36, 0.8, 0.08), P.m("trim"), 0, 0.08, off + 0.04),
      [0, 1],
    );
    box(g, 2.12, 0.1, 2.72, 0.1, 1.68, 0.5, P.m("trim"), 0.02);
    cyl(g, 0.72, 0.72, 0.4, 0.1, 1.78, 0.5, P.m("wall2"), 40);
    dome(g, 0.78, 0.1, 2.18, 0.5, P.m("wall"), 1.15);
    cyl(g, 0.12, 0.12, 0.3, 0.1, 3.05, 0.5, P.m("wall2"), 16);
    ball(g, 0.1, 0.1, 3.42, 0.5, o.size === 5 ? P.accent : P.m("trim"), 16);
    bellTower(P, g, 1.6, -0.4 + 2.4, 3.6 + (o.size - 4) * 0.6);
    pin = [0.1, 4.6 + (o.size - 4) * 0.6, 0.5];
  }
  return { group: g, pin };
}

/** Venice's houses on their island: a row by the water, a campo with its well. */
export function veniceHouses(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.6, 0.08, 5.6, 0, 0, 0, P.m("trim"), 0.2);
  const plan: [number, number, number, number, number][] = [
    [-1.75, -1.6, 1.5, 1.6, 2.3],
    [-0.1, -1.7, 1.4, 1.4, 2.9],
    [1.55, -1.6, 1.6, 1.6, 2.0],
    [-1.6, 0.6, 1.8, 1.6, 1.8],
    [1.4, 0.5, 1.6, 1.8, 2.5],
  ];
  plan.forEach(([x, z, w, d, h], i) =>
    venetianHouse(
      P,
      g,
      x,
      z,
      w,
      d,
      h + ((o.seed + i) % 3) * 0.25,
      (i + o.seed) % 2 ? "wall" : "wall2",
      i + o.seed,
    ),
  );
  cyl(g, 0.28, 0.3, 0.32, 0, 0.08, 1.9, P.m("wall2"), 28);
  cyl(g, 0.2, 0.2, 0.34, 0, 0.08, 1.9, P.m("open"), 24);
  tree(P, g, -2.3, 2.3, 0.8);
  return { group: g, pin: [0, 3.8, -0.5] };
}

/** The Salute: the octagonal church under its great dome, its portico, its twin bell towers. */
export function salute(P: Palette): Built {
  const g = new Group();
  box(g, 5.6, 0.08, 5.6, 0, 0, 0, P.m("trim"), 0.2);
  const y = 0.08;
  box(g, 3.6, 0.2, 3.6, 0, y, 0, P.m("trim"), 0.04);
  box(g, 3.3, 0.2, 3.3, 0, y + 0.2, 0, P.m("wall2"), 0.04);
  cyl(g, 1.45, 1.45, 1.8, 0, y + 0.4, 0, P.m("wall", true), 8).rotation.y = Math.PI / 8;
  windows(P, g, 0, 0, 2.5, 2.5, y + 0.95, 1, 0, 0.24, 0.6, 1, true, [0, 1]);
  cyl(g, 1.55, 1.55, 0.12, 0, y + 2.2, 0, P.m("trim", true), 8).rotation.y = Math.PI / 8;
  cyl(g, 1.08, 1.08, 0.75, 0, y + 2.32, 0, P.m("wall2", true), 16).rotation.y = Math.PI / 16;
  dome(g, 1.15, 0, y + 3.07, 0, P.m("wall"), 1.2);
  cyl(g, 0.26, 0.26, 0.45, 0, y + 4.42, 0, P.m("wall"), 16);
  cone(g, 0.3, 0.35, 0, y + 4.87, 0, P.m("roof"), 16);
  ball(g, 0.08, 0, y + 5.3, 0, P.accent, 16);
  box(g, 1.3, 1.6, 0.4, 0, y + 0.4, 1.55, P.m("trim"), 0.02);
  put(g, arcadeGeo(1.3, 1.6, 1, 0.6, 1.35, 0.06), P.m("wall"), 0, y + 0.4, 1.78);
  const ped = new Shape();
  ped.moveTo(-0.75, 0);
  ped.lineTo(0.75, 0);
  ped.lineTo(0, 0.45);
  ped.lineTo(-0.75, 0);
  put(g, extrude(ped, 0.45, 0.02), P.m("trim"), 0, y + 2.0, 1.55);
  cyl(g, 0.75, 0.75, 1.4, 0, y + 0.4, -1.75, P.m("wall2"), 32);
  dome(g, 0.7, 0, y + 1.8, -1.75, P.m("wall"), 1.1);
  for (const s of [-1, 1]) {
    cyl(g, 0.18, 0.18, 2.3, s * 1.0, y + 0.4, -2.0, P.m("wall"), 20);
    cone(g, 0.22, 0.5, s * 1.0, y + 2.7, -2.0, P.m("roof"), 20);
  }
  return { group: g, pin: [0, 6.0, 0] };
}
