/**
 * The Carte on square tiles (docs/plan-porcellana.md lot 3): the house's board drawn with the kit —
 * the tiles dropping into place, the roads of accent from each workshop to its fondaco, the « + »
 * plots round, the towns as islands, the sea along the coasts. A place touched lifts, takes the
 * blush and opens its card beside its pin; the card's round button opens its dock (the game's
 * target, as the map of before told it). It stands where EmpireMap stood when the world's map is of
 * square tiles.
 */
import "../porcellana.css";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GoodsMark } from "../../art/goods.js";
import type { Placing, Target } from "../../empire/map/logic.js";
import { vehiclePose } from "../../empire/map/logic.js";
import { Guard3D } from "../../empire/map3d/Guard.js";
import { MAP_3D } from "../../empire/map3d/flag.js";
import { welcomeStep } from "../../empire/next.js";
import type { EmpirePayload } from "../../empire/types.js";
import { fr } from "../../i18n.js";
import { sound } from "../../sound.js";
import { PlaceCard, type PlaceCardHandle } from "../PlaceCard.js";
import { Stage } from "../Stage.js";
import { easeOutCubic, pinOut, routesDrawn, tileDelay, tileDrop } from "../arrival.js";
import { bake } from "../bake.js";
import {
  flipAngle,
  flipDelay,
  flipLift,
  flipNow,
  flipTotal,
  flipZoom,
  showsBack,
} from "../flip.js";
import { type Palette, createPalette } from "../materials.js";
import { slab } from "../models/ground.js";
import type { Built, ModelOpts } from "../models/model.js";
import type { Vehicle } from "../models/vehicles.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath } from "../ribbon.js";
import { Blush } from "../selection.js";
import { BISCUIT, BOARD, CAMERA, FLIP, RIBBON, SELECT } from "../tokens.js";
import { FlatBoard } from "./FlatBoard.js";
import { PARK, modelOf, vehicleModel } from "./models.js";
import {
  type BoardPlace,
  type BoardScene,
  type BoardTile,
  type PinBadge,
  boardOf,
} from "./scene.js";

const S = BOARD.tile + BOARD.gap;
const PHONE = () => window.innerWidth < 640;

interface Live {
  key: string;
  sig: string;
  group: Group;
  built: Built | null;
  opts: ModelOpts;
  /** When it started to drop (the scene's clock). */
  from: number;
  lift: number;
}

interface Shared {
  scene: BoardScene;
  chosen: string | null;
  hover: string | null;
  pins: Map<string, HTMLButtonElement>;
  card: PlaceCardHandle | null;
  target: Vector3;
  goHome: number;
  /** How close the camera comes home: 1, the board; nearer, the Fondaco and its workshops. */
  homeZoom: number;
  /** A place being put down: the free tiles of the house's show, to pick. */
  placing: boolean;
  /** The house's payload and the server's time at the last render, for the vehicles' poses. */
  p: EmpirePayload;
  now: number;
  nowAt: number;
  /**
   * A place the camera goes to by itself, its card closed: the welcome's town while its order is
   * delivered (the first steps, lot 4), so that the mule is seen arriving.
   */
  focus: string | null;
  /** A vehicle just sent: the camera walks beside it (P3-01 of the players' audit). */
  follow: string | null;
  /** Keys asked of the map: a step to pan (in screens), a factor to zoom. */
  pan: [number, number];
  zoom: number;
  /** The way into the Terraferma, or out of it, under way (porcellana/flip.ts). */
  flip: FlipRun | null;
  /** A tile's width on the screen now, in pixels (the Terraferma's board matches it). */
  tilePx: number;
}

/** The tiles turning over from the Campo (the way into the Terraferma), or back face up. */
interface FlipRun {
  backwards: boolean;
  /** The colour of a tile's back, from its offset in tiles to the Campo. */
  back: (dx: number, dz: number) => number;
  /** When it started, in seconds of the page's clock (-1: at the next frame). On the wall's clock,
   * not the scene's: the Terraferma's scene fades in on the same, a slow device keeps them as one. */
  start: number;
  /** The camera's zoom face up, and the place it looked at. */
  z0: number;
  at: Vector3 | null;
  done: boolean;
}

/** A tile's middle in the scene (x, z), from its tile coordinates. */
const world = (i: number, j: number): [number, number] => [i * S, j * S];

function Board({
  sh,
  onPick,
  onVehicle,
}: {
  sh: Shared;
  onPick: (id: string | null) => void;
  onVehicle: (id: string) => void;
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P: Palette = useMemo(() => createPalette(), []);
  // The Porta not open yet, all unglazed, its accent too (P1-06).
  const closed: Palette = useMemo(
    () => createPalette({ biscuit: true, accent: BISCUIT.wall2 }),
    [],
  );
  const blush = useMemo(() => new Blush(P), [P]);
  const root = useMemo(() => new Group(), []);
  const tiles = useRef(new Map<string, Live>());
  const clock = useRef({ t: live ? 0 : 10, life: 0 });
  const vehicles = useRef(new Map<string, Vehicle & { opts: ModelOpts }>());

  // The roads: a ribbon each, one texture whose chevrons run.
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) drawChevron(ctx, `#${P.accentColour.getHexString()}`);
    const t = new CanvasTexture(canvas);
    t.wrapS = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [P]);
  const ribbonMat = useMemo(
    () =>
      new MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [tex],
  );
  // A road with nothing on it is a still ribbon, paler, without chevrons: the chevrons run only
  // while a vehicle goes along it (P1-02 of the players' audit: no flow promised that is not there).
  const stillMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: P.accentColour.clone().lerp(new Color("#ffffff"), RIBBON.still),
        roughness: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [P],
  );
  const roads = useRef<{
    sig: string;
    meshes: Mesh[];
    samples: Vector3[];
    each: Vector3[][];
  }>({
    sig: "",
    meshes: [],
    samples: [],
    each: [],
  });
  const ring = useMemo(() => {
    const m = new Mesh(
      new RingGeometry(SELECT.ring[0], SELECT.ring[1], 72),
      new MeshBasicMaterial({
        color: P.accentColour,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    root.add(m);
    return m;
  }, [P, root]);

  /** The board brought to the scene now: the tiles changed rebuilt, the new ones dropping in. */
  const sync = (scene: BoardScene) => {
    const size = scene.tileSize;
    const toWorld = ([x, y]: [number, number]) =>
      new Vector3((x / size - 0.5) * S, RIBBON.lift, (y / size - 0.5) * S);
    const roadSig = scene.roads.map((r) => `${r.from}>${r.to}:${r.pts.length}`).join("|");
    if (roadSig !== roads.current.sig) {
      for (const m of roads.current.meshes) {
        root.remove(m);
        m.geometry.dispose();
      }
      const curves = scene.roads
        .filter((r) => r.pts.length >= 2)
        .map((r) => roundedPath(r.pts.map(toWorld)));
      const each = curves.map((c) => c.getSpacedPoints(Math.ceil(c.getLength() / 0.5)));
      roads.current = {
        sig: roadSig,
        meshes: curves.map((c) => {
          const m = new Mesh(ribbonGeometry(c), stillMat);
          m.receiveShadow = true;
          root.add(m);
          return m;
        }),
        samples: each.flat(),
        each,
      };
    }
    const seen = new Set<string>();
    for (const tile of scene.tiles) {
      seen.add(tile.key);
      const sig = `${tile.model}|${tile.size ?? ""}|${tile.water}|${tile.model === "lane" ? roadSig : ""}|${(tile.crates ?? []).map(Number).join("")}|${(tile.decor ?? []).join(",")}|${tile.loyalty ?? 0}|${tile.raft ? 1 : 0}|${tile.biscuit ? 1 : 0}|${(tile.stalls ?? []).map((x) => `${x.n}${x.hot ? "h" : ""}`).join(",")}`;
      const was = tiles.current.get(tile.key);
      if (was && was.sig === sig) continue;
      if (was) root.remove(was.group);
      tiles.current.set(tile.key, build(tile, sig, was));
    }
    for (const [k, l] of tiles.current)
      if (!seen.has(k)) {
        root.remove(l.group);
        tiles.current.delete(k);
      }
  };

  const build = (tile: BoardTile, sig: string, was: Live | undefined): Live => {
    const [x, z] = world(tile.i, tile.j);
    const g = new Group();
    g.position.set(x, 0, z);
    g.add(slab(P, tile.water));
    const samples = roads.current.samples;
    const opts: ModelOpts = {
      seed: tile.seed,
      running: tile.running,
      keepOff: (lx, lz) =>
        samples.some((p) => (p.x - x - lx) ** 2 + (p.z - z - lz) ** 2 < 1.15 * 1.15),
    };
    const built = modelOf(tile.biscuit ? closed : P, tile, opts);
    if (built) g.add(built.group);
    root.add(g);
    bake(g);
    g.userData.tileKey = tile.key;
    // A tile there before keeps its place; a new one drops in now (bought, built).
    const from = was
      ? was.from
      : clock.current.t > 3
        ? clock.current.t
        : tileDelay(tile.i - minI.current, tile.j - minJ.current, tile.water);
    return { key: tile.key, sig, group: g, built, opts, from, lift: was?.lift ?? 0 };
  };
  const minI = useRef(0);
  const minJ = useRef(0);

  // The camera: orthographic, three quarters, turning all the way round; over the first fondaco.
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    const vh = aspect >= 1 ? Math.max(30, 48 / aspect) : 32;
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 600;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = CAMERA.minZoom;
    c.maxZoom = CAMERA.maxZoom;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);
  const look = (at: Vector3) => {
    const { azimuth: az, elevation: el, distance: d } = CAMERA;
    camera.position.set(
      at.x + Math.sin(az) * Math.cos(el) * d,
      Math.sin(el) * d,
      at.z + Math.cos(az) * Math.cos(el) * d,
    );
    camera.lookAt(at);
    controls.target.copy(at);
  };
  const homeAt = () => {
    const [i = 0, j = 0] = sh.scene.home.split(",").map(Number);
    const [x, z] = world(i, j);
    return new Vector3(x, 0, z);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, at the opening.
  useEffect(() => {
    minI.current = Math.min(...sh.scene.tiles.map((t) => t.i));
    minJ.current = Math.min(...sh.scene.tiles.map((t) => t.j));
    sync(sh.scene);
    syncZone(sh.scene);
    look(homeAt());
  }, []);

  const fly = useRef({
    from: new Vector3(),
    to: new Vector3(),
    z0: 1,
    z1: 1,
    t: 1,
    last: "",
    home: 0,
  });
  // The Fondaco's zone (the first steps, lot 3): a pale ring of accent round it, and the next
  // level's, fainter, while the Fondaco is chosen.
  const zone = useRef<{ sig: string; now: Mesh | null; next: Mesh | null }>({
    sig: "",
    now: null,
    next: null,
  });
  const zoneRing = (radius: number, opacity: number) => {
    const m = new Mesh(
      new RingGeometry(Math.max(0.1, radius - 0.18), radius, 128),
      new MeshBasicMaterial({
        color: P.accentColour,
        transparent: true,
        opacity,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 1;
    root.add(m);
    return m;
  };
  const syncZone = (scene: BoardScene) => {
    const z = scene.zone;
    const sig = z ? `${z.x},${z.y},${z.reach},${z.next ?? ""},${scene.tileSize}` : "";
    if (sig === zone.current.sig) return;
    for (const m of [zone.current.now, zone.current.next])
      if (m) {
        root.remove(m);
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      }
    zone.current = { sig, now: null, next: null };
    if (!z) return;
    const size = scene.tileSize;
    const at = (m: Mesh) =>
      m.position.set((z.x / size - 0.5) * S, RIBBON.lift + 0.02, (z.y / size - 0.5) * S);
    const now = zoneRing((z.reach / size) * S, 0.42);
    at(now);
    const next = z.next ? zoneRing((z.next / size) * S, 0) : null;
    if (next) at(next);
    zone.current = { sig, now, next };
  };

  const tmp = useMemo(() => new Vector3(), []);
  // The way into the Terraferma: each tile's back, a slab glazed underneath with the Terraferma's
  // land at that place (one material a colour).
  const flipAxis = useMemo(() => new Vector3(), []);
  const flipPivot = useMemo(() => new Vector3(), []);
  const backMats = useMemo(() => new Map<number, MeshStandardMaterial>(), []);
  const backGeo = useMemo(() => new BoxGeometry(BOARD.tile, BOARD.thick, BOARD.tile), []);
  const backOf = (colour: number): Mesh => {
    let glaze = backMats.get(colour);
    if (!glaze) {
      glaze = new MeshStandardMaterial({ color: colour, roughness: 0.55 });
      backMats.set(colour, glaze);
    }
    const side = P.m("ground");
    // Box faces: +x, -x, +y, -y, +z, -z; the glaze underneath, up once turned.
    const m = new Mesh(backGeo, [side, side, side, glaze, side, side]);
    m.position.y = -BOARD.thick / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false;
    return m;
  };
  const lastScene = useRef(sh.scene);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const c = clock.current;
    c.t += dt;
    if (live) c.life += dt;
    if (lastScene.current !== sh.scene) {
      lastScene.current = sh.scene;
      sync(sh.scene);
      syncZone(sh.scene);
    }
    // The next level's zone shows while the Fondaco is chosen.
    const nextZone = zone.current.next;
    if (nextZone) {
      const mat = nextZone.material as MeshBasicMaterial;
      const want = sh.chosen?.startsWith("fondaco:") ? 0.3 : 0;
      mat.opacity += (want - mat.opacity) * Math.min(1, dt * 6);
      nextZone.visible = mat.opacity > 0.01;
    }
    const cam = camera as OrthographicCamera;
    // The board centred in what the screen leaves free (P1-03 of the players' audit): right of the
    // side panel on a computer, under the top bar everywhere, so that nothing chosen hides under them.
    const panel = size.width >= 1024 ? (22 * 16 + 20) / 2 : 0;
    const bar = size.width >= 1024 ? 48 : 28;
    const off = cam.view;
    if (!off || off.offsetX !== -panel || off.offsetY !== -bar || off.width !== size.width) {
      cam.setViewOffset(size.width, size.height, -panel, -bar, size.width, size.height);
      cam.updateProjectionMatrix();
    }
    const byKey = new Map(sh.scene.tiles.map((t) => [t.key, t]));
    const chosenKey = sh.scene.tiles.find((t) => t.place?.id === sh.chosen)?.key ?? null;
    const chosen = chosenKey ? (tiles.current.get(chosenKey) ?? null) : null;

    // The camera glides to what is chosen, or home when asked.
    const f = fly.current;
    const want = `${sh.chosen ?? ""}|${sh.goHome}|${sh.focus ?? ""}`;
    if (want !== f.last) {
      const homeAsked = sh.goHome !== f.home;
      f.home = sh.goHome;
      f.last = want;
      const focusKey = sh.focus
        ? sh.scene.tiles.find((t) => t.place?.id === sh.focus)?.key
        : undefined;
      const focused = !chosen && focusKey ? (tiles.current.get(focusKey) ?? null) : null;
      if (chosen || homeAsked || focused) {
        f.from.copy(controls.target);
        f.to.copy(chosen ? chosen.group.position : focused ? focused.group.position : homeAt());
        f.to.y = 0;
        f.z0 = cam.zoom;
        f.z1 = chosen
          ? PHONE()
            ? SELECT.zoomPhone
            : SELECT.zoomDesk
          : focused
            ? cam.zoom
            : sh.homeZoom;
        f.t = live ? 0 : 1;
        if (!live) {
          camera.position.add(f.to.clone().sub(controls.target));
          controls.target.copy(f.to);
          cam.zoom = f.z1;
          cam.updateProjectionMatrix();
        }
      }
    }
    if (f.t < 1) {
      f.t = Math.min(1, f.t + dt / SELECT.fly);
      const k = easeOutCubic(f.t);
      const next = f.from.clone().lerp(f.to, k);
      camera.position.add(next.clone().sub(controls.target));
      controls.target.copy(next);
      cam.zoom = f.z0 + (f.z1 - f.z0) * k;
      cam.updateProjectionMatrix();
    }
    // The keys of a computer: an arrow moves the map by a share of the screen, « + » and « - » zoom.
    if (sh.pan[0] !== 0 || sh.pan[1] !== 0 || sh.zoom !== 1) {
      const az = controls.getAzimuthalAngle();
      const across = (cam.right - cam.left) / cam.zoom;
      const step = new Vector3(Math.cos(az), 0, -Math.sin(az))
        .multiplyScalar(sh.pan[0] * across)
        .add(new Vector3(-Math.sin(az), 0, -Math.cos(az)).multiplyScalar(-sh.pan[1] * across));
      camera.position.add(step);
      controls.target.add(step);
      cam.zoom = Math.min(CAMERA.maxZoom, Math.max(CAMERA.minZoom, cam.zoom * sh.zoom));
      cam.updateProjectionMatrix();
      sh.pan = [0, 0];
      sh.zoom = 1;
    }
    controls.update();
    sh.target.copy(controls.target);

    // The tiles drop in, the chosen one lifts; what works, works (the game says so).
    for (const l of tiles.current.values()) {
      const tile = byKey.get(l.key);
      l.opts.running = !!tile?.running;
      const drop = tileDrop(c.t, l.from);
      const lift = chosen === l ? SELECT.lift : 0;
      l.lift += (lift - l.lift) * (live ? SELECT.liftEase : 1);
      l.group.position.y = drop.y + l.lift;
      l.group.visible = drop.visible;
      l.built?.tick?.(c.life, live ? dt : 0);
      if (l.built?.plus) {
        const on = sh.hover === tile?.place?.id || sh.chosen === tile?.place?.id;
        l.built.plus.position.y += ((on ? 0.12 : 0) - l.built.plus.position.y) * 0.15;
      }
    }
    const drawn = routesDrawn(c.t);
    for (const m of roads.current.meshes)
      m.geometry.setDrawRange(0, drawnIndices(m.geometry.index?.count ?? 0, drawn));
    if (live) tex.offset.x -= dt * RIBBON.speed;
    const moving: [number, number][] = [];

    // The vehicles: on their road while a hop is under way (the server's time), else parked at
    // their place, along its tile's south edge.
    const t = sh.now + (performance.now() - sh.nowAt);
    const tileSize = sh.scene.tileSize;
    const mine = sh.p.view?.vehicles.mine ?? [];
    const parked = new Map<string, number>();
    const seenV = new Set<string>();
    for (const v of mine) {
      seenV.add(v.id);
      let actor = vehicles.current.get(v.id);
      if (!actor) {
        const o: ModelOpts = { seed: 0, running: false };
        const made = vehicleModel(P, v.type, o);
        made.group.userData.vehicleId = v.id;
        made.group.traverse((x) => {
          x.userData.vehicleId = v.id;
        });
        root.add(made.group);
        actor = { ...made, opts: o };
        vehicles.current.set(v.id, actor);
      }
      const pose = vehiclePose(sh.p, v, t);
      let x = (pose.x / tileSize - 0.5) * S;
      let z = (pose.y / tileSize - 0.5) * S;
      let heading = -pose.angle;
      if (!pose.hop) {
        const k = parked.get(pose.place ?? "") ?? 0;
        parked.set(pose.place ?? "", k + 1);
        const [ox, oz] = PARK[k % PARK.length] as [number, number];
        x += ox;
        z += oz;
        heading = Math.PI;
      }
      if (pose.hop) moving.push([x, z]);
      actor.opts.running = !!pose.hop && live;
      actor.group.position.set(x, 0.02, z);
      // The camera walks beside the vehicle followed, softly (P3-01).
      if (sh.follow === v.id && pose.hop && !sh.chosen) {
        const k = Math.min(1, dt * 2.5);
        const dx = (x - controls.target.x) * k;
        const dz = (z - controls.target.z) * k;
        controls.target.x += dx;
        controls.target.z += dz;
        camera.position.x += dx;
        camera.position.z += dz;
      }
      actor.group.rotation.y = heading;
      actor.group.visible = drawn > 0.99;
      actor.tick(c.life);
    }
    for (const [id, a] of vehicles.current)
      if (!seenV.has(id)) {
        root.remove(a.group);
        vehicles.current.delete(id);
      }
    // The chevrons run on the roads a vehicle goes along now; the others stay still.
    roads.current.meshes.forEach((m, k) => {
      const pts = roads.current.each[k] ?? [];
      const busy = moving.some(([x, z]) => pts.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 0.6));
      m.material = busy ? ribbonMat : stillMat;
    });

    // The ring and the blush.
    const ringMat = ring.material as MeshBasicMaterial;
    if (chosen) {
      const at = chosen.group.position;
      ring.position.set(at.x, at.y + 0.035, at.z);
      ringMat.opacity += (SELECT.ringOpacity - ringMat.opacity) * 0.1;
    } else ringMat.opacity += (0 - ringMat.opacity) * 0.15;
    ring.visible = ringMat.opacity > 0.01;
    blush.update(chosen?.group ?? null, live);

    // The way into the Terraferma: the tiles turn over from the Campo, the camera draws back.
    const fl = sh.flip;
    if (fl) {
      const wall = flipNow();
      if (fl.start < 0) {
        fl.start = wall;
        if (!fl.backwards) {
          fl.z0 = cam.zoom;
          fl.at = controls.target.clone();
        }
        controls.enabled = false;
      }
      const ft = wall - fl.start;
      const campo = sh.scene.tiles.find((x) => x.place?.id.startsWith("campo:"));
      const [oi = 0, oj = 0] = campo ? [campo.i, campo.j] : sh.scene.home.split(",").map(Number);
      for (const l of tiles.current.values()) {
        const tile = byKey.get(l.key);
        if (!tile) continue;
        const di = tile.i - oi;
        const dj = tile.j - oj;
        const dist = Math.hypot(di, dj);
        const a = flipAngle(ft, flipDelay(dist), fl.backwards);
        // The top tips away from the Campo: about the axis up × (the way out).
        const ux = dist > 0 ? di / dist : 1;
        const uz = dist > 0 ? dj / dist : 0;
        flipAxis.set(uz, 0, -ux);
        l.group.quaternion.setFromAxisAngle(flipAxis, a);
        // Turned about the slab's middle, lifted at mid-turn.
        flipPivot.set(0, BOARD.thick / 2, 0).applyQuaternion(l.group.quaternion);
        const [x, z] = world(tile.i, tile.j);
        l.group.position.set(
          x + flipPivot.x,
          -BOARD.thick / 2 + flipPivot.y + flipLift(a),
          z + flipPivot.z,
        );
        const backSide = showsBack(a);
        let back = l.group.userData.back as Mesh | undefined;
        if (!back && backSide) {
          back = backOf(fl.back(di, dj));
          l.group.add(back);
          l.group.userData.back = back;
        }
        for (const o of l.group.children) o.visible = o === back ? backSide : !backSide;
      }
      for (const m of roads.current.meshes) m.visible = false;
      for (const a of vehicles.current.values()) a.group.visible = false;
      if (zone.current.now) zone.current.now.visible = false;
      ring.visible = false;
      // The camera: far back over the Campo, then home again on the way out.
      const k = flipZoom(ft, fl.backwards);
      cam.zoom = Math.max(0.05, fl.z0 * k);
      cam.updateProjectionMatrix();
      if (fl.at) {
        // The camera drifts over the Campo as it draws back, and home as it comes in again.
        const [cx, cz] = world(oi, oj);
        tmp.set(cx, 0, cz);
        const glide = Math.min(1, Math.max(0, (1 - k) / (1 - FLIP.zoomTo)));
        const next = fl.at.clone().lerp(tmp, glide);
        camera.position.add(next.clone().sub(controls.target));
        controls.target.copy(next);
      }
      if (fl.backwards && ft > flipTotal(true)) {
        // Face up again: everything as it was.
        for (const l of tiles.current.values()) {
          l.group.quaternion.identity();
          const tile = byKey.get(l.key);
          if (tile) {
            const [x, z] = world(tile.i, tile.j);
            l.group.position.set(x, 0, z);
          }
          const back = l.group.userData.back as Mesh | undefined;
          for (const o of l.group.children) o.visible = o !== back;
        }
        for (const m of roads.current.meshes) m.visible = true;
        for (const a of vehicles.current.values()) a.group.visible = true;
        if (zone.current.now) zone.current.now.visible = true;
        cam.zoom = fl.z0;
        cam.updateProjectionMatrix();
        controls.enabled = true;
        sh.flip = null;
      }
    }

    sh.tilePx = (S * size.height * cam.zoom) / (cam.top - cam.bottom);

    // The pins and the card follow the scene.
    const w = size.width;
    const h = size.height;
    // Two pins on the same spot (a tall campanile before a town behind it): the later one slips
    // just under, so that every town stays named (P1-24 of the players' audit).
    const shown: [number, number][] = [];
    for (const tile of sh.scene.tiles) {
      if (!tile.place) continue;
      const el = sh.pins.get(tile.place.id);
      const l = tiles.current.get(tile.key);
      if (!el || !l) continue;
      const pin = l.built?.pin ?? [0, 2, 0];
      tmp
        .set(...pin)
        .add(l.group.position)
        .project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      let y = (-tmp.y * 0.5 + 0.5) * h;
      for (let k = 0; k < 4; k++) {
        const hit = shown.some(
          ([sx, sy]) => Math.abs(sx - x) < PIN_GAP[0] && Math.abs(sy - y) < PIN_GAP[1],
        );
        if (!hit) break;
        y += PIN_GAP[1];
      }
      shown.push([x, y]);
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      // A pin with something to say stays in sight at every zoom (P0-12): a lot ready, a « + ».
      const out =
        !sh.flip &&
        (!tile.place.quiet || sh.chosen === tile.place.id || sh.placing || tile.place.ready) &&
        pinOut(c.t, l.from);
      el.dataset.out = String(out);
      if (tile.place.id === sh.chosen) sh.card?.place(x, y, w, h);
    }
  });

  const vehicleOf = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    for (let o: Object3D | null = e.object; o; o = o.parent)
      if (o.userData.vehicleId) return o.userData.vehicleId as string;
    return null;
  };
  const placeOf = (e: ThreeEvent<PointerEvent | MouseEvent>): BoardPlace | null => {
    for (let o: Object3D | null = e.object; o; o = o.parent) {
      const k = o.userData.tileKey as string | undefined;
      if (k) return sh.scene.tiles.find((t) => t.key === k)?.place ?? null;
    }
    return null;
  };
  return (
    <>
      <Stage target={sh.target} phone={PHONE()} hours={live} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard reaches each place by its pin, a button. */}
      <primitive
        object={root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const v = vehicleOf(e);
          if (v) onVehicle(v);
          else onPick(placeOf(e)?.id ?? null);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          const id = placeOf(e)?.id ?? null;
          sh.hover = id;
          gl.domElement.classList.toggle("pc-hot", !!id);
        }}
        onPointerOut={() => {
          sh.hover = null;
          gl.domElement.classList.remove("pc-hot");
        }}
      />
    </>
  );
}

/** What the game asks of its map (the keys, the places at the foot). */
export interface EmpireMapHandle {
  /** Up close on Venice's house, or back out to the map. */
  toggle(): void;
  /** Up close on Venice's house. */
  home(): void;
  /** Out to the map. */
  far(): void;
  /** Out of a fondaco's domain, back to the map around it. */
  leave(): void;
  /** Back over the house's sector (the « Carte » place touched again): the camera unfollowed. */
  recenter(): void;
  /**
   * « Maison » (3D): the camera back over the first fondaco; already there, its domain plunged into.
   */
  house(): void;
  /** The information layer shown (Alt held) or not. */
  info(on: boolean): void;
  /** The map moved a step (a key: -1, 0 or 1 on each axis), or zoomed by a factor. */
  pan(dx: number, dy: number): void;
  zoom(k: number): void;
  /**
   * The way into the Terraferma: every tile turns over from the Campo, the Terraferma's land on its
   * back (`back`, a colour from the offset to the Campo), the camera drawing back; `backwards`, the
   * way out, face up again.
   */
  flip(backwards: boolean, back?: (dx: number, dz: number) => number): void;
  /** A tile's width on the screen now, in pixels. */
  tilePx(): number;
}

/** A point picked to put a place down: its tile, its middle on the chart. */
export type Picked = { cell: string; x: number; y: number };

export interface PorcellanaMapProps {
  p: EmpirePayload;
  now: number;
  /** A place's round button pressed: the game opens its dock; null: nothing chosen any more. */
  onTarget: (t: Target | null) => void;
  /** The game's target now: when it closes its dock, the place is let go. */
  target: Target | null;
  /** A place being put down (the Remise, the Campo, the Porta, a fondaco): a free tile picked. */
  placing?: Placing | null;
  onPick?: (p: Picked | null) => void;
  /** The Fondaco's tab: up close on it, its bar at the foot (the region), or back out (null). */
  onDomain?: (region: string | null) => void;
}

/** How close two pins may stand on screen before the later one slips under (px). */
const PIN_GAP: [number, number] = [70, 26];

/** The workshops heard by their saw, by their furnace. */
const SAWS = new Set<string>(["lumber_camp", "sawmill", "rope_walk"]);
const KILNS = new Set<string>(["brickworks", "glassworks", "kiln"]);

const PorcellanaMap = forwardRef<EmpireMapHandle, PorcellanaMapProps>(function PorcellanaMap(
  { p, now, onTarget, target, placing = null, onPick, onDomain },
  ref,
) {
  // Read again each second at most: the workshops' states move with the clock.
  const second = Math.floor(now / 1_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `second` stands for `now`.
  const scene = useMemo(() => boardOf(p, second * 1_000), [p, second]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [carded, setCarded] = useState(false);
  const sh = useRef<Shared | null>(null);
  if (scene && !sh.current)
    sh.current = {
      scene,
      chosen: null,
      hover: null,
      pins: new Map(),
      card: null,
      target: new Vector3(),
      goHome: 0,
      focus: null,
      follow: null,
      homeZoom: 1,
      placing: false,
      p,
      now,
      nowAt: performance.now(),
      pan: [0, 0],
      zoom: 1,
      flip: null,
      tilePx: 0,
    };
  if (sh.current && scene) {
    sh.current.scene = scene;
    sh.current.placing = !!placing;
    sh.current.p = p;
    if (sh.current.now !== now) {
      sh.current.now = now;
      sh.current.nowAt = performance.now();
    }
    sh.current.chosen = chosen;
    const w = welcomeStep(p, now);
    // A vehicle on the road it took a minute and a half ago at most, or the welcome's own: the
    // camera follows it (P3-01 of the players' audit: the mule walked unseen, the camera at the town).
    const sent = (p.view?.vehicles.mine ?? []).find((v) =>
      v.legs.some(
        (l) =>
          l.departAt <= now &&
          now < l.arrivesAt &&
          (now - l.departAt < 90_000 ||
            (w?.phase === "onWay" && v.loads.some((o) => o.city === w.city))),
      ),
    );
    sh.current.follow = sent && !chosen ? sent.id : null;
    sh.current.focus =
      !sh.current.follow && w && (w.phase === "deliver" || w.phase === "onWay") && w.city
        ? `city:${w.city}`
        : null;
  }
  // A plot bought: its purchase panel has nothing left to say, the plot is let go.
  const bought = target?.kind === "sector" && (p.view?.map?.unlocked ?? []).includes(target.cell);
  useEffect(() => {
    if (bought) onTarget(null);
  }, [bought, onTarget]);
  // The game closed the place's dock: the place is let go.
  const hadTarget = useRef(false);
  useEffect(() => {
    if (target) hadTarget.current = true;
    else if (hadTarget.current) {
      hadTarget.current = false;
      setChosen(null);
      setCarded(false);
    }
  }, [target]);
  /** Back over the first fondaco: up close (the Fondaco's tab) or the board round it. */
  const goHome = (close = false) => {
    if (sh.current) {
      sh.current.goHome++;
      sh.current.homeZoom = close ? (PHONE() ? 1.9 : 1.6) : 1;
    }
    setChosen(null);
    setCarded(false);
    onDomain?.(close ? "veneto" : null);
  };
  useImperativeHandle(ref, () => ({
    toggle: () => goHome(),
    home: () => goHome(true),
    far: () => goHome(),
    leave: () => goHome(),
    recenter: () => goHome(),
    house: () => goHome(true),
    info: () => {},
    pan: (dx, dy) => {
      if (sh.current)
        sh.current.pan = [sh.current.pan[0] + dx * 0.12, sh.current.pan[1] + dy * 0.12];
    },
    zoom: (k) => {
      if (sh.current) sh.current.zoom *= k;
    },
    tilePx: () => sh.current?.tilePx ?? 0,
    flip: (backwards, back) => {
      const s = sh.current;
      if (!s) return;
      setChosen(null);
      setCarded(false);
      const was = s.flip;
      s.flip = {
        backwards,
        back: back ?? was?.back ?? (() => 0xeeebe5),
        start: -1,
        z0: was?.z0 ?? 0,
        at: was?.at ?? null,
        done: false,
      };
    },
  }));
  const pick = (id: string | null) => {
    // Putting a place down: only a free tile of the house's is picked, without a card.
    if (placing) {
      const k = id?.startsWith("free:") ? id.slice(5) : null;
      const cells = p.view?.map?.cells ?? {};
      if (!k || (placing.region && cells[k]?.region !== placing.region)) return;
      const size = scene?.tileSize ?? 15;
      const [i = 0, j = 0] = k.split(",").map(Number);
      setChosen(id);
      setCarded(false);
      onPick?.({ cell: k, x: Math.round((i + 0.5) * size), y: Math.round((j + 0.5) * size) });
      return;
    }
    setChosen(id);
    setCarded(id !== null);
    if (id === null) onTarget(null);
  };
  // A workshop at work chosen is heard: its saw, its furnace (P3-10 of the players' audit).
  useEffect(() => {
    const tile = chosen ? scene?.tiles.find((x) => x.place?.id === chosen) : undefined;
    if (!tile?.running || !tile.model) return;
    if (SAWS.has(tile.model)) sound("saw");
    else if (KILNS.has(tile.model)) sound("kiln");
  }, [chosen, scene]);
  // The board shown, the campanile strikes the player's hour and the lagoon washes its quays, now
  // and then: quiet, never while the page is hidden.
  useEffect(() => {
    let hour = new Date().getHours();
    let wash = Date.now() + 8_000;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const now = new Date();
      if (now.getHours() !== hour) {
        hour = now.getHours();
        sound("campanile");
      }
      if (Date.now() >= wash) {
        wash = Date.now() + 11_000 + Math.random() * 9_000;
        sound("surf");
      }
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);
  // The placing over (put down or given up): the tile picked let go.
  const wasPlacing = useRef(false);
  useEffect(() => {
    if (placing) wasPlacing.current = true;
    else if (wasPlacing.current) {
      wasPlacing.current = false;
      setChosen(null);
    }
  }, [placing]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") pick(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!scene || !sh.current) return null;
  const shared = sh.current;
  const places = scene.tiles.flatMap((t) => (t.place ? [t.place] : []));
  const current = places.find((x) => x.id === chosen);
  return (
    <div className="porcellana absolute inset-0" data-porcellana-map>
      {!MAP_3D ? (
        <FlatBoard
          scene={scene}
          chosen={chosen}
          onPick={pick}
          card={shared.card}
          pins={shared.pins}
        />
      ) : (
        <Guard3D>
          <Canvas
            orthographic
            dpr={window.innerWidth < 640 ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ camera }) => {
              (camera as OrthographicCamera & { manual?: boolean }).manual = true;
            }}
            onPointerMissed={() => pick(null)}
          >
            <Board
              sh={shared}
              onPick={pick}
              onVehicle={(id) => {
                setChosen(null);
                setCarded(false);
                onTarget({ kind: "vehicle", id });
              }}
            />
          </Canvas>
        </Guard3D>
      )}
      <div className="pc-vignette" />
      <div className="pc-pins">
        {places.map((x) => (
          <button
            key={x.id}
            type="button"
            className="pc-pin"
            data-place={x.id}
            data-on={String(x.id === chosen || x.ready)}
            data-plus={String(!!x.plus && !x.badge)}
            data-badge={x.badge?.kind ?? (x.pin || x.plus ? "text" : "none")}
            data-state={x.badge?.kind === "work" ? x.badge.state : undefined}
            data-hot={x.badge?.kind === "orders" ? String(x.badge.covered) : undefined}
            data-out="false"
            aria-label={x.name}
            ref={(el) => {
              if (el) shared.pins.set(x.id, el);
              else shared.pins.delete(x.id);
            }}
            onClick={() => pick(x.id)}
          >
            {x.badge ? <PinFace badge={x.badge} /> : x.pin}
            {/* Each town and the Market named on the map, always (P0-12: no name on screen). */}
            {x.id.startsWith("city:") && (
              <span className="pc-pin-name" data-map-label>
                {x.name}
              </span>
            )}
          </button>
        ))}
      </div>
      {current && carded ? (
        <PlaceCard
          ref={(h) => {
            shared.card = h;
          }}
          info={{
            name: current.name,
            sub: current.sub,
            line: current.line,
            go: current.go,
            ready: current.ready,
            tag: fr.empire.porcellana.readyTag,
          }}
          onGo={() => {
            setCarded(false);
            onTarget(current.target);
          }}
          onClose={() => pick(null)}
        />
      ) : null}
    </div>
  );
});

/**
 * What a pin shows (the first steps, lot 4): a workshop's good in its ring (the lot under way, its
 * lots ready, « ! » short of an input, full), a town's orders and their good, a lock and its level.
 */
function PinFace({ badge }: { badge: PinBadge }) {
  const tp = fr.empire.porcellana;
  switch (badge.kind) {
    case "work":
      return (
        <>
          <span
            className="pc-pin-ring"
            style={{ "--p": badge.state === "running" ? badge.progress : 0 } as CSSProperties}
          />
          <GoodsMark code={badge.good} size={18} />
          {badge.state === "ready" && <span className="pc-pin-count">{badge.n}</span>}
          {badge.state === "blocked" && <span className="pc-pin-count">!</span>}
          {badge.state === "full" && <span className="pc-pin-tag">{tp.full}</span>}
        </>
      );
    case "orders":
      return (
        <>
          <GoodsMark code={badge.good} size={16} />
          <span>{badge.n}</span>
        </>
      );
    case "lock":
      return (
        <>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v7h-9z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {badge.casa !== undefined && <span>{tp.lockLevel(badge.casa)}</span>}
        </>
      );
  }
}

export default PorcellanaMap;
