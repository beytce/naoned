// Mock-up models: the island's workshops at the level of detail proposed.
import { M, THREE, ball, box, cone, cyl, dome, grp, pal, plate, planked, rod, torus } from "./kit.js";

const T = 6;

/* ---------- small parts ---------- */
export function legs(p, x, z, h, w = 0.9, along = "x") {
  for (const s of [-1, 1]) {
    const dx = along === "x" ? 0 : (s * w) / 2, dz = along === "x" ? (s * w) / 2 : 0;
    box(p, 0.13, h, 0.13, x + dx, 0, z + dz, M("celadon"), 0.03);
    box(p, 0.3, 0.07, 0.3, x + dx, 0, z + dz, M("ink"), 0.02);
  }
  if (along === "x") box(p, 0.08, 0.08, w, x, h * 0.45, z, M("celadon2"), 0.02);
  else box(p, w, 0.08, 0.08, x, h * 0.45, z, M("celadon2"), 0.02);
}
/** The slide: a slate bed between two cream rails with their rivets, on celadon trestles. */
export function slide(p, x1, z1, x2, z2, y = 0.85) {
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2);
  if (!alongX) g.rotation.y = Math.PI / 2;
  box(g, len, 0.12, 0.86, 0, y, 0, M("slate"), 0.03);
  for (let k = -len / 2 + 0.3; k < len / 2 - 0.1; k += 0.34) box(g, 0.035, 0.012, 0.8, k, y + 0.115, 0, M("ink"), 0.004);
  for (const s of [-1, 1]) {
    box(g, len + 0.1, 0.3, 0.15, 0, y - 0.04, s * 0.5, M("porcelain"), 0.05);
    let n = 0;
    for (let k = -len / 2 + 0.25; k < len / 2; k += 0.5) cyl(g, 0.035, 0.035, 0.02, k, y + 0.26, s * 0.5, M(n++ % 3 === 1 ? "brick" : "celadon2"), 10);
    box(g, len, 0.07, 0.07, 0, y - 0.3, s * 0.42, M("celadon"), 0.02);
  }
  const n = Math.max(2, Math.round(len / 2.2) + 1);
  for (let k = 0; k < n; k++) legs(g, -len / 2 + 0.35 + (k * (len - 0.7)) / (n - 1), 0, y - 0.05, 0.84);
  return g;
}
export function crate(p, x, y, z, s = 0.46) {
  const g = grp(p, x, y, z);
  box(g, s, s * 0.8, s, 0, 0, 0, M("wood"), 0.04);
  box(g, s + 0.012, s * 0.2, s + 0.012, 0, s * 0.3, 0, M("celadon"), 0.02);
  box(g, 0.14, 0.012, 0.09, 0, s * 0.8, 0, M("ink"), 0.004);
  return g;
}
export function logPiece(p, x, y, z, len = 1, r = 0.15, axis = "x") {
  rod(p, r, len, x, y + r, z, axis, M("wood2"), 14);
  rod(p, r * 0.8, len + 0.012, x, y + r, z, axis, M("wood"), 14);
}
export function tub(p, x, y, z) {
  cyl(p, 0.26, 0.21, 0.3, x, y, z, M("celadon2"), 18);
  torus(p, 0.26, 0.025, x, y + 0.3, z, M("celadon"));
  ball(p, 0.23, x, y + 0.29, z, M("sand"), 0.45);
}
export function bottle(p, x, y, z, s = 1) {
  cyl(p, 0.075 * s, 0.085 * s, 0.2 * s, x, y, z, M("glass"), 14);
  cyl(p, 0.03 * s, 0.06 * s, 0.12 * s, x, y + 0.2 * s, z, M("glass"), 12);
}
export function glassTray(p, x, y, z) {
  box(p, 0.5, 0.1, 0.5, x, y, z, M("wood"), 0.03);
  for (const [a, b] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) bottle(p, x + a, y + 0.1, z + b, 0.9);
}
export function fir(p, x, z, s = 1) {
  cyl(p, 0.1 * s, 0.13 * s, 0.6 * s, x, 0, z, M("wood2"), 10);
  cone(p, 0.75 * s, 1.1 * s, x, 0.45 * s, z, M("leaf"), 18);
  cone(p, 0.58 * s, 1.0 * s, x, 1.05 * s, z, M("leaf2"), 18);
  cone(p, 0.4 * s, 0.9 * s, x, 1.65 * s, z, M("leaf"), 18);
}
export function cypress(p, x, y, z, s = 1) {
  const m = ball(p, 0.3 * s, x, y + 0.75 * s, z, M("leaf"), 2.5);
  m.scale.x = m.scale.z = 1; cyl(p, 0.05 * s, 0.06 * s, 0.3 * s, x, y, z, M("wood2"), 8);
}
export function planter(p, x, z) {
  box(p, 1.1, 0.42, 1.1, x, 0, z, M("porcelain"), 0.1);
  box(p, 0.9, 0.05, 0.9, x, 0.4, z, M("wood2"), 0.02);
  cypress(p, x, 0.42, z, 1.15);
  ball(p, 0.22, x + 0.26, 0.5, z + 0.22, M("leaf2"), 0.8); ball(p, 0.18, x - 0.25, 0.48, z + 0.2, M("leaf2"), 0.8);
}
export function bollard(p, x, y, z) {
  cyl(p, 0.14, 0.17, 0.5, x, y, z, M("porcelain"), 16); cyl(p, 0.19, 0.19, 0.1, x, y + 0.46, z, M("celadon"), 16);
}
export function railing(p, x1, z1, x2, z2, y = 0) {
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  rod(p, 0.055, len, cx, y + 0.72, cz, alongX ? "x" : "z", M("celadon"));
  rod(p, 0.035, len, cx, y + 0.4, cz, alongX ? "x" : "z", M("celadon"));
  const n = Math.max(2, Math.round(len / 2.4) + 1);
  for (let k = 0; k < n; k++) {
    const t = -len / 2 + (k * len) / (n - 1);
    const x = alongX ? cx + t : cx, z = alongX ? cz : cz + t;
    cyl(p, 0.055, 0.055, 0.74, x, y, z, M("celadon"), 12); cyl(p, 0.11, 0.11, 0.06, x, y, z, M("celadon2"), 12);
  }
}

/* ---------- tiles ---------- */
export function slab(p, kind = "stone") {
  box(p, T - 0.07, 0.3, T - 0.07, 0, -0.3, 0, M(kind === "stone" ? "stone" : kind), 0.06);
  if (kind === "stone") {
    box(p, T - 0.2, 0.01, 0.035, 0, -0.004, 0, M("stone2"), 0.002).castShadow = false;
    box(p, 0.035, 0.01, T - 0.2, 0, -0.004, 0, M("stone2"), 0.002).castShadow = false;
  }
}
export function plot(p) {
  const w = T - 0.7; const m = M("plot", { transparent: true, opacity: 0.55 });
  const b = box(p, w, 0.08, w, 0, -0.3, 0, m, 0.03); b.castShadow = false;
  const n = 7, st = w / n;
  for (let k = 0; k < n; k++) for (const s of [-1, 1]) {
    const at = -w / 2 + st * (k + 0.5);
    box(p, st * 0.5, 0.04, 0.1, at, -0.22, (s * w) / 2, M("shade"), 0.01).castShadow = false;
    box(p, 0.1, 0.04, st * 0.5, (s * w) / 2, -0.22, at, M("shade"), 0.01).castShadow = false;
  }
}
export function meadow(p) {
  slab(p, "pre");
  for (let k = -2; k <= 2; k++) {
    box(p, 4.6, 0.09, 0.3, 0, 0, k * 0.95, M("leaf2"), 0.04);
    for (let j = -4; j <= 4; j++) ball(p, 0.11, j * 0.5, 0.12, k * 0.95, M("leaf"), 1.2);
  }
  box(p, 0.5, 0.36, 0.5, 2.3, 0, 2.3, M("wood"), 0.04);
}

/* ---------- the house ---------- */
function arch(p, x, y, z, w, h, face) {
  const m = M("shade"); const t = 0.06;
  if (face === "z") { box(p, w, h, t, x, y, z, m, 0.01); const c = rod(p, w / 2, t, x, y + h, z, "z", m, 20); c.castShadow = false; }
  else { box(p, t, h, w, x, y, z, m, 0.01); const c = rod(p, w / 2, t, x, y + h, z, "x", m, 20); c.castShadow = false; }
}
export function fondaco(p) {
  slab(p);
  const w = 4.4, d = 3.4;
  box(p, w + 0.5, 0.22, d + 0.5, 0, 0, -0.5, M("stone2"), 0.06);
  box(p, w, 1.5, d, 0, 0.22, -0.5, M("porcelain"), 0.06);
  box(p, w + 0.16, 0.14, d + 0.16, 0, 1.72, -0.5, M("trim"), 0.04);
  box(p, w, 1.3, d, 0, 1.86, -0.5, M("porcelain"), 0.06);
  box(p, w + 0.24, 0.16, d + 0.24, 0, 3.16, -0.5, M("trim"), 0.05);
  // hipped roof and its lantern
  const r = cone(p, 1, 1, 0, 3.32, -0.5, M("roof"), 4); r.rotation.y = Math.PI / 4; r.scale.set(w * 0.72, 0.9, d * 0.72);
  box(p, 0.5, 0.3, 0.5, 0, 4.05, -0.5, M("trim"), 0.05);
  for (let k = 0; k < 7; k++) { box(p, 0.22, 0.2, 0.12, -w / 2 + 0.3 + k * ((w - 0.6) / 6), 3.32, -0.5 + d / 2 + 0.03, M("trim"), 0.03); }
  for (let k = 0; k < 6; k++) { box(p, 0.12, 0.2, 0.22, w / 2 + 0.03, 3.32, -0.5 - d / 2 + 0.3 + k * ((d - 0.6) / 5), M("trim"), 0.03); }
  // the arcade on the water side (+z) and the side (+x)
  const fz = -0.5 + d / 2 + 0.005, fx = w / 2 + 0.005;
  for (let k = 0; k < 5; k++) {
    const x = -w / 2 + 0.52 + k * ((w - 1.04) / 4);
    arch(p, x, 0.26, fz, 0.52, 0.72, "z"); arch(p, x, 2.05, fz, 0.3, 0.55, "z");
    box(p, 0.4, 0.05, 0.1, x, 2.0, fz + 0.03, M("trim"), 0.02);
  }
  for (let k = 0; k < 4; k++) {
    const z = -0.5 - d / 2 + 0.5 + k * ((d - 1.0) / 3);
    arch(p, fx, 0.26, z, 0.5, 0.72, "x"); arch(p, fx, 2.05, z, 0.3, 0.55, "x");
    box(p, 0.1, 0.05, 0.4, fx + 0.03, 2.0, z, M("trim"), 0.02);
  }
  // the flag: red, yours
  cyl(p, 0.035, 0.035, 1.5, 0, 4.3, -0.5, M("ink"), 8);
  box(p, 0.72, 0.42, 0.03, 0.38, 5.3, -0.5, M("accent"), 0.01);
  // the quay in front: crates, a barrel, a hand cart
  crate(p, -1.9, 0, 2.2); crate(p, -1.35, 0, 2.3); crate(p, -1.62, 0.37, 2.24, 0.42);
  cyl(p, 0.22, 0.2, 0.5, 2.2, 0, 2.2, M("wood2"), 16); torus(p, 0.225, 0.02, 2.2, 0.15, 2.2, M("celadon2")); torus(p, 0.225, 0.02, 2.2, 0.38, 2.2, M("celadon2"));
  bollard(p, 0.4, 0, 2.6); bollard(p, -0.5, 0, 2.6);
}

/* ---------- the workshops ---------- */
export function lumberCamp(p) {
  slab(p, "foret");
  for (const [x, z, s] of [[-2.1, -2.1, 1.25], [-0.6, -2.3, 1.05], [0.9, -2.0, 1.3], [2.2, -2.3, 1.0], [-2.3, -0.5, 1.0], [2.3, -0.7, 0.85]]) fir(p, x, z, s);
  // stumps
  for (const [x, z] of [[-1.2, -0.9], [0.3, -1.1]]) { cyl(p, 0.2, 0.24, 0.18, x, 0, z, M("wood2"), 14); cyl(p, 0.15, 0.15, 0.012, x, 0.18, z, M("wood"), 14); }
  // the axe in its stump
  const ax = grp(p, 0.3, 0.18, -1.1); ax.rotation.z = -0.5;
  box(ax, 0.05, 0.6, 0.05, 0, 0, 0, M("wood"), 0.01); box(ax, 0.2, 0.14, 0.04, 0.07, 0.02, 0, M("slate"), 0.01);
  // the pile of logs, wedged
  const pile = grp(p, -1.5, 0, 1.2);
  box(pile, 0.1, 0.5, 0.1, -0.62, 0, 0.55, M("celadon"), 0.02); box(pile, 0.1, 0.5, 0.1, 0.62, 0, 0.55, M("celadon"), 0.02);
  box(pile, 0.1, 0.5, 0.1, -0.62, 0, -0.55, M("celadon"), 0.02); box(pile, 0.1, 0.5, 0.1, 0.62, 0, -0.55, M("celadon"), 0.02);
  for (let k = 0; k < 4; k++) logPiece(pile, -0.48 + k * 0.32, 0, 0, 1.3, 0.15, "z");
  for (let k = 0; k < 3; k++) logPiece(pile, -0.32 + k * 0.32, 0.27, 0, 1.3, 0.15, "z");
  for (let k = 0; k < 2; k++) logPiece(pile, -0.16 + k * 0.32, 0.54, 0, 1.3, 0.15, "z");
  // the sawbuck
  const sb = grp(p, 0.4, 0, 0.3);
  for (const s of [-0.4, 0.4]) for (const a of [-0.5, 0.5]) { const l = box(sb, 0.07, 0.75, 0.07, s, 0, 0, M("celadon"), 0.02); l.rotation.x = a; l.position.z = a * 0.1; }
  logPiece(sb, 0, 0.5, 0, 1.3, 0.14, "x");
}
export function sawmill(p) {
  slab(p);
  // the mill race at the back, and its wheel
  box(p, T - 0.07, 0.06, 1.3, 0, -0.02, -2.3, M("water"), 0.02);
  box(p, T - 0.07, 0.22, 0.14, 0, 0, -1.6, M("porcelain"), 0.04);
  const wh = grp(p, 1.0, 1.05, -2.3);
  torus(wh, 1.0, 0.07, 0, 0, -0.22, M("celadon"), "z"); torus(wh, 1.0, 0.07, 0, 0, 0.22, M("celadon"), "z");
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4; const s = grp(wh); s.rotation.z = a;
    box(s, 0.07, 1.0, 0.07, 0, 0, -0.22, M("celadon2"), 0.02); box(s, 0.07, 1.0, 0.07, 0, 0, 0.22, M("celadon2"), 0.02);
    box(s, 0.34, 0.05, 0.52, 0, 0.98, 0, M("wood"), 0.02);
  }
  rod(wh, 0.09, 1.3, 0, 0, 0.3, "z", M("ink"));
  for (const s of [-1, 1]) { box(p, 0.16, 1.1, 0.16, 1.0 + s * 0.0, 0, -1.6, M("porcelain"), 0.03); }
  // the shed: four posts, a pitched roof
  for (const [x, z] of [[-1.7, -1.3], [1.9, -1.3], [-1.7, 1.0], [1.9, 1.0]]) { box(p, 0.16, 2.1, 0.16, x, 0, z, M("wood"), 0.03); box(p, 0.3, 0.1, 0.3, x, 0, z, M("ink"), 0.02); }
  for (const z of [-1.3, 1.0]) box(p, 3.9, 0.12, 0.12, 0.1, 2.1, z, M("wood2"), 0.02);
  for (const s of [-1, 1]) {
    const r = grp(p, 0.1, 2.52, -0.15 + s * 0.68); r.rotation.x = s * 0.52;
    box(r, 4.3, 0.12, 1.62, 0, 0, 0, M("roof"), 0.04);
    for (let k = -3; k <= 3; k++) box(r, 0.05, 0.03, 1.6, k * 0.6, 0.12, 0, M("trim"), 0.01);
  }
  box(p, 4.3, 0.1, 0.16, 0.1, 2.9, -0.15, M("trim"), 0.04);
  // the saw frame
  box(p, 0.14, 1.5, 0.14, 0.1, 0, -0.75, M("celadon"), 0.03); box(p, 0.14, 1.5, 0.14, 0.1, 0, 0.45, M("celadon"), 0.03);
  box(p, 0.18, 0.14, 1.4, 0.1, 1.5, -0.15, M("celadon2"), 0.03);
  box(p, 0.03, 1.0, 0.4, 0.1, 0.6, -0.15, M("slate"), 0.005);
  rod(p, 0.05, 1.2, 0.1, 1.0, -1.0, "z", M("ink"));
  // the bed through the saw, a log going in, planks coming out
  slide(p, -2.9, -0.15, 2.3, -0.15, 0.7);
  logPiece(p, -1.6, 0.82, -0.15, 1.3, 0.16, "x");
  for (const z of [-0.3, -0.15, 0.0]) box(p, 1.1, 0.05, 0.13, 1.2, 0.83, z, M("wood"), 0.01);
  // the stack of planks, a trestle, sawdust
  const st = grp(p, 1.6, 0, 2.0);
  box(st, 0.12, 0.1, 1.0, -0.5, 0, 0, M("ink"), 0.02); box(st, 0.12, 0.1, 1.0, 0.5, 0, 0, M("ink"), 0.02);
  for (let l = 0; l < 5; l++) for (let k = 0; k < 4; k++) box(st, 1.6, 0.07, 0.2, (l % 2) * 0.05, 0.1 + l * 0.08, -0.36 + k * 0.24, M(l % 2 ? "wood" : "wood2"), 0.01);
  ball(p, 0.3, -0.6, 0, 1.9, M("sand"), 0.4); ball(p, 0.2, -0.25, 0, 2.15, M("sand"), 0.4);
  crate(p, -2.2, 0, 2.2);
}
export function sandPit(p) {
  slab(p, "sand");
  // the pit: a rim, the sand heaped
  const rim = M("porcelain");
  box(p, 3.6, 0.3, 0.2, -0.8, 0, -2.5, rim, 0.05); box(p, 3.6, 0.3, 0.2, -0.8, 0, 0.3, rim, 0.05);
  box(p, 0.2, 0.3, 3.0, -2.6, 0, -1.1, rim, 0.05); box(p, 0.2, 0.3, 3.0, 1.0, 0, -1.1, rim, 0.05);
  for (const [x, z, r] of [[-1.6, -1.5, 0.95], [-0.2, -1.0, 0.8], [-1.1, -0.4, 0.6], [0.3, -1.9, 0.5]]) ball(p, r, x, 0.05, z, M("sand"), 0.55);
  // the crane: a post, a jib, a rope and its bucket
  box(p, 0.5, 0.14, 0.5, 2.0, 0, -2.2, M("ink"), 0.03);
  box(p, 0.18, 2.6, 0.18, 2.0, 0.1, -2.2, M("celadon"), 0.04);
  const jib = grp(p, 2.0, 2.6, -2.2); jib.rotation.y = 0.5;
  box(jib, 2.6, 0.14, 0.14, -0.9, 0, 0, M("celadon"), 0.03); box(jib, 0.3, 0.3, 0.3, 0.45, -0.1, 0, M("celadon2"), 0.05);
  cyl(jib, 0.012, 0.012, 1.3, -2.0, -1.3, 0, M("ink"), 6);
  cyl(jib, 0.2, 0.15, 0.26, -2.0, -1.55, 0, M("celadon2"), 14); ball(jib, 0.18, -2.0, -1.3, 0, M("sand"), 0.5);
  const br = box(p, 0.08, 1.5, 0.08, 2.0, 0.9, -2.2, M("celadon2"), 0.02); br.rotation.z = 0.6; br.position.x = 1.6;
  // the sieve
  const sv = grp(p, -1.9, 0, 1.7); sv.rotation.z = -0.5;
  box(sv, 0.9, 0.06, 1.1, 0, 0.5, 0, M("wood"), 0.02); box(sv, 0.74, 0.07, 0.94, 0, 0.5, 0, M("shade"), 0.01);
  box(p, 0.08, 0.75, 0.08, -1.5, 0, 1.25, M("wood2"), 0.02); box(p, 0.08, 0.75, 0.08, -1.5, 0, 2.15, M("wood2"), 0.02);
  ball(p, 0.4, -2.3, 0, 1.7, M("sand"), 0.45);
  // tubs filled, waiting
  tub(p, 0.4, 0, 2.3); tub(p, 1.05, 0, 2.3); tub(p, 0.72, 0, 1.75);
  // a wheelbarrow
  const wb = grp(p, 2.2, 0, 0.2); wb.rotation.y = 0.4;
  box(wb, 0.7, 0.26, 0.5, 0, 0.2, 0, M("wood"), 0.05); ball(wb, 0.24, 0, 0.44, 0, M("sand"), 0.5);
  rod(wb, 0.16, 0.08, -0.45, 0.16, 0, "z", M("ink")); box(wb, 0.6, 0.04, 0.04, 0.6, 0.36, 0.2, M("wood2"), 0.01); box(wb, 0.6, 0.04, 0.04, 0.6, 0.36, -0.2, M("wood2"), 0.01);
}
export function glassworks(p) {
  slab(p);
  // the furnace: a brick base, banded, a dome, its mouth alight, a chimney
  const f = grp(p, -0.3, 0, -1.2);
  cyl(f, 1.3, 1.36, 0.9, 0, 0, 0, M("brick"), 36);
  torus(f, 1.33, 0.05, 0, 0.9, 0, M("celadon")); torus(f, 1.36, 0.045, 0, 0.25, 0, M("celadon"));
  dome(f, 1.26, 0, 0.92, 0, M("brick"));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; cyl(f, 0.04, 0.04, 0.03, Math.cos(a) * 1.36, 0.56, Math.sin(a) * 1.36, M("celadon2"), 8).rotation.z = 0; }
  cyl(f, 0.3, 0.36, 0.9, -0.3, 1.85, -0.3, M("porcelain"), 20); cyl(f, 0.38, 0.38, 0.1, -0.3, 2.72, -0.3, M("celadon"), 20); cyl(f, 0.22, 0.22, 0.04, -0.3, 2.82, -0.3, M("ink"), 20);
  for (const a of [Math.PI / 2, 0]) {
    const m = grp(f); m.rotation.y = a - Math.PI / 2;
    box(m, 0.72, 0.5, 0.2, 0, 0.42, 1.24, M("porcelain"), 0.04); rod(m, 0.36, 0.2, 0, 0.92, 1.24, "z", M("porcelain"), 24);
    box(m, 0.5, 0.42, 0.06, 0, 0.5, 1.33, M("ink"), 0.01); rod(m, 0.25, 0.06, 0, 0.92, 1.33, "z", M("ink"), 20);
    box(m, 0.36, 0.2, 0.05, 0, 0.5, 1.35, M("fire", { emissive: pal().fire, emissiveIntensity: 0.55 }), 0.02);
    box(m, 0.9, 0.08, 0.36, 0, 0.36, 1.4, M("trim"), 0.02);
  }
  // the hopper where the sand comes in
  const h = grp(p, -2.3, 0, 0.3);
  for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(h, 0.1, 1.3, 0.1, x, 0, z, M("celadon"), 0.02);
  const fn = cyl(h, 0.55, 0.18, 0.6, 0, 0.95, 0, M("celadon2"), 4); fn.rotation.y = Math.PI / 4;
  box(h, 0.92, 0.1, 0.92, 0, 1.5, 0, M("celadon"), 0.03); ball(h, 0.36, 0, 1.55, 0, M("sand"), 0.5);
  // the bench: blowpipes, pieces cooling
  const b = grp(p, 1.75, 0, -0.9);
  box(b, 1.1, 0.1, 2.0, 0, 0.8, 0, M("wood"), 0.03);
  for (const [x, z] of [[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]]) { box(b, 0.1, 0.8, 0.1, x, 0, z, M("celadon"), 0.02); box(b, 0.22, 0.06, 0.22, x, 0, z, M("ink"), 0.02); }
  box(b, 0.9, 0.06, 1.8, 0, 0.3, 0, M("celadon2"), 0.02);
  for (let k = 0; k < 4; k++) bottle(b, -0.2 + (k % 2) * 0.35, 0.9, -0.7 + k * 0.3, 1.1);
  cyl(b, 0.16, 0.1, 0.2, 0.15, 0.9, 0.65, M("glass"), 16);
  rod(b, 0.02, 1.5, -0.3, 0.94, 0.2, "z", M("ink"), 6); ball(b, 0.08, -0.3, 0.94, -0.55, M("fire"), 1);
  crate(b, 0, 0.36, -0.4, 0.4); crate(b, 0.05, 0.36, 0.3, 0.4);
  // the rack of finished glass
  const r = grp(p, 2.35, 0, 1.2);
  box(r, 0.1, 1.5, 0.1, 0, 0, -0.5, M("celadon"), 0.02); box(r, 0.1, 1.5, 0.1, 0, 0, 0.5, M("celadon"), 0.02);
  for (let l = 0; l < 3; l++) { box(r, 0.36, 0.05, 1.1, 0, 0.3 + l * 0.48, 0, M("wood"), 0.01); for (let k = 0; k < 4; k++) bottle(r, 0, 0.35 + l * 0.48, -0.38 + k * 0.25, 0.9); }
  // wood for the fire, a bucket
  for (let k = 0; k < 3; k++) logPiece(p, -2.2, 0, -2.4 + k * 0.3, 0.8, 0.13, "x");
  for (let k = 0; k < 2; k++) logPiece(p, -2.2, 0.24, -2.25 + k * 0.3, 0.8, 0.13, "x");
  cyl(p, 0.18, 0.15, 0.26, 0.9, 0, 0.6, M("celadon2"), 14); cyl(p, 0.15, 0.15, 0.01, 0.9, 0.24, 0.6, M("water"), 14);
}
export function quay(p) {
  slab(p, "rive");
  box(p, 2.2, 0.08, T - 0.07, 1.9, -0.04, 0, M("water"), 0.03);
  box(p, 0.24, 0.3, T - 0.07, 0.72, -0.1, 0, M("porcelain"), 0.05);
  // the pier, planked
  box(p, 2.0, 0.14, 1.3, 1.7, 0, 1.2, M("wood"), 0.03);
  for (let k = 0; k < 5; k++) box(p, 0.03, 0.012, 1.26, 0.9 + k * 0.4, 0.14, 1.2, M("wood2"), 0.004);
  for (const [x, z] of [[0.9, 0.6], [2.5, 0.6], [0.9, 1.8], [2.5, 1.8]]) cyl(p, 0.09, 0.09, 0.5, x, -0.3, z, M("wood2"), 10);
  bollard(p, 0.3, 0, -2.3); bollard(p, 0.3, 0, 2.5);
  crate(p, -0.6, 0, 2.2); crate(p, -1.15, 0, 2.3); crate(p, -0.85, 0.37, 2.25, 0.42);
  glassTray(p, 1.3, 0.14, 1.0); glassTray(p, 1.9, 0.14, 1.35);
  // the barge, its red pennant: the thread starts here
  boat(p, 2.3, -0.1, -1.1, Math.PI / 2, true);
}
export function boat(p, x, y, z, rot = 0, mine = false, s = 1) {
  const g = grp(p, x, y, z); g.rotation.y = rot; g.scale.setScalar(s);
  const sh = new THREE.Shape(); sh.moveTo(-1.2, 0); sh.quadraticCurveTo(-0.6, 0.48, 0.5, 0.42); sh.quadraticCurveTo(1.2, 0.3, 1.5, 0);
  sh.quadraticCurveTo(1.2, -0.3, 0.5, -0.42); sh.quadraticCurveTo(-0.6, -0.48, -1.2, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.26, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }); geo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(geo, M("porcelain")); hull.castShadow = hull.receiveShadow = true; hull.position.y = 0.05; g.add(hull);
  box(g, 1.5, 0.05, 0.6, 0.05, 0.33, 0, M("wood"), 0.02);
  crate(g, -0.2, 0.38, 0, 0.36); crate(g, 0.3, 0.38, 0.05, 0.36);
  cyl(g, 0.03, 0.03, 1.3, 0.75, 0.36, 0, M("ink"), 8);
  box(g, 0.5, 0.28, 0.025, 1.02, 1.36, 0, M(mine ? "accent" : "ink"), 0.01);
  return g;
}

/* ---------- the island's plate ---------- */
export function platform(p, w, d, inner) {
  const P = pal();
  plate(p, w - 1.2, d - 1.2, 3.2, 0.5, -3.3, M("stone2"), 0.1);
  plate(p, w - 0.5, d - 0.5, 3.4, 1.9, -2.85, M("porcelain"), 0.22);
  plate(p, w, d, 3.6, 0.6, -0.92, M("wood"), 0.14);
  planked(p, w - 0.3, d - 0.3, 3.45, -0.318, P.wood, P.wood2 === P.wood ? P.wood : mix(P.wood, P.wood2, 0.35), mix(P.wood2, "#000000", 0.08));
  // the bed of the tiles
  box(p, inner + 0.3, 0.06, inner + 0.3, 0, -0.33, 0, M("stone2"), 0.02).castShadow = false;
  // grilles in the hull, as on a quay
  for (const face of ["z", "x"]) for (let k = -2; k <= 2; k++) {
    const at = k * (w / 5.6); const g = grp(p, face === "z" ? at : w / 2 - 0.27, -2.2, face === "z" ? d / 2 - 0.27 : at);
    if (face === "x") g.rotation.y = Math.PI / 2;
    box(g, 1.7, 0.6, 0.06, 0, 0, 0.02, M("celadon2"), 0.05);
    for (let j = -3; j <= 3; j++) box(g, 0.1, 0.42, 0.04, j * 0.22, 0.09, 0.06, M("ink"), 0.015);
  }
}
function mix(a, b, t) { return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`; }
