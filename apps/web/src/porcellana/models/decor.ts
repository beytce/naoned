/**
 * The dressing (docs/plan-porcellana.md § 4): rocks bevelled, mountains in cut terraces, and the
 * « + » plot of a tile one may not buy yet (its plus greyed, a padlock).
 */
import { ConeGeometry, DodecahedronGeometry, Group, TorusGeometry } from "three";
import type { Palette } from "../materials.js";
import { box, cached, dyn, put, seeded, tree } from "../shapes.js";
import type { Built, ModelOpts } from "./model.js";

/** Rocks: facetted stones of three sizes, scattered from the seed, a fir or two among them. */
export function rocks(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const rnd = seeded(o.seed * 11 + 5);
  const geo = cached("rock", () => new DodecahedronGeometry(1, 0));
  for (let i = 0; i < 7; i++) {
    const x = (rnd() - 0.5) * 4.4;
    const z = (rnd() - 0.5) * 4.4;
    const s = 0.35 + rnd() * 0.55;
    const r = put(g, geo, P.m(i % 2 ? "wall2" : "roof", true), x, s * 0.7, z);
    r.scale.set(s * (1 + rnd() * 0.4), s * 0.7, s * (1 + rnd() * 0.3));
    r.rotation.set(0, rnd() * 3, 0);
  }
  tree(P, g, 1.8, -1.9, 1.0, "fir");
  return { group: g, pin: [0, 1.6, 0] };
}

/**
 * A mountain: a peak of facetted stone, its cap of snow following the same facets, a lower peak
 * beside it, firs and rocks at its foot. Its facets jittered from the seed, the same at every call.
 */
export function mountain(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const rnd = seeded(o.seed * 5 + 1);
  /**
   * A facetted peak: a cone of `n` sides, its ring jittered, its top leaning a little; its cap of
   * snow the same geometry scaled about the top (so its facets follow the stone's exactly).
   */
  const peak = (x: number, z: number, r: number, h: number, n: number, snow: number) => {
    const geo = new ConeGeometry(r, h, n, 1);
    const pos = geo.getAttribute("position");
    const jitter = Array.from({ length: n }, () => 0.82 + rnd() * 0.3);
    const lx = (rnd() - 0.5) * r * 0.25;
    const lz = (rnd() - 0.5) * r * 0.25;
    for (let k = 0; k < pos.count; k++) {
      const vx = pos.getX(k);
      const vy = pos.getY(k);
      const vz = pos.getZ(k);
      const up = (vy + h / 2) / h;
      const side = ((Math.round((Math.atan2(vx, vz) / (Math.PI * 2)) * n) % n) + n) % n;
      const jj = jitter[side] ?? 1;
      pos.setXYZ(k, vx * jj + lx * up, vy, vz * jj + lz * up);
    }
    // The top at the origin: the stone and its cap scale about it.
    geo.translate(-lx, -h / 2, -lz);
    geo.computeVertexNormals();
    put(g, geo, P.m("roof", true), x + lx, h, z + lz);
    const cap = put(g, geo, P.m("trim", true), x + lx, h + 0.004, z + lz);
    cap.scale.set(snow * 1.03, snow, snow * 1.03);
  };
  peak(-0.3, -0.4, 2.3, 4.2, 7, 0.34);
  peak(1.3, 1.0, 1.3, 2.4, 6, 0.3);
  for (const [x, z, s] of [
    [-2.3, 2.2, 0.9],
    [-1.6, 2.5, 0.75],
    [2.4, -1.9, 0.8],
  ] as const)
    tree(P, g, x, z, s, "fir");
  const geo = cached("rock", () => new DodecahedronGeometry(1, 0));
  for (const [x, z, s] of [
    [0.6, 2.3, 0.35],
    [-2.4, -0.4, 0.4],
  ] as const) {
    const r = put(g, geo, P.m("wall2", true), x, s * 0.7, z);
    r.scale.set(s * 1.2, s * 0.7, s);
  }
  return { group: g, pin: [-0.3, 5.0, -0.4] };
}

/** A tile one may not buy yet: the plot, its plus greyed, a padlock on it. */
export function lockedPlot(P: Palette): Built {
  const g = new Group();
  box(g, 4.4, 0.05, 4.4, 0, 0, 0, P.m("ground"), 0.25);
  const plus = dyn(new Group());
  g.add(plus);
  box(plus, 1.3, 0.08, 0.28, 0, 0.05, 0, P.m("wall2"), 0.06);
  box(plus, 0.28, 0.08, 1.3, 0, 0.05, 0, P.m("wall2"), 0.06);
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    box(g, 0.6, 0.05, 0.1, sx * 1.75, 0.05, sz * 2.0, P.m("wall2"), 0.03);
    box(g, 0.1, 0.05, 0.6, sx * 2.0, 0.05, sz * 1.75, P.m("wall2"), 0.03);
  }
  // No padlock in 3D (P1-01 of the players' audit): its pin « 🔒 niv. N » says it, one sign alone.
  return { group: g, pin: [0, 0.9, 0], plus };
}
