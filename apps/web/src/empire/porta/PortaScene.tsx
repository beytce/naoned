import { Canvas } from "@react-three/fiber";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type OrthographicCamera, Vector3 } from "three";
import { PlainGround } from "../../dock.js";
import { Icon } from "../../game/map/icons.js";
import { haptic } from "../../haptics.js";
import "../../porcellana/porcellana.css";
import { type Shared, TileBoard } from "../../porcellana/TileBoard.js";
import { sound } from "../../sound.js";
import { CloseButton } from "../../ui.js";
import { Guard3D } from "../map3d/Guard.js";
import { MAP_3D } from "../map3d/flag.js";
import { useCoverBoard } from "../map3d/pause.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { PortaDock, type PortaPane } from "./PortaDock.js";
import { portaApi } from "./api.js";
import { type Docked, LOOK, portaSpec, sixTiers } from "./board.js";
import { RARITY_HEX, ROME_DUSK } from "./colours.js";
import { errorText, pt } from "./texts.js";
import { type PortaState, type PortaView, RARITIES, type Rarity } from "./types.js";

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
  const [dockW, setDockW] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dockRef.current;
    if (!open || !el || typeof ResizeObserver === "undefined") return;
    // On a computer the dock stands on the right; on a phone, at the foot.
    const ro = new ResizeObserver(() => {
      const side = window.innerWidth >= 1024;
      setDockH(side ? 0 : el.offsetHeight);
      setDockW(side ? el.offsetWidth + 20 : 0);
    });
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
    // Above the four places (the gameplay audit, P5): the Porta is a place, left by the bar.
    <div
      className="porta-in fixed inset-x-0 top-0 bottom-[var(--places)] z-40 lg:top-[var(--topbar,0px)] overflow-hidden bg-[#E9E6E0]"
      data-porta-scene
    >
      <SceneView
        v={v}
        tier={tier}
        dark={dark}
        combatId={combatId}
        transportId={transportId}
        focus={focus}
        dockH={dockH}
        dockW={dockW}
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
          className="glass flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-4 pr-1 lg:max-w-md"
          data-porta-level
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-place text-lg font-black leading-tight text-cream">
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
        <CloseButton onClick={onClose} className="glass shrink-0 lg:ml-auto" />
      </header>
      {back && (
        <output
          className="porta-back orbit-in absolute inset-x-4 top-28 mx-auto block max-w-sm rounded-2xl bg-night/90 p-4 text-center shadow-xl ring-1 ring-edge"
          data-porta-back
        >
          <p className="font-place text-lg font-black leading-tight text-gold">{pt.backTitle}</p>
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
      <div
        ref={dockRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[28rem]"
      >
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
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 [&_svg]:h-5 [&_svg]:w-5 ${on ? "ink-pill" : "glass-chip text-cream"}`}
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

/** The Porta's board (Porcellana, P2) under its pins. */
function SceneView(props: {
  v: PortaView;
  tier: number;
  dark: boolean;
  combatId: string;
  transportId: string;
  focus: Focus;
  dockH: number;
  dockW: number;
  onTier: (n: number) => void;
  onDark: () => void;
  onChoose: (id: string, role: "combat" | "transport") => void;
  onStall: () => void;
}) {
  const { v } = props;
  const docked: Docked[] = [
    ...v.vehicles
      .filter((x) => x.place === "porta")
      .map((x) => ({ id: x.id, model: x.model, role: "combat" as const })),
    ...v.transports
      .filter((x) => x.place === "porta")
      .map((x) => ({ id: x.id, model: x.type, role: "transport" as const })),
  ];
  // The board is built again only when what stands on it changes.
  const shape = `${docked.map((x) => x.id).join(",")}|${v.tiers.map((t) => (t.open ? 1 : 0)).join("")}|${RARITIES.map((r) => (v.relics[r] > 0 ? 1 : 0)).join("")}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt by its shape only
  const spec = useMemo(() => portaSpec(v, docked), [shape]);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
    marked: new Set(),
  }).current;
  const look = LOOK[props.focus];
  sh.goTo = look.at;
  // A phone sees the whole place a little farther back (its dock takes the lower half).
  sh.goZoom = look.zoom * (props.dockW === 0 && window.innerWidth < 640 ? 0.7 : 1);
  sh.inset = props.dockH;
  sh.insetRight = props.dockW;
  sh.marked = new Set([
    `tier:${props.tier}`,
    ...(props.dark ? ["dark"] : []),
    `veh:${props.combatId}`,
    `veh:${props.transportId}`,
  ]);
  const pin = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) sh.pins.set(id, el);
    else sh.pins.delete(id);
  };
  const pick = (id: string | null) => {
    if (!id) return;
    if (id.startsWith("tier:")) {
      const n = Number(id.slice(5));
      if (v.tiers.find((t) => t.tier === n)?.open) props.onTier(n);
    } else if (id === "dark") props.onDark();
    else if (id === "stall") props.onStall();
    else if (id.startsWith("veh:")) {
      const x = docked.find((d) => `veh:${d.id}` === id);
      if (x) props.onChoose(x.id, x.role);
    }
  };
  return (
    <div className="porcellana absolute inset-0" style={{ background: ROME_DUSK.sky }}>
      {MAP_3D ? (
        <Guard3D>
          <Canvas
            orthographic
            dpr={window.innerWidth < 640 ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ camera }) => {
              (camera as OrthographicCamera & { manual?: boolean }).manual = true;
            }}
          >
            <TileBoard spec={spec} sh={sh} onPick={pick} />
          </Canvas>
        </Guard3D>
      ) : (
        <PlainGround />
      )}
      <div className={`pc-pins ${MAP_3D ? "" : "hidden"}`}>
        {sixTiers(v).map((t) => (
          <button
            key={t.tier}
            ref={pin(`tier:${t.tier}`)}
            type="button"
            className="pc-pin"
            data-out="false"
            data-on={String(props.tier === t.tier)}
            disabled={!t.open}
            onClick={() => props.onTier(t.tier)}
            aria-pressed={props.tier === t.tier}
            aria-label={`${pt.tier(t.tier)}${t.open ? "" : ` · ${pt.tierClosed}`}`}
            data-porta-tier={t.tier}
          >
            {t.open ? t.tier : "·"}
          </button>
        ))}
        <button
          ref={pin("dark")}
          type="button"
          role="switch"
          aria-checked={props.dark}
          aria-label={pt.dark}
          className="pc-pin pc-pin-wide"
          data-out="false"
          data-on={String(props.dark)}
          onClick={props.onDark}
          data-porta-dark
        >
          {pt.dark}
        </button>
        {docked.map((x) => {
          const chosen = x.id === props.combatId || x.id === props.transportId;
          return (
            <button
              key={x.id}
              ref={pin(`veh:${x.id}`)}
              type="button"
              className="pc-pin pc-pin-wide"
              data-out="false"
              data-on={String(chosen)}
              onClick={() => props.onChoose(x.id, x.role)}
              aria-pressed={chosen}
              data-porta-vehicle={x.id}
            >
              {x.role === "combat" ? (pt.model[x.model] ?? x.model) : x.model}
            </button>
          );
        })}
        <button
          ref={pin("stall")}
          type="button"
          className="pc-pin pc-pin-wide"
          data-out="false"
          data-on="false"
          onClick={props.onStall}
        >
          {pt.antiquarian}
        </button>
      </div>
    </div>
  );
}

/** What the camera looks at, by the dock's decision (docs/plan-dock.md). */
export type Focus = "quay" | "steps" | "gate" | "stall";
