/**
 * The Fondaco (docs/plan-porcellana.md § 4): the prototype's arcaded palazzo — its podium, its
 * ground floor of arches on a dark core, its piano nobile of Venetian windows, its cornice and its
 * merli, its altana, its flag of accent waving.
 */
import { ConeGeometry, Group, Mesh, PlaneGeometry } from "three";
import type { Palette } from "../materials.js";
import { arcadeGeo, box, cached, cyl, dyn, faces, hipRoof, put, windows } from "../shapes.js";
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

export function fondaco(P: Palette): Built {
  const g = new Group();
  box(g, 4.6, 0.18, 4.6, 0, 0, 0, P.m("trim"), 0.05);
  const W = 3.9;
  const D = 3.5;
  const y0 = 0.18;
  const gf = 1.15;
  const up = 1.75;
  box(g, W - 0.34, gf, D - 0.34, 0, y0, 0, P.m("open"), 0.02);
  faces(g, 0, 0, W, D, (f, len, off) => {
    const n = Math.round(len / 0.72);
    put(f, arcadeGeo(len, gf, n, 0.46, 0.92, 0.16), P.m("wall"), 0, y0, off - 0.08);
  });
  box(g, W + 0.1, 0.1, D + 0.1, 0, y0 + gf, 0, P.m("trim"), 0.02);
  box(g, W, up, D, 0, y0 + gf + 0.1, 0, P.m("wall"), 0.04);
  windows(P, g, 0, 0, W, D, y0 + gf + 0.42, 2, 0.72, 0.22, 0.46, 0.5, true);
  box(g, W + 0.22, 0.13, D + 0.22, 0, y0 + gf + 0.1 + up, 0, P.m("trim"), 0.03);
  const top = y0 + gf + 0.23 + up;
  box(g, W - 0.1, 0.05, D - 0.1, 0, top, 0, P.m("roof"), 0.02);
  // The merli, Venice's crenellations.
  const merlo = cached("merlo", () => new ConeGeometry(0.11, 0.3, 4, 1));
  faces(g, 0, 0, W + 0.1, D + 0.1, (f, len, off) => {
    const n = Math.floor(len / 0.34);
    for (let i = 0; i < n; i++) {
      const me = put(f, merlo, P.m("trim", true), (i - (n - 1) / 2) * 0.34, top + 0.15, off - 0.06);
      me.rotation.y = Math.PI / 4;
    }
  });
  // The altana and the flag.
  box(g, 1.2, 0.5, 0.9, -0.9, top, -0.8, P.m("wall2"), 0.03);
  hipRoof(P, g, 1.2, 0.9, top + 0.5, 0.35, -0.9, -0.8);
  cyl(g, 0.03, 0.035, 2.0, 1.4, top, -1.1, P.ink, 12);
  const flag = banner(P, 0.95, 0.6);
  flag.mesh.position.set(1.4, top + 1.95, -1.1);
  g.add(flag.mesh);
  return { group: g, pin: [0, top + 2.4, 0], tick: (t) => flag.tick(t) };
}
