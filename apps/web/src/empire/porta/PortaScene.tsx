import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, type Group, MeshBasicMaterial, Vector3 } from "three";
import { Coin } from "../../art/icons.js";
import { C } from "../../art/plateau/props.js";
import { d } from "../../game/format.js";
import { CloseButton, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import { Guard3D } from "../map3d/Guard.js";
import { AnchorLayer, type Anchors } from "../map3d/anchors.js";
import { Figure } from "../map3d/figure.js";
import { frameBand, useCovers } from "../map3d/frame.js";
import { Instanced, clay as clayShared, claySolid, hexSlab, useKit } from "../map3d/kit.js";
import { useDonkey } from "../map3d/life.js";
import { preloadMinis } from "../map3d/minis.js";
import { Pace } from "../map3d/pace.js";
import { useCoverBoard } from "../map3d/pause.js";
import { roleOf } from "../map3d/roster.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { portaApi } from "./api.js";
import { RARITY_HEX } from "./chart.js";
import { errorText, pt } from "./texts.js";
import {
  COMPONENT_KINDS,
  type ComponentKind,
  type PortaState,
  type PortaView,
  RARITIES,
  type Rarity,
} from "./types.js";

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
  const head = useRef<HTMLElement>(null);
  const foot = useRef<HTMLElement>(null);
  const covers = useCovers(head, foot);
  const [state, setState] = useState<PortaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(1);
  const [combatId, setCombatId] = useState("");
  const [transportId, setTransportId] = useState("");
  const [code, setCode] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [dark, setDark] = useState(false);
  const [kind, setKind] = useState<ComponentKind>("weapon");
  const [pane, setPane] = useState<null | "group" | "stall">(null);
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
    } catch {
      // Nothing to tell.
    }
  }, [open, v, now]);

  const combats = v?.vehicles.filter((x) => x.place === "porta") ?? [];
  const transports = v?.transports.filter((x) => x.place === "porta") ?? [];
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
  const entry = { tier, combatId, transportId, ...(dark ? { dark: true } : {}) };
  const ready = combatId !== "" && transportId !== "";
  const line = v.tiers.find((x) => x.tier === tier);
  const lobby = state?.lobby ?? null;
  const off = busy || waiting;
  const away = [...v.vehicles, ...v.transports].filter(
    (x) => x.place === "remise" && !(x.repairUntil !== null && x.repairUntil > now),
  );

  return (
    <div className="porta-in fixed inset-0 z-40 overflow-hidden bg-[#16263E]" data-porta-scene>
      <SceneView
        v={v}
        tier={tier}
        dark={dark}
        combatId={combatId}
        transportId={transportId}
        onTier={setTier}
        onDark={() => setDark((x) => !x)}
        onChoose={(id, role) => (role === "combat" ? setCombatId(id) : setTransportId(id))}
        onStall={() => setPane(pane === "stall" ? null : "stall")}
        covers={covers}
      />

      <header
        ref={head}
        className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <div
          className="rounded-2xl bg-night/80 px-3 py-1.5 shadow-lg shadow-black/40"
          data-porta-level
        >
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {pt.porta}
          </p>
          <p className="text-xs text-cream-dim">
            {pt.level(v.level)} · {pt.travel(v.travelMinutes)}
          </p>
          {v.upgrade && (
            <button
              type="button"
              disabled={off || !affordable(p.cash, v.upgrade.cost)}
              onClick={() => void act({ type: "empireUpgradePorta" })}
              className="mt-1 flex min-h-11 items-center gap-1 text-xs font-semibold text-info disabled:opacity-50"
            >
              {pt.raise} · <Coin size={12} /> {d(v.upgrade.cost)}
            </button>
          )}
        </div>
        <CloseButton onClick={onClose} />
      </header>

      {back && (
        <output
          className="porta-back absolute inset-x-4 top-28 mx-auto block max-w-sm rounded-2xl bg-night/90 p-3 text-center shadow-xl"
          data-porta-back
        >
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-gold">
            {pt.backTitle}
          </p>
          <p className="mt-2 flex flex-wrap justify-center gap-1">
            {back.gained.length === 0 ? (
              <span className="text-xs text-cream-dim">{pt.backNone}</span>
            ) : (
              back.gained.map((r, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
                  key={i}
                  className="porta-relic h-4 w-4 rounded-sm ring-1 ring-night"
                  style={{ background: RARITY_HEX[r], animationDelay: `${i * 120}ms` }}
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

      <footer
        ref={foot}
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/95 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8"
      >
        {/* The vehicles away at the Remise: sent for at a touch. */}
        {away.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5" data-porta-quay>
            {away.map((x) => (
              <button
                key={x.id}
                type="button"
                disabled={off}
                onClick={() => void act({ type: "empireSendToPorta", vehicleIds: [x.id] })}
                data-quay={x.id}
                className="min-h-11 rounded-full border border-info/60 bg-night/80 px-3 text-xs text-info"
              >
                {pt.send} · {"model" in x ? (pt.model[x.model] ?? x.model) : x.type}
              </button>
            ))}
          </div>
        )}
        {pane === "stall" ? (
          <Stall
            v={v}
            kind={kind}
            off={off}
            onKind={setKind}
            act={act}
            ranking={state?.ranking}
            onClose={() => setPane(null)}
          />
        ) : state?.battle && !state.battle.over ? (
          <Slab tone="gold" className="w-full" onClick={onBattle}>
            {pt.inBattle}
          </Slab>
        ) : lobby ? (
          <div className="rounded-2xl border border-info/50 bg-night-2 p-3" data-porta-lobby>
            <p className="text-sm text-cream">
              {pt.lobby} · {pt.tier(lobby.tier)} · {pt.lobbyPlayers(lobby.players)}
            </p>
            {lobby.code && (
              <p className="mt-1 font-display text-lg font-bold tabular-nums tracking-widest text-cream">
                {pt.lobbyCode(lobby.code)}
              </p>
            )}
            {lobby.waitUntil && (
              <p className="mt-1 text-xs text-cream-dim">
                {pt.lobbyWait(Math.max(0, Math.ceil((lobby.waitUntil - Date.now()) / 1_000)))}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {(lobby.owner || !lobby.code) && (
                <Slab tone="gold" size="sm" disabled={off} onClick={() => void go(portaApi.launch)}>
                  {pt.launch}
                </Slab>
              )}
              <Slab tone="ghost" size="sm" disabled={off} onClick={() => void go(portaApi.leave)}>
                {pt.leave}
              </Slab>
            </div>
          </div>
        ) : (
          <div data-porta-battle>
            <p className="mb-1.5 text-center text-xs text-cream-dim">
              {!ready
                ? pt.notReady
                : line?.open
                  ? `${pt.entry(line.bread)}${dark ? ` · ${pt.dark}` : ""}`
                  : pt.tierLocked(tier)}
            </p>
            {pane === "group" && (
              <div className="mb-2 rounded-2xl bg-night-2 p-2.5" data-porta-group>
                <div className="flex gap-2">
                  <Slab
                    tone="ghost"
                    size="sm"
                    disabled={off || !ready || !line?.open}
                    onClick={() => void go(() => portaApi.queue("public", entry))}
                  >
                    {pt.public}
                  </Slab>
                  <Slab
                    tone="ghost"
                    size="sm"
                    disabled={off || !ready || !line?.open}
                    onClick={() => void go(() => portaApi.queue("invite", entry))}
                  >
                    {pt.invite}
                  </Slab>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={pt.codePlaceholder}
                    aria-label={pt.codePlaceholder}
                    className="min-w-0 flex-1 rounded-lg border border-edge bg-night-3 px-3 py-2 font-display text-sm tabular-nums text-cream"
                  />
                  <Slab
                    tone="ghost"
                    size="sm"
                    disabled={off || !ready || code.length !== 6}
                    onClick={() =>
                      void go(() =>
                        portaApi.join(code, {
                          combatId,
                          transportId,
                          ...(dark ? { dark: true } : {}),
                        }),
                      )
                    }
                  >
                    {pt.join}
                  </Slab>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Slab
                tone="gold"
                className="flex-1"
                disabled={off || !ready || !line?.open}
                onClick={() =>
                  void go(() =>
                    portaApi.queue(line && line.minPlayers === 1 ? "solo" : "public", entry),
                  )
                }
              >
                {line && line.minPlayers === 1 ? pt.enter(tier) : pt.enterGroup(tier)}
              </Slab>
              <button
                type="button"
                onClick={() => setPane(pane === "group" ? null : "group")}
                aria-pressed={pane === "group"}
                className="min-h-11 rounded-full border border-line bg-night/80 px-3 text-xs font-semibold text-cream"
              >
                {pt.group}
              </button>
              <button
                type="button"
                onClick={() => setPane("stall")}
                data-porta-stall
                className="min-h-11 rounded-full border border-edge bg-night/80 px-3 text-xs font-semibold text-cream"
              >
                {pt.antiquarian}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-1 text-xs font-semibold text-vermilion" role="alert">
            {error}
          </p>
        )}
      </footer>
    </div>
  );
}

/** The antiquarian's stall: each rarity's chest, sold or deciphered into plans; the week's points. */
function Stall({
  v,
  kind,
  off,
  onKind,
  act,
  ranking,
  onClose,
}: {
  v: PortaView;
  kind: ComponentKind;
  off: boolean;
  onKind: (k: ComponentKind) => void;
  act: (a: EmpireAction) => Promise<void>;
  ranking: PortaState["ranking"];
  onClose: () => void;
}) {
  return (
    <section className="rounded-2xl bg-night-2 p-3" data-porta-antiquarian>
      <div className="flex items-center justify-between">
        <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
          {pt.antiquarian}
        </p>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-xs text-cream-dim">
          {pt.backOk}
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5" data-porta-plans>
        <span className="text-xs text-cream-dim">{pt.plans}</span>
        {COMPONENT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => onKind(k)}
            data-plan-kind={k}
            className={`min-h-9 rounded-full border px-2.5 text-xs tabular-nums ${kind === k ? "border-info bg-info/10 text-cream" : "border-line text-cream-dim"}`}
          >
            {pt.kind[k]} · {v.plans[k]}
          </button>
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {RARITIES.map((r) => {
          const n = v.relics[r];
          const price = v.relicPrices[r];
          return (
            <li key={r} className="rounded-xl border border-line p-2" data-relic={r}>
              <p className="flex items-center gap-2 text-sm text-cream">
                <span className="h-4 w-4 rounded-sm" style={{ background: RARITY_HEX[r] }} />
                {pt.rarity[r]} · ×{n}
              </p>
              <p className="text-xs text-cream-dim">
                <Coin size={11} /> {d(price.price)} · {pt.points(price.points)}
              </p>
              <div className="mt-1 flex gap-1">
                <Slab
                  size="sm"
                  tone="ghost"
                  disabled={off || n === 0}
                  onClick={() => void act({ type: "empireSellRelics", rarity: r, qty: n })}
                >
                  {pt.sell}
                </Slab>
                <Slab
                  size="sm"
                  tone="ghost"
                  disabled={off || n === 0}
                  aria-label={`${pt.decipherAs(v.plansPerRarity[r])} ${pt.kind[kind]}`}
                  onClick={() => void act({ type: "empireDecipherRelic", rarity: r, kind })}
                >
                  {pt.decipher}
                </Slab>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-cream-dim">
        {pt.week(v.weekPoints)}
        {ranking?.mine ? ` · ${ranking.mine.rank}ᵉ` : ""}
      </p>
    </section>
  );
}

/** The Porta's diorama under its labels. */
function SceneView(props: {
  v: PortaView;
  tier: number;
  dark: boolean;
  combatId: string;
  transportId: string;
  onTier: (n: number) => void;
  onDark: () => void;
  onChoose: (id: string, role: "combat" | "transport") => void;
  onStall: () => void;
  covers: { top: number; bottom: number };
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
      <Guard3D>
        <Canvas
          orthographic
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [0, 46, 44], zoom: 1 }}
          gl={{ antialias: true }}
          onCreated={({ scene }) => {
            scene.background = new Color("#16263E");
          }}
        >
          <Fit covers={props.covers} />
          <Pace fps={live() ? 30 : 0} />
          <hemisphereLight args={["#CFE0F5", "#B89A62", 1.15]} />
          <directionalLight position={[-60, 110, 40]} intensity={2.2} color="#FFF3DD" />
          <Suspense fallback={null}>
            <Scene {...props} docked={docked} />
            <AnchorLayer root={labels} anchors={ANCHOR} />
          </Suspense>
        </Canvas>
      </Guard3D>
      {/* The labels over the scene, each at its anchor (Anchors moves them each frame). */}
      <div ref={labels} className="pointer-events-none absolute inset-0">
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
                className={`pointer-events-auto -translate-x-1/2 translate-y-2 min-h-11 rounded-full px-2.5 text-xs font-semibold shadow-lg ${chosen ? "bg-info text-ink" : "bg-night/85 text-cream ring-1 ring-line"}`}
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

/** The camera framed on the scene, whatever the screen. */
/** The gate and its quay framed in the band between the scene's head and its foot (frame.ts). */
function Fit({ covers }: { covers: { top: number; bottom: number } }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const across = 52;
    const room = Math.max(120, size.height - covers.top - covers.bottom);
    const zoom = Math.min(size.width / across, (room * 0.95) / (across * 0.75));
    camera.zoom = Math.max(2, zoom);
    camera.lookAt(0, 0, -1);
    frameBand(camera, size.width, size.height, covers.top, covers.bottom);
    invalidate();
  }, [camera, size, covers, invalidate]);
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
  const stone = kit("tower", { roof: C.rockSeen });
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
      <Instanced geo={tile} items={ground.filter((g) => !g.rome)} material={claySolid(C.land)} />
      <Instanced geo={tile} items={ground.filter((g) => g.rome)} material={claySolid("#B8604A")} />
      {/* The gate: two towers, its arch of stone, the lands' glow through it. */}
      <group position={GATE}>
        <mesh geometry={stone.geo} material={clayShared} scale={6} position={[-6.5, 0, 0]} />
        <mesh geometry={stone.geo} material={clayShared} scale={6} position={[6.5, 0, 0]} />
        <mesh position={[0, 6.4, 0]}>
          <torusGeometry args={[5, 1, 8, 20, Math.PI]} />
          <meshStandardMaterial color={C.rockSeen} roughness={0.95} />
        </mesh>
        <mesh position={[0, 4.2, 0]} material={dark ? archDark : arch}>
          <planeGeometry args={[8, 8.6]} />
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
