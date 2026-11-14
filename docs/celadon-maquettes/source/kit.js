// Mock-up kit: palettes and primitives (a study, not game code).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const PALS = {
  // A — « Céladon » : porcelain, blond wood, celadon green, slate.
  a: {
    bg: "#CBD8DC", water: "#C3D6DA", waterDeep: "#7D9CA6",
    stone: "#EDEBE5", stone2: "#DAD8D0", porcelain: "#F5F2EC", trim: "#FDFCF9", roof: "#E4D9C8",
    wood: "#EBD3A7", wood2: "#D9BB88", celadon: "#A9CBC0", celadon2: "#7BA79A", slate: "#55656A",
    ink: "#2E4842", shade: "#9FA9A4", sand: "#F0DFB6", brick: "#E6C2AC", glass: "#BFE3D8",
    fire: "#F2A548", leaf: "#8DB79F", leaf2: "#A6C9B1", accent: "#C23B2E", accent2: "#F3B8AE",
    pre: "#D3E2C8", foret: "#C9DAC3", argile: "#E9C6B2", rive: "#DCE8E6", plot: "#E3E0D6",
  },
  // B — « Porcelaine rehaussée » : today's near monochrome, the same detail.
  b: {
    bg: "#E9E6E0", water: "#C9D3D6", waterDeep: "#8B9497",
    stone: "#EEEBE5", stone2: "#DCD7CE", porcelain: "#F6F4F0", trim: "#FCFBF9", roof: "#E0D8CB",
    wood: "#E3DACB", wood2: "#D3C9BA", celadon: "#ECE7DF", celadon2: "#D3D0CB", slate: "#AFA699",
    ink: "#6E675E", shade: "#AFA699", sand: "#F2EEE6", brick: "#E6E0D6", glass: "#F4F2ED",
    fire: "#DDD3C2", leaf: "#E9E5DC", leaf2: "#F1EEE8", accent: "#C23B2E", accent2: "#F3B8AE",
    pre: "#DCE3D0", foret: "#DEDACB", argile: "#E6C3B2", rive: "#E6ECEB", plot: "#E6E2DA",
  },
};

let P = PALS.a;
const mats = new Map();
export function setPal(k) { P = PALS[k] ?? PALS.a; mats.clear(); return P; }
export const pal = () => P;
export function M(name, o = {}) {
  const key = name + JSON.stringify(o);
  let m = mats.get(key);
  if (!m) {
    const rough = name === "water" ? 0.35 : name === "glass" ? 0.3 : name === "accent" ? 0.62 : 0.86;
    m = new THREE.MeshStandardMaterial({ color: P[name], roughness: rough, ...o });
    mats.set(key, m);
  }
  return m;
}

const geos = new Map();
const G = (k, f) => { let g = geos.get(k); if (!g) { g = f(); geos.set(k, g); } return g; };
export function put(p, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
}
/** Rounded box, foot at y. */
export function box(p, w, h, d, x, y, z, mat, r = 0.05) {
  const rr = Math.max(0.004, Math.min(r, w / 2 - 0.003, h / 2 - 0.003, d / 2 - 0.003));
  return put(p, G(`b${w}|${h}|${d}|${rr}`, () => new RoundedBoxGeometry(w, h, d, 3, rr)), mat, x, y + h / 2, z);
}
/** Cylinder, foot at y. */
export function cyl(p, rt, rb, h, x, y, z, mat, seg = 28) {
  return put(p, G(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat, x, y + h / 2, z);
}
/** Rod along an axis, centred. */
export function rod(p, r, len, x, y, z, axis, mat, seg = 16) {
  const m = put(p, G(`c${r}|${r}|${len}|${seg}`, () => new THREE.CylinderGeometry(r, r, len, seg)), mat, x, y, z);
  if (axis === "x") m.rotation.z = Math.PI / 2; else if (axis === "z") m.rotation.x = Math.PI / 2;
  return m;
}
export function ball(p, r, x, y, z, mat, sy = 1) {
  const m = put(p, G(`s${r}`, () => new THREE.SphereGeometry(r, 28, 18)), mat, x, y, z);
  m.scale.y = sy; return m;
}
export function dome(p, r, x, y, z, mat) {
  return put(p, G(`d${r}`, () => new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), mat, x, y, z);
}
export function cone(p, r, h, x, y, z, mat, seg = 20) {
  return put(p, G(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat, x, y + h / 2, z);
}
export function torus(p, R, r, x, y, z, mat, axis = "y") {
  const m = put(p, G(`t${R}|${r}`, () => new THREE.TorusGeometry(R, r, 10, 40)), mat, x, y, z);
  if (axis === "y") m.rotation.x = Math.PI / 2; else if (axis === "x") m.rotation.y = Math.PI / 2;
  return m;
}
export function rrShape(w, d, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/** A thick rounded plate, foot at y. */
export function plate(p, w, d, r, h, y, mat, bevel = 0.12) {
  const g = new THREE.ExtrudeGeometry(rrShape(w - bevel * 2, d - bevel * 2, r), {
    depth: h - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 16,
  });
  g.rotateX(-Math.PI / 2);
  return put(p, g, mat, 0, y + bevel, 0);
}
/** Planks drawn on a flat rounded top. */
export function planked(p, w, d, r, y, c1, c2, line) {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 256;
  const k = cv.getContext("2d");
  k.fillStyle = c1; k.fillRect(0, 0, 64, 256); k.fillStyle = c2; k.fillRect(64, 0, 64, 256);
  k.fillStyle = line; k.fillRect(0, 0, 2, 256); k.fillRect(64, 0, 2, 256);
  k.fillRect(0, 90, 64, 2); k.fillRect(64, 200, 64, 2);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1 / 2.2, 1 / 9); t.anisotropy = 8;
  const g = new THREE.ShapeGeometry(rrShape(w, d, r), 16); g.rotateX(-Math.PI / 2);
  const m = put(p, g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 }), 0, y, 0);
  m.castShadow = false; return m;
}
export const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
export { THREE };
