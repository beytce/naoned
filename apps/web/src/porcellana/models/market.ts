/**
 * The Market (D8, decision of the owner, 5 November 2026: « the market is a building, the same as
 * yours »): San Marco as in the prototype — its paved piazza, the campanile (its shaft and
 * pilasters, its belfry of arches, its spire and ball of accent), the basilica of five domes behind
 * its front of arches. Touched, it opens the Dogana.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { arcadeGeo, ball, box, cone, cyl, dome, faces, put } from "../shapes.js";
import type { Built } from "./model.js";

export function market(P: Palette): Built {
  const g = new Group();
  box(g, 5.6, 0.08, 5.6, 0, 0, 0, P.m("trim"), 0.2);
  for (let i = -4; i <= 4; i++) box(g, 0.03, 0.01, 5.2, i * 0.6, 0.08, 0, P.m("wall2"), 0.004);
  const cx = -1.7;
  const cz = -1.5;
  const y = 0.08;
  // The campanile.
  box(g, 1.6, 0.35, 1.6, cx, y, cz, P.m("trim"), 0.04);
  box(g, 1.2, 5.0, 1.2, cx, y + 0.35, cz, P.m("wall2"), 0.03);
  faces(g, cx, cz, 1.2, 1.2, (f, _len, off) => {
    for (const u of [-0.26, 0, 0.26]) box(f, 0.1, 4.9, 0.05, u, y + 0.4, off, P.m("wall"), 0.02);
  });
  const yb = y + 5.35;
  box(g, 1.42, 0.13, 1.42, cx, yb, cz, P.m("trim"), 0.03);
  box(g, 1.0, 1.05, 1.0, cx, yb + 0.13, cz, P.m("open"), 0.02);
  faces(g, cx, cz, 1.24, 1.24, (f, _len, off) =>
    put(f, arcadeGeo(1.24, 1.05, 4, 0.2, 0.82, 0.1), P.m("wall"), 0, yb + 0.13, off - 0.05),
  );
  box(g, 1.42, 0.13, 1.42, cx, yb + 1.18, cz, P.m("trim"), 0.03);
  box(g, 1.14, 0.7, 1.14, cx, yb + 1.31, cz, P.m("wall"), 0.03);
  const spire = cone(g, 0.82, 2.1, cx, yb + 2.01, cz, P.m("roof", true), 4);
  spire.rotation.y = Math.PI / 4;
  cyl(g, 0.02, 0.02, 0.35, cx, yb + 4.1, cz, P.ink, 8);
  ball(g, 0.11, cx, yb + 4.5, cz, P.accent, 20);
  // The basilica.
  const bx = 0.9;
  const bz = 0.1;
  const bw = 2.9;
  const bd = 3.3;
  const bh = 1.7;
  box(g, bw, bh, bd, bx, y, bz, P.m("wall"), 0.04);
  faces(
    g,
    bx,
    bz,
    bw,
    bd,
    (f, len, off) =>
      put(f, arcadeGeo(len, 1.15, 5, 0.36, 0.95, 0.1), P.m("trim"), 0, y, off + 0.04),
    [0, 1],
  );
  box(g, bw + 0.12, 0.1, bd + 0.12, bx, y + bh, bz, P.m("trim"), 0.02);
  const domes: [number, number, number][] = [
    [0, -0.95, 0.5],
    [0, 0.2, 0.62],
    [0, 1.25, 0.5],
    [-0.95, 0.2, 0.42],
    [0.95, 0.2, 0.42],
  ];
  for (const [dx, dz, rr] of domes) {
    const X = bx + dx;
    const Z = bz + dz;
    cyl(g, rr * 0.9, rr * 0.9, 0.3, X, y + bh + 0.1, Z, P.m("wall2"), 40);
    dome(g, rr, X, y + bh + 0.4, Z, P.m("wall"), 1.15);
    cyl(g, 0.06, 0.06, 0.22, X, y + bh + 0.4 + rr * 1.12, Z, P.m("wall2"), 12);
    ball(g, 0.07, X, y + bh + 0.7 + rr * 1.12, Z, P.m("trim"), 14);
  }
  return { group: g, pin: [cx, 10.2, cz] };
}
