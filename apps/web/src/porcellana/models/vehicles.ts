/**
 * The vehicles (docs/plan-porcellana.md § 4), drawn in code, their +x their heading: a pack mule,
 * a cart on two wheels, a rider under a cloth of accent, a ship under a sail of accent, a gondola.
 * They go only while their hop is under way (the map, lot 3); here, their legs and wheels move with
 * `tick` while `running`.
 */
import { CylinderGeometry, Group, PlaneGeometry, Shape } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cached, crate, cyl, extrude, put } from "../shapes.js";
import type { ModelOpts } from "./model.js";

export interface Vehicle {
  group: Group;
  tick: (t: number) => void;
}

/** A cart on two wheels, its crates, the one in front of accent. */
export function cart(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  box(g, 0.62, 0.12, 0.38, 0, 0.12, 0, P.m("wood"), 0.02);
  const wheel = cached("wheel", () =>
    new CylinderGeometry(0.13, 0.13, 0.05, 20).rotateX(Math.PI / 2),
  );
  const wheels = [-1, 1].map((s) => put(g, wheel, P.ink, 0, 0.13, s * 0.22));
  crate(g, -0.1, 0.24, 0, P.accent, 0.3);
  crate(g, 0.18, 0.24, 0.02, P.m("trim"), 0.24);
  box(g, 0.5, 0.03, 0.03, 0.55, 0.16, 0.12, P.m("wood"), 0.01);
  box(g, 0.5, 0.03, 0.03, 0.55, 0.16, -0.12, P.m("wood"), 0.01);
  return {
    group: g,
    tick: (t) => {
      for (const w of wheels) w.rotation.z = o.running ? -t * 4 : 0;
    },
  };
}

/** A beast of burden: body, neck and head, ears, four legs that step while it walks. */
function beast(P: Palette, g: Group, o: ModelOpts, tone: "wall2" | "wood" = "wall2") {
  box(g, 0.62, 0.3, 0.26, 0, 0.32, 0, P.m(tone), 0.1);
  const neck = box(g, 0.14, 0.3, 0.14, 0.32, 0.46, 0, P.m(tone), 0.05);
  neck.rotation.z = -0.6;
  box(g, 0.26, 0.14, 0.14, 0.46, 0.62, 0, P.m(tone), 0.05);
  for (const s of [-1, 1]) box(g, 0.04, 0.14, 0.04, 0.4, 0.72, s * 0.04, P.m(tone), 0.015);
  const legs: Group[] = [];
  for (const [x, z] of [
    [0.22, 0.09],
    [0.22, -0.09],
    [-0.22, 0.09],
    [-0.22, -0.09],
  ] as const) {
    const leg = new Group();
    leg.position.set(x, 0.34, z);
    g.add(leg);
    box(leg, 0.07, 0.34, 0.07, 0, -0.34, 0, P.m(tone), 0.02);
    legs.push(leg);
  }
  box(g, 0.04, 0.2, 0.04, -0.33, 0.28, 0, P.m(tone), 0.015).rotation.z = 0.4;
  return (t: number) =>
    legs.forEach((l, i) => {
      l.rotation.z = o.running
        ? Math.sin(t * 8 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.45
        : 0;
    });
}

/** A pack mule, two crates in its panniers. */
export function mule(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  const step = beast(P, g, o);
  for (const s of [-1, 1]) crate(g, -0.02, 0.36, s * 0.22, s > 0 ? P.accent : P.m("wood"), 0.24);
  box(g, 0.34, 0.04, 0.5, -0.02, 0.6, 0, P.m("wood"), 0.01);
  return { group: g, tick: step };
}

/** A rider: a figure on its beast, under a cloth of accent, a lance. */
export function rider(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  const step = beast(P, g, o, "wood");
  box(g, 0.5, 0.06, 0.34, -0.02, 0.6, 0, P.accent, 0.02);
  cyl(g, 0.09, 0.12, 0.34, -0.02, 0.64, 0, P.m("trim"), 16);
  ball(g, 0.09, -0.02, 1.06, 0, P.m("trim"), 16);
  const lance = cyl(g, 0.015, 0.015, 1.1, 0.1, 0.4, 0.12, P.m("wood"), 6);
  lance.rotation.z = -0.35;
  return { group: g, tick: step };
}

/** A cog: its hull, its castle, its mast and yard, a full sail of accent. */
export function ship(P: Palette, o: ModelOpts): Vehicle {
  const g = new Group();
  const s = new Shape();
  s.moveTo(-1.0, 0);
  s.lineTo(0.75, 0);
  s.quadraticCurveTo(1.2, 0.05, 1.3, 0.62);
  s.lineTo(-1.1, 0.62);
  s.quadraticCurveTo(-1.2, 0.15, -1.0, 0);
  put(
    g,
    cached("hull", () => extrude(s, 0.72, 0.07)),
    P.m("wall"),
    0,
    0,
    0,
  );
  box(g, 2.4, 0.1, 0.86, 0.05, 0.52, 0, P.ink, 0.03);
  box(g, 0.6, 0.38, 0.74, -0.75, 0.62, 0, P.m("wall2"), 0.03);
  cyl(g, 0.05, 0.06, 2.3, 0.05, 0.6, 0, P.m("wood"), 12);
  const yard = cyl(g, 0.03, 0.03, 1.3, 0.12, 2.55, 0, P.m("wood"), 10);
  yard.rotation.x = Math.PI / 2;
  const sail = cached("sail", () => {
    const geo = new PlaneGeometry(1.25, 1.35, 10, 6);
    const sp = geo.getAttribute("position");
    for (let i = 0; i < sp.count; i++) {
      const u = sp.getX(i) / 0.625;
      const v = sp.getY(i) / 0.675;
      sp.setZ(i, (1 - u * u) * 0.22 * (0.7 + 0.3 * (1 - v * v)));
    }
    geo.computeVertexNormals();
    return geo;
  });
  const sm = put(g, sail, P.accentCloth, 0.16, 1.88, 0);
  sm.rotation.y = Math.PI / 2;
  return {
    group: g,
    tick: (t) => {
      g.rotation.x = o.running ? Math.sin(t * 1.2) * 0.03 : 0;
    },
  };
}

/** A gondola, black, its iron at the bow, its gondolier and his oar. */
export function gondola(P: Palette): Vehicle {
  const g = new Group();
  const s = new Shape();
  s.moveTo(-1.1, 0.42);
  s.quadraticCurveTo(-0.9, 0.02, -0.4, 0);
  s.lineTo(0.5, 0);
  s.quadraticCurveTo(1.0, 0.03, 1.15, 0.5);
  s.lineTo(1.05, 0.5);
  s.quadraticCurveTo(0.85, 0.16, 0.4, 0.16);
  s.lineTo(-0.4, 0.16);
  s.quadraticCurveTo(-0.85, 0.16, -1.0, 0.42);
  put(
    g,
    cached("gondola", () => extrude(s, 0.26, 0.03)),
    P.ink,
    0,
    0,
    0,
  );
  box(g, 0.05, 0.22, 0.14, 1.12, 0.42, 0, P.m("metal"), 0.01);
  cyl(g, 0.06, 0.07, 0.36, -0.6, 0.16, 0, P.m("trim"), 14);
  ball(g, 0.07, -0.6, 0.6, 0, P.m("trim"), 14);
  const oar = cyl(g, 0.012, 0.012, 1.1, -0.45, 0.1, -0.12, P.m("wood"), 6);
  oar.rotation.z = 0.5;
  return { group: g, tick: () => {} };
}
