/**
 * The empire's map in 3D (docs/plateau-reprise.md, § 7): the board as a little living diorama in
 * real time (three.js through React Three Fiber), after the owner's references: thick hexagonal
 * tiles of clay, blue roofs, pines, rocks, under one light. It lies under the map's own layers
 * (EmpireMap): its camera is the map's (useCamera), turned into an orthographic camera that sees
 * the ground exactly where the SVG map drew it (camera.ts), so the places, the rings, the vehicles'
 * medals, the orbit and the timers lie on it to the pixel. Built from the house's map (`p.view.map`)
 * through `scene3d`, with the night board's grid and seeds.
 */
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
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HEX_SIZE } from "../../art/hexmap.js";
import { C } from "../../art/plateau/props.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import type { EmpirePayload } from "../types.js";
import { DISTANCE, orthoFrom } from "./camera.js";
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
import { type Scene3D, type SceneInput, scene3d } from "./scene.js";

Cache.enabled = true;

const NIGHT = "#16263E";
/** The tiles: a clay slab on a night-blue base. */
const SLAB = 3;
const BASE = 7;
/** The lagoon lies this far below the land; its bed further down. */
const WATER_Y = -2.2;
/** The unknown's silhouettes: thin slabs, their top this far under the land's. */
const FOG_Y = -0.8;
/** Closer than this (px per unit), the tilt-shift blurs the far and the near. */
const NEAR_ZOOM = 22;

/** What the map tells the board: where its camera is. */
export interface Board3DHandle {
  /** The map's camera moved (at each frame of a gesture): the board's follows. */
  view(cam: Camera, v: Viewport): void;
}

export interface Board3DProps {
  p: EmpirePayload;
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
  forwardRef<Board3DHandle, Board3DProps>(function Board3D({ p }, ref) {
    const map = p.view?.map;
    const input = useMemo<SceneInput | null>(
      () =>
        map
          ? {
              cells: map.cells,
              revealed: map.revealed,
              unlocked: map.unlocked,
              cities: map.cities,
              home: map.home?.placed === false ? null : map.home,
              posts: map.posts,
              depot: map.depot,
              camp: map.camp,
              porta: p.view?.porta?.cell ?? null,
            }
          : null,
      [map, p.view?.porta?.cell],
    );
    const sc = useMemo(() => (input ? scene3d(input) : null), [input]);
    const live = useLive();
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
      invalidate();
    };
    useImperativeHandle(ref, () => ({
      view(cam, v) {
        last.current = { cam, v };
        apply();
      },
    }));
    if (!sc) return null;
    return (
      <Canvas
        className="!absolute inset-0"
        frameloop="demand"
        shadows="soft"
        dpr={[1, 1.5]}
        orthographic
        camera={{ near: 1, far: 2000, position: [0, DISTANCE, DISTANCE] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl, scene, camera: c }) => {
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
          scene.background = new Color(NIGHT);
          scene.fog = new Fog(NIGHT, DISTANCE - 30, DISTANCE + 160);
          camera.current = c as OrthoCam;
          apply();
        }}
        data-board3d
      >
        <Lights sc={sc} />
        <Suspense fallback={null}>
          <World sc={sc} live={live} />
          <ShadowsOnce sc={sc} />
        </Suspense>
        {FX && <Effects near={near} />}
        <Ticker live={live} />
        {PERF && <Probe />}
      </Canvas>
    );
  }),
  (a, b) => a.p.view?.map === b.p.view?.map && a.p.view?.porta?.cell === b.p.view?.porta?.cell,
);

export default Board3D;

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
/** The board, its dressing, its towns and buildings. Chart units: x east, z south. */
function World({ sc, live }: { sc: Scene3D; live: boolean }) {
  const kit = useKit();
  const water = useWater(live);

  const slabs = useMemo(() => {
    const top = hexSlab(HEX_SIZE - 0.5, SLAB, 0.9);
    const base = hexSlab(HEX_SIZE - 0.9, BASE, 0.5);
    base.translate(0, -SLAB + 0.2, 0);
    const fog = hexSlab(HEX_SIZE - 1.6, 1.4, 0.4);
    // Its top just under the ground: the map's outlines (the sectors to buy) lie on it.
    fog.translate(0, FOG_Y, 0);
    const bed = hexSlab(HEX_SIZE, BASE - 1, 0.2);
    bed.translate(0, -SLAB - 1.2, 0);
    return { top, base, fog, bed };
  }, []);
  // The tiles by kind (kept while the board stays the same).
  const { own, seen, wet, fog, solid } = useMemo(() => {
    const of = (kind: string) =>
      sc.tiles.filter((tl) => tl.kind === kind).map((tl) => ({ x: tl.x, y: 0, z: tl.y, s: 1 }));
    const own = of("own");
    const seen = of("seen");
    return { own, seen, wet: of("water"), fog: of("fog"), solid: [...own, ...seen] };
  }, [sc]);
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
  }, [sc, kit]);

  const docks = sc.props.filter((pr) => pr.kind === "dock");
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
        <lineSegments key={`${f.x},${f.z}`} geometry={fogEdges} position={[f.x, FOG_Y + 0.05, f.z]}>
          <lineBasicMaterial color={C.mist} transparent opacity={0.35} />
        </lineSegments>
      ))}
      {/* The dressing and the towns. */}
      {decor.map(([key, g]) => (
        <Instanced key={key} geo={g.model.geo} items={g.items} />
      ))}
      {/* The lanes from the fondaci to the towns: beaten earth. */}
      {sc.lanes.map((l) => (
        <Track key={l.map((q) => q.join(",")).join(" ")} path={l} />
      ))}
      {docks.map((d) => (
        <Dock key={`${d.x},${d.y}`} x={d.x} z={d.y} rot={d.rot} />
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

/** The Porta: two stone towers and a glowing arch between them. */
function Porta({ x, z }: { x: number; z: number }) {
  const kit = useKit();
  const stone = kit("tower", { roof: C.rockSeen });
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={stone.geo} material={clayShared} scale={3} position={[-3, 0, 0]} castShadow />
      <mesh geometry={stone.geo} material={clayShared} scale={3} position={[3, 0, 0]} castShadow />
      <mesh position={[0, 2.2, 0.2]}>
        <torusGeometry args={[1.9, 0.45, 8, 16, Math.PI]} />
        <meshStandardMaterial color={C.rockSeen} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.6, 0.1]}>
        <planeGeometry args={[3, 3.2]} />
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
  const kit = useKit();
  const hall = kit("homeB", { roof: C.roofGold });
  const tower = kit("tower", { roof: C.roofGold });
  const s = 7.6;
  return (
    <group position={[x, 0, z]} scale={k} name="fondaco">
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
