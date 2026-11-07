/**
 * The Terraferma's models (docs/plan-terraferme-porcellana.md § 2, lot T4), in the grammar of the
 * workshops: a silhouette one names at first sight, porcelain throughout, the flag in its holder's
 * colour (the merchant's red, another's ink, an ally's lagoon, a nation's biscuit). Each on a
 * tile 6 across, its middle at the origin, the ground at y = 0. The port faces the water on +z.
 */
import { DoubleSide, Group, type Material, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cone, cyl, dyn, gable } from "../shapes.js";
import { ROUGH } from "../tokens.js";
import type { Built } from "./model.js";

const flags = new Map<string, MeshStandardMaterial>();

/** The cloth of a holder's flag (one material a colour, shared). */
export function flagCloth(colour: string): MeshStandardMaterial {
  let m = flags.get(colour);
  if (!m) {
    m = new MeshStandardMaterial({ color: colour, roughness: ROUGH.accent, side: DoubleSide });
    flags.set(colour, m);
  }
  return m;
}

/** A flag on its pole at (x, z), from y up `h`: the cloth waves. */
function flag(
  P: Palette,
  g: Group,
  cloth: Material,
  x: number,
  y: number,
  z: number,
  h: number,
  w = 1.3,
): (t: number) => void {
  cyl(g, 0.06, 0.07, h, x, y, z, P.ink, 10);
  const geo = new PlaneGeometry(w, w * 0.6, 12, 3);
  geo.translate(w / 2, -w * 0.3, 0);
  const pos = geo.getAttribute("position");
  const base = Float32Array.from(pos.array);
  const mesh = dyn(new Mesh(geo, cloth));
  mesh.castShadow = true;
  mesh.position.set(x, y + h - 0.05, z);
  g.add(mesh);
  return (t) => {
    const a = pos.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) {
      const u = base[i] as number;
      a[i + 2] = Math.sin(u * 5 - t * 4.2) * 0.08 * (u / w) * 1.6;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
}

/** Merlons along the top of a square of side `s` at height y. */
function merlons(P: Palette, g: Group, s: number, y: number, x = 0, z = 0) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const u = -s / 2 + (k + 0.5) * (s / n);
    for (const [dx, dz] of [
      [u, -s / 2],
      [u, s / 2],
      [-s / 2, u],
      [s / 2, u],
    ] as const)
      box(g, 0.34, 0.34, 0.34, x + dx, y, z + dz, P.m("trim"), 0.04);
  }
}

/** The war camp, a merchant's capital: a great octagonal tent, a smaller one, crates, its flag. */
export function warCamp(P: Palette, cloth: Material): Built {
  const g = new Group();
  cyl(g, 2.5, 2.6, 0.08, 0, 0, 0, P.m("trim"), 32);
  cyl(g, 1.45, 1.55, 1.3, -0.3, 0.08, 0.1, P.m("wall", true), 8);
  cone(g, 1.85, 1.7, -0.3, 1.38, 0.1, P.m("wall2", true), 8);
  box(g, 0.55, 0.85, 0.08, -0.3, 0.08, 1.6, P.m("open"), 0.02);
  cyl(g, 0.75, 0.8, 0.7, 1.55, 0.08, -1.2, P.m("wall", true), 8);
  cone(g, 1.0, 0.9, 1.55, 0.78, -1.2, P.m("wall2", true), 8);
  for (const [x, z] of [
    [1.7, 1.3],
    [2.1, 0.8],
  ] as const)
    box(g, 0.45, 0.45, 0.45, x, 0.08, z, P.m("wood"), 0.04);
  const wave = flag(P, g, cloth, -0.3, 3.0, 0.1, 1.6, 1.4);
  return { group: g, pin: [-0.3, 5.2, 0.1], tick: (t) => wave(t) };
}

/** The fort (rocca): a crenellated keep on its plinth, a door, two slits, its flag. */
export function rocca(P: Palette, cloth: Material): Built {
  const g = new Group();
  box(g, 4.0, 0.45, 4.0, 0, 0, 0, P.m("wall2"), 0.08);
  box(g, 2.4, 2.6, 2.4, 0, 0.45, 0, P.m("wall"), 0.06);
  box(g, 2.6, 0.18, 2.6, 0, 3.05, 0, P.m("trim"), 0.04);
  merlons(P, g, 2.5, 3.23);
  box(g, 0.7, 1.0, 0.06, 0, 0.45, 1.22, P.m("open"), 0.02);
  for (const x of [-0.7, 0.7]) box(g, 0.14, 0.55, 0.06, x, 1.9, 1.22, P.m("open"), 0.01);
  box(g, 0.06, 0.55, 0.14, 1.22, 1.9, 0, P.m("open"), 0.01);
  const wave = flag(P, g, cloth, 0, 3.23, 0, 1.6);
  return { group: g, pin: [0, 5.5, 0], tick: (t) => wave(t) };
}

/** The borough (borgo): three houses with their gable roofs round a well, a flag. */
export function borgo(P: Palette, cloth: Material): Built {
  const g = new Group();
  box(g, 5.0, 0.06, 5.0, 0, 0, 0, P.m("trim"), 0.2);
  const house = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    rot: number,
    tone: "wall" | "wall2",
  ) => {
    box(g, w, h, d, x, 0.06, z, P.m(tone), 0.04);
    gable(P, g, rot ? d : w, rot ? w : d, h + 0.06, 0.7, x, z, rot);
    box(g, 0.4, 0.6, 0.04, x, 0.06, z + d / 2 + 0.01, P.m("open"), 0.01);
  };
  house(-1.2, -1.0, 1.6, 1.3, 1.1, 0, "wall");
  house(1.3, -0.7, 1.3, 1.2, 0.95, Math.PI / 2, "wall2");
  house(-0.2, 1.4, 1.8, 1.2, 1.0, 0, "wall");
  cyl(g, 0.3, 0.32, 0.4, 1.3, 0.06, 1.3, P.m("wall2"), 24);
  const wave = flag(P, g, cloth, 1.9, 0.06, 1.9, 2.6, 1.0);
  return { group: g, pin: [0, 3.4, 0], tick: (t) => wave(t) };
}

/** The port (porto): a quay toward the water (+z), bollards, the harbour house, a boat at its mooring. */
export function porto(P: Palette, cloth: Material): Built {
  const g = new Group();
  box(g, 5.6, 0.14, 1.4, 0, 0, 2.2, P.m("trim"), 0.04);
  for (const x of [-2.2, -0.8, 0.8, 2.2]) cyl(g, 0.1, 0.12, 0.32, x, 0.14, 2.7, P.ink, 16);
  box(g, 2.4, 1.4, 1.9, -1.2, 0, -0.9, P.m("wall"), 0.05);
  gable(P, g, 2.4, 1.9, 1.4, 0.7, -1.2, -0.9, Math.PI / 2);
  box(g, 0.7, 0.9, 0.05, -1.2, 0, 0.06, P.m("open"), 0.01);
  for (const [x, z] of [
    [1.2, -0.6],
    [1.7, -0.2],
    [1.4, 0.4],
  ] as const)
    box(g, 0.5, 0.5, 0.5, x, 0, z, P.m("wood"), 0.04);
  // The boat, just off the quay, its sail in the holder's colour.
  const boat = dyn(new Group());
  boat.position.set(0.9, -0.55, 3.6);
  box(boat, 2.6, 0.5, 0.9, 0, 0, 0, P.ink, 0.2);
  box(boat, 2.2, 0.08, 0.7, 0, 0.5, 0, P.m("wood"), 0.03);
  cyl(boat, 0.05, 0.06, 2.2, 0, 0.5, 0, P.m("wood"), 10);
  const sail = new Mesh(new PlaneGeometry(1.2, 1.4), cloth);
  sail.position.set(0, 1.75, 0.02);
  sail.castShadow = true;
  boat.add(sail);
  g.add(boat);
  const wave = flag(P, g, cloth, -2.3, 0.14, 2.1, 2.0, 0.9);
  return {
    group: g,
    pin: [-1.2, 3.4, -0.9],
    tick: (t) => {
      boat.position.y = -0.55 + Math.sin(t * 1.4) * 0.05;
      boat.rotation.z = Math.sin(t * 1.1) * 0.03;
      wave(t);
    },
  };
}

/** The bombard (bombarda): a gun on its wooden carriage, raised, its wheels, a pile of balls. */
export function bombarda(P: Palette, cloth: Material): Built {
  const g = new Group();
  box(g, 4.2, 0.25, 3.4, 0, 0, 0, P.m("wall2"), 0.08);
  box(g, 2.0, 0.45, 0.9, 0, 0.25, 0, P.m("wood"), 0.05);
  const gun = dyn(new Group());
  gun.position.set(-0.3, 1.05, 0);
  gun.rotation.z = 0.32;
  const barrel = cyl(gun, 0.34, 0.42, 2.6, 0, -1.3, 0, P.m("metal"), 28);
  barrel.rotation.z = -Math.PI / 2;
  barrel.position.set(0.0, 0, 0);
  const mouth = cyl(gun, 0.36, 0.36, 0.16, 0, 0, 0, P.m("metal"), 28);
  mouth.rotation.z = -Math.PI / 2;
  mouth.position.set(1.3, 0, 0);
  const bore = cyl(gun, 0.2, 0.2, 0.18, 0, 0, 0, P.ink, 20);
  bore.rotation.z = -Math.PI / 2;
  bore.position.set(1.33, 0, 0);
  g.add(gun);
  for (const z of [-0.6, 0.6]) {
    const w = cyl(g, 0.55, 0.55, 0.16, -0.2, 0, z, P.ink, 24);
    w.rotation.x = Math.PI / 2;
    w.position.set(-0.2, 0.8, z * 1.0);
  }
  for (const [x, y, z] of [
    [-1.4, 0.45, 1.0],
    [-1.05, 0.45, 1.0],
    [-1.22, 0.75, 1.0],
  ] as const)
    ball(g, 0.18, x, y, z, P.ink, 16);
  const wave = flag(P, g, cloth, -1.8, 0.25, -1.3, 2.0, 0.9);
  return {
    group: g,
    pin: [0, 3.2, 0],
    tick: (t) => wave(t),
  };
}

/** The walls (mura): a curtain wall round the tile, round towers at its corners, a flag. */
export function mura(P: Palette, cloth: Material): Built {
  const g = new Group();
  const e = 2.35;
  for (const [x, z, w, d] of [
    [0, -e, 2 * e, 0.4],
    [0, e, 2 * e, 0.4],
    [-e, 0, 0.4, 2 * e],
    [e, 0, 0.4, 2 * e],
  ] as const) {
    box(g, w, 0.9, d, x, 0, z, P.m("wall2"), 0.05);
    box(g, w + 0.1, 0.12, d + 0.1, x, 0.9, z, P.m("trim"), 0.03);
  }
  for (const [x, z] of [
    [-e, -e],
    [e, -e],
    [-e, e],
    [e, e],
  ] as const) {
    cyl(g, 0.55, 0.6, 1.5, x, 0, z, P.m("wall"), 28);
    cyl(g, 0.65, 0.65, 0.14, x, 1.5, z, P.m("trim"), 28);
    cone(g, 0.62, 0.6, x, 1.64, z, P.m("roof", true), 8);
  }
  box(g, 0.8, 0.7, 0.42, 0, 0, e, P.m("open"), 0.02);
  const wave = flag(P, g, cloth, -e, 2.2, -e, 1.4, 0.9);
  return { group: g, pin: [0, 3.2, 0], tick: (t) => wave(t) };
}

export const TERRA_MODELS = { rocca, borgo, porto, bombarda, mura } as const;
