/**
 * Porcellana's primitives (the prototype's, docs/plan-porcellana.md § 3): every volume bevelled,
 * set on its base (y is its foot), casting and taking shadows. A model is built of these into a
 * Group, then baked (bake.ts). The geometries are shared by their sizes.
 */
import {
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  type Material,
  Mesh,
  type Object3D,
  Path,
  Shape,
  SphereGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Palette } from "./materials.js";
import { BOARD } from "./tokens.js";

const geos = new Map<string, BufferGeometry>();
export function cached<G extends BufferGeometry>(key: string, make: () => G): G {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g as G;
}

/** A mesh put in its parent, casting and taking shadows. */
export function put(p: Object3D, geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0): Mesh {
  const me = new Mesh(geo, mat);
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = true;
  p.add(me);
  return me;
}

/** Marks what moves: kept out of the bake, its own mesh. */
export function dyn<T extends Object3D>(o: T): T {
  o.userData.dyn = true;
  return o;
}

/** A rounded box, its foot at y. */
export function box(
  p: Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  r: number = BOARD.bevel,
): Mesh {
  const rr = Math.max(0.004, Math.min(r, w / 2 - 0.003, h / 2 - 0.003, d / 2 - 0.003));
  const g = cached(`b${w}|${h}|${d}|${rr}`, () => new RoundedBoxGeometry(w, h, d, 3, rr));
  return put(p, g, mat, x, y + h / 2, z);
}

export function cyl(
  p: Object3D,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  seg = 40,
): Mesh {
  const g = cached(`c${rt}|${rb}|${h}|${seg}`, () => new CylinderGeometry(rt, rb, h, seg, 1));
  return put(p, g, mat, x, y + h / 2, z);
}

export function cone(
  p: Object3D,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  seg = 40,
): Mesh {
  const g = cached(`k${r}|${h}|${seg}`, () => new ConeGeometry(r, h, seg, 1));
  return put(p, g, mat, x, y + h / 2, z);
}

/** A half sphere on its base, stretched up by `sy`. */
export function dome(
  p: Object3D,
  r: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  sy = 1,
): Mesh {
  const g = cached(`d${r}`, () => new SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  const me = put(p, g, mat, x, y, z);
  me.scale.y = sy;
  return me;
}

/** A ball centred on (x, y, z). */
export function ball(
  p: Object3D,
  r: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  seg = 28,
): Mesh {
  const g = cached(`s${r}|${seg}`, () => new SphereGeometry(r, seg, Math.round(seg * 0.66)));
  return put(p, g, mat, x, y, z);
}

/** A shape extruded along z, centred on it, its edges bevelled. */
export function extrude(shape: Shape, depth: number, bevel = 0.012): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 18,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** A Venetian arch: a rectangle under a half circle, `h` high in all. */
export function archShape(w: number, h: number, y0 = 0): Shape {
  const s = new Shape();
  const r = w / 2;
  const hs = h - r;
  s.moveTo(-r, y0);
  s.lineTo(r, y0);
  s.lineTo(r, y0 + hs);
  s.absarc(0, y0 + hs, r, 0, Math.PI, false);
  s.lineTo(-r, y0);
  return s;
}

/** A panel pierced by `n` arches, its foot at y = 0, its face toward +z. */
export function arcadeGeo(
  W: number,
  H: number,
  n: number,
  archW: number,
  archH: number,
  depth: number,
): BufferGeometry {
  return cached(`a${W}|${H}|${n}|${archW}|${archH}|${depth}`, () => {
    const s = new Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, H);
    s.lineTo(-W / 2, H);
    s.lineTo(-W / 2, 0);
    const step = W / n;
    for (let i = 0; i < n; i++) {
      const cx = -W / 2 + step * (i + 0.5);
      const r = archW / 2;
      const hs = archH - r;
      const y0 = 0.07;
      const hole = new Path();
      hole.moveTo(cx - r, y0);
      hole.lineTo(cx + r, y0);
      hole.lineTo(cx + r, y0 + hs);
      hole.absarc(cx, y0 + hs, r, 0, Math.PI, false);
      hole.lineTo(cx - r, y0);
      s.holes.push(hole);
    }
    return extrude(s, depth, 0.01);
  });
}

export function windowGeo(w: number, h: number, arched: boolean): BufferGeometry {
  return cached(`w${w}|${h}|${arched}`, () =>
    arched ? extrude(archShape(w, h), 0.04, 0.006) : new RoundedBoxGeometry(w, h, 0.04, 2, 0.008),
  );
}

/**
 * Runs `fn` on the faces of a w×d block centred at (x, z): its group turned so that its +z is the
 * face's outward normal, `off` away. Faces: 0 south (+z), 1 east (+x), 2 north, 3 west.
 */
export function faces(
  p: Object3D,
  x: number,
  z: number,
  w: number,
  d: number,
  fn: (f: Group, len: number, off: number) => void,
  which: number[] = [0, 1, 2, 3],
): void {
  const spec: [number, number, number][] = [
    [0, w, d / 2],
    [Math.PI / 2, d, w / 2],
    [Math.PI, w, d / 2],
    [-Math.PI / 2, d, w / 2],
  ];
  for (const i of which) {
    const sp = spec[i];
    if (!sp) continue;
    const [rot, len, off] = sp;
    const f = new Group();
    f.position.set(x, 0, z);
    f.rotation.y = rot;
    p.add(f);
    fn(f, len, off);
  }
}

/** Rows of windows on the faces of a block, hollow and dark. */
export function windows(
  P: Palette,
  p: Object3D,
  x: number,
  z: number,
  w: number,
  d: number,
  y0: number,
  rows: number,
  rowH: number,
  ww = 0.2,
  wh = 0.42,
  spacing = 0.56,
  arched = true,
  which?: number[],
): void {
  faces(
    p,
    x,
    z,
    w,
    d,
    (f, len, off) => {
      const n = Math.max(1, Math.floor((len - 0.3) / spacing));
      for (let r = 0; r < rows; r++)
        for (let i = 0; i < n; i++) {
          const u = (i - (n - 1) / 2) * spacing;
          put(f, windowGeo(ww, wh, arched), P.m("open"), u, y0 + r * rowH, off + 0.012).castShadow =
            false;
        }
    },
    which,
  );
}

/** A gable roof (two slabs, a ridge, the gable ends filled), its ridge along z before `rotY`. */
export function gable(
  P: Palette,
  p: Object3D,
  w: number,
  d: number,
  y: number,
  h: number,
  x = 0,
  z = 0,
  rotY = 0,
  wallMat: Material = P.m("wall"),
  over = 0.18,
  t = 0.1,
): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const tri = new Shape();
  tri.moveTo(-w / 2, 0);
  tri.lineTo(w / 2, 0);
  tri.lineTo(0, h);
  tri.lineTo(-w / 2, 0);
  put(
    g,
    cached(`t${w}|${h}|${d}`, () => extrude(tri, d - 0.02, 0)),
    wallMat,
  );
  const th = Math.atan2(h, w / 2);
  const a = w / 2 + over;
  const L = a / Math.cos(th) + 0.02;
  const slab = cached(
    `sl${L}|${t}|${d + 2 * over}`,
    () => new RoundedBoxGeometry(L, t, d + over * 2, 3, 0.03),
  );
  for (const sgn of [1, -1]) {
    const cx = sgn * (a / 2);
    const cy = h - (a / 2) * Math.tan(th);
    const me = put(
      g,
      slab,
      P.m("roof"),
      cx + (sgn * Math.sin(th) * t) / 2,
      cy + (Math.cos(th) * t) / 2,
      0,
    );
    me.rotation.z = -sgn * th;
  }
  const ridge = cyl(g, t * 0.7, t * 0.7, d + over * 2, 0, 0, 0, P.m("trim"), 16);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = h + t * 0.9;
  return g;
}

/** A hip roof (a four-sided pyramid), facetted. */
export function hipRoof(
  P: Palette,
  p: Object3D,
  w: number,
  d: number,
  y: number,
  h: number,
  x = 0,
  z = 0,
  over = 0.14,
): Mesh {
  const g = cached("hip", () => new ConeGeometry(1, 1, 4, 1));
  const me = put(p, g, P.m("roof", true), x, y + h / 2, z);
  me.rotation.y = Math.PI / 4;
  me.scale.set((w + over * 2) / Math.SQRT2, h, (d + over * 2) / Math.SQRT2);
  return me;
}

/** A Venetian chimney: a shaft under a funnel. */
export function chimney(P: Palette, p: Object3D, x: number, y: number, z: number): void {
  cyl(p, 0.07, 0.07, 0.45, x, y, z, P.m("wall2"), 20);
  cyl(p, 0.17, 0.07, 0.22, x, y + 0.45, z, P.m("wall"), 24);
  cyl(p, 0.18, 0.18, 0.04, x, y + 0.67, z, P.m("trim"), 24);
}

export type TreeKind = "round" | "cypress" | "fir";

export function tree(
  P: Palette,
  p: Object3D,
  x: number,
  z: number,
  s = 1,
  kind: TreeKind = "round",
): void {
  if (kind === "cypress") {
    cyl(p, 0.05 * s, 0.06 * s, 0.25 * s, x, 0, z, P.m("wood"), 12);
    const b = ball(p, 0.32 * s, x, 0.25 * s + 0.95 * s, z, P.m("leaf"));
    b.scale.set(1, 3.1, 1);
  } else if (kind === "fir") {
    cyl(p, 0.06 * s, 0.07 * s, 0.3 * s, x, 0, z, P.m("wood"), 12);
    cone(p, 0.6 * s, 0.9 * s, x, 0.3 * s, z, P.m("leaf"), 28);
    cone(p, 0.46 * s, 0.75 * s, x, 0.75 * s, z, P.m("leaf"), 28);
    cone(p, 0.3 * s, 0.6 * s, x, 1.15 * s, z, P.m("leaf"), 28);
  } else {
    cyl(p, 0.06 * s, 0.075 * s, 0.55 * s, x, 0, z, P.m("wood"), 12);
    ball(p, 0.48 * s, x, 0.55 * s + 0.4 * s, z, P.m("leaf"));
  }
}

export function crate(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  mat: Material,
  s = 0.42,
  rot = 0,
): Mesh {
  const c = box(p, s, s, s, x, y, z, mat, 0.035);
  c.rotation.y = rot;
  return c;
}

/** A small deterministic random (mulberry32), for a tile's dressing. */
export function seeded(a: number): () => number {
  let s = a;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
