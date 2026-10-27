import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { GoodsMark, goodsColour } from "../../art/goods.js";
import { Coin } from "../../art/icons.js";
import { fr } from "../../i18n.js";
import { Slab, clock } from "../../ui.js";
import { perHour } from "../Dashboard.js";
import type { GameProps } from "../Game.js";
import { amount, d } from "../format.js";
import { harvestAndRestart } from "../harvest.js";
import { total } from "../roadKit.js";
import type { BuildingView } from "../types.js";
import { have, readyOf, recipeOf, workshopState } from "../workshops.js";
import { orbStyle } from "./Markers.js";
import { ACTION_ICONS as A } from "./actions.js";
import { Icon } from "./icons.js";

/** Where the workshops turn: the orbit's radius, in % of the square that holds it. */
const ORBIT = 36;
const RING = 30;
const RING_C = 2 * Math.PI * RING;

/**
 * A place opens from its mark on the map and folds back into it: the mark's middle, measured as the
 * place mounts, is the origin of its zoom (index.css, .orbit-in and .orbit-out). Without a mark in
 * sight, the middle of the screen.
 */
function useOriginAt(from: string | undefined) {
  const section = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = section.current;
    const mark = from ? document.querySelector(from) : null;
    if (!el || !mark || mark.getClientRects().length === 0) return;
    const box = el.getBoundingClientRect();
    const at = mark.getBoundingClientRect();
    el.style.transformOrigin = `${at.left + at.width / 2 - box.left}px ${at.top + at.height / 2 - box.top}px`;
  }, [from]);
  return section;
}

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
  leaving,
  from,
}: {
  props: GameProps;
  crest: CrestData;
  onClose: () => void;
  /** Closed: it shrinks back into the map for a moment, untouchable (MapScreen). */
  leaving?: boolean;
  /** Its mark on the map, where it opens from and folds back into. */
  from?: string;
}) {
  const section = useOriginAt(from);
  const { view, now } = props;
  const m = fr.game.map;
  const t = m.orbit;
  const [hop, setHop] = useState(0);
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
      ref={section}
      // A place over the map (the guide sees the map covered, never the windows over it), and a
      // place's panel for the layout's checks; no longer once it leaves.
      data-orbit={leaving ? undefined : true}
      data-place={leaving ? undefined : true}
      data-panel={leaving ? undefined : true}
      aria-hidden={leaving || undefined}
      aria-label={m.homeLabel}
      className={`${leaving ? "orbit-out pointer-events-none" : "orbit-in"} absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_32%,rgb(var(--night-3))_0%,rgb(var(--night))_62%)] lg:right-[var(--side,0px)]`}
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
        <div className="relative aspect-square h-full max-h-[26rem] max-w-full [container-type:inline-size]">
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
            <SunCorona perHour={perHour(props)} />
            {/* The threads to the sun and the chain appear once the stars are in place. */}
            <g className="orbit-links">
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
            </g>
          </svg>
          <span className="sun-breathe absolute left-1/2 top-1/2 flex h-[21%] w-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_0_48px_rgb(var(--gold)/0.45),inset_-6px_-8px_14px_rgb(0_0_0/0.35)] [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_45%,rgb(var(--gold-deep))_80%,#5A3D12_100%)]">
            <Crest crest={crest} size={40} />
          </span>
          {stars.map((s, i) => (
            <WorkshopStar key={s.b.id} props={props} star={s} hop={hop} rank={i} />
          ))}
          {plot && (
            <Place x={plot.x} y={plot.y} rank={stars.length}>
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
                data-goods-to={i.resource}
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
          <Slab
            size="lg"
            coach="panel-harvest"
            busy={props.busy}
            shine={ready > 0}
            onClick={() => {
              // The ready stars jump at the touch, before the server answers.
              setHop((n) => n + 1);
              harvestAndRestart(props);
            }}
            className="mb-2 w-full"
          >
            {ready > 0 ? Icon.harvest() : Icon.restart()}
            {ready > 0 ? t.harvest : m.buttons.restart}
          </Slab>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Ghost coach="panel-workshops" onClick={() => props.setSheet("workshops")}>
            {m.buttons.workshops}
          </Ghost>
          <Ghost fx="store" onClick={() => props.setSheet("store")}>
            {t.store}
          </Ghost>
        </div>
      </section>
    </section>
  );
}

function Ghost({
  children,
  onClick,
  coach,
  fx,
}: { children: ReactNode; onClick: () => void; coach?: string; fx?: string }) {
  return (
    <button
      type="button"
      data-coach={coach}
      // Where the harvest's goods land when the store's chips are not shown (fx.tsx, flyGoods).
      data-goods-to={fx}
      onClick={onClick}
      className="h-11 rounded-full border border-line text-sm font-semibold text-cream transition hover:border-cream/40 active:scale-[0.97] active:bg-night-3"
    >
      {children}
    </button>
  );
}

/** The sun's radius in the orbit's square (21 % of it), and the longest a ray reaches past it. */
const SUN_R = 10.5;
const RAY_MAX = 14;
const RAYS = Array.from({ length: 24 }, (_, i) => ({
  angle: (i * 360) / 24,
  long: i % 2 === 0,
}));

/**
 * The counter's corona: rays that turn slowly around the sun, as long as the counter earns (its
 * workshops' margin an hour, on a log scale: a first workshop shows a little light, a busy
 * counter a crown), with a dotted ring turning the other way. Drawn from the middle, under the
 * sun's disc: its length is a scale of the whole, which glides when it changes.
 */
function SunCorona({ perHour }: { perHour: bigint }) {
  const ducats = Math.max(0, Number(perHour) / 100);
  // A scale of display, not of the game: 400 d/h and more is the full crown.
  const share = Math.min(1, Math.max(0.08, Math.log10(1 + ducats) / Math.log10(401)));
  const reach = SUN_R + RAY_MAX;
  const scale = (SUN_R + 0.5 + share * RAY_MAX) / reach;
  return (
    <>
      <defs>
        <radialGradient id="sun-ray" gradientUnits="userSpaceOnUse" cx="50" cy="50" r={reach}>
          <stop offset="0.4" stopColor="rgb(var(--gold-soft))" stopOpacity="0.85" />
          <stop offset="1" stopColor="rgb(var(--gold))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="sun-corona">
        <g className="sun-reach" style={{ transform: `scale(${scale.toFixed(3)})` }}>
          {RAYS.map((r) => {
            const tip = r.long ? reach : SUN_R + (reach - SUN_R) * 0.55;
            const a = (r.angle * Math.PI) / 180;
            const w = (3.2 * Math.PI) / 180;
            const base = SUN_R * 0.6;
            const pt = (rad: number, ang: number) =>
              `${(50 + rad * Math.cos(ang)).toFixed(2)},${(50 + rad * Math.sin(ang)).toFixed(2)}`;
            return (
              <polygon
                key={r.angle}
                points={`${pt(base, a - w)} ${pt(tip, a)} ${pt(base, a + w)}`}
                fill="url(#sun-ray)"
              />
            );
          })}
        </g>
      </g>
      <circle
        cx="50"
        cy="50"
        r={SUN_R + 3}
        fill="none"
        stroke="rgb(var(--gold-soft) / 0.35)"
        strokeWidth="0.4"
        strokeDasharray="0.4 2.2"
        className="sun-ring"
      />
    </>
  );
}

/**
 * Something in orbit at (x, y), in % of the square. As the place opens, it leaves the middle (the
 * sun) and springs to its place, after those before it (`rank`); the square is a container, its
 * width the unit of the way back to the middle (index.css, .star-enter).
 */
function Place({
  x,
  y,
  rank,
  children,
}: { x: number; y: number; rank: number; children: ReactNode }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-8 justify-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className="star-enter flex justify-center"
        style={
          {
            "--dx": `${(50 - x).toFixed(2)}cqw`,
            "--dy": `${(50 - y).toFixed(2)}cqw`,
            animationDelay: `${120 + rank * 45}ms`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

function WorkshopStar({
  props,
  star,
  hop,
  rank,
}: {
  props: GameProps;
  star: Star;
  /** Harvests touched so far: a ready star jumps at each, after the ones before it. */
  hop: number;
  rank: number;
}) {
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
    <Place x={star.x} y={star.y} rank={rank}>
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
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                  strokeDasharray={`${(RING_C * (w.state === "ready" ? 1 : Math.max(0.03, Math.min(1, w.progress ?? 0)))).toFixed(1)} ${RING_C.toFixed(1)}`}
                />
              </>
            )}
          </svg>
          <span
            // Remounted at each harvest touched: the ready ones jump again.
            key={hop}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-night-2 ring-1 ring-line ${hop > 0 && w.state === "ready" ? "star-hop" : ""}`}
            style={{ animationDelay: `${rank * 70}ms` }}
          >
            {output ? (
              // The harvest's goods fly from here to the store (fx.tsx, flyGoods).
              <span data-goods-from={output} className="flex">
                <GoodsMark code={output} size={30} />
              </span>
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

/** The most orders drawn around a city up close; the others wait for the cargo sheet. */
const CITY_ORDERS = 8;

/**
 * A city seen up close, once touched on the map: its monument in the middle, its open orders in
 * orbit around it (the mark of the good, full when the stock covers it, its quantity and what it
 * pays, a red clock on an urgent one), then at the foot its state and the one gold action, loading
 * a free mule for it; its other doors (criée, warehouse, fondaco, suppliers, Rialto) in ghost pills.
 */
export function CityOrbit({
  props,
  code,
  freeCart,
  onClose,
  onPrev,
  onNext,
  onCargo,
  onSheet,
  leaving,
  from,
}: {
  props: GameProps;
  code: string;
  /** Closed: it shrinks back into the map for a moment, untouchable (MapScreen). */
  leaving?: boolean;
  freeCart: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCargo: () => void;
  onSheet: (s: string) => void;
  /** Its mark on the map, where it opens from and folds back into. */
  from?: string;
}) {
  const section = useOriginAt(from);
  const { view, now } = props;
  const m = fr.game.map;
  const t = m.orbit;
  const road = view.road;
  const orders = (road?.orders ?? []).filter((o) => o.city === code && o.status === "open");
  const shown = orders.slice(0, CITY_ORDERS);
  const covered = orders.filter((o) => have(view, o.resource) >= o.quantity).length;
  const criee =
    view.criee && view.criee.city === code && view.criee.endsAt > now ? view.criee : null;
  const nextDay = props.catalog.world.startsAt + view.day * 86_400_000;
  const venice = code === "venezia";
  const status = criee
    ? m.city.criee(
        props.names.resource(criee.resource),
        String(Math.round(criee.premiumBps / 100)),
        clock(criee.endsAt - now),
      )
    : road
      ? orders.length > 0
        ? m.city.deliverable(covered)
        : m.city.none(clock(nextDay - now))
      : venice
        ? m.city.venice
        : "";
  const sells = !road && view.cityQuotes.some((q) => q.city === code);
  const held = view.supplies.filter((s) => s.city === code);
  const doors: { label: string; on: () => void; coach?: string }[] = [];
  if (sells) doors.push({ label: A.sell.label, on: () => onSheet(`sell:${code}`) });
  if (criee) doors.push({ label: m.buttons.criee, on: () => onSheet("criee") });
  if (road && view.warehouses)
    doors.push({ label: A.warehouse.label, on: () => onSheet(`warehouse:${code}`) });
  // The merchant's fondaco in the city, its level when open (E1-3).
  const fondaco = view.fondaci?.cities.find((c) => c.city === code);
  if (road && fondaco)
    doors.push({
      label: fondaco.level > 0 ? `${A.fondaco.label} · ${fondaco.level}` : A.fondaco.label,
      on: () => onSheet(`fondaco:${code}`),
    });
  if (road) doors.push({ label: A.suppliers.label, on: () => onSheet(`suppliers:${code}`) });
  if (venice)
    doors.push({ label: m.buttons.rialto, on: () => props.goTo("marche"), coach: "panel-rialto" });
  const at = (i: number) => {
    const a = ((-90 + (360 / Math.max(1, shown.length)) * i) * Math.PI) / 180;
    return { x: 50 + ORBIT * Math.cos(a), y: 50 + ORBIT * Math.sin(a) };
  };
  const cargo = road && orders.length > 0;
  return (
    <section
      ref={section}
      // A place over the map (the guide sees the map covered), and a place's panel for the checks;
      // no longer once it leaves.
      data-orbit={leaving ? undefined : true}
      data-place={leaving ? undefined : true}
      data-panel={leaving ? undefined : true}
      aria-hidden={leaving || undefined}
      aria-label={props.names.city(code)}
      className={`${leaving ? "orbit-out pointer-events-none" : "orbit-in"} absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_34%,rgb(var(--night-3))_0%,rgb(var(--night))_62%)] lg:right-[var(--side,0px)]`}
    >
      <header className="relative z-10 flex items-center gap-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label={t.back}
          onClick={onClose}
          className="hud-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cream transition active:scale-90"
        >
          {Icon.chevronLeft()}
        </button>
        <button
          type="button"
          aria-label={m.prev}
          onClick={onPrev}
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-cream-dim"
        >
          {Icon.chevronLeft()}
        </button>
        <h2 className="min-w-0 truncate text-center font-place text-base font-bold uppercase tracking-[0.25em]">
          {props.names.city(code)}
        </h2>
        <button
          type="button"
          aria-label={m.next}
          onClick={onNext}
          className="mr-auto flex h-11 w-11 shrink-0 items-center justify-center text-cream-dim"
        >
          {Icon.chevronRight()}
        </button>
        <span className="w-11 shrink-0" />
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div className="relative aspect-square h-full max-h-[26rem] max-w-full [container-type:inline-size]">
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
              stroke="rgb(var(--info) / 0.3)"
              strokeWidth="0.3"
              strokeDasharray="0.8 1.6"
            />
          </svg>
          <span
            className="absolute left-1/2 top-1/2 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_8px_28px_rgb(0_0_0/0.5)] ring-2 ring-[#BFE3FF]/45"
            style={orbStyle(code)}
          >
            <CityIcon code={code} className="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
          </span>
          {shown.map((o, i) => {
            const p = at(i);
            const ok = have(view, o.resource) >= o.quantity;
            const name = props.names.resource(o.resource);
            return (
              <Place key={o.id} x={p.x} y={p.y} rank={i}>
                <button
                  type="button"
                  aria-label={`${o.quantity} ${name} · ${d(total(o))}`}
                  disabled={!freeCart}
                  onClick={onCargo}
                  className={`flex w-24 flex-col items-center gap-0.5 transition active:scale-95 ${ok ? "" : "opacity-80"}`}
                >
                  <span className="relative flex h-16 w-16 items-center justify-center">
                    <GoodsMark code={o.resource} size={44} covered={ok} />
                    {o.kind === "urgent" && (
                      <span className="absolute -right-3 -top-1 rounded-full bg-vermilion px-1.5 font-display text-xs font-bold text-ink">
                        {clock(o.expiresAt - now)}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[0.8125rem] font-bold text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
                    {o.quantity} {name.toLowerCase()}
                  </span>
                  {ok ? (
                    <span className="font-display text-xs font-extrabold text-gold">
                      {d(total(o))}
                    </span>
                  ) : (
                    <span className="text-xs text-vermilion">
                      {t.missing(o.quantity - have(view, o.resource))}
                    </span>
                  )}
                </button>
              </Place>
            );
          })}
        </div>
      </div>

      <section className="rounded-t-3xl border-t border-line bg-night-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <p
          className={`mb-3 text-sm ${criee ? "text-vermilion" : covered > 0 ? "text-lagoon" : "text-cream-dim"}`}
        >
          {status}
        </p>
        {cargo && (
          <Slab
            size="lg"
            tone={covered > 0 && freeCart ? "gold" : "ghost"}
            coach="panel-cargo"
            disabled={!freeCart}
            onClick={onCargo}
            className="mb-2 w-full"
          >
            {Icon.cargo()}
            {freeCart ? t.load : m.city.noCart}
          </Slab>
        )}
        {doors.length > 0 && (
          <div className={`grid gap-2 ${doors.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {doors.map((x) => (
              <Ghost key={x.label} coach={x.coach} onClick={x.on}>
                {x.label}
              </Ghost>
            ))}
          </div>
        )}
        {held.length > 0 && (
          <p className="mt-2 text-center text-xs text-gold">
            {fr.game.suppliers.held(held.map((s) => props.names.resource(s.resource)).join(", "))}
          </p>
        )}
      </section>
    </section>
  );
}
