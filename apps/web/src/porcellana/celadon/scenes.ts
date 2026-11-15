/**
 * The scenes at the head of the places' sheets (docs/plan-celadon.md § 7, S2 and S3): each shows
 * the place's object as the game has it now.
 */
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { celadonPalette } from "../materials.js";
import { cyl, dome } from "../shapes.js";
import { CELADON } from "../tokens.js";
import { C, bx, heap, ring } from "./kit.js";
import { barge, barrel, bollard, crate, glassTray, stack } from "./pieces.js";
import { chainLink, rocca, ship, town } from "./places.js";
import type { VignetteScene } from "./vignette.js";
import { WORKSHOPS } from "./workshops.js";

/** The Arsenal at its level on its quay, the fleet at anchor before it (five hulls at most). */
export function arsenalScene(level: number, ships: number): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  bx(root, 6.4, 0.5, 6.4, 0, -0.5, 0, C("stone"), 0.2);
  const a = WORKSHOPS.arsenal?.(P, { level: Math.max(1, level), seed: 1 });
  if (a) root.add(a.group);
  for (let k = 0; k < Math.min(5, ships); k++) {
    const b = ship(P, { seed: k, running: false }).group;
    b.position.set(-3 + k * 2.3, -0.45, 4.6 + (k % 2) * 0.5);
    b.scale.setScalar(0.85);
    root.add(b);
  }
  return { root, target: [0.4, 1.0, 1.4], span: 9.5, water: -0.5 };
}

const boat = (root: Group, x: number, z: number, s = 1.1, rot = 0) => {
  const b = ship(celadonPalette(), { seed: 1, running: false }).group;
  b.position.set(x, -0.45, z);
  b.rotation.y = rot;
  b.scale.setScalar(s);
  root.add(b);
};
const ink = () => new MeshStandardMaterial({ color: CELADON.ink });

/**
 * The Muda: the mole of San Marco between its two columns, what waits on it growing with the hold
 * (`share`, 0 to 1), the convoy alongside while it loads, gone to sea while it sails.
 */
export function mudaScene(share: number, atSea: boolean): VignetteScene {
  const root = new Group();
  bx(root, 9, 0.5, 2.4, 0, -0.5, -2.2, C("blond"), 0.15);
  for (const x of [-3.4, 3.4]) {
    cyl(root, 0.2, 0.24, 2.6, x, 0, -2.6, C("porcelain"), 14);
    bx(root, 0.6, 0.12, 0.6, x, 2.6, -2.6, C("trim"), 0.03);
    heap(root, 0.2, x, 2.95, -2.6, C("celadon2"), 1);
  }
  for (let k = 0; k < 6; k++) bollard(root, -4 + k * 1.6, 0, -1.25);
  const n = Math.round(Math.max(0, Math.min(1, share)) * 6);
  for (let k = 0; k < n; k++) crate(root, -2.2 + k * 0.62, 0, -2.2);
  if (n >= 2) glassTray(root, 2.0, 0, -2.3);
  if (n >= 4) stack(root, 2.9, 0, -1.9, 3);
  barrel(root, -2.9, 0, -1.9);
  if (atSea) {
    boat(root, 1.2, 4.2, 1.1, 0.5);
    boat(root, 3.8, 5.6, 1.1, 0.5);
    boat(root, 6.2, 7.2, 1.1, 0.5);
  } else {
    boat(root, -2.6, 0.9, 1.25);
    boat(root, 0.6, 1.6, 1.25);
    boat(root, 3.6, 0.6, 1.25);
  }
  return { root, target: [0.3, 1.1, atSea ? 1.2 : -0.4], span: atSea ? 13 : 10.5, water: -0.5 };
}

/** The tide: a town on its shore, the ink come up to the line drawn in the accent, a tower in it. */
export function mareeScene(): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  const t = town(P, { seed: 2, running: false, size: 3 }).group;
  t.position.set(-2.6, 0, -0.6);
  root.add(t);
  bx(root, 6, 0.5, 6, -2.6, -0.5, -0.6, C("stone"), 0.3);
  const veil = new Mesh(
    new PlaneGeometry(14, 30),
    new MeshBasicMaterial({ color: CELADON.ink, transparent: true, opacity: 0.5 }),
  );
  veil.rotation.x = -Math.PI / 2;
  veil.position.set(9.2, -0.47, 0);
  root.add(veil);
  for (let k = -6; k < 7; k++)
    bx(root, 0.2, 0.05, 0.9, 2.2, -0.5, k * 1.6, P.accent).castShadow = false;
  const tw = rocca(P, ink()).group;
  tw.scale.setScalar(0.8);
  tw.position.set(5.4, 0, 0.6);
  root.add(tw);
  bx(root, 3.6, 0.5, 3.6, 5.4, -0.5, 0.6, C("stone2"), 0.3);
  return { root, target: [1.2, 1.4, 0], span: 12, water: -0.5 };
}

/** A company: its beacon, a ring of the accent for each of its levels, a Fondaco at its foot. */
export function compagnieScene(level: number): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  bx(root, 6.4, 0.5, 6.4, 0, -0.5, 0, C("stone"), 0.2);
  cyl(root, 1.5, 1.7, 0.4, 0, 0, 0, C("stone2"), 12);
  cyl(root, 0.75, 1.05, 3.6, 0, 0.4, 0, C("porcelain"), 20);
  for (let k = 0; k < Math.min(5, Math.max(0, level)); k++)
    ring(root, 1.0 - k * 0.05, 0.07, 0, 1.0 + k * 0.6, 0, P.accent);
  cyl(root, 1.0, 0.8, 0.2, 0, 4.0, 0, C("trim"), 20);
  cyl(root, 0.5, 0.5, 0.7, 0, 4.2, 0, C("glass"), 12);
  dome(root, 0.62, 0, 4.9, 0, C("celadon"));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    bx(root, 0.06, 0.36, 0.06, Math.cos(a) * 0.92, 4.2, Math.sin(a) * 0.92, C("celadon"));
  }
  const f = WORKSHOPS.fondaco?.(P, { level: 1, seed: 0 }).group;
  if (f) {
    f.scale.setScalar(0.42);
    f.position.set(-1.9, 0, 1.6);
    root.add(f);
  }
  crate(root, 2, 0, 1.9);
  crate(root, 2.55, 0, 2.0);
  barrel(root, 1.4, 0, 2.0);
  barge(P, root, 4.6, -0.45, 1.2, Math.PI / 2, true, 1.2);
  return { root, target: [0, 2.3, 0], span: 11, water: -0.5 };
}

/** The War: one's tower under one's flag, the other's in ink, the chain between, one's galleys. */
export function guerreScene(): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  root.add(rocca(P, P.accentCloth).group);
  bx(root, 5, 0.5, 5, 0, -0.5, 0, C("stone"), 0.3);
  const e = rocca(P, ink()).group;
  e.position.set(9.5, 0, -1);
  root.add(e);
  bx(root, 5, 0.5, 5, 9.5, -0.5, -1, C("stone"), 0.3);
  root.add(chainLink(P, new Vector3(2.4, -0.3, 0.4), new Vector3(7.2, -0.3, -0.4)));
  boat(root, 3.2, 3.4, 1.1, 0.3);
  boat(root, 6.2, 4.2, 1.1, 0.2);
  return { root, target: [4.6, 1.6, 0.6], span: 12, water: -0.5 };
}

/** The Doge's palace: its hall and its campanile. */
export function palaisScene(): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  bx(root, 6.6, 0.5, 6.6, 0, -0.5, 0, C("stone"), 0.2);
  const hall = WORKSHOPS.scuola?.(P, { level: 1, seed: 0 }).group;
  if (hall) root.add(hall);
  const c = WORKSHOPS.campanile?.(P, { level: 1, seed: 0 }).group;
  if (c) {
    c.scale.setScalar(0.6);
    c.position.set(-4.6, 0, -1);
    root.add(c);
  }
  bx(root, 2.6, 0.5, 2.6, -4.6, -0.5, -1, C("stone"), 0.2);
  return { root, target: [-1.4, 2, 0], span: 11.5, water: -0.5 };
}
