import * as THREE from "three";
import { box, cone, cyl, gable, shadowBlob, sphere } from "./models.js";

/** The yard's actors and buildings: vehicles, workers, the store, the gate. */

export interface VehicleModel {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  /** The goods aboard, shown when loaded. */
  cargo: THREE.Mesh | null;
  legs: THREE.Object3D[];
}

function wheel(parent: THREE.Object3D, r: number, x: number, y: number, z: number): THREE.Object3D {
  const w = new THREE.Group();
  w.position.set(x, y, z);
  const rim = cyl(w, r, r, 0.05, "#5A3A22", 0, -0.025, 0, 16);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const spoke = box(w, 0.025, r * 1.8, 0.02, "#C98E52", 0, -r * 0.9, 0.03, 0);
    spoke.parent?.remove(spoke);
    const s = new THREE.Group();
    s.rotation.z = (i * Math.PI) / 4;
    s.add(spoke);
    w.add(s);
  }
  parent.add(w);
  return w;
}

/** A beast of burden, facing +x: a mule (packs) or a horse (for the cart). */
function beast(parent: THREE.Object3D, x: number, coat: string): THREE.Object3D[] {
  const b = new THREE.Group();
  b.position.set(x, 0, 0);
  box(b, 0.42, 0.2, 0.18, coat, 0, 0.2, 0, 0.07);
  const neck = box(b, 0.12, 0.22, 0.1, coat, 0.22, 0.3, 0, 0.04);
  neck.rotation.z = -0.5;
  box(b, 0.2, 0.1, 0.1, coat, 0.32, 0.45, 0, 0.04);
  box(b, 0.04, 0.08, 0.03, coat, 0.28, 0.53, 0.035, 0.01);
  box(b, 0.04, 0.08, 0.03, coat, 0.28, 0.53, -0.035, 0.01);
  const legs: THREE.Object3D[] = [];
  for (const [lx, lz] of [
    [0.15, 0.06],
    [0.15, -0.06],
    [-0.15, 0.06],
    [-0.15, -0.06],
  ] as const) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.22, lz);
    box(leg, 0.05, 0.22, 0.05, shade(coat), 0, -0.22, 0, 0.015);
    b.add(leg);
    legs.push(leg);
  }
  shadowBlob(b, 0.55, 0.3);
  parent.add(b);
  return legs;
}

function shade(hex: string): string {
  return `#${new THREE.Color(hex).multiplyScalar(0.75).getHexString()}`;
}

/** A vehicle of the road, facing +x: the cart (and its horse), the mule, the wagon. */
export function vehicleModel(type: string): VehicleModel {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  let cargo: THREE.Mesh | null = null;
  let legs: THREE.Object3D[] = [];
  if (type === "mule") {
    legs = beast(group, 0, "#8C6A4E");
    box(group, 0.16, 0.14, 0.26, "#C9A877", -0.02, 0.38, 0, 0.04);
    cargo = box(group, 0.14, 0.1, 0.3, "#E0AD4B", -0.02, 0.5, 0, 0.03);
  } else {
    const wagon = type === "wagon";
    const len = wagon ? 0.9 : 0.62;
    box(group, len, 0.08, 0.42, "wood", -0.05, 0.2, 0, 0.02);
    box(group, len, 0.12, 0.03, "wood-light", -0.05, 0.28, 0.2, 0.01);
    box(group, len, 0.12, 0.03, "wood-light", -0.05, 0.28, -0.2, 0.01);
    box(group, 0.03, 0.12, 0.42, "wood-light", -0.05 - len / 2, 0.28, 0, 0.01);
    cyl(group, 0.015, 0.015, 0.5, "wood", 0.35, 0.2, 0.1, 6).rotation.z = Math.PI / 2;
    cyl(group, 0.015, 0.015, 0.5, "wood", 0.35, 0.2, -0.1, 6).rotation.z = Math.PI / 2;
    const r = wagon ? 0.15 : 0.17;
    wheels.push(wheel(group, r, -0.05, r, 0.24), wheel(group, r, -0.05, r, -0.24));
    if (wagon) wheels.push(wheel(group, r, -0.35, r, 0.24), wheel(group, r, -0.35, r, -0.24));
    if (wagon) {
      const canopy = cyl(group, 0.22, 0.22, len * 0.9, "#F1E4C6", -0.05, 0.3, 0, 14);
      canopy.rotation.z = Math.PI / 2;
      canopy.scale.set(1, 1, 1);
    }
    cargo = box(group, len * 0.7, 0.16, 0.32, "#E0AD4B", -0.08, 0.28, 0, 0.03);
    legs = beast(group, 0.75, "#7A5638");
    shadowBlob(group, len + 0.4, 0.6, -0.05, 0);
  }
  return { group, wheels, cargo, legs };
}

export interface WorkerModel {
  group: THREE.Group;
  body: THREE.Group;
  arms: THREE.Object3D[];
  legs: THREE.Object3D[];
}

const SHIRTS = ["#6DB3A2", "#E0AD4B", "#E2694F", "#8E6BD8", "#F1E4C6", "#3FA36B"];

/** A worker, facing +z: tunic, apron, cap, rounded like a figurine. */
export function workerModel(index: number): WorkerModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const shirt = SHIRTS[index % SHIRTS.length] ?? "#6DB3A2";
  const legs: THREE.Object3D[] = [];
  for (const x of [-0.035, 0.035]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.12, 0);
    box(leg, 0.045, 0.12, 0.05, "#4A3426", 0, -0.12, 0, 0.015);
    body.add(leg);
    legs.push(leg);
  }
  box(body, 0.14, 0.17, 0.1, shirt, 0, 0.11, 0, 0.045);
  box(body, 0.1, 0.1, 0.012, "#F1E4C6", 0, 0.12, 0.052, 0.005);
  const arms: THREE.Object3D[] = [];
  for (const x of [-0.085, 0.085]) {
    const arm = new THREE.Group();
    arm.position.set(x, 0.26, 0);
    box(arm, 0.035, 0.13, 0.04, shirt, 0, -0.13, 0, 0.015);
    body.add(arm);
    arms.push(arm);
  }
  sphere(body, 0.065, "#E9B98F", 0, 0.34, 0);
  cyl(body, 0.07, 0.072, 0.03, "#4A3426", 0, 0.37, 0, 12);
  cone(body, 0.055, 0.05, "#4A3426", 0, 0.395, 0, 12);
  shadowBlob(group, 0.24, 0.24);
  return { group, body, arms, legs };
}

/** The store: an open shed on a stone floor, its piles of crates and sacks growing with the stock. */
export function storeModel(stock: number): THREE.Group {
  const g = new THREE.Group();
  box(g, 2.2, 0.08, 1.6, "stone", 0, 0, 0, 0.03);
  for (const [x, z] of [
    [-1.0, -0.7],
    [1.0, -0.7],
    [-1.0, 0.7],
    [1.0, 0.7],
  ] as const) {
    box(g, 0.1, 1.05, 0.1, "wood", x, 0.08, z, 0.02);
  }
  box(g, 2.2, 0.55, 0.06, "wood-light", 0, 0.08, -0.75, 0.02);
  gable(g, 2.2, 1.6, 0.45, "roof", "wood", 0, 1.13, 0, "x", 0.14);
  const piles = Math.min(8, Math.ceil(stock / 30));
  for (let i = 0; i < piles; i++) {
    const x = -0.7 + (i % 4) * 0.45;
    const z = -0.35 + Math.floor(i / 4) * 0.55;
    if (i % 3 === 2) {
      sphere(g, 0.15, "#E8D9B5", x, 0.22, z, 0.8);
      sphere(g, 0.13, "#DCC9A0", x + 0.12, 0.42, z + 0.05, 0.8);
    } else {
      box(g, 0.3, 0.26, 0.3, i % 2 ? "wood-light" : "wood", x, 0.08, z, 0.03);
      if (i % 2) box(g, 0.24, 0.22, 0.24, "wood", x + 0.02, 0.34, z, 0.03);
    }
  }
  shadowBlob(g, 2.6, 2.0);
  return g;
}

/** The gate to the road: two stone pillars, a lintel, a lantern. */
export function gateModel(): { group: THREE.Group; lamp: THREE.Mesh } {
  const g = new THREE.Group();
  box(g, 0.3, 1.3, 0.3, "stone", 0, 0, -0.85, 0.04);
  box(g, 0.3, 1.3, 0.3, "stone", 0, 0, 0.85, 0.04);
  box(g, 0.36, 0.22, 2.06, "stone", 0, 1.3, 0, 0.04);
  box(g, 0.38, 0.06, 2.1, "#C8462A", 0, 1.52, 0, 0.02);
  const lamp = box(g, 0.1, 0.14, 0.1, "window", 0.2, 1.02, 0.85, 0.02);
  return { group: g, lamp };
}
