/**
 * A workshop's inside (docs/plan-ateliers.md § 7.2, lot A0): the hall's walls and doors, its
 * stations — here the sawmill's four, each named without a label — the hands at them, the crates
 * that go from one to the next, and the red ring of the bottleneck. A station fills one floor tile
 * (the tile's middle at the origin, its ground at y = 0); what works moves only while `running`.
 */
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Path,
  RingGeometry,
  Shape,
  TorusGeometry,
} from "three";
import type { Palette } from "../materials.js";
import { archShape, box, cached, crate, cyl, dyn, extrude, gable, put } from "../shapes.js";
import { BOARD } from "../tokens.js";
import type { Built, ModelOpts } from "./model.js";
import { pawn } from "./pawns.js";
import type { Vehicle } from "./vehicles.js";

const HALF = BOARD.tile / 2;
/** A station fills its flagstone: drawn at the kit's scale, then enlarged. */
const K = 1.4;

/** The tile's group, its walls, and the machine's group in it at the stations' scale. */
function station(P: Palette, edge: { north?: boolean; west?: boolean } = {}, k = K) {
  const g = new Group();
  walls(P, g, !!edge.north, !!edge.west);
  const m = new Group();
  m.scale.setScalar(k);
  g.add(m);
  return { g, m };
}
const WALL_H = 2.1;
const WALL_T = 0.34;

/** The hall's walls on a tile of its edge: north (-z) and west (-x), the camera seeing over them. */
export function walls(
  P: Palette,
  g: Group,
  north: boolean,
  west: boolean,
  door?: "north" | "west",
) {
  const L = BOARD.tile + BOARD.gap;
  const side = (rot: number, x: number, z: number, withDoor: boolean) => {
    const f = new Group();
    f.position.set(x, 0, z);
    f.rotation.y = rot;
    g.add(f);
    if (!withDoor) {
      box(f, L, WALL_H, WALL_T, 0, 0, 0, P.m("wall"), 0.05);
      box(f, L, 0.12, WALL_T + 0.1, 0, WALL_H, 0, P.m("trim"), 0.04);
      return;
    }
    // A wall pierced by a wide arch: the door of the goods.
    const s = new Shape();
    s.moveTo(-L / 2, 0);
    s.lineTo(L / 2, 0);
    s.lineTo(L / 2, WALL_H);
    s.lineTo(-L / 2, WALL_H);
    s.lineTo(-L / 2, 0);
    const hole = new Path();
    const a = archShape(2.2, 1.85, 0.05);
    hole.setFromPoints(a.getPoints(24));
    s.holes.push(hole);
    put(
      f,
      cached("doorwall", () => extrude(s, WALL_T, 0.03)),
      P.m("wall"),
      0,
      0,
      0,
    );
    box(f, L, 0.12, WALL_T + 0.1, 0, WALL_H, 0, P.m("trim"), 0.04);
    // The keystone, the one red of the door.
    box(f, 0.26, 0.3, WALL_T + 0.08, 0, 1.78, 0, P.accent, 0.03);
  };
  if (north) side(0, 0, -HALF + WALL_T / 2, door === "north");
  if (west) side(Math.PI / 2, -HALF + WALL_T / 2, 0, door === "west");
}

/** A hand at a station, facing `face` (radians, 0 toward +z). */
export function hand(P: Palette, g: Group, x: number, z: number, face: number, s = 1.35): Group {
  const p = pawn(P, "worker").group;
  p.scale.setScalar(s);
  p.position.set(x, 0, z);
  p.rotation.y = face;
  g.add(p);
  return p;
}

/** The bottleneck's ring: flat, of accent, breathing on the floor round the station. */
function neckRing(P: Palette, g: Group): (t: number) => void {
  const mat = new MeshBasicMaterial({
    color: P.accentColour,
    transparent: true,
    opacity: 0.8,
    toneMapped: false,
    depthWrite: false,
  });
  const ring = dyn(
    new Mesh(
      cached("neck", () => new RingGeometry(2.45, 2.72, 72)),
      mat,
    ),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 2;
  g.add(ring);
  return (t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 3.2);
    mat.opacity = 0.45 + 0.5 * k;
    ring.scale.setScalar(1 + 0.03 * k);
  };
}

const logGeo = (len: number, r: number) =>
  cached(`log${len}|${r}`, () => new CylinderGeometry(r, r, len, 22).rotateZ(Math.PI / 2));

/** Planks stacked flat, `n` high, along x. */
function planks(P: Palette, g: Group, x: number, z: number, n: number, len = 1.9, w = 0.36) {
  for (let i = 0; i < n; i++)
    box(g, len, 0.09, w, x, i * 0.1, z + (i % 2 ? 0.02 : 0), P.m("wood"), 0.015);
}

/** The door of the logs: the trunks come in and wait, piled. */
export function logsIn(P: Palette, o: ModelOpts, door: "north" | "west"): Built {
  const g = new Group();
  walls(P, g, door === "north", door === "west", door);
  const pile = new Group();
  pile.position.set(0.9, 0, -1.2);
  g.add(pile);
  for (const [x, y] of [
    [0, 0],
    [0.44, 0],
    [0.88, 0],
    [0.22, 0.38],
    [0.66, 0.38],
  ] as const)
    put(pile, logGeo(1.7, 0.21), P.m("wood"), 0, 0.21 + y, x - 0.44).rotation.y = Math.PI / 2;
  crate(g, -1.4, 0, 1.4, P.m("trim"), 0.5, 0.3);
  void o;
  return { group: g, pin: [0, 2.6, 0] };
}

/** The door of the goods: the planks go out to the fondaco, stacked by the arch. */
export function planksOut(P: Palette, o: ModelOpts, door: "north" | "west"): Built {
  const g = new Group();
  walls(P, g, door === "north", door === "west", door);
  planks(P, g, -1.4, 0.6, 7, 1.8, 0.4);
  planks(P, g, -1.4, 1.2, 5, 1.8, 0.4);
  crate(g, 1.5, 0, 1.0, P.accent, 0.5, 0.4);
  crate(g, 1.5, 0.5, 1.0, P.m("trim"), 0.4, 0.1);
  void o;
  return { group: g, pin: [0, 2.6, 0] };
}

/** To bark: a low trestle, a trunk on it, the drawknife going along, bark in curls below. */
export function debarker(P: Palette, o: ModelOpts, edge: { north?: boolean } = {}): Built {
  const { g, m } = station(P, { north: edge.north });
  for (const x of [-1.1, 1.1]) {
    box(m, 0.14, 0.7, 0.9, x, 0, 0, P.m("wood"), 0.03);
    box(m, 0.5, 0.1, 1.0, x, 0.7, 0, P.m("wood"), 0.03);
  }
  put(m, logGeo(3.0, 0.3), P.m("wall2"), 0, 1.1, 0);
  // The barked half, paler.
  put(m, logGeo(1.2, 0.27), P.m("trim"), 0.85, 1.1, 0);
  const knife = dyn(new Group());
  knife.position.set(0, 1.42, 0.12);
  m.add(knife);
  box(knife, 0.06, 0.04, 0.7, 0, 0, 0, P.m("metal"), 0.01);
  for (const s of [-1, 1]) cyl(knife, 0.04, 0.04, 0.22, 0, 0, s * 0.42, P.m("wood"), 10);
  const curl = cached("curl", () => new TorusGeometry(0.13, 0.04, 8, 16, Math.PI * 1.5));
  for (const [x, z, r] of [
    [-0.6, 0.7, 0.2],
    [0.2, 0.9, 1.4],
    [0.7, 0.6, 2.4],
    [-0.1, -0.8, 0.9],
  ] as const) {
    const c = put(m, curl, P.m("wall2"), x, 0.08, z);
    c.rotation.set(Math.PI / 2, 0, r);
  }
  hand(P, g, 0.1, 1.45, Math.PI);
  return {
    group: g,
    pin: [0, 3.9, 0],
    tick: (t) => {
      knife.position.x = o.running ? Math.sin(t * 2.4) * 0.9 : 0;
    },
  };
}

/**
 * To saw: a long bench, a trunk being fed, the frame saw going up and down; on the canal's side
 * the water wheel that drives it.
 */
export function sawBench(P: Palette, o: ModelOpts, neck = false): Built {
  const { g, m } = station(P, {});
  box(m, 3.8, 0.85, 0.9, -0.3, 0, 0, P.m("wood"), 0.04);
  box(m, 3.9, 0.08, 1.0, -0.3, 0.85, 0, P.m("wall2"), 0.03);
  put(m, logGeo(2.6, 0.26), P.m("wood"), -0.9, 1.19, 0);
  box(m, 1.3, 0.09, 0.5, 1.0, 0.93, 0, P.m("trim"), 0.015);
  // The frame: two posts, a cross beam, the blade in its sash.
  for (const z of [-0.65, 0.65]) box(m, 0.18, 2.6, 0.18, 0.4, 0, z, P.m("wood"), 0.03);
  box(m, 0.3, 0.2, 1.6, 0.4, 2.6, 0, P.m("wood"), 0.03);
  const sash = dyn(new Group());
  sash.position.set(0.4, 1.2, 0);
  m.add(sash);
  box(sash, 0.08, 1.1, 0.1, 0, 0, 0, P.m("metal"), 0.01);
  for (const y of [0, 1.1]) box(sash, 0.14, 0.12, 1.2, 0, y, 0, P.m("wood"), 0.02);
  // The water wheel, on the canal's edge (+x), half in the water.
  put(m, logGeo(0.8, 0.07), P.m("wood"), 1.75, 0.85, 0);
  const wheel = dyn(new Group());
  wheel.position.set(2.2, 0.85, 0);
  wheel.rotation.y = Math.PI / 2;
  m.add(wheel);
  const rim = cached("rim", () => new TorusGeometry(1.15, 0.07, 10, 48));
  for (const z of [-0.24, 0.24]) put(wheel, rim, P.m("wood"), 0, 0, z);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const paddle = box(
      wheel,
      0.06,
      0.42,
      0.56,
      Math.cos(a) * 1.1,
      Math.sin(a) * 1.1 - 0.21,
      0,
      P.m("wall2"),
      0.02,
    );
    paddle.rotation.z = a;
  }
  cyl(wheel, 0.16, 0.16, 0.6, 0, -0.3, 0, P.accent, 20).rotation.x = Math.PI / 2;
  hand(P, g, -1.0, 1.25, Math.PI);
  const pulse = neck ? neckRing(P, g) : null;
  return {
    group: g,
    pin: [0, 4.4, 0],
    tick: (t, dt) => {
      if (o.running) {
        sash.position.y = 1.2 + Math.sin(t * 6) * 0.22;
        wheel.rotation.z -= dt * 1.4;
      }
      pulse?.(t);
    },
  };
}

/** To dry: stickered stacks of boards under a lean roof, air going through. */
export function dryer(P: Palette, o: ModelOpts): Built {
  const { g, m } = station(P, {});
  for (const z of [-0.85, 0.85]) {
    for (let i = 0; i < 6; i++) {
      box(m, 2.6, 0.08, 1.0, -0.2, i * 0.22, z, P.m("wood"), 0.015);
      for (const x of [-1.3, -0.2, 0.9])
        box(m, 0.08, 0.14, 1.0, x, i * 0.22 + 0.08, z, P.m("wall2"), 0.01);
    }
  }
  for (const [x, z] of [
    [-1.7, -1.6],
    [1.3, -1.6],
    [-1.7, 1.6],
    [1.3, 1.6],
  ] as const)
    box(m, 0.14, 2.3, 0.14, x, 0, z, P.m("wood"), 0.03);
  gable(P, g, 3.3, 3.5, 2.3, 0.6, -0.2, 0, Math.PI / 2, P.m("roof"));
  // A breath of warm air: a small brazier, its coals of accent.
  cyl(m, 0.3, 0.24, 0.35, 2.0, 0, 1.6, P.m("metal"), 20);
  const coals = cyl(m, 0.24, 0.24, 0.05, 2.0, 0.35, 1.6, P.glow, 20);
  dyn(coals).castShadow = false;
  void o;
  return { group: g, pin: [0, 4.4, 0] };
}

/** To plane: a bench, a board, the plane going back and forth, shavings falling. */
export function planer(P: Palette, o: ModelOpts): Built {
  const { g, m } = station(P, {});
  box(m, 3.0, 0.9, 1.0, 0, 0, -0.2, P.m("wood"), 0.04);
  box(m, 3.1, 0.08, 1.1, 0, 0.9, -0.2, P.m("wall2"), 0.03);
  box(m, 2.6, 0.1, 0.42, 0, 0.98, -0.2, P.m("trim"), 0.015);
  const plane = dyn(new Group());
  plane.position.set(0, 1.08, -0.2);
  m.add(plane);
  box(plane, 0.5, 0.18, 0.2, 0, 0, 0, P.m("wood"), 0.03);
  cyl(plane, 0.05, 0.05, 0.16, 0.12, 0.18, 0, P.accent, 12);
  const curl = cached("curl", () => new TorusGeometry(0.13, 0.04, 8, 16, Math.PI * 1.5));
  for (const [x, z, r] of [
    [-0.9, 0.7, 0.4],
    [0.4, 0.8, 2.0],
    [1.0, 0.6, 1.1],
  ] as const) {
    const c = put(m, curl, P.m("trim"), x, 0.08, z);
    c.rotation.set(Math.PI / 2, 0, r);
  }
  planks(P, g, 0.2, -1.65, 4, 2.4, 0.36);
  hand(P, g, 0, 1.15, Math.PI);
  return {
    group: g,
    pin: [0, 3.8, 0],
    tick: (t) => {
      plane.position.x = o.running ? Math.sin(t * 2.0) * 0.9 : 0;
    },
  };
}

/** A walled tile: a pillar of the hall, square, its capital and base. */
export function pillar(P: Palette, edge: { north?: boolean; west?: boolean } = {}): Built {
  const { g, m } = station(P, edge, 1.2);
  box(m, 1.2, 0.3, 1.2, 0, 0, 0, P.m("wall2"), 0.05);
  box(m, 0.9, 2.6, 0.9, 0, 0.3, 0, P.m("wall"), 0.06);
  box(m, 1.2, 0.26, 1.2, 0, 2.9, 0, P.m("wall2"), 0.05);
  return { group: g, pin: [0, 3.4, 0] };
}

/** A free floor tile of the hall (its walls if on the edge), a few things left about. */
export function floor(
  P: Palette,
  o: ModelOpts,
  edge: { north?: boolean; west?: boolean } = {},
): Built {
  const g = new Group();
  walls(P, g, !!edge.north, !!edge.west);
  // Faint joints: four flagstones per tile, a thin groove between them.
  for (const r of [0, Math.PI / 2]) {
    const j = box(g, BOARD.tile - 0.6, 0.012, 0.05, 0, 0, 0, P.m("wall2"), 0.004);
    j.rotation.y = r;
    j.castShadow = false;
  }
  if (o.seed % 3 === 1) crate(g, 1.6, 0, -1.5, P.m("trim"), 0.45, 0.4);
  return { group: g, pin: [0, 1, 0] };
}

/** A footbridge over the canal, its planks and two low rails. */
export function footbridge(P: Palette): Built {
  const g = new Group();
  const y = 0;
  for (let i = 0; i < 9; i++)
    box(g, 0.62, 0.12, 2.0, -2.8 + i * 0.7, y - 0.12, 0, P.m("wood"), 0.02);
  for (const z of [-1.05, 1.05]) {
    box(g, BOARD.tile + 0.4, 0.08, 0.08, 0, 0.55, z, P.m("wood"), 0.02);
    for (const x of [-2.6, 0, 2.6]) box(g, 0.1, 0.55, 0.1, x, 0, z, P.m("wood"), 0.02);
  }
  return { group: g, pin: [0, 1.5, 0] };
}

/** A crate going from one station to the next along the ribbons; the first of accent. */
export function crateMover(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  crate(g, 0, 0.02, 0, o.seed % 2 ? P.m("trim") : P.accent, 0.5);
  box(g, 0.52, 0.06, 0.12, 0, 0.22, 0, P.m("wood"), 0.01);
  return { group: g, tick: () => {} };
}
