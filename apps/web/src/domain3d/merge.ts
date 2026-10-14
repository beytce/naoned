import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The still parts of a model drawn together: every plain mesh under a root that shares a material
 * (and its shadows) is baked into one geometry in the root's space, so a town of a hundred boxes
 * costs a few draw calls. What moves or changes (flags, sails, windows lit at night) is kept apart
 * and stays as it was.
 */

/** Geometries made here, freed with the model. */
const made = new WeakSet<THREE.BufferGeometry>();

/** Attributes a merged geometry keeps: all its parts must have them. */
const ATTRIBUTES = ["position", "normal", "uv"] as const;

export function mergeStatic(
  root: THREE.Object3D,
  keep: Iterable<THREE.Object3D> = [],
  /** A wide land is merged by square zones this wide (root units), each culled on its own. */
  opts: { cell?: number } = {},
): void {
  const kept = new Set(keep);
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const buckets = new Map<
    string,
    { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.Mesh[] }
  >();
  const visit = (o: THREE.Object3D) => {
    if (kept.has(o)) return;
    if (o !== root && plain(o)) {
      const m = o as THREE.Mesh;
      const material = m.material as THREE.Material;
      const attrs = ATTRIBUTES.filter((a) => m.geometry.getAttribute(a)).join();
      let zone = "";
      if (opts.cell) {
        const at = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld).applyMatrix4(toRoot);
        zone = `${Math.floor(at.x / opts.cell)},${Math.floor(at.z / opts.cell)}`;
      }
      const key = `${material.uuid}|${m.castShadow}|${m.receiveShadow}|${attrs}|${zone}`;
      const bucket = buckets.get(key) ?? {
        material,
        cast: m.castShadow,
        receive: m.receiveShadow,
        parts: [],
      };
      bucket.parts.push(m);
      buckets.set(key, bucket);
    }
    for (const c of [...o.children]) visit(c);
  };
  visit(root);

  const matrix = new THREE.Matrix4();
  for (const b of buckets.values()) {
    if (b.parts.length < 2) continue;
    const pieces = b.parts.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes))
        if (!(ATTRIBUTES as readonly string[]).includes(name)) g.deleteAttribute(name);
      g.clearGroups();
      g.applyMatrix4(matrix.multiplyMatrices(toRoot, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(pieces, false);
    for (const p of pieces) p.dispose();
    if (!merged) continue;
    made.add(merged);
    for (const m of b.parts) m.removeFromParent();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    root.add(mesh);
  }
}

/** A mesh that may be baked: one opaque material, visible, not mirrored, drawn in the usual order. */
function plain(o: THREE.Object3D): boolean {
  const m = o as THREE.Mesh;
  if (!m.isMesh || m.constructor !== THREE.Mesh) return false;
  if (Array.isArray(m.material) || m.material.transparent) return false;
  if (!m.visible || m.renderOrder !== 0 || m.morphTargetInfluences) return false;
  return m.matrixWorld.determinant() > 0;
}

/** Frees the merged geometries under a root (before it is thrown away). */
export function disposeMergedIn(root: THREE.Object3D): void {
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry;
    if (g && made.has(g)) {
      made.delete(g);
      g.dispose();
    }
  });
}
