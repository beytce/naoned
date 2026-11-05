import { SLOT_TURN } from "@comptoirs/engine";
/**
 * The empire's map in 3D (docs/plateau-reprise.md, § 7): the board as a little living diorama in
 * real time (three.js through React Three Fiber), after the owner's references: thick hexagonal
 * tiles of clay, blue roofs, pines, rocks, under one light. It lies under the map's own layers
 * (EmpireMap): its camera is the map's (useCamera), turned into an orthographic camera that sees
 * the ground exactly where the SVG map drew it (camera.ts), so the places, the rings, the vehicles'
 * medals, the orbit and the timers lie on it to the pixel. Built from the house's map (`p.view.map`)
 * through `scene3d`, with the night board's grid and seeds.
 */
import { PerformanceMonitor } from "@react-three/drei";
import {
  Canvas,
  addAfterEffect,
  addEffect,
  invalidate,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { EffectComposer, N8AO, TiltShift2, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import {
  Suspense,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Cache,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Fog,
  type Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera as OrthoCam,
  Raycaster,
  TorusGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HEX_SIZE, cellCentre } from "../../art/hexmap.js";
import { C } from "../../art/plateau/props.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import type { CityLook } from "../map/logic.js";
import type { EmpirePayload } from "../types.js";
import { DISTANCE, orthoFrom } from "./camera.js";
import type { DomainTile } from "./domain.js";
import { SOFTWARE_GL, give3dUp } from "./flag.js";
import { Fleet3D } from "./fleet3d.js";
import {
  Instanced,
  type KitModel,
  type KitName,
  clay as clayShared,
  claySolid,
  hexSlab,
  useKit,
} from "./kit.js";
import { Flag, Smoke, useWater } from "./life.js";
import { useBoardPaused } from "./pause.js";
import { FONDACO, Gondola, MADE, Mill } from "./props3d.js";
import {
  type Scene3D,
  type SceneInput,
  TILE_R,
  type Zone,
  outlineOf,
  scene3d,
  sceneInputOf,
  sceneKey,
  sitesOf,
  tileCorners,
  zones,
} from "./scene.js";

Cache.enabled = true;

const NIGHT = "#16263E";
/** The tiles: a clay slab on a night-blue base. */
const SLAB = 3;
/** A fondaco's tile of gold stands this much above the others. */
const RAISE = 1.2;
const BASE = 7;
/** The lagoon lies this far below the land; its bed further down. */
const WATER_Y = -2.2;
/** Closer than this (px per unit), the tilt-shift blurs the far and the near. */
const NEAR_ZOOM = 22;
/** Farther than this (px per unit), the small dressing is not drawn (a level of detail). */
const LOD_ZOOM = 3.6;
/** The small dressing, by its models' keys. */
const SMALL = /^(pine|rock|made:(tuft|pebble|sand|barrel))/;

/** What the map tells the board: where its camera is. */
export interface Board3DHandle {
  /** The map's camera moved (at each frame of a gesture): the board's follows. */
  view(cam: Camera, v: Viewport): void;
  /**
   * The place under a point of the screen (relative to the board), by a ray through the scene:
   * « home », a post's id, « city:<code> », « depot », « camp », « porta », « arsenal », or null.
   */
  hit(x: number, y: number): string | null;
}

export interface Board3DProps {
  p: EmpirePayload;
  /** The scene takes the touches from now on (its places' zones in). */
  onReady?: () => void;
  /** A fondaco's domain plunged into: its little scene instead of the map's (domain.ts). */
  domain?: DomainScene | null;
  /** The towns' orders and state, told by the scenery (logic.ts, `cityLooks`). */
  cities?: CityLook[];
}

/** The domain's scene: its tiles, and each workshop's state (ready, running, waiting). */
export interface DomainScene {
  key: string;
  tiles: DomainTile[];
  states: Record<string, "ready" | "running" | "idle" | "blocked">;
}

/** Whether the device asks for less motion (read live). */
export function useLive() {
  const q = "(prefers-reduced-motion: reduce)";
  const [live, setLive] = useState(() => !(window.matchMedia?.(q).matches ?? false));
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setLive(!m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return live;
}

/**
 * Drawn again only when the house's map changes, never at a tick of the game's clock (the canvas
 * then asks no frame at rest).
 */
const Board3D = memo(
  forwardRef<Board3DHandle, Board3DProps>(function Board3D(
    { p, onReady, domain = null, cities = [] },
    ref,
  ) {
    const map = p.view?.map;
    // Built again only when the map did change (never at a refresh of the same one).
    const key = sceneKey(p);
    // biome-ignore lint/correctness/useExhaustiveDependencies: p stands for its key
    const input = useMemo<SceneInput | null>(() => (map ? sceneInputOf(p) : null), [key]);
    const sc = useMemo(() => (input ? scene3d(input) : null), [input]);
    const casa = p.view?.house.casa ?? 1;
    const buyKey = JSON.stringify(map?.buyable ?? []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: the sectors to buy by their key
    const buyable = useMemo(
      () => new Map((map?.buyable ?? []).map((b) => [b.cell, casa >= b.casa])),
      [buyKey, casa],
    );
    const live = useLive();
    // Asleep under a scene in 3D that covers the screen: no frame, until it closes.
    const paused = useBoardPaused();
    useEffect(() => {
      // Awake again: one frame at once, the board as it stands now.
      if (!paused) invalidate();
    }, [paused]);
    // Until when a vehicle of the house is on its way (or waiting to leave): frames till then.
    // (on this device's clock).
    const moving =
      Math.max(0, ...(p.view?.vehicles.mine ?? []).flatMap((v) => v.legs.map((l) => l.arrivesAt))) -
      (p.now - Date.now());
    const [near, setNear] = useState(false);
    // The map's camera, kept until the canvas has its own, then applied to it at each move.
    const last = useRef<{ cam: Camera; v: Viewport } | null>(null);
    const camera = useRef<OrthoCam | null>(null);
    const apply = () => {
      const c = camera.current;
      const l = last.current;
      if (!c || !l) return;
      const o = orthoFrom(l.cam, l.v);
      c.position.set(...o.position);
      c.zoom = o.zoom;
      c.lookAt(...o.target);
      c.updateProjectionMatrix();
      const isNear = o.zoom > NEAR_ZOOM;
      setNear((was) => (was === isNear ? was : isNear));
      // Far out, the small dressing (pines, rocks) gives way: the towns and mountains stay.
      const show = o.zoom >= LOD_ZOOM;
      wake();
      if (small.current && small.current.visible !== show) {
        small.current.visible = show;
        // Their shadows go with them (the still shadows drawn again once).
        if (gl.current) gl.current.shadowMap.needsUpdate = true;
      }
      invalidate();
    };
    // During a gesture, no ambient occlusion (the frames come quicker); back once it rests.
    const ao = useRef<{ enabled: boolean } | null>(null);
    const resting = useRef(0);
    const moved = () => {
      if (ao.current) ao.current.enabled = false;
      window.clearTimeout(resting.current);
      resting.current = window.setTimeout(() => {
        if (ao.current) ao.current.enabled = true;
        invalidate();
      }, 220);
    };
    const small = useRef<Group>(null);
    const gl = useRef<import("three").WebGLRenderer | null>(null);
    // The lowest quality from the start on a device that draws in software; else once it is slow.
    const [low, setLow] = useState(SOFTWARE_GL);
    // The touches of the places (step 2 of § 7): hexagons that never overlap.
    // biome-ignore lint/correctness/useExhaustiveDependencies: p stands for its key
    const touch = useMemo(() => zones(placesOf(p)), [key]);
    const hitter = useRef<((x: number, y: number) => string | null) | null>(null);
    const animals = useRef(new Map<string, Group>());
    /** The vehicle whose animal stands under a point of the screen: « vehicle:<id> ». */
    const animalAt = (x: number, y: number): string | null => {
      const c = camera.current;
      const l = last.current;
      if (!c || !l) return null;
      let best: { id: string; d: number } | null = null;
      for (const [id, g] of animals.current) {
        if (!g.userData.moving) continue;
        // Its body's middle, a little above the ground.
        const at = g.position.clone();
        at.y += 1.6;
        at.project(c);
        const sx = ((at.x + 1) / 2) * l.v.w;
        const sy = ((1 - at.y) / 2) * l.v.h;
        const d = Math.hypot(sx - x, sy - y);
        if (d < 26 && (!best || d < best.d)) best = { id, d };
      }
      return best ? `vehicle:${best.id}` : null;
    };
    const setHitter = useCallback((fn: (x: number, y: number) => string | null) => {
      hitter.current = fn;
    }, []);
    // The map told once the scene's models are in (not before: it would take the touches early).
    const readyRef = useRef(onReady);
    readyRef.current = onReady;
    const ready = useCallback(() => readyRef.current?.(), []);
    // Made once (its methods read refs): a handle made again at each render would tell the map the
    // board gone, then back.
    // biome-ignore lint/correctness/useExhaustiveDependencies: refs only
    useImperativeHandle(
      ref,
      () => ({
        view(cam, v) {
          const was = last.current;
          // The map repaints its camera at each of its renders (each tick of the clock): no frame
          // unless the camera or the screen did change.
          if (
            was &&
            was.cam.s === cam.s &&
            was.cam.tx === cam.tx &&
            was.cam.ty === cam.ty &&
            was.v.w === v.w &&
            was.v.h === v.h
          )
            return;
          last.current = { cam, v };
          if (was) moved();
          apply();
        },
        // An animal under the finger first (a target of 44 px around it), else a place.
        hit: (x, y) => animalAt(x, y) ?? hitter.current?.(x, y) ?? null,
      }),
      [],
    );
    if (!sc) return null;
    return (
      <Canvas
        className="!absolute inset-0"
        frameloop={paused ? "never" : "demand"}
        shadows="soft"
        dpr={low ? 1 : [1, 1.5]}
        orthographic
        camera={{ near: 1, far: 2000, position: [0, DISTANCE, DISTANCE] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl: renderer, scene, camera: c }) => {
          gl.current = renderer;
          watchContext(renderer);
          wake();
          renderer.shadowMap.autoUpdate = false;
          renderer.shadowMap.needsUpdate = true;
          scene.background = new Color(NIGHT);
          scene.fog = new Fog(NIGHT, DISTANCE - 30, DISTANCE + 160);
          camera.current = c as OrthoCam;
          apply();
        }}
        data-board3d
      >
        <Lights sc={sc} />
        <Zones zones={touch} onReady={setHitter} />
        <Suspense fallback={null}>
          {/* The map, or a fondaco's domain plunged into (the map's dressing put away). */}
          <group visible={!domain}>
            <World sc={sc} live={live} small={small} buyable={buyable} />
            <Fleet3D p={p} live={live} actors={animals} />
            <Towns3D looks={cities} />
          </group>
          {domain && <Domain3D key={domain.key} scene={domain} live={live} />}
          <ShadowsOnce sc={sc} k={domain ? JSON.stringify(domain) : ""} />
          <Ready onReady={ready} />
        </Suspense>
        {/* A device that cannot keep 18 frames a second loses the ambient occlusion for good. */}
        <PerformanceMonitor bounds={() => [18, 26]} flipflops={2} onDecline={() => setLow(true)} />
        {/* Slow, no effects at all (the renderer's own ACES keeps the palette): the chain doubles
            a frame's cost (plateau-reprise § 7). */}
        {FX && !low && <Effects near={near} ao={!low} aoRef={ao} />}
        {!paused && <Ticker live={live} until={moving} />}
        {PERF && <Probe />}
      </Canvas>
    );
  }),
  // Drawn again only when what it shows did change, by content (each refresh brings new objects).
  (a, b) =>
    sceneKey(a.p) === sceneKey(b.p) &&
    JSON.stringify(a.p.view?.map.buyable ?? []) === JSON.stringify(b.p.view?.map.buyable ?? []) &&
    JSON.stringify(a.p.view?.vehicles.mine ?? []) ===
      JSON.stringify(b.p.view?.vehicles.mine ?? []) &&
    a.p.view?.house.casa === b.p.view?.house.casa &&
    JSON.stringify(a.domain ?? null) === JSON.stringify(b.domain ?? null) &&
    JSON.stringify(a.cities ?? []) === JSON.stringify(b.cities ?? []),
);

export default Board3D;

/** The places as the map names them, at their point (as EmpireMap's marks stand). */
function placesOf(p: EmpirePayload): { id: string; x: number; y: number }[] {
  const map = p.view?.map;
  if (!map) return [];
  const out: { id: string; x: number; y: number }[] = [];
  if (map.home && map.home.placed !== false) out.push({ id: "home", x: map.home.x, y: map.home.y });
  for (const pt of map.posts) out.push({ id: pt.id, x: pt.x, y: pt.y });
  for (const c of map.cities) out.push({ id: `city:${c.code}`, x: c.x, y: c.y });
  // The Remise, the Campo and the Porta on their small tiles, as the scene stands them.
  const sites = sitesOf(sceneInputOf(p));
  for (const id of ["depot", "camp", "porta"] as const) {
    const at = sites[id];
    if (at) out.push({ id, x: at.x, y: at.y });
  }
  const cell = (id: string, k: string | null | undefined, dx: number, dy: number) => {
    if (!k) return;
    const [x, y] = cellCentre(k);
    out.push({ id, x: x + dx, y: y + dy });
  };
  cell("arsenal", map.arsenal, 0, 0);
  return out;
}

/** A touch's prism: a unit high, from a little under the ground (scaled to each place's height). */
const zoneGeo = new CylinderGeometry(1, 1, 1, 6);
zoneGeo.translate(0, 0.5, 0);
const zoneMat = new MeshBasicMaterial();

/**
 * The places' touches, invisible hexagonal prisms; `onReady` receives the ray that finds the one
 * under a point of the screen (the map's gestures call it on a tap, useCamera's `onTap`).
 */
function Zones({
  zones: list,
  onReady,
}: {
  zones: Zone[];
  onReady: (hit: (x: number, y: number) => string | null) => void;
}) {
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const raycaster = useMemo(() => new Raycaster(), []);
  useEffect(() => {
    onReady((x, y) => {
      const g = group.current;
      if (!g) return null;
      camera.updateMatrixWorld();
      raycaster.setFromCamera(
        new Vector2((x / size.width) * 2 - 1, 1 - (y / size.height) * 2),
        camera,
      );
      const hit = raycaster.intersectObjects(g.children, false)[0];
      return (hit?.object.userData.id as string | undefined) ?? null;
    });
  }, [camera, size, raycaster, onReady]);
  return (
    <group ref={group}>
      {list.map((z) => (
        // Never drawn (a ray finds what is not drawn): as high as the place's roof and flag.
        <mesh
          key={z.id}
          geometry={zoneGeo}
          material={zoneMat}
          visible={false}
          position={[z.x, -1, z.y]}
          scale={[z.r, z.h + 1, z.r]}
          userData={{ id: z.id }}
        />
      ))}
    </group>
  );
}

/** One light from the upper left, a soft sky: clay under a single sun. */
function Lights({ sc }: { sc: Scene3D }) {
  const w = sc.bounds.maxX - sc.bounds.minX;
  const h = sc.bounds.maxY - sc.bounds.minY;
  const half = Math.max(w, h) * 0.75;
  const cx = (sc.bounds.minX + sc.bounds.maxX) / 2;
  const cz = (sc.bounds.minY + sc.bounds.maxY) / 2;
  const light = useRef<import("three").DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    // The light over the middle of what is seen, its shadows' box around it.
    l.target.position.set(cx, 0, cz);
    l.target.updateMatrixWorld();
  }, [cx, cz]);
  return (
    <>
      <hemisphereLight args={["#CFE0F5", "#B89A62", 1.15]} />
      <directionalLight
        ref={light}
        position={[cx - 70, 120, cz - 60]}
        intensity={2.4}
        color="#FFF3DD"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />
    </>
  );
}

/** The still shadows: drawn once the models are in, and again only when the board changes. */
function ShadowsOnce({ sc, k }: { sc: Scene3D; k: string }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    void sc;
    void k;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, sc, k]);
  return null;
}

/**
 * A context lost (a phone's browser takes it back in the background, or under pressure): three.js
 * gets it back; the still shadows are drawn again and a frame asked. Lost twice in a minute, the
 * map goes on in SVG.
 */
function watchContext(renderer: import("three").WebGLRenderer) {
  const el = renderer.domElement;
  let lostAt = 0;
  el.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    const now = Date.now();
    if (lostAt && now - lostAt < 60_000) give3dUp("context lost twice");
    lostAt = now;
  });
  el.addEventListener("webglcontextrestored", () => {
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  });
}

/** Mounted once everything before it in its Suspense is in: the scene takes the touches. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

/** The gold outline of a sector to buy, its width on the ground (chart units). */
const GOLD_RIBBON = 0.75;

/** After the last touch or move of the camera, the board stays alive this long (ms). */
const AWAKE_MS = 10_000;
/** Then its life goes on at 12 frames a second this long (ms), and rests. */
const AMBIENT_MS = 90_000;
let awakeUntil = 0;
/** The player did something: the board's life (smoke, water, sails) goes on a while. */
function wake() {
  awakeUntil = Date.now() + AWAKE_MS;
}

/**
 * The frames asked, at most 30 a second by the clock (never « one in two », which depends on the
 * screen's rate): while a vehicle is on its way, and a little while after the player's last touch
 * (the board's life). At rest, none: the phone keeps cool. Asking for less motion, one a second
 * while a vehicle walks (its place still true), none else.
 */
function Ticker({ live, until }: { live: boolean; until: number }) {
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      const now = Date.now();
      // 30 frames while a vehicle walks or the player touches; then 12 for a minute and a half,
      // the board's life going on slower (audit of 4 November, motion B2: no world frozen ten
      // seconds after the last touch); then none. Asking for less motion: one a second, only
      // while a vehicle walks.
      const walking = now < until + 1_000;
      const busy = walking || (live && now < awakeUntil);
      const ambient = live && now < awakeUntil + AMBIENT_MS;
      const step = !live ? 1_000 : busy ? 33 : 83;
      if ((busy || ambient) && !document.hidden && t - last >= step) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live, until]);
  return null;
}

function Effects({
  near,
  ao,
  aoRef,
}: {
  near: boolean;
  ao: boolean;
  aoRef: React.MutableRefObject<{ enabled: boolean } | null>;
}) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* The ambient occlusion, off on a slow device for good, and during a gesture. */}
      {ao ? (
        <N8AO
          ref={aoRef as never}
          halfRes
          quality="performance"
          aoRadius={5}
          distanceFalloff={1.2}
          intensity={2.6}
          color={NIGHT}
        />
      ) : (
        <></>
      )}
      {/* The tilt-shift only up close, where it blurs: its pass no longer paid far out. */}
      {near ? <TiltShift2 blur={0.12} taper={0.6} /> : <></>}
      <ToneMapping mode={TONE} />
    </EffectComposer>
  );
}

/** The tone mapping: ACES keeps the palette's golds and lapis (AgX greys them), ?tone=agx for it. */
const TONE =
  new URLSearchParams(window.location.search).get("tone") === "agx"
    ? ToneMappingMode.AGX
    : ToneMappingMode.ACES_FILMIC;
/** The frames measured (?perf=1, for e2e/map3d.mjs): when each began, how long its work took. */
const PERF = new URLSearchParams(window.location.search).get("perf") === "1";
function Probe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const w = window as unknown as {
      __m3d?: { at: number[]; work: number[]; calls: number; triangles: number };
    };
    const rec = { at: [] as number[], work: [] as number[], calls: 0, triangles: 0 };
    w.__m3d = rec;
    let t0 = 0;
    // Every pass of a frame counted (the effects render several times).
    gl.info.autoReset = false;
    const a = addEffect(() => {
      gl.info.reset();
      t0 = performance.now();
      rec.at.push(t0);
    });
    const b = addAfterEffect(() => {
      rec.work.push(performance.now() - t0);
      rec.calls = gl.info.render.calls;
      rec.triangles = gl.info.render.triangles;
    });
    return () => {
      a();
      b();
    };
  }, [gl]);
  return null;
}

/** The effects (ambient occlusion, tilt-shift, tone mapping): ?fx=0 without, to measure them. */
const FX = new URLSearchParams(window.location.search).get("fx") !== "0";
/** The props made in code, by the scene's kind (props3d.tsx). */
const MADE_KINDS: Partial<Record<string, keyof typeof MADE>> = {
  field: "field",
  mine: "mine",
  barrel: "barrel",
  tuft: "tuft",
  pebble: "pebble",
  sand: "sand",
  cart: "cart",
};

/** The unknown's glass (decision of the owner, 3 November: transparent, but in relief). */
const glass = new MeshStandardMaterial({
  color: C.mist,
  roughness: 0.85,
  metalness: 0,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});

/** The board, its dressing, its towns and buildings. Chart units: x east, z south. */
function World({
  sc,
  live,
  small,
  buyable,
}: {
  sc: Scene3D;
  live: boolean;
  /** The sectors to buy, and whether the Casa may buy each now. */
  buyable: Map<string, boolean>;
  /** The small dressing's group (pines, rocks), hidden far out. */
  small: React.RefObject<Group>;
}) {
  const kit = useKit();
  const water = useWater(live);

  // The small tiles (§ 8): seven a sector, each a slab of clay on a night-blue base, a thin joint
  // between them; the unknown in slabs of glass, empty; the sea in small tiles of lagoon.
  const slabs = useMemo(() => {
    const top = hexSlab(TILE_R - 0.45, SLAB, 0.7);
    const base = hexSlab(TILE_R - 0.75, BASE, 0.4);
    base.translate(0, -SLAB + 0.2, 0);
    const glass = hexSlab(TILE_R - 0.45, SLAB + BASE - 2, 0.7);
    const bed = hexSlab(TILE_R - 0.2, BASE - 1, 0.2);
    bed.translate(0, -SLAB - 1.2, 0);
    const raised = hexSlab(TILE_R - 0.45, SLAB + RAISE, 0.7);
    return { top, base, glass, bed, raised };
  }, []);
  // The tiles by kind (kept while the board stays the same), turned as the engine's lattice.
  const { own, seen, wet, fog, solid, gold } = useMemo(() => {
    const place = (tl: { x: number; y: number }) => ({
      x: tl.x,
      y: 0,
      z: tl.y,
      s: 1,
      rot: SLOT_TURN,
    });
    const of = (kind: string) =>
      sc.tiles.filter((tl) => tl.kind === kind && tl.theme !== "fondaco").map(place);
    const own = of("own");
    const seen = of("seen");
    // The fondaci's tiles: the only ones of gold, raised (decision of the owner, 3 November).
    const gold = sc.tiles.filter((tl) => tl.theme === "fondaco").map(place);
    return {
      own,
      seen,
      wet: of("water"),
      fog: of("fog"),
      solid: [...own, ...seen, ...gold],
      gold,
    };
  }, [sc]);
  // The lagoon: one surface over every small tile of sea, finely cut for its ripples.
  const lagoon = useMemo(() => (wet.length ? lagoonGeometry(wet, TILE_R - 0.2) : null), [wet]);
  useEffect(() => () => lagoon?.dispose(), [lagoon]);
  const edges = useMemo(() => {
    const fogTiles = sc.tiles.filter((t) => t.kind === "fog");
    const mist = segmentsGeometry(
      fogTiles.flatMap((t) => {
        const c = tileCorners(t.x, t.y, TILE_R - 0.45);
        return c.map((a, i) => [a, c[(i + 1) % 6] as [number, number]] as [Pt, Pt]);
      }),
    );
    const cells = [...new Set(fogTiles.map((t) => t.cell))].filter((c) => buyable.get(c) === true);
    const gold = cells.length
      ? ribbonGeometry(
          cells.flatMap((c) => outlineOf(fogTiles.filter((t) => t.cell === c))),
          GOLD_RIBBON,
        )
      : null;
    return { mist, gold };
  }, [sc, buyable]);
  useEffect(
    () => () => {
      edges.mist.dispose();
      edges.gold?.dispose();
    },
    [edges],
  );

  // The dressing, model by model, in one draw each.
  const decor = useMemo(() => {
    const groups = new Map<
      string,
      { model: KitModel; items: Parameters<typeof Instanced>[0]["items"] }
    >();
    const add = (key: string, model: KitModel, x: number, y: number, s: number, rot: number) => {
      let g = groups.get(key);
      if (!g) {
        g = { model, items: [] };
        groups.set(key, g);
      }
      g.items.push({ x, y: 0, z: y, s, rot });
    };
    const muted = {
      roof: C.roofMuted,
      leaf: C.pineMuted,
      grass: C.pineMuted,
      rock: C.rockSeen,
      rock2: C.rock2Seen,
      wall: C.snowSeen,
    };
    for (const pr of sc.props) {
      // The models made in code (props3d.tsx), each in one draw.
      const made = MADE_KINDS[pr.kind];
      if (made) {
        let g = groups.get(`made:${pr.kind}`);
        if (!g) {
          g = { model: { geo: MADE[made], h: 1 }, items: [] };
          groups.set(`made:${pr.kind}`, g);
        }
        g.items.push({ x: pr.x, y: 0, z: pr.y, s: pr.s, rot: pr.rot });
        continue;
      }
      const over = pr.muted ? muted : {};
      const name: KitName | null =
        pr.kind === "pine"
          ? pr.variant
            ? "pineB"
            : "pineA"
          : pr.kind === "rock"
            ? ((["rockA", "rockC", "rockE"] as const)[pr.variant % 3] ?? "rockA")
            : pr.kind === "mountain"
              ? ((["mountainA", "mountainB", "mountainC"] as const)[pr.variant % 3] ?? "mountainA")
              : pr.kind === "house"
                ? pr.variant
                  ? "homeB"
                  : "homeA"
                : pr.kind === "plots"
                  ? "grain"
                  : pr.kind === "mill"
                    ? "windmill"
                    : null;
      if (!name) continue;
      // Sizes across, in chart units (after the SVG board's scales).
      const across =
        pr.kind === "pine"
          ? 5.2 * pr.s
          : pr.kind === "rock"
            ? 6 * pr.s
            : pr.kind === "mountain"
              ? 26 * pr.s
              : pr.kind === "house"
                ? 10 * pr.s
                : pr.kind === "mill"
                  ? 9 * pr.s
                  : 14 * pr.s;
      const over2 =
        pr.kind === "mountain" ? { ...over, wall: pr.muted ? C.snowSeen : C.snow } : over;
      add(`${name}:${pr.muted}`, kit(name, over2), pr.x, pr.y, across, pr.rot);
    }
    for (const town of sc.towns) {
      const over = town.muted ? muted : {};
      // Its houses, Venetian (props3d.tsx: stucco, a gable of tiles, a funnel chimney).
      for (const h of town.houses) {
        const name =
          `casa${h.variant ? "B" : "A"}${town.muted ? "Muted" : ""}` as keyof typeof MADE;
        add(`town:${name}`, { geo: MADE[name], h: 1 }, h.x, h.y, 3.4 * h.s, h.rot);
      }
      // Its monument: Venice's campanile, Padua's domes (made in code), a church else.
      if (town.monument === "church")
        add(
          `church:${town.muted}`,
          kit("church", over),
          town.campanile.x,
          town.campanile.y,
          4.4 * town.campanile.s,
          0,
        );
      else
        add(
          `made:${town.monument}`,
          { geo: MADE[town.monument], h: 1 },
          town.campanile.x,
          town.campanile.y,
          town.monument === "campanile" ? 0.8 : 0.75,
          town.monument === "campanile" ? 0 : -0.35,
        );
    }
    return [...groups.entries()];
  }, [sc, kit]);

  const docks = sc.props.filter((pr) => pr.kind === "dock");
  const mills = sc.props.filter((pr) => pr.kind === "mill");
  const smokes = sc.props.filter((pr) => pr.kind === "smoke");
  return (
    <group>
      {/* The small tiles: one's own in sand-gold, the others seen in mist-blue, on night-blue
          bases. */}
      <Instanced geo={slabs.top} items={own} material={claySolid(C.land)} />
      <Instanced geo={slabs.top} items={seen} material={claySolid(C.mist)} />
      <Instanced geo={slabs.raised} items={gold} material={claySolid(C.roofGold)} />
      <Instanced geo={slabs.base} items={solid} material={claySolid(C.soil)} cast={false} />
      {/* The lagoon: its bed, its translucent water. */}
      <Instanced geo={slabs.bed} items={wet} material={claySolid(C.mistSoil)} cast={false} />
      {lagoon && <mesh geometry={lagoon} material={water} position-y={WATER_Y} receiveShadow />}
      {/* The unknown: thick tiles of glass, empty, their edge drawn faintly. */}
      <Instanced geo={slabs.glass} items={fog} material={glass} cast={false} receive={false} />
      {/* The unknown's tiles edged faintly, in one draw; a sector the Casa may buy now, its outline
          in gold (one gold a sector, never one a tile: the gold says « yours to do »). */}
      <lineSegments geometry={edges.mist} position-y={0.05}>
        <lineBasicMaterial color={C.mist} transparent opacity={0.3} />
      </lineSegments>
      {edges.gold && (
        <mesh geometry={edges.gold} position-y={0.12} renderOrder={2}>
          <meshBasicMaterial
            color={C.gold}
            transparent
            opacity={0.95}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
      {/* The dressing and the towns. */}
      <group ref={small}>
        {decor
          .filter(([key]) => SMALL.test(key))
          .map(([key, g]) => (
            <Instanced key={key} geo={g.model.geo} items={g.items} />
          ))}
      </group>
      {decor
        .filter(([key]) => !SMALL.test(key))
        .map(([key, g]) => (
          <Instanced key={key} geo={g.model.geo} items={g.items} />
        ))}
      {/* The lanes from the fondaci to the towns: beaten earth. */}
      {sc.lanes.map((l) => (
        <Track key={l.map((q) => q.join(",")).join(" ")} path={l} />
      ))}
      {docks.map((d) => (
        <Dock key={`${d.x},${d.y}`} x={d.x} z={d.y} rot={d.rot} />
      ))}
      {/* A gondola moored at the end of each landing, out on the lagoon, rocking. */}
      {docks.map((d) => (
        <Gondola
          key={`g${d.x},${d.y}`}
          x={d.x + Math.cos(d.rot) * 7.5 - Math.sin(d.rot) * 1.8}
          z={d.y + Math.sin(d.rot) * 7.5 + Math.cos(d.rot) * 1.8}
          y={WATER_Y + 0.15}
          rot={d.rot}
          live={live}
        />
      ))}
      {/* The farms' mills, their sails turning; their chimneys' smoke. */}
      {mills.map((m) => (
        <Mill key={`${m.x},${m.y}`} x={m.x} z={m.y} rot={m.rot} s={m.s} live={live} />
      ))}
      {smokes.map((m) => (
        <Smoke key={`${m.x},${m.y}`} at={[m.x, 3.2, m.y]} live={live} />
      ))}
      {/* The fondaco: its hall under a gold roof, its tower, its flag, its chimney's smoke. */}
      {sc.home && <Fondaco x={sc.home.x} z={sc.home.y} live={live} />}
      {/* The fondaci of the other regions, smaller. */}
      {sc.posts.map((pt) => (
        <Fondaco key={`${pt.x},${pt.y}`} x={pt.x} z={pt.y} live={live} k={0.62} />
      ))}
      {/* The Remise: a market hall, its crates. */}
      {sc.depot && (
        <group position={[sc.depot.x, 0, sc.depot.y]}>
          <mesh
            geometry={kit("market").geo}
            material={clayShared}
            scale={7}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={kit("crate").geo}
            material={clayShared}
            scale={1.6}
            position={[4, 0, 2]}
            castShadow
          />
        </group>
      )}
      {/* The Campo: its fields, its watchtower. */}
      {sc.camp && (
        <group position={[sc.camp.x, 0, sc.camp.y]}>
          <mesh geometry={kit("grain").geo} material={clayShared} scale={7} receiveShadow />
          <mesh
            geometry={kit("tower").geo}
            material={clayShared}
            scale={3}
            position={[3, 0, -2]}
            castShadow
          />
        </group>
      )}
      {/* The Porta: an old gate of stone, its arch glowing cinnabar (the lands of Rome). */}
      {sc.porta && <Porta x={sc.porta.x} z={sc.porta.y} />}
    </group>
  );
}

/**
 * Each workshop's model on its tile (after art/plateau/workshops.ts), its size: the Venetian
 * trades made in code (props3d.tsx: the glassworks, the brickworks), the others from KayKit.
 */
function workshopModel(type: string): {
  name: KitName;
  s: number;
  made?: "glassworks" | "brickworks";
} {
  switch (type) {
    case "brickworks":
      return { name: "forge", s: 6.2, made: "brickworks" };
    case "glassworks":
      return { name: "forge", s: 6.2, made: "glassworks" };
    case "clay_pit":
    case "sand_pit":
      return { name: "mine", s: 6.2 };
    case "lumber_camp":
      return { name: "woodcut", s: 6.4 };
    case "sawmill":
      return { name: "sawmill", s: 6.6 };
    case "farm":
      return { name: "grain", s: 6.6 };
    case "mill":
      return { name: "windmill", s: 6 };
    case "palazzo":
      return { name: "church", s: 6.4 };
    default:
      return { name: "homeA", s: 5.4 };
  }
}

/** A town's tile edged (a flat ring of a hexagon, on its top). */
const edgeGeo = (() => {
  const outer = tileCorners(0, 0, TILE_R - 0.35);
  const inner = tileCorners(0, 0, TILE_R - 1.05);
  const pos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = outer[i] as [number, number];
    const b = outer[(i + 1) % 6] as [number, number];
    const c = inner[(i + 1) % 6] as [number, number];
    const d = inner[i] as [number, number];
    // Facing the sky (counter-clockwise seen from above, z south).
    pos.push(a[0], 0, a[1], c[0], 0, c[1], b[0], 0, b[1]);
    pos.push(a[0], 0, a[1], d[0], 0, d[1], c[0], 0, c[1]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
})();
const edgeGold = new MeshBasicMaterial({ color: C.gold, side: DoubleSide });
/**
 * A town where « Livrer » would go now: its tile edged in gold (its orders, how full it is, are
 * told by its floating pill over it, EmpireMap's `CityMark`; decision of the owner, 4 November).
 */
function Towns3D({ looks }: { looks: CityLook[] }) {
  return (
    <group>
      {looks
        .filter((c) => c.state === "deliverable")
        .map((c) => (
          <mesh key={c.code} geometry={edgeGeo} material={edgeGold} position={[c.x, 0.07, c.y]} />
        ))}
    </group>
  );
}

/** The domain's tiles rise from the board when it opens (seconds). */
const RISE = 0.45;

/**
 * A fondaco's domain (decision of the owner, 3 November 2026): the fondaco on the one tile of gold,
 * raised; its workshops on the tiles around, each telling its state by itself (a ready one ringed
 * in lagoon-green, its crates out; a running one smoking; a waiting one still); a site its crates;
 * the place to build bare; the lagoon beyond. The tiles rise one ring after the other.
 */
function Domain3D({ scene, live }: { scene: DomainScene; live: boolean }) {
  const kit = useKit();
  const water = useWater(live);
  const group = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    // Asking for less motion: the tiles are there at once, no rise (audit of 4 November, B3).
    const k = live ? Math.min(1, (clock.elapsedTime - t0.current) / RISE) : 1;
    for (const child of g.children) {
      const ring = (child.userData.ring as number | undefined) ?? 0;
      const u = Math.min(1, Math.max(0, k * 1.6 - ring * 0.22));
      const e = 1 - (1 - u) ** 3;
      child.scale.setScalar(Math.max(0.001, e));
    }
    if (k < 1) invalidate();
  });
  const slabs = useMemo(() => {
    const top = hexSlab(TILE_R - 0.45, SLAB, 0.7);
    const base = hexSlab(TILE_R - 0.75, BASE, 0.4);
    base.translate(0, -SLAB + 0.2, 0);
    const gold = hexSlab(TILE_R - 0.45, SLAB + RAISE, 0.7);
    return { top, base, gold };
  }, []);
  const shore = scene.tiles.filter((t) => t.kind === "shore");
  const lagoon = useMemo(
    () =>
      shore.length
        ? lagoonGeometry(
            shore.map((t) => ({ x: t.x, z: t.y })),
            TILE_R - 0.2,
          )
        : null,
    [shore],
  );
  useEffect(() => () => lagoon?.dispose(), [lagoon]);
  const ring = useMemo(() => {
    const g = new TorusGeometry(TILE_R - 1.2, 0.28, 6, 36);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const lagoonGreen = useMemo(
    () => new MeshBasicMaterial({ color: "#6EE0B8", transparent: true, opacity: 0.9 }),
    [],
  );
  return (
    <group ref={group}>
      {lagoon && (
        <mesh geometry={lagoon} material={water} position-y={WATER_Y} userData={{ ring: 3 }} />
      )}
      {scene.tiles
        .filter((t) => t.kind !== "shore")
        .map((t) => {
          const key = `${t.x},${t.y}`;
          const state = t.kind === "workshop" ? scene.states[t.id] : undefined;
          const model = t.kind === "workshop" || t.kind === "site" ? workshopModel(t.type) : null;
          return (
            <group key={key} position={[t.x, 0, t.y]} userData={{ ring: t.ring }}>
              {t.kind === "fondaco" ? (
                <mesh
                  geometry={slabs.gold}
                  material={claySolid(C.roofGold)}
                  rotation-y={SLOT_TURN}
                  castShadow
                  receiveShadow
                />
              ) : (
                <mesh
                  geometry={slabs.top}
                  material={claySolid(t.kind === "free" ? C.mist : C.land)}
                  rotation-y={SLOT_TURN}
                  receiveShadow
                />
              )}
              <mesh geometry={slabs.base} material={claySolid(C.soil)} rotation-y={SLOT_TURN} />
              {t.kind === "fondaco" && (
                <group position-y={RAISE}>
                  <FondacoModel live={live} k={0.8} />
                </group>
              )}
              {t.kind === "workshop" && model && (
                <mesh
                  geometry={model.made ? MADE[model.made] : kit(model.name).geo}
                  material={clayShared}
                  scale={model.s * 1.5}
                  castShadow
                  receiveShadow
                />
              )}
              {state === "ready" && (
                <>
                  <mesh geometry={ring} material={lagoonGreen} position-y={0.12} />
                  <mesh
                    geometry={kit("crate").geo}
                    material={clayShared}
                    scale={1.6}
                    position={[TILE_R * 0.45, 0, TILE_R * 0.35]}
                    castShadow
                  />
                  <mesh
                    geometry={kit("crateB").geo}
                    material={clayShared}
                    scale={1.3}
                    position={[TILE_R * 0.62, 0, TILE_R * 0.02]}
                    castShadow
                  />
                </>
              )}
              {state === "running" && (
                <Smoke at={[TILE_R * 0.25, 3.6, -TILE_R * 0.2]} live={live} />
              )}
              {t.kind === "site" && (
                <>
                  <mesh
                    geometry={kit("crate").geo}
                    material={clayShared}
                    scale={1.8}
                    position={[-1, 0, 0]}
                    castShadow
                  />
                  <mesh
                    geometry={kit("crateB").geo}
                    material={clayShared}
                    scale={1.4}
                    position={[1.2, 0, 0.6]}
                    castShadow
                  />
                </>
              )}
            </group>
          );
        })}
      {/* The lagoon's bed, under its water. */}
      <Instanced
        geo={slabs.base}
        items={shore.map((t) => ({ x: t.x, y: -SLAB - 1.2, z: t.y, s: 1, rot: SLOT_TURN }))}
        material={claySolid(C.mistSoil)}
        cast={false}
      />
    </group>
  );
}

/** The Porta: two stone towers and a glowing arch between them. */
function Porta({ x, z }: { x: number; z: number }) {
  // Rome's gate, the game's own model (props3d.tsx, after the Porta Appia), the lands' glow in
  // its opening.
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={MADE.porta} material={clayShared} scale={0.42} castShadow receiveShadow />
      <mesh position={[0, 2.35, 0.1]}>
        <planeGeometry args={[3, 4.6]} />
        <meshStandardMaterial
          color="#E06A4A"
          emissive="#E06A4A"
          emissiveIntensity={0.9}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

/** The fondaco: the house's hall (KayKit's large house, its roof in gold), a tower, the flag. */
function Fondaco({ x, z, live, k = 1 }: { x: number; z: number; live: boolean; k?: number }) {
  return (
    <group position={[x, RAISE, z]}>
      <FondacoModel live={live} k={k} />
    </group>
  );
}

/**
 * The fondaco: the house's own model (props3d.tsx, `MADE.fondaco`, audit of 4 November: a hall of
 * Istrian stone on its quay, an arcade on the water, a gold roof and a corner tower, after the
 * Fondaco dei Tedeschi), its flag on the tower and its chimney's smoke. Some twice a house, known
 * by its tile of gold (decision of the owner, 3 November).
 */
function FondacoModel({ live, k = 1 }: { live: boolean; k?: number }) {
  return (
    <group scale={k} name="fondaco">
      <mesh geometry={MADE.fondaco} material={clayShared} castShadow receiveShadow />
      <Flag at={[...FONDACO.flag]} live={live} s={0.75} />
      <Smoke at={[...FONDACO.smoke]} live={live} />
    </group>
  );
}

/** A small landing on the coast, of planks on posts. */
function Dock({ x, z, rot }: { x: number; z: number; rot: number }) {
  const wood = claySolid(C.wood);
  return (
    <group position={[x, 0, z]} rotation-y={-rot}>
      <mesh material={wood} position={[3, -0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 0.45, 2.4]} />
      </mesh>
      {[1, 3.5, 6].map((u) => (
        <mesh key={u} material={claySolid(C.trunk)} position={[u, -1.6, 1.1]}>
          <cylinderGeometry args={[0.22, 0.22, 2, 6]} />
        </mesh>
      ))}
    </group>
  );
}

type Pt = [number, number];

/** Segments on the ground (chart points), as one geometry of lines. */
function segmentsGeometry(segs: [Pt, Pt][]): BufferGeometry {
  const pos = new Float32Array(segs.length * 6);
  segs.forEach(([a, b], i) => {
    pos.set([a[0], 0, a[1], b[0], 0, b[1]], i * 6);
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return g;
}

/**
 * Segments as flat ribbons on the ground, `width` across (audit of 4 November, 3D M9): a WebGL
 * line is always one pixel, whatever the zoom, and the gold of a sector to buy was lost in it.
 * Each ribbon runs half its width past its ends, so that the corners close without a gap.
 */
export function ribbonGeometry(segs: [Pt, Pt][], width: number): BufferGeometry {
  const pos = new Float32Array(segs.length * 18);
  const h = width / 2;
  segs.forEach(([a, b], i) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    // Along (u) and across (n), the ribbon's four corners.
    const nx = -uz * h;
    const nz = ux * h;
    const ax = a[0] - ux * h;
    const az = a[1] - uz * h;
    const bx = b[0] + ux * h;
    const bz = b[1] + uz * h;
    pos.set(
      [
        ax + nx,
        0,
        az + nz,
        ax - nx,
        0,
        az - nz,
        bx + nx,
        0,
        bz + nz,
        bx + nx,
        0,
        bz + nz,
        ax - nx,
        0,
        az - nz,
        bx - nx,
        0,
        bz - nz,
      ],
      i * 18,
    );
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return g;
}

/** The lagoon's surface: each sea tile cut in small triangles, merged into one geometry. */
function lagoonGeometry(tiles: { x: number; z: number }[], radius: number): BufferGeometry {
  const rings = 4;
  const parts: BufferGeometry[] = [];
  for (const tl of tiles) {
    const pos: number[] = [];
    // A small tile's corners, turned as the engine's lattice (SLOT_TURN).
    const corner = (i: number, f: number): [number, number] => {
      const a = (-(90 + 60 * i) * Math.PI) / 180 - SLOT_TURN;
      return [tl.x + radius * f * Math.cos(a), tl.z + radius * f * Math.sin(a)];
    };
    for (let i = 0; i < 6; i++)
      for (let k = 0; k < rings; k++) {
        const f0 = k / rings;
        const f1 = (k + 1) / rings;
        // The band between two rings of this side, cut in strips of triangles.
        const n0 = Math.max(1, k);
        const n1 = k + 1;
        const lerp = (a: [number, number], b: [number, number], u: number): [number, number] => [
          a[0] + (b[0] - a[0]) * u,
          a[1] + (b[1] - a[1]) * u,
        ];
        const A0 = corner(i, f0);
        const B0 = corner(i + 1, f0);
        const A1 = corner(i, f1);
        const B1 = corner(i + 1, f1);
        const inner = Array.from({ length: n0 + 1 }, (_, j) => lerp(A0, B0, k === 0 ? 0 : j / n0));
        const outer = Array.from({ length: n1 + 1 }, (_, j) => lerp(A1, B1, j / n1));
        for (let j = 0; j < n1; j++) {
          const o0 = outer[j] as [number, number];
          const o1 = outer[j + 1] as [number, number];
          const i0 = inner[Math.min(j, n0)] as [number, number];
          pos.push(i0[0], 0, i0[1], o1[0], 0, o1[1], o0[0], 0, o0[1]);
          if (k > 0 && j < n0) {
            const i1 = inner[j + 1] as [number, number];
            pos.push(i0[0], 0, i0[1], i1[0], 0, i1[1], o1[0], 0, o1[1]);
          }
        }
      }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    parts.push(g);
  }
  const g = mergeGeometries(parts, false) as BufferGeometry;
  // Every triangle facing the sky (its winding counter-clockwise seen from above).
  const pos = g.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i + 1) - pos.getX(i);
    const az = pos.getZ(i + 1) - pos.getZ(i);
    const bx = pos.getX(i + 2) - pos.getX(i);
    const bz = pos.getZ(i + 2) - pos.getZ(i);
    // The normal's height is (b × a)·y = az·bx − ax·bz: below zero, the triangle looks down.
    if (az * bx - ax * bz < 0) {
      const x = pos.getX(i + 1);
      const z = pos.getZ(i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), 0, pos.getZ(i + 2));
      pos.setXYZ(i + 2, x, 0, z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A lane on the ground: a ribbon of beaten earth along it. */
function Track({ path }: { path: [number, number][] }) {
  const geo = useMemo(() => {
    const half = 1.1;
    const y = 0.04;
    const pos: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i] as [number, number];
      const [x1, z1] = path[i + 1] as [number, number];
      const d = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (-(z1 - z0) / d) * half;
      const nz = ((x1 - x0) / d) * half;
      // Counter-clockwise seen from above: the ribbon faces the sky.
      pos.push(x0 + nx, y, z0 + nz, x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz);
      pos.push(x0 + nx, y, z0 + nz, x1 - nx, y, z1 - nz, x0 - nx, y, z0 - nz);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.computeVertexNormals();
    return g;
  }, [path]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow renderOrder={1}>
      <meshStandardMaterial
        color={C.landSide}
        roughness={1}
        side={DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
