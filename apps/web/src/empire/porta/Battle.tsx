import { useEffect, useMemo, useRef, useState } from "react";
import { CloseButton, Slab } from "../../ui.js";
import { portaApi, useBattle } from "./api.js";
import { errorText, pt } from "./texts.js";
import type { BattleSnapshot, PlayerUnitView, Rarity, RomeUnitView } from "./types.js";

/**
 * The battle in the lands of Rome (docs/plan-porta.md § 6), in the Lagune: the map is a disc of
 * night, the cities are astres holding the player's own relics, the gate glows at the west.
 * Rome's units show their vision (a faint ring) and, when they fight, their reach; the player's
 * vehicles show their weapons' reach when chosen. Touch a vehicle, then where it must go; the
 * round buttons launch its components; at the gate, « Sortir » takes it out with its cargo.
 */

const RARITY_COLOR: Record<Rarity, string> = {
  common: "rgb(var(--cream-dim))",
  rare: "rgb(var(--lagoon))",
  precious: "rgb(var(--info))",
  legendary: "rgb(var(--gold))",
};
const ROME_GLYPH: Record<string, string> = {
  crossbowman: "A",
  halberdier: "H",
  light_horse: "C",
  bombard: "B",
  gonfalonier: "G",
};

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1_000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const isMine = (u: BattleSnapshot["units"][number]): u is PlayerUnitView =>
  u.side === "player" && u.mine;

function HpBar({ hp, max, y = -0.45 }: { hp: number; max: number; y?: number }) {
  const w = 0.7;
  const share = Math.max(0, Math.min(1, hp / max));
  return (
    <g transform={`translate(${-w / 2} ${y})`}>
      <rect width={w} height={0.08} rx={0.04} fill="rgb(var(--night-4))" />
      <rect
        width={w * share}
        height={0.08}
        rx={0.04}
        fill={
          share > 0.5
            ? "rgb(var(--lagoon))"
            : share > 0.25
              ? "rgb(var(--gold))"
              : "rgb(var(--vermilion))"
        }
      />
    </g>
  );
}

export function BattleScreen({ onClose }: { onClose: () => void }) {
  const battle = useBattle(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  // The first of my vehicles still inside is chosen at the start.
  useEffect(() => {
    if (!battle) return;
    const mine = battle.units.filter(isMine).filter((u) => u.outcome === "in");
    if (!selected || !mine.some((u) => u.id === selected)) setSelected(mine[0]?.id ?? null);
  }, [battle, selected]);

  const order = async (o: Parameters<typeof portaApi.order>[0]) => {
    const res = await portaApi.order(o);
    setError(res.error ? errorText(res.error) : null);
  };

  const hits = useMemo(() => (battle?.events ?? []).filter((e) => e.kind === "hit"), [battle]);

  if (!battle)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-night" data-battle>
        <p className="text-sm text-cream-dim">{pt.battle}…</p>
      </div>
    );

  // The disc fills the width: a thin margin for the gate and the rings at its edge.
  const r = battle.radius + 0.4;
  const units = battle.units;
  const byId = new Map(units.map((u) => [u.id, u]));
  const me = units.filter(isMine);
  const sel = me.find((u) => u.id === selected && u.outcome === "in");
  const atGate = sel ? dist(sel, battle.gate) * 100 <= battle.gateRadiusCenti : false;
  const allOut = me.every((u) => u.outcome !== "in");

  const pointOf = (e: React.PointerEvent | React.MouseEvent) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt0 = el.createSVGPoint();
    pt0.x = e.clientX;
    pt0.y = e.clientY;
    const p = pt0.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const moveTo = (x: number, y: number) => {
    if (sel) void order({ type: "move", unitId: sel.id, x, y });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night" data-battle={battle.id}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div>
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {pt.tier(battle.tier)}
          </p>
          <p className="text-xs text-cream-dim">{sel ? pt.moveHint : pt.selectHint}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.6875rem] uppercase tracking-wider text-cream-dim">{pt.timer}</p>
          <p
            className={`font-display text-xl font-extrabold tabular-nums ${battle.endsAtMs - battle.timeMs < 60_000 ? "text-vermilion" : "text-cream"}`}
            data-battle-timer
          >
            {clock(battle.endsAtMs - battle.timeMs)}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      <svg
        ref={svg}
        viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`}
        className="min-h-0 flex-1 touch-none select-none"
        role="img"
        aria-label={pt.battle}
        onClick={(e) => {
          const p = pointOf(e);
          if (p) moveTo(p.x, p.y);
        }}
        onKeyDown={() => undefined}
      >
        <defs>
          <radialGradient id="porta-disc">
            <stop offset="0%" stopColor="rgb(var(--night-3))" />
            <stop offset="100%" stopColor="rgb(var(--night-2))" />
          </radialGradient>
          <radialGradient id="porta-astre">
            <stop offset="0%" stopColor="rgb(var(--lagoon-soft))" />
            <stop offset="60%" stopColor="rgb(var(--lagoon))" />
            <stop offset="100%" stopColor="rgb(var(--lagoon-deep))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          r={battle.radius}
          fill="url(#porta-disc)"
          stroke="rgb(var(--line))"
          strokeWidth={0.04}
        />

        {/* The gate, at the west. */}
        <g transform={`translate(${battle.gate.x} ${battle.gate.y})`}>
          <circle
            r={battle.gateRadiusCenti / 100}
            fill="none"
            stroke="rgb(var(--gold))"
            strokeWidth={0.05}
            strokeDasharray="0.15 0.1"
          />
          <circle r={0.22} fill="rgb(var(--gold))" />
          <text y={-0.4} textAnchor="middle" fontSize={0.28} fill="rgb(var(--gold))">
            {pt.gate}
          </text>
        </g>

        {/* The cities: astres, the player's own relics around them. */}
        {battle.cities.map((c) => {
          const relics = (Object.entries(c.relics) as [Rarity, number][]).flatMap(([k, n]) =>
            Array.from({ length: n }, () => k),
          );
          return (
            <g
              key={c.id}
              transform={`translate(${c.x} ${c.y})`}
              data-battle-city={c.id}
              aria-label={`${pt.battle} · ${c.id}`}
              onClick={(e) => {
                e.stopPropagation();
                moveTo(c.x, c.y);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") moveTo(c.x, c.y);
              }}
            >
              <circle
                r={1}
                fill="none"
                stroke="rgb(var(--lagoon))"
                strokeOpacity={0.35}
                strokeWidth={0.03}
                strokeDasharray="0.1 0.12"
              />
              <circle r={0.55} fill="url(#porta-astre)" />
              {relics.map((k, i) => {
                const a = (2 * Math.PI * i) / Math.max(1, relics.length) - Math.PI / 2;
                return (
                  <circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: relics of a kind are alike
                    key={i}
                    cx={0.75 * Math.cos(a)}
                    cy={0.75 * Math.sin(a)}
                    r={0.1}
                    fill={RARITY_COLOR[k]}
                    stroke="rgb(var(--night))"
                    strokeWidth={0.03}
                  />
                );
              })}
            </g>
          );
        })}

        {/* The blows of the last beat. */}
        {hits.map((h, i) => {
          const a = byId.get(h.from);
          const b = byId.get(h.to);
          if (!a || !b) return null;
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: a beat's blows have no id
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={a.side === "rome" ? "rgb(var(--vermilion))" : "rgb(var(--gold))"}
              strokeWidth={0.04}
              strokeOpacity={0.8}
            />
          );
        })}

        {units.map((u) =>
          u.side === "rome" ? (
            <RomeMark key={u.id} u={u as RomeUnitView} />
          ) : (
            <PlayerMark
              key={u.id}
              u={u as PlayerUnitView}
              chosen={u.id === sel?.id}
              onChoose={() => (u as PlayerUnitView).mine && setSelected(u.id)}
            />
          ),
        )}

        {sel?.goal && (
          <line
            x1={sel.x}
            y1={sel.y}
            x2={sel.goal.x}
            y2={sel.goal.y}
            stroke="rgb(var(--info))"
            strokeWidth={0.04}
            strokeDasharray="0.12 0.1"
          />
        )}
      </svg>

      <footer className="border-t border-line bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {battle.over || allOut ? (
          <div className="flex items-center justify-between gap-3" data-battle-over>
            <p className="text-sm text-cream">{battle.over ? pt.over : pt.out}</p>
            <Slab tone="gold" size="sm" onClick={onClose}>
              {pt.backToMap}
            </Slab>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {me.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u.id)}
                  disabled={u.outcome !== "in"}
                  data-battle-unit={u.id}
                  className={`min-w-[8.5rem] rounded-xl border px-2 py-1.5 text-left text-xs disabled:opacity-40 ${u.id === sel?.id ? "border-info text-cream" : "border-line text-cream-dim"}`}
                >
                  <span className="block font-semibold">
                    {u.role === "combat" ? pt.combat : pt.transport} · {u.hp}/{u.maxHp}
                  </span>
                  {u.role === "transport" &&
                    (u.loading
                      ? pt.loading(u.loading.rarity)
                      : pt.cargo(u.cargo.length, u.capacity))}
                  {u.outcome !== "in" && ` · ${u.outcome}`}
                </button>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {sel?.actives.map((a) => {
                const wait = a.readyAt - battle.timeMs;
                const active = a.until > battle.timeMs;
                return (
                  <button
                    key={a.componentId}
                    type="button"
                    disabled={wait > 0}
                    onClick={() =>
                      void order({ type: "activate", unitId: sel.id, componentId: a.componentId })
                    }
                    data-battle-active={a.effect}
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border text-[0.625rem] font-semibold leading-tight disabled:opacity-50 ${active ? "border-lagoon text-lagoon" : "border-info text-info"}`}
                    aria-label={pt.component[a.effect] ?? a.effect}
                  >
                    {(pt.component[a.effect] ?? a.effect).slice(0, 6)}
                    {wait > 0 && <span className="tabular-nums">{Math.ceil(wait / 1_000)}s</span>}
                  </button>
                );
              })}
              {sel && atGate && (
                <Slab
                  tone="gold"
                  size="sm"
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

const glide = { transition: "transform 250ms linear" } as const;

function RomeMark({ u }: { u: RomeUnitView }) {
  if (u.dead) return null;
  const fighting = u.state === "attack" || u.state === "alert";
  const size = u.kind === "gonfalonier" ? 0.38 : 0.24;
  return (
    <g
      style={{ ...glide, transform: `translate(${u.x}px, ${u.y}px)` }}
      data-rome={u.kind}
      data-state={u.state}
    >
      <circle
        r={u.visionCenti / 100}
        fill="none"
        stroke="rgb(var(--vermilion))"
        strokeOpacity={fighting ? 0.35 : 0.12}
        strokeWidth={0.03}
      />
      {u.state === "attack" && (
        <circle
          r={u.rangeCenti / 100}
          fill="rgb(var(--vermilion))"
          fillOpacity={0.08}
          stroke="none"
        />
      )}
      <rect
        x={-size}
        y={-size}
        width={2 * size}
        height={2 * size}
        rx={0.06}
        fill="rgb(var(--vermilion-deep))"
        stroke="rgb(var(--vermilion))"
        strokeWidth={0.05}
        transform="rotate(45)"
      />
      <text y={0.1} textAnchor="middle" fontSize={0.26} fontWeight={700} fill="rgb(var(--cream))">
        {ROME_GLYPH[u.kind] ?? "?"}
      </text>
      <title>{`${pt.rome[u.kind] ?? u.kind} · ${pt.romeState[u.state] ?? u.state}`}</title>
      <HpBar hp={u.hp} max={u.maxHp} y={-size - 0.2} />
    </g>
  );
}

function PlayerMark({
  u,
  chosen,
  onChoose,
}: {
  u: PlayerUnitView;
  chosen: boolean;
  onChoose: () => void;
}) {
  if (u.outcome !== "in") return null;
  const color = u.mine ? "rgb(var(--info))" : "rgb(var(--lagoon))";
  const hidden = u.hiddenUntil > 0;
  return (
    <g
      style={{ ...glide, transform: `translate(${u.x}px, ${u.y}px)` }}
      opacity={hidden ? 0.5 : 1}
      data-player-unit={u.role}
      role={u.mine ? "button" : undefined}
      tabIndex={u.mine ? 0 : undefined}
      onClick={(e) => {
        if (!u.mine) return;
        e.stopPropagation();
        onChoose();
      }}
      onKeyDown={(e) => {
        if (u.mine && (e.key === "Enter" || e.key === " ")) onChoose();
      }}
    >
      {chosen &&
        u.weapons.map((w) => (
          <circle
            key={w.effect}
            r={w.rangeCenti / 100}
            fill="none"
            stroke="rgb(var(--gold))"
            strokeOpacity={0.5}
            strokeWidth={0.03}
          />
        ))}
      {u.shield > 0 && (
        <circle r={0.42} fill="none" stroke="rgb(var(--lagoon-soft))" strokeWidth={0.06} />
      )}
      {u.role === "combat" ? (
        <path
          d="M0 -0.3 L0.3 0 L0 0.3 L-0.3 0 Z"
          fill={color}
          stroke={chosen ? "rgb(var(--cream))" : "rgb(var(--night))"}
          strokeWidth={0.06}
        />
      ) : (
        <rect
          x={-0.22}
          y={-0.16}
          width={0.44}
          height={0.32}
          rx={0.06}
          fill="rgb(var(--night-4))"
          stroke={chosen ? "rgb(var(--cream))" : color}
          strokeWidth={0.06}
        />
      )}
      {u.cargo.map((k, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: relics of a kind are alike
        <circle key={i} cx={-0.15 + i * 0.12} cy={0.3} r={0.06} fill={RARITY_COLOR[k]} />
      ))}
      <HpBar hp={u.hp} max={u.maxHp} />
    </g>
  );
}
