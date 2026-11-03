/**
 * The 3D map prototype (?map=3d, or VITE_MAP=3d at build): the empire's map as a little living
 * diorama in real time 3D (three.js through React Three Fiber), after the owner's references (thick
 * hexagonal tiles of clay, blue roofs, pines, rocks, under one light). Built from the house's own
 * map (`p.view.map`) through `scene3d`, the same grid and seeds as the night board's SVG. The SVG map
 * stays the default; this one is lazy (its own chunk) and touches nothing else of the game.
 *
 * What it does: tiles, lagoon, unknown, dressing, Venice and Padua, the fondaco (gold roof, tower,
 * flag), the Remise; a mule and a cart on their rounds, smoke, ripples, the flag; pan and pinch
 * bounded to the region; a touch on the fondaco or a town lights it and calls `onTarget`, as the
 * SVG map; the towns' names and order rings in HTML above it.
 */
import { venice1450Empire } from "@comptoirs/engine";
import { Html, MapControls, OrthographicCamera } from "@react-three/drei";
import {
  Canvas,
  type ThreeEvent,
  addAfterEffect,
  addEffect,
  invalidate,
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
  DoubleSide,
  EdgesGeometry,
  Fog,
  type OrthographicCamera as OrthoCam,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HEX_SIZE } from "../../art/hexmap.js";
import { C } from "../../art/plateau/props.js";
import { fr } from "../../i18n.js";
import type { EmpireMapHandle } from "../map/EmpireMap.js";
import type { Target } from "../map/logic.js";
import type { EmpirePayload } from "../types.js";
import {
  FILES,
  Instanced,
  type KitModel,
  type KitName,
  clay as clayShared,
  claySolid,
  hexSlab,
  useKit,
} from "./kit.js";
import { Cart, Flag, Mule, Smoke, useWater } from "./life.js";
import { type Scene3D, type SceneInput, scene3d, wider } from "./scene.js";

Cache.enabled = true;
const t = fr.empire;

/** What the map uses of drei's MapControls (three-stdlib's, not a dependency of the web). */
interface MapControlsImpl {
  target: Vector3;
  object: OrthoCam;
  update(): void;
}

/** The board's tilt: the ground seen at the night board's TILT (sin of the camera's height). */
const ELEVATION = Math.asin(0.58);
const NIGHT = "#16263E";
/** The tiles: a clay slab on a night-blue base. */
const SLAB = 3;
const BASE = 7;
/** The lagoon lies this far below the land; its bed further down. */
const WATER_Y = -2.2;
/** The camera's zoom (screen pixels per chart unit), at most. */
const MAX_ZOOM = 42;
/** Closer than this, the tilt-shift blurs the far and the near. */
const NEAR_ZOOM = 22;

export interface Map3DProps {
  p: EmpirePayload;
  onTarget: (target: Target | null) => void;
}

/** Whether the device asks for less motion (read live). */
function useLive() {
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
 * Drawn again only when the house's state changes, not at each tick of the game's clock (the
 * canvas then asks no frame at rest); the latest `onTarget` is kept aside.
 */
export const Map3D = memo(
  forwardRef<EmpireMapHandle, Map3DProps>(function Map3D(props, ref) {
    const target = useRef(props.onTarget);
    target.current = props.onTarget;
    const onTarget = useCallback((x: Target | null) => target.current(x), []);
    return <Map3DView ref={ref} p={props.p} onTarget={onTarget} />;
  }),
  (a, b) => a.p === b.p,
);

const Map3DView = forwardRef<EmpireMapHandle, Map3DProps>(function Map3DView({ p, onTarget }, ref) {
  const map = p.view?.map;
  const wide = new URLSearchParams(window.location.search).get("scene") === "veneto";
  const input = useMemo<SceneInput | null>(() => {
    if (!map) return null;
    const own: SceneInput = {
      cells: map.cells,
      revealed: map.revealed,
      unlocked: map.unlocked,
      cities: map.cities,
      home: map.home?.placed === false ? null : map.home,
      posts: map.posts,
      depot: map.depot,
    };
    return wide ? wider(own, venice1450Empire.map as unknown as Parameters<typeof wider>[1]) : own;
  }, [map, wide]);
  const sc = useMemo(() => (input ? scene3d(input) : null), [input]);
  const live = useLive();
  const root = useRef<HTMLDivElement>(null);
  const controls = useRef<MapControlsImpl | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  // The point the scene is laid around (chart units): its middle.
  const origin = useMemo<[number, number]>(
    () =>
      sc ? [(sc.bounds.minX + sc.bounds.maxX) / 2, (sc.bounds.minY + sc.bounds.maxY) / 2] : [0, 0],
    [sc],
  );
  const pick = (id: string | null, target: Target | null) => {
    setPicked(id);
    onTarget(target);
    invalidate();
  };

  // The camera's moves, from the game's keys and buttons (as the SVG map's handle).
  const fit = () => {
    const el = root.current;
    if (!el || !sc) return 10;
    const w = el.clientWidth || 390;
    const h = el.clientHeight || 844;
    return Math.min((w * 0.95) / (Math.sqrt(3) * HEX_SIZE), (h * 0.62) / (2 * HEX_SIZE * 0.58));
  };
  const farZoom = () => {
    const el = root.current;
    if (!el || !sc) return 4;
    const w = sc.bounds.maxX - sc.bounds.minX;
    const h = (sc.bounds.maxY - sc.bounds.minY) * 0.58;
    return Math.min((el.clientWidth || 390) / w, (el.clientHeight || 844) / h) * 0.9;
  };
  const lookAt = (x: number, z: number, zoom?: number) => {
    const c = controls.current;
    if (!c) return;
    const cam = c.object as OrthoCam;
    const d = new Vector3().subVectors(cam.position, c.target);
    c.target.set(x, 0, z);
    cam.position.copy(c.target).add(d);
    if (zoom) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    c.update();
    onMove();
    invalidate();
  };
  const homeAt = (): [number, number] =>
    sc?.home ? [sc.home.x - origin[0], sc.home.y - origin[1]] : [0, 0];
  useImperativeHandle(ref, () => ({
    toggle() {
      const cam = controls.current?.object as OrthoCam | undefined;
      const [x, z] = homeAt();
      if (cam && cam.zoom > fit() * 1.5) lookAt(0, 0, fit());
      else lookAt(x, z, fit() * 2.6);
    },
    home() {
      const [x, z] = homeAt();
      lookAt(x, z, fit() * 2.6);
    },
    far() {
      lookAt(0, 0, Math.max(farZoom(), 1));
    },
    info() {},
    pan(dx, dy) {
      const c = controls.current;
      if (!c) return;
      const cam = c.object as OrthoCam;
      const el = root.current;
      const step = ((el?.clientWidth ?? 390) * 0.12) / cam.zoom;
      lookAt(c.target.x + dx * step, c.target.z + dy * step);
    },
    zoom(k) {
      const c = controls.current;
      if (!c) return;
      const cam = c.object as OrthoCam;
      cam.zoom = Math.min(MAX_ZOOM, Math.max(farZoom(), cam.zoom * k));
      cam.updateProjectionMatrix();
      onMove();
      invalidate();
    },
  }));

  // The camera's zoom on the HTML above (the rings grow with the map).
  const onMove = () => {
    const c = controls.current;
    if (!c || !sc) return;
    const cam = c.object as OrthoCam;
    // Bounded to the region: the camera's target stays over the ground seen.
    const hx = (sc.bounds.maxX - sc.bounds.minX) / 2;
    const hz = (sc.bounds.maxY - sc.bounds.minY) / 2;
    const tx = Math.min(hx, Math.max(-hx, c.target.x));
    const tz = Math.min(hz, Math.max(-hz, c.target.z));
    if (tx !== c.target.x || tz !== c.target.z) {
      const dx = tx - c.target.x;
      const dz = tz - c.target.z;
      c.target.x = tx;
      c.target.z = tz;
      cam.position.x += dx;
      cam.position.z += dz;
    }
    root.current?.style.setProperty("--z", cam.zoom.toFixed(2));
    // Far out, the names give way (as on the SVG map), the rings stay.
    if (root.current) root.current.toggleAttribute("data-far", cam.zoom < fit() * 0.6);
    const isNear = cam.zoom > NEAR_ZOOM;
    setNear((was) => (was === isNear ? was : isNear));
  };

  if (!sc || !input) return <div className="absolute inset-0 bg-[#16263E]" data-map="empire3d" />;
  const z0 = fit();
  const dist = 400;
  const camPos: [number, number, number] = [
    0,
    dist * Math.sin(ELEVATION),
    dist * Math.cos(ELEVATION),
  ];
  return (
    <div
      ref={root}
      className="group absolute inset-0 touch-none select-none overflow-hidden"
      style={{ background: NIGHT, ["--z" as string]: z0.toFixed(2) }}
      data-map="empire3d"
      data-live={live ? "" : undefined}
    >
      <Canvas
        frameloop="demand"
        shadows="soft"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl, scene }) => {
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
          scene.background = new Color(NIGHT);
          scene.fog = new Fog(NIGHT, dist - 30, dist + 160);
        }}
        onPointerMissed={(e) => {
          if (e.type === "click") pick(null, null);
        }}
      >
        <OrthographicCamera
          makeDefault
          position={camPos}
          zoom={z0}
          near={1}
          far={2000}
          onUpdate={(c) => c.lookAt(0, 0, 0)}
        />
        <MapControls
          ref={controls as never}
          enableRotate={false}
          enableDamping={false}
          screenSpacePanning={false}
          minZoom={Math.max(1, farZoom())}
          maxZoom={MAX_ZOOM}
          zoomToCursor
          onChange={onMove}
        />
        <Lights sc={sc} origin={origin} />
        <Suspense fallback={null}>
          {SHEET ? <KitSheet /> : null}
          {!SHEET && (
            <World
              sc={sc}
              origin={origin}
              live={live}
              picked={picked}
              follow={FOLLOW ? (at) => lookAt(at.x, at.z) : undefined}
              onPick={(id) => {
                if (id === "home") pick("home", { kind: "casa" });
                else if (id.startsWith("city:")) {
                  const code = id.slice(5);
                  pick(id, { kind: "city", code });
                }
              }}
            />
          )}
          <ShadowsOnce sc={sc} />
        </Suspense>
        <Labels p={p} sc={sc} origin={origin} picked={picked} onPick={pick} />
        {FX && <Effects near={near} />}
        <Ticker live={live} />
        {PERF && <Probe />}
      </Canvas>
    </div>
  );
});

export default Map3D;

/** One light from the upper left, a soft sky: clay under a single sun. */
function Lights({ sc, origin }: { sc: Scene3D; origin: [number, number] }) {
  const w = sc.bounds.maxX - sc.bounds.minX;
  const h = sc.bounds.maxY - sc.bounds.minY;
  const half = Math.max(w, h) * 0.75;
  void origin;
  return (
    <>
      <hemisphereLight args={["#CFE0F5", "#B89A62", 1.15]} />
      <directionalLight
        position={[-70, 120, -60]}
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
function ShadowsOnce({ sc }: { sc: Scene3D }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    void sc;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, sc]);
  return null;
}

/** While something moves, frames at 30 per second; none when the tab is hidden or still. */
function Ticker({ live }: { live: boolean }) {
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let odd = false;
    const loop = () => {
      odd = !odd;
      if (odd && !document.hidden) invalidate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);
  return null;
}

function Effects({ near }: { near: boolean }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        halfRes
        quality="performance"
        aoRadius={5}
        distanceFalloff={1.2}
        intensity={2.6}
        color={NIGHT}
      />
      <TiltShift2 blur={near ? 0.12 : 0} taper={0.6} />
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
/** The camera following the mule (?suivre=mule, for the captures and the video). */
const FOLLOW = new URLSearchParams(window.location.search).get("suivre") === "mule";
/** A sheet of every model, to choose them (?map=3d&kit=1, for development). */
const SHEET = new URLSearchParams(window.location.search).get("kit") === "1";
function KitSheet() {
  const kit = useKit();
  const names = Object.keys(FILES) as KitName[];
  return (
    <group position={[0, 0, 0]}>
      {names.map((n, i) => (
        <group key={n} position={[((i % 4) - 1.5) * 10, 0, Math.floor(i / 4) * 11 - 22]}>
          <mesh geometry={kit(n, { roof: C.roofGold }).geo} material={clayShared} scale={7} />
          <Html position={[0, -0.5, 3.5]} center>
            <span className="whitespace-nowrap bg-night px-1 text-xs text-cream">{n}</span>
          </Html>
        </group>
      ))}
    </group>
  );
}

/** The board, its dressing, its towns and buildings, and what moves on it. */
function World({
  sc,
  origin,
  live,
  picked,
  onPick,
  follow,
}: {
  sc: Scene3D;
  origin: [number, number];
  live: boolean;
  picked: string | null;
  onPick: (id: string) => void;
  follow?: (at: Vector3) => void;
}) {
  const kit = useKit();
  const [ox, oy] = origin;
  const at = (x: number, y: number): [number, number] => [x - ox, y - oy];
  const water = useWater(live);

  const slabs = useMemo(() => {
    const top = hexSlab(HEX_SIZE - 0.5, SLAB, 0.9);
    const base = hexSlab(HEX_SIZE - 0.9, BASE, 0.5);
    base.translate(0, -SLAB + 0.2, 0);
    const fog = hexSlab(HEX_SIZE - 1.6, 1.4, 0.4);
    fog.translate(0, -BASE - 1, 0);
    const bed = hexSlab(HEX_SIZE, BASE - 1, 0.2);
    bed.translate(0, -SLAB - 1.2, 0);
    return { top, base, fog, bed };
  }, []);
  // The tiles by kind, laid around the origin (kept while the board stays the same).
  const { own, seen, wet, fog, solid } = useMemo(() => {
    const of = (kind: string) =>
      sc.tiles
        .filter((tl) => tl.kind === kind)
        .map((tl) => ({ x: tl.x - ox, y: 0, z: tl.y - oy, s: 1 }));
    const own = of("own");
    const seen = of("seen");
    return { own, seen, wet: of("water"), fog: of("fog"), solid: [...own, ...seen] };
  }, [sc, ox, oy]);
  // The lagoon: one surface over every sea tile, finely cut for its ripples.
  const lagoon = useMemo(() => (wet.length ? lagoonGeometry(wet) : null), [wet]);
  const fogEdges = useMemo(() => new EdgesGeometry(hexSlab(HEX_SIZE - 1.6, 0.01, 0)), []);

  // The dressing, model by model, in one draw each.
  const decor = useMemo(() => {
    const groups = new Map<
      string,
      { model: KitModel; items: Parameters<typeof Instanced>[0]["items"] }
    >();
    const add = (key: string, model: KitModel, x: number, y: number, s: number, rot: number) => {
      const [px, pz] = [x - ox, y - oy];
      let g = groups.get(key);
      if (!g) {
        g = { model, items: [] };
        groups.set(key, g);
      }
      g.items.push({ x: px, y: 0, z: pz, s, rot });
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
                : 14 * pr.s;
      const over2 =
        pr.kind === "mountain" ? { ...over, wall: pr.muted ? C.snowSeen : C.snow } : over;
      add(`${name}:${pr.muted}`, kit(name, over2), pr.x, pr.y, across, pr.rot);
    }
    for (const town of sc.towns) {
      const over = town.muted ? muted : {};
      for (const h of town.houses)
        add(
          `town${h.variant}:${town.muted}`,
          kit(h.variant ? "homeB" : "homeA", over),
          h.x,
          h.y,
          3.4 * h.s,
          h.rot,
        );
      add(
        `church:${town.muted}`,
        kit("church", over),
        town.campanile.x,
        town.campanile.y,
        4.4 * town.campanile.s,
        0,
      );
    }
    return [...groups.entries()];
  }, [sc, kit, ox, oy]);

  const docks = sc.props.filter((pr) => pr.kind === "dock");
  const home = sc.home ? at(sc.home.x, sc.home.y) : null;
  const depot = sc.depot ? at(sc.depot.x, sc.depot.y) : null;

  // The rounds: the mule from the fondaco to Padua and back; the cart to the Remise or a field.
  const rounds = useMemo(() => roundsOf(sc, origin), [sc, origin]);
  const tap = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 8) return;
    onPick(id);
  };
  const towns = sc.towns.map((tw) => ({ id: `city:${tw.code}`, at: at(tw.x, tw.y), r: 6 }));
  const targets = [...(home ? [{ id: "home", at: home, r: 7 }] : []), ...towns];

  return (
    <group>
      {/* The tiles: one's own in sand-gold, the others seen in mist-blue, on night-blue bases. */}
      <Instanced geo={slabs.top} items={own} material={claySolid(C.land)} />
      <Instanced geo={slabs.top} items={seen} material={claySolid(C.mist)} />
      <Instanced geo={slabs.base} items={solid} material={claySolid(C.soil)} cast={false} />
      {/* The lagoon: its bed, its translucent water. */}
      <Instanced geo={slabs.bed} items={wet} material={claySolid(C.mistSoil)} cast={false} />
      {lagoon && <mesh geometry={lagoon} material={water} position-y={WATER_Y} receiveShadow />}
      {/* The unknown: low silhouettes, their edge drawn faintly. */}
      <Instanced
        geo={slabs.fog}
        items={fog}
        material={claySolid(C.mistSoil, { opacity: 0.85 })}
        cast={false}
        receive={false}
      />
      {fog.map((f) => (
        <lineSegments key={`${f.x},${f.z}`} geometry={fogEdges} position={[f.x, -BASE - 1, f.z]}>
          <lineBasicMaterial color={C.mist} transparent opacity={0.35} />
        </lineSegments>
      ))}
      {/* The dressing and the towns. */}
      {decor.map(([key, g]) => (
        <Instanced key={key} geo={g.model.geo} items={g.items} />
      ))}
      {docks.map((d) => {
        const [x, z] = at(d.x, d.y);
        return <Dock key={`${d.x},${d.y}`} x={x} z={z} rot={d.rot} />;
      })}
      {/* The fondaco: its hall under a gold roof, its tower, its flag, its chimney's smoke. */}
      {home && <Fondaco x={home[0]} z={home[1]} live={live} />}
      {/* The Remise: a market hall, its crates. */}
      {depot && (
        <group position={[depot[0], 0, depot[1]]}>
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
      {rounds.mule && <Track path={rounds.mule} />}
      {rounds.cart && <Track path={rounds.cart} />}
      {rounds.mule && <Mule path={rounds.mule} live={live} follow={follow} />}
      {rounds.cart && <Cart path={rounds.cart} live={live} />}
      {/* What a touch reaches: the fondaco and the towns, larger than they look; the one touched
          lights up in lapis. */}
      {targets.map((tg) => (
        <group key={tg.id} position={[tg.at[0], 0, tg.at[1]]}>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: a 3D object; the keys reach it by its name in HTML (Labels) or by the game's keys. */}
          <mesh onClick={tap(tg.id)} position-y={3} name={tg.id}>
            <cylinderGeometry args={[tg.r, tg.r, 7, 18]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
          {picked === tg.id && <Halo r={tg.r} live={live} />}
        </group>
      ))}
    </group>
  );
}

/** The fondaco: the house's hall (KayKit's large house, its roof in gold), a tower, the flag. */
function Fondaco({ x, z, live }: { x: number; z: number; live: boolean }) {
  const kit = useKit();
  const hall = kit("homeB", { roof: C.roofGold });
  const tower = kit("tower", { roof: C.roofGold });
  const s = 7.6;
  return (
    <group position={[x, 0, z]} name="fondaco">
      <mesh geometry={hall.geo} material={clayShared} scale={s} castShadow receiveShadow />
      <mesh
        geometry={tower.geo}
        material={clayShared}
        scale={3.4}
        position={[-4.4, 0, -2.4]}
        castShadow
        receiveShadow
      />
      <Flag at={[-4.4, tower.h * 3.4 - 0.3, -2.4]} live={live} s={0.9} />
      <Smoke at={[2.2, hall.h * s * 0.95, -1.2]} live={live} />
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

/** The ring under what is touched: lapis, breathing slowly. */
function Halo({ r, live }: { r: number; live: boolean }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.12} name="halo">
      <ringGeometry args={[r - 0.9, r, 48]} />
      <meshBasicMaterial
        color={C.water}
        transparent
        opacity={live ? 0.9 : 1}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** The lagoon's surface: each sea tile cut in small triangles, merged into one geometry. */
function lagoonGeometry(tiles: { x: number; z: number }[]): BufferGeometry {
  const rings = 6;
  const parts: BufferGeometry[] = [];
  for (const tl of tiles) {
    const pos: number[] = [];
    const corner = (i: number, f: number): [number, number] => {
      const a = (Math.PI / 180) * (90 + 60 * i);
      return [tl.x + HEX_SIZE * f * Math.cos(a), tl.z - HEX_SIZE * f * Math.sin(a)];
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

/** The mule's and the cart's paths, laid on the ground (y), around the scene's origin. */
function roundsOf(sc: Scene3D, origin: [number, number]) {
  const to3 = (pts: [number, number][] | null) =>
    pts?.map(([x, y]) => [x - origin[0], 0.05, y - origin[1]] as [number, number, number]) ?? null;
  return { mule: to3(sc.roads.mule), cart: to3(sc.roads.cart) };
}

/** A road on the ground: a ribbon of beaten earth along the path. */
function Track({ path }: { path: [number, number, number][] }) {
  const geo = useMemo(() => {
    const half = 1.1;
    const pos: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, , z0] = path[i] as [number, number, number];
      const [x1, , z1] = path[i + 1] as [number, number, number];
      const d = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (-(z1 - z0) / d) * half;
      const nz = ((x1 - x0) / d) * half;
      const y = 0.04;
      pos.push(x0 + nx, y, z0 + nz, x1 - nx, y, z1 - nz, x1 + nx, y, z1 + nz);
      pos.push(x0 + nx, y, z0 + nz, x0 - nx, y, z0 - nz, x1 - nx, y, z1 - nz);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.computeVertexNormals();
    return g;
  }, [path]);
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

/** The towns' names and order rings, and the fondaco's name, in HTML above the board. */
function Labels({
  p,
  sc,
  origin,
  picked,
  onPick,
}: {
  p: EmpirePayload;
  sc: Scene3D;
  origin: [number, number];
  picked: string | null;
  onPick: (id: string | null, target: Target | null) => void;
}) {
  return (
    <>
      {sc.towns.map((tw) => {
        const orders = p.view?.orders.find((o) => o.city === tw.code);
        const fill = orders ? Math.min(1, orders.fillBps / 10_000) : 0;
        const id = `city:${tw.code}`;
        const name = t.cityNames[tw.code] ?? tw.code.charAt(0).toUpperCase() + tw.code.slice(1);
        return (
          <Html
            key={tw.code}
            position={[tw.x - origin[0], 0, tw.y - origin[1]]}
            center
            zIndexRange={[20, 0]}
          >
            <button
              type="button"
              data-city={tw.code}
              data-fill={orders ? orders.fillBps : undefined}
              data-picked={picked === id ? "" : undefined}
              aria-label={name}
              // The HTML lies inside the canvas's own box: kept from it (no pan, no « missed »).
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onPick(id, { kind: "city", code: tw.code });
              }}
              className="relative flex items-center justify-center"
              style={{
                width: "max(44px, calc(var(--z) * 9px))",
                height: "max(44px, calc(var(--z) * 9px))",
              }}
            >
              {/* The ring grows and shrinks with the map; the touch keeps 44 px at least. */}
              {orders && (
                <span
                  className="pointer-events-none absolute"
                  style={{ width: "calc(var(--z) * 11px)", height: "calc(var(--z) * 11px)" }}
                >
                  <OrderRing fill={fill} />
                </span>
              )}
              <span
                className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded px-1.5 font-display text-xs font-bold text-cream transition-opacity group-data-[far]:opacity-0"
                style={{ background: "rgb(11 22 38 / 0.72)", textShadow: "0 1px 2px #0B1626" }}
              >
                {name}
              </span>
            </button>
          </Html>
        );
      })}
    </>
  );
}

/** The ring of a town's orders, laid flat on the ground: lagoon as it fills, gold when full. */
function OrderRing({ fill }: { fill: number }) {
  const full = fill >= 1;
  const r = 44;
  const round = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ transform: "scaleY(0.58)" }}
      aria-hidden="true"
      data-fill-ring
      data-full={full ? "" : undefined}
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill={full ? "rgb(244 197 84 / 0.14)" : "rgb(110 224 184 / 0.10)"}
        stroke="rgb(14 26 43 / 0.5)"
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={full ? C.gold : C.green}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${round * fill} ${round}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}
