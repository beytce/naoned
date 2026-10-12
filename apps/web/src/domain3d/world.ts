import * as THREE from "three";
import type { DomainPlot, DomainVehicle, DomainWorker, SkyPhase } from "../art/domain.js";
import {
  type VehicleModel,
  type WorkerModel,
  gateModel,
  storeModel,
  vehicleModel,
  workerModel,
} from "./actors.js";
import {
  type Cell,
  GATE,
  PARKING,
  STORE,
  YARD,
  alongPath,
  frameBounds,
  onRoad,
  pathLength,
  placeWorkshops,
  workerRound,
} from "./layout.js";
import { disposeMaterials, mat } from "./materials.js";
import {
  type Model,
  barrel,
  box,
  bush,
  disposeGeometries,
  emptyPlotModel,
  flowers,
  lampPost,
  rock,
  tree,
  well,
  workshopModel,
} from "./models.js";

export interface WorldState {
  region: string;
  phase: SkyPhase;
  plots: DomainPlot[];
  maxPlots: number;
  vehicles: DomainVehicle[];
  workers: DomainWorker[];
  stock: number;
  /** Fewer motions: workers and carts still, no smoke. */
  still: boolean;
}

export type Hit =
  | { kind: "plot"; id: string }
  | { kind: "empty" }
  | { kind: "vehicle"; id: string }
  | { kind: "worker"; id: string }
  | { kind: "store" };

export interface Anchor {
  key: string;
  x: number;
  y: number;
}

interface PlotEntry {
  key: string;
  model: Model;
  at: Cell;
  born: number;
}

interface VehicleEntry {
  model: VehicleModel;
  type: string;
  pos: THREE.Vector3;
}

interface WorkerEntry {
  model: WorkerModel;
  round: Cell[];
  door: Cell;
  phase: number;
}

const LIGHT: Record<
  SkyPhase,
  {
    sun: string;
    sunI: number;
    sky: string;
    ground: string;
    hemiI: number;
    fog: string;
    exposure: number;
  }
> = {
  day: {
    sun: "#FFE6C0",
    sunI: 2.6,
    sky: "#DCEBFF",
    ground: "#6B5A3A",
    hemiI: 1.15,
    fog: "#CFE0D6",
    exposure: 1.05,
  },
  dusk: {
    sun: "#FFB070",
    sunI: 2.0,
    sky: "#F2B999",
    ground: "#4A3A3A",
    hemiI: 0.85,
    fog: "#D9A88C",
    exposure: 1.0,
  },
  night: {
    sun: "#8FA8FF",
    sunI: 0.55,
    sky: "#2B3D66",
    ground: "#141B2A",
    hemiI: 0.55,
    fog: "#1A2438",
    exposure: 1.15,
  },
};

const GRASS: Record<string, string> = {
  terraferma: "grass",
  lagoon: "grass-lagoon",
  dolomites: "grass-alps",
};

/**
 * The domain in real time: an orthographic camera at the isometric angle, a warm sun with soft
 * shadows and a sky light, the region's land, the workshops, the yard, the carts and the workers.
 */
export class DomainWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
  private sun = new THREE.DirectionalLight("#ffffff", 2.5);
  private hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
  private lanterns: THREE.PointLight[] = [];
  private lamps: THREE.Mesh[] = [];
  /** Crates flying from a workshop to the store, sparks of a new building. */
  private flights: {
    mesh: THREE.Object3D;
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    dur: number;
  }[] = [];
  private sparks: { sprite: THREE.Sprite; v: THREE.Vector3; life: number }[] = [];
  private gains = new Map<string, number>();
  private land = new THREE.Group();
  private plots = new Map<string, PlotEntry>();
  private empties = new THREE.Group();
  private vehicles = new Map<string, VehicleEntry>();
  private workers = new Map<string, WorkerEntry>();
  private store: THREE.Group | null = null;
  private storeKey = -1;
  private emptyKey = "-";
  private gate = gateModel();
  private smoke: { sprite: THREE.Sprite; life: number; from: THREE.Vector3 }[] = [];
  private smokeClock = 0;
  private region = "";
  private state: WorldState | null = null;
  private target = { cx: 0, cz: 0, half: 6 };
  private view = { cx: 0, cz: 0, half: 6 };
  private width = 1;
  private height = 1;
  private ratio = 0.82;
  private raycaster = new THREE.Raycaster();
  private started = performance.now();
  private firstUpdate = true;

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
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.land, this.empties, this.gate.group);
    this.gate.group.position.set(GATE.x + 0.15, 0, GATE.y + 1);
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight("#FFB45A", 0, 4.5, 1.6);
      this.lanterns.push(l);
      this.scene.add(l);
    }
    this.lanterns[0]?.position.set(GATE.x + 0.35, 1.1, GATE.y + 1.85);
    this.lanterns[1]?.position.set(STORE.x + 1.1, 1.0, STORE.y + 0.8);
  }

  setSize(width: number, height: number, ratio: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.ratio = ratio;
    this.renderer.setSize(this.width, this.height, false);
  }

  update(state: WorldState) {
    this.state = state;
    if (state.region !== this.region) this.buildLand(state.region);
    this.light(state.phase);

    const { placed, empties } = placeWorkshops(state.plots, state.maxPlots);
    const now = performance.now();
    const seen = new Set<string>();
    for (const { item, at } of placed) {
      seen.add(item.id);
      const key = `${item.type}|${item.level}|${at.x}|${at.y}`;
      const old = this.plots.get(item.id);
      if (old && old.key === key) continue;
      if (old) this.scene.remove(old.model.group);
      const model = workshopModel(item.type, item.level);
      model.group.position.set(at.x + 1, 0, at.y + 1);
      model.group.userData = { kind: "plot", id: item.id };
      this.scene.add(model.group);
      // A new building or level rises from the ground (not on the first look), in golden sparks.
      this.plots.set(item.id, { key, model, at, born: this.firstUpdate ? 0 : now });
      if (!this.firstUpdate) this.burst(new THREE.Vector3(at.x + 1, 0.4, at.y + 1));
    }
    // Goods just collected: crates fly from the workshop to the store.
    for (const { item, at } of placed) {
      const key = item.gain?.key;
      if (!key || this.gains.get(item.id) === key) continue;
      this.gains.set(item.id, key);
      if (this.firstUpdate || state.still) continue;
      const to = new THREE.Vector3(STORE.x + STORE.w / 2, 0.5, STORE.y + STORE.d / 2);
      for (let i = 0; i < 3; i++) {
        const crate = new THREE.Group();
        box(crate, 0.2, 0.18, 0.2, i % 2 ? "wood-light" : "wood", 0, -0.09, 0, 0.025);
        crate.position.set(at.x + 1, 0.6, at.y + 1);
        this.scene.add(crate);
        this.flights.push({
          mesh: crate,
          from: crate.position.clone(),
          to,
          t: -i * 0.12,
          dur: 0.9,
        });
      }
    }
    for (const [id, e] of this.plots) {
      if (!seen.has(id)) {
        this.scene.remove(e.model.group);
        this.plots.delete(id);
      }
    }
    const emptyKey = empties.map((c) => `${c.x},${c.y}`).join(";");
    if (emptyKey !== this.emptyKey) this.empties.clear();
    for (const at of emptyKey !== this.emptyKey ? empties : []) {
      const g = emptyPlotModel();
      g.position.set(at.x + 1, 0, at.y + 1);
      g.userData = { kind: "empty" };
      this.empties.add(g);
    }
    this.emptyKey = emptyKey;

    // The store's piles follow the stock (rebuilt by steps of 30 units).
    const pileKey = Math.min(8, Math.ceil(state.stock / 30));
    if (pileKey !== this.storeKey) {
      if (this.store) this.scene.remove(this.store);
      this.store = storeModel(state.stock);
      this.store.position.set(STORE.x + STORE.w / 2, 0, STORE.y + STORE.d / 2);
      this.store.userData = { kind: "store" };
      this.scene.add(this.store);
      this.storeKey = pileKey;
    }

    const vSeen = new Set<string>();
    for (const v of state.vehicles) {
      vSeen.add(v.id);
      let e = this.vehicles.get(v.id);
      if (!e || e.type !== v.type) {
        if (e) this.scene.remove(e.model.group);
        const model = vehicleModel(v.type);
        model.group.userData = { kind: "vehicle", id: v.id };
        this.scene.add(model.group);
        e = { model, type: v.type, pos: this.vehicleSpot(v) };
        model.group.position.copy(e.pos);
        this.vehicles.set(v.id, e);
      }
      if (e.model.cargo) e.model.cargo.visible = v.where === "out" && !!v.load;
      if (e.model.cargo && v.load)
        (e.model.cargo.material as THREE.MeshStandardMaterial) = mat(
          v.load,
        ) as THREE.MeshStandardMaterial;
    }
    for (const [id, e] of this.vehicles) {
      if (!vSeen.has(id)) {
        this.scene.remove(e.model.group);
        this.vehicles.delete(id);
      }
    }

    const wSeen = new Set<string>();
    state.workers.forEach((w, i) => {
      wSeen.add(w.id);
      const home = placed.find((p) => p.item.id === w.plot)?.at;
      if (!home) return;
      let e = this.workers.get(w.id);
      if (!e) {
        const model = workerModel(i);
        model.group.userData = { kind: "worker", id: w.id };
        this.scene.add(model.group);
        e = { model, round: [], door: home, phase: (i * 0.37) % 1 };
        this.workers.set(w.id, e);
      }
      e.round = workerRound(home, i);
      e.door = { x: home.x + 0.55 + (i % 2) * 0.9, y: home.y + 2.3 };
    });
    for (const [id, e] of this.workers) {
      if (!wSeen.has(id)) {
        this.scene.remove(e.model.group);
        this.workers.delete(id);
      }
    }

    // The frame: what is shown, the yard and the gate.
    const shown = [...placed.map((p) => p.at), ...empties];
    const b = frameBounds(shown);
    this.target = { cx: (b.minX + b.maxX) / 2, cz: (b.minY + b.maxY) / 2, half: 0 };
    this.target.half = this.fitHalf(b);
    if (this.firstUpdate) this.view = { ...this.target };
    this.firstUpdate = false;
  }

  /** The half-height of the view that holds the bounds, roofs included, in the frame's ratio. */
  private fitHalf(b: { minX: number; maxX: number; minY: number; maxY: number }): number {
    const dir = new THREE.Vector3(1, 1.05, 1).normalize();
    const cam = new THREE.Object3D();
    cam.position.copy(dir);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorld.clone().invert();
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minY + b.maxY) / 2;
    let w = 0;
    let h = 0;
    for (const x of [b.minX, b.maxX])
      for (const z of [b.minY, b.maxY])
        for (const y of [0, 1.6]) {
          const p = new THREE.Vector3(x - cx, y, z - cz).applyMatrix4(inv);
          w = Math.max(w, Math.abs(p.x));
          h = Math.max(h, Math.abs(p.y));
        }
    return Math.max(h, w * this.ratio) * 1.02;
  }

  private vehicleSpot(v: DomainVehicle): THREE.Vector3 {
    const vs = this.state?.vehicles ?? [];
    if (v.where === "home") {
      const i = vs.filter((x) => x.where === "home").indexOf(v);
      const p = PARKING(Math.max(0, i));
      return new THREE.Vector3(p.x, 0, p.y);
    }
    const lane = vs.filter((x) => x.where !== "home").indexOf(v) % 2;
    const p = onRoad(v.where === "out" ? v.progress : 1 - v.progress, lane);
    return new THREE.Vector3(p.x, 0, p.y);
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
    // Haze only far beyond the domain: the land fades into the sky at the edges.
    this.scene.fog = new THREE.Fog(l.fog, 75, 110);
    const night = phase === "night";
    for (const lamp of this.lanterns) lamp.intensity = night ? 2.2 : phase === "dusk" ? 0.6 : 0;
    const lit = mat("window-lit");
    const dark = mat("window");
    for (const e of this.plots.values())
      for (const w of e.model.windows) w.material = night ? lit : dark;
    this.gate.lamp.material = night || phase === "dusk" ? lit : dark;
    for (const lamp of this.lamps) lamp.material = night || phase === "dusk" ? lit : dark;
  }

  private buildLand(region: string) {
    this.region = region;
    this.land.clear();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(GRASS[region] ?? "grass"));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(5, 0, 4);
    ground.receiveShadow = true;
    const tex = (ground.material as THREE.MeshStandardMaterial).map;
    if (tex) tex.repeat.set(30, 30);
    this.land.add(ground);
    // Paths between the plots and along the yard; the yard's paving; the road out.
    box(this.land, 14, 0.02, 0.85, "path", 6, 0, 8.65, 0);
    for (const x of [2.5, 5.5, 8.5]) box(this.land, 0.75, 0.02, 12.5, "path", x, 0, 2.4, 0);
    for (const z of [2.5, 5.5]) box(this.land, 12, 0.02, 0.7, "path", 5.5, 0, z, 0);
    box(
      this.land,
      YARD.w + 0.8,
      0.04,
      YARD.d + 0.1,
      "paving",
      YARD.x + YARD.w / 2 - 0.1,
      0,
      YARD.y + YARD.d / 2,
      0.02,
    );
    box(this.land, 9, 0.025, 1.3, "path", GATE.x + 4.5, 0, YARD.y + 1, 0);
    // Low stone walls along the yard.
    box(
      this.land,
      YARD.w + 0.7,
      0.18,
      0.1,
      "stone",
      YARD.x + YARD.w / 2 - 0.1,
      0,
      YARD.y + YARD.d + 0.05,
      0.03,
    );
    // Trees around the domain, cypresses in Terraferma, firs in the mountains.
    const trees: [number, number, number][] = [
      [-1.8, 1, 1.1],
      [-1.6, 4.4, 0.9],
      [-2.0, 7.6, 1.0],
      [12.8, 1.5, 1.1],
      [12.5, 5, 0.9],
      [1.5, -2.0, 1.0],
      [7.6, -1.8, 1.1],
      [-1.3, 11.8, 0.9],
      [-3.2, 2.8, 1.2],
      [14.2, 3.2, 1.0],
      [10.5, -2.6, 0.9],
      [-2.6, -1.4, 1.0],
    ];
    // The yard's life: a well, barrels by the store, lamps along the paths.
    well(this.land, 8.3, 10.75);
    barrel(this.land, 2.45, 9.55);
    barrel(this.land, 2.7, 9.75);
    barrel(this.land, 2.4, 9.85);
    this.lamps = [2.95, 5.95, 8.95].map((x) => lampPost(this.land, x, 8.15));
    // Bushes, flowers and rocks along the paths and around the domain.
    const bushTone = region === "dolomites" ? "#3E7A4E" : "#4E8A4A";
    for (const [x, z, sc] of [
      [-0.6, 8.2, 1],
      [11.6, 8.1, 0.9],
      [-0.7, 2.6, 0.8],
      [11.7, 2.7, 1],
      [2.4, -0.7, 0.9],
      [8.6, -0.8, 0.8],
      [-1.1, 5.4, 1.1],
      [12.0, 5.6, 0.9],
    ] as const) {
      bush(this.land, x, z, sc, bushTone);
    }
    const blooms = ["#E2694F", "#E0AD4B", "#8E6BD8", "#F2A3B3"];
    for (const [i, [x, z]] of [
      [-0.5, 7.4],
      [11.5, 7.2],
      [-0.4, 1.4],
      [11.6, 1.6],
      [5.5, -0.7],
      [-1.4, 9.2],
    ].entries()) {
      flowers(this.land, x ?? 0, z ?? 0, blooms[i % blooms.length] ?? "#E2694F");
    }
    for (const [x, z, sc] of [
      [-2.6, 6.2, 1],
      [13.4, 7.4, 0.8],
      [4.2, -2.4, 0.9],
      [-3.4, 9.8, 1.2],
      [15.0, 9.6, 1],
    ] as const) {
      rock(this.land, x, z, sc);
    }
    const tone = region === "dolomites" ? "#2F6345" : region === "lagoon" ? "#4C7A55" : "#3F7A4A";
    for (const [x, z, s] of trees) tree(this.land, x, z, s, tone);
    if (region === "lagoon") {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 10), mat("water"));
      water.rotation.x = -Math.PI / 2;
      water.position.set(5, 0.03, -9.5);
      water.receiveShadow = true;
      this.land.add(water);
      box(this.land, 60, 0.12, 0.25, "stone", 5, 0, -4.4, 0.03);
    }
    if (region === "dolomites") {
      for (const [x, z, s] of [
        [-4, -9, 1.2],
        [3, -11, 1.6],
        [10, -9.5, 1.3],
        [16, -7, 1.1],
      ] as const) {
        const m = new THREE.Group();
        m.position.set(x, 0, z);
        m.scale.setScalar(s);
        const rock = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.2, 6), mat("#7D8C92"));
        rock.position.y = 2.1;
        rock.castShadow = true;
        rock.receiveShadow = true;
        const snow = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 6), mat("#F4F1EA"));
        snow.position.y = 3.4;
        m.add(rock, snow);
        this.land.add(m);
      }
    }
    if (region === "terraferma") {
      // Distant fields, in strips of gold and green.
      for (let i = 0; i < 5; i++) {
        box(this.land, 3.2, 0.03, 1.4, i % 2 ? "#C9A44A" : "#7E9E48", -6 + i * 3.4, 0, -6.2, 0);
      }
    }
  }

  /** Advances the scene to time t (ms) and draws it. */
  frame(t: number) {
    const state = this.state;
    if (!state) return;
    const dt = Math.min(0.1, (t - (this.last || t)) / 1000);
    this.last = t;
    const s = (t - this.started) / 1000;
    const k = 1 - Math.exp(-dt * 4);

    // The camera eases towards the frame when the domain grows.
    this.view.cx += (this.target.cx - this.view.cx) * k;
    this.view.cz += (this.target.cz - this.view.cz) * k;
    this.view.half += (this.target.half - this.view.half) * k;
    const aspect = this.width / this.height;
    const half = this.view.half;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    const look = new THREE.Vector3(this.view.cx, 0, this.view.cz);
    this.camera.position
      .copy(look)
      .add(new THREE.Vector3(1, 1.05, 1).normalize().multiplyScalar(60));
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    // The sun follows the frame, its shadows covering what is shown.
    this.sun.position.copy(look).add(new THREE.Vector3(6, 12, -3));
    this.sun.target.position.copy(look);
    const sc = this.sun.shadow.camera;
    const r = half * 1.9;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 0.5;
    sc.far = 60;
    sc.updateProjectionMatrix();

    const moving = !state.still;
    // Workshops: rising when just built, turning, swaying, glowing and smoking while they work.
    const now = performance.now();
    for (const [id, e] of this.plots) {
      const plot = state.plots.find((p) => p.id === id);
      const working = plot?.state === "running" || plot?.state === "ready";
      const age = e.born ? (now - e.born) / 700 : 1;
      if (age < 1) {
        const bounce = 1 + Math.sin(age * Math.PI) * 0.12 * (1 - age);
        e.model.group.scale.set(1, Math.max(0.01, easeOut(age)) * bounce, 1);
      } else if (e.model.group.scale.y !== 1) {
        e.model.group.scale.set(1, 1, 1);
      }
      if (moving && working)
        for (const sp of e.model.spin) sp.obj.rotation[sp.axis] -= sp.speed * dt;
      if (moving)
        for (const [i, w] of e.model.sway.entries()) w.rotation.z = Math.sin(s * 1.6 + i) * 0.06;
      for (const f of e.model.fire) {
        f.material = working ? mat("glow") : mat("#2A1A14");
      }
    }

    // Smoke: soft puffs rising from chimneys and pits while they work.
    if (moving) {
      this.smokeClock += dt;
      if (this.smokeClock > 0.45) {
        this.smokeClock = 0;
        for (const [id, e] of this.plots) {
          const plot = state.plots.find((p) => p.id === id);
          if (plot?.state !== "running") continue;
          for (const from of e.model.smoke) this.puff(e.model.group.localToWorld(from.clone()));
        }
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      if (!p) continue;
      p.life += dt / 3;
      if (p.life >= 1) {
        this.scene.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).dispose();
        this.smoke.splice(i, 1);
        continue;
      }
      p.sprite.position.set(
        p.from.x + p.life * 0.35,
        p.from.y + p.life * 1.3,
        p.from.z - p.life * 0.15,
      );
      const size = 0.18 + p.life * 0.5;
      p.sprite.scale.set(size, size, size);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - p.life);
    }

    // Vehicles drive to their spot (the depot or their place on the road), wheels turning.
    for (const v of state.vehicles) {
      const e = this.vehicles.get(v.id);
      if (!e) continue;
      const goal = this.vehicleSpot(v);
      const before = e.model.group.position.clone();
      e.model.group.position.lerp(goal, 1 - Math.exp(-dt * 2.5));
      const moved = e.model.group.position.distanceTo(before);
      e.model.group.rotation.y = v.where === "back" ? Math.PI : 0;
      const rolling = moving && (moved > 0.0005 || v.where !== "home");
      for (const w of e.model.wheels) if (rolling) w.rotation.z -= dt * 3;
      for (const [i, leg] of e.model.legs.entries())
        leg.rotation.z = rolling ? Math.sin(s * 9 + i * Math.PI) * 0.4 : 0;
    }

    // Workers walk their rounds while their workshop works, and wait at its door when it does not.
    for (const w of state.workers) {
      const e = this.workers.get(w.id);
      if (!e || e.round.length === 0) continue;
      const g = e.model.group;
      if (w.walking && moving) {
        const speed = w.need === "hungry" ? 0.45 : 0.75;
        const len = pathLength(e.round);
        const { at, heading } = alongPath(e.round, e.phase + (s * speed) / len);
        g.position.set(at.x, 0, at.y);
        g.rotation.y = heading;
        const swing = Math.sin(s * 10 + e.phase * 20);
        for (const [i, a] of e.model.arms.entries()) a.rotation.x = swing * 0.6 * (i ? 1 : -1);
        for (const [i, l] of e.model.legs.entries()) l.rotation.x = swing * 0.6 * (i ? -1 : 1);
        e.model.body.position.y = Math.abs(swing) * 0.015;
      } else {
        g.position.set(e.door.x, 0, e.door.y);
        g.rotation.y = 0.6;
        for (const a of e.model.arms) a.rotation.x = 0;
        for (const l of e.model.legs) l.rotation.x = 0;
        e.model.body.position.y = 0;
      }
    }

    // Crates in flight, an arc to the store; sparks falling.
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      if (!f) continue;
      f.t += dt / f.dur;
      if (f.t >= 1) {
        this.scene.remove(f.mesh);
        this.flights.splice(i, 1);
        continue;
      }
      const k = Math.max(0, f.t);
      f.mesh.visible = f.t >= 0;
      f.mesh.position.lerpVectors(f.from, f.to, k);
      f.mesh.position.y += Math.sin(k * Math.PI) * 1.6;
      f.mesh.rotation.set(k * 4, k * 3, 0);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      if (!sp) continue;
      sp.life += dt / 1.1;
      if (sp.life >= 1) {
        this.scene.remove(sp.sprite);
        (sp.sprite.material as THREE.SpriteMaterial).dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      sp.v.y -= dt * 3.2;
      sp.sprite.position.addScaledVector(sp.v, dt);
      (sp.sprite.material as THREE.SpriteMaterial).opacity = 1 - sp.life;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /** Golden sparks bursting from a new building or level. */
  private burst(at: THREE.Vector3) {
    if (this.state?.still) return;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const sprite = new THREE.Sprite(sparkMaterial());
      sprite.position.copy(at);
      sprite.scale.setScalar(0.14 + (i % 3) * 0.04);
      this.scene.add(sprite);
      this.sparks.push({
        sprite,
        v: new THREE.Vector3(Math.cos(a) * 1.4, 2.6 + (i % 4) * 0.5, Math.sin(a) * 1.4),
        life: 0,
      });
    }
  }

  private last = 0;

  private puff(at: THREE.Vector3) {
    if (this.smoke.length > 60) return;
    const sprite = new THREE.Sprite(smokeMaterial());
    sprite.position.copy(at);
    this.scene.add(sprite);
    this.smoke.push({ sprite, life: 0, from: at });
  }

  /** What lies under a point of the canvas (css pixels from its top left). */
  pick(x: number, y: number): Hit | null {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [
      ...[...this.plots.values()].map((e) => e.model.group),
      ...this.empties.children,
      ...[...this.vehicles.values()].map((e) => e.model.group),
      ...[...this.workers.values()].map((e) => e.model.group),
      ...(this.store ? [this.store] : []),
    ];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.kind) o = o.parent;
      const d = o?.userData as { kind?: string; id?: string } | undefined;
      if (!d?.kind) continue;
      if (d.kind === "plot" && d.id) return { kind: "plot", id: d.id };
      if (d.kind === "vehicle" && d.id) return { kind: "vehicle", id: d.id };
      if (d.kind === "worker" && d.id) return { kind: "worker", id: d.id };
      if (d.kind === "empty") return { kind: "empty" };
      if (d.kind === "store") return { kind: "store" };
    }
    // A workshop is also taken when the point falls on its plot, between its parts.
    const ground = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
    if (ground) {
      for (const [id, e] of this.plots) {
        if (
          ground.x >= e.at.x &&
          ground.x <= e.at.x + 2 &&
          ground.z >= e.at.y &&
          ground.z <= e.at.y + 2
        ) {
          return { kind: "plot", id };
        }
      }
    }
    return null;
  }

  /** Where the bubbles go: above each workshop's roof, each vehicle, each worker, the store. */
  anchors(): Anchor[] {
    const out: Anchor[] = [];
    const v = new THREE.Vector3();
    const put = (key: string, p: THREE.Vector3) => {
      v.copy(p).project(this.camera);
      out.push({ key, x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height });
    };
    for (const [id, e] of this.plots) {
      const g = e.model.group.position;
      put(`plot:${id}`, new THREE.Vector3(g.x, e.model.top + 0.35, g.z));
      put(`plate:${id}`, new THREE.Vector3(g.x + 0.15, 0.05, g.z + 1.0));
    }
    for (const [i, c] of this.empties.children.entries()) {
      put(`empty:${i}`, c.position.clone().setY(0.2));
    }
    for (const [id, e] of this.vehicles)
      put(`vehicle:${id}`, e.model.group.position.clone().setY(0.95));
    for (const [id, e] of this.workers)
      put(`worker:${id}`, e.model.group.position.clone().setY(0.62));
    put("store", new THREE.Vector3(STORE.x + STORE.w / 2, 1.9, STORE.y + STORE.d / 2));
    put("gate", new THREE.Vector3(GATE.x + 0.15, 2.0, GATE.y + 1));
    return out;
  }

  dispose() {
    for (const p of this.smoke) this.scene.remove(p.sprite);
    this.scene.clear();
    this.renderer.dispose();
    disposeGeometries();
    disposeMaterials();
    smokeMat?.dispose();
    smokeMat = null;
    sparkMat?.dispose();
    sparkMat = null;
  }
}

function easeOut(x: number): number {
  return 1 - (1 - Math.min(1, x)) ** 3;
}

let sparkMat: THREE.SpriteMaterial | null = null;

function sparkMaterial(): THREE.SpriteMaterial {
  if (!sparkMat) {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,244,200,1)");
    grad.addColorStop(0.4, "rgba(240,200,110,0.9)");
    grad.addColorStop(1, "rgba(224,173,75,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    sparkMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
  return sparkMat.clone();
}

let smokeMat: THREE.SpriteMaterial | null = null;

function smokeMaterial(): THREE.SpriteMaterial {
  if (!smokeMat) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.6, "rgba(240,236,228,0.5)");
    grad.addColorStop(1, "rgba(240,236,228,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    smokeMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    });
  }
  return smokeMat.clone();
}
