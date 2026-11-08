/**
 * The bake (docs/plan-porcellana.md § 3): a tile's still meshes merged by material, in the tile's
 * own space, so that a tile is a handful of draw calls and still lifts as one. What moves (marked
 * `dyn`, shapes.ts) stays apart.
 */
import {
  BufferAttribute,
  type BufferGeometry,
  type Material,
  Mesh,
  type Object3D,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function underDyn(o: Object3D, root: Object3D): boolean {
  for (let q: Object3D | null = o; q && q !== root; q = q.parent) if (q.userData.dyn) return true;
  return false;
}

/** Below this height, a still mesh is flat on the ground: it casts no shadow. */
const FLAT = 0.12;

/** Merges a group's still meshes by material; returns how many meshes it left. */
export function bake(group: Object3D): number {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map<string, { mat: Material; cast: boolean; geos: BufferGeometry[] }>();
  const victims: Mesh[] = [];
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (underDyn(o, group)) {
      // What moves stays apart; flat, it casts no shadow either.
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      if (b && (b.max.y - b.min.y) * o.getWorldScale(new Vector3()).y < FLAT) o.castShadow = false;
      return;
    }
    const mat = o.material as Material;
    let g = (o.geometry as BufferGeometry)
      .clone()
      .applyMatrix4(inv.clone().multiply(o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes))
      if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new BufferAttribute(new Float32Array((g.attributes.position?.count ?? 0) * 2), 2),
      );
    g.clearGroups();
    // A flat thin thing on the ground (a plot's inset, a mark, a basin's water) casts no shadow:
    // on some graphics chips its shadow fell on itself and veiled the plot in grey (the owner's
    // report of 8 November 2026).
    g.computeBoundingBox();
    const flat = (g.boundingBox?.max.y ?? 1) - (g.boundingBox?.min.y ?? 0) < FLAT;
    const cast = o.castShadow && !flat;
    const key = `${mat.uuid}${cast ? "c" : "n"}`;
    let b = buckets.get(key);
    if (!b) {
      b = { mat, cast, geos: [] };
      buckets.set(key, b);
    }
    b.geos.push(g);
    victims.push(o);
  });
  for (const v of victims) v.parent?.remove(v);
  // The empty groups left by `faces` and the like go too.
  const empties: Object3D[] = [];
  group.traverse((o) => {
    if (
      o !== group &&
      o.children.length === 0 &&
      !(o instanceof Mesh) &&
      !o.userData.dyn &&
      o.type === "Group"
    )
      empties.push(o);
  });
  for (const e of empties) e.parent?.remove(e);
  for (const { mat, cast, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const me = new Mesh(merged, mat);
    me.castShadow = cast;
    me.receiveShadow = true;
    group.add(me);
  }
  let n = 0;
  group.traverse((o) => {
    if (o instanceof Mesh) n++;
  });
  return n;
}
