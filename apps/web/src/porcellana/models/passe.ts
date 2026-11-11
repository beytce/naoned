/**
 * The pieces of the Passe (docs/CADRAGE-v4.md § 9, docs/plan-passe.md P5), in the kit's grammar: the
 * thread's barge under its sail of accent, the chain's post of ink, the ribbon that holds two barges
 * together (the roads' accent), the links of ink between two posts, and the rails of the four banks.
 */
import { Group, type Material, type Vector3 } from "three";
import type { Palette } from "../materials.js";
import { box, cyl } from "../shapes.js";
import { ship } from "./vehicles.js";

/** A barge of the thread: the kit's ship, its bow to the north. */
export function barge(P: Palette): Group {
  const g = new Group();
  const s = ship(P, { seed: 1, running: false });
  s.group.scale.setScalar(1.45);
  s.group.rotation.y = Math.PI / 2;
  g.add(s.group);
  return g;
}

/** A post of the chain: a bollard of ink under its cap, a ring of iron round it. */
export function post(P: Palette): Group {
  const g = new Group();
  cyl(g, 0.78, 0.95, 1.7, 0, 0, 0, P.ink, 20);
  box(g, 2.3, 0.3, 2.3, 0, 1.7, 0, P.ink, 0.08);
  cyl(g, 1.12, 1.12, 0.22, 0, 0.62, 0, P.m("metal"), 24);
  return g;
}

function along(a: Vector3, b: Vector3): { len: number; turn: number } {
  return { len: a.distanceTo(b), turn: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

/** The thread between two barges: the roads' ribbon of accent, laid flat. */
export function threadLink(P: Palette, a: Vector3, b: Vector3): Group {
  const g = new Group();
  const { len, turn } = along(a, b);
  const m = box(g, len, 0.09, 0.95, 0, 0.02, 0, P.accent, 0.03);
  m.castShadow = false;
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
    if (k % 2) box(g, 0.78, 0.34, 0.2, x, 0.12, 0, P.ink, 0.06);
    else box(g, 0.78, 0.2, 0.42, x, 0.14, 0, P.ink, 0.06);
  }
  g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  g.rotation.y = turn;
  return g;
}

/** A bank's quay with its rail: the thread's banks in accent, the chain's in ink. */
export function bank(P: Palette, len: number, rail: Material): Group {
  const g = new Group();
  box(g, len, 1.25, 2.6, 0, -1.25, 0, P.m("ground"), 0.16);
  box(g, len - 0.5, 0.42, 0.7, 0, 0, 0, rail, 0.1);
  return g;
}
