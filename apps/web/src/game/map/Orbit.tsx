import type { ReactNode } from "react";
import { Crest, type CrestData } from "../../art/crest.js";
import { GoodsMark, goodsColour } from "../../art/goods.js";
import { Coin } from "../../art/icons.js";
import { fr } from "../../i18n.js";
import { clock } from "../../ui.js";
import type { GameProps } from "../Game.js";
import { amount } from "../format.js";
import { harvestAndRestart } from "../harvest.js";
import type { BuildingView } from "../types.js";
import { readyOf, recipeOf, workshopState } from "../workshops.js";
import { Icon } from "./icons.js";

/** Where the workshops turn: the orbit's radius, in % of the square that holds it. */
const ORBIT = 36;
const RING = 30;
const RING_C = 2 * Math.PI * RING;

interface Star {
  b: BuildingView;
  x: number;
  y: number;
}

/**
 * The counter seen up close, once touched on the map: its gold sun in the middle, each workshop a
 * star in orbit around it (the mark of what it makes, the arc of its batch, lagoon and « +10 »
 * when it is ready, a dotted round when it waits), the chain drawn between those that feed each
 * other, a free plot to build on. Under it, the store in chips; at the foot, the one gold action
 * and the doors to the workshops, the store and building.
 */
export function ComptoirOrbit({
  props,
  crest,
  onClose,
}: {
  props: GameProps;
  crest: CrestData;
  onClose: () => void;
}) {
  const { view, now } = props;
  const m = fr.game.map;
  const t = m.orbit;
  const room = view.buildings.length < props.catalog.rules.maxBuildings;
  const places = view.buildings.length + (room ? 1 : 0);
  const at = (i: number) => {
    const a = ((-90 + (360 / Math.max(1, places)) * i) * Math.PI) / 180;
    return { x: 50 + ORBIT * Math.cos(a), y: 50 + ORBIT * Math.sin(a) };
  };
  const stars: Star[] = view.buildings.map((b, i) => ({ b, ...at(i) }));
  const plot = room ? at(view.buildings.length) : null;
  // The chain: a workshop whose goods another one takes in.
  const links: { from: Star; to: Star; colour: string }[] = [];
  for (const from of stars) {
    const out = Object.keys(recipeOf(props, from.b.type)?.outputs ?? {});
    for (const to of stars) {
      if (to === from) continue;
      const input = Object.keys(recipeOf(props, to.b.type)?.inputs ?? {}).find((r) =>
        out.includes(r),
      );
      if (input) links.push({ from, to, colour: goodsColour(input) });
    }
  }
  const ready = view.buildings.reduce((n, b) => n + readyOf(b, now), 0);
  const running = view.buildings.filter((b) => b.job && readyOf(b, now) < b.job.batches).length;
  const idle = view.buildings.some((b) => !b.job && b.canStart > 0);
  const hungry = view.rations.perDay > 0 && view.rations.hungryUntil > now;
  const bread = view.inventory.find((i) => i.resource === view.rations.resource)?.available ?? 0;
  const breadDays = view.rations.perDay > 0 ? Math.floor(bread / view.rations.perDay) : null;
  const stock = view.inventory.filter((i) => i.available > 0);
  const total = stock.reduce((n, i) => n + i.available, 0);
  return (
    <section
      data-orbit
      // A place over the map (the guide sees the map covered, never the windows over it), and a
      // place's panel for the layout's checks.
      data-place
      data-panel
      aria-label={m.homeLabel}
      className="orbit-in absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_32%,rgb(var(--night-3))_0%,rgb(var(--night))_62%)] lg:right-[var(--side,0px)]"
    >
      <header className="relative z-10 flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label={t.back}
          onClick={onClose}
          className="hud-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cream transition active:scale-90"
        >
          {Icon.chevronLeft()}
        </button>
        <h2 className="font-place text-base font-bold uppercase tracking-[0.25em] text-gold">
          {m.homeLabel}
        </h2>
        <span className="flex shrink-0 items-center gap-1.5 font-display text-lg font-extrabold text-gold">
          {amount(BigInt(view.cash))}
          <Coin size={20} />
        </span>
      </header>

      {/* The orbit: a square as large as the room allows, the sun in its middle. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div className="relative aspect-square h-full max-h-[26rem] max-w-full">
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r={ORBIT}
              fill="none"
              stroke="rgb(var(--line))"
              strokeWidth="0.3"
              strokeDasharray="0.8 1.6"
            />
            {stars.map((s) => (
              <line
                key={s.b.id}
                x1="50"
                y1="50"
                x2={s.x}
                y2={s.y}
                stroke="rgb(var(--line))"
                strokeOpacity="0.6"
                strokeWidth="0.3"
              />
            ))}
            {links.map((l) => (
              <path
                key={`${l.from.b.id}>${l.to.b.id}`}
                d={`M${l.from.x} ${l.from.y} Q ${50 + (l.from.x + l.to.x - 100) * 0.75} ${50 + (l.from.y + l.to.y - 100) * 0.75} ${l.to.x} ${l.to.y}`}
                fill="none"
                stroke={l.colour}
                strokeOpacity="0.7"
                strokeWidth="0.6"
                strokeDasharray="1.2 1.4"
                className="orbit-flow"
              />
            ))}
          </svg>
          <span className="absolute left-1/2 top-1/2 flex h-[21%] w-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_0_48px_rgb(var(--gold)/0.45),inset_-6px_-8px_14px_rgb(0_0_0/0.35)] [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_45%,rgb(var(--gold-deep))_80%,#5A3D12_100%)]">
            <Crest crest={crest} size={40} />
          </span>
          {stars.map((s) => (
            <WorkshopStar key={s.b.id} props={props} star={s} />
          ))}
          {plot && (
            <Place x={plot.x} y={plot.y}>
              <button
                type="button"
                onClick={() => props.setSheet("buildHere")}
                className="flex flex-col items-center gap-1 transition active:scale-95"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-info/50 text-info">
                  {Icon.plus()}
                </span>
                <span className="text-xs font-semibold text-info">{m.buttons.build}</span>
              </button>
            </Place>
          )}
        </div>
      </div>

      {stock.length > 0 && (
        // On a short screen (320 × 568), the orbit needs the room: the store is a door below.
        <section aria-label={t.store} className="px-4 pb-2 [@media(max-height:699px)]:hidden">
          <p className="mb-1.5 text-xs text-cream-dim">{t.storeLine(total)}</p>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {stock.map((i) => (
              <li
                key={i.resource}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-night-2 pl-1.5 pr-3"
              >
                <GoodsMark code={i.resource} size={24} />
                <b className="font-display text-sm tabular-nums">{i.available}</b>
                <span className="text-xs text-cream-dim">{props.names.resource(i.resource)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-t-3xl border-t border-line bg-night-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate font-display text-base font-extrabold">
            {t.summary(ready, running)}
          </span>
          {breadDays !== null && (
            <span className={`shrink-0 text-xs ${hungry ? "text-vermilion" : "text-cream-dim"}`}>
              {hungry ? fr.game.domain.hungry : t.bread(breadDays)}
            </span>
          )}
        </div>
        {(ready > 0 || idle) && (
          <button
            type="button"
            data-coach="panel-harvest"
            disabled={props.busy}
            onClick={() => harvestAndRestart(props)}
            className="mb-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gold font-display text-[0.9375rem] font-extrabold text-ink shadow-[0_0_0_5px_rgb(var(--gold)/0.15)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {ready > 0 ? Icon.harvest() : Icon.restart()}
            {ready > 0 ? t.harvest : m.buttons.restart}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Ghost coach="panel-workshops" onClick={() => props.setSheet("workshops")}>
            {m.buttons.workshops}
          </Ghost>
          <Ghost onClick={() => props.setSheet("store")}>{t.store}</Ghost>
        </div>
      </section>
    </section>
  );
}

function Ghost({
  children,
  onClick,
  coach,
}: { children: ReactNode; onClick: () => void; coach?: string }) {
  return (
    <button
      type="button"
      data-coach={coach}
      onClick={onClick}
      className="h-11 rounded-full border border-line text-sm font-semibold text-cream transition active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function Place({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-8 justify-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  );
}

function WorkshopStar({ props, star }: { props: GameProps; star: Star }) {
  const { b } = star;
  const w = workshopState(props, b);
  const t = fr.game.map.orbit;
  const name = props.names.building(b.type);
  const output = Object.keys(recipeOf(props, b.type)?.outputs ?? {})[0];
  const line =
    w.state === "ready"
      ? fr.game.map.workshopRow.ready(w.ready)
      : w.state === "running" && w.left !== undefined
        ? clock(w.left)
        : w.state === "idle"
          ? fr.game.map.workshopRow.idle
          : w.state === "blocked" && w.resource
            ? t.waits(props.names.resource(w.resource))
            : fr.game.map.workshopRow.starved;
  const waiting = w.state === "idle" || w.state === "blocked" || w.state === "still";
  return (
    <Place x={star.x} y={star.y}>
      <button
        type="button"
        aria-label={`${name} · ${line}`}
        onClick={() => props.setSheet(`produce:${b.id}`)}
        className="flex w-24 flex-col items-center gap-0.5 transition active:scale-95"
      >
        <span className="relative flex h-16 w-16 items-center justify-center">
          {w.state === "ready" && <span className="marker-halo absolute -inset-3 rounded-full" />}
          <svg viewBox="-34 -34 68 68" className="absolute inset-0 -rotate-90" aria-hidden="true">
            {waiting ? (
              <circle
                r={RING}
                fill="none"
                stroke={w.state === "idle" ? "rgb(var(--cream) / 0.6)" : "rgb(var(--muted))"}
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            ) : (
              <>
                <circle r={RING} fill="none" stroke="rgb(var(--info) / 0.2)" strokeWidth="4" />
                <circle
                  r={RING}
                  fill="none"
                  stroke={w.state === "ready" ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(RING_C * (w.state === "ready" ? 1 : Math.max(0.03, Math.min(1, w.progress ?? 0)))).toFixed(1)} ${RING_C.toFixed(1)}`}
                />
              </>
            )}
          </svg>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-night-2 ring-1 ring-line">
            {output ? (
              <GoodsMark code={output} size={30} />
            ) : (
              <span className="h-4 w-4 rotate-45 bg-gold-soft" />
            )}
          </span>
          {w.state === "ready" && w.quantity !== undefined && (
            <span className="absolute -right-4 -top-2 rounded-full bg-lagoon px-2 py-0.5 font-display text-xs font-extrabold text-on-lagoon">
              +{w.quantity}
            </span>
          )}
        </span>
        <span className="max-w-full truncate text-[0.8125rem] font-bold text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {name}
          {b.level > 1 && <span className="font-normal text-cream-dim"> · {t.level(b.level)}</span>}
        </span>
        <span
          className={`max-w-full truncate text-xs tabular-nums ${w.state === "ready" ? "text-lagoon" : "text-cream-dim"}`}
        >
          {line}
        </span>
      </button>
    </Place>
  );
}
