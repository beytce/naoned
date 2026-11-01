import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoodsMark } from "../../art/goods.js";
import { P } from "../../art/palette.js";
import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { regionName } from "../World.js";
import type { EmpirePayload } from "../types.js";
import {
  CHART,
  type MapPlace,
  bringsTo,
  hopSeconds,
  lastPlace,
  leaguesOf,
  nearestPlace,
  placeName,
  placePoint,
  vehiclePose,
} from "./logic.js";

const t = fr.empire.hops;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** A vehicle's orbit around the place it stands at, in chart units (after Hades' Star). */
const orbitOf = (place: string) => (place === "home" ? 6.2 : place.startsWith("city:") ? 4.6 : 4.2);

interface Drag {
  id: string;
  from: [number, number];
  at: [number, number];
  snap: MapPlace | null;
  cancel: boolean;
  client: [number, number];
}

interface Arrival {
  key: string;
  x: number;
  y: number;
  n: number;
  good: string;
}

/**
 * The house's vehicles on the map (after Hades' Star's ships, 1 November 2026): standing in orbit
 * around their counter or their city, gliding from place to place along a dotted line, turned to
 * their heading, the seconds left written on the way. A vehicle touched is chosen; dragged, a line
 * follows the finger and snaps to the nearest place (a gold ring and four chevrons), a dark label
 * telling where, how long, how far and what it would bring; let go there, it is sent; brought back
 * onto itself, « Annuler ». At a city it reaches, a ring spreads and what it brought rises.
 */
export function Fleet({
  p,
  now,
  base,
  selected,
  onSelect,
  onMove,
  onArrive,
  toChart,
  unitsPerPx,
}: {
  p: EmpirePayload;
  now: number;
  base: number;
  selected: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, place: string) => void;
  /** A hop arrived by the clock: the house's state to settle. */
  onArrive: () => void;
  toChart: (clientX: number, clientY: number) => [number, number];
  unitsPerPx: () => number;
}) {
  const view = p.view;
  const mine = view?.vehicles.mine ?? [];
  // The clock: the server's, smooth between its ticks while a vehicle has stops to come.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = now - Date.now();
  }, [now]);
  const live = mine.some((v) => v.legs.length > 0);
  const [frame, setFrame] = useState(now);
  useEffect(() => {
    if (!live) return;
    let f = 0;
    const step = () => {
      setFrame(Date.now() + skew.current);
      f = requestAnimationFrame(step);
    };
    f = requestAnimationFrame(step);
    return () => cancelAnimationFrame(f);
  }, [live]);
  const clock = live ? Math.max(frame, now - 1_000) : now;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const wasMoving = useRef(new Map<string, string>());
  const poses = mine.map((v) => ({ v, pose: vehiclePose(p, v, clock) }));

  // A hop ended by the clock at a city: its ring, what it brought, and the state settled.
  useEffect(() => {
    const before = wasMoving.current;
    const next = new Map<string, string>();
    let arrived = false;
    for (const { v, pose } of poses) {
      if (pose.hop) {
        next.set(v.id, v.legs.find((l) => l.departAt <= clock && l.arrivesAt > clock)?.to ?? "");
        continue;
      }
      const to = before.get(v.id);
      if (to === undefined) continue;
      arrived = true;
      if (!to.startsWith("city:")) continue;
      const brought = bringsTo(p, { ...v, legs: [], at: to }, to.slice(5));
      const n = brought.reduce((k, x) => k + x.n, 0);
      const at = placePoint(p, to);
      if (n > 0 && at) {
        const key = `${v.id}:${clock}`;
        setArrivals((xs) => [...xs, { key, x: at[0], y: at[1], n, good: brought[0]?.good ?? "" }]);
        window.setTimeout(() => setArrivals((xs) => xs.filter((x) => x.key !== key)), 1_800);
      }
    }
    wasMoving.current = next;
    if (arrived) onArrive();
  });

  if (!view) return null;
  // The standing vehicles of a place share its orbit.
  const slots = new Map<string, number>();
  const placed = poses.map(({ v, pose }) => {
    if (pose.hop || !pose.place) return { v, pose, x: pose.x, y: pose.y };
    const i = slots.get(pose.place) ?? 0;
    slots.set(pose.place, i + 1);
    const a = ((-55 + i * 38) * Math.PI) / 180;
    const r = orbitOf(pose.place);
    return { v, pose, x: pose.x + r * Math.cos(a), y: pose.y + r * Math.sin(a) };
  });

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    const v = mine.find((x) => x.id === id);
    const me = placed.find((x) => x.v.id === id);
    if (!v || !me) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    const fromPlace = lastPlace(v);
    const from: [number, number] =
      v.legs.length > 0 ? (placePoint(p, fromPlace) ?? [me.x, me.y]) : [me.x, me.y];
    let current: Drag | null = null;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      moved = true;
      const at = toChart(ev.clientX, ev.clientY);
      const k = unitsPerPx();
      const near = nearestPlace(p, at, 34 * k);
      const snap = near && near.place !== fromPlace ? near : null;
      const cancel = Math.hypot(at[0] - me.x, at[1] - me.y) < 22 * k;
      current = {
        id,
        from,
        at: snap && !cancel ? [snap.x, snap.y] : at,
        snap: cancel ? null : snap,
        cancel,
        client: [ev.clientX, ev.clientY],
      };
      setDrag(current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDrag(null);
      onSelect(id);
      const done = current as Drag | null;
      if (moved && done?.snap && !done.cancel) onMove(id, done.snap.place);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const chosen = placed.find((x) => x.v.id === selected);
  const dragV = drag ? mine.find((v) => v.id === drag.id) : undefined;
  return (
    <>
      {/* The ways: each vehicle's stops to come, dotted; the one chosen bright, its round faint. */}
      <svg
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={CHART.w * base}
        height={CHART.h * base}
        viewBox={`0 0 ${CHART.w} ${CHART.h}`}
        aria-hidden="true"
        data-ways
      >
        {chosen && (
          <circle
            cx={chosen.x}
            cy={chosen.y}
            r={11}
            fill={P.info}
            fillOpacity="0.06"
            stroke={P.info}
            strokeOpacity="0.28"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            data-chosen-halo
          />
        )}
        {placed.map(({ v, pose, x, y }) => {
          const legs = v.legs.filter((l) => l.arrivesAt > clock);
          if (legs.length === 0) return null;
          const pts: [number, number][] = [[x, y]];
          for (const l of legs) {
            const b = placePoint(p, l.to);
            if (b) pts.push(b);
          }
          const on = v.id === selected;
          return (
            <g key={v.id} data-way={v.id}>
              {pts.slice(1).map((b, i) => {
                const a = pts[i] ?? b;
                return (
                  <line
                    // biome-ignore lint/suspicious/noArrayIndexKey: a stop is its place in the way
                    key={i}
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    stroke={on ? P.info : P.cream}
                    strokeOpacity={(on ? 0.95 : 0.4) * (i === 0 ? 1 : 0.5)}
                    strokeWidth={on ? 1.8 : 1.2}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {pose.hop && <circle cx={pose.hop.to[0]} cy={pose.hop.to[1]} r={1.1} fill={P.info} />}
            </g>
          );
        })}
        {drag && (
          <g data-drag-line>
            <line
              x1={drag.from[0]}
              y1={drag.from[1]}
              x2={drag.at[0]}
              y2={drag.at[1]}
              stroke={drag.cancel ? P.vermilion : P.gold}
              strokeWidth="2"
              strokeDasharray="1 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {drag.snap && <Snap at={[drag.snap.x, drag.snap.y]} />}
          </g>
        )}
      </svg>

      {/* The seconds left, written in the middle of the way of each vehicle under way. */}
      {placed.map(({ v, pose, x, y }) => {
        const leg = pose.hop
          ? v.legs.find((l) => l.departAt <= clock && l.arrivesAt > clock)
          : v.legs.find((l) => l.departAt > clock);
        const b = leg ? placePoint(p, leg.to) : null;
        if (!leg || !b) return null;
        const secs = pose.hop
          ? Math.max(1, Math.ceil((leg.arrivesAt - clock) / 1_000))
          : Math.round((leg.arrivesAt - leg.departAt) / 1_000);
        return (
          <div
            key={`s${v.id}`}
            className="map-pin pointer-events-none"
            style={{ left: ((x + b[0]) / 2) * base, top: ((y + b[1]) / 2) * base }}
            data-way-seconds={v.id}
          >
            <span className="rounded bg-night/80 px-1 font-display text-[0.625rem] font-bold tabular-nums text-info">
              {t.seconds(secs)}
            </span>
          </div>
        );
      })}

      {/* The vehicles themselves, turned to their heading. */}
      {placed.map(({ v, pose, x, y }) => {
        const on = v.id === selected;
        return (
          <button
            key={v.id}
            type="button"
            data-vehicle={v.id}
            data-drag-handle
            data-moving={pose.hop ? "" : undefined}
            aria-label={fr.empire.vehicleNames[v.type] ?? v.type}
            aria-pressed={on}
            onPointerDown={startDrag(v.id)}
            className="map-place pointer-events-auto touch-none"
            style={{ left: x * base, top: y * base }}
          >
            {on && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.6rem] leading-none text-gold">
                ▼
              </span>
            )}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-night-3/90 shadow-md shadow-black/50 ${on ? "ring-2 ring-gold shadow-[0_0_14px_rgb(var(--gold)/0.7)]" : "ring-1 ring-lagoon/70"}`}
            >
              <span style={{ transform: `rotate(${pose.angle}rad)` }} className="flex">
                <Wagon loaded={v.loads.length > 0} />
              </span>
            </span>
          </button>
        );
      })}

      {/* What a vehicle brought, rising from the city it reached. */}
      {arrivals.map((a) => (
        <div
          key={a.key}
          className="map-pin pointer-events-none"
          style={{ left: a.x * base, top: a.y * base }}
          data-arrival
        >
          <span className="hop-ring absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-gold" />
          <span className="hop-rise flex items-center gap-1 whitespace-nowrap rounded-full bg-night/85 px-2 py-0.5 font-display text-xs font-bold text-gold">
            <GoodsMark code={a.good} size={14} />+{a.n}
          </span>
        </div>
      ))}

      {/* The dark label beside the finger: where, how long, how far, what it would bring. */}
      {drag &&
        dragV &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 max-w-[15rem] rounded-lg bg-night/95 px-3 py-2 text-xs text-cream shadow-xl shadow-black/60 ring-1 ring-line"
            style={{
              left: Math.min(window.innerWidth - 248, Math.max(8, drag.client[0] - 120)),
              top: Math.max(8, drag.client[1] - 110),
            }}
            data-drag-label
          >
            {drag.cancel ? (
              <p className="font-display font-bold uppercase tracking-wider text-vermilion">
                {t.cancel}
              </p>
            ) : drag.snap ? (
              <>
                <p className="font-display font-bold uppercase tracking-wider">
                  {t.to(placeName(p, drag.snap.place, regionName))}
                </p>
                <p className="text-cream-dim">
                  {t.seconds(hopSeconds(p, drag.from, [drag.snap.x, drag.snap.y]))} ·{" "}
                  {t.leagues(leaguesOf(drag.from, [drag.snap.x, drag.snap.y]))}
                </p>
                {drag.snap.kind === "city" &&
                  bringsTo(p, dragV, drag.snap.place.slice(5)).map((x) => (
                    <p key={x.good} className="flex items-center gap-1 text-gold">
                      <GoodsMark code={x.good} size={14} />
                      {t.brings(x.n, goodName(p, x.good), d(x.pay.toString()))}
                    </p>
                  ))}
              </>
            ) : (
              <p className="text-cream-dim">{t.aim}</p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** The place the drag snaps to: a gold ring and four chevrons around it. */
function Snap({ at }: { at: [number, number] }) {
  const [x, y] = at;
  const r = 5;
  return (
    <g data-snap>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={P.gold}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
      {[45, 135, 225, 315].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const cx = x + (r + 1.8) * Math.cos(a);
        const cy = y + (r + 1.8) * Math.sin(a);
        const k = 1.1;
        // A chevron pointing at the place.
        const p1 = [cx + k * Math.cos(a + 0.9), cy + k * Math.sin(a + 0.9)];
        const p2 = [cx - k * 0.6 * Math.cos(a), cy - k * 0.6 * Math.sin(a)];
        const p3 = [cx + k * Math.cos(a - 0.9), cy + k * Math.sin(a - 0.9)];
        return (
          <polyline
            key={deg}
            points={`${p1.join(",")} ${p2.join(",")} ${p3.join(",")}`}
            fill="none"
            stroke={P.gold}
            strokeWidth="1.6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

/** A wagon seen from above, its front to the east (turned with its heading). */
function Wagon({ loaded }: { loaded: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.5" width="3" height="2" rx="0.6" fill="#0B1626" />
      <rect x="5" y="17.5" width="3" height="2" rx="0.6" fill="#0B1626" />
      <rect x="13" y="4.5" width="3" height="2" rx="0.6" fill="#0B1626" />
      <rect x="13" y="17.5" width="3" height="2" rx="0.6" fill="#0B1626" />
      <rect x="3" y="6.5" width="15" height="11" rx="2" fill="#F6E8CC" />
      {loaded && <rect x="5" y="8.5" width="10" height="7" rx="1" fill="#C98E52" />}
      <path d="M18 8 L22 12 L18 16 Z" fill="#E8B24C" />
    </svg>
  );
}
