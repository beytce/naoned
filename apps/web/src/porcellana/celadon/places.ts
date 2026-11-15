/**
 * What stands on the shared board, redrawn in the Céladon direction (docs/plan-celadon.md C4 and
 * C5): the towns by their size, the towers of the passages, the Rialto, the ship, and the pieces of
 * the Passe. Each keeps the signature of the older kit's model it replaces on the board.
 */
import { Group, type Material, type Object3D, PlaneGeometry, Shape, type Vector3 } from "three";
import type { Palette } from "../materials.js";
import type { Built, ModelOpts } from "../models/model.js";
import type { Vehicle } from "../models/vehicles.js";
import { cached, cone, cyl, dome, dyn, extrude, put, seeded } from "../shapes.js";
import { C, bx, group, heap, ring, rod } from "./kit.js";
import { barrel, bollard, crate, cypress } from "./pieces.js";

/* ---------- parts ---------- */

function opening(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  face: "x" | "z",
) {
  const m = C("shade");
  if (face === "z") {
    bx(p, w, h, 0.05, x, y, z, m).castShadow = false;
    rod(p, w / 2, 0.05, x, y + h, z, "z", m, 12).castShadow = false;
  } else {
    bx(p, 0.05, h, w, x, y, z, m).castShadow = false;
    rod(p, w / 2, 0.05, x, y + h, z, "x", m, 12).castShadow = false;
  }
}

function hip(
  p: Object3D,
  w: number,
  d: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
) {
  const m = cone(p, 1, 1, x, y, z, mat, 4);
  m.rotation.y = Math.PI / 4;
  m.scale.set(w * 0.72, h, d * 0.72);
  m.position.y = y + h / 2;
}

/** A house: its body on a plinth, a cornice, a hip roof, windows and a door on the faces one sees. */
function house(p: Object3D, x: number, z: number, w: number, d: number, h: number, n: number) {
  bx(p, w + 0.12, 0.1, d + 0.12, x, 0, z, C("stone2"), 0.03);
  bx(p, w, h, d, x, 0.1, z, C(n % 2 ? "porcelain" : "stone"), 0.05);
  bx(p, w + 0.1, 0.08, d + 0.1, x, h + 0.1, z, C("trim"), 0.02);
  hip(p, w, d, 0.5 + (n % 3) * 0.08, x, h + 0.18, z, C(n % 3 === 0 ? "celadon" : "roof"));
  const fz = z + d / 2 + 0.005;
  const fx = x + w / 2 + 0.005;
  opening(p, x - w * 0.22, 0.1, fz, 0.26, 0.34, "z");
  for (let k = 0; k < 2; k++) {
    if (h > 1.1) opening(p, x - w * 0.22 + k * w * 0.44, h * 0.62, fz, 0.16, 0.2, "z");
    opening(p, fx, h * (h > 1.1 ? 0.62 : 0.45), z - d * 0.22 + k * d * 0.44, 0.16, 0.2, "x");
  }
  cyl(p, 0.07, 0.07, 0.4, x + w * 0.25, h + 0.3, z - d * 0.2, C("porcelain"), 8);
  cyl(p, 0.11, 0.07, 0.1, x + w * 0.25, h + 0.7, z - d * 0.2, C("celadon2"), 8);
}

/** A flag on its pole: the cloth turns a little in the wind. */
function flag(
  p: Object3D,
  cloth: Material,
  x: number,
  y: number,
  z: number,
  h: number,
): (t: number) => void {
  cyl(p, 0.035, 0.035, h, x, y, z, C("ink"), 6);
  const g = dyn(group(p, x, y + h - 0.28, z));
  bx(g, 0.72, 0.42, 0.03, 0.38, 0, 0, cloth);
  return (t) => {
    g.rotation.y = Math.sin(t * 1.6) * 0.22;
  };
}

/* ---------- the towns ---------- */

/**
 * A town by its size (1 to 5): a hamlet round its well, a market town round its bell tower, a city
 * round its domed church; each on its paved plate with its quay, its trees and its goods.
 */
export function town(P: Palette, o: ModelOpts & { size: number; venetian?: boolean }): Built {
  void P;
  const g = new Group();
  const rnd = seeded(o.seed * 7 + 3);
  bx(g, 5.5, 0.1, 5.5, 0, 0, 0, C("stone"), 0.25);
  bx(g, 5.1, 0.02, 5.1, 0, 0.1, 0, C("trim"), 0.2).castShadow = false;
  let top = 2.6;
  const spots: [number, number, number][] =
    o.size <= 2
      ? [
          [-1.3, -1.0, 1.0],
          [1.0, -1.3, 1.2],
          [0.3, 1.0, 0.95],
        ]
      : o.size === 3
        ? [
            [-1.6, -1.6, 1.3],
            [0.3, -1.8, 1.6],
            [1.8, -0.5, 1.2],
            [-1.8, 0.5, 1.1],
            [1.4, 1.5, 1.35],
          ]
        : [
            [-1.9, -1.9, 1.5],
            [-0.5, -2.0, 1.8],
            [1.0, -1.9, 1.4],
            [2.0, -0.6, 1.7],
            [-2.0, -0.4, 1.3],
            [-1.9, 1.2, 1.5],
            [1.9, 1.0, 1.3],
            [0.6, 2.0, 1.1],
          ];
  const n = o.size === 1 ? 2 : o.size === 4 ? 6 : spots.length;
  spots
    .slice(0, n)
    .forEach(([x, z, h], i) =>
      house(g, x, z, 1.25 + rnd() * 0.25, 1.05 + rnd() * 0.2, h + rnd() * 0.25, i + o.seed),
    );
  if (o.size <= 2) {
    // the well of the hamlet, a tree, what waits on the quay
    cyl(g, 0.24, 0.26, 0.3, 1.6, 0.1, 0.2, C("porcelain"), 14);
    cyl(g, 0.18, 0.18, 0.02, 1.6, 0.38, 0.2, C("water"), 12).castShadow = false;
    for (const s of [-0.26, 0.26]) bx(g, 0.05, 0.6, 0.05, 1.6 + s, 0.4, 0.2, C("blond2"));
    bx(g, 0.62, 0.05, 0.08, 1.6, 0.98, 0.2, C("blond"));
    cypress(g, -1.9, 0.1, 1.6, 1.1);
  } else if (o.size === 3) {
    // the bell tower of the market town
    bx(g, 0.8, 3.0, 0.8, 0, 0.1, 0.3, C("porcelain"), 0.05);
    bx(g, 0.92, 0.1, 0.92, 0, 3.1, 0.3, C("trim"), 0.03);
    opening(g, 0, 2.4, 0.705, 0.26, 0.36, "z");
    opening(g, 0.405, 2.4, 0.3, 0.26, 0.36, "x");
    hip(g, 0.9, 0.9, 0.9, 0, 3.2, 0.3, C("celadon"));
    cypress(g, -0.7, 0.1, 2.1, 0.95);
    top = 4.6;
  } else {
    // the church of the city: its nave, its dome, its lantern
    bx(g, 1.9, 1.7, 1.7, 0, 0.1, 0.1, C("porcelain"), 0.06);
    bx(g, 2.0, 0.1, 1.8, 0, 1.8, 0.1, C("trim"), 0.03);
    cyl(g, 0.75, 0.75, 0.35, 0, 1.9, 0.1, C("porcelain"), 18);
    dome(g, 0.72, 0, 2.25, 0.1, C("celadon"));
    cyl(g, 0.1, 0.13, 0.3, 0, 2.93, 0.1, C("porcelain"), 8);
    heap(g, 0.09, 0, 3.3, 0.1, C("celadon2"), 1);
    opening(g, 0, 0.1, 0.955, 0.5, 0.6, "z");
    for (const z of [-0.3, 0.5]) opening(g, 0.955, 0.8, z, 0.2, 0.4, "x");
    if (o.size === 5) {
      bx(g, 0.6, 3.4, 0.6, 1.2, 0.1, 1.9, C("porcelain"), 0.05);
      hip(g, 0.7, 0.7, 0.8, 1.2, 3.5, 1.9, C("celadon"));
    }
    top = o.size === 5 ? 4.8 : 4.0;
  }
  // the quay toward the camera: bollards, goods
  bollard(g, 2.4, 0.1, 2.5);
  bollard(g, 1.2, 0.1, 2.5);
  crate(g, -0.3, 0.1, 2.4, 0.4);
  if (o.size >= 3) {
    crate(g, 0.15, 0.1, 2.45, 0.36);
    barrel(g, -2.4, 0.1, 2.3);
  }
  return { group: g, pin: [0, top, 0] };
}

/* ---------- the towers, the Rialto ---------- */

/** The tower of a passage: a round keep on its rock, banded in celadon, crenellated, its flag. */
export function rocca(P: Palette, cloth: Material): Built {
  void P;
  const g = new Group();
  cyl(g, 2.1, 2.3, 0.4, 0, 0, 0, C("stone2"), 10);
  cyl(g, 1.25, 1.45, 2.7, 0, 0.4, 0, C("porcelain"), 20);
  ring(g, 1.38, 0.05, 0, 1.3, 0, C("celadon"));
  cyl(g, 1.45, 1.3, 0.3, 0, 3.1, 0, C("trim"), 20);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    bx(
      g,
      0.34,
      0.3,
      0.34,
      Math.cos(a) * 1.25,
      3.4,
      Math.sin(a) * 1.25,
      C("porcelain"),
      0.04,
    ).rotation.y = -a;
  }
  opening(g, 0, 0.4, 1.42, 0.5, 0.6, "z");
  for (const a of [0.5, -0.4]) {
    const s = bx(g, 0.12, 0.5, 0.06, Math.sin(a) * 1.32, 1.9, Math.cos(a) * 1.32, C("shade"));
    s.rotation.y = a;
    s.castShadow = false;
  }
  // the chain's winch at its foot, a boat's ring
  bx(g, 0.5, 0.4, 0.5, 1.6, 0.4, 0.9, C("slate"), 0.05);
  rod(g, 0.16, 0.6, 1.6, 0.95, 0.9, "x", C("ink"), 10);
  bollard(g, -1.6, 0.4, 1.0);
  const wave = flag(g, cloth, 0, 3.4, 0, 1.7);
  return { group: g, pin: [0, 5.6, 0], tick: (t) => wave(t) };
}

/** The Rialto: the arcaded hall of the market, its bridge over the canal, its stalls, its tower. */
export function market(P: Palette): Built {
  void P;
  const g = new Group();
  bx(g, 5.6, 0.12, 5.6, 0, 0, 0, C("stone"), 0.25);
  // the hall, arcaded on the two faces one sees
  bx(g, 3.4, 1.3, 1.8, -0.6, 0.12, -1.5, C("porcelain"), 0.06);
  bx(g, 3.5, 0.1, 1.9, -0.6, 1.42, -1.5, C("trim"), 0.03);
  bx(g, 3.2, 0.7, 1.6, -0.6, 1.52, -1.5, C("porcelain"), 0.05);
  hip(g, 3.3, 1.7, 0.7, -0.6, 2.22, -1.5, C("roof"));
  for (let k = 0; k < 5; k++) opening(g, -1.9 + k * 0.65, 0.12, -0.595, 0.4, 0.6, "z");
  for (let k = 0; k < 2; k++) opening(g, 1.105, 0.12, -1.9 + k * 0.8, 0.4, 0.6, "x");
  // the tower
  bx(g, 0.8, 3.6, 0.8, 1.9, 0.12, -1.9, C("porcelain"), 0.05);
  bx(g, 0.92, 0.1, 0.92, 1.9, 3.72, -1.9, C("trim"), 0.03);
  opening(g, 1.9, 3.0, -1.495, 0.26, 0.36, "z");
  hip(g, 0.9, 0.9, 1.0, 1.9, 3.82, -1.9, C("celadon"));
  // the canal and its bridge
  bx(g, 5.6, 0.04, 1.1, 0, 0.11, 1.0, C("water")).castShadow = false;
  for (const z of [0.42, 1.58]) bx(g, 5.6, 0.14, 0.12, 0, 0.12, z, C("porcelain"), 0.03);
  const arch = group(g, 0.6, 0.12, 1.0);
  rod(arch, 0.9, 1.0, 0, 0, 0, "x", C("porcelain"), 20).scale.set(1, 1, 0.75);
  bx(arch, 1.02, 0.5, 1.5, 0, 0.5, 0, C("porcelain"), 0.05);
  bx(arch, 1.1, 0.08, 1.7, 0, 1.0, 0, C("trim"), 0.02);
  for (const s of [-0.5, 0.5])
    for (let k = 0; k < 4; k++) bx(arch, 0.06, 0.26, 0.06, s, 1.08, -0.6 + k * 0.4, C("celadon"));
  rod(arch, 0.36, 1.06, 0, 0.1, 0, "x", C("shade"), 14).castShadow = false;
  // the stalls: striped awnings, crates of goods
  for (const [x, tone] of [
    [-2.0, "celadon"],
    [-0.9, "blond"],
  ] as const) {
    for (const s of [-0.35, 0.35]) bx(g, 0.06, 0.8, 0.06, x + s, 0.12, 2.3, C("blond2"));
    const aw = bx(g, 0.9, 0.05, 0.8, x, 0.95, 2.3, C(tone), 0.02);
    aw.rotation.x = 0.25;
    bx(g, 0.8, 0.3, 0.5, x, 0.12, 2.3, C("blond"), 0.03);
    heap(g, 0.14, x - 0.2, 0.46, 2.3, C("brick"), 0.8);
    heap(g, 0.14, x + 0.2, 0.46, 2.3, C("leaf2"), 0.8);
  }
  crate(g, 2.2, 0.12, 2.3);
  barrel(g, 1.6, 0.12, 2.4);
  return { group: g, pin: [0, 5.0, 0] };
}

/* ---------- the ship ---------- */

/** The ship: a porcelain hull banded in celadon, a blond deck, its castle, its sail of accent. */
export function ship(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  const hull = cached("celadon:ship", () => {
    const s = new Shape();
    s.moveTo(-1.0, 0);
    s.lineTo(0.75, 0);
    s.quadraticCurveTo(1.2, 0.05, 1.35, 0.62);
    s.lineTo(-1.1, 0.62);
    s.quadraticCurveTo(-1.2, 0.15, -1.0, 0);
    return extrude(s, 0.72, 0.07);
  });
  put(g, hull, C("porcelain"));
  bx(g, 2.42, 0.08, 0.88, 0.07, 0.36, 0, C("celadon"), 0.03);
  bx(g, 2.3, 0.07, 0.74, 0.05, 0.6, 0, C("blond"), 0.02);
  // the castle at the stern, its windows; crates on the deck
  bx(g, 0.62, 0.36, 0.76, -0.75, 0.66, 0, C("porcelain"), 0.04);
  bx(g, 0.7, 0.06, 0.84, -0.75, 1.02, 0, C("trim"));
  for (const z of [-0.2, 0.2])
    bx(g, 0.03, 0.14, 0.14, -1.07, 0.78, z, C("shade")).castShadow = false;
  crate(g, 0.55, 0.67, 0.12, 0.28);
  crate(g, 0.85, 0.67, -0.1, 0.24);
  // the mast, its yard, its sail; a pennant
  cyl(g, 0.05, 0.06, 2.2, 0.05, 0.66, 0, C("blond2"), 8);
  rod(g, 0.03, 1.3, 0.12, 2.55, 0, "z", C("blond2"), 6);
  const sail = cached("celadon:sail", () => {
    const geo = new PlaneGeometry(1.25, 1.35, 8, 5);
    const sp = geo.getAttribute("position");
    for (let i = 0; i < sp.count; i++) {
      const u = sp.getX(i) / 0.625;
      const v = sp.getY(i) / 0.675;
      sp.setZ(i, (1 - u * u) * 0.22 * (0.7 + 0.3 * (1 - v * v)));
    }
    geo.computeVertexNormals();
    return geo;
  });
  put(g, sail, P.accentCloth, 0.16, 1.88, 0).rotation.y = Math.PI / 2;
  bx(g, 0.3, 0.12, 0.02, 0.2, 2.86, 0, C("celadon2"));
  return {
    group: g,
    tick: (t) => {
      g.rotation.x = o.running ? Math.sin(t * 1.2) * 0.03 : 0;
    },
  };
}

/* ---------- the pieces of the Passe ---------- */

/** A barge of the thread: the ship, its bow to the north. */
export function barge(P: Palette): Group {
  const g = new Group();
  const s = ship(P, { seed: 1, running: false });
  s.group.scale.setScalar(1.45);
  s.group.rotation.y = Math.PI / 2;
  g.add(s.group);
  return g;
}

/** A post of the chain: a bollard of ink on its stone, ringed in celadon, its cap, its shackle. */
export function post(P: Palette): Group {
  const g = new Group();
  cyl(g, 1.2, 1.3, 0.22, 0, 0, 0, C("stone2"), 12);
  cyl(g, 0.78, 0.95, 1.6, 0, 0.22, 0, P.ink, 18);
  ring(g, 0.9, 0.09, 0, 0.75, 0, C("celadon"));
  cyl(g, 1.1, 0.85, 0.28, 0, 1.82, 0, P.ink, 18);
  cyl(g, 0.5, 0.5, 0.1, 0, 2.1, 0, C("celadon2"), 14);
  ring(g, 0.3, 0.07, 0, 2.4, 0, C("slate"), "z");
  return g;
}

function along(a: Vector3, b: Vector3): { len: number; turn: number } {
  return { len: a.distanceTo(b), turn: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

/** The thread between two barges: the roads' ribbon of accent, laid flat. */
export function threadLink(P: Palette, a: Vector3, b: Vector3): Group {
  const g = new Group();
  const { len, turn } = along(a, b);
  bx(g, len, 0.09, 0.95, 0, 0.02, 0, P.accent, 0.03).castShadow = false;
  g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  g.rotation.y = turn;
  return g;
}

/** The chain between two posts: links of ink, one flat, one on edge. */
export function chainLink(P: Palette, a: Vector3, b: Vector3): Group {
  const g = new Group();
  const { len, turn } = along(a, b);
  const n = Math.max(3, Math.round(len / 0.95));
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + ((k + 0.5) * len) / n;
    if (k % 2) bx(g, 0.78, 0.34, 0.2, x, 0.12, 0, P.ink, 0.06);
    else bx(g, 0.78, 0.2, 0.42, x, 0.14, 0, P.ink, 0.06);
  }
  g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  g.rotation.y = turn;
  return g;
}

/** A bank's quay: blond planks on a porcelain wall, bollards, its rail (accent or ink). */
export function bank(P: Palette, len: number, rail: Material): Group {
  void P;
  const g = new Group();
  bx(g, len, 1.25, 2.6, 0, -1.25, 0, C("porcelain"), 0.16);
  bx(g, len - 0.1, 0.06, 2.5, 0, 0, 0, C("blond"), 0.02).castShadow = false;
  bx(g, len - 0.5, 0.42, 0.7, 0, 0.06, 0, rail, 0.1);
  const n = Math.max(2, Math.round(len / 7));
  for (let k = 0; k < n; k++) bollard(g, -len / 2 + 1.2 + (k * (len - 2.4)) / (n - 1), 0.06, 0.95);
  return g;
}
