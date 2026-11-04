import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { TILT } from "../../art/plateau/geom.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { CloseButton, Slab } from "../../ui.js";
import { useCamera } from "../map/useCamera.js";
import { Guard3D } from "../map3d/Guard.js";
import { groundAt } from "../map3d/camera.js";
import type { Battle3DHandle } from "./Battle3D.js";
import { CASE, RARITY_HEX, extentOf, fromChart, toChart } from "./Battle3D.js";
import { portaApi, useBattle } from "./api.js";
import { errorText, pt } from "./texts.js";
import type { BattleOrder, BattleSnapshot, PlayerUnitView, Rarity } from "./types.js";

const Battle3D = lazy(() => import("./Battle3D.js"));

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1_000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const isMine = (u: BattleSnapshot["units"][number]): u is PlayerUnitView =>
  u.side === "player" && u.mine;
const live = () => !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** The island across the screen, its header above, its bar below. */
const fit = (b: { radius: number; gate: { x: number; y: number } }) => (v: Viewport) => {
  const e = extentOf(b);
  // A little closer than the whole island on a phone (its far edges just out of sight), the gate
  // always in sight.
  const s = Math.min((v.w * 1.25) / e.w, Math.max(80, v.h - 230) / (e.h * TILT));
  const [gx] = toChart(b, b.gate.x, b.gate.y);
  const centred = (v.w - e.w * s) / 2;
  const tx = Math.min(Math.max(centred, 40 - gx * s), v.w - 40 - gx * s);
  return { s, tx, ty: (v.h - 40 - e.h * TILT * s) / 2 + 10 };
};

/**
 * The battle in the lands of Rome as a diorama (docs/plan-porta-3d.md, step 1): the island and its
 * figurines in 3D under the map's camera (pinched, dragged, back to the whole island), a touch on
 * one of one's vehicles to choose it, a touch on a town or the ground to send it there (its way
 * dotted), a round button for each of its components with its cooldown, the gold « Sortir » at the
 * gate; the blows' damage rising over their targets, the towns' relics in pips over them.
 */
export function BattleDiorama({ onClose }: { onClose: () => void }) {
  const battle = useBattle(true);
  if (!battle)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-night" data-battle>
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
      </div>
    );
  return <Field battle={battle} onClose={onClose} />;
}

function Field({ battle, onClose }: { battle: BattleSnapshot; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const board = useRef<Battle3DHandle | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(battle);
  latest.current = battle;
  const me = battle.units.filter(isMine);
  // The first of my vehicles still inside chosen at the start, and again if it leaves.
  useEffect(() => {
    const inside = me.filter((u) => u.outcome === "in");
    if (!selected || !inside.some((u) => u.id === selected)) setSelected(inside[0]?.id ?? null);
  }, [me, selected]);
  const selRef = useRef(selected);
  selRef.current = selected;

  const order = useCallback(async (o: BattleOrder) => {
    const res = await portaApi.order(o);
    setError(res.error ? errorText(res.error) : null);
  }, []);

  const paint = useCallback((cam: Camera, v: Viewport) => {
    board.current?.view(cam, v);
    const l = layer.current;
    if (l) {
      l.style.setProperty("--s", String(cam.s));
      l.style.setProperty("--tx", `${cam.tx}px`);
      l.style.setProperty("--ty", `${cam.ty}px`);
    }
  }, []);
  const camera = useCamera({
    root,
    initial: fit(battle),
    onPaint: paint,
    extent: extentOf(battle),
    bounds: (v) => {
      const s = fit(latest.current)(v).s;
      return { min: s * 0.7, max: s * 5 };
    },
    onDoubleTap: () => camera.easeTo(fit(latest.current)),
    onTap: (at) => {
      // One of my vehicles under the finger: chosen; else where the chosen one must go.
      const id = board.current?.unitAt(at.x, at.y) ?? null;
      if (id) {
        setSelected(id);
        return;
      }
      const sel = selRef.current;
      if (!sel) return;
      const [X, Y] = groundAt(camera.cam(), camera.view(), at.x, at.y);
      const b = latest.current;
      const [x, y] = fromChart(b, X, Y);
      // A town touched near its middle: its middle.
      const town = b.cities.find((c) => Math.hypot(c.x - x, c.y - y) < 0.8);
      const to = town ?? { x, y };
      void order({ type: "move", unitId: sel, x: to.x, y: to.y });
    },
  });
  const onBoard = useCallback((h: Battle3DHandle | null) => {
    board.current = h;
    if (h) camRef.current.repaint();
  }, []);
  const camRef = useRef(camera);
  camRef.current = camera;

  const sel = me.find((u) => u.id === selected && u.outcome === "in");
  const atGate = sel
    ? Math.hypot(sel.x - battle.gate.x, sel.y - battle.gate.y) * 100 <= battle.gateRadiusCenti
    : false;
  const allOut = me.every((u) => u.outcome !== "in");
  const left = battle.endsAtMs - battle.timeMs;
  const closing = left < 60_000;
  const moveTo = (x: number, y: number) => {
    if (sel) void order({ type: "move", unitId: sel.id, x, y });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#16263E]" data-battle={battle.id}>
      <div ref={root} className="absolute inset-0 touch-none select-none">
        <Guard3D>
          <Suspense fallback={null}>
            <Battle3D ref={onBoard} battle={battle} selected={sel?.id ?? null} live={live()} />
          </Suspense>
        </Guard3D>
        {/* The night closes in, the last minute. */}
        {closing && (
          <div className="battle-closing pointer-events-none absolute inset-0" aria-hidden="true" />
        )}
        {/* Over the ground, to the pixel: the towns' relics, the chosen one's way, the blows. */}
        <div ref={layer} className="pointer-events-none absolute inset-0" data-battle-layer>
          {battle.cities.map((c) => (
            <Pinned key={c.id} battle={battle} x={c.x} y={c.y} lift={-84}>
              <button
                type="button"
                data-battle-city={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  moveTo(c.x, c.y);
                }}
                className="pointer-events-auto flex min-h-11 min-w-11 items-end justify-center gap-1 rounded-full px-1 pb-1"
                aria-label={pt.cityRelics(relicsOf(c))}
              >
                {relicsOf(c).length === 0 ? (
                  <span className="text-xs text-cream-dim">—</span>
                ) : (
                  relicsOf(c).map((k, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
                      key={i}
                      className="h-3 w-3 rounded-sm shadow-md shadow-black/60 ring-1 ring-night"
                      style={{ background: RARITY_HEX[k] }}
                    />
                  ))
                )}
              </button>
            </Pinned>
          ))}
          <Pinned battle={battle} x={battle.gate.x} y={battle.gate.y} lift={-70}>
            <span className="rounded-full bg-gold px-2.5 py-0.5 font-place text-xs font-bold uppercase tracking-[0.12em] text-ink shadow-lg">
              {pt.gate}
            </span>
          </Pinned>
          {sel?.goal && <Way battle={battle} from={sel} to={sel.goal} />}
          <Damage battle={battle} />
        </div>
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto rounded-2xl bg-night/80 px-3 py-1.5 shadow-lg shadow-black/40">
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {pt.tier(battle.tier)}
          </p>
          <p className="text-xs text-cream-dim">{sel ? pt.moveHint : pt.selectHint}</p>
        </div>
        <div
          className={`rounded-2xl px-3 py-1 text-center shadow-lg shadow-black/40 ${closing ? "bg-vermilion text-cream" : "bg-night/80 text-cream"}`}
        >
          <p className="text-xs uppercase tracking-wider opacity-80">{pt.timer}</p>
          <p className="font-display text-2xl font-extrabold tabular-nums" data-battle-timer>
            {clock(left)}
          </p>
        </div>
        <div className="pointer-events-auto">
          <CloseButton onClick={onClose} />
        </div>
      </header>

      <footer className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/90 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6">
        {battle.over || allOut ? (
          <div className="flex items-center justify-between gap-3" data-battle-over>
            <p className="text-sm text-cream">{battle.over ? pt.over : pt.out}</p>
            <Slab tone="gold" size="sm" onClick={onClose}>
              {pt.backToMap}
            </Slab>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {me.map((u) => (
                <UnitCard
                  key={u.id}
                  u={u}
                  chosen={u.id === sel?.id}
                  onChoose={() => setSelected(u.id)}
                  t={battle.timeMs}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {sel?.actives.map((a) => (
                <ActiveButton
                  key={a.componentId}
                  a={a}
                  t={battle.timeMs}
                  onPress={() =>
                    void order({ type: "activate", unitId: sel.id, componentId: a.componentId })
                  }
                />
              ))}
              <span className="flex-1" />
              {sel && atGate && (
                <Slab
                  tone="gold"
                  size="md"
                  onClick={() => void order({ type: "leave", unitId: sel.id })}
                >
                  {pt.leaveGate}
                </Slab>
              )}
            </div>
            {error && (
              <p className="mt-1 text-xs font-semibold text-vermilion" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </footer>
    </div>
  );
}

const relicsOf = (c: BattleSnapshot["cities"][number]): Rarity[] =>
  (Object.entries(c.relics) as [Rarity, number][]).flatMap(([k, n]) =>
    Array.from({ length: n }, () => k),
  );

/** An HTML element over a point of the battle's ground, `lift` px above it, following the camera. */
function Pinned({
  battle,
  x,
  y,
  lift = 0,
  children,
}: {
  battle: BattleSnapshot;
  x: number;
  y: number;
  lift?: number;
  children: React.ReactNode;
}) {
  const [X, Y] = toChart(battle, x, y);
  return (
    <div
      className="absolute left-0 top-0"
      style={{
        transform: `translate(calc(var(--tx) + ${X}px * var(--s)), calc(var(--ty) + ${Y * TILT}px * var(--s) + ${lift}px)) translate(-50%, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

/** The chosen vehicle's way to its goal, dotted on the ground. */
function Way({
  battle,
  from,
  to,
}: {
  battle: BattleSnapshot;
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const [x0, y0] = toChart(battle, from.x, from.y);
  const [x1, y1] = toChart(battle, to.x, to.y);
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (CASE * 0.35)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const k = (i + 1) / n;
        const fx = from.x + (to.x - from.x) * k;
        const fy = from.y + (to.y - from.y) * k;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the dots of a way
          <Pinned key={i} battle={battle} x={fx} y={fy}>
            <span
              className={`block rounded-full bg-info ${i === n - 1 ? "h-3 w-3 ring-2 ring-night" : "h-1.5 w-1.5 opacity-80"}`}
            />
          </Pinned>
        );
      })}
    </>
  );
}

/** The damage of each beat, rising over its target and fading. */
function Damage({ battle }: { battle: BattleSnapshot }) {
  const [shown, setShown] = useState<
    { key: string; x: number; y: number; n: number; mine: boolean; at: number }[]
  >([]);
  useEffect(() => {
    const byId = new Map(battle.units.map((u) => [u.id, u]));
    const now = performance.now();
    const fresh = battle.events.flatMap((e, i) => {
      if (e.kind !== "hit") return [];
      const to = byId.get(e.to);
      if (!to) return [];
      const mine = to.side === "player" && to.mine;
      return [{ key: `${battle.timeMs}:${i}`, x: to.x, y: to.y, n: e.damage, mine, at: now }];
    });
    if (fresh.length === 0) return;
    setShown((s) => [...s.filter((x) => now - x.at < 900), ...fresh].slice(-24));
  }, [battle]);
  return (
    <>
      {shown.map((d) => (
        <Pinned key={d.key} battle={battle} x={d.x} y={d.y} lift={-48}>
          <span
            className={`battle-damage block font-display text-sm font-extrabold tabular-nums [text-shadow:0_1px_3px_rgb(0_0_0/0.9)] ${d.mine ? "text-vermilion" : "text-gold"}`}
          >
            {Math.round(d.n)}
          </span>
        </Pinned>
      ))}
    </>
  );
}

/** One of my vehicles at the foot: its figure's name, its health, its cargo or its loading. */
function UnitCard({
  u,
  chosen,
  onChoose,
  t,
}: {
  u: PlayerUnitView;
  chosen: boolean;
  onChoose: () => void;
  t: number;
}) {
  const share = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const loading = u.loading
    ? Math.max(0, Math.min(1, 1 - (u.loading.doneAt - t) / loadMs(u.loading.rarity)))
    : null;
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={u.outcome !== "in"}
      data-battle-unit={u.id}
      className={`min-h-[3.25rem] min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 text-left disabled:opacity-40 ${chosen ? "border-gold bg-gold/10" : "border-line bg-night/80"}`}
    >
      <span className="flex items-center justify-between gap-2 text-xs font-semibold text-cream">
        <span>{u.role === "combat" ? pt.combat : pt.transport}</span>
        <span className="tabular-nums text-cream-dim">
          {u.hp}/{u.maxHp}
        </span>
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-night-4">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${share * 100}%`,
            background: share > 0.5 ? "#6EE0B8" : share > 0.25 ? "#F2C24F" : "#E06A4A",
          }}
        />
      </span>
      {u.role === "transport" && (
        <span className="mt-1 flex items-center gap-1 text-xs text-cream-dim">
          {Array.from({ length: u.capacity }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the places of the hold
              key={i}
              className="h-3 w-3 rounded-sm ring-1 ring-line"
              style={{ background: u.cargo[i] ? RARITY_HEX[u.cargo[i] as Rarity] : "transparent" }}
            />
          ))}
          {loading !== null && u.loading && (
            <span className="ml-1 tabular-nums" style={{ color: RARITY_HEX[u.loading.rarity] }}>
              {Math.round(loading * 100)} %
            </span>
          )}
        </span>
      )}
    </button>
  );
}

const loadMs = (r: Rarity) =>
  ({ common: 10_000, rare: 20_000, precious: 35_000, legendary: 60_000 })[r];

/** A component's round button: its name, its cooldown sweeping round it, lit while it works. */
function ActiveButton({
  a,
  t,
  onPress,
}: {
  a: PlayerUnitView["actives"][number];
  t: number;
  onPress: () => void;
}) {
  const wait = a.readyAt - t;
  const on = a.until > t;
  const cooling = wait > 0;
  return (
    <button
      type="button"
      disabled={cooling}
      onClick={onPress}
      data-battle-active={a.effect}
      aria-label={pt.component[a.effect] ?? a.effect}
      className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-full text-xs font-semibold leading-tight shadow-lg shadow-black/50 ${on ? "bg-lagoon text-on-lagoon" : "bg-night-3 text-cream ring-1 ring-info/70"}`}
    >
      {cooling && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(rgb(0 0 0 / 0.55) var(--k), transparent 0)",
            ["--k" as string]: `${Math.min(100, (wait / 45_000) * 100)}%`,
          }}
        />
      )}
      <span className="relative">{(pt.component[a.effect] ?? a.effect).slice(0, 7)}</span>
      {cooling && <span className="relative tabular-nums">{Math.ceil(wait / 1_000)} s</span>}
    </button>
  );
}
