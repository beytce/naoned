import * as THREE from "three";
import type { SkyPhase } from "../art/domain.js";
import { LIGHT } from "../domain3d/light.js";
import { disposeMaterials, mat } from "../domain3d/materials.js";
import { disposeMergedIn, mergeStatic } from "../domain3d/merge.js";
import { box, cone, cyl, disposeGeometries, shadowBlob, tree } from "../domain3d/models.js";
import type { Motion } from "../game/pacing.js";
import { SCALE, type Spot, toWorld } from "../routes3d/layout.js";
import { type Town, depotModel, townModel } from "../routes3d/towns.js";
import { buildVenetoLand, ribbon } from "../routes3d/world.js";
import { type Pt, territories } from "./territory.js";

/**
 * The week's campaign on the model of the Veneto: the same land as the roads (plain, Alps, rivers,
 * lagoon), Lombardy to the west, and on it the ground of each family painted in its colour with
 * its borders, as on a war map. Towns, castles, villages and the families' seats stand on their
 * lands, each flying its holder's flag; marches cross the map toward their target.
 */

export interface CampaignLand {
  code: string;
  kind: string;
  x: number;
  y: number;
  holder: string | null;
  city: string | null;
  seat: string | null;
}

export interface CampaignMarch {
  id: string;
  family: string;
  /** The land the column leaves from (the nearest one of its family), or null. */
  from: string | null;
  target: string;
  startAt: number;
  arriveAt: number;
}

export interface CampaignState {
  phase: SkyPhase;
  still: boolean;
  clockOffset: number;
  lands: CampaignLand[];
  marches: CampaignMarch[];
  /** Each holder's colour (families and Milan); the militia's under "". */
  colors: Record<string, string>;
  /** The land the view opens on (the merchant's seat), if any. */
  focus?: string | null;
}

/** How wide the view is, in map units: a region at first, the whole Terraferma at most. */
const VIEW_START = 300;
const VIEW_MIN = 160;
const VIEW_MAX = 640;

export interface Anchor {
  key: string;
  x: number;
  y: number;
}

const DIR = new THREE.Vector3(0.18, 1.6, 1).normalize();
/** Where the sun stands from what the camera looks at. */
const SUN = new THREE.Vector3(14, 30, -8);
/** The sun's axes, to set its shadows on whole texels (they do not shimmer as the map moves). */
const SUN_AXES = new THREE.Matrix4().lookAt(SUN, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
const SUN_AXES_INV = SUN_AXES.clone().transpose();
/** How fast a wheel's zoom settles (per second). */
const ZOOM_EASE = 14;
const DISTANCE = 120;
/** How far a land's ground reaches at most (map units). */
const RADIUS = 46;
const MODEL_SCALE = 0.95;

/** The Bergamo Alps and the hills of Brescia, beyond the drawn map's western edge. */
const LOMBARD_MOUNTAINS: [number, number, number][] = [
  [-170, 70, 1.2],
  [-120, 56, 1.4],
  [-70, 80, 1.1],
  [-30, 50, 1.3],
  [-150, 110, 0.9],
  [-10, 118, 0.8],
];

interface Column {
  group: THREE.Group;
  men: THREE.Object3D[];
}

export class CampaignWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 400);
  private sun = new THREE.DirectionalLight("#ffffff", 2.5);
  private hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
  private land = new THREE.Group();
  private ground = new THREE.Group();
  private models = new Map<
    string,
    { group: THREE.Group; flag: THREE.Mesh; top: number; town?: Town }
  >();
  private marchLayer = new THREE.Group();
  private columns = new Map<string, Column>();
  private owned: THREE.Material[] = [];
  private state: CampaignState | null = null;
  private groundKey = "";
  private marchKey = "";
  private width = 1;
  private height = 1;
  private box = { minX: 0, maxX: 36, minZ: 0, maxZ: 44 };
  private half = 20;
  /** What the camera looks at, and how wide the view is (map units), moved by the fingers. */
  private view = { cx: 18, cz: 22, span: VIEW_START };
  private raycaster = new THREE.Raycaster();
  private started = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = true;
    const small = Math.min(window.innerWidth, window.innerHeight) < 500;
    this.sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.land, this.ground, this.marchLayer);
    buildVenetoLand(this.land);
    for (const [x, y, s] of LOMBARD_MOUNTAINS) {
      const p = toWorld([x, y]);
      const m = new THREE.Group();
      m.position.set(p.x, 0, p.z);
      m.scale.setScalar(s * 0.8);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.0, 6), mat("#7D8C92"));
      rock.position.y = 1.5;
      rock.castShadow = true;
      const snow = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.12, 6), mat("#F4F1EA"));
      snow.position.y = 2.45;
      m.add(rock, snow);
      this.land.add(m);
    }
    for (const [x, y] of [
      [-120, 180],
      [-80, 270],
      [-20, 250],
      [-150, 290],
    ] as const) {
      const p = toWorld([x, y]);
      tree(this.land, p.x, p.z, 0.9, "#2F6345");
      tree(this.land, p.x + 0.6, p.z + 0.3, 0.7, "#3F7A4A");
    }
    // By zones of 8 units: a zoomed map draws only the zones in view.
    mergeStatic(this.land, [], { cell: 8 });
  }

  /** The sharpness of the drawing (pixel ratio), set by the scene's loop. */
  setRatio(ratio: number) {
    if (ratio !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(ratio);
  }

  /** A wheel's zoom still settling keeps the pace up; flags and columns live otherwise. */
  motion(): Motion {
    if (this.zoomLeft !== 0) return "busy";
    return this.state?.still ? "still" : "anim";
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.half = this.fitHalf();
  }

  /** Moves the view by a drag of (dx, dy) css pixels. */
  panBy(dx: number, dy: number) {
    const perPx = (this.half * 2) / this.height;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    // On the ground, the screen's vertical is foreshortened by the camera's tilt.
    const ahead = new THREE.Vector3(up.x, 0, up.z);
    const tilt = ahead.length() || 1;
    ahead.normalize();
    this.view.cx -= (right.x * dx - (ahead.x * dy) / tilt) * perPx;
    this.view.cz -= (right.z * dx - (ahead.z * dy) / tilt) * perPx;
    this.clampView();
  }

  /** Zoom still to come from the wheel (log of its factor), toward a point of the canvas. */
  private zoomLeft = 0;
  private zoomAround = { x: 0, y: 0 };
  private lastFrame = 0;

  /**
   * Zooms in (factor < 1) or out by the wheel, keeping the ground under (x, y) css px where it
   * is; eased over the next frames.
   */
  zoomAt(factor: number, x: number, y: number) {
    // Not beyond the limits: a wheel turned on at the widest view stores nothing.
    const left = Math.log(this.view.span) + this.zoomLeft + Math.log(factor);
    const goal = Math.max(Math.log(VIEW_MIN), Math.min(Math.log(VIEW_MAX), left));
    this.zoomLeft = goal - Math.log(this.view.span);
    this.zoomAround = { x, y };
  }

  /** Zooms at once by a pinch, keeping the ground between the fingers where it is. */
  zoomNow(factor: number, x: number, y: number) {
    this.zoomLeft = 0;
    this.applyZoom(factor, x, y);
  }

  private applyZoom(factor: number, x: number, y: number) {
    this.placeCamera();
    const before = this.groundAt(x, y);
    this.view.span = Math.max(VIEW_MIN, Math.min(VIEW_MAX, this.view.span * factor));
    this.half = this.fitHalf();
    this.placeCamera();
    const after = this.groundAt(x, y);
    if (before && after) {
      this.view.cx += before.x - after.x;
      this.view.cz += before.z - after.z;
    }
    this.clampView();
  }

  /** The ground (y = 0) under a point of the canvas, in css pixels. */
  private groundAt(x: number, y: number): THREE.Vector3 | null {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
  }

  /** The camera over the view's centre, and the sun's shadows around it on whole texels. */
  private placeCamera() {
    const aspect = this.width / this.height;
    this.camera.left = -this.half * aspect;
    this.camera.right = this.half * aspect;
    this.camera.top = this.half;
    this.camera.bottom = -this.half;
    const look = new THREE.Vector3(this.view.cx, 0, this.view.cz);
    this.camera.position.copy(look).add(DIR.clone().multiplyScalar(DISTANCE));
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const sc = this.sun.shadow.camera;
    const r = this.half * 1.7;
    const texel = (2 * r) / this.sun.shadow.mapSize.x;
    const c = look.applyMatrix4(SUN_AXES_INV);
    c.x = Math.round(c.x / texel) * texel;
    c.y = Math.round(c.y / texel) * texel;
    c.applyMatrix4(SUN_AXES);
    this.sun.position.copy(c).add(SUN);
    this.sun.target.position.copy(c);
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 0.5;
    sc.far = 120;
    sc.updateProjectionMatrix();
  }

  private clampView() {
    this.view.cx = Math.max(this.box.minX, Math.min(this.box.maxX, this.view.cx));
    this.view.cz = Math.max(this.box.minZ, Math.min(this.box.maxZ, this.view.cz));
  }

  update(state: CampaignState) {
    const first = !this.state;
    this.state = state;
    this.light(state.phase);
    if (first) this.placeLands(state);
    // The ground of each land in its holder's colour, and the borders: redrawn on a change.
    const key = state.lands.map((l) => `${l.code}=${l.holder ?? ""}`).join();
    if (key !== this.groundKey) {
      this.groundKey = key;
      this.paint(state);
      for (const l of state.lands) {
        const m = this.models.get(l.code);
        if (m) (m.flag.material as THREE.MeshStandardMaterial).color.set(this.colorOf(l.holder));
      }
    }
    const marchKey = state.marches.map((m) => `${m.id}:${m.from ?? ""}`).join();
    if (marchKey !== this.marchKey) {
      this.marchKey = marchKey;
      this.drawMarches(state);
    }
  }

  private colorOf(holder: string | null): string {
    return this.state?.colors[holder ?? ""] ?? "#3A4F50";
  }

  private own<T extends THREE.Material>(m: T): T {
    this.owned.push(m);
    return m;
  }

  /** The models of the lands, once: they stay where they are all season. */
  private placeLands(state: CampaignState) {
    const xs = state.lands.map((l) => l.x);
    const ys = state.lands.map((l) => l.y);
    const margin = 34;
    this.box = {
      minX: (Math.min(...xs) - margin) * SCALE,
      maxX: (Math.max(...xs) + margin) * SCALE,
      minZ: (Math.min(...ys) - margin) * SCALE,
      maxZ: (Math.max(...ys) + margin) * SCALE,
    };
    // The view opens on the merchant's seat (or the middle of the map), a region wide.
    const focus = state.lands.find((l) => l.code === state.focus);
    const middle = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
    const at = focus ? { x: focus.x - 60, y: focus.y - 40 } : middle;
    this.view = { cx: at.x * SCALE, cz: at.y * SCALE, span: VIEW_START };
    this.half = this.fitHalf();
    this.clampView();
    for (const l of state.lands) {
      const p = toWorld([l.x, l.y]);
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);
      let top = 0.8;
      let town: Town | undefined;
      const kept: THREE.Object3D[] = [];
      if (l.city) {
        town = townModel(l.city);
        town.group.scale.setScalar(0.8);
        group.add(town.group);
        top = town.top * 0.8;
      } else if (l.seat) {
        const d = depotModel(false);
        kept.push(...d.windows, ...d.flags);
        d.group.scale.setScalar(1.25);
        group.add(d.group);
        top = 1.2;
      } else if (l.kind === "fortress") {
        top = fortress(group);
      } else {
        top = hamlet(group, l.kind === "bourg" ? 4 : 2, l.code);
      }
      // The holder's flag, high above the land.
      const pole = l.seat ? 1.9 : 1.4;
      cyl(group, 0.03, 0.035, pole, "#C98E52", 0.9, 0, -0.7, 8);
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(l.seat ? 0.62 : 0.44, l.seat ? 0.36 : 0.26, 0.03),
        this.own(new THREE.MeshStandardMaterial({ color: this.colorOf(l.holder), roughness: 0.7 })),
      );
      flag.position.set(0.9 + (l.seat ? 0.31 : 0.22), pole - 0.2, -0.7);
      flag.castShadow = true;
      group.add(flag);
      group.scale.multiplyScalar(MODEL_SCALE);
      group.userData = { kind: "land", code: l.code };
      mergeStatic(group, [flag, ...(town?.windows ?? []), ...(town?.flags ?? []), ...kept]);
      this.models.set(l.code, { group, flag, top: Math.max(top, pole) * MODEL_SCALE, town });
      this.scene.add(group);
    }
  }

  /** Each land's ground in its holder's colour, with borders where holders meet. */
  private paint(state: CampaignState) {
    for (const c of this.ground.children) {
      const mesh = c as THREE.Mesh;
      mesh.geometry?.dispose();
    }
    this.ground.clear();
    const t = territories(
      state.lands.map((l) => ({ code: l.code, x: l.x, y: l.y, holder: l.holder })),
      RADIUS,
    );
    const fills = new Map<string, THREE.Material>();
    const fillOf = (holder: string | null) => {
      const k = holder ?? "";
      let m = fills.get(k);
      if (!m) {
        m = this.own(
          new THREE.MeshBasicMaterial({
            color: this.colorOf(holder),
            transparent: true,
            opacity: holder ? 0.42 : 0.16,
            depthWrite: false,
          }),
        );
        fills.set(k, m);
      }
      return m;
    };
    for (const l of state.lands) {
      const cell = t.cells[l.code];
      if (!cell || cell.length < 3) continue;
      const shape = new THREE.Shape(cell.map(([x, y]) => new THREE.Vector2(x * SCALE, -y * SCALE)));
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), fillOf(l.holder));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.045;
      mesh.renderOrder = 2;
      this.ground.add(mesh);
    }
    for (const b of t.borders) {
      if (!b.holder) continue;
      const pts: Spot[] = [toWorld(b.from as Pt), toWorld(b.to as Pt)];
      const line = ribbon(pts, 0.16, this.colorOf(b.holder), 0.06);
      line.renderOrder = 3;
      this.ground.add(line);
    }
  }

  /** The columns on the march: a dashed track from where they leave, men walking it. */
  private drawMarches(state: CampaignState) {
    this.marchLayer.clear();
    this.columns.clear();
    for (const m of state.marches) {
      const to = state.lands.find((l) => l.code === m.target);
      const from = state.lands.find((l) => l.code === m.from);
      if (!to || !from) continue;
      const a = toWorld([from.x, from.y]);
      const b = toWorld([to.x, to.y]);
      const color = this.colorOf(m.family);
      const n = 9;
      for (let i = 0; i < n; i += 2) {
        const p0 = { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n };
        const p1 = { x: a.x + ((b.x - a.x) * (i + 1)) / n, z: a.z + ((b.z - a.z) * (i + 1)) / n };
        this.marchLayer.add(ribbon([p0, p1], 0.2, color, 0.08));
      }
      const group = new THREE.Group();
      const men: THREE.Object3D[] = [];
      for (let i = 0; i < 3; i++) {
        const man = new THREE.Group();
        cone(man, 0.13, 0.42, color, 0, 0, 0, 8);
        cyl(man, 0.012, 0.012, 0.6, "#C98E52", 0.12, 0, 0, 6);
        man.position.set((i - 1) * 0.28, 0, (i % 2) * 0.22);
        group.add(man);
        men.push(man);
      }
      group.userData = { a, b, startAt: m.startAt, arriveAt: m.arriveAt };
      this.columns.set(m.id, { group, men });
      this.marchLayer.add(group);
    }
  }

  /** Half the view's height holding `span` map units across, in the canvas' shape. */
  private fitHalf(): number {
    const cam = new THREE.Object3D();
    cam.position.copy(DIR);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorld.clone().invert();
    const half = (this.view.span * SCALE) / 2;
    const w = Math.abs(new THREE.Vector3(half, 0, 0).applyMatrix4(inv).x);
    return w * (this.height / this.width);
  }

  private phase: SkyPhase | null = null;

  private light(phase: SkyPhase) {
    const l = LIGHT[phase];
    this.sun.color.set(l.sun);
    this.sun.intensity = l.sunI;
    this.hemi.color.set(l.sky);
    this.hemi.groundColor.set(l.ground);
    this.hemi.intensity = l.hemiI;
    this.renderer.toneMappingExposure = l.exposure;
    // A new fog makes three.js check every material's shader again: only when the hour turns.
    if (phase !== this.phase) {
      this.phase = phase;
      this.scene.background = new THREE.Color(l.fog);
      this.scene.fog = new THREE.Fog(l.fog, 160, 260);
    }
    const lit = phase !== "day";
    for (const m of this.models.values())
      for (const w of m.town?.windows ?? []) w.material = mat(lit ? "window-lit" : "window");
  }

  frame(t: number) {
    const state = this.state;
    if (!state) return;
    const s = (t - this.started) / 1000;
    const dt = Math.min(0.1, (t - (this.lastFrame || t)) / 1000);
    this.lastFrame = t;
    if (this.zoomLeft !== 0) {
      const step =
        Math.abs(this.zoomLeft) < 0.002
          ? this.zoomLeft
          : this.zoomLeft * (1 - Math.exp(-dt * ZOOM_EASE));
      this.zoomLeft -= step;
      this.applyZoom(Math.exp(step), this.zoomAround.x, this.zoomAround.y);
    }
    this.placeCamera();
    const now = Date.now() + state.clockOffset;
    for (const c of this.columns.values()) {
      const { a, b, startAt, arriveAt } = c.group.userData as {
        a: Spot;
        b: Spot;
        startAt: number;
        arriveAt: number;
      };
      const k = Math.max(0, Math.min(1, (now - startAt) / Math.max(1, arriveAt - startAt)));
      // They walk the track; at the night's truce they wait at its end.
      c.group.position.set(a.x + (b.x - a.x) * k * 0.92, 0, a.z + (b.z - a.z) * k * 0.92);
      c.group.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
      if (!state.still)
        for (const [i, man] of c.men.entries())
          man.position.y = Math.abs(Math.sin(s * 6 + i)) * 0.06;
    }
    if (!state.still) {
      for (const [i, m] of [...this.models.values()].entries()) {
        m.flag.rotation.y = Math.sin(s * 1.5 + i) * 0.25;
        for (const [j, f] of (m.town?.flags ?? []).entries())
          f.rotation.y = Math.sin(s * 1.4 + j) * 0.25;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The land under a point of the canvas (css pixels), or the nearest within reach. */
  pick(x: number, y: number): string | null {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const ground = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
    if (!ground) return null;
    let best: { code: string; d: number } | null = null;
    for (const [code, m] of this.models) {
      const d = Math.hypot(ground.x - m.group.position.x, ground.z - m.group.position.z);
      if (d < 2.6 && (!best || d < best.d)) best = { code, d };
    }
    return best?.code ?? null;
  }

  /** Above each land (its badge) and under it (its name), in css pixels. */
  anchors(): Anchor[] {
    const out: Anchor[] = [];
    const v = new THREE.Vector3();
    const put = (key: string, p: THREE.Vector3) => {
      v.copy(p).project(this.camera);
      out.push({ key, x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height });
    };
    for (const [code, m] of this.models) {
      const g = m.group.position;
      put(`land:${code}`, new THREE.Vector3(g.x, m.top + 0.2, g.z));
      put(`name:${code}`, new THREE.Vector3(g.x, 0, g.z + 1.5));
    }
    for (const [id, c] of this.columns) put(`march:${id}`, c.group.position.clone().setY(1));
    return out;
  }

  dispose() {
    for (const c of this.ground.children) (c as THREE.Mesh).geometry?.dispose();
    for (const m of this.owned) m.dispose();
    disposeMergedIn(this.scene);
    this.scene.clear();
    this.renderer.dispose();
    disposeGeometries();
    disposeMaterials();
  }
}

/** Milan's fortress: walls, four towers and a keep, in grey stone. */
function fortress(g: THREE.Group): number {
  box(g, 2.2, 0.06, 2.2, "paving", 0, 0, 0, 0.03);
  const half = 0.95;
  for (const [x, z, w, d] of [
    [0, -half, half * 2, 0.16],
    [0, half, half * 2, 0.16],
    [-half, 0, 0.16, half * 2],
    [half, 0, 0.16, half * 2],
  ] as const)
    box(g, w, 0.45, d, "stone", x, 0, z, 0.03);
  for (const [x, z] of [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ] as const) {
    cyl(g, 0.2, 0.22, 0.75, "stone", x, 0, z, 10);
    cone(g, 0.26, 0.34, "roof-slate", x, 0.75, z, 10);
  }
  box(g, 0.7, 1.2, 0.7, "stone", 0, 0, -0.1, 0.03);
  cone(g, 0.55, 0.5, "roof-slate", 0, 1.2, -0.1, 4).rotation.y = Math.PI / 4;
  shadowBlob(g, 2.6, 2.6);
  return 1.8;
}

/** A village or a small town: a few houses around a church. */
function hamlet(g: THREE.Group, houses: number, code: string): number {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const spots: [number, number][] = [
    [-0.45, -0.2],
    [0.35, -0.35],
    [-0.2, 0.4],
    [0.45, 0.35],
  ];
  for (let i = 0; i < houses; i++) {
    const [x, z] = spots[(i + h) % spots.length] as [number, number];
    box(g, 0.5, 0.36, 0.4, i % 2 === 0 ? "plaster-warm" : "plaster", x, 0, z, 0.03);
    const roof = cone(g, 0.42, 0.28, "roof", x, 0.36, z, 4);
    roof.rotation.y = Math.PI / 4;
  }
  // The campanile.
  box(g, 0.2, 0.9, 0.2, "brick", 0.05, 0, 0.02, 0.02);
  cone(g, 0.17, 0.3, "roof", 0.05, 0.9, 0.02, 4).rotation.y = Math.PI / 4;
  shadowBlob(g, 1.6, 1.4);
  return 1.25;
}
