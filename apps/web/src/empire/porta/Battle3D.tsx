/**
 * The battle in the lands of Rome as a diorama (docs/plan-porta-3d.md, step 1; decisions of the
 * owner of 4 November 2026): the land a small island of hexagonal tiles drawn from the battle's
 * seed, in the board's clay — its towns with their chests of relics, its pines, rocks and ruins,
 * the Porta of stone at its edge, the lagoon around — and every unit a figurine (figure.tsx) that
 * walks, shoots, takes its blows and falls as the engine's snapshots say, smoothed between two
 * beats. The blows fly (bolts, balls, sparks), the components show (the pavise's bubble, the
 * smoke's cloud, the trumpet's rings, the surgeon's glow), a dead man falls and fades, a burnt town
 * smokes. Its camera is the map's (useCamera through `view`, camera.ts), so the HTML over it lies
 * on its ground to the pixel. Nothing of the rules is here: the engine plays the battle.
 */
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
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
  CircleGeometry,
  Color,
  DoubleSide,
  type Group,
  MeshBasicMaterial,
  type OrthographicCamera,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { C } from "../../art/plateau/props.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { DISTANCE, orthoFrom } from "../map3d/camera.js";
import { Figure, type FigureHandle } from "../map3d/figure.js";
import {
  Instanced,
  type KitName,
  clay as clayShared,
  claySolid,
  hexSlab,
  useKit,
} from "../map3d/kit.js";
import { Smoke, useDonkey, useWater } from "../map3d/life.js";
import { preloadMinis } from "../map3d/minis.js";
import { Pace } from "../map3d/pace.js";
import { roleOf } from "../map3d/roster.js";
import { CASE, RARITY_HEX, extentOf, fromChart, toChart } from "./chart.js";
import type { BattleSnapshot, PlayerUnitView, Rarity, RomeUnitView } from "./types.js";

preloadMinis();

export { CASE, RARITY_HEX, extentOf, fromChart, toChart };

const NIGHT = "#16263E";
const SLAB = 2.4;
/** The figurines are drawn this much larger than on the board: a battle is read from afar. */
const FIG = 2.2;
/**
 * The units drawn this much larger again on the island (audit of 4 November, 3D B2 and UI U-13):
 * about 28 px high at the battle's first framing on a phone, above the pines.
 */
const UNIT = 1.9;
const TILE_R = CASE / Math.sqrt(3);

export interface Battle3DHandle {
  view(cam: Camera, v: Viewport): void;
  /** The unit of mine whose figurine stands under a point of the screen (44 px around it). */
  unitAt(x: number, y: number): string | null;
}

/** A small hash of a string (the battle's id), for its dressing. */
function seedOf(text: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16_777_619);
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2_246_822_507) ^ Math.imul(s ^ (s >>> 13), 3_266_489_909);
    s ^= s >>> 16;
    return (s >>> 0) / 4_294_967_296;
  };
}

/** The island's tiles: the lattice's points within the disc (land) and a ring beyond (sea). */
function islandOf(b: BattleSnapshot) {
  const land: { x: number; z: number }[] = [];
  const sea: { x: number; z: number }[] = [];
  const n = Math.ceil(b.radius) + 3;
  for (let r = -n; r <= n; r++)
    for (let q = -n; q <= n; q++) {
      const x = q + r / 2;
      const y = (r * Math.sqrt(3)) / 2;
      const d = Math.hypot(x, y);
      const [X, Z] = toChart(b, x, y);
      if (d <= b.radius + 0.35) land.push({ x: X, z: Z });
      else if (d <= b.radius + 2.2) sea.push({ x: X, z: Z });
    }
  return { land, sea };
}

/** What dresses the island: pines, olives, rocks, ruins, hills, kept off the towns and the gate. */
function dressingOf(b: BattleSnapshot) {
  const r = rng(seedOf(b.id));
  const out: { name: KitName; x: number; z: number; s: number; rot: number }[] = [];
  const clear = [b.gate, ...b.cities];
  // Half as much as before, and lower than the units (audit of 4 November, 3D B2): the island
  // dressed, never hiding who fights.
  const n = Math.round(b.radius * b.radius * 0.55);
  for (let i = 0; i < n; i++) {
    const d = Math.sqrt(r()) * (b.radius - 0.2);
    const a = r() * Math.PI * 2;
    const x = d * Math.cos(a);
    const y = d * Math.sin(a);
    if (clear.some((c) => Math.hypot(c.x - x, c.y - y) < 1.4)) continue;
    const k = r();
    const name: KitName =
      k < 0.42
        ? "pineA"
        : k < 0.62
          ? "pineB"
          : k < 0.82
            ? "rockA"
            : k < 0.92
              ? "rockC"
              : "mountainA";
    const [X, Z] = toChart(b, x, y);
    const s =
      name === "mountainA"
        ? 6 + r() * 2
        : name.startsWith("pine")
          ? 2.6 + r() * 0.8
          : 2 + r() * 1.2;
    out.push({ name, x: X, z: Z, s, rot: r() * Math.PI * 2 });
  }
  return out;
}

const tileTop = hexSlab(TILE_R - 0.35, SLAB, 0.6);
const seaBed = hexSlab(TILE_R - 0.15, 2, 0.2);
const ring = new RingGeometry(0.9, 1.15, 40, 1);
ring.rotateX(-Math.PI / 2);
/** A health ring for each tenth of it, from the top, clockwise. */
const HP = Array.from({ length: 11 }, (_, i) => {
  const g = new RingGeometry(0.9, 1.15, 40, 1, Math.PI / 2, -Math.PI * 2 * Math.max(0.001, i / 10));
  g.rotateX(-Math.PI / 2);
  return g;
});
const disc = new CircleGeometry(1, 40);
disc.rotateX(-Math.PI / 2);
const ball = new SphereGeometry(0.35, 10, 8);
const bubble = new SphereGeometry(1, 20, 14);
const halo = new TorusGeometry(1, 0.09, 6, 36);
// The relic's loading, clockwise from the top, by fortieths (made at their first use, then kept).
const rings = new Map<number, RingGeometry>();
const loadingRing = (steps: number) => {
  let g = rings.get(steps);
  if (!g) {
    g = new RingGeometry(1.9, 2.3, steps, 1, Math.PI / 2, (-Math.PI * 2 * steps) / 40);
    g.rotateX(-Math.PI / 2);
    rings.set(steps, g);
  }
  return g;
};
halo.rotateX(Math.PI / 2);
/**
 * A glowing material, one for each colour and opacity, made once and kept (audit of 4 November,
 * 3D M1): a material made at each render is never freed by React Three Fiber.
 */
/** Rome's one red, the interface's cinnabar (audit of 4 November, UI U-13). */
const ROME = "#FF8070";
const glows = new Map<string, MeshBasicMaterial>();
const glow = (hex: string, opacity: number) => {
  const key = `${hex}/${opacity}`;
  let m = glows.get(key);
  if (!m) {
    m = new MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      depthWrite: false,
      side: DoubleSide,
    });
    glows.set(key, m);
  }
  return m;
};
const M = {
  gold: glow(C.gold, 0.9),
  goldSoft: glow(C.gold, 0.25),
  vision: glow(ROME, 0.12),
  reach: glow(ROME, 0.1),
  shield: glow("#9FE7FF", 0.28),
  smoke: glow("#C9D2DE", 0.55),
  heal: glow("#6EE0B8", 0.45),
  hpBack: glow("#0E1A2B", 0.55),
  blob: glow("#08111F", 0.38),
  // The vehicle chosen, ringed in lapis (a choice, never gold: UI U-1).
  chosen: glow("#6EC8F5", 0.95),
  hpMine: glow("#6EE0B8", 0.95),
  hpAlly: glow("#6EC8F5", 0.95),
  hpRome: glow(ROME, 0.95),
  bolt: new MeshBasicMaterial({ color: "#F7EBD0" }),
  iron: new MeshBasicMaterial({ color: "#2A2F36" }),
  spark: glow("#FFD27A", 0.95),
};

/** How a unit's blow travels: a bolt (crossbows), a ball (culverin, bombard), a spark (close). */
function shotOf(u: BattleSnapshot["units"][number]): "bolt" | "ball" | "spark" {
  if (u.side === "rome") {
    if (u.kind === "crossbowman") return "bolt";
    if (u.kind === "bombard") return "ball";
    return "spark";
  }
  const w = u.weapons[0]?.effect;
  return w === "crossbows" ? "bolt" : w === "culverin" ? "ball" : "spark";
}

interface Shot {
  key: string;
  kind: "bolt" | "ball" | "spark";
  from: Vector3;
  to: Vector3;
  t0: number;
}

/** The figurines' places, smoothed between two snapshots (a beat of 250 ms). */
interface Track {
  from: [number, number];
  to: [number, number];
  t0: number;
  heading: number;
  /** How long its way to `to` takes: the beat as it comes, a little more. */
  ms: number;
}
/** The server's beat at first (settings' stepMs); then as measured between its snapshots. */
const BEAT = 250;
/**
 * A unit takes a little longer than a beat to reach its new place (audit of 4 November, motion
 * M8): a snapshot late by some tens of ms no longer stops it dead before the next one.
 */
const SLACK = 1.2;
/** A blow taken shows when its bolt lands (ms after the beat). */
const HIT_LAG = 300;
/** A dead man lies this long, then sinks till he is gone (ms). */
const SINK_AT = 2_200;
const GONE_AT = 3_000;

const Battle3D = memo(
  forwardRef<
    Battle3DHandle,
    { battle: BattleSnapshot; selected: string | null; live: boolean; onReady?: () => void }
  >(function Battle3D({ battle, selected, live, onReady }, ref) {
    const camera = useRef<OrthographicCamera | null>(null);
    const last = useRef<{ cam: Camera; v: Viewport } | null>(null);
    const tracks = useRef(new Map<string, Track>());
    const beat = useRef(BEAT);
    const seen = useRef({ time: -1, at: 0 });
    const apply = () => {
      const c = camera.current;
      const l = last.current;
      if (!c || !l) return;
      const o = orthoFrom(l.cam, l.v);
      c.position.set(...o.position);
      c.zoom = o.zoom;
      c.lookAt(...o.target);
      c.updateProjectionMatrix();
      invalidate();
    };
    // The figurines' new places, from where each stands now (a beat to get there), the beat
    // measured between the snapshots as they come (never a fixed 250 ms).
    const now = performance.now();
    if (seen.current.time !== battle.timeMs) {
      const gap = now - seen.current.at;
      if (seen.current.at > 0 && gap > 80 && gap < 1_500)
        beat.current = beat.current * 0.7 + gap * 0.3;
      seen.current = { time: battle.timeMs, at: now };
    }
    const ms = beat.current * SLACK;
    for (const u of battle.units) {
      const [X, Z] = toChart(battle, u.x, u.y);
      const t = tracks.current.get(u.id);
      if (!t) {
        tracks.current.set(u.id, { from: [X, Z], to: [X, Z], t0: now, heading: 0, ms });
        continue;
      }
      if (t.to[0] === X && t.to[1] === Z) continue;
      const k = Math.min(1, (now - t.t0) / t.ms);
      const at: [number, number] = [
        t.from[0] + (t.to[0] - t.from[0]) * k,
        t.from[1] + (t.to[1] - t.from[1]) * k,
      ];
      t.heading = Math.atan2(X - at[0], Z - at[1]);
      t.from = at;
      t.to = [X, Z];
      t.t0 = now;
      t.ms = ms;
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: made once, its methods read refs
    useImperativeHandle(
      ref,
      () => ({
        view(cam, v) {
          last.current = { cam, v };
          apply();
        },
        unitAt(x, y) {
          const c = camera.current;
          const l = last.current;
          if (!c || !l) return null;
          let best: { id: string; d: number } | null = null;
          for (const u of latest.current.units) {
            if (u.side !== "player" || !u.mine || u.outcome !== "in") continue;
            const t = tracks.current.get(u.id);
            if (!t) continue;
            const p = new Vector3(t.to[0], 1.4, t.to[1]).project(c);
            const d = Math.hypot(((p.x + 1) / 2) * l.v.w - x, ((1 - p.y) / 2) * l.v.h - y);
            if (d < 30 && (!best || d < best.d)) best = { id: u.id, d };
          }
          return best?.id ?? null;
        },
      }),
      [],
    );
    const latest = useRef(battle);
    latest.current = battle;
    return (
      <Canvas
        className="!absolute inset-0"
        frameloop="demand"
        dpr={[1, 1.5]}
        orthographic
        camera={{ near: 1, far: 2000, position: [0, DISTANCE, DISTANCE] }}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
        onCreated={({ scene, camera: c }) => {
          scene.background = new Color(NIGHT);
          camera.current = c as OrthographicCamera;
          apply();
        }}
        data-battle3d
      >
        {/* A battle of ten minutes at 30 frames a second, not 60: the phone keeps cool. */}
        <Pace fps={live ? 30 : 0} rest={30} />
        <hemisphereLight args={["#CFE0F5", "#B89A62", 1.15]} />
        <directionalLight position={[-70, 120, -60]} intensity={2.3} color="#FFF3DD" />
        <Suspense fallback={null}>
          <Island battle={battle} live={live} />
          <Units battle={battle} tracks={tracks} selected={selected} live={live} />
          <Shots battle={battle} tracks={tracks} />
          <Ready onReady={onReady} />
        </Suspense>
      </Canvas>
    );
  }),
);

export default Battle3D;

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => onReady?.(), [onReady]);
  return null;
}

/** The island: its tiles, its lagoon, its dressing, its towns, its gate (drawn once a battle). */
function Island({ battle, live }: { battle: BattleSnapshot; live: boolean }) {
  const kit = useKit();
  const water = useWater(live);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the island is the battle's, by its id
  const { land, sea, decor } = useMemo(() => {
    const { land: l, sea: s } = islandOf(battle);
    return { land: l, sea: s, decor: dressingOf(battle) };
  }, [battle.id]);
  const groups = useMemo(() => {
    const g = new Map<KitName, { x: number; y: number; z: number; s: number; rot: number }[]>();
    for (const d of decor) {
      const list = g.get(d.name) ?? [];
      list.push({ x: d.x, y: 0, z: d.z, s: d.s, rot: d.rot });
      g.set(d.name, list);
    }
    return [...g.entries()];
  }, [decor]);
  const [cx, cz] = toChart(battle, 0, 0);
  const lagoon = useMemo(() => {
    const g = new CircleGeometry((battle.radius + 2.6) * CASE, 48);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [battle.radius]);
  return (
    <group>
      <Instanced
        geo={tileTop}
        items={land.map((t) => ({ x: t.x, y: 0, z: t.z, s: 1, rot: 0 }))}
        material={claySolid(C.land)}
      />
      <Instanced
        geo={seaBed}
        items={sea.map((t) => ({ x: t.x, y: -3, z: t.z, s: 1, rot: 0 }))}
        material={claySolid(C.mistSoil)}
        cast={false}
      />
      <mesh geometry={lagoon} material={water} position={[cx, -1.6, cz]} />
      {groups.map(([name, items]) => (
        <Instanced key={name} geo={kit(name).geo} items={items} />
      ))}
      {battle.cities.map((c) => (
        <Town key={c.id} battle={battle} city={c} live={live} />
      ))}
      <Gate battle={battle} />
    </group>
  );
}

/** A town of Rome: its houses (terracotta roofs), its church, its chests of the player's relics. */
function Town({
  battle,
  city,
  live,
}: {
  battle: BattleSnapshot;
  city: BattleSnapshot["cities"][number];
  live: boolean;
}) {
  const kit = useKit();
  const [X, Z] = toChart(battle, city.x, city.y);
  const [burntAt, setBurntAt] = useState<number | null>(null);
  useEffect(() => {
    if (battle.events.some((e) => e.kind === "burnt" && e.city === city.id))
      setBurntAt(battle.timeMs);
  }, [battle, city.id]);
  const burnt = burntAt !== null;
  const roof = burnt ? "#3A3A3E" : C.brick;
  const houses = useMemo(() => {
    const r = rng(seedOf(city.id));
    return Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + r();
      return { x: Math.cos(a) * 4.6, z: Math.sin(a) * 4.6, rot: r() * 6, v: r() > 0.5 };
    });
  }, [city.id]);
  const chests = (Object.entries(city.relics) as [Rarity, number][]).flatMap(([k, n]) =>
    Array.from({ length: n }, () => k),
  );
  return (
    <group position={[X, 0, Z]}>
      {houses.map((h, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: a town's houses are its own
          key={i}
          geometry={kit(h.v ? "homeB" : "homeA", { roof }).geo}
          material={clayShared}
          position={[h.x, 0, h.z]}
          rotation-y={h.rot}
          scale={5.2}
        />
      ))}
      <mesh geometry={kit("church", { roof }).geo} material={clayShared} scale={6.4} />
      {/* Its chests of relics, one for each, in the colour of its rarity. */}
      {chests.map((k, i) => {
        const a = (i / Math.max(1, chests.length)) * Math.PI * 2;
        return (
          <mesh
            // biome-ignore lint/suspicious/noArrayIndexKey: chests of a rarity are alike
            key={i}
            position={[Math.cos(a) * 2.4, 0.7, Math.sin(a) * 2.4 + 3]}
            material={claySolid(RARITY_HEX[k])}
          >
            <boxGeometry args={[1.5, 1.4, 1.1]} />
          </mesh>
        );
      })}
      {/* Its reach for loading: a faint ring on the ground. */}
      <mesh geometry={ring} material={M.goldSoft} scale={CASE} position-y={0.05} />
      {burnt && <Smoke at={[0, 3.5, 0]} live={live} />}
    </group>
  );
}

/** The Porta of the lands: two towers of stone and an arch of gold light, its ring of exit. */
function Gate({ battle }: { battle: BattleSnapshot }) {
  const kit = useKit();
  const [X, Z] = toChart(battle, battle.gate.x, battle.gate.y);
  const stone = kit("tower", { roof: C.rockSeen });
  const r = (battle.gateRadiusCenti / 100) * CASE;
  // Its face toward the island's middle.
  const face = Math.atan2(-battle.gate.x, -battle.gate.y);
  return (
    <group position={[X, 0, Z]} rotation-y={face}>
      <mesh geometry={disc} material={M.goldSoft} scale={r} position-y={0.05} />
      <mesh geometry={ring} material={M.gold} scale={r} position-y={0.06} />
      <mesh geometry={stone.geo} material={clayShared} scale={3.4} position={[-3.2, 0, 0]} />
      <mesh geometry={stone.geo} material={clayShared} scale={3.4} position={[3.2, 0, 0]} />
      <mesh position={[0, 3.2, 0]}>
        <torusGeometry args={[2.4, 0.5, 8, 16, Math.PI]} />
        <meshStandardMaterial color={C.rockSeen} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[3.8, 4.4]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.55} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Every unit, a figurine at its smoothed place, turned to its way or its target. */
function Units({
  battle,
  tracks,
  selected,
  live,
}: {
  battle: BattleSnapshot;
  tracks: React.MutableRefObject<Map<string, Track>>;
  selected: string | null;
  live: boolean;
}) {
  return (
    <group>
      {battle.units.map((u) => (
        <Unit
          key={u.id}
          battle={battle}
          u={u}
          tracks={tracks}
          chosen={u.id === selected}
          live={live}
        />
      ))}
    </group>
  );
}

function Unit({
  battle,
  u,
  tracks,
  chosen,
  live,
}: {
  battle: BattleSnapshot;
  u: BattleSnapshot["units"][number];
  tracks: React.MutableRefObject<Map<string, Track>>;
  chosen: boolean;
  live: boolean;
}) {
  const group = useRef<Group>(null);
  const fig = useRef<FigureHandle>(null);
  const hp = useRef<Group>(null);
  const dead = u.side === "rome" ? u.dead : u.outcome === "dead" || u.outcome === "lost";
  const gone = u.side === "player" && u.outcome === "exited";
  const [deadAt, setDeadAt] = useState<number | null>(null);
  useEffect(() => {
    if (dead && deadAt === null) setDeadAt(performance.now());
  }, [dead, deadAt]);
  // What it does, from the snapshot: a blow given this beat, a blow taken, walking, standing.
  const struck = battle.events.some((e) => e.kind === "hit" && e.from === u.id);
  const hurt = battle.events.some((e) => e.kind === "hit" && e.to === u.id);
  useEffect(() => {
    const f = fig.current;
    if (!f) return;
    if (dead) f.act("die");
    else if (struck) f.act("strike");
    else if (hurt) {
      // The blow is felt when it lands, not when it leaves (audit of 4 November, motion M8): the
      // bolt flies some 300 ms first.
      const id = window.setTimeout(() => fig.current?.act("hit"), HIT_LAG);
      return () => window.clearTimeout(id);
    }
  }, [dead, struck, hurt]);
  useFrame(() => {
    const g = group.current;
    const t = tracks.current.get(u.id);
    if (!g || !t) return;
    const k = Math.min(1, (performance.now() - t.t0) / t.ms);
    const x = t.from[0] + (t.to[0] - t.from[0]) * k;
    const z = t.from[1] + (t.to[1] - t.from[1]) * k;
    // A dead man lies a while, then sinks into the sand (audit of 4 November, motion M9).
    const age = deadAt === null ? 0 : performance.now() - deadAt;
    g.position.set(x, age > SINK_AT ? -((age - SINK_AT) / (GONE_AT - SINK_AT)) * 3 : 0, z);
    // Facing its target while it fights, else its way.
    const target =
      u.side === "rome" ? u.targetId : (u.weapons.find((w) => w.targetId)?.targetId ?? null);
    const tt = target ? tracks.current.get(target) : undefined;
    const heading = tt ? Math.atan2(tt.to[0] - x, tt.to[1] - z) : t.heading;
    g.rotation.y +=
      Math.atan2(Math.sin(heading - g.rotation.y), Math.cos(heading - g.rotation.y)) * 0.2;
    const moving = k < 1 && Math.hypot(t.to[0] - t.from[0], t.to[1] - t.from[1]) > 0.05;
    if (!dead && !struck && !hurt) fig.current?.act(moving ? "walk" : "stand");
    if (hp.current) hp.current.rotation.y = -g.rotation.y;
  });
  // A dead man stays a moment, then fades; one out through the gate is gone.
  if (gone) return null;
  if (deadAt !== null && performance.now() - deadAt > GONE_AT) return null;
  const share = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const mine = u.side === "player" && u.mine;
  const big = u.side === "rome" && u.kind === "gonfalonier" ? 1.8 : 1;
  const player = u.side === "player" ? (u as PlayerUnitView) : null;
  const rome = u.side === "rome" ? (u as RomeUnitView) : null;
  const t = battle.timeMs;
  return (
    <group ref={group}>
      {u.side === "player" && u.role === "transport" ? (
        <group scale={FIG * UNIT}>
          <Mule cargo={(u as PlayerUnitView).cargo} live={live} />
        </group>
      ) : (
        <group scale={UNIT}>
          <Figure
            ref={fig}
            role={roleOf(
              u.side === "rome"
                ? { side: "rome", kind: u.kind }
                : { side: "player", model: u.model },
            )}
            live={live}
          />
        </group>
      )}
      {/* Its shadow on the sand: it stands on the island, never floats over it. */}
      <mesh geometry={disc} material={M.blob} scale={0.95 * big * FIG * UNIT} position-y={0.02} />
      {/* Its health, a ring at its feet: green for mine, blue an ally's, red Rome's. */}
      <group ref={hp} position-y={0.08} scale={1.5 * big * FIG * UNIT}>
        <mesh geometry={ring} material={M.hpBack} />
        <mesh
          geometry={HP[Math.round(share * 10)] ?? ring}
          material={mine ? M.hpMine : u.side === "player" ? M.hpAlly : M.hpRome}
        />
      </group>
      {chosen && (
        <mesh geometry={halo} material={M.chosen} scale={2.2 * FIG * UNIT} position-y={0.12} />
      )}
      {/* Rome's eyes, when it is roused: its vision, and its reach while it strikes. */}
      {rome && (rome.state === "alert" || rome.state === "attack") && !dead && (
        <mesh
          geometry={ring}
          material={M.vision}
          scale={(rome.visionCenti / 100) * CASE}
          position-y={0.04}
        />
      )}
      {rome && rome.state === "attack" && !dead && (
        <mesh
          geometry={disc}
          material={M.reach}
          scale={(rome.rangeCenti / 100) * CASE}
          position-y={0.03}
        />
      )}
      {/* The incendiary burning a town: its ring of fire filling. */}
      {rome?.burnS && (rome.burning ?? 0) > 0 ? (
        <mesh
          geometry={ring}
          material={glow("#FF8A3D", 0.9)}
          scale={CASE * 0.6 * Math.min(1, (rome.burning ?? 0) / (rome.burnS * 1_000)) + 1}
          position-y={0.1}
        />
      ) : null}
      {/* The components' effects. */}
      {player && player.shield > 0 && (
        <mesh geometry={bubble} material={M.shield} scale={2.6 * FIG} position-y={1.4 * FIG} />
      )}
      {player && player.hiddenUntil > t && (
        <group scale={FIG}>
          <SmokeCloud />
        </group>
      )}
      {player?.actives.some((a) => a.effect === "trumpet" && a.until > t) && (
        <group scale={FIG}>
          <Rings material={M.gold} />
        </group>
      )}
      {player?.actives.some((a) => a.effect === "surgeon" && a.until > t) && (
        <group scale={FIG}>
          <Rings material={M.heal} />
        </group>
      )}
      {/* The transport loading a relic: a ring that fills, in its rarity's colour. */}
      {player?.loading && (
        <Loading rarity={player.loading.rarity} doneAt={player.loading.doneAt} t={t} />
      )}
    </group>
  );
}

/** The transport: the mule and its crates, its relics glowing on its back. */
function Mule({ cargo, live }: { cargo: Rarity[]; live: boolean }) {
  const donkey = useDonkey(2.6);
  useEffect(() => {
    donkey.walking?.play();
    donkey.resting?.play();
    if (donkey.walking) donkey.walking.weight = 0;
  }, [donkey]);
  useFrame((_, dt) => {
    if (live) donkey.mixer.update(Math.min(dt, 0.1));
  });
  return (
    <group>
      <primitive object={donkey.root} />
      {cargo.map((k, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
          key={i}
          position={[i % 2 ? 0.45 : -0.45, donkey.height * 0.95, -0.1 - Math.floor(i / 2) * 0.6]}
          material={claySolid(RARITY_HEX[k])}
        >
          <boxGeometry args={[0.55, 0.5, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

function SmokeCloud() {
  return (
    <group position-y={1.2}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          geometry={ball}
          material={M.smoke}
          position={[Math.cos(i * 1.6) * 1.1, i * 0.35, Math.sin(i * 1.6) * 1.1]}
          scale={3.2 - i * 0.4}
        />
      ))}
    </group>
  );
}

/** Rings rising round a unit (the trumpet's call, the surgeon's care). */
function Rings({ material }: { material: MeshBasicMaterial }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => {
      const k = (clock.elapsedTime * 0.8 + i / 3) % 1;
      c.position.y = 0.2 + k * 2.4;
      c.scale.setScalar(1.6 + k * 1.2);
    });
  });
  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={halo} material={material} />
      ))}
    </group>
  );
}

function Loading({ rarity, doneAt, t }: { rarity: Rarity; doneAt: number; t: number }) {
  // The loading's time: from its rarity (docs/plan-porta.md § 6.3).
  const total = { common: 10_000, rare: 20_000, precious: 35_000, legendary: 60_000 }[rarity];
  const done = Math.max(0, Math.min(1, 1 - (doneAt - t) / total));
  // The ring by steps of a fortieth, each made once and kept: no geometry made again at each beat.
  const steps = Math.max(1, Math.round(40 * Math.max(0.02, done)));
  return (
    <mesh
      geometry={loadingRing(steps)}
      material={glow(RARITY_HEX[rarity], 0.95)}
      position-y={0.14}
    />
  );
}

/**
 * The blows of each beat flying from their striker to their target: a bolt along a straight line,
 * a ball on an arc, a spark where a close blow lands; and the damage, read over the target by the
 * HTML layer (Battle.tsx).
 */
function Shots({
  battle,
  tracks,
}: {
  battle: BattleSnapshot;
  tracks: React.MutableRefObject<Map<string, Track>>;
}) {
  const shots = useRef<Shot[]>([]);
  const group = useRef<Group>(null);
  const invalid = useThree((s) => s.invalidate);
  useEffect(() => {
    const now = performance.now();
    const byId = new Map(battle.units.map((u) => [u.id, u]));
    battle.events.forEach((e, i) => {
      if (e.kind !== "hit") return;
      const a = tracks.current.get(e.from);
      const b = tracks.current.get(e.to);
      const from = byId.get(e.from);
      if (!a || !b || !from) return;
      shots.current.push({
        key: `${battle.timeMs}:${i}`,
        kind: shotOf(from),
        from: new Vector3(a.to[0], 1.6, a.to[1]),
        to: new Vector3(b.to[0], 1.2, b.to[1]),
        t0: now,
      });
    });
    invalid();
  }, [battle, tracks, invalid]);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    shots.current = shots.current.filter((s) => now - s.t0 < 450);
    g.children.forEach((c, i) => {
      const s = shots.current[i];
      c.visible = !!s;
      if (!s) return;
      const k = Math.min(1, (now - s.t0) / (s.kind === "spark" ? 220 : 380));
      const p = s.kind === "spark" ? s.to.clone() : s.from.clone().lerp(s.to, k);
      if (s.kind === "ball") p.y += Math.sin(k * Math.PI) * 3;
      c.position.copy(p);
      c.lookAt(s.to);
      c.scale.setScalar(s.kind === "spark" ? 0.6 + k * 1.4 : 1);
      const m = c as unknown as { material: MeshBasicMaterial };
      m.material = s.kind === "bolt" ? M.bolt : s.kind === "ball" ? M.iron : M.spark;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 32 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a pool of shots
        <mesh key={i} geometry={ball} visible={false} scale={0.6} />
      ))}
    </group>
  );
}
