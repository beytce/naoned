/**
 * The workshops (docs/plan-porcellana.md § 4): one silhouette each that one names without a label,
 * one sign of work that moves only while the game says it works. The lumber camp, the sawmill, the
 * mill, the farm, the glassworks and the clay pit are the prototype's; the sand pit, the
 * brickworks and the palazzo are drawn in the same hand.
 */
import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  MeshStandardMaterial,
  Path,
  Shape,
  Vector2,
} from "three";
import type { Palette } from "../materials.js";
import {
  archShape,
  ball,
  box,
  cached,
  chimney,
  cone,
  crate,
  cyl,
  dome,
  dyn,
  extrude,
  faces,
  gable,
  hipRoof,
  put,
  tree,
  windowGeo,
  windows,
} from "../shapes.js";
import { kilnGlow, smoke } from "./life.js";
import type { Built, ModelOpts } from "./model.js";

/** The lumber camp: a cabin of crossed logs, firs, a pile of trunks, a stump and its axe. */
export function lumberCamp(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const cab = new Group();
  cab.position.set(-0.6, 0, -0.9);
  g.add(cab);
  const Wc = 2.4;
  const Dc = 1.9;
  const r = 0.12;
  const rows = 6;
  const logX = cached("logx", () => new CylinderGeometry(r, r, Wc + 0.3, 20).rotateZ(Math.PI / 2));
  const logZ = cached("logz", () => new CylinderGeometry(r, r, Dc + 0.3, 20).rotateX(Math.PI / 2));
  for (let i = 0; i < rows; i++) {
    const y = r + i * r * 1.85;
    for (const s of [1, -1]) {
      put(cab, logX, P.m("wood"), 0, y + (i % 2 ? r * 0.9 : 0), (s * Dc) / 2);
      put(cab, logZ, P.m("wood"), (s * Wc) / 2, y + (i % 2 ? 0 : r * 0.9), 0);
    }
  }
  box(cab, Wc - 0.1, rows * r * 1.85, Dc - 0.1, 0, 0, 0, P.m("wood"), 0.02);
  const wallH = rows * r * 1.85 + 0.1;
  gable(P, cab, Wc + 0.1, Dc + 0.1, wallH, 0.9, 0, 0, Math.PI / 2, P.m("wood"));
  box(cab, 0.5, 0.85, 0.06, 0.5, 0, Dc / 2 + 0.12, P.m("open"), 0.01);
  box(cab, 0.4, 0.3, 0.06, -0.55, 0.55, Dc / 2 + 0.12, P.m("open"), 0.01);
  chimney(P, cab, 0.7, wallH + 0.3, -0.3);
  const pileLog = cached("pile", () =>
    new CylinderGeometry(0.17, 0.17, 1.5, 22).rotateX(Math.PI / 2),
  );
  for (const [x, y] of [
    [0, 0],
    [0.36, 0],
    [0.72, 0],
    [0.18, 0.31],
    [0.54, 0.31],
    [0.36, 0.62],
  ] as const)
    put(g, pileLog, P.m("wood"), 1.0 + x, 0.17 + y, 1.4);
  cyl(g, 0.26, 0.3, 0.38, -0.2, 0, 1.4, P.m("wood"), 24);
  const axe = dyn(new Group());
  axe.position.set(-0.2, 0.38, 1.4);
  axe.rotation.z = 0.5;
  g.add(axe);
  cyl(axe, 0.025, 0.025, 0.6, 0, 0, 0, P.m("wood"), 8);
  box(axe, 0.2, 0.12, 0.04, 0.08, 0.5, 0, P.accent, 0.01);
  for (const [x, z, s] of [
    [-2.2, 1.6, 1.1],
    [-2.05, -2.05, 1.2],
    [2.0, -1.9, 1.2],
    [2.4, -0.5, 0.95],
    [-1.4, 2.3, 0.9],
    [2.4, 2.4, 0.85],
  ] as const)
    tree(P, g, x, z, s, "fir");
  return {
    group: g,
    pin: [-0.6, 3.6, -0.9],
    // The axe falls on the stump, again and again, while the camp works.
    tick: (t) => {
      axe.rotation.z = o.running ? 0.5 - Math.max(0, Math.sin(t * 3)) * 0.9 : 0.5;
    },
  };
}

/** The sawmill: an open shed on posts, a toothed blade that turns, planks stacked. */
export function sawmill(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const sh = new Group();
  sh.position.set(-1.1, 0, -0.2);
  g.add(sh);
  box(sh, 3.0, 0.16, 2.4, 0, 0, 0, P.m("wall2"), 0.03);
  for (const [x, z] of [
    [-1.35, -1.05],
    [1.35, -1.05],
    [-1.35, 1.05],
    [1.35, 1.05],
  ] as const)
    box(sh, 0.16, 1.6, 0.16, x, 0.16, z, P.m("wood"), 0.03);
  box(sh, 2.9, 1.6, 0.08, 0, 0.16, -1.1, P.m("wood"), 0.02);
  gable(P, sh, 2.9, 2.3, 1.76, 0.8, 0, 0, Math.PI / 2, P.m("wood"));
  box(sh, 2.2, 0.55, 0.5, 0, 0.16, 0.2, P.m("wall"), 0.03);
  const log = cyl(sh, 0.2, 0.2, 2.0, 0.2, 0, 0.2, P.m("wood"), 24);
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.92;
  const sawGeo = cached("saw", () => {
    const s = new Shape();
    const n = 24;
    const R = 0.55;
    const r2 = 0.48;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? R : r2;
      if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const h = new Path();
    h.absarc(0, 0, 0.08, 0, Math.PI * 2, true);
    s.holes.push(h);
    return extrude(s, 0.03, 0.004);
  });
  const saw = dyn(put(sh, sawGeo, P.m("metal"), -0.6, 0.71, 0.2));
  for (let i = 0; i < 5; i++)
    box(g, 1.7, 0.09, 0.32, 1.5, i * 0.095, 1.6 - (i % 2) * 0.02, P.m("wood"), 0.015);
  for (let i = 0; i < 4; i++) box(g, 1.7, 0.09, 0.32, 1.5, i * 0.095, 2.05, P.m("wood"), 0.015);
  tree(P, g, -2.3, 2.1, 0.9, "fir");
  tree(P, g, 2.3, -2.3, 1.0, "fir");
  return {
    group: g,
    pin: [-1.1, 3.3, -0.2],
    tick: (_t, dt) => {
      if (o.running) saw.rotation.z -= dt * 7;
    },
  };
}

/** The windmill: a tapered tower, its cap, four latticed sails facing the camera, sacks. */
export function mill(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const mx = 0.4;
  const mz = -0.6;
  box(g, 2.4, 0.16, 2.4, mx, 0, mz, P.m("wall2"), 0.05);
  cyl(g, 0.85, 1.15, 3.0, mx, 0.16, mz, P.m("wall"), 48);
  cyl(g, 0.92, 0.92, 0.1, mx, 1.6, mz, P.m("trim"), 48);
  cone(g, 1.02, 1.05, mx, 3.16, mz, P.m("roof"), 48);
  box(g, 0.42, 0.75, 0.1, mx, 0.16, mz + 1.12, P.m("open"), 0.02).rotation.x = -0.1;
  windows(P, g, mx, mz, 1.6, 1.6, 2.0, 1, 0, 0.18, 0.32, 1, true, [0]);
  const pivot = dyn(new Group());
  pivot.position.set(mx, 3.0, mz);
  pivot.rotation.y = Math.PI / 4;
  g.add(pivot);
  const hub = new Group();
  hub.position.set(0, 0, 1.05);
  pivot.add(hub);
  const axle = cyl(hub, 0.1, 0.1, 0.35, 0, 0, 0, P.m("wood"), 16);
  axle.rotation.x = Math.PI / 2;
  const rotor = new Group();
  rotor.position.z = 0.2;
  hub.add(rotor);
  for (let i = 0; i < 4; i++) {
    const arm = new Group();
    arm.rotation.z = (i * Math.PI) / 2;
    rotor.add(arm);
    box(arm, 0.08, 2.3, 0.06, 0, 0, 0, P.m("wood"), 0.02);
    box(arm, 0.5, 1.75, 0.03, 0.3, 0.5, 0.02, P.m("trim"), 0.01);
    for (let k = 0; k < 5; k++)
      box(arm, 0.52, 0.03, 0.05, 0.3, 0.55 + k * 0.42, 0.03, P.m("wood"), 0.008);
  }
  ball(rotor, 0.14, 0, 0, 0.05, P.m("trim"));
  for (const [x, z] of [
    [-0.9, 1.7],
    [-0.5, 1.9],
    [-0.7, 1.4],
  ] as const)
    ball(g, 0.22, x, 0.18, z, P.m("wood")).scale.set(1, 0.85, 1);
  tree(P, g, -2.2, -2.0, 1.1, "cypress");
  tree(P, g, -1.6, -2.4, 0.9, "cypress");
  return {
    group: g,
    pin: [mx, 5.4, mz],
    tick: (_t, dt) => {
      if (o.running) rotor.rotation.z -= dt * 0.9;
    },
  };
}

/** A field: furrows of crops on its soil, a haystack or two. */
export function field(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.3, 0.06, 5.3, 0, 0, 0, P.m("soil"), 0.2);
  const along = o.seed % 2 === 0;
  for (let i = 0; i < 9; i++) {
    const u = (i - 4) * 0.56;
    if (along) box(g, 0.3, 0.2, 5.0, u, 0.06, 0, P.m("crop"), 0.1);
    else box(g, 5.0, 0.2, 0.3, 0, 0.06, u, P.m("crop"), 0.1);
  }
  if (!along)
    for (const [x, z] of [
      [1.6, 1.8],
      [2.1, 1.3],
    ] as const) {
      cyl(g, 0.32, 0.36, 0.42, x, 0.06, z, P.m("wood"), 28);
      dome(g, 0.32, x, 0.48, z, P.m("wood"), 0.8);
    }
  return { group: g, pin: [0, 1.2, 0] };
}

/** The farm: a barn (its door braced in a cross, its loft), a ringed silo that fills, a fence. */
export function farm(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const bx = 1.0;
  const bz = -0.4;
  const bw = 2.4;
  const bd = 3.0;
  const bh = 1.5;
  box(g, bw, bh, bd, bx, 0, bz, P.m("wall"), 0.04);
  gable(P, g, bw, bd, bh, 1.25, bx, bz, 0);
  const door = new Group();
  door.position.set(bx, 0, bz + bd / 2 + 0.01);
  g.add(door);
  box(door, 1.05, 1.15, 0.05, 0, 0, 0, P.m("wall2"), 0.01);
  for (const s of [1, -1]) {
    const b = box(door, 0.06, 1.45, 0.04, 0, 0, 0.04, P.m("wood"), 0.01);
    b.rotation.z = s * 0.73;
    b.position.y = 0.575;
  }
  box(door, 1.15, 0.08, 0.06, 0, 1.1, 0.03, P.m("wood"), 0.01);
  box(door, 0.45, 0.4, 0.05, 0, 1.55, 0, P.m("open"), 0.01);
  windows(P, g, bx, bz, bw, bd, 0.6, 1, 0, 0.32, 0.32, 0.9, false, [1]);
  const sx = -1.1;
  const sz = 1.4;
  cyl(g, 0.58, 0.58, 2.7, sx, 0, sz, P.m("wall2"), 48);
  for (const y of [0.7, 1.4, 2.1]) cyl(g, 0.6, 0.6, 0.05, sx, y, sz, P.m("trim"), 48);
  dome(g, 0.6, sx, 2.7, sz, P.m("roof"));
  // The grain inside the silo shows at its hatch, rising while the farm works.
  const grain = dyn(box(g, 0.3, 0.6, 0.06, sx, 0.4, sz + 0.57, P.m("crop"), 0.02));
  for (let i = 0; i < 6; i++) box(g, 0.08, 0.5, 0.08, -2.4, 0, -2.0 + i * 0.85, P.m("wood"), 0.02);
  for (const y of [0.18, 0.38]) box(g, 0.05, 0.05, 4.35, -2.4, y, 0.12, P.m("wood"), 0.015);
  tree(P, g, -1.7, -2.3, 0.85);
  return {
    group: g,
    pin: [bx, 4.0, bz],
    tick: (t) => {
      grain.scale.y = o.running ? 0.6 + 0.4 * ((t * 0.08) % 1) : 0.6;
    },
  };
}

const VASE = () =>
  new LatheGeometry(
    [
      [0, 0],
      [0.09, 0],
      [0.12, 0.08],
      [0.1, 0.2],
      [0.05, 0.28],
      [0.065, 0.36],
      [0, 0.36],
    ].map(([x, y]) => new Vector2(x, y)),
    28,
  );

/** The glassworks of Murano: a domed kiln whose mouth glows, its chimney smoking, a workshop, vases. */
export function glassworks(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const kx = 0.7;
  const kz = -0.2;
  box(g, 3.0, 0.16, 3.0, kx, 0, kz, P.m("wall2"), 0.05);
  cyl(g, 1.05, 1.15, 0.9, kx, 0.16, kz, P.m("wall"), 48);
  dome(g, 1.05, kx, 1.06, kz, P.m("wall"));
  const mouth = put(
    g,
    cached("mouth", () => extrude(archShape(0.6, 0.75), 0.06, 0.01)),
    P.glow,
    kx,
    0.2,
    kz + 1.12,
  );
  put(
    g,
    cached("mouthRim", () => {
      const s = archShape(0.84, 0.95);
      s.holes.push(archShape(0.6, 0.75));
      return extrude(s, 0.08, 0.01);
    }),
    P.m("trim"),
    kx,
    0.16,
    kz + 1.12,
  );
  const glow = kilnGlow(P, g, mouth, kx, 0.6, kz + 1.6, o);
  box(g, 0.5, 3.4, 0.5, kx + 0.4, 0.16, kz - 1.1, P.m("wall2"), 0.03);
  box(g, 0.66, 0.14, 0.66, kx + 0.4, 3.56, kz - 1.1, P.m("trim"), 0.03);
  const puffs = smoke(g, kx + 0.4, 3.75, kz - 1.1, o);
  box(g, 1.6, 1.2, 1.4, -1.6, 0, -1.4, P.m("wall"), 0.04);
  gable(P, g, 1.6, 1.4, 1.2, 0.6, -1.6, -1.4, 0);
  windows(P, g, -1.6, -1.4, 1.6, 1.4, 0.35, 1, 0, 0.22, 0.46, 0.5, true, [0, 1]);
  box(g, 1.2, 0.5, 0.5, -1.6, 0, 0.9, P.m("wood"), 0.03);
  const vase = cached("vase", VASE);
  [-1.95, -1.6, -1.25].forEach((x, i) => {
    put(g, vase, i === 1 ? P.accent : P.m("trim"), x, 0.5, 0.9).scale.setScalar(1 + (i % 2) * 0.25);
  });
  tree(P, g, 2.3, 2.2, 1.0, "cypress");
  return {
    group: g,
    pin: [kx, 4.6, kz],
    tick: (t) => {
      glow(t);
      puffs(t);
    },
  };
}

/** The clay pit: faces cut in steps, blocks lying, a wooden derrick that swings a block of accent. */
export function clayPit(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const st = P.m("wall2");
  box(g, 5.2, 2.2, 1.5, 0, 0, -1.9, st, 0.03);
  box(g, 5.2, 1.4, 1.2, 0, 0, -0.6, st, 0.03);
  box(g, 4.4, 0.6, 1.0, -0.2, 0, 0.45, st, 0.03);
  for (const [y, z] of [
    [1.1, -1.14],
    [0.7, 0.01],
  ] as const)
    box(g, 5.1, 0.03, 0.02, 0, y, z, P.m("open"), 0.005);
  for (const [x, z, s, r] of [
    [1.9, 1.5, 0.6, 0.1],
    [1.3, 2.0, 0.5, -0.3],
    [2.25, 2.2, 0.45, 0.4],
    [-1.8, 1.9, 0.55, 0.2],
    [-0.9, 2.2, 0.5, 0.0],
  ] as const)
    box(g, s * 1.3, s * 0.8, s, x, 0, z, P.m("wall"), 0.02).rotation.y = r;
  box(g, 0.6, 0.5, 0.6, 1.9, 0.48, 1.5, P.m("wall"), 0.02);
  const crane = dyn(new Group());
  crane.position.set(-1.6, 1.4, -0.6);
  g.add(crane);
  const leg = cached("leg", () => new CylinderGeometry(0.05, 0.06, 2.3, 12));
  for (const s of [1, -1]) put(crane, leg, P.m("wood"), 0.35 * s, 1.05, 0).rotation.z = s * 0.16;
  box(crane, 0.9, 0.08, 0.08, 0, 2.1, 0, P.m("wood"), 0.02);
  const jib = put(
    crane,
    cached("jib", () => new CylinderGeometry(0.045, 0.05, 2.6, 12)),
    P.m("wood"),
    0.9,
    2.15,
    0,
  );
  jib.rotation.z = -1.25;
  cyl(crane, 0.012, 0.012, 1.15, 2.1, 1.38, 0, P.ink, 6);
  box(crane, 0.42, 0.34, 0.42, 2.1, 1.05, 0, P.accent, 0.02);
  return {
    group: g,
    pin: [-1.6, 4.4, -0.6],
    tick: (t) => {
      if (o.running) crane.rotation.y = Math.sin(t * 0.45) * 0.7 + 0.5;
    },
  };
}

/** The sand pit: low dunes, cones of sand, a sieve on its legs that shakes, a wheelbarrow, a hut. */
export function sandPit(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.2, 0.06, 5.2, 0, 0, 0, P.m("crop"), 0.25);
  for (const [x, z, sx, sz] of [
    [-1.4, -1.3, 1.6, 1.1],
    [0.6, -1.9, 1.3, 0.9],
    [-1.9, 0.9, 1.1, 1.2],
  ] as const)
    dome(g, 1, x, 0, z, P.m("crop"), 0.38).scale.set(sx, 0.38, sz);
  for (const [x, z, s] of [
    [1.5, 0.9, 0.7],
    [2.1, -0.2, 0.55],
    [1.1, 2.0, 0.5],
  ] as const)
    cone(g, s, s * 0.9, x, 0.06, z, P.m("soil"), 32);
  const sieve = dyn(new Group());
  sieve.position.set(-0.1, 0, 0.6);
  g.add(sieve);
  for (const [x, z] of [
    [-0.55, -0.35],
    [0.55, -0.35],
    [-0.55, 0.35],
    [0.55, 0.35],
  ] as const)
    box(g, 0.07, 0.75, 0.07, -0.1 + x, 0.06, 0.6 + z, P.m("wood"), 0.02);
  box(sieve, 1.3, 0.08, 0.9, 0, 0.82, 0, P.m("wood"), 0.02);
  box(sieve, 1.16, 0.03, 0.76, 0, 0.86, 0, P.m("open"), 0.01);
  cone(g, 0.32, 0.28, -0.1, 0.06, 0.6, P.m("soil"), 24);
  // The wheelbarrow.
  box(g, 0.7, 0.3, 0.46, 1.2, 0.18, 2.1, P.m("wood"), 0.04);
  const w = cyl(g, 0.15, 0.15, 0.06, 1.62, 0.06, 2.1, P.ink, 20);
  w.rotation.x = Math.PI / 2;
  w.position.y = 0.15;
  for (const s of [-1, 1]) box(g, 0.8, 0.04, 0.04, 0.85, 0.32, 2.1 + s * 0.2, P.m("wood"), 0.01);
  box(g, 1.5, 1.0, 1.2, 1.6, 0, -1.9, P.m("wall"), 0.04);
  gable(P, g, 1.5, 1.2, 1.0, 0.55, 1.6, -1.9, Math.PI / 2);
  box(g, 0.4, 0.7, 0.05, 1.6, 0, -1.28, P.m("open"), 0.01);
  return {
    group: g,
    pin: [-0.1, 2.4, 0.6],
    tick: (t) => {
      sieve.position.x = -0.1 + (o.running ? Math.sin(t * 9) * 0.06 : 0);
    },
  };
}

/** The brickworks: a low tunnel kiln under its vault, two chimneys, bricks stacked crosswise. */
export function brickworks(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 5.0, 0.12, 2.6, 0, 0, -1.1, P.m("wall2"), 0.05);
  box(g, 3.8, 0.8, 1.7, -0.2, 0.12, -1.1, P.m("wall"), 0.04);
  const vault = cyl(g, 0.85, 0.85, 3.8, -0.2, 0, -1.1, P.m("roof"), 40);
  vault.rotation.z = Math.PI / 2;
  vault.position.y = 0.92;
  vault.scale.set(1, 1, 0.62);
  // Its mouths at the ends, dark, glowing while it fires.
  const mouth = put(
    g,
    cached("bmouth", () => extrude(archShape(0.6, 0.62), 0.06, 0.008)),
    P.glow,
    1.72,
    0.12,
    -1.1,
  );
  mouth.rotation.y = Math.PI / 2;
  const glow = kilnGlow(P, g, mouth, 2.2, 0.4, -1.1, o);
  for (const x of [-1.4, 0.9]) {
    box(g, 0.42, 2.6, 0.42, x, 0.12, -1.75, P.m("wall2"), 0.03);
    box(g, 0.56, 0.12, 0.56, x, 2.72, -1.75, P.m("trim"), 0.03);
  }
  const puffA = smoke(g, -1.4, 2.9, -1.75, o, 5);
  const puffB = smoke(g, 0.9, 2.9, -1.75, o, 5);
  // Bricks in crossed stacks.
  const stack = (x: number, z: number, layers: number) => {
    for (let l = 0; l < layers; l++)
      for (let k = 0; k < 3; k++) {
        const along = l % 2 === 0;
        const off = (k - 1) * 0.24;
        box(
          g,
          along ? 0.7 : 0.2,
          0.14,
          along ? 0.2 : 0.7,
          x + (along ? 0 : off),
          l * 0.15,
          z + (along ? off : 0),
          l % 2 ? P.m("roof") : P.m("wall2"),
          0.02,
        );
      }
  };
  stack(-1.6, 1.3, 5);
  stack(-0.5, 1.6, 4);
  stack(0.7, 1.2, 6);
  crate(g, 1.9, 0, 2.0, P.accent, 0.4);
  tree(P, g, 2.3, 0.5, 0.9, "cypress");
  return {
    group: g,
    pin: [-0.2, 3.4, -1.1],
    tick: (t) => {
      glow(t);
      puffA(t);
      puffB(t + 0.5);
    },
  };
}

const LIT = new MeshStandardMaterial({
  color: "#F3E3C4",
  emissive: "#F6D9A0",
  emissiveIntensity: 0.35,
  roughness: 0.6,
});

/** The palazzo: a Venetian front, its polifora and balcony on the piano nobile, its hip roof. */
export function palazzo(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const W = 3.4;
  const D = 2.8;
  const H = 3.0;
  box(g, 4.4, 0.14, 3.8, 0, 0, 0, P.m("trim"), 0.04);
  box(g, W, H, D, 0, 0.14, -0.2, P.m("wall"), 0.04);
  box(g, W + 0.08, 0.08, D + 0.08, 0, 1.2, -0.2, P.m("trim"), 0.02);
  // The water door, and the ground floor's small windows.
  put(g, windowGeo(0.7, 0.95, true), P.m("open"), 0, 0.14, -0.2 + D / 2 + 0.012);
  windows(P, g, 0, -0.2, W, D, 0.5, 1, 0, 0.18, 0.34, 0.75, false, [1]);
  // The polifora: four arches together, and its balcony; lit within while the house works.
  const lit: ReturnType<typeof put>[] = [];
  for (let i = 0; i < 4; i++)
    lit.push(
      dyn(
        put(
          g,
          windowGeo(0.24, 0.72, true),
          P.m("open"),
          (i - 1.5) * 0.3,
          1.45,
          -0.2 + D / 2 + 0.012,
        ),
      ),
    );
  for (const u of [-1.25, 1.25])
    for (const y of [1.45, 2.35])
      put(g, windowGeo(0.22, 0.56, true), P.m("open"), u, y, -0.2 + D / 2 + 0.012);
  box(g, 1.5, 0.08, 0.32, 0, 1.36, -0.2 + D / 2 + 0.15, P.m("trim"), 0.02);
  for (let i = 0; i < 7; i++)
    box(g, 0.05, 0.3, 0.05, -0.66 + i * 0.22, 1.44, -0.2 + D / 2 + 0.26, P.m("trim"), 0.01);
  windows(P, g, 0, -0.2, W, D, 2.35, 1, 0, 0.2, 0.5, 0.6, true, [1]);
  faces(
    g,
    0,
    -0.2,
    W,
    D,
    (f, len, off) => {
      for (const u of [-len / 2 + 0.1, len / 2 - 0.1])
        box(f, 0.12, H - 0.1, 0.05, u, 0.18, off, P.m("trim"), 0.02);
    },
    [0, 1],
  );
  box(g, W + 0.2, 0.12, D + 0.2, 0, H + 0.14, -0.2, P.m("trim"), 0.03);
  hipRoof(P, g, W, D, H + 0.26, 0.6, 0, -0.2, 0.1);
  chimney(P, g, 1.1, H + 0.4, -1.0);
  chimney(P, g, -1.1, H + 0.3, 0.5);
  return {
    group: g,
    pin: [0, 4.6, -0.2],
    tick: () => {
      for (const w of lit) w.material = o.running ? LIT : P.m("open");
    },
  };
}
