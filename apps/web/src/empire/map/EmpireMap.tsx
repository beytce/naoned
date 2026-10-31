import { cellsWithin } from "@comptoirs/engine";
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
import { cellCentre, hexPath } from "../../art/hexmap.js";
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
import { clock } from "../../ui.js";
import { EmpireOrbit } from "../Orbit.js";
import { regionName } from "../World.js";
import { bestQuote } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import {
  CHART,
  ORBIT_UNITS,
  type Placing,
  type Target,
  centredOn,
  detailOf,
  farCamera,
  nearScale,
  nearness,
  placeable,
} from "./logic.js";
import { useCamera } from "./useCamera.js";

const t = fr.empire;

export interface EmpireMapHandle {
  /** Up close on Venice's house, or back out to the map. */
  toggle(): void;
  /** Up close on Venice's house. */
  home(): void;
  /** Out to the map. */
  far(): void;
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
    /** Placing a counter or the Arsenal: the cells it may go on light up, a touch picks one. */
    placing?: Placing | null;
    picked?: string | null;
    onPick?: (cell: string) => void;
  }
>(function EmpireMap({ p, now, busy, act, onTarget, placing = null, picked = null, onPick }, ref) {
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
    far: () => camera.easeTo(farOn),
  }));
  // Every render puts the places where the camera says.
  useLayoutEffect(() => camera.repaint());

  if (!view) return null;
  const map = view.map;
  const seen = new Set(map.revealed);
  const texture = artSource("world", "map")?.src;
  const lands = Object.entries(map.cells);
  const allowed = placing ? new Set(placeable(p, placing)) : null;
  const preview = picked && placing?.kind === "post" ? cellsWithin(picked, map.radius) : [];
  // Each region named once, over the middle of its cells seen.
  const names = Object.entries(
    lands.reduce<Record<string, [number, number][]>>((acc, [cell, c]) => {
      const list = acc[c.region] ?? [];
      list.push(cellCentre(cell));
      acc[c.region] = list;
      return acc;
    }, {}),
  ).map(([region, pts]) => ({
    region,
    x: pts.reduce((n, q) => n + q[0], 0) / pts.length,
    y: pts.reduce((n, q) => n + q[1], 0) / pts.length,
  }));
  const seatSeen = (code: string) => seen.has(seatCellOf(p, code));

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-[#08111F]"
      data-map="empire"
      data-near={near || undefined}
      data-placing={placing?.kind}
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
          {/* The dark, all but the cells the house sees. */}
          <mask id="fog-mask" maskUnits="userSpaceOnUse">
            <rect x="-50" y="-50" width={CHART.w + 100} height={CHART.h + 100} fill="#fff" />
            {map.revealed.map((cell) => (
              <path key={cell} d={hexPath(cell, -0.6)} fill="#000" />
            ))}
          </mask>
        </defs>
        <g mask="url(#fog-mask)" data-fog-layer>
          <rect
            x="-50"
            y="-50"
            width={CHART.w + 100}
            height={CHART.h + 100}
            fill="#060C17"
            opacity="0.94"
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
        {/* The land cells seen, in the faint grid of the chart. */}
        <g data-cells>
          {lands.map(([cell]) => (
            <path
              key={cell}
              d={hexPath(cell, 0.4)}
              fill="#BFE3FF"
              fillOpacity="0.04"
              stroke="#BFE3FF"
              strokeOpacity="0.16"
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <g
          fill="#BFE3FF"
          fillOpacity="0.4"
          fontFamily="Cinzel, serif"
          fontSize="6"
          letterSpacing="1.5"
          textAnchor="middle"
        >
          {names
            .filter((n) => n.region !== "veneto")
            .map((n) => (
              <text key={n.region} x={n.x} y={n.y - 8}>
                {regionName(n.region).toUpperCase()}
              </text>
            ))}
        </g>
        {ROUTES.filter((r) => seatSeen(r.from) && seatSeen(r.to)).map((r) => {
          const lit =
            (view.regions.find((x) => x.code === r.from)?.counter ?? 0) > 0 &&
            (view.regions.find((x) => x.code === r.to)?.counter ?? 0) > 0;
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
        {/* Placing: the cells it may go on, lit; the one picked, and what it would reveal. */}
        {allowed && (
          <g data-placing-cells>
            {preview.map((cell) => (
              <path
                key={`r${cell}`}
                d={hexPath(cell, 0.8)}
                fill={P.gold}
                fillOpacity="0.08"
                stroke={P.gold}
                strokeOpacity="0.5"
                strokeDasharray="2 2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {[...allowed].map((cell) => (
              <path
                key={cell}
                d={hexPath(cell, 1)}
                fill={cell === picked ? P.gold : P.info}
                fillOpacity={cell === picked ? 0.35 : 0.14}
                stroke={cell === picked ? P.gold : P.info}
                strokeWidth={cell === picked ? 2.4 : 1.4}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "all", cursor: "pointer" }}
                data-cell={cell}
                onClick={() => onPick?.(cell)}
                onKeyDown={(e) => e.key === "Enter" && onPick?.(cell)}
              />
            ))}
          </g>
        )}
      </svg>

      {/* The mists, between the chart and the eye, drifting slowly. */}
      <div ref={mist} className="pointer-events-none absolute -inset-[50%]" aria-hidden="true">
        <div className="mist-drift absolute left-[30%] top-[35%] h-[30%] w-[45%] rounded-full bg-[#BFE3FF] opacity-[0.05] blur-3xl" />
        <div className="mist-drift absolute left-[55%] top-[55%] h-[22%] w-[35%] rounded-full bg-[#7DB596] opacity-[0.05] blur-3xl [animation-delay:-14s]" />
      </div>

      {/* The places, the same size at every zoom. */}
      <div ref={marks} className="pointer-events-none absolute inset-0">
        <HomeMark
          p={p}
          onClick={() =>
            nearNow.current ? onTarget({ kind: "region", code: "veneto" }) : camera.easeTo(nearOn)
          }
        />
        {map.cities
          .filter((c) => c.code !== "venezia")
          .map((c) => (
            <CityMark
              key={c.code}
              p={p}
              code={c.code}
              cell={c.cell}
              region={c.region}
              onClick={() => onTarget({ kind: "city", code: c.code })}
            />
          ))}
        {map.posts.map((x) => {
          const [px, py] = cellCentre(x.cell);
          return (
            <div
              key={`p${x.cell}`}
              data-at={`${px},${py}`}
              className="absolute left-0 top-0"
              data-post={x.cell}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-night-3 text-gold ring-1 ring-gold/70 shadow-md shadow-black/50 [&_svg]:h-3 [&_svg]:w-3">
                {Icon.banner()}
              </span>
            </div>
          );
        })}
        {map.sites.map((x) => {
          const [px, py] = cellCentre(x.cell);
          return (
            <div
              key={`s${x.cell}`}
              data-at={`${px},${py}`}
              className="absolute left-0 top-0"
              data-site={x.cell}
            >
              <span className="whitespace-nowrap rounded-full bg-night-3/90 px-1.5 py-0.5 font-display text-[0.625rem] font-bold tabular-nums text-info ring-1 ring-info/70">
                {clock(x.endsAt - now)}
              </span>
            </div>
          );
        })}
        {map.arsenal &&
          (() => {
            const [px, py] = cellCentre(map.arsenal);
            return (
              <div data-at={`${px},${py}`} className="absolute left-0 top-0">
                <button
                  type="button"
                  onClick={() => onTarget({ kind: "arsenal" })}
                  data-arsenal-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-night-3 text-info ring-2 ring-info/70 shadow-md shadow-black/50 [&_svg]:h-5 [&_svg]:w-5">
                    {Icon.anchor()}
                  </span>
                  <span className="map-name">{t.scene.arsenal}</span>
                </button>
              </div>
            );
          })()}
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

/** The seat of a region on the map: its first city's cell, Venice for Venetia. */
function seatCellOf(p: EmpirePayload, region: string): string {
  return p.view?.map.cities.find((c) => c.region === region)?.cell ?? "";
}

/** Venice on the map: the house's gold sun, its Casa written in it. */
function HomeMark({ p, onClick }: { p: EmpirePayload; onClick: () => void }) {
  const [x, y] = seatOf("veneto");
  return (
    <div data-at={`${x},${y}`} data-home className="absolute left-0 top-0">
      <button
        type="button"
        onClick={onClick}
        data-region="veneto"
        aria-label={t.world.venice}
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full font-display text-sm font-bold text-ink shadow-lg shadow-black/50 [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_50%,rgb(var(--gold-deep))_100%)]">
          {p.view?.house.casa ?? 1}
        </span>
        <span className="map-name">{t.world.venice}</span>
      </button>
    </div>
  );
}

/**
 * A city found on the map: its mark (the best paid good of its region where the house trades,
 * else a plain dot), its name; a region's not open yet in gold, the counter to put down there.
 */
function CityMark({
  p,
  code,
  cell,
  region,
  onClick,
}: {
  p: EmpirePayload;
  code: string;
  cell: string;
  region: string;
  onClick: () => void;
}) {
  const r = p.view?.regions.find((x) => x.code === region);
  const open = (r?.counter ?? 0) > 0;
  const best = open ? bestQuote(p, region) : null;
  const [x, y] = cellCentre(cell);
  return (
    <div data-at={`${x},${y}`} className="absolute left-0 top-0">
      <button
        type="button"
        onClick={onClick}
        data-city={code}
        data-city-region={region}
        data-look={open ? "open" : "reachable"}
        aria-label={t.cityNames[code] ?? code}
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-night-3 font-display text-xs font-bold shadow-lg shadow-black/50 ${open ? "text-cream ring-2 ring-lagoon" : "text-gold ring-2 ring-gold"}`}
        >
          {best ? <GoodsMark code={best} size={18} /> : open ? "•" : "+"}
        </span>
        <span className="map-name">{t.cityNames[code] ?? code}</span>
      </button>
    </div>
  );
}
