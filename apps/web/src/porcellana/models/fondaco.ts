/**
 * The Fondaco (docs/plan-porcellana.md § 4): the prototype's arcaded palazzo — its podium, its
 * ground floor of arches on a dark core, its piano nobile of Venetian windows, its cornice and its
 * merli, its altana, its flag of accent waving.
 *
 * It grows with its level (docs/plan-carte-vivante.md, lot 2; the plan of 5 November promised it:
 * « each Casa adds an element »): the palazzo validated is the first level's, and each level after
 * adds one thing one can name — goods in its yard, a storey, a tower, a loggia, a roof garden, a
 * cupola… — up to its crown at the twentieth. What it adds is told by `fondacoStage`, pure.
 */
import { BoxGeometry, ConeGeometry, Group, Mesh, PlaneGeometry } from "three";
import type { Palette } from "../materials.js";
import {
  arcadeGeo,
  ball,
  box,
  cached,
  cone,
  crate,
  cyl,
  dome,
  dyn,
  faces,
  hipRoof,
  put,
  windows,
} from "../shapes.js";
import type { Built } from "./model.js";

/** A banner of cloth, its hoist at the origin, waving along its fly. */
export function banner(
  P: Palette,
  w: number,
  h: number,
): { mesh: Mesh; tick: (t: number) => void } {
  const geo = new PlaneGeometry(w, h, 14, 4);
  geo.translate(w / 2, -h / 2, 0);
  const pos = geo.getAttribute("position");
  const base = Float32Array.from(pos.array);
  const mesh = dyn(new Mesh(geo, P.accentCloth));
  mesh.castShadow = true;
  return {
    mesh,
    tick(t) {
      const a = pos.array as Float32Array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i] as number;
        a[i + 2] = Math.sin(x * 5 - t * 4.2) * 0.07 * (x / w) * 1.6;
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

/** The Fondaco's top level (CADRAGE-v3 § 3.1). */
export const FONDACO_LEVELS = 20;

/**
 * What the Fondaco shows at a level: every level from the second adds one thing to the one before
 * (test/porcellana.test.ts holds it).
 */
export function fondacoStage(level: number) {
  const L = Math.min(FONDACO_LEVELS, Math.max(1, Math.floor(level)));
  return {
    level: L,
    /** Goods in its yard, an awning over its door: 0, then 1, then a hoist and more crates. */
    yard: L >= 13 ? 2 : L >= 2 ? 1 : 0,
    /** The rows of windows of its upper floors: a storey more at 3, 8 and 14. */
    rows: L >= 14 ? 5 : L >= 8 ? 4 : L >= 3 ? 3 : 2,
    /** Its tower at the north-east corner: a turret, then its belfry, then its spire. */
    tower: L >= 15 ? 3 : L >= 9 ? 2 : L >= 4 ? 1 : 0,
    /** A second flag at the south-west corner. */
    flag2: L >= 5,
    /** A loggia before its piano nobile. */
    loggia: L >= 6,
    /** Trees in pots on its roof; then a pergola over them. */
    garden: L >= 18 ? 2 : L >= 7 ? 1 : 0,
    /** Figures at the corners of its cornice. */
    statues: L >= 10,
    /** A cupola on its roof. */
    cupola: L >= 11,
    /** Cloths of accent hung between its windows. */
    hangings: L >= 12,
    /** A great door under a pediment. */
    portal: L >= 16,
    /** A second, smaller tower at the north-west corner. */
    tower2: L >= 17,
    /** Its flag, greater. */
    greatFlag: L >= 19,
    /** Its crown: finials of accent on every top. */
    crown: L >= 20,
  };
}

export type FondacoStage = ReturnType<typeof fondacoStage>;

/** A square tower on the roof: its shaft, a belfry of arches, a pyramid or a spire. Its top's y. */
function tower(
  P: Palette,
  g: Group,
  x: number,
  z: number,
  y: number,
  side: number,
  shaft: number,
  belfry: boolean,
  spire: boolean,
): number {
  box(g, side, shaft, side, x, y, z, P.m("wall2"), 0.03);
  let top = y + shaft;
  box(g, side + 0.14, 0.08, side + 0.14, x, top, z, P.m("trim"), 0.02);
  top += 0.08;
  if (belfry) {
    box(g, side - 0.16, 0.6, side - 0.16, x, top, z, P.m("open"), 0.02);
    faces(g, x, z, side, side, (f, _len, off) =>
      put(f, arcadeGeo(side, 0.6, 2, 0.22, 0.5, 0.07), P.m("wall"), 0, top, off - 0.035),
    );
    box(g, side + 0.14, 0.08, side + 0.14, x, top + 0.6, z, P.m("trim"), 0.02);
    top += 0.68;
  }
  const h = spire ? 1.3 : 0.55;
  const roof = cone(g, side * 0.74, h, x, top, z, P.m("roof", true), 4);
  roof.rotation.y = Math.PI / 4;
  return top + h;
}

export function fondaco(P: Palette, level = 1): Built {
  const st = fondacoStage(level);
  const g = new Group();
  box(g, 4.6, 0.18, 4.6, 0, 0, 0, P.m("trim"), 0.05);
  const W = 3.9;
  const D = 3.5;
  const y0 = 0.18;
  const gf = 1.15;
  const rowH = 0.72;
  const up = 1.75 + (st.rows - 2) * rowH;
  box(g, W - 0.34, gf, D - 0.34, 0, y0, 0, P.m("open"), 0.02);
  faces(g, 0, 0, W, D, (f, len, off) => {
    const n = Math.round(len / 0.72);
    put(f, arcadeGeo(len, gf, n, 0.46, 0.92, 0.16), P.m("wall"), 0, y0, off - 0.08);
  });
  box(g, W + 0.1, 0.1, D + 0.1, 0, y0 + gf, 0, P.m("trim"), 0.02);
  box(g, W, up, D, 0, y0 + gf + 0.1, 0, P.m("wall"), 0.04);
  windows(P, g, 0, 0, W, D, y0 + gf + 0.42, st.rows, rowH, 0.22, 0.46, 0.5, true);
  // A string course under the last storey, once there are three.
  if (st.rows >= 3)
    box(g, W + 0.06, 0.05, D + 0.06, 0, y0 + gf + 0.3 + (st.rows - 1) * rowH, 0, P.m("trim"), 0.01);
  box(g, W + 0.22, 0.13, D + 0.22, 0, y0 + gf + 0.1 + up, 0, P.m("trim"), 0.03);
  const top = y0 + gf + 0.23 + up;
  box(g, W - 0.1, 0.05, D - 0.1, 0, top, 0, P.m("roof"), 0.02);
  // The merli, Venice's crenellations; taller under the crown.
  const merlo = cached(st.crown ? "merlo-crown" : "merlo", () =>
    st.crown ? new ConeGeometry(0.12, 0.42, 4, 1) : new ConeGeometry(0.11, 0.3, 4, 1),
  );
  faces(g, 0, 0, W + 0.1, D + 0.1, (f, len, off) => {
    const n = Math.floor(len / 0.34);
    for (let i = 0; i < n; i++) {
      const me = put(
        f,
        merlo,
        P.m("trim", true),
        (i - (n - 1) / 2) * 0.34,
        top + (st.crown ? 0.21 : 0.15),
        off - 0.06,
      );
      me.rotation.y = Math.PI / 4;
    }
  });

  let high = top;
  const ticks: ((t: number) => void)[] = [];
  const finial = (x: number, y: number, z: number, r = 0.09) =>
    ball(g, r, x, y + r, z, st.crown ? P.accent : P.m("trim"), 16);

  // The altana: where the prototype has it, then by the south-west corner once the cupola comes.
  const [ax, az] = st.cupola ? [-1.2, 1.0] : [-0.9, -0.8];
  box(g, 1.2, 0.5, 0.9, ax, top, az, P.m("wall2"), 0.03);
  hipRoof(P, g, 1.2, 0.9, top + 0.5, 0.35, ax, az);
  high = Math.max(high, top + 0.85);

  // The tower at the north-east corner; the flag stands on it once it is there.
  let poleFoot = top;
  let poleX = 1.4;
  let poleZ = -1.1;
  if (st.tower > 0) {
    poleX = 1.42;
    poleZ = -1.22;
    const shaft = st.tower === 1 ? 0.9 : st.tower === 2 ? 1.25 : 1.7;
    poleFoot = tower(P, g, poleX, poleZ, top, 0.95, shaft, st.tower >= 2, st.tower >= 3) - 0.12;
    high = Math.max(high, poleFoot);
  }
  const flagScale = st.greatFlag ? 1.5 : 1;
  const poleH = st.tower >= 3 ? 1.3 : 2.0;
  cyl(g, 0.03, 0.035, poleH * (st.greatFlag ? 1.15 : 1), poleX, poleFoot, poleZ, P.ink, 12);
  const flag = banner(P, 0.95 * flagScale, 0.6 * flagScale);
  const flagTop = poleFoot + poleH * (st.greatFlag ? 1.15 : 1) - 0.05;
  flag.mesh.position.set(poleX, flagTop, poleZ);
  g.add(flag.mesh);
  ticks.push(flag.tick);
  high = Math.max(high, flagTop);
  if (st.crown) finial(poleX, flagTop + 0.02, poleZ, 0.07);

  if (st.tower2) {
    const t2 = tower(P, g, -1.45, -1.25, top, 0.8, 0.8, true, false);
    finial(-1.45, t2 - 0.04, -1.25, 0.07);
    high = Math.max(high, t2 + 0.14);
  }

  if (st.flag2) {
    cyl(g, 0.025, 0.03, 1.3, -1.75, top, 1.52, P.ink, 10);
    const second = banner(P, 0.6, 0.4);
    second.mesh.position.set(-1.75, top + 1.27, 1.52);
    g.add(second.mesh);
    ticks.push((t) => second.tick(t + 1.3));
  }

  if (st.cupola) {
    const drum = cyl(g, 0.56, 0.56, 0.42, 0, top, 0, P.m("wall2", true), 8);
    drum.rotation.y = Math.PI / 8;
    cyl(g, 0.62, 0.62, 0.06, 0, top + 0.42, 0, P.m("trim"), 24);
    dome(g, 0.58, 0, top + 0.48, 0, P.m("wall"), 1.1);
    cyl(g, 0.09, 0.09, 0.2, 0, top + 1.1, 0, P.m("wall2"), 12);
    finial(0, top + 1.3, 0, 0.08);
    high = Math.max(high, top + 1.46);
  }

  if (st.garden > 0) {
    // Trees in pots on the roof's south-east quarter, as on the altane of Venice.
    for (const [x, z, s] of [
      [0.85, 1.2, 0.5],
      [1.45, 1.2, 0.42],
      [1.5, 0.55, 0.46],
    ] as const) {
      cyl(g, 0.13, 0.1, 0.16, x, top, z, P.m("wall2"), 14);
      const leaf = ball(g, 0.2 * (s / 0.42), x, top + 0.16 + 0.42 * s * 2, z, P.m("leaf"), 16);
      leaf.scale.set(1, 1.9, 1);
    }
    if (st.garden > 1) {
      for (const [x, z] of [
        [0.55, 0.3],
        [1.75, 0.3],
        [0.55, 1.5],
        [1.75, 1.5],
      ] as const)
        box(g, 0.06, 0.95, 0.06, x, top, z, P.m("wood"), 0.015);
      for (const z of [0.3, 0.7, 1.1, 1.5])
        box(g, 1.36, 0.05, 0.05, 1.15, top + 0.95, z, P.m("wood"), 0.012);
      for (const x of [0.55, 1.75]) box(g, 0.05, 0.05, 1.32, x, top + 0.9, 0.9, P.m("wood"), 0.012);
    }
    high = Math.max(high, top + 1.05);
  }

  if (st.statues)
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const) {
      // The corner the tower stands on keeps none.
      if ((st.tower > 0 && sx === 1 && sz === -1) || (st.tower2 && sx === -1 && sz === -1))
        continue;
      const x = (sx * (W + 0.16)) / 2;
      const z = (sz * (D + 0.16)) / 2;
      cyl(g, 0.1, 0.12, 0.14, x, top, z, P.m("trim"), 4);
      cyl(g, 0.045, 0.075, 0.3, x, top + 0.14, z, P.m("trim"), 12);
      finial(x, top + 0.42, z, 0.055);
    }

  // On its fronts (the south and the east, those the board shows first).
  if (st.loggia) {
    const ly = y0 + gf + 0.36;
    faces(
      g,
      0,
      0,
      W,
      D,
      (f, _len, off) => {
        box(f, 1.7, 0.07, 0.36, 0, ly - 0.07, off + 0.17, P.m("trim"), 0.02);
        put(f, arcadeGeo(1.7, 0.3, 7, 0.14, 0.24, 0.04), P.m("trim"), 0, ly, off + 0.32);
        for (const u of [-0.7, 0.7])
          box(f, 0.1, 0.22, 0.26, u, ly - 0.29, off + 0.12, P.m("wall2"), 0.02);
      },
      [0],
    );
  }
  if (st.hangings) {
    const cloth = cached("fondaco-hanging", () => new BoxGeometry(0.24, 0.72, 0.02));
    faces(
      g,
      0,
      0,
      W,
      D,
      (f, len, off) => {
        for (const u of [-len / 2 + 0.34, len / 2 - 0.34]) {
          const c = put(f, cloth, P.accentCloth, u, y0 + gf + 0.1 + up - 0.52, off + 0.03);
          c.castShadow = false;
        }
      },
      [0, 1],
    );
  }
  if (st.portal) {
    faces(
      g,
      0,
      0,
      W,
      D,
      (f, _len, off) => {
        for (const u of [-0.42, 0.42]) cyl(f, 0.07, 0.08, 1.2, u, y0, off + 0.12, P.m("trim"), 14);
        box(f, 1.1, 0.1, 0.3, 0, y0 + 1.2, off + 0.1, P.m("trim"), 0.02);
        const ped = cone(f, 0.62, 0.3, 0, y0 + 1.3, off + 0.1, P.m("trim", true), 4);
        ped.rotation.y = Math.PI / 4;
        ped.scale.set(1, 1, 0.32);
      },
      [1],
    );
  }
  if (st.yard > 0) {
    // Goods in the yard before its south front, an awning of accent over the door.
    crate(g, -1.55, y0, 2.02, P.m("wood"), 0.3, 0.2);
    crate(g, -1.2, y0, 2.06, P.accent, 0.26);
    cyl(g, 0.13, 0.13, 0.3, -0.82, y0, 2.05, P.m("wood"), 14);
    const awning = box(g, 1.5, 0.035, 0.46, 0, y0 + gf - 0.06, D / 2 + 0.26, P.accent, 0.01);
    awning.rotation.x = 0.32;
    awning.castShadow = false;
    if (st.yard > 1) {
      crate(g, -1.5, y0 + 0.3, 2.02, P.m("trim"), 0.26, 0.5);
      crate(g, 1.1, y0, 2.05, P.m("wood"), 0.32, 0.1);
      crate(g, 1.5, y0, 2.02, P.accent, 0.28, 0.35);
      cyl(g, 0.13, 0.13, 0.3, 1.86, y0, 2.02, P.m("wood"), 14);
      // The hoist on the east front: a beam out of the wall, a crate hanging.
      box(g, 0.7, 0.07, 0.07, W / 2 + 0.3, y0 + gf + 0.1 + up - 0.25, 0.9, P.m("wood"), 0.015);
      cyl(g, 0.012, 0.012, 0.9, W / 2 + 0.58, y0 + gf + up - 1.05, 0.9, P.ink, 6);
      crate(g, W / 2 + 0.58, y0 + gf + up - 1.33, 0.9, P.accent, 0.28);
    }
  }

  return {
    group: g,
    pin: [0, Math.max(top + 2.4, high + 0.5), 0],
    tick: (t) => {
      for (const f of ticks) f(t);
    },
  };
}
