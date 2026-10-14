import * as THREE from "three";
import type { SkyPhase } from "../art/domain.js";
import {
  GARDA,
  HILLS,
  LAGOON,
  MAP_H,
  MAP_W,
  MOUNTAINS,
  PLACES,
  RIVERS,
  SEA,
  WOODS,
} from "../art/veneto.js";
import { type VehicleModel, vehicleModel } from "../domain3d/actors.js";
import { LIGHT } from "../domain3d/light.js";
import { disposeMaterials, mat } from "../domain3d/materials.js";
import { box, disposeGeometries, tree } from "../domain3d/models.js";
import {
  SCALE,
  type Spot,
  cityFrame,
  onRoute,
  parsePath,
  roadPoints,
  shareAt,
  toWorld,
} from "./layout.js";
import { type Town, campModel, depotModel, townModel } from "./towns.js";

export interface VenetoCity {
  code: string;
  /** On one of the merchant's roads. */
  reached: boolean;
}

export interface VenetoRoute {
  route: string;
  /** Lit: a city the chosen vehicle can serve, or the chosen one. */
  lit: boolean;
  /** Bandits lie in wait on it. */
  watched: boolean;
}

export interface VenetoDelivery {
  id: string;
  route: string;
  type: string;
  resource: string;
  departAt: number;
  arriveAt: number;
  backAt: number;
  halted: boolean;
}

export interface VenetoState {
  region: string;
  phase: SkyPhase;
  cities: VenetoCity[];
  routes: VenetoRoute[];
  deliveries: VenetoDelivery[];
  camps: { id: string; route: string }[];
  /** The game's clock minus the device's (vehicles move on the game's time). */
  clockOffset: number;
  still: boolean;
}

export type VenetoHit =
  | { kind: "city"; code: string }
  | { kind: "delivery"; id: string }
  | { kind: "depot" };

export interface Anchor {
  key: string;
  x: number;
  y: number;
}

/** The camera looks north, from the south and above, a little from the east. */
const DIR = new THREE.Vector3(0.22, 1.35, 1).normalize();
const DISTANCE = 90;
/** Towns drawn larger than the map's scale, to be read and touched on a phone. */
const TOWN_SCALE = 1.45;

/** Goods aboard, by their colour. */
const GOODS: Record<string, string> = {
  wheat: "#E8B24C",
  flour: "#F6E8CC",
  bread: "#C98E52",
  clay: "#B5653E",
  bricks: "#C8462A",
  wood: "#7A5638",
  planks: "#D9B07A",
};

/**
 * The Veneto in real time, at the scale of a map: the Alps in the north, the plain and its rivers,
 * the lagoon and the sea; the seven towns as models; the merchant's roads in paving, its
 * vehicles driving them, the bandits' camps beside them.
 */
export class VenetoWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 300);
  private sun = new THREE.DirectionalLight("#ffffff", 2.5);
  private hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
  private land = new THREE.Group();
  private roads = new THREE.Group();
  private towns = new Map<string, Town>();
  private depot: Town | null = null;
  private vehicles = new Map<string, VehicleModel>();
  private camps = new Map<string, { group: THREE.Group; fire: THREE.Mesh }>();
  private state: VenetoState | null = null;
  private region = "";
  private roadKey = "";
  private width = 1;
  private height = 1;
  private frameBox = { minX: 0, maxX: 36, minZ: 0, maxZ: 44 };
  private view = { cx: 18, cz: 22, half: 20 };
  private raycaster = new THREE.Raycaster();
  private started = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = true;
    const small = Math.min(window.innerWidth, window.innerHeight) < 500;
    this.sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.land, this.roads);
    this.buildLand();
    for (const code of [
      "venezia",
      "padova",
      "verona",
      "vicenza",
      "treviso",
      "mantova",
      "ferrara",
    ]) {
      const at = PLACES[code];
      if (!at) continue;
      const town = townModel(code);
      const p = toWorld(at);
      town.group.position.set(p.x, code === "venezia" ? 0.02 : 0, p.z);
      town.group.scale.setScalar(TOWN_SCALE);
      town.group.userData = { kind: "city", code };
      this.towns.set(code, town);
      this.scene.add(town.group);
    }
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.view.half = this.fitHalf();
  }

  update(state: VenetoState) {
    this.state = state;
    this.light(state.phase);
    if (state.region !== this.region) {
      this.region = state.region;
      if (this.depot) this.scene.remove(this.depot.group);
      const at = PLACES[state.region];
      this.depot = depotModel(true);
      if (at) {
        const p = toWorld(at);
        this.depot.group.position.set(p.x, 0, p.z);
        this.depot.group.scale.setScalar(TOWN_SCALE);
      }
      this.depot.group.userData = { kind: "depot" };
      this.scene.add(this.depot.group);
      this.frameBox = cityFrame(
        state.cities.filter((c) => c.reached).map((c) => c.code),
        state.region,
        2.6,
      );
      this.view = {
        cx: (this.frameBox.minX + this.frameBox.maxX) / 2,
        cz: (this.frameBox.minZ + this.frameBox.maxZ) / 2,
        half: this.fitHalf(),
      };
    }
    // The roads, repaved when their state changes (lit, watched).
    const key = state.routes.map((r) => `${r.route}${r.lit ? "+" : ""}${r.watched ? "!" : ""}`);
    if (key.join() !== this.roadKey) {
      this.roadKey = key.join();
      this.roads.clear();
      for (const r of state.routes) {
        const pts = roadPoints(r.route, 40);
        const tone = r.lit ? "gold" : r.watched ? "#C8462A" : "path";
        this.roads.add(ribbon(pts, r.lit ? 0.5 : 0.42, tone, 0.035));
        // Milestones along it.
        for (const k of [10, 20, 30]) {
          const p = pts[k];
          if (p) box(this.roads, 0.08, 0.16, 0.08, "stone", p.x + 0.35, 0, p.z, 0.02);
        }
      }
    }
    // Vehicles on the road.
    const seen = new Set<string>();
    for (const dv of state.deliveries) {
      seen.add(dv.id);
      let v = this.vehicles.get(dv.id);
      if (!v) {
        v = vehicleModel(dv.type);
        v.group.scale.setScalar(1.7);
        v.group.userData = { kind: "delivery", id: dv.id };
        this.vehicles.set(dv.id, v);
        this.scene.add(v.group);
      }
      if (v.cargo) {
        v.cargo.material = mat(GOODS[dv.resource] ?? "#E8B24C");
      }
    }
    for (const [id, v] of this.vehicles) {
      if (!seen.has(id)) {
        this.scene.remove(v.group);
        this.vehicles.delete(id);
      }
    }
    // Bandits' camps.
    const campSeen = new Set<string>();
    for (const c of state.camps) {
      campSeen.add(c.id);
      if (this.camps.has(c.id)) continue;
      const camp = campModel();
      const on = onRoute(c.route, 0.58);
      if (on) camp.group.position.set(on.at.x - on.dir.z * 0.7, 0, on.at.z + on.dir.x * 0.7);
      this.camps.set(c.id, camp);
      this.scene.add(camp.group);
    }
    for (const [id, c] of this.camps) {
      if (!campSeen.has(id)) {
        this.scene.remove(c.group);
        this.camps.delete(id);
      }
    }
  }

  /** The half-height of the view holding the frame, in the canvas' shape. */
  private fitHalf(): number {
    const b = this.frameBox;
    const cam = new THREE.Object3D();
    cam.position.copy(DIR);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorld.clone().invert();
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    let w = 0;
    let h = 0;
    for (const x of [b.minX, b.maxX])
      for (const z of [b.minZ, b.maxZ])
        for (const y of [0, 1.5]) {
          const p = new THREE.Vector3(x - cx, y, z - cz).applyMatrix4(inv);
          w = Math.max(w, Math.abs(p.x));
          h = Math.max(h, Math.abs(p.y));
        }
    const ratio = this.height / this.width;
    return Math.max(h, w * ratio) * 1.04;
  }

  private light(phase: SkyPhase) {
    const l = LIGHT[phase];
    this.sun.color.set(l.sun);
    this.sun.intensity = l.sunI;
    this.hemi.color.set(l.sky);
    this.hemi.groundColor.set(l.ground);
    this.hemi.intensity = l.hemiI;
    this.renderer.toneMappingExposure = l.exposure;
    this.scene.background = new THREE.Color(l.fog);
    this.scene.fog = new THREE.Fog(l.fog, 120, 190);
    const lit = phase !== "day";
    for (const t of [...this.towns.values(), ...(this.depot ? [this.depot] : [])])
      for (const w of t.windows) w.material = mat(lit ? "window-lit" : "window");
  }

  /** The land: plain, Alps, hills and woods, the lake, the rivers, the lagoon and the sea. */
  private buildLand() {
    buildVenetoLand(this.land);
  }

  /** Advances to time t (ms) and draws. */
  frame(t: number) {
    const state = this.state;
    if (!state) return;
    const s = (t - this.started) / 1000;
    const cx = (this.frameBox.minX + this.frameBox.maxX) / 2;
    const cz = (this.frameBox.minZ + this.frameBox.maxZ) / 2;
    this.view.cx = cx;
    this.view.cz = cz;
    const aspect = this.width / this.height;
    const half = this.view.half;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    const look = new THREE.Vector3(cx, 0, cz);
    this.camera.position.copy(look).add(DIR.clone().multiplyScalar(DISTANCE));
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    this.sun.position.copy(look).add(new THREE.Vector3(10, 22, -6));
    this.sun.target.position.copy(look);
    const sc = this.sun.shadow.camera;
    const r = half * 1.6;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 0.5;
    sc.far = 90;
    sc.updateProjectionMatrix();

    const moving = !state.still;
    const now = Date.now() + state.clockOffset;
    for (const dv of state.deliveries) {
      const v = this.vehicles.get(dv.id);
      if (!v) continue;
      const { share, out } = shareAt(dv, now);
      const on = onRoute(dv.route, share);
      if (!on) continue;
      // Driving on the right of the road, facing where it goes.
      const side = out ? 1 : -1;
      v.group.position.set(
        on.at.x - on.dir.z * 0.18 * side,
        0.04,
        on.at.z + on.dir.x * 0.18 * side,
      );
      const dx = on.dir.x * side;
      const dz = on.dir.z * side;
      v.group.rotation.y = Math.atan2(-dz, dx);
      if (v.cargo) v.cargo.visible = out;
      const rolling = moving && !dv.halted && now < dv.backAt;
      for (const w of v.wheels) if (rolling) w.rotation.z -= 0.05;
      for (const [i, leg] of v.legs.entries())
        leg.rotation.z = rolling ? Math.sin(s * 9 + i * Math.PI) * 0.4 : 0;
    }
    if (moving) {
      for (const town of this.towns.values())
        for (const [i, f] of town.flags.entries()) f.rotation.y = Math.sin(s * 1.4 + i) * 0.25;
      for (const [i, f] of (this.depot?.flags ?? []).entries())
        f.rotation.y = Math.sin(s * 1.6 + i) * 0.25;
      for (const c of this.camps.values()) c.fire.scale.y = 0.8 + Math.sin(s * 12) * 0.25;
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** What lies under a point of the canvas (css pixels from its top left). */
  pick(x: number, y: number): VenetoHit | null {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [
      ...[...this.vehicles.values()].map((v) => v.group),
      ...[...this.towns.values()].map((t) => t.group),
      ...(this.depot ? [this.depot.group] : []),
    ];
    for (const h of this.raycaster.intersectObjects(targets, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.kind) o = o.parent;
      const d = o?.userData as { kind?: string; id?: string; code?: string } | undefined;
      if (d?.kind === "delivery" && d.id) return { kind: "delivery", id: d.id };
      if (d?.kind === "city" && d.code) return { kind: "city", code: d.code };
      if (d?.kind === "depot") return { kind: "depot" };
    }
    // A tap near a town takes it: a town is a small target on a phone.
    const ground = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
    if (ground) {
      let best: { code: string; d: number } | null = null;
      for (const [code, t] of this.towns) {
        const d = Math.hypot(ground.x - t.group.position.x, ground.z - t.group.position.z);
        if (d < 2.4 * TOWN_SCALE && (!best || d < best.d)) best = { code, d };
      }
      if (best) return { kind: "city", code: best.code };
    }
    return null;
  }

  /** Where the marks go: above each town, the depot, each vehicle, each camp, each road's middle. */
  anchors(): Anchor[] {
    const out: Anchor[] = [];
    const v = new THREE.Vector3();
    const put = (key: string, p: THREE.Vector3) => {
      v.copy(p).project(this.camera);
      out.push({ key, x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height });
    };
    for (const [code, t] of this.towns) {
      const g = t.group.position;
      put(`city:${code}`, new THREE.Vector3(g.x, t.top * TOWN_SCALE + 0.3, g.z));
      put(`name:${code}`, new THREE.Vector3(g.x, 0, g.z + 1.75 * TOWN_SCALE));
    }
    if (this.depot) {
      const g = this.depot.group.position;
      put("depot", new THREE.Vector3(g.x, 1.5 * TOWN_SCALE, g.z));
    }
    for (const [id, veh] of this.vehicles)
      put(`delivery:${id}`, veh.group.position.clone().setY(1.6));
    for (const [id, c] of this.camps) put(`camp:${id}`, c.group.position.clone().setY(0.9));
    for (const r of this.state?.routes ?? []) {
      const on = onRoute(r.route, 0.45);
      if (on) put(`road:${r.route}`, new THREE.Vector3(on.at.x, 0.1, on.at.z));
    }
    return out;
  }

  dispose() {
    this.scene.clear();
    this.renderer.dispose();
    disposeGeometries();
    disposeMaterials();
  }
}

/** The Veneto's land in a group: plain, Alps, hills and woods, the lake, the rivers, the lagoon and the sea. */
export function buildVenetoLand(land: THREE.Group) {
  const W = MAP_W * SCALE;
  const H = MAP_H * SCALE;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, H + 60), mat("grass"));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(W / 2, 0, H / 2);
  ground.receiveShadow = true;
  const tex = (ground.material as THREE.MeshStandardMaterial).map;
  if (tex) tex.repeat.set(40, 40);
  land.add(ground);
  // The foothills: a band of alpine grass along the north.
  const alps = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, 42), mat("grass-alps"));
  alps.rotation.x = -Math.PI / 2;
  alps.position.set(W / 2, 0.005, 12 - 21);
  alps.receiveShadow = true;
  land.add(alps);
  for (const [x, y, s] of MOUNTAINS) {
    const p = toWorld([x, y]);
    const m = new THREE.Group();
    m.position.set(p.x, 0, p.z - 0.6);
    m.scale.setScalar(s * 0.8);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.0, 6), mat("#7D8C92"));
    rock.position.y = 1.5;
    rock.castShadow = true;
    rock.receiveShadow = true;
    const snow = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.12, 6), mat("#F4F1EA"));
    snow.position.y = 2.45;
    m.add(rock, snow);
    land.add(m);
  }
  for (const [x, y] of WOODS) {
    const p = toWorld([x, y]);
    tree(land, p.x, p.z, 0.9, "#2F6345");
    tree(land, p.x + 0.5, p.z + 0.3, 0.7, "#3F7A4A");
  }
  for (const [x, y, s] of HILLS) {
    const p = toWorld([x, y]);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1.4 * s, 16, 10), mat("#5E8A4A"));
    hill.scale.y = 0.35;
    hill.position.set(p.x, 0, p.z);
    hill.receiveShadow = true;
    hill.castShadow = true;
    land.add(hill);
  }
  // Fields of the plain, in strips of gold and green.
  for (const [x, y, gold] of [
    [110, 240, true],
    [96, 270, false],
    [176, 330, true],
    [236, 300, false],
    [90, 320, true],
    [250, 210, true],
    [140, 360, false],
    [200, 240, true],
  ] as const) {
    const p = toWorld([x, y]);
    box(land, 1.8, 0.03, 0.9, gold ? "#C9A44A" : "#7E9E48", p.x, 0, p.z, 0);
  }
  // Waters: the sea, the lagoon, Lake Garda, the rivers.
  land.add(flat(parsePath(SEA, 10), "water", 0.02));
  land.add(flat(parsePath(LAGOON, 10), "#4FA3A0", 0.03));
  land.add(flat(parsePath(GARDA, 10), "water", 0.02));
  for (const d of RIVERS) {
    const pts = parsePath(d, 10).map((p) => toWorld(p));
    land.add(ribbon(pts, 0.32, "water", 0.018));
  }
  // The Lido: the strip of sand closing the lagoon.
  const lido = parsePath("M332 222 Q322 256 326 290 Q328 314 318 334", 10).map((p) => toWorld(p));
  land.add(ribbon(lido, 0.3, "#E8D9B5", 0.04));
}

/** A flat band along points (a road, a river), lying just above the ground. */
export function ribbon(points: Spot[], width: number, material: string, y: number): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as Spot;
    const a = points[Math.max(0, i - 1)] as Spot;
    const b = points[Math.min(points.length - 1, i + 1)] as Spot;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Facing the sky whichever way the band was laid.
  if ((g.getAttribute("normal")?.getY(0) ?? 1) < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] as number;
      idx[i] = idx[i + 1] as number;
      idx[i + 1] = a;
    }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat(material));
  m.receiveShadow = true;
  return m;
}

/** A flat shape (the sea, a lake) from map points. */
export function flat(points: [number, number][], material: string, y: number): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, py]) => new THREE.Vector2(x * SCALE, -py * SCALE)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(material));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
