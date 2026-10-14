import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { disposeMergedIn, mergeStatic } from "../src/domain3d/merge.js";

const stone = new THREE.MeshStandardMaterial({ color: "#888888" });
const wood = new THREE.MeshStandardMaterial({ color: "#8a5a34" });
const cube = new THREE.BoxGeometry(1, 1, 1);

function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
}

function bounds(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root, true);
}

function town(): { group: THREE.Group; flag: THREE.Mesh } {
  const group = new THREE.Group();
  group.position.set(5, 0, 2);
  group.scale.setScalar(2);
  const house = new THREE.Group();
  house.position.set(1, 0, 0);
  house.rotation.y = 0.4;
  group.add(house);
  for (let i = 0; i < 3; i++) {
    const wall = new THREE.Mesh(cube, stone);
    wall.position.set(i, 0.5, 0);
    wall.castShadow = true;
    house.add(wall);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 4), wood);
  roof.position.set(0, 1.5, 0);
  roof.castShadow = true;
  house.add(roof);
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 4), wood);
  roof2.position.set(2, 1.5, 0);
  roof2.castShadow = true;
  house.add(roof2);
  const flag = new THREE.Mesh(cube, wood);
  flag.position.set(0, 3, 0);
  group.add(flag);
  return { group, flag };
}

describe("merging the still parts of a model", () => {
  it("draws the parts of each material in one mesh, in the same place", () => {
    const { group, flag } = town();
    const before = bounds(group);
    mergeStatic(group, [flag]);
    // One stone mesh, one wood mesh, and the flag kept apart.
    expect(meshes(group)).toHaveLength(3);
    expect(meshes(group)).toContain(flag);
    const after = bounds(group);
    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-4);
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-4);
  });

  it("keeps the shadows of the parts", () => {
    const { group, flag } = town();
    mergeStatic(group, [flag]);
    const merged = meshes(group).filter((m) => m !== flag);
    expect(merged.every((m) => m.castShadow)).toBe(true);
  });

  it("leaves alone what moves, and what is drawn see-through or mirrored", () => {
    const root = new THREE.Group();
    const sail = new THREE.Group();
    root.add(sail);
    for (let i = 0; i < 2; i++) sail.add(new THREE.Mesh(cube, stone));
    const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 });
    for (let i = 0; i < 2; i++) root.add(new THREE.Mesh(cube, glass));
    const mirrored = new THREE.Mesh(cube, wood);
    mirrored.scale.x = -1;
    root.add(mirrored, new THREE.Mesh(cube, wood));
    mergeStatic(root, [sail]);
    expect(meshes(sail)).toHaveLength(2);
    expect(meshes(root)).toHaveLength(6);
  });

  it("keeps far parts of a land apart, by zones, so what is out of view is not drawn", () => {
    const land = new THREE.Group();
    for (const x of [0, 1, 2, 30, 31]) {
      const rock = new THREE.Mesh(cube, stone);
      rock.position.set(x, 0, 0);
      land.add(rock);
    }
    mergeStatic(land, [], { cell: 10 });
    expect(meshes(land)).toHaveLength(2);
  });

  it("frees what it made", () => {
    const { group, flag } = town();
    mergeStatic(group, [flag]);
    let freed = 0;
    for (const m of meshes(group)) m.geometry.addEventListener("dispose", () => freed++);
    disposeMergedIn(group);
    expect(freed).toBe(2);
  });
});
