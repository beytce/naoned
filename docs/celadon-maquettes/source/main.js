import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { M, THREE, ball, box, cone, cyl, grp, pal, plate, rod, setPal } from "./kit.js";
import * as K from "./models.js";

const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "ile";
const P = setPal(q.get("pal") ?? "a");
const W = innerWidth, H = innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Number(q.get("dpr") ?? 2)); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("gl").appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(q.get("bg") ? `#${q.get("bg")}` : P.bg);

const labels = [];
const label = (x, y, z, html, cls = "") => labels.push({ v: new THREE.Vector3(x, y, z), html, cls });

const T = 6;
let target = new THREE.Vector3(), vh = 40, shadowExtent = 26;

function clouds(y, list) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.water).lerp(new THREE.Color("#FFFFFF"), 0.5) });
  for (const [x, z, s] of list) for (const [dx, dz, r] of [[0, 0, 2.2], [2.4, 0.3, 1.6], [-2.3, 0.4, 1.4], [0.8, -1.2, 1.5]]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r * s, 32), m); c.rotation.x = -Math.PI / 2; c.position.set(x + dx * s, y, z + dz * s); scene.add(c);
  }
}

function ile() {
  const root = grp(scene);
  K.platform(root, 24, 24, 18);
  const at = (i, j) => grp(root, (i - 1) * T, 0, (j - 1) * T);
  K.fondaco(at(0, 0)); K.lumberCamp(at(1, 0)); K.sawmill(at(2, 0));
  K.sandPit(at(0, 1)); K.glassworks(at(1, 1)); K.quay(at(2, 1));
  K.plot(at(0, 2)); K.meadow(at(1, 2)); K.plot(at(2, 2));
  // the slides between neighbours: what feeds what is seen
  K.slide(root, -4.7, 0.3, -2.75, 0.3, 1.15); K.tub(root, -4.2, 1.27, 0.3); K.tub(root, -3.4, 1.27, 0.3);
  K.slide(root, 1.6, -4.4, 3.2, -4.4, 0.7); // camp -> sawmill (joins the saw's bed)
  K.logPiece(root, 2.4, 0.82, -4.4, 1.0, 0.15, "x");
  K.slide(root, -1.7, -4.2, -1.7, -2.6, 0.85); K.logPiece(root, -1.7, 0.97, -3.6, 0.8, 0.13, "z");
  K.slide(root, 1.2, 2.1, 5.2, 2.1, 0.85); K.glassTray(root, 2.2, 0.97, 2.1); K.glassTray(root, 3.9, 0.97, 2.1);
  // the deck: planters, bollards, railings
  for (const [x, z] of [[-10.3, -10.3], [10.3, -10.3], [-10.3, 10.3], [10.3, 10.3]]) K.planter(grp(root, 0, -0.32, 0), x, z);
  K.railing(root, -6, -11.2, 6, -11.2, -0.32); K.railing(root, -11.2, -6, -11.2, 6, -0.32);
  for (const k of [-7, -3.5, 0, 3.5, 7]) { K.bollard(root, k, -0.32, 11.1); K.bollard(root, 11.1, -0.32, k); }
  K.crate(root, 10.0, -0.32, 5.4); K.crate(root, 10.0, -0.32, 6.0); K.crate(root, -6.5, -0.32, 10.2);
  K.boat(root, 14.2, -3.0, 3, Math.PI / 2 + 0.1, false, 1.5);
  water(-3.05, 400);
  clouds(-3.0, [[-26, 8, 1.3], [24, -22, 1.1], [-6, -30, 0.9], [30, 20, 1.2], [-30, -18, 1]]);
  if (q.get("pins") !== "0") {
    label(-6, 5.9, -6, "Fondaco", "mine"); label(0, 3.3, -6, "Bûcherons · 2"); label(6, 3.6, -6, "Scierie · 1");
    label(-6, 3.5, 0, "Sablière · 2"); label(0, 3.9, 0, "Verrerie · 2", "sel"); label(-6, 0.9, 6, "+ Sable", "plot"); label(6, 0.9, 6, "+ Rive", "plot");
  }
}
function water(y, size, deep = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M("water")); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m);
}

/* ---------- the map ---------- */
function town(p, x, z, n = 3, tower = true, mine = false) {
  const g = grp(p, x, 0, z); g.scale.setScalar(1.35);
  plate(g, 4.6, 4.6, 0.9, 0.5, 0, M("stone"), 0.08);
  const spots = [[-1, -1, 1.3], [0.7, -0.9, 1.0], [-0.9, 0.8, 0.9], [0.9, 0.9, 1.15]];
  for (let k = 0; k < n; k++) {
    const [a, b, h] = spots[k];
    box(g, 1.3, h, 1.1, a, 0.5, b, M("porcelain"), 0.06);
    const r = cone(g, 1, 0.55, a, 0.5 + h, b, M("roof"), 4); r.rotation.y = Math.PI / 4; r.scale.set(1.0, 1, 0.86);
    box(g, 0.02, 0.35, 0.25, a + 0.66, 0.6, b, M("shade"), 0.005); box(g, 0.25, 0.3, 0.02, a, 0.9, b + 0.56, M("shade"), 0.005);
  }
  if (tower) { box(g, 0.6, 2.6, 0.6, 1.2, 0.5, -1.2, M("porcelain"), 0.05); cone(g, 0.45, 0.7, 1.2, 3.1, -1.2, M(mine ? "accent" : "celadon"), 4).rotation.y = Math.PI / 4; }
  if (mine) { cyl(g, 0.04, 0.04, 1.6, -1, 1.8, -1, M("ink"), 8); box(g, 0.7, 0.42, 0.03, -0.62, 2.95, -1, M("accent"), 0.01); }
  return g;
}
function thread(p, pts, kind) {
  const mine = kind === "mine";
  for (let k = 0; k < pts.length - 1; k++) {
    const a = new THREE.Vector3(pts[k][0], 0, pts[k][1]), b = new THREE.Vector3(pts[k + 1][0], 0, pts[k + 1][1]);
    const len = a.distanceTo(b); const g = grp(p, (a.x + b.x) / 2, 0.06, (a.z + b.z) / 2); g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    if (mine) {
      box(g, len + 0.9, 0.05, 1.1, 0, 0, 0.16, new THREE.MeshStandardMaterial({ color: "#8A2A20", roughness: 0.8 }), 0.02).castShadow = false;
      box(g, len + 0.9, 0.07, 1.0, 0, 0.02, 0, M("accent"), 0.03).castShadow = false;
      for (let t = -len / 2 + 0.8; t < len / 2; t += 1.9) for (const s of [-1, 1]) { const c = box(g, 0.5, 0.012, 0.11, t, 0.09, s * 0.17, M("accent2"), 0.004); c.rotation.y = s * 0.75; c.castShadow = false; }
    } else {
      const dash = kind === "rival" ? 1.2 : 0.7, w = kind === "rival" ? 0.34 : 0.2;
      for (let t = -len / 2; t < len / 2; t += dash * 1.7) box(g, dash, 0.04, w, t + dash / 2, 0, 0, M(kind === "rival" ? "ink" : "shade"), 0.02).castShadow = false;
    }
  }
}
function carte() {
  const root = grp(scene); const R = 30;
  // the tray: a hull, a wooden rim, the water inside, darker toward the open sea
  plate(root, 2 * R + 6.4, 2 * R + 6.4, 7, 0.5, -3.2, M("stone2"), 0.1);
  plate(root, 2 * R + 7, 2 * R + 7, 7.2, 2.0, -2.75, M("porcelain"), 0.25);
  plate(root, 2 * R + 7.6, 2 * R + 7.6, 7.5, 0.75, -0.75, M("wood"), 0.16);
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const k = cv.getContext("2d");
  const gr = k.createRadialGradient(256, 256, 60, 256, 256, 330); gr.addColorStop(0, P.water); gr.addColorStop(0.55, P.water); gr.addColorStop(1, P.waterDeep);
  k.fillStyle = gr; k.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sh = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); const w = 2 * R + 3, r = 5.4, x = -w / 2; s.moveTo(x + r, x); s.lineTo(-x - r, x); s.quadraticCurveTo(-x, x, -x, x + r); s.lineTo(-x, -x - r); s.quadraticCurveTo(-x, -x, -x - r, -x); s.lineTo(x + r, -x); s.quadraticCurveTo(x, -x, x, -x - r); s.lineTo(x, x + r); s.quadraticCurveTo(x, x, x + r, x); return s; })(), 24);
  const uv = sh.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (2 * R + 3) + 0.5, uv.getY(i) / (2 * R + 3) + 0.5);
  sh.rotateX(-Math.PI / 2);
  const wm = new THREE.Mesh(sh, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 })); wm.position.y = 0.01; wm.receiveShadow = true; root.add(wm);
  // rings of the sestieri, faint
  for (const r of [11, 21]) { const t = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r + 0.06, 96), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.35 })); t.rotation.x = -Math.PI / 2; t.position.y = 0.03; root.add(t); }
  // Rialto, at the centre: a square, a bridge, a campanile
  const ri = grp(root, 0, 0, 0); ri.scale.setScalar(1.3);
  plate(ri, 7.5, 5, 1.2, 0.5, 0, M("stone"), 0.08);
  for (const [x, z, h] of [[-2.3, -1, 1.4], [-0.6, -1.2, 1.9], [1.2, -1, 1.3], [2.4, 0.9, 1.1], [-2.2, 1, 1.0]]) { box(ri, 1.3, h, 1.1, x, 0.5, z, M("porcelain"), 0.06); const r = cone(ri, 1, 0.5, x, 0.5 + h, z, M("roof"), 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.85); }
  box(ri, 0.6, 3.4, 0.6, 0.4, 0.5, 1.1, M("porcelain"), 0.05); cone(ri, 0.46, 0.8, 0.4, 3.9, 1.1, M("celadon"), 4).rotation.y = Math.PI / 4;
  // the houses: yours in red, the others in porcelain
  const houses = [[-9, -9, true, "Ta Maison"], [9, -8, false, "Ca’ Dandolo"], [10, 9, false, ""], [-8, 10, false, ""], [-15, 2, false, ""], [3, -15, false, ""], [15, 0, false, ""], [1, 15, false, ""]];
  for (const [x, z, mine, name] of houses) {
    const g = grp(root, x, 0, z); plate(g, 3, 3, 0.7, 0.45, 0, M(mine ? "trim" : "stone"), 0.07);
    box(g, 1.5, 1.2, 1.3, 0, 0.45, 0, M("porcelain"), 0.06); const r = cone(g, 1, 0.5, 0, 1.65, 0, M(mine ? "accent" : "roof"), 4); r.rotation.y = Math.PI / 4; r.scale.set(1.15, 1, 1);
    if (mine) { cyl(g, 0.04, 0.04, 1.4, 0.9, 0.45, 0.9, M("ink"), 8); box(g, 0.6, 0.38, 0.03, 1.22, 1.5, 0.9, M("accent"), 0.01); }
    if (name) label(x, 3.4, z, mine ? name : `${name} <i>rival</i>`, mine ? "mine" : "");
  }
  // the towns, on the rim
  const towns = [["Padoue", -19, -26, 3, 62], ["Trévise", 0, -27.5, 4, 80], ["Vicence", 19, -26, 3, 30], ["Murano", 27, -12, 2, 45], ["Mestre", 27, 10, 3, 20], ["Chioggia", -12, 27, 4, 55], ["Ferrare", 10, 27, 3, 35], ["Udine", -27, -10, 2, 25], ["Bergame", -27, 9, 3, 70]];
  for (const [n, x, z, c, d] of towns) { town(root, x, z, c); label(x, 5.6, z, `${n}<b><u style="width:${d}%"></u></b>`, "town"); }
  label(0, 6.6, 0, `Rialto<b><u style="width:48%"></u><u class="me" style="width:22%"></u></b>`, "town");
  // the passes: a tower on the water, a lock
  for (const [x, z] of [[-20, 20], [21, 20], [22, -21]]) { const g = grp(root, x, 0, z); cyl(g, 0.9, 1.0, 0.35, 0, 0, 0, M("stone"), 24); cyl(g, 0.5, 0.56, 1.9, 0, 0.35, 0, M("porcelain"), 20); cyl(g, 0.62, 0.62, 0.22, 0, 2.2, 0, M("slate"), 20); label(x, 3.2, z, "", "lock"); }
  // threads
  thread(root, [[-9, -9], [-9, -1], [-3.6, -1]], "mine");
  thread(root, [[-9, -9], [-19, -9], [-19, -23.6]], "mine");
  thread(root, [[9, -8], [9, -2], [3.8, -2]], "rival");
  thread(root, [[9, -8], [19, -8], [19, -23.5]], "rival");
  thread(root, [[10, 9], [10, 24.6]], "other"); thread(root, [[-8, 10], [-12, 10], [-12, 24.6]], "other"); thread(root, [[15, 0], [24.6, 0], [24.6, 10]], "other");
  K.boat(root, -9, 0.05, -4.6, -Math.PI / 2, true, 0.75); K.boat(root, -14.5, 0.05, -9, Math.PI, true, 0.75); K.boat(root, 9, 0.05, -4.5, -Math.PI / 2, false, 0.7);
  water(-3.0, 600);
  clouds(-2.9, [[-52, 20, 2], [50, -44, 1.8], [-14, -58, 1.5], [58, 34, 2], [-58, -30, 1.6]]);
  vh = phone ? 104 : 76; shadowExtent = 60;
}
const phone = W < 600;

if (shot === "carte") carte(); else ile();
if (shot === "ile") { vh = phone ? 40 : 31; target.set(phone ? 3.4 : 2.2, 0, phone ? 3.4 : 2.2); }
if (shot === "verrerie") { vh = 11.5; target.set(0.6, 1.2, 0.6); shadowExtent = 16; }
if (shot === "scierie") { vh = 11.5; target.set(5.6, 1.3, -5.2); shadowExtent = 16; }
if (shot === "chaine") { vh = 19; target.set(-1.5, 1, -1.5); shadowExtent = 20; }
if (shot === "carte") target.set(phone ? -5 : 3, 0, phone ? -3 : 3);
if (q.get("vh")) vh = Number(q.get("vh"));

scene.add(new THREE.HemisphereLight("#FFFFFF", "#D6CDBF", 1.25));
const sun = new THREE.DirectionalLight("#FFFAF1", 2.5); const sc = shadowExtent / 36;
sun.position.set(target.x - 16 * sc * 2, 34 * sc * 2, target.z + 22 * sc * 2); sun.target.position.copy(target); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent, near: 1, far: 260 * sc });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2.4; scene.add(sun);
const fill = new THREE.DirectionalLight("#EEF2F6", 0.55); fill.position.set(26, 12, 2); scene.add(fill);

const asp = W / H;
const cam = new THREE.OrthographicCamera((-vh * asp) / 2, (vh * asp) / 2, vh / 2, -vh / 2, 0.1, 600);
const az = Math.PI / 4, el = Number(q.get("el") ?? 0.64), dist = 200;
cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
cam.lookAt(target); cam.updateMatrixWorld();

const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const comp = new EffectComposer(renderer, rt); comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(W, H);
comp.addPass(new RenderPass(scene, cam));
if (q.get("ao") !== "0") {
  const ao = new GTAOPass(scene, cam, W, H);
  ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.4, thickness: 2, scale: 1.2, samples: 16 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  ao.blendIntensity = 0.85; comp.addPass(ao);
}
comp.addPass(new OutputPass());
comp.render(); comp.render();

const pins = document.getElementById("pins");
for (const l of labels) {
  const v = l.v.clone().project(cam); const d = document.createElement("div");
  d.className = `pin ${l.cls}`; d.innerHTML = l.html; d.style.left = `${(v.x * 0.5 + 0.5) * W}px`; d.style.top = `${(-v.y * 0.5 + 0.5) * H}px`; pins.appendChild(d);
}
document.body.dataset.ready = "1";
