import { useState } from "react";
import { GoodsMark, goodsColour } from "../art/goods.js";
import { Place, SunCorona } from "../game/map/Orbit.js";
import { fr } from "../i18n.js";
import { clock } from "../ui.js";
import { buildingName, recipeOf, workshopStatus } from "./logic.js";
import type { EmpireAction, EmpirePayload, EmpireWorkshop } from "./types.js";

const ORBIT = 36;
const RING = 30;
const RING_C = 2 * Math.PI * RING;
const t = () => fr.empire.orbit;

/**
 * The house up close (lot B of the UX audit, on the monthly game's orbit): the Casa a gold sun
 * whose corona grows with the income, its workshops in orbit, each with its name, its level, the
 * arc of its lot and what it waits for; a ready one is collected at the touch. A free place reads
 * « Bâtir », a site its timer; the chains run in dotted links, a neighbourhood that pays in gold.
 */
export function EmpireOrbit({
  p,
  now,
  busy,
  act,
  onWorkshop,
  onCasa,
  onFree,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onWorkshop: (id: string) => void;
  onCasa: () => void;
  onFree: () => void;
}) {
  const view = p.view;
  const [hop, setHop] = useState(0);
  if (!view) return null;
  const workshops = view.house.workshops.filter((w) => (w.region ?? "veneto") === "veneto");
  const sites = view.house.builds.filter(
    (b) => b.kind === "newWorkshop" && (b.region ?? "veneto") === "veneto",
  );
  const free = Math.max(0, view.workshopSlots - workshops.length - sites.length);
  const places = workshops.length + sites.length + (free > 0 ? 1 : 0);
  const at = (i: number) => {
    const a = ((-90 + (360 / Math.max(1, places)) * i) * Math.PI) / 180;
    return { x: 50 + ORBIT * Math.cos(a), y: 50 + ORBIT * Math.sin(a) };
  };
  const stars = workshops.map((ws, i) => ({ ws, ...at(i) }));
  const links: { from: (typeof stars)[number]; to: (typeof stars)[number]; colour: string }[] = [];
  for (const from of stars) {
    const out = Object.keys(recipeOf(p, from.ws)?.outputs ?? {});
    for (const to of stars) {
      if (to === from) continue;
      const input = Object.keys(recipeOf(p, to.ws)?.inputs ?? {}).find((g) => out.includes(g));
      if (input) links.push({ from, to, colour: goodsColour(input) });
    }
  }
  const neighbour = (ws: EmpireWorkshop) => (view.workshopPlaces[ws.id]?.neighbourBps ?? 0) > 0;
  const casaSite = view.house.builds.find((b) => b.kind === "casa");
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[24rem] [container-type:inline-size]"
      data-orbit-empire
    >
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
        <SunCorona perHour={BigInt(view.incomePerDay) / 24n} />
        <g className="orbit-links">
          {stars.map((s) => (
            <line
              key={s.ws.id}
              x1="50"
              y1="50"
              x2={s.x}
              y2={s.y}
              stroke="rgb(var(--line))"
              strokeOpacity="0.6"
              strokeWidth="0.3"
            />
          ))}
          {links.map((l) => {
            const gold = neighbour(l.from.ws) && neighbour(l.to.ws);
            return (
              <path
                key={`${l.from.ws.id}>${l.to.ws.id}`}
                d={`M${l.from.x} ${l.from.y} Q ${50 + (l.from.x + l.to.x - 100) * 0.75} ${50 + (l.from.y + l.to.y - 100) * 0.75} ${l.to.x} ${l.to.y}`}
                fill="none"
                stroke={gold ? "rgb(var(--gold))" : l.colour}
                strokeOpacity={gold ? 0.9 : 0.7}
                strokeWidth={gold ? 0.9 : 0.6}
                strokeDasharray="1.2 1.4"
                className="orbit-flow"
              />
            );
          })}
        </g>
      </svg>
      <button
        type="button"
        onClick={onCasa}
        aria-label={fr.empire.hud.casa(view.house.casa)}
        data-casa-sun
        className="sun-breathe absolute left-1/2 top-1/2 flex h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-ink shadow-[0_0_48px_rgb(var(--gold)/0.45),inset_-6px_-8px_14px_rgb(0_0_0/0.35)] transition [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_45%,rgb(var(--gold-deep))_80%,#5A3D12_100%)] active:scale-95"
      >
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em]">Casa</span>
        <span className="font-display text-3xl font-extrabold leading-none">{view.house.casa}</span>
        {casaSite && (
          <span className="mt-0.5 font-display text-[0.6875rem] font-bold tabular-nums">
            {clock(casaSite.endsAt - now)}
          </span>
        )}
      </button>
      {stars.map((s, i) => (
        <Star
          key={s.ws.id}
          p={p}
          ws={s.ws}
          x={s.x}
          y={s.y}
          rank={i}
          now={now}
          hop={hop}
          busy={busy}
          onCollect={() => {
            setHop((n) => n + 1);
            void act({ type: "empireRelaunch", workshopId: s.ws.id });
          }}
          onOpen={() => onWorkshop(s.ws.id)}
        />
      ))}
      {sites.map((b, i) => {
        const { x, y } = at(workshops.length + i);
        const good = Object.keys(
          recipeOf(p, { type: b.workshopType ?? "", recipe: b.recipe ?? "" })?.outputs ?? {},
        )[0];
        return (
          <Place key={b.workshopId ?? i} x={x} y={y} rank={stars.length + i}>
            <span className="flex w-24 flex-col items-center gap-0.5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gold/60 bg-night-2/60 opacity-80">
                {good && <GoodsMark code={good} size={28} />}
              </span>
              <span className="max-w-full truncate text-[0.8125rem] font-bold text-cream">
                {buildingName(p, b.workshopType ?? "")}
              </span>
              <span className="text-xs tabular-nums text-gold">{clock(b.endsAt - now)}</span>
            </span>
          </Place>
        );
      })}
      {free > 0 &&
        (() => {
          const { x, y } = at(workshops.length + sites.length);
          return (
            <Place x={x} y={y} rank={places}>
              <button
                type="button"
                onClick={onFree}
                aria-label={fr.empire.workshop.newTitle}
                className="flex flex-col items-center gap-1 transition active:scale-95"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-info/50 text-2xl text-info">
                  +
                </span>
                <span className="text-xs font-semibold text-info">{t().build}</span>
              </button>
            </Place>
          );
        })()}
    </div>
  );
}

function Star({
  p,
  ws,
  x,
  y,
  rank,
  now,
  hop,
  busy,
  onCollect,
  onOpen,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  x: number;
  y: number;
  rank: number;
  now: number;
  hop: number;
  busy: boolean;
  onCollect: () => void;
  onOpen: () => void;
}) {
  const s = workshopStatus(p, ws, now);
  const good = Object.keys(recipeOf(p, ws)?.outputs ?? {})[0] ?? "";
  const name = buildingName(p, ws.type);
  const line =
    s.state === "ready"
      ? t().ready
      : s.state === "running"
        ? clock(s.left)
        : s.state === "idle"
          ? t().idle
          : t().waits(fr.themeNames.resource[s.resource] ?? p.goods[s.resource] ?? s.resource);
  const waiting = s.state === "idle" || s.state === "blocked";
  const building = p.view?.house.builds.some((b) => b.workshopId === ws.id);
  return (
    <Place x={x} y={y} rank={rank}>
      <button
        type="button"
        data-workshop={ws.id}
        aria-label={`${name} · ${line}`}
        disabled={busy && s.state === "ready"}
        onClick={s.state === "ready" ? onCollect : onOpen}
        className="flex w-28 flex-col items-center gap-0.5 transition active:scale-95"
      >
        <span className="relative flex h-16 w-16 items-center justify-center">
          {s.state === "ready" && <span className="marker-halo absolute -inset-3 rounded-full" />}
          <svg viewBox="-34 -34 68 68" className="absolute inset-0 -rotate-90" aria-hidden="true">
            {waiting ? (
              <circle
                r={RING}
                fill="none"
                stroke={s.state === "idle" ? "rgb(var(--cream) / 0.6)" : "rgb(var(--muted))"}
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            ) : (
              <>
                <circle r={RING} fill="none" stroke="rgb(var(--info) / 0.2)" strokeWidth="4" />
                <circle
                  r={RING}
                  fill="none"
                  stroke={s.state === "ready" ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                  strokeDasharray={`${(RING_C * (s.state === "ready" ? 1 : Math.max(0.03, Math.min(1, s.progress)))).toFixed(1)} ${RING_C.toFixed(1)}`}
                />
              </>
            )}
          </svg>
          <span
            key={hop}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-night-2 ring-1 ring-line ${hop > 0 && s.state === "ready" ? "star-hop" : ""}`}
            style={{ animationDelay: `${rank * 70}ms` }}
          >
            <span data-goods-from={good} className="flex">
              <GoodsMark code={good} size={30} />
            </span>
          </span>
          {s.state === "ready" && (
            <span className="absolute -right-4 -top-2 rounded-full bg-lagoon px-2 py-0.5 font-display text-xs font-extrabold text-on-lagoon">
              +{s.quantity}
            </span>
          )}
          {building && (
            <span className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-gold ring-2 ring-night" />
          )}
        </span>
        <span className="line-clamp-2 max-w-full text-center text-[0.8125rem] font-bold leading-tight text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {name}
        </span>
        <span
          className={`max-w-full truncate text-xs tabular-nums ${s.state === "ready" ? "text-lagoon" : "text-cream-dim"}`}
        >
          {t().level(ws.level)} · {line}
        </span>
      </button>
    </Place>
  );
}
