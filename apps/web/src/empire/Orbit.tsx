import { GoodsMark, goodsColour } from "../art/goods.js";
import { fr } from "../i18n.js";
import { lotProgress, readyLots, recipeOf } from "./logic.js";
import type { EmpirePayload, EmpireWorkshop } from "./types.js";

const ORBIT = 34;

/**
 * The house up close (Direction Lagune: a place is a star one comes near): the Casa, a gold sun
 * with its level, its workshops in orbit, each the mark of what it makes, the arc of its lot
 * under way, lagoon with the lots ready; a dotted ring for a free place, the plot to build on.
 */
export function EmpireOrbit({
  p,
  now,
  onWorkshop,
  onCasa,
  onFree,
}: {
  p: EmpirePayload;
  now: number;
  onWorkshop: (id: string) => void;
  onCasa: () => void;
  onFree: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const t = fr.empire;
  const workshops = view.house.workshops;
  const pending = view.house.builds.filter((b) => b.kind === "newWorkshop").length;
  const free = Math.max(0, view.workshopSlots - workshops.length - pending);
  const places = workshops.length + pending + (free > 0 ? 1 : 0);
  const at = (i: number) => {
    const a = ((-90 + (360 / Math.max(1, places)) * i) * Math.PI) / 180;
    return { x: 50 + ORBIT * Math.cos(a), y: 50 + ORBIT * Math.sin(a) };
  };
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={ORBIT}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth="0.4"
          strokeDasharray="1 1.5"
        />
        {workshops.map((ws, i) => {
          const r = recipeOf(p, ws);
          const into = workshops.findIndex(
            (o) =>
              o !== ws &&
              Object.keys(recipeOf(p, o)?.inputs ?? {}).some((g) => g in (r?.outputs ?? {})),
          );
          if (into < 0) return null;
          const a = at(i);
          const b = at(into);
          const good = Object.keys(r?.outputs ?? {})[0] ?? "";
          return (
            <line
              key={ws.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={goodsColour(good)}
              strokeWidth="0.5"
              opacity="0.45"
            />
          );
        })}
        {/* The neighbourhoods: two workshops side by side whose chain follows, a gold link. */}
        {workshops.map((ws, i) => {
          const o = workshops[(i + 1) % workshops.length];
          if (!o || o === ws || (i + 1 === workshops.length && workshops.length < 3)) return null;
          if ((o.region ?? "veneto") !== (ws.region ?? "veneto")) return null;
          const feeds = (x: EmpireWorkshop, y: EmpireWorkshop) =>
            Object.keys(recipeOf(p, y)?.inputs ?? {}).some(
              (g) => g in (recipeOf(p, x)?.outputs ?? {}),
            );
          if (!feeds(ws, o) && !feeds(o, ws)) return null;
          const a = at(i);
          const b = at((i + 1) % workshops.length);
          return (
            <line
              key={`n:${ws.id}`}
              data-neighbours={`${ws.id}:${o.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgb(var(--gold))"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <button
        type="button"
        onClick={onCasa}
        aria-label={t.hud.casa(view.house.casa)}
        className="absolute left-1/2 top-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gold text-ink shadow-[0_0_40px_rgba(230,180,80,0.35)] transition active:scale-95"
      >
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em]">Casa</span>
        <span className="font-display text-3xl font-extrabold leading-none">{view.house.casa}</span>
      </button>
      {workshops.map((ws, i) => (
        <Star key={ws.id} p={p} ws={ws} now={now} {...at(i)} onClick={() => onWorkshop(ws.id)} />
      ))}
      {view.house.builds
        .filter((b) => b.kind === "newWorkshop")
        .map((b, i) => {
          const { x, y } = at(workshops.length + i);
          return (
            <span
              key={b.workshopId}
              className="absolute flex h-[17%] w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-night-3 opacity-70 ring-1 ring-line"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <GoodsMark
                code={
                  Object.keys(
                    recipeOf(p, { type: b.workshopType ?? "", recipe: b.recipe ?? "" })?.outputs ??
                      {},
                  )[0] ?? ""
                }
                size={22}
              />
            </span>
          );
        })}
      {free > 0 &&
        (() => {
          const { x, y } = at(workshops.length + pending);
          return (
            <button
              type="button"
              onClick={onFree}
              aria-label={t.workshop.newTitle}
              className="absolute flex h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-cream-dim text-xl text-cream-dim transition active:scale-95"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              +
            </button>
          );
        })()}
    </div>
  );
}

function Star({
  p,
  ws,
  now,
  x,
  y,
  onClick,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  now: number;
  x: number;
  y: number;
  onClick: () => void;
}) {
  const good = Object.keys(recipeOf(p, ws)?.outputs ?? {})[0] ?? "";
  const ready = readyLots(ws, now);
  const progress = lotProgress(ws, now);
  const building = p.view?.house.builds.some((b) => b.workshopId === ws.id);
  const arc = 2 * Math.PI * 46;
  return (
    <button
      type="button"
      onClick={onClick}
      data-workshop={ws.id}
      aria-label={`${p.catalog.find((b) => b.type === ws.type)?.name ?? ws.type}, ${fr.empire.workshop.level(ws.level)}`}
      className={`absolute flex h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95 ${ready > 0 ? "bg-lagoon/25 ring-2 ring-lagoon" : "bg-night-3 ring-1 ring-line"}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        {progress > 0 && (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgb(var(--gold))"
            strokeWidth="5"
            strokeDasharray={`${arc * progress} ${arc}`}
          />
        )}
        {!ws.job && (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgb(var(--cream-dim))"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
        )}
      </svg>
      <GoodsMark code={good} size={26} />
      <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-night-4 px-1 font-display text-[0.6875rem] font-bold text-cream ring-2 ring-night">
        {ws.level}
      </span>
      {ready > 0 && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-lagoon px-1.5 font-display text-[0.6875rem] font-bold text-on-lagoon">
          +{ready}
        </span>
      )}
      {building && (
        <span className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-gold ring-2 ring-night" />
      )}
    </button>
  );
}
