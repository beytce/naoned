/**
 * The battle in the lands of Rome as a diorama (docs/plan-porta-3d.md, docs/plan-porta-porcellana.md
 * P4, docs/plan-porta-jeu.md lots A and B): the land an island of square tiles of biscuit drawn
 * from the battle's seed — its towns with their chests of relics, its groves, rocks and peaks, the
 * Porta at its edge — and every unit a turned porcelain piece on its base (the house's in the
 * accent, Rome's in ink), never smaller than a finger can read.
 *
 * What moves: the pieces go on between two beats at their own speed (dead reckoning, then eased to
 * the server's place), the house's ways lie in ribbons of accent with their running chevrons, Rome
 * shows whom it aims at (a thread of ink) and where the bombard's ball will fall (a ring filling),
 * the blows fly and break into shards, a piece killed breaks, a relic leaps from its chest to the
 * mule. The tiles drop into place from the gate when the battle opens, and turn on their ink back
 * from the far rim when Rome closes its lands. Its camera is the map's (useCamera through `view`),
 * so the HTML over it lies on its ground to the pixel. Nothing of the rules is here.
 */
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import {
  type MutableRefObject,
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
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { Pawn as Figure } from "../../porcellana/Pawn.js";
import type { FigureHandle } from "../../porcellana/Pawn.js";
import { Stage } from "../../porcellana/Stage.js";
import { easeOutBack, easeOutCubic, tileDrop } from "../../porcellana/arrival.js";
import { bake } from "../../porcellana/bake.js";
import { flipLift } from "../../porcellana/flip.js";
import { createPalette } from "../../porcellana/materials.js";
import { mountain, rocks } from "../../porcellana/models/decor.js";
import { grove } from "../../porcellana/models/ground.js";
import { porta } from "../../porcellana/models/places.js";
import { chest } from "../../porcellana/models/porta.js";
import { town } from "../../porcellana/models/towns.js";
import { mule } from "../../porcellana/models/vehicles.js";
import { drawChevron, ribbonGeometry, roundedPath } from "../../porcellana/ribbon.js";
import { ACCENTS, ARRIVAL, BOARD, COL, FLIP, RIBBON } from "../../porcellana/tokens.js";
import { DISTANCE, orthoFrom } from "../map3d/camera.js";
import { roleOf } from "../map3d/roster.js";
import { CASE, TURN, extentOf, fromChart, toChart } from "./chart.js";
import { RARITY_HEX, ROME_DUSK } from "./colours.js";
import { wayOf } from "./orders.js";
import type { BattleSnapshot, PlayerUnitView, Rarity, RomeUnitView } from "./types.js";

export { CASE, RARITY_HEX, extentOf, fromChart, toChart };

type AnyUnit = BattleSnapshot["units"][number];
type Point = { x: number; y: number };

/** The transports' mules, in the house's porcelain. */
const HOUSE_PALETTE = createPalette();
/** The lands of Rome in biscuit (D5): their towns, their gate, their dressing. */
const BISCUIT = createPalette({ biscuit: true });
const ACCENT = ACCENTS.rosso;
const INK = COL.ink;
/** An ally's base: the interface's violet of choice, never the accent (it is mine). */
const ALLY = "#7E6BD9";
/** The kit's tile against a case of the battle: the island's pieces are the Carte's, larger. */
const K = CASE / (BOARD.tile + BOARD.gap);
const GATE_OF_ROME = (() => {
  const g = porta(HOUSE_PALETTE, { seed: 0, running: true }).group;
  g.scale.setScalar(K);
  g.position.z = 0.6;
  return g;
})();
/** A tile of the island, rounded like the Carte's. */
const TILE_GEO = new RoundedBoxGeometry(
  BOARD.tile * K,
  BOARD.thick * K,
  BOARD.tile * K,
  3,
  BOARD.radius * K,
);
TILE_GEO.translate(0, (-BOARD.thick * K) / 2, 0);
/** The tiles' own material: white, each tile's colour its own (biscuit, then ink on its back). */
const TILE_MAT = (() => {
  const m = (BISCUIT.m("ground") as MeshStandardMaterial).clone();
  m.color.set("#FFFFFF");
  return m;
})();
const TILE_FACE = (BISCUIT.m("ground") as MeshStandardMaterial).color.clone();
const TILE_BACK = new Color(INK);

/** A tile's dressing at the Carte's scale: a grove, rocks, a peak, by the battle's draw. */
function dressingOf(kind: "grove" | "rocks" | "mount" | "few", seed: number): Group {
  const o = { seed, running: false };
  const g =
    kind === "rocks"
      ? rocks(BISCUIT, o).group
      : kind === "mount"
        ? mountain(BISCUIT, o).group
        : grove(BISCUIT, seed, kind === "few" ? 2 : 5, ["cypress", "round"]).group;
  const root = new Group();
  root.add(g);
  bake(root);
  root.scale.setScalar(K);
  return root;
}
/** The gems' materials, one per colour. */
const GEMS = new Map<string, MeshStandardMaterial>();
const gem = (hex: string) => {
  let m = GEMS.get(hex);
  if (!m) {
    m = new MeshStandardMaterial({
      color: hex,
      roughness: 0.35,
      emissive: hex,
      emissiveIntensity: 0.25,
    });
    GEMS.set(hex, m);
  }
  return m;
};

/** The figurines are drawn this much larger than on the board: a battle is read from afar. */
const FIG = 2.2;
const UNIT = 1.4;
/** A piece's base, in chart units, and the height its piece stands. */
const BASE = 2.3;
const TALL = 2.4 * UNIT;
/**
 * A piece never stands lower than this on the screen (docs/plan-porta-jeu.md, B3; after Hades'
 * Star's ships, which keep a size a finger reads however far the camera): px, and the most a piece
 * grows for it.
 */
const MIN_PX = 30;
const MAX_GROW = 3.4;

export interface Battle3DHandle {
  view(cam: Camera, v: Viewport): void;
  /** The piece under a point of the screen: one of mine first, else one of Rome's. */
  pick(x: number, y: number): { kind: "mine" | "rome"; id: string } | null;
  /** Where a piece stands now on the chart (smoothed), or null. */
  placeOf(id: string): [number, number] | null;
}

/** What the scene tells its screen: a heavy blow, one of mine or of Rome's broken. */
export type Impact = "heavy" | "mine" | "rome";

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

interface Tile {
  X: number;
  Z: number;
  dress: Group | null;
  /** Its cases from the gate: when it drops at the opening. */
  fromGate: number;
  /** 0 at the gate to 1 at the far rim: when it turns at the closing (the far ones first). */
  rank: number;
  /** A town's or the gate's own tile: it turns last. */
  kept: boolean;
}

/** The island's tiles: the square lattice's cells within the disc, each with its dressing. */
function islandOf(b: BattleSnapshot): Tile[] {
  const r = rng(seedOf(b.id));
  const clear = [b.gate, ...b.cities];
  const tiles: Tile[] = [];
  const n = Math.ceil(b.radius) + 1;
  let far = 1;
  for (let y = -n; y <= n; y++)
    for (let x = -n; x <= n; x++) {
      if (Math.hypot(x, y) > b.radius + 0.35) continue;
      const [X, Z] = toChart(b, x, y);
      const near = clear.some((c) => Math.hypot(c.x - x, c.y - y) < 1.3);
      const k = r();
      // Sparse, as on the Carte: most tiles bare, a grove here, rocks there, a peak at the rim.
      const kind = near
        ? null
        : k < 0.16
          ? "grove"
          : k < 0.24
            ? "rocks"
            : k < 0.28 && Math.hypot(x, y) > b.radius - 1.5
              ? "mount"
              : k < 0.46
                ? "few"
                : null;
      const fromGate = Math.hypot(x - b.gate.x, y - b.gate.y);
      far = Math.max(far, fromGate);
      tiles.push({
        X,
        Z,
        dress: kind ? dressingOf(kind, Math.floor(r() * 997)) : null,
        fromGate,
        rank: 0,
        kept: near,
      });
    }
  for (const t of tiles) t.rank = t.fromGate / far;
  return tiles;
}

const ring = new RingGeometry(0.94, 1.04, 64, 1);
ring.rotateX(-Math.PI / 2);
const thinRing = new RingGeometry(0.975, 1.0, 64, 1);
thinRing.rotateX(-Math.PI / 2);
/** A health ring for each twentieth of it, from the top, clockwise. */
const HP_STEPS = 20;
const HP = Array.from({ length: HP_STEPS + 1 }, (_, i) => {
  const g = new RingGeometry(
    1.14,
    1.34,
    48,
    1,
    Math.PI / 2,
    -Math.PI * 2 * Math.max(0.001, i / HP_STEPS),
  );
  g.rotateX(-Math.PI / 2);
  return g;
});
const hpBack = new RingGeometry(1.14, 1.34, 48, 1);
hpBack.rotateX(-Math.PI / 2);
const disc = new CircleGeometry(1, 40);
disc.rotateX(-Math.PI / 2);
const ball = new SphereGeometry(0.35, 10, 8);
const bolt = new BoxGeometry(0.16, 0.16, 2.2);
const bubble = new SphereGeometry(1, 20, 14);
const halo = new TorusGeometry(1, 0.05, 6, 48);
halo.rotateX(Math.PI / 2);
const chevron = new ConeGeometry(0.55, 0.9, 4);
chevron.rotateX(Math.PI);
const shard = new TetrahedronGeometry(0.42);
const jewel = new OctahedronGeometry(0.6);
const thread = new BoxGeometry(1, 0.05, 0.14);
thread.translate(0.5, 0, 0);
// The relic's loading, clockwise from the top, by fortieths (made at their first use, then kept).
const rings = new Map<number, RingGeometry>();
const loadingRing = (steps: number) => {
  let g = rings.get(steps);
  if (!g) {
    g = new RingGeometry(1.55, 1.9, steps, 1, Math.PI / 2, (-Math.PI * 2 * steps) / 40);
    g.rotateX(-Math.PI / 2);
    rings.set(steps, g);
  }
  return g;
};
/**
 * A flat material, one for each colour and opacity, made once and kept (audit of 4 November, 3D
 * M1): a material made at each render is never freed by React Three Fiber.
 */
const glows = new Map<string, MeshBasicMaterial>();
const glow = (hex: string, opacity: number) => {
  const key = `${hex}/${opacity}`;
  let m = glows.get(key);
  if (!m) {
    m = new MeshBasicMaterial({
      color: hex,
      transparent: opacity < 1,
      opacity,
      depthWrite: false,
      side: DoubleSide,
    });
    glows.set(key, m);
  }
  return m;
};
const M = {
  gate: glow(INK, 0.35),
  gateSoft: glow(INK, 0.08),
  town: glow(INK, 0.1),
  vision: glow(INK, 0.22),
  visionLit: glow(ACCENT, 0.55),
  reach: glow(INK, 0.4),
  shield: glow("#9FE7FF", 0.28),
  smoke: glow("#C9D2DE", 0.55),
  heal: glow("#6EE0B8", 0.45),
  call: glow(INK, 0.35),
  hpBack: glow(INK, 0.14),
  blob: glow("#3A2E22", 0.16),
  baseMine: glow(ACCENT, 1),
  baseAlly: glow(ALLY, 1),
  baseRome: glow(INK, 1),
  chosen: glow(ACCENT, 0.95),
  range: glow(ACCENT, 0.4),
  thread: glow(INK, 0.6),
  threadSoft: glow(INK, 0.25),
  zone: glow(INK, 0.5),
  zoneFill: glow(INK, 0.22),
  fire: glow("#FF8A3D", 0.9),
  bolt: new MeshBasicMaterial({ color: INK }),
  boltMine: new MeshBasicMaterial({ color: ACCENT }),
  iron: new MeshBasicMaterial({ color: "#2A2F36" }),
  spark: glow("#FFFFFF", 0.95),
};

/** How a unit's blow travels: a bolt (crossbows), a ball (culverin, bombard), a spark (close). */
function shotOf(u: AnyUnit): "bolt" | "ball" | "spark" {
  if (u.side === "rome") {
    if (u.kind === "crossbowman") return "bolt";
    if (u.kind === "bombard") return "ball";
    return "spark";
  }
  const w = u.weapons[0]?.effect;
  return w === "crossbows" ? "bolt" : w === "culverin" ? "ball" : "spark";
}

/**
 * The scene's clock (ms): the wall's, but it stands still a few frames at a heavy blow (docs/
 * plan-porta-jeu.md, B4: the blow is felt, then its consequence), then goes on from there.
 */
const clock = {
  lost: 0,
  heldAt: 0,
  heldFor: 0,
  now(): number {
    const t = performance.now();
    if (this.heldFor > 0) {
      if (t < this.heldAt + this.heldFor) return this.heldAt - this.lost;
      this.lost += this.heldFor;
      this.heldFor = 0;
    }
    return t - this.lost;
  },
  hold(ms: number) {
    if (this.heldFor > 0) return;
    this.now();
    this.heldAt = performance.now();
    this.heldFor = ms;
  },
};
const HOLD_MS = 80;

/** A piece's place on the chart: where the server put it, how fast it goes, where it is drawn. */
interface Track {
  /** The server's place at the last beat, and its speed since the one before (units a second). */
  tx: number;
  tz: number;
  vx: number;
  vz: number;
  /** When that beat came (the scene's clock). */
  at: number;
  /** Where it is drawn, and pushed aside from a piece standing on it. */
  x: number;
  z: number;
  ox: number;
  oz: number;
  heading: number;
  /** Still on the island (not dead, not out). */
  on: boolean;
}
type Tracks = MutableRefObject<Map<string, Track>>;

/** What the pieces share, frame after frame. */
interface Shared {
  tracks: Tracks;
  /** The server's beat, as measured between its snapshots (ms). */
  beat: MutableRefObject<number>;
  /** How much a piece grows to stay readable at the camera's zoom. */
  grow: MutableRefObject<number>;
  /** The battle as the last snapshot told it, and when it came (the scene's clock). */
  latest: MutableRefObject<BattleSnapshot>;
  seenAt: MutableRefObject<number>;
  /** When the island opened (the scene's clock), or 0 when it stands already. */
  openedAt: MutableRefObject<number>;
  live: boolean;
}

/** The battle's own time now (ms), run on from the last snapshot. */
const battleNow = (s: Shared) =>
  s.latest.current.timeMs +
  (s.latest.current.over ? 0 : Math.min(clock.now() - s.seenAt.current, s.beat.current * 2));

/** The opening: the tiles drop from the gate outward, then the pieces come (seconds). */
const OPEN_STEP = 0.07;
const openEnd = (radius: number) => radius * 2 * OPEN_STEP + ARRIVAL.duration;
/** The closing: the tiles turn on their back over the last minute (ms). */
const CLOSING_MS = 60_000;
const KEPT_MS = 2_500;

const isDown = (u: AnyUnit) =>
  u.side === "rome" ? u.dead : u.outcome === "dead" || u.outcome === "lost";
const isGone = (u: AnyUnit) => u.side === "player" && u.outcome === "exited";

const Battle3D = memo(
  forwardRef<
    Battle3DHandle,
    {
      battle: BattleSnapshot;
      /** The vehicle chosen, and those its orders move with it. */
      selected: string | null;
      moved?: string[];
      /** A way being drawn with the finger, from the chosen vehicle (battle's cases). */
      ghost?: Point[] | null;
      /** The last order's place: a ring falls there. */
      marker?: { x: number; y: number; n: number } | null;
      /** A component's reach shown round the chosen vehicle while its button is held (centi). */
      rangeCenti?: number | null;
      live: boolean;
      onImpact?: (kind: Impact) => void;
      onReady?: () => void;
    }
  >(function Battle3D(
    { battle, selected, moved, ghost, marker, rangeCenti, live, onImpact, onReady },
    ref,
  ) {
    const camera = useRef<OrthographicCamera | null>(null);
    const last = useRef<{ cam: Camera; v: Viewport } | null>(null);
    const tracks = useRef(new Map<string, Track>());
    const beat = useRef(battle.stepMs || 250);
    const grow = useRef(1);
    const seen = useRef({ time: -1, at: 0, id: "" });
    const latest = useRef(battle);
    latest.current = battle;
    const seenAt = useRef(0);
    const openedAt = useRef(0);
    const apply = () => {
      const c = camera.current;
      const l = last.current;
      if (!c || !l) return;
      const o = orthoFrom(l.cam, l.v);
      c.position.set(...o.position);
      c.zoom = o.zoom;
      c.lookAt(...o.target);
      c.updateProjectionMatrix();
      grow.current = Math.min(MAX_GROW, Math.max(1, MIN_PX / (TALL * l.cam.s * 0.85)));
      invalidate();
    };
    // The pieces' new places: each goes on from the last one at the speed it showed between the
    // two (the beat as measured between the snapshots, never a fixed 250 ms).
    const now = clock.now();
    if (seen.current.id !== battle.id) {
      tracks.current.clear();
      seen.current = { time: -1, at: 0, id: battle.id };
      // A battle just begun opens; one come back to stands already.
      openedAt.current = live && battle.timeMs < 2_000 ? now : 0;
    }
    if (seen.current.time !== battle.timeMs) {
      const gap = now - seen.current.at;
      if (seen.current.at > 0 && gap > 80 && gap < 1_500)
        beat.current = beat.current * 0.7 + gap * 0.3;
      seen.current = { ...seen.current, time: battle.timeMs, at: now };
      seenAt.current = now;
      const s = beat.current / 1_000;
      for (const u of battle.units) {
        const [X, Z] = toChart(battle, u.x, u.y);
        const on = !isDown(u) && !isGone(u);
        const t = tracks.current.get(u.id);
        if (!t) {
          tracks.current.set(u.id, {
            tx: X,
            tz: Z,
            vx: 0,
            vz: 0,
            at: now,
            x: X,
            z: Z,
            ox: 0,
            oz: 0,
            heading: 0,
            on,
          });
          continue;
        }
        const dx = X - t.tx;
        const dz = Z - t.tz;
        // A leap (a battle come back to after a while) is no speed.
        const leap = Math.hypot(dx, dz) > CASE * 2;
        t.vx = leap || !on ? 0 : dx / s;
        t.vz = leap || !on ? 0 : dz / s;
        t.tx = X;
        t.tz = Z;
        t.at = now;
        t.on = on;
        if (leap || !live) {
          t.x = X;
          t.z = Z;
        }
      }
    }
    const shared = useMemo<Shared>(
      () => ({ tracks, beat, grow, latest, seenAt, openedAt, live }),
      [live],
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: made once, its methods read refs
    useImperativeHandle(
      ref,
      () => ({
        view(cam, v) {
          last.current = { cam, v };
          apply();
        },
        pick(x, y) {
          const c = camera.current;
          const l = last.current;
          if (!c || !l) return null;
          let best: { kind: "mine" | "rome"; id: string; d: number } | null = null;
          for (const u of latest.current.units) {
            const mine = u.side === "player" && u.mine;
            if (u.side === "player" && !mine) continue;
            if (isDown(u) || isGone(u)) continue;
            const t = tracks.current.get(u.id);
            if (!t) continue;
            const p = new Vector3(t.x + t.ox, TALL * 0.5 * grow.current, t.z + t.oz).project(c);
            const d = Math.hypot(((p.x + 1) / 2) * l.v.w - x, ((1 - p.y) / 2) * l.v.h - y);
            // A finger's width round a piece; one of mine before one of Rome's at the same reach.
            const reach = mine ? 34 : 28;
            if (d > reach) continue;
            const score = d - (mine ? 12 : 0);
            if (!best || score < best.d)
              best = { kind: mine ? "mine" : "rome", id: u.id, d: score };
          }
          return best ? { kind: best.kind, id: best.id } : null;
        },
        placeOf(id) {
          const t = tracks.current.get(id);
          return t ? [t.x + t.ox, t.z + t.oz] : null;
        },
      }),
      [],
    );
    // The eyes of Rome a way drawn crosses: lit while the finger draws.
    const watched = useMemo(() => {
      const out = new Set<string>();
      if (!ghost || ghost.length < 2) return out;
      for (const u of battle.units) {
        if (u.side !== "rome" || u.dead) continue;
        const r = u.visionCenti / 100;
        for (let i = 1; i < ghost.length; i++)
          if (segmentNear(ghost[i - 1] as Point, ghost[i] as Point, u) <= r) out.add(u.id);
      }
      return out;
    }, [ghost, battle]);
    return (
      <Canvas
        className="!absolute inset-0"
        frameloop="demand"
        dpr={[1, 1.75]}
        orthographic
        camera={{ near: 1, far: 2000, position: [0, DISTANCE, DISTANCE] }}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
        onCreated={({ camera: c }) => {
          camera.current = c as OrthographicCamera;
          apply();
        }}
        data-battle3d
      >
        <Frames live={live} />
        {/* The Carte's light, shadows and occlusion, over the lands of Rome in biscuit. */}
        <Stage
          target={centre(battle)}
          plain={!live}
          phone={window.innerWidth < 640}
          background={ROME_DUSK.sky}
          scale={((battle.radius + 2) * CASE) / 36}
        />
        <Suspense fallback={null}>
          <Motion shared={shared} />
          <Island battle={battle} shared={shared} />
          <Ways battle={battle} shared={shared} selected={selected} ghost={ghost ?? null} />
          <Marker battle={battle} marker={marker ?? null} />
          <Threats shared={shared} />
          <Units
            battle={battle}
            shared={shared}
            selected={selected}
            moved={moved ?? []}
            watched={watched}
            rangeCenti={rangeCenti ?? null}
          />
          <Shots battle={battle} shared={shared} onImpact={onImpact} />
          <Ready onReady={onReady} />
        </Suspense>
      </Canvas>
    );
  }),
);

export default Battle3D;

/** How near a point lies to a segment (the battle's cases). */
function segmentNear(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const k = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(a.x + dx * k - p.x, a.y + dy * k - p.y);
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => onReady?.(), [onReady]);
  return null;
}

/**
 * The scene's frames (docs/plan-porta-jeu.md, B2): every frame of the screen while the device
 * keeps up, every other one (30 a second) once it has lagged a while; none while the page is
 * hidden or less motion is asked (the scene is then drawn at each snapshot).
 */
function Frames({ live }: { live: boolean }) {
  const ask = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!live) return;
    let id = 0;
    let before = performance.now();
    let slow = 0;
    let half = false;
    let odd = false;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const t = performance.now();
      const dt = t - before;
      before = t;
      if (document.hidden) return;
      // Two seconds of frames a quarter late: the device is told to take its time.
      if (!half) {
        slow = dt > 22 ? slow + 1 : Math.max(0, slow - 2);
        if (slow > 120) half = true;
      }
      odd = !odd;
      if (!half || odd) ask();
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [live, ask]);
  return null;
}

/**
 * The pieces' motion, once a frame for all: each goes on from the server's last place at the speed
 * it showed (no more than a beat and a half ahead), and its drawing eases to that; two pieces on
 * the same spot step aside so that both are seen.
 */
function Motion({ shared }: { shared: Shared }) {
  useFrame((_, dt) => {
    const { tracks, beat, grow, live } = shared;
    const now = clock.now();
    const ahead = (beat.current / 1_000) * 1.5;
    const k = live ? 1 - Math.exp(-Math.min(dt, 0.1) / 0.09) : 1;
    const all = [...tracks.current.values()];
    for (const t of all) {
      const el = live ? Math.min((now - t.at) / 1_000, ahead) : 0;
      t.x += (t.tx + t.vx * el - t.x) * k;
      t.z += (t.tz + t.vz * el - t.z) * k;
      if (Math.hypot(t.vx, t.vz) > 0.4) t.heading = Math.atan2(t.vx, t.vz);
    }
    // Aside from one another: half the lack each, along the line between them.
    const apart = BASE * 2.1 * grow.current;
    const want = new Map<Track, [number, number]>();
    const on = all.filter((t) => t.on);
    for (let i = 0; i < on.length; i++)
      for (let j = i + 1; j < on.length; j++) {
        const a = on[i] as Track;
        const b = on[j] as Track;
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        if (d >= apart) continue;
        if (d < 0.01) {
          dx = 1;
          dz = 0;
          d = 1;
        }
        const push = (apart - d) / 2;
        const wa = want.get(a) ?? [0, 0];
        const wb = want.get(b) ?? [0, 0];
        want.set(a, [wa[0] - (dx / d) * push, wa[1] - (dz / d) * push]);
        want.set(b, [wb[0] + (dx / d) * push, wb[1] + (dz / d) * push]);
      }
    for (const t of all) {
      const w = want.get(t) ?? [0, 0];
      t.ox += (w[0] - t.ox) * k;
      t.oz += (w[1] - t.oz) * k;
    }
  }, -1);
  return null;
}

/** The island's middle on the chart: where the sun aims. */
const centres = new Map<string, Vector3>();
function centre(b: BattleSnapshot): Vector3 {
  let v = centres.get(b.id);
  if (!v) {
    const [X, Z] = toChart(b, 0, 0);
    v = new Vector3(X, 0, Z);
    centres.set(b.id, v);
  }
  return v;
}

/**
 * The island: its square tiles of biscuit, their dressing, its towns, its gate. The tiles drop
 * into place from the gate when the battle opens (the Carte's arrival), and over the last minute
 * turn on their back of ink, the far rim first, the towns' and the gate's own at the very end:
 * Rome closes its lands. The turning is the drawing, not the rule: nothing is lost before zero.
 */
function Island({ battle, shared }: { battle: BattleSnapshot; shared: Shared }) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the island is the battle's, by its id
  const tiles = useMemo(() => islandOf(battle), [battle.id]);
  const state = useRef<{ drop: number[]; turn: number[] }>({ drop: [], turn: [] });
  const mesh = useMemo(() => {
    const m = new InstancedMesh(TILE_GEO, TILE_MAT, tiles.length);
    const o = new Object3D();
    tiles.forEach((x, i) => {
      o.position.set(x.X, 0, x.Z);
      o.rotation.y = TURN;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, TILE_FACE);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    state.current = { drop: tiles.map(() => Number.NaN), turn: tiles.map(() => 0) };
    return m;
  }, [tiles]);
  const pivot = useMemo(() => new Object3D(), []);
  const settled = useRef(false);
  const town = useRef<Group>(null);
  useFrame(() => {
    const now = clock.now();
    const st = state.current;
    let dirty = false;
    let tinted = false;
    // The opening: each tile from above, the nearest to the gate first.
    const opened = shared.openedAt.current;
    const t = opened > 0 ? (now - opened) / 1_000 : Number.POSITIVE_INFINITY;
    const opening = t < openEnd(battle.radius) + 0.3;
    // The closing: how far each tile has turned.
    const left = battle.endsAtMs - battleNow(shared);
    const closing = left < CLOSING_MS;
    if (!opening && !closing && settled.current) return;
    settled.current = !opening && !closing;
    tiles.forEach((x, i) => {
      const drop = opening ? tileDrop(t, x.fromGate * OPEN_STEP) : { y: 0, visible: true };
      const y = drop.visible ? drop.y * K : -9_999;
      // It turns when the time left falls under its share of the last minute.
      const from = x.kept ? KEPT_MS : KEPT_MS + (CLOSING_MS - KEPT_MS) * x.rank;
      const since = closing ? (from - left) / 1_000 : -1;
      const angle =
        since <= 0
          ? 0
          : shared.live
            ? Math.PI * easeOutBack(since / FLIP.turn, FLIP.overshoot)
            : Math.PI;
      if (st.drop[i] === y && st.turn[i] === angle) return;
      const back = angle > Math.PI / 2;
      if (back !== (st.turn[i] ?? 0) > Math.PI / 2) {
        mesh.setColorAt(i, back ? TILE_BACK : TILE_FACE);
        tinted = true;
      }
      st.drop[i] = y;
      st.turn[i] = angle;
      // Turned about its own middle, lifted at mid-turn.
      pivot.position.set(
        x.X,
        y + flipLift(angle) * K - (angle > 0 ? (BOARD.thick * K) / 2 : 0),
        x.Z,
      );
      pivot.rotation.set(0, TURN, 0);
      pivot.rotateX(angle);
      if (angle > 0) pivot.translateY((BOARD.thick * K) / 2);
      pivot.updateMatrix();
      mesh.setMatrixAt(i, pivot.matrix);
      if (x.dress) {
        // Its dressing lands with it, and goes when it turns.
        const up =
          angle > 0 ? 0 : opening ? easeOutBack((t - x.fromGate * OPEN_STEP - 0.45) / 0.3) : 1;
        x.dress.visible = up > 0.01;
        x.dress.scale.setScalar(K * Math.max(0.01, up));
        x.dress.position.y = Math.max(0, y);
      }
      dirty = true;
    });
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
    if (tinted && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // The towns and the gate rise once their ground has landed.
    if (town.current) {
      const up = opening ? easeOutBack((t - openEnd(battle.radius) * 0.55) / 0.4) : 1;
      town.current.visible = up > 0.01;
      town.current.scale.set(1, Math.max(0.01, up), 1);
    }
  });
  return (
    <group>
      <primitive object={mesh} />
      {tiles.map((x, i) =>
        x.dress ? (
          <primitive
            // biome-ignore lint/suspicious/noArrayIndexKey: the island is drawn once
            key={i}
            object={x.dress}
            position={[x.X, 0, x.Z]}
            rotation-y={TURN}
          />
        ) : null,
      )}
      <group ref={town}>
        {battle.cities.map((c) => (
          <Town key={c.id} battle={battle} city={c} live={shared.live} />
        ))}
        <Gate battle={battle} />
      </group>
    </group>
  );
}

/** A town's houses stand this far behind its middle (chart units): its square stays clear. */
const TOWN_BACK: [number, number] = [0, -6.2];
/** Where a town's chests stand, from its middle (chart units): in a row at the houses' foot. */
const chestAt = (i: number): [number, number, number] => [
  (i % 4) * 1.7 - 2.6,
  0,
  -2.6 - Math.floor(i / 4) * 1.3,
];

/** A town of Rome: its houses, its chests of the player's relics. */
function Town({
  battle,
  city,
  live,
}: {
  battle: BattleSnapshot;
  city: BattleSnapshot["cities"][number];
  live: boolean;
}) {
  const [X, Z] = toChart(battle, city.x, city.y);
  const [burntAt, setBurntAt] = useState<number | null>(null);
  useEffect(() => {
    if (battle.events.some((e) => e.kind === "burnt" && e.city === city.id))
      setBurntAt(battle.timeMs);
  }, [battle, city.id]);
  const burnt = burntAt !== null;
  const houses = useMemo(
    () => town(BISCUIT, { seed: seedOf(city.id) % 997, running: false, size: 3 }).group,
    [city.id],
  );
  const chests = (Object.entries(city.relics) as [Rarity, number][]).flatMap(([k, n]) =>
    Array.from({ length: n }, () => k),
  );
  return (
    <group position={[X, 0, Z]}>
      {/* A town of Rome in Porcellana's biscuit (D5, D6), fallen once it has burnt. */}
      {/* Behind its square: the vehicles that come to load stand in front of it, in sight. */}
      <primitive
        object={houses}
        position={[TOWN_BACK[0], 0, TOWN_BACK[1]]}
        scale={[K * 0.9, burnt ? K * 0.3 : K * 0.9, K * 0.9]}
        rotation-y={TURN}
      />
      {/* Its chests of relics, one for each, a gem of its rarity's colour on the lid. */}
      {chests.map((k, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: chests of a rarity are alike
        <Chest key={i} hex={RARITY_HEX[k]} at={chestAt(i)} />
      ))}
      {/* Its reach for loading: a ring on the ground, where the transport must stand. */}
      <mesh
        geometry={thinRing}
        material={M.town}
        scale={(battle.cityRadiusCenti / 100) * CASE}
        position-y={0.05}
      />
      {burnt && <Smoke at={[TOWN_BACK[0], 3.5, TOWN_BACK[1]]} live={live} />}
    </group>
  );
}

/** The Porta of the lands, and its ring: a vehicle within it may go out. */
function Gate({ battle }: { battle: BattleSnapshot }) {
  const [X, Z] = toChart(battle, battle.gate.x, battle.gate.y);
  const r = (battle.gateRadiusCenti / 100) * CASE;
  // Its face toward the island's middle.
  const [cx, cz] = toChart(battle, 0, 0);
  const face = Math.atan2(cx - X, cz - Z);
  return (
    <group position={[X, 0, Z]} rotation-y={face}>
      <mesh geometry={disc} material={M.gateSoft} scale={r} position-y={0.05} />
      <mesh geometry={ring} material={M.gate} scale={r} position-y={0.06} />
      <primitive object={GATE_OF_ROME} />
    </group>
  );
}

/** The chevrons' tile, the accent's (made once). */
let chevrons: CanvasTexture | null = null;
function chevronTexture(): CanvasTexture {
  if (chevrons) return chevrons;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) drawChevron(ctx, ACCENT);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  chevrons = tex;
  return tex;
}
const wayMats = new Map<number, MeshBasicMaterial>();
const wayMat = (opacity: number) => {
  let m = wayMats.get(opacity);
  if (!m) {
    m = new MeshBasicMaterial({
      map: chevronTexture(),
      transparent: opacity < 1,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
    });
    wayMats.set(opacity, m);
  }
  return m;
};

/**
 * The house's ways (docs/plan-porta-jeu.md, A3): a ribbon of accent on the ground from each of my
 * vehicles through the steps of its way, the Carte's road with its chevrons running; the chosen
 * one's bright, the other's pale; a way being drawn with the finger, paler still.
 */
function Ways({
  battle,
  shared,
  selected,
  ghost,
}: {
  battle: BattleSnapshot;
  shared: Shared;
  selected: string | null;
  ghost: Point[] | null;
}) {
  useFrame((_, dt) => {
    if (shared.live) chevronTexture().offset.x -= Math.min(dt, 0.1) * RIBBON.speed;
  });
  const mine = battle.units.filter(
    (u): u is PlayerUnitView => u.side === "player" && u.mine && u.outcome === "in",
  );
  const byId = new Map(battle.units.map((u) => [u.id, u]));
  return (
    <group>
      {mine.map((u) => {
        // Its way: its steps, or straight to the one it attacks.
        const foe = u.attack ? byId.get(u.attack) : undefined;
        const way = foe ? [{ x: foe.x, y: foe.y }] : wayOf(u);
        if (way.length === 0) return null;
        return (
          <Way
            key={u.id}
            battle={battle}
            from={u}
            points={way}
            opacity={u.id === selected ? 1 : 0.5}
            end={!foe}
          />
        );
      })}
      {ghost && ghost.length > 1 && (
        <Way battle={battle} from={ghost[0] as Point} points={ghost.slice(1)} opacity={0.45} end />
      )}
    </group>
  );
}

function Way({
  battle,
  from,
  points,
  opacity,
  end,
}: {
  battle: BattleSnapshot;
  from: Point;
  points: Point[];
  opacity: number;
  end: boolean;
}) {
  const key = `${from.x},${from.y}|${points.map((p) => `${p.x},${p.y}`).join("|")}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the way by its points, told in `key`
  const geometry = useMemo(() => {
    // In the kit's units (its chevrons' period), then drawn at the battle's scale.
    const pts = [from, ...points].map((p) => {
      const [X, Z] = toChart(battle, p.x, p.y);
      return new Vector3(X / K, 0, Z / K);
    });
    if (pts.length < 2 || (pts[0] as Vector3).distanceTo(pts.at(-1) as Vector3) < 0.05) return null;
    return ribbonGeometry(roundedPath(pts), RIBBON.width);
  }, [key]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const last = points.at(-1) as Point;
  const [X, Z] = toChart(battle, last.x, last.y);
  return (
    <group>
      {geometry && (
        <mesh geometry={geometry} material={wayMat(opacity)} scale={K} position-y={0.07} />
      )}
      {end && (
        <group position={[X, 0.09, Z]}>
          <mesh geometry={disc} material={glow(ACCENT, opacity)} scale={0.9} />
          <mesh geometry={ring} material={glow(ACCENT, opacity)} scale={1.7} />
        </group>
      )}
    </group>
  );
}

/** The last order's place: a ring of accent falls there and widens (the order is taken). */
function Marker({
  battle,
  marker,
}: {
  battle: BattleSnapshot;
  marker: { x: number; y: number; n: number } | null;
}) {
  const g = useRef<Mesh>(null);
  const born = useRef(0);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new order, by its number
  useEffect(() => {
    born.current = performance.now();
  }, [marker?.n]);
  useFrame(() => {
    const m = g.current;
    if (!m) return;
    const k = Math.min(1, (performance.now() - born.current) / 520);
    m.visible = !!marker && k < 1;
    m.scale.setScalar(1 + easeOutCubic(k) * 3.4);
    mat.opacity = 0.95 * (1 - k);
  });
  if (!marker) return null;
  const [X, Z] = toChart(battle, marker.x, marker.y);
  return <mesh ref={g} geometry={ring} material={mat} position={[X, 0.1, Z]} />;
}

/**
 * Rome says what it will do (docs/plan-porta-jeu.md, A5; after Into the Breach, where no blow
 * falls unannounced): a thread of ink from each roused unit to the one it aims at, and under the
 * bombard's target the ring where its ball will fall, filling until it does.
 */
function Threats({ shared }: { shared: Shared }) {
  const threads = useRef<Group>(null);
  const zones = useRef<Group>(null);
  useFrame(() => {
    const tr = shared.tracks.current;
    const t = battleNow(shared);
    const aiming = shared.latest.current.units.filter(
      (u): u is RomeUnitView =>
        u.side === "rome" &&
        !u.dead &&
        !!u.targetId &&
        (u.state === "attack" || u.state === "alert"),
    );
    threads.current?.children.forEach((c, i) => {
      const u = aiming[i];
      const a = u ? tr.get(u.id) : undefined;
      const b = u?.targetId ? tr.get(u.targetId) : undefined;
      c.visible = !!(u && a && b && b.on);
      if (!u || !a || !b) return;
      const dx = b.x + b.ox - a.x - a.ox;
      const dz = b.z + b.oz - a.z - a.oz;
      c.position.set(a.x + a.ox, 0.12, a.z + a.oz);
      c.rotation.y = -Math.atan2(dz, dx);
      c.scale.set(Math.hypot(dx, dz), 1, u.state === "attack" ? 1.6 : 1);
      (c as Mesh).material = u.state === "attack" ? M.thread : M.threadSoft;
    });
    const heavy = aiming.filter((u) => u.state === "attack" && (u.areaCenti ?? 0) > 0);
    zones.current?.children.forEach((c, i) => {
      const u = heavy[i];
      const b = u?.targetId ? tr.get(u.targetId) : undefined;
      c.visible = !!(u && b && b.on);
      if (!u || !b) return;
      const r = ((u.areaCenti ?? 0) / 100) * CASE;
      const period = (u.periodS ?? 1) * 1_000;
      const k = Math.max(0, Math.min(1, 1 - ((u.nextShotAt ?? 0) - t) / period));
      c.position.set(b.x + b.ox, 0.1, b.z + b.oz);
      (c.children[0] as Mesh).scale.setScalar(r);
      (c.children[1] as Mesh).scale.setScalar(Math.max(0.01, r * k));
    });
  });
  return (
    <group>
      <group ref={threads}>
        {Array.from({ length: 24 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a pool of threads
          <mesh key={i} geometry={thread} material={M.threadSoft} visible={false} />
        ))}
      </group>
      <group ref={zones}>
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a pool of zones
          <group key={i} visible={false}>
            <mesh geometry={ring} material={M.zone} />
            <mesh geometry={disc} material={M.zoneFill} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** Every unit, a piece at its place, turned to its way or its target. */
function Units({
  battle,
  shared,
  selected,
  moved,
  watched,
  rangeCenti,
}: {
  battle: BattleSnapshot;
  shared: Shared;
  selected: string | null;
  moved: string[];
  watched: Set<string>;
  rangeCenti: number | null;
}) {
  return (
    <group>
      {battle.units.map((u) => (
        <Unit
          key={u.id}
          battle={battle}
          u={u}
          shared={shared}
          chosen={u.id === selected}
          along={u.id !== selected && moved.includes(u.id)}
          watched={watched.has(u.id)}
          rangeCenti={u.id === selected ? rangeCenti : null}
        />
      ))}
    </group>
  );
}

/** A piece broken stays a moment as it falls, then leaves its shards (ms). */
const BREAK_MS = 160;

function Unit({
  battle,
  u,
  shared,
  chosen,
  along,
  watched,
  rangeCenti,
}: {
  battle: BattleSnapshot;
  u: AnyUnit;
  shared: Shared;
  chosen: boolean;
  along: boolean;
  watched: boolean;
  rangeCenti: number | null;
}) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const turned = useRef<Group>(null);
  const mark = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const fig = useRef<FigureHandle>(null);
  const dead = isDown(u);
  const gone = isGone(u);
  const [deadAt, setDeadAt] = useState<number | null>(null);
  useEffect(() => {
    if (dead && deadAt === null) setDeadAt(clock.now());
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
      // The blow is felt when it lands, not when it leaves: its bolt flies first.
      const id = window.setTimeout(() => fig.current?.act("hit"), HIT_LAG);
      return () => window.clearTimeout(id);
    }
  }, [dead, struck, hurt]);
  const role = roleOf(
    u.side === "rome" ? { side: "rome", kind: u.kind } : { side: "player", model: u.model },
  );
  const big = u.side === "rome" && u.kind === "gonfalonier" ? 1.5 : 1;
  useFrame(() => {
    const g = group.current;
    const t = shared.tracks.current.get(u.id);
    if (!g || !t) return;
    const now = clock.now();
    g.position.set(t.x + t.ox, 0, t.z + t.oz);
    // It comes once the island has landed, with a small leap.
    const opened = shared.openedAt.current;
    const since = opened > 0 ? (now - opened) / 1_000 - openEnd(battle.radius) : 1;
    const up = since >= 0.4 ? 1 : easeOutBack(since / 0.4);
    const grow = shared.grow.current;
    if (body.current) {
      body.current.visible = up > 0.01;
      body.current.scale.setScalar(grow * Math.max(0.01, up));
    }
    // Facing its target while it fights, else its way.
    const target =
      u.side === "rome" ? u.targetId : (u.weapons.find((w) => w.targetId)?.targetId ?? null);
    const tt = target ? shared.tracks.current.get(target) : undefined;
    const heading = tt ? Math.atan2(tt.x - t.x, tt.z - t.z) : t.heading;
    const r = turned.current;
    if (r)
      r.rotation.y +=
        Math.atan2(Math.sin(heading - r.rotation.y), Math.cos(heading - r.rotation.y)) * 0.18;
    const moving = Math.hypot(t.vx, t.vz) > 0.4;
    if (!dead && !struck && !hurt) fig.current?.act(moving ? "walk" : "stand");
    // The chosen one's chevron bobs over it, its ring breathes.
    if (mark.current) mark.current.position.y = TALL * big + 1.5 + Math.sin(now / 260) * 0.25;
    if (pulse.current) pulse.current.scale.setScalar(BASE * (1.72 + Math.sin(now / 320) * 0.06));
  });
  if (gone) return null;
  // Broken: its shards fly (Shots), its piece is gone after a moment.
  if (deadAt !== null && clock.now() - deadAt > BREAK_MS) return null;
  const share = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const mine = u.side === "player" && u.mine;
  const player = u.side === "player" ? (u as PlayerUnitView) : null;
  const rome = u.side === "rome" ? (u as RomeUnitView) : null;
  const t = battle.timeMs;
  const base = mine ? M.baseMine : player ? M.baseAlly : M.baseRome;
  const roused = rome && (rome.state === "alert" || rome.state === "attack") && !dead;
  const reach = player ? Math.max(0, ...player.weapons.map((w) => w.rangeCenti)) : 0;
  return (
    <group ref={group}>
      {/* What grows to stay readable from afar: the piece and its base. */}
      <group ref={body}>
        <group ref={turned}>
          {player && player.role === "transport" ? (
            <group scale={UNIT * 1.1}>
              <Mule cargo={player.cargo} live={shared.live} />
            </group>
          ) : (
            <group scale={UNIT * big}>
              <Figure ref={fig} role={role} live={shared.live} />
            </group>
          )}
        </group>
        {/* Its base: the house's in the accent, an ally's in violet, Rome's in ink. */}
        <mesh geometry={disc} material={M.blob} scale={BASE * big * 1.3} position-y={0.02} />
        <mesh geometry={disc} material={base} scale={BASE * big} position-y={0.05} />
        {/* Its health, a ring round its base, in its base's colour. */}
        <group position-y={0.07} scale={BASE * big}>
          <mesh geometry={hpBack} material={M.hpBack} />
          <mesh
            geometry={HP[Math.round(share * HP_STEPS)] ?? hpBack}
            material={base}
            position-y={0.01}
          />
        </group>
        {chosen && (
          <>
            <mesh
              ref={pulse}
              geometry={ring}
              material={M.chosen}
              scale={BASE * 1.72}
              position-y={0.08}
            />
            <group ref={mark} position-y={TALL + 1.5}>
              <mesh geometry={chevron} material={M.chosen} />
            </group>
          </>
        )}

        {/* The transport loading a relic: a ring that fills, in its rarity's colour. */}
        {player?.loading && (
          <Loading
            rarity={player.loading.rarity}
            doneAt={player.loading.doneAt}
            totalS={battle.loadS?.[player.loading.rarity] ?? 10}
            t={t}
          />
        )}
        {player && player.shield > 0 && (
          <mesh geometry={bubble} material={M.shield} scale={2.6 * FIG} position-y={1.4 * FIG} />
        )}
        {player && player.hiddenUntil > t && (
          <group scale={FIG}>
            <SmokeCloud />
          </group>
        )}
      </group>
      {/* What is measured on the ground keeps its true size. */}
      {/* Rome's eyes, when it is roused or a way drawn crosses them: its vision, its reach. */}
      {rome && !dead && (roused || watched) && (
        <mesh
          geometry={thinRing}
          material={watched ? M.visionLit : M.vision}
          scale={(rome.visionCenti / 100) * CASE}
          position-y={0.04}
        />
      )}
      {rome && rome.state === "attack" && !dead && (
        <mesh
          geometry={thinRing}
          material={M.reach}
          scale={(rome.rangeCenti / 100) * CASE}
          position-y={0.03}
        />
      )}
      {/* The chosen one's reach: how far its weapons strike, or the component held. */}
      {chosen && reach > 0 && rangeCenti === null && (
        <mesh
          geometry={thinRing}
          material={M.range}
          scale={(reach / 100) * CASE}
          position-y={0.04}
        />
      )}
      {rangeCenti !== null && rangeCenti > 0 && (
        <mesh
          geometry={ring}
          material={M.chosen}
          scale={(rangeCenti / 100) * CASE}
          position-y={0.05}
        />
      )}
      {/* The incendiary burning a town: its ring of fire filling. */}
      {rome?.burnS && (rome.burning ?? 0) > 0 ? (
        <mesh
          geometry={ring}
          material={M.fire}
          scale={CASE * 0.6 * Math.min(1, (rome.burning ?? 0) / (rome.burnS * 1_000)) + 1}
          position-y={0.1}
        />
      ) : null}
      {player?.actives.some((a) => a.effect === "trumpet" && a.until > t) && (
        <group scale={FIG}>
          <Rings material={M.call} />
        </group>
      )}
      {player?.actives.some((a) => a.effect === "surgeon" && a.until > t) && (
        <group scale={FIG}>
          <Rings material={M.heal} />
        </group>
      )}
    </group>
  );
}

/** A blow taken shows when its bolt lands (ms after the beat). */
const HIT_LAG = 300;

/** The transport: Porcellana's mule (D6), its relics in gems on its back. */
function Mule({ cargo, live }: { cargo: Rarity[]; live: boolean }) {
  const donkey = useMemo(() => {
    const m = mule(HOUSE_PALETTE, { seed: 0, running: true });
    m.group.scale.setScalar(3.6);
    m.group.rotation.y = -Math.PI / 2;
    return { root: m.group, tick: m.tick, height: 2.6 };
  }, []);
  useFrame(({ clock: c }) => {
    if (live) donkey.tick(c.elapsedTime);
  });
  return (
    <group>
      <primitive object={donkey.root} />
      {cargo.map((k, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
          key={i}
          geometry={jewel}
          position={[i % 2 ? 0.45 : -0.45, donkey.height * 1.02, -0.1 - Math.floor(i / 2) * 0.6]}
          material={gem(RARITY_HEX[k])}
          scale={0.62}
        />
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
  useFrame(({ clock: c }) => {
    if (!g.current) return;
    g.current.children.forEach((child, i) => {
      const k = (c.elapsedTime * 0.8 + i / 3) % 1;
      child.position.y = 0.2 + k * 2.4;
      child.scale.setScalar(1.6 + k * 1.2);
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

function Loading({
  rarity,
  doneAt,
  totalS,
  t,
}: { rarity: Rarity; doneAt: number; totalS: number; t: number }) {
  const done = Math.max(0, Math.min(1, 1 - (doneAt - t) / (totalS * 1_000)));
  // The ring by steps of a fortieth, each made once and kept: no geometry made again at each beat.
  const steps = Math.max(1, Math.round(40 * Math.max(0.02, done)));
  return (
    <mesh
      geometry={loadingRing(steps)}
      material={glow(RARITY_HEX[rarity], 0.95)}
      scale={BASE}
      position-y={0.09}
    />
  );
}

interface Shot {
  kind: "bolt" | "ball" | "spark";
  from: Vector3;
  to: Vector3;
  t0: number;
  ms: number;
  mine: boolean;
  /** A heavy blow: the scene holds its breath as it lands. */
  heavy: boolean;
  /** The side struck, for its shards. */
  tone: "house" | "rome";
  landed: boolean;
}
interface Bit {
  p: Vector3;
  v: Vector3;
  spin: Vector3;
  t0: number;
  ms: number;
  size: number;
}
interface Leap {
  from: Vector3;
  to: string;
  hex: string;
  t0: number;
}
const BITS = 72;
const WHITE = new Color("#FBFAF7");
const INK_C = new Color(INK);
const ACCENT_C = new Color(ACCENT);
/** A pair strikes on the screen no more often than this (ms): a weapon that strikes at every beat
 * would hide its target under its own bolts. */
const SHOT_EVERY = 480;

/**
 * The blows (docs/plan-porta-jeu.md, B4 to B6), in three times: the striker leans (its piece),
 * the blow flies — a bolt along a line, a ball on an arc, a spark where a close blow lands —, and
 * it breaks into shards of porcelain where it falls. A piece killed bursts into its shards; a relic
 * taken leaps from its chest to the mule. The damage is read over the target by the HTML layer.
 */
function Shots({
  battle,
  shared,
  onImpact,
}: {
  battle: BattleSnapshot;
  shared: Shared;
  onImpact?: (kind: Impact) => void;
}) {
  const shots = useRef<Shot[]>([]);
  const lastShot = useRef(new Map<string, number>());
  const bits = useRef<(Bit | null)[]>(Array.from({ length: BITS }, () => null));
  const leaps = useRef<Leap[]>([]);
  const group = useRef<Group>(null);
  const gems = useRef<Group>(null);
  const told = useRef(onImpact);
  told.current = onImpact;
  const dummy = useMemo(() => new Object3D(), []);
  const shards = useMemo(() => {
    const m = new InstancedMesh(
      shard,
      new MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.5, flatShading: true }),
      BITS,
    );
    m.frustumCulled = false;
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < BITS; i++) {
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, WHITE);
    }
    return m;
  }, [dummy]);
  const burst = (at: Vector3, n: number, tone: "house" | "rome", force: number) => {
    const now = clock.now();
    let made = 0;
    for (let i = 0; i < BITS && made < n; i++) {
      if (bits.current[i]) continue;
      const a = Math.random() * Math.PI * 2;
      const out = (0.6 + Math.random() * 0.8) * force;
      bits.current[i] = {
        p: at.clone(),
        v: new Vector3(Math.cos(a) * out, 5 + Math.random() * 6 * force, Math.sin(a) * out),
        spin: new Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9),
        t0: now,
        ms: 520 + Math.random() * 380,
        size: 0.6 + Math.random() * 0.9,
      };
      // The house breaks white with a shard of accent, Rome biscuit and ink.
      const k = Math.random();
      shards.setColorAt(
        i,
        tone === "house" ? (k < 0.3 ? ACCENT_C : WHITE) : k < 0.55 ? INK_C : WHITE,
      );
      made++;
    }
    if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: the beat's events, once a snapshot
  useEffect(() => {
    if (!shared.live) return;
    const now = clock.now();
    const tr = shared.tracks.current;
    const byId = new Map(battle.units.map((u) => [u.id, u]));
    for (const e of battle.events) {
      if (e.kind === "hit") {
        const a = tr.get(e.from);
        const b = tr.get(e.to);
        const from = byId.get(e.from);
        const to = byId.get(e.to);
        if (!a || !b || !from || !to) continue;
        const pair = `${e.from}>${e.to}`;
        if (now - (lastShot.current.get(pair) ?? 0) < SHOT_EVERY) continue;
        lastShot.current.set(pair, now);
        const kind = shotOf(from);
        const g = shared.grow.current;
        shots.current.push({
          kind,
          from: new Vector3(a.x + a.ox, TALL * 0.6 * g, a.z + a.oz),
          to: new Vector3(b.x + b.ox, TALL * 0.45 * g, b.z + b.oz),
          t0: now,
          ms: kind === "spark" ? 200 : kind === "ball" ? 460 : 300,
          mine: from.side === "player",
          heavy: kind === "ball" || (from.side === "rome" && from.kind === "gonfalonier"),
          tone: to.side === "player" ? "house" : "rome",
          landed: false,
        });
      } else if (e.kind === "dead" || e.kind === "lost") {
        const t = tr.get(e.unit);
        const u = byId.get(e.unit);
        if (!t || !u) continue;
        const mine = u.side === "player";
        burst(new Vector3(t.x + t.ox, 1.6, t.z + t.oz), 16, mine ? "house" : "rome", 1.5);
        clock.hold(HOLD_MS);
        told.current?.(mine ? "mine" : "rome");
      } else if (e.kind === "loaded") {
        const u = byId.get(e.unit);
        const c = u ? nearestCity(battle, u) : null;
        if (!u || !c) continue;
        const [X, Z] = toChart(battle, c.x, c.y);
        const at = chestAt(0);
        leaps.current.push({
          from: new Vector3(X + at[0], 1.2, Z + at[2]),
          to: e.unit,
          hex: RARITY_HEX[e.rarity],
          t0: now,
        });
      }
    }
  }, [battle.timeMs, battle.id]);
  useFrame((_, dt) => {
    const g = group.current;
    const now = clock.now();
    // The blows in flight; each lands once.
    for (const s of shots.current) {
      if (s.landed || now - s.t0 < s.ms) continue;
      s.landed = true;
      burst(s.to, s.heavy ? 7 : 3, s.tone, s.heavy ? 1.2 : 0.7);
      if (s.heavy) {
        clock.hold(HOLD_MS);
        told.current?.("heavy");
      }
    }
    shots.current = shots.current.filter((s) => now - s.t0 < s.ms + 160);
    g?.children.forEach((c, i) => {
      const s = shots.current[i];
      c.visible = !!s && (s.kind === "spark" ? true : !s.landed);
      if (!s) return;
      const k = Math.min(1, (now - s.t0) / s.ms);
      const m = c as Mesh;
      if (s.kind === "spark") {
        // A close blow: a ring bursting on its target.
        const after = Math.min(1, Math.max(0, (now - s.t0 - s.ms * 0.5) / 220));
        m.geometry = ring;
        m.material = M.spark;
        m.position.copy(s.to).setY(0.2);
        m.rotation.set(0, 0, 0);
        m.scale.setScalar(0.4 + after * 3.2);
        m.visible = after > 0 && after < 1;
        return;
      }
      const p = s.from.clone().lerp(s.to, k);
      if (s.kind === "ball") p.y += Math.sin(k * Math.PI) * 5;
      m.geometry = s.kind === "bolt" ? bolt : ball;
      m.material = s.kind === "ball" ? M.iron : s.mine ? M.boltMine : M.bolt;
      m.position.copy(p);
      m.lookAt(s.to);
      m.scale.setScalar(s.kind === "ball" ? 1.7 : 1.1);
    });
    // The shards: thrown, falling, gone.
    let moved = false;
    const step = Math.min(dt, 0.05);
    bits.current.forEach((b, i) => {
      if (!b) return;
      const k = (now - b.t0) / b.ms;
      if (k >= 1) {
        bits.current[i] = null;
        dummy.scale.setScalar(0);
      } else {
        b.v.y -= 30 * step;
        b.p.addScaledVector(b.v, step);
        if (b.p.y < 0.15) {
          b.p.y = 0.15;
          b.v.set(b.v.x * 0.5, -b.v.y * 0.3, b.v.z * 0.5);
        }
        dummy.position.copy(b.p);
        dummy.rotation.set(b.spin.x * k, b.spin.y * k, b.spin.z * k);
        dummy.scale.setScalar(b.size * (1 - k * k));
      }
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
      moved = true;
    });
    if (moved) shards.instanceMatrix.needsUpdate = true;
    // The relics leaping from their chest to the mule.
    leaps.current = leaps.current.filter((l) => now - l.t0 < 650);
    gems.current?.children.forEach((c, i) => {
      const l = leaps.current[i];
      const t = l ? shared.tracks.current.get(l.to) : undefined;
      c.visible = !!(l && t);
      if (!l || !t) return;
      const k = easeOutCubic((now - l.t0) / 650);
      const to = new Vector3(t.x + t.ox, TALL * shared.grow.current, t.z + t.oz);
      c.position.copy(l.from.clone().lerp(to, k));
      c.position.y += Math.sin(k * Math.PI) * 7;
      c.rotation.y = k * 9;
      c.scale.setScalar(1.2 + Math.sin(k * Math.PI) * 1.2);
      (c as Mesh).material = gem(l.hex);
    });
  });
  return (
    <group>
      <group ref={group}>
        {Array.from({ length: 40 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a pool of shots
          <mesh key={i} geometry={ball} visible={false} />
        ))}
      </group>
      <group ref={gems}>
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a pool of gems
          <mesh key={i} geometry={jewel} visible={false} />
        ))}
      </group>
      <primitive object={shards} />
    </group>
  );
}

/** The town a vehicle stands in (the nearest one). */
function nearestCity(b: BattleSnapshot, u: Point) {
  let best: BattleSnapshot["cities"][number] | null = null;
  let d = Number.POSITIVE_INFINITY;
  for (const c of b.cities) {
    const x = Math.hypot(c.x - u.x, c.y - u.y);
    if (x < d) {
      d = x;
      best = c;
    }
  }
  return best;
}

/** A chest of relics: Porcellana's (models/porta.ts), its gem of the rarity's colour. */
function Chest({ hex, at }: { hex: string; at: [number, number, number] }) {
  const g = useMemo(() => chest(BISCUIT, hex, new Group(), 0, 0, K * 1.1), [hex]);
  return <primitive object={g} position={at} />;
}

/** A burnt town's smoke: porcelain puffs rising, fading. */
function Smoke({ at, live }: { at: [number, number, number]; live: boolean }) {
  const puffs = useRef<Group>(null);
  const t0 = useRef(0);
  const mats = useMemo(
    () =>
      Array.from(
        { length: 5 },
        () =>
          new MeshStandardMaterial({
            color: "#F6F4F0",
            emissive: "#F6F4F0",
            emissiveIntensity: 0.5,
            roughness: 1,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
      ),
    [],
  );
  const set = (t: number) => {
    const g = puffs.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const u = (t * 0.22 + i / 5) % 1;
      c.position.set(Math.sin(u * 5 + i) * 0.5 + u * 1.2, u * 6, Math.cos(u * 4 + i) * 0.3);
      c.scale.setScalar(0.45 + u * 1.1);
      (mats[i] as MeshStandardMaterial).opacity = 0.8 * (1 - u) * Math.min(1, u * 6);
    });
  };
  useFrame((_, dt) => {
    if (!live) return;
    t0.current += Math.min(dt, 0.1);
    set(t0.current);
  });
  useEffect(() => set(live ? t0.current : 0.4));
  return (
    <group ref={puffs} position={at}>
      {mats.map((m, i) => (
        <mesh key={String(i)} material={m}>
          <icosahedronGeometry args={[0.7, 1]} />
        </mesh>
      ))}
    </group>
  );
}
