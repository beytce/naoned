/**
 * The 3D map's models: the KayKit glTF files (public/models/kaykit), each merged into one geometry,
 * recoloured in the night board's palette (recolor.ts), set on the ground (its foot at y = 0),
 * centred and scaled to one unit across, so that the scene sizes it in chart units. The tiles and
 * what KayKit lacks (the fondaco's flag, the docks, the cart) are made here of rounded shapes.
 */
import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  type InstancedMesh,
  type Material,
  type Matrix4,
  type Mesh,
  MeshStandardMaterial,
  Object3D,
  Shape,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import models from "./models.json";
import { type Role, recolour } from "./recolor.js";

/**
 * The KayKit models packed in one file (scripts/pack-models.mjs, from art-src/models/kaykit), each
 * under a node named by its key (models.json).
 */
const PACK = "/models/kaykit.glb";

/** The models the map uses, by their key, and their file's name in the KayKit pack. */
export const FILES = models;
export type KitName = keyof typeof models;

export interface KitModel {
  /** The geometry, one unit across its widest side, its foot on the ground. */
  geo: BufferGeometry;
  /** Its height, for one unit across. */
  h: number;
}

/** The one material of the board: clay, matt, coloured by its vertices. */
export const clay = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });

/** A model merged into one geometry: its meshes in place, only position, normal and UV kept. */
function merged(root: Object3D): BufferGeometry {
  root.updateMatrixWorld(true);
  const parts: BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    // Floats again (the pack is quantized: normalized integers), only position, normal and UV.
    const g = new BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      const a = m.geometry.getAttribute(name) as BufferAttribute | undefined;
      if (!a) continue;
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++)
        for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
      g.setAttribute(name, new BufferAttribute(f, a.itemSize));
    }
    if (m.geometry.index) g.setIndex(m.geometry.index.clone());
    g.applyMatrix4(m.matrixWorld);
    parts.push(g);
  });
  // Indexed when every part is (the pack's welded vertices kept: half the vertices on the GPU,
  // audit of 4 November, Blender M4); else all flattened, as mergeGeometries asks.
  const indexed = parts.every((p) => p.index);
  const g = mergeGeometries(
    indexed ? parts : parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  ) as BufferGeometry;
  const box = new Box3().setFromBufferAttribute(g.getAttribute("position") as BufferAttribute);
  const size = box.getSize(new Vector3());
  const k = 1 / Math.max(size.x, size.z);
  const c = box.getCenter(new Vector3());
  g.translate(-c.x, -box.min.y, -c.z);
  g.scale(k, k, k);
  return g;
}

type Kit = (name: KitName, over?: Partial<Record<Role, string>>) => KitModel;

/** The kits made, one for each loaded pack: merged once for every caller, never again. */
const kits = new WeakMap<Object3D, Kit>();

function kitOf(scene: Object3D): Kit {
  const made = kits.get(scene);
  if (made) return made;
  const base = new Map<KitName, BufferGeometry>();
  scene.updateMatrixWorld(true);
  for (const name of Object.keys(FILES) as KitName[]) {
    const node = scene.getObjectByName(name);
    if (node) base.set(name, merged(node));
  }
  const cache = new Map<string, KitModel>();
  /** A model in the palette, some of its roles swapped (`over`). */
  const kit: Kit = (name, over = {}) => {
    const key = `${name}:${JSON.stringify(over)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    // A model missing from the pack: a crate stands for it (never a crash).
    const src = base.get(name) ?? base.get("crate") ?? [...base.values()][0];
    if (!src) throw new Error("3D kit: no model in the pack");
    // A variant shares the model's place, normals and triangles; only its colours are its own,
    // and it keeps no UV (they only serve to paint it).
    const g = new BufferGeometry();
    g.setAttribute("position", src.getAttribute("position"));
    g.setAttribute("normal", src.getAttribute("normal"));
    if (src.index) g.setIndex(src.index);
    const uv = src.getAttribute("uv") as BufferAttribute | undefined;
    if (uv) g.setAttribute("color", new BufferAttribute(recolour(uv.array, over), 3));
    g.computeBoundingBox();
    const model = { geo: g, h: g.boundingBox?.max.y ?? 1 };
    cache.set(key, model);
    return model;
  };
  kits.set(scene, kit);
  return kit;
}

/** Every model, loaded once (it suspends until then), and its recoloured variants on demand. */
export function useKit(): Kit {
  const gltf = useGLTF(PACK, false, true) as unknown as { scene: Object3D };
  return kitOf(gltf.scene);
}
useGLTF.preload(PACK, false, true);

export interface Placed {
  x: number;
  y: number;
  z: number;
  /** Across, in chart units. */
  s: number;
  rot?: number;
}

const tmp = new Object3D();

/** Many of one model, in one draw: the pines, the rocks, the houses. */
export function Instanced({
  geo,
  items,
  material = clay,
  cast = true,
  receive = true,
}: {
  geo: BufferGeometry;
  items: Placed[];
  material?: Material;
  cast?: boolean;
  receive?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((p, i) => {
      tmp.position.set(p.x, p.y, p.z);
      tmp.rotation.set(0, p.rot ?? 0, 0);
      tmp.scale.setScalar(p.s);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, material, items.length]}
      castShadow={cast}
      receiveShadow={receive}
    />
  );
}

/**
 * A thick hexagonal tile, pointy-top as the game's grid, its edges rounded (clay): `r` across its
 * corners, `depth` thick, its top at y = 0.
 */
export function hexSlab(r: number, depth: number, bevel: number): BufferGeometry {
  const s = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (90 + 60 * i);
    const x = (r - bevel) * Math.cos(a);
    const y = (r - bevel) * Math.sin(a);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  const g = new ExtrudeGeometry(s, {
    depth: Math.max(0.01, depth - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  // The shape lies in x, y and grows along z: stood up, it grows along y, its corners along z.
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  g.translate(0, -(g.boundingBox?.max.y ?? 0), 0);
  g.computeVertexNormals();
  return g;
}

/** A plain colour on the clay material (the tiles, the shapes made here). */
const mats = new Map<string, MeshStandardMaterial>();
export function claySolid(hex: string, opts: { opacity?: number; rough?: number } = {}) {
  const key = `${hex}:${opts.opacity ?? 1}:${opts.rough ?? 0.92}`;
  let m = mats.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color: hex,
      roughness: opts.rough ?? 0.92,
      metalness: 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    });
    mats.set(key, m);
  }
  return m;
}

/** A matrix to lay a model at a point, turned and scaled (for a merged decor). */
export function placeMatrix(p: Placed): Matrix4 {
  tmp.position.set(p.x, p.y, p.z);
  tmp.rotation.set(0, p.rot ?? 0, 0);
  tmp.scale.setScalar(p.s);
  tmp.updateMatrix();
  return tmp.matrix.clone();
}
