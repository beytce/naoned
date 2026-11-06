/**
 * The scenes' plain pieces (the Porta's, Porcellana lot 8): many of one geometry in one draw, a
 * thick hexagonal tile, a plain matt colour. The bought models (KayKit) are gone with the map of
 * before; every model is now Porcellana's, drawn in code (apps/web/src/porcellana/).
 */
import { useLayoutEffect, useRef } from "react";
import {
  type BufferGeometry,
  ExtrudeGeometry,
  type InstancedMesh,
  type Material,
  type Matrix4,
  MeshStandardMaterial,
  Object3D,
  Shape,
} from "three";

/** The default material of the instanced pieces: matt, coloured by its vertices. */
export const clay = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });

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
