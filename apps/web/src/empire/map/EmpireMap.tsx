import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { artSource } from "../../art/Illustration.js";
import { GoodsMark } from "../../art/goods.js";
import {
  MediterraneanGround,
  ROUTES,
  alongPath,
  pathOf,
  routeBetween,
  seatOf,
} from "../../art/mediterranean.js";
import { P } from "../../art/palette.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { EmpireOrbit } from "../Orbit.js";
import { regionName } from "../World.js";
import { bestQuote } from "../logic.js";
import type { EmpireAction, EmpirePayload, EmpireRegion } from "../types.js";
import {
  CHART,
  ORBIT_UNITS,
  type Target,
  arsenalAt,
  arsenalShown,
  centredOn,
  detailOf,
  farCamera,
  fogOf,
  nearScale,
  nearness,
} from "./logic.js";
import { useCamera } from "./useCamera.js";

const t = fr.empire;

export interface EmpireMapHandle {
  /** Up close on Venice's house, or back out to the map. */
  toggle(): void;
  /** Up close on Venice's house. */
  home(): void;
}

const nearOn = (v: Viewport) => centredOn(seatOf("veneto"), nearScale(v), v);

/**
 * The empire's map (the map at the centre of the game, step 1): the whole screen, on a phone as
 * on a computer, in planes that do not slide alike — the night far behind, the mists between,
 * the chart under the finger — so that the eye feels its depth. What the house has not reached
 * lies in the dark; up close on Venice, its house opens in orbit where it stands on the map.
 */
export const EmpireMap = forwardRef<
  EmpireMapHandle,
  {
    p: EmpirePayload;
    now: number;
    busy: boolean;
    act: (a: EmpireAction) => Promise<void>;
    onTarget: (target: Target) => void;
  }
>(function EmpireMap({ p, now, busy, act, onTarget }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const mist = useRef<HTMLDivElement>(null);
  const chart = useRef<SVGSVGElement>(null);
  const marks = useRef<HTMLDivElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const nearNow = useRef(false);
  const view = p.view;
  const casa = view?.house.casa ?? 1;
  const farOn = (v: Viewport) => farCamera(p, v);

  const paint = useCallback((cam: Camera, v: Viewport) => {
    const { s, tx, ty } = cam;
    // The planes of the depth: the night at a sixth of the move, the mists at half.
    if (back.current)
      back.current.style.transform = `translate3d(${tx * 0.15}px, ${ty * 0.15}px, 0)`;
    if (mist.current) mist.current.style.transform = `translate3d(${tx * 0.5}px, ${ty * 0.5}px, 0)`;
    const svg = chart.current;
    if (svg) {
      svg.style.width = `${CHART.w * s}px`;
      svg.style.height = `${CHART.h * s}px`;
      svg.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
    const k = nearness(s, v);
    for (const el of marks.current?.querySelectorAll<HTMLElement>("[data-at]") ?? []) {
      const [x, y] = (el.dataset.at ?? "0,0").split(",").map(Number) as [number, number];
      el.style.transform = `translate3d(${x * s + tx}px, ${y * s + ty}px, 0) translate(-50%, -50%)`;
      // Venice's own marker gives way to its house up close.
      if (el.dataset.home) el.style.opacity = String(1 - k);
    }
    const o = orbit.current;
    if (o) {
      const [x, y] = seatOf("veneto");
      o.style.width = `${ORBIT_UNITS * s}px`;
      o.style.transform = `translate3d(${x * s + tx}px, ${y * s + ty}px, 0) translate(-50%, -50%)`;
      o.style.opacity = String(k);
      o.style.pointerEvents = k > 0.6 ? "auto" : "none";
    }
    const isNear = detailOf(s, v) === "near";
    if (isNear !== nearNow.current) {
      nearNow.current = isNear;
      setNear(isNear);
    }
  }, []);

  // A new house starts up close on its own; an older one on the map.
  const camera = useCamera({
    root,
    initial: (v) => (casa <= 2 ? nearOn(v) : farOn(v)),
    onPaint: paint,
    onDoubleTap: () => camera.easeTo(nearNow.current ? farOn : nearOn),
  });
  useImperativeHandle(ref, () => ({
    toggle: () => camera.easeTo(nearNow.current ? farOn : nearOn),
    home: () => camera.easeTo(nearOn),
  }));
  // Every render puts the places where the camera says.
  useLayoutEffect(() => camera.repaint());

  if (!view) return null;
  const fog = fogOf(p);
  const shown = (code: string) => (fog[code] ?? "hidden") !== "hidden";
  const open = (code: string) => fog[code] === "open";
  const texture = artSource("world", "map")?.src;
  const [ax, ay] = arsenalAt();

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-[#08111F]"
      data-map="empire"
      data-near={near || undefined}
    >
      {/* The night, far behind: a glow over the lagoon and its scattered lights. */}
      <div ref={back} className="pointer-events-none absolute -inset-[40%]" aria-hidden="true">
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_45%_40%,#1B3558_0%,#0E1E36_45%,#070E1A_100%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
          <defs>
            <pattern id="night-lights" width="140" height="140" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="20" r="1" fill="#BFE3FF" opacity="0.5" />
              <circle cx="80" cy="44" r="0.7" fill="#F3D492" opacity="0.6" />
              <circle cx="46" cy="96" r="1.2" fill="#BFE3FF" opacity="0.35" />
              <circle cx="118" cy="120" r="0.8" fill="#BFE3FF" opacity="0.5" />
              <circle cx="104" cy="8" r="0.6" fill="#F3D492" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#night-lights)" />
        </svg>
      </div>

      {/* The chart, under the finger. */}
      <svg
        ref={chart}
        viewBox={`0 0 ${CHART.w} ${CHART.h}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        aria-hidden="true"
      >
        <MediterraneanGround texture={texture} />
        <defs>
          <radialGradient id="fog-hole">
            <stop offset="0%" stopColor="#000" />
            <stop offset="65%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id="fog-mask" maskUnits="userSpaceOnUse">
            <rect x="-50" y="-50" width={CHART.w + 100} height={CHART.h + 100} fill="#fff" />
            {view.regions
              .filter((r) => shown(r.code))
              .map((r) => {
                const [x, y] = seatOf(r.code);
                return (
                  <circle
                    key={r.code}
                    cx={x}
                    cy={y}
                    r={open(r.code) ? 62 : 30}
                    fill="url(#fog-hole)"
                    opacity={open(r.code) ? 1 : 0.75}
                  />
                );
              })}
          </mask>
        </defs>
        {/* What the house has not reached: the dark, its lands unknown. */}
        <g mask="url(#fog-mask)" data-fog-layer>
          <rect
            x="-50"
            y="-50"
            width={CHART.w + 100}
            height={CHART.h + 100}
            fill="#060C17"
            opacity="0.95"
          />
          {[
            [60, 250, 90],
            [300, 60, 110],
            [380, 260, 80],
            [210, 300, 70],
            [40, 90, 60],
          ].map(([x, y, r]) => (
            <ellipse
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              rx={r}
              ry={(r ?? 0) * 0.45}
              fill="#BFE3FF"
              opacity="0.035"
            />
          ))}
        </g>
        {ROUTES.filter((r) => shown(r.from) && shown(r.to)).map((r) => {
          const lit = open(r.from) && open(r.to);
          return (
            <path
              key={`${r.from}:${r.to}`}
              d={pathOf(routeBetween(r.from, r.to))}
              fill="none"
              stroke={r.sea ? P.info : P.cream}
              strokeOpacity={lit ? 0.75 : 0.3}
              strokeWidth={lit ? 2 : 1.4}
              strokeDasharray={r.sea ? "6 5" : "2 5"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {view.vehicles.voyages.map((v) => {
          const backAt =
            view.vehicles.mine.find((x) => x.id === v.vehicleId)?.busyUntil ?? v.arrivesAt;
          const left = 2 * v.arrivesAt - backAt;
          const k = (now - left) / Math.max(1, v.arrivesAt - left);
          const [x, y] = alongPath(routeBetween(v.from, v.to), k);
          return (
            <circle
              key={v.id}
              cx={x}
              cy={y}
              r="2.4"
              fill={P.lagoon}
              stroke={P.night}
              strokeWidth="0.8"
              data-convoy
            />
          );
        })}
      </svg>

      {/* The mists, between the chart and the eye, drifting slowly. */}
      <div ref={mist} className="pointer-events-none absolute -inset-[50%]" aria-hidden="true">
        <div className="mist-drift absolute left-[30%] top-[35%] h-[30%] w-[45%] rounded-full bg-[#BFE3FF] opacity-[0.05] blur-3xl" />
        <div className="mist-drift absolute left-[55%] top-[55%] h-[22%] w-[35%] rounded-full bg-[#7DB596] opacity-[0.05] blur-3xl [animation-delay:-14s]" />
      </div>

      {/* The places, the same size at every zoom. */}
      <div ref={marks} className="pointer-events-none absolute inset-0">
        {view.regions
          .filter((r) => shown(r.code))
          .map((r) => (
            <RegionMark
              key={r.code}
              p={p}
              r={r}
              open={open(r.code)}
              casa={casa}
              onClick={() =>
                r.code === "veneto" && !nearNow.current
                  ? camera.easeTo(nearOn)
                  : onTarget({ kind: "region", code: r.code })
              }
            />
          ))}
        {arsenalShown(p) && (
          <div data-at={`${ax},${ay}`} className="absolute left-0 top-0">
            <button
              type="button"
              onClick={() => onTarget({ kind: "arsenal" })}
              data-arsenal-mark
              className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-night-3 text-info ring-2 ring-info/70 shadow-md shadow-black/50 [&_svg]:h-5 [&_svg]:w-5">
                {Icon.anchor()}
              </span>
              <span className="map-name">{t.scene.arsenal}</span>
            </button>
          </div>
        )}
      </div>

      {/* Venice's house, opening where it stands as the map comes near. */}
      <div
        ref={orbit}
        className="absolute left-0 top-0 opacity-0"
        data-orbit-near={near || undefined}
      >
        {near && (
          <EmpireOrbit
            p={p}
            now={now}
            busy={busy}
            act={act}
            onWorkshop={(id) => onTarget({ kind: "workshop", id })}
            onCasa={() => onTarget({ kind: "casa" })}
            onFree={() => onTarget({ kind: "free" })}
          />
        )}
      </div>
    </div>
  );
});

/** A region on the map: its round mark, its name, or for one still unknown the Casa it asks. */
function RegionMark({
  p,
  r,
  open,
  casa,
  onClick,
}: {
  p: EmpirePayload;
  r: EmpireRegion;
  open: boolean;
  casa: number;
  onClick: () => void;
}) {
  const home = r.code === "veneto";
  const reachable = !open && casa >= r.casa;
  const best = open ? bestQuote(p, r.code) : null;
  const [x, y] = seatOf(r.code);
  return (
    <div data-at={`${x},${y}`} data-home={home || undefined} className="absolute left-0 top-0">
      <button
        type="button"
        onClick={onClick}
        data-region={r.code}
        data-look={home ? "home" : open ? "open" : reachable ? "reachable" : "closed"}
        aria-label={
          open || reachable ? regionName(r.code) : `${t.scene.unknown} : ${t.world.closed(r.casa)}`
        }
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        <span
          className={`flex items-center justify-center rounded-full font-display text-sm font-bold shadow-lg shadow-black/50 ${
            home
              ? "h-14 w-14 text-ink [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_50%,rgb(var(--gold-deep))_100%)]"
              : open
                ? "h-11 w-11 bg-night-3 text-cream ring-2 ring-lagoon"
                : reachable
                  ? "h-11 w-11 bg-night-3 text-gold ring-2 ring-gold"
                  : "h-10 w-10 bg-night-2/90 text-cream-dim ring-1 ring-line"
          }`}
        >
          {home ? (
            casa
          ) : best ? (
            <GoodsMark code={best} size={22} />
          ) : reachable ? (
            "+"
          ) : open ? (
            r.counter
          ) : (
            "?"
          )}
        </span>
        <span className="map-name">
          {home ? t.world.venice : open || reachable ? regionName(r.code) : t.world.closed(r.casa)}
        </span>
      </button>
    </div>
  );
}
