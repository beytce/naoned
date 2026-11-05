/**
 * The dressing (docs/plan-porcellana.md § 4): rocks bevelled, mountains in cut terraces, and the
 * « + » plot of a tile one may not buy yet (its plus greyed, a padlock).
 */
import { DodecahedronGeometry, Group, TorusGeometry } from "three";
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

/** A mountain: terraces of cut stone stepping up to a cap of snow (trim), from the seed. */
export function mountain(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  const rnd = seeded(o.seed * 5 + 1);
  const steps = 4;
  let w = 5.2;
  let d = 5.0;
  let y = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < steps; i++) {
    const h = 0.8 + rnd() * 0.5;
    box(g, w, h, d, cx, y, cz, P.m(i === steps - 1 ? "trim" : i % 2 ? "wall2" : "roof"), 0.08);
    y += h;
    w *= 0.68 + rnd() * 0.08;
    d *= 0.66 + rnd() * 0.08;
    cx += (rnd() - 0.5) * 0.5;
    cz += (rnd() - 0.6) * 0.5;
  }
  tree(P, g, -2.2, 2.2, 0.9, "fir");
  tree(P, g, 2.3, 1.9, 0.8, "fir");
  return { group: g, pin: [cx, y + 0.8, cz] };
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
  // The padlock.
  box(g, 0.5, 0.42, 0.22, 1.1, 0.05, 1.1, P.ink, 0.06);
  const shackle = put(
    g,
    cached("shackle", () => new TorusGeometry(0.16, 0.045, 10, 24, Math.PI)),
    P.m("metal"),
    1.1,
    0.47,
    1.1,
  );
  shackle.rotation.y = 0;
  return { group: g, pin: [0, 0.9, 0], plus };
}
