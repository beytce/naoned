import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, type Group, MeshBasicMaterial, Vector3 } from "three";
import { C } from "../../art/plateau/props.js";
import { PlainGround } from "../../dock.js";
import { Icon } from "../../game/map/icons.js";
import { haptic } from "../../haptics.js";
import { sound } from "../../sound.js";
import { CloseButton } from "../../ui.js";
import { Guard3D } from "../map3d/Guard.js";
import { AnchorLayer, type Anchors } from "../map3d/anchors.js";
import { Figure } from "../map3d/figure.js";
import { MAP_3D } from "../map3d/flag.js";
import { Instanced, clay as clayShared, claySolid, hexSlab, useKit } from "../map3d/kit.js";
import { useDonkey } from "../map3d/life.js";
import { preloadMinis } from "../map3d/minis.js";
import { Pace } from "../map3d/pace.js";
import { useCoverBoard } from "../map3d/pause.js";
import { MADE } from "../map3d/props3d.js";
import { roleOf } from "../map3d/roster.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { PortaDock, type PortaPane } from "./PortaDock.js";
import { portaApi } from "./api.js";
import { RARITY_HEX, ROME_DUSK } from "./colours.js";
import { errorText, pt } from "./texts.js";
import { type PortaState, type PortaView, RARITIES, type Rarity } from "./types.js";

preloadMinis();

/** The Porta's own small scene (chart units): the gate to the north, the steps, the quay, the stall. */
const GATE: [number, number, number] = [0, 0, -16];
const STEP_Z = -6;
const stepAt = (i: number, n: number): [number, number, number] => {
  const a = ((i - (n - 1) / 2) / Math.max(1, n - 1)) * 1.6;
  return [Math.sin(a) * 15, 0, STEP_Z + (1 - Math.cos(a)) * 6];
};
const DARK: [number, number, number] = [11, 0, -11];
const QUAY = (i: number): [number, number, number] => [
  -15 + (i % 2) * 6,
  0,
  7 + Math.floor(i / 2) * 5,
];
const STALL: [number, number, number] = [15, 0, 8];

const live = () => !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
const BEFORE = "fondaco:porta-before";

/** What the house had before a battle: its relics, its vehicles (for the return's scene). */
interface Before {
  relics: Record<Rarity, number>;
  vehicles: string[];
}

/**
 * The Porta (docs/plan-porta-3d.md, step 2; decisions of the owner of 4 November 2026): a scene of
 * its own instead of a sheet — the gate of stone opening on the lands of Rome, the six tiers as
 * steps to touch (the closed ones veiled), the Porta noire a dark slab to light, the house's
 * vehicles at the quay as figurines (touched, chosen for the battle; away, sent for), the
 * antiquarian's stall with the relics in chests by rarity (touched: sold or deciphered). One gold
 * « Entrer » ; the group (public queue, invitation, a code) behind a second button. Back from a
 * battle, the relics brought rise into their chests and the vehicles lost or damaged say so.
 */
export function PortaScene({
  p,
  open,
  busy,
  now,
  act,
  onClose,
  onBattle,
}: {
  p: EmpirePayload;
  open: boolean;
  busy: boolean;
  now: number;
  act: (a: EmpireAction) => Promise<void>;
  onClose: () => void;
  onBattle: () => void;
}) {
  const v = p.view?.porta;
  useCoverBoard(open && !!v);
  const [state, setState] = useState<PortaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(1);
  const [combatId, setCombatId] = useState("");
  const [transportId, setTransportId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [dark, setDark] = useState(false);
  const [pane, setPane] = useState<PortaPane>(null);
  const [step, setStep] = useState(0);
  // The dock's height: the camera frames the scene above it.
  const [dockH, setDockH] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dockRef.current;
    if (!open || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setDockH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);
  const [back, setBack] = useState<{ gained: Rarity[]; lost: number; hurt: number } | null>(null);

  const remember = useCallback(() => {
    if (!v) return;
    try {
      const b: Before = {
        relics: v.relics,
        vehicles: [...v.vehicles.map((x) => x.id), ...v.transports.map((x) => x.id)],
      };
      sessionStorage.setItem(BEFORE, JSON.stringify(b));
    } catch {
      // Without storage, no return's scene.
    }
  }, [v]);
  const take = useCallback(
    (s: PortaState) => {
      setState(s);
      setError(s.error ? errorText(s.error) : null);
      if (s.battle && !s.battle.over) {
        remember();
        onBattle();
      }
    },
    [onBattle, remember],
  );
  const refresh = useCallback(async () => take(await portaApi.state()), [take]);
  useEffect(() => {
    if (!open) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [open, refresh]);
  // Back from a battle: what it brought, what it cost.
  useEffect(() => {
    if (!open || !v) return;
    try {
      const raw = sessionStorage.getItem(BEFORE);
      if (!raw) return;
      if (v.battle) return;
      sessionStorage.removeItem(BEFORE);
      const b = JSON.parse(raw) as Before;
      const gained = RARITIES.flatMap((r) =>
        Array.from({ length: Math.max(0, v.relics[r] - (b.relics[r] ?? 0)) }, () => r),
      );
      const ids = new Set([...v.vehicles.map((x) => x.id), ...v.transports.map((x) => x.id)]);
      const lost = b.vehicles.filter((id) => !ids.has(id)).length;
      const hurt = [...v.vehicles, ...v.transports].filter(
        (x) => x.repairUntil !== null && x.repairUntil > now,
      ).length;
      setBack({ gained, lost, hurt });
      // The return told (audit of 4 November, motion M4): the bell, and the best relic felt.
      sound(gained.length > 0 ? "bell" : "cart");
      haptic(gained.includes("legendary") ? "alarm" : gained.length > 0 ? "success" : "tap");
    } catch {
      // Nothing to tell.
    }
  }, [open, v, now]);

  // At the quay or on its way there (sent for from the dock): it may stay chosen.
  const near = (x: { place: string }) => x.place === "porta" || x.place === "going";
  const combats = v?.vehicles.filter(near) ?? [];
  const transports = v?.transports.filter(near) ?? [];
  useEffect(() => {
    if (!combats.some((x) => x.id === combatId)) setCombatId(combats[0]?.id ?? "");
    if (!transports.some((x) => x.id === transportId)) setTransportId(transports[0]?.id ?? "");
  }, [combats, transports, combatId, transportId]);

  if (!open || !v) return null;
  const go = async (f: () => Promise<PortaState>) => {
    setWaiting(true);
    try {
      take(await f());
    } finally {
      setWaiting(false);
    }
  };
  const off = busy || waiting;
  const relics = RARITIES.reduce((n, r) => n + v.relics[r], 0);
  // Where the camera looks: the quay, the steps, the gate, the stall (the dock's decision).
  const focus: Focus =
    pane === "stall"
      ? "stall"
      : state?.lobby
        ? "gate"
        : ((["quay", "steps", "gate"] as const)[step] ?? "gate");
  return (
    <div className="porta-in fixed inset-0 z-40 overflow-hidden bg-[#3B2F52]" data-porta-scene>
      <SceneView
        v={v}
        tier={tier}
        dark={dark}
        combatId={combatId}
        transportId={transportId}
        focus={focus}
        dockH={dockH}
        onTier={(n) => {
          setTier(n);
          setPane(null);
          setStep(1);
        }}
        onDark={() => {
          setDark((x) => !x);
          setPane(null);
          setStep(1);
        }}
        onChoose={(id, role) => {
          if (role === "combat") setCombatId(id);
          else setTransportId(id);
          setPane(null);
          setStep(0);
        }}
        onStall={() => setPane(pane === "stall" ? null : "stall")}
      />
      <header className="absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div
          className="glass flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-4 pr-1"
          data-porta-level
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
              {pt.porta}
            </span>
            <span className="block truncate text-xs text-cream-dim">
              {pt.level(v.level)} · {pt.travel(v.travelMinutes)}
            </span>
          </span>
          {v.upgrade && (
            <RoundIcon
              label={pt.raiseTitle}
              on={pane === "raise"}
              onClick={() => setPane(pane === "raise" ? null : "raise")}
              attr="raise"
            >
              {Icon.upgrade()}
            </RoundIcon>
          )}
          <RoundIcon
            label={pt.antiquarian}
            on={pane === "stall"}
            onClick={() => setPane(pane === "stall" ? null : "stall")}
            badge={relics > 0 ? relics : undefined}
            attr="stall"
          >
            {Icon.vault()}
          </RoundIcon>
          <RoundIcon
            label={pt.ranking}
            on={pane === "ranking"}
            onClick={() => setPane(pane === "ranking" ? null : "ranking")}
            attr="ranking"
          >
            {Icon.trophy()}
          </RoundIcon>
        </div>
        <CloseButton onClick={onClose} className="glass shrink-0" />
      </header>
      {back && (
        <output
          className="porta-back orbit-in absolute inset-x-4 top-28 mx-auto block max-w-sm rounded-2xl bg-night/90 p-4 text-center shadow-xl ring-1 ring-edge"
          data-porta-back
        >
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-gold">
            {pt.backTitle}
          </p>
          <p className="mt-3 flex flex-wrap justify-center gap-2">
            {back.gained.length === 0 ? (
              <span className="text-xs text-cream-dim">{pt.backNone}</span>
            ) : (
              back.gained.map((r, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
                  key={i}
                  // Each relic laid down in turn, larger the rarer (a legendary one glows).
                  className={`porta-relic rounded-md ring-1 ring-night ${r === "legendary" ? "h-8 w-8 shadow-[0_0_16px_rgb(242_194_79/0.7)]" : r === "precious" ? "h-7 w-7" : "h-6 w-6"}`}
                  style={{ background: RARITY_HEX[r], animationDelay: `${300 + i * 220}ms` }}
                />
              ))
            )}
          </p>
          {(back.lost > 0 || back.hurt > 0) && (
            <p className="mt-2 text-xs text-vermilion">{pt.backCost(back.lost, back.hurt)}</p>
          )}
          <button
            type="button"
            className="mt-2 min-h-11 text-xs font-semibold text-cream-dim"
            onClick={() => setBack(null)}
          >
            {pt.backOk}
          </button>
        </output>
      )}
      <div ref={dockRef} className="pointer-events-none absolute inset-x-0 bottom-0">
        <PortaDock
          p={p}
          v={v}
          state={state}
          now={now}
          off={off}
          act={act}
          go={go}
          step={step}
          onStep={setStep}
          tier={tier}
          onTier={setTier}
          dark={dark}
          onDark={() => setDark((x) => !x)}
          combatId={combatId}
          transportId={transportId}
          onChoose={(id, role) => (role === "combat" ? setCombatId(id) : setTransportId(id))}
          pane={pane}
          onPane={setPane}
          onBattle={onBattle}
          error={error}
        />
      </div>
    </div>
  );
}

/** A round button of the Porta's head (the raise, the antiquarian, the ranking). */
function RoundIcon({
  label,
  on,
  onClick,
  badge,
  attr,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  badge?: number;
  attr: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      data-porta-round={attr}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 [&_svg]:h-5 [&_svg]:w-5 ${on ? "bg-info text-ink" : "glass-chip text-cream"}`}
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-display text-[0.625rem] font-extrabold text-ink">
          {badge}
        </span>
      )}
    </button>
  );
}

/** The Porta's diorama under its labels. */
function SceneView(props: {
  v: PortaView;
  tier: number;
  dark: boolean;
  combatId: string;
  transportId: string;
  focus: Focus;
  dockH: number;
  onTier: (n: number) => void;
  onDark: () => void;
  onChoose: (id: string, role: "combat" | "transport") => void;
  onStall: () => void;
}) {
  const { v } = props;
  const labels = useRef<HTMLDivElement>(null);
  const docked = [
    ...v.vehicles
      .filter((x) => x.place === "porta")
      .map((x) => ({ ...x, role: "combat" as const })),
    ...v.transports
      .filter((x) => x.place === "porta")
      .map((x) => ({ ...x, role: "transport" as const, model: x.type })),
  ];
  return (
    <div className="absolute inset-0">
      {MAP_3D ? (
        <Guard3D>
          <Canvas
            orthographic
            frameloop="demand"
            dpr={[1, 1.5]}
            camera={{ position: [0, 46, 44], zoom: 1 }}
            gl={{ antialias: true }}
            onCreated={({ scene }) => {
              scene.background = new Color(ROME_DUSK.sky);
            }}
          >
            <CameraRig focus={props.focus} dockH={props.dockH} />
            <Pace fps={live() ? 30 : 0} />
            {/* The lands of Rome at dusk (the refonte claire, lot 4). */}
            <hemisphereLight args={[ROME_DUSK.hemiSky, ROME_DUSK.hemiGround, 1.1]} />
            <directionalLight position={[-60, 70, 40]} intensity={2.4} color={ROME_DUSK.sun} />
            <Suspense fallback={null}>
              <Scene {...props} docked={docked} />
              <AnchorLayer root={labels} anchors={ANCHOR} />
            </Suspense>
          </Canvas>
        </Guard3D>
      ) : (
        <PlainGround />
      )}
      {/* The labels over the scene, each at its anchor (Anchors moves them each frame). */}
      <div
        ref={labels}
        className={`pointer-events-none absolute inset-0 ${MAP_3D ? "" : "hidden"}`}
      >
        {v.tiers.map((t, i) => (
          <div key={t.tier} data-anchor={`step:${i}`} className="absolute left-0 top-0">
            <button
              type="button"
              disabled={!t.open}
              onClick={() => props.onTier(t.tier)}
              aria-pressed={props.tier === t.tier}
              data-porta-tier={t.tier}
              className={`pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full px-2.5 text-xs font-bold shadow-lg shadow-black/50 ${
                props.tier === t.tier
                  ? "bg-info text-night"
                  : t.open
                    ? "bg-night/85 text-cream ring-1 ring-line"
                    : "bg-night/60 text-cream-dim"
              }`}
            >
              {t.open ? t.tier : "🔒"}
            </button>
          </div>
        ))}
        <div data-anchor="dark" className="absolute left-0 top-0">
          <button
            type="button"
            role="switch"
            aria-checked={props.dark}
            onClick={props.onDark}
            data-porta-dark
            className={`pointer-events-auto -translate-x-1/2 -translate-y-1/2 min-h-11 rounded-full px-3 text-xs font-bold shadow-lg ${props.dark ? "bg-[#2A1630] text-[#E8A0FF] ring-2 ring-[#B060D0]" : "bg-night/80 text-cream-dim ring-1 ring-line"}`}
          >
            {pt.dark}
          </button>
        </div>
        {docked.map((x, i) => {
          const chosen = x.id === props.combatId || x.id === props.transportId;
          return (
            <div key={x.id} data-anchor={`quay:${i}`} className="absolute left-0 top-0">
              <button
                type="button"
                onClick={() => props.onChoose(x.id, x.role)}
                aria-pressed={chosen}
                data-porta-vehicle={x.id}
                className={`pointer-events-auto -translate-x-1/2 translate-y-2 min-h-11 rounded-full px-2.5 text-xs font-semibold shadow-lg ${chosen ? "bg-night/85 text-cream ring-2 ring-info" : "bg-night/85 text-cream ring-1 ring-line"}`}
              >
                {x.role === "combat" ? (pt.model[x.model] ?? x.model) : x.model}
                {x.repairUntil !== null && x.repairUntil > Date.now() ? ` · ${pt.hurt}` : ""}
              </button>
            </div>
          );
        })}
        <div data-anchor="stall" className="absolute left-0 top-0">
          <button
            type="button"
            onClick={props.onStall}
            className="pointer-events-auto -translate-x-1/2 translate-y-2 min-h-11 rounded-full bg-night/85 px-3 text-xs font-semibold text-cream ring-1 ring-edge shadow-lg"
          >
            {pt.antiquarian}
          </button>
        </div>
      </div>
    </div>
  );
}

/** What the camera looks at, by the dock's decision (docs/plan-dock.md). */
export type Focus = "quay" | "steps" | "gate" | "stall";
const FOCUS: Record<Focus, { at: [number, number]; zoom: number }> = {
  quay: { at: [-12, 9], zoom: 1.35 },
  steps: { at: [0, -5], zoom: 1.1 },
  gate: { at: [0, -10], zoom: 1.05 },
  stall: { at: [15, 8], zoom: 1.5 },
};
/** The camera's slant: a step on the ground toward it is this much on the screen. */
const SLANT = 0.715;
const OFFSET = new Vector3(0, 46, 45);

/**
 * The camera framed on the scene above the dock, gliding to what the dock decides (the quay for
 * the crew, the steps for the tier, the gate to go, the stall); at once for less motion.
 */
function CameraRig({ focus, dockH }: { focus: Focus; dockH: number }) {
  const { camera, size, invalidate } = useThree();
  const look = useRef(new Vector3(0, 0, -1));
  const goal = useRef({ look: new Vector3(0, 0, -1), zoom: 2 });
  useEffect(() => {
    const across = 52;
    const room = Math.max(160, size.height - dockH - 72);
    const fit = Math.max(2, Math.min(size.width / across, room / (across * 0.75)));
    const f = FOCUS[focus];
    const zoom = fit * f.zoom;
    // The point of focus in the middle of the room above the dock, not of the whole screen.
    const shift = (dockH - 72) / 2 / zoom / SLANT;
    goal.current = { look: new Vector3(f.at[0], 0, f.at[1] + shift), zoom };
    if (!live()) {
      look.current.copy(goal.current.look);
      camera.zoom = zoom;
      camera.position.copy(look.current).add(OFFSET);
      camera.lookAt(look.current);
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, size, focus, dockH, invalidate]);
  useFrame((_, dt) => {
    const g = goal.current;
    const k = live() ? 1 - Math.exp(-dt * 6) : 1;
    const before = look.current.distanceTo(g.look) + Math.abs(camera.zoom - g.zoom);
    if (before < 0.001) return;
    look.current.lerp(g.look, k);
    camera.zoom += (g.zoom - camera.zoom) * k;
    camera.position.copy(look.current).add(OFFSET);
    camera.lookAt(look.current);
    camera.updateProjectionMatrix();
    invalidate();
  });
  return null;
}

/** The anchors' points, set by the scene as it lays its parts out. */
const ANCHOR: Anchors = new Map();

const tile = hexSlab(4.9, 2, 0.5);
const arch = new MeshBasicMaterial({ color: "#E06A4A", transparent: true, opacity: 0.85 });
const archDark = new MeshBasicMaterial({ color: "#5B2A7A", transparent: true, opacity: 0.9 });

function Scene({
  v,
  tier,
  dark,
  combatId,
  transportId,
  docked,
}: {
  v: PortaView;
  tier: number;
  dark: boolean;
  combatId: string;
  transportId: string;
  docked: { id: string; model: string; role: "combat" | "transport" }[];
}) {
  const kit = useKit();
  // The ground: a few tiles of sand before the gate, Rome's red lands beyond it.
  const ground = useMemo(() => {
    const out: { x: number; y: number; z: number; s: number; rot: number; rome: boolean }[] = [];
    for (let r = -4; r <= 3; r++)
      for (let q = -5; q <= 5; q++) {
        const x = (q + r / 2) * 8.5;
        const z = r * 7.4 + 4;
        if (Math.hypot(x, z - 2) > 30) continue;
        out.push({ x, y: 0, z, s: 1, rot: Math.PI / 6, rome: z < GATE[2] + 1 });
      }
    return out;
  }, []);
  for (let i = 0; i < v.tiers.length; i++)
    ANCHOR.set(
      `step:${i}`,
      stepAt(i, v.tiers.length).map((n, k) => (k === 1 ? 2.6 : n)) as [number, number, number],
    );
  ANCHOR.set("dark", [DARK[0], 1.4, DARK[2]]);
  docked.forEach((_, i) => ANCHOR.set(`quay:${i}`, QUAY(i)));
  ANCHOR.set("stall", STALL);
  return (
    <group>
      <Instanced
        geo={tile}
        items={ground.filter((g) => !g.rome)}
        material={claySolid(ROME_DUSK.earth)}
      />
      <Instanced
        geo={tile}
        items={ground.filter((g) => g.rome)}
        material={claySolid(ROME_DUSK.deep)}
      />
      {/* The gate: two towers, its arch of stone, the lands' glow through it. */}
      <group position={GATE}>
        <mesh geometry={MADE.porta} material={clayShared} />
        <mesh position={[0, 5.6, 0.2]} material={dark ? archDark : arch}>
          <planeGeometry args={[7, 10.6]} />
        </mesh>
      </group>
      {/* The tiers, steps of stone, each higher; the chosen one in lapis, the closed ones dim. */}
      {v.tiers.map((t, i) => (
        <mesh
          key={t.tier}
          position={stepAt(i, v.tiers.length)}
          material={claySolid(t.tier === tier ? C.water : t.open ? C.rock2 : C.mistSoil)}
          scale={[1, 0.6 + i * 0.35, 1]}
        >
          <cylinderGeometry args={[2.4, 2.7, 2, 6]} />
        </mesh>
      ))}
      {/* The Porta noire: a slab of black stone, lit violet when chosen. */}
      <mesh position={DARK} material={claySolid(dark ? "#3A1A4A" : "#1C2230")}>
        <boxGeometry args={[6, 0.6, 3]} />
      </mesh>
      {/* The quay: the house's vehicles waiting, as figurines. */}
      {docked.map((x, i) => (
        <group key={x.id} position={QUAY(i)} rotation-y={Math.PI * 0.85}>
          {(x.id === combatId || x.id === transportId) && (
            <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
              <ringGeometry args={[2.4, 2.9, 32]} />
              <meshBasicMaterial color={C.gold} />
            </mesh>
          )}
          <group scale={1.6}>
            {x.role === "combat" ? (
              <Figure role={roleOf({ side: "player", model: x.model })} live={live()} />
            ) : (
              <QuayMule />
            )}
          </group>
        </group>
      ))}
      {/* The antiquarian's stall: a market's roof, its chests by rarity. */}
      <group position={STALL}>
        <mesh geometry={kit("market").geo} material={clayShared} scale={8} />
        {RARITIES.map((r, i) =>
          Array.from({ length: Math.min(6, v.relics[r]) }, (_, j) => (
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: a chest a relic, stacked
              key={`${r}${j}`}
              position={[-3 + i * 2, 0.6 + j * 1.15, 5]}
              material={claySolid(RARITY_HEX[r])}
            >
              <boxGeometry args={[1.6, 1.1, 1.2]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function QuayMule() {
  const donkey = useDonkey(2.6);
  const g = useRef<Group>(null);
  useEffect(() => {
    donkey.resting?.play();
  }, [donkey]);
  useFrame((_, dt) => {
    if (live()) donkey.mixer.update(Math.min(dt, 0.1));
  });
  return (
    <group ref={g}>
      <primitive object={donkey.root} />
    </group>
  );
}
