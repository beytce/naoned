import { cellsWithin } from "@comptoirs/engine";
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
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
  coverScale,
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

/** The chart is never drawn larger than this across (px): a phone's GPU keeps up with it. */
const MAX_RASTER = 4_096;

/**
 * The empire's map (the map at the centre of the game): the whole screen, on a phone as on a
 * computer, in planes that do not slide alike — the night far behind, the chart under the finger,
 * the mists between it and the places — so that the eye feels its depth. What the house has not
 * reached lies in the dark; up close on Venice, its house opens in orbit where it stands.
 *
 * Smooth (step 3): the chart is drawn once at a scale (`base`) and only moved and scaled by the
 * GPU during a gesture, then drawn again sharp when the camera rests; the places sit in one layer
 * moved with it, kept at their size by a counter-scale (`--inv`); one paint per frame.
 */
export const EmpireMap = forwardRef<
  EmpireMapHandle,
  {
    p: EmpirePayload;
    now: number;
    busy: boolean;
    act: (a: EmpireAction) => Promise<void>;
    onTarget: (target: Target | null) => void;
    /** Placing a counter or the Arsenal: the cells it may go on light up, a touch picks one. */
    placing?: Placing | null;
    picked?: string | null;
    onPick?: (cell: string) => void;
  }
>(function EmpireMap({ p, now, busy, act, onTarget, placing = null, picked = null, onPick }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const mist = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const pins = useRef<HTMLDivElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const nearNow = useRef(false);
  const view = p.view;
  const casa = view?.house.casa ?? 1;
  const farOn = (v: Viewport) => farCamera(p, v);
  // The scale the chart is drawn at; between two rests the GPU scales it.
  const [base, setBase] = useState(() => {
    const v = { w: window.innerWidth, h: window.innerHeight };
    return Math.min(MAX_RASTER / CHART.w, casa <= 2 ? nearScale(v) : coverScale(v) * 1.3);
  });
  const drawn = useRef(base);
  drawn.current = base;

  const paint = useCallback((cam: Camera, v: Viewport) => {
    const { s, tx, ty } = cam;
    const k = s / drawn.current;
    // The planes of the depth: the night at a sixth of the move, the mists at half.
    if (back.current)
      back.current.style.transform = `translate3d(${tx * 0.15}px, ${ty * 0.15}px, 0)`;
    if (mist.current) mist.current.style.transform = `translate3d(${tx * 0.5}px, ${ty * 0.5}px, 0)`;
    const moved = `translate3d(${tx}px, ${ty}px, 0) scale(${k})`;
    if (ground.current) ground.current.style.transform = moved;
    const near = nearness(s, v);
    const layer = pins.current;
    if (layer) {
      layer.style.transform = moved;
      // The places keep their size on screen; Venice's own mark gives way to its house.
      layer.style.setProperty("--inv", String(1 / k));
      layer.style.setProperty("--home", String(1 - near));
    }
    const o = orbit.current;
    if (o) {
      o.style.opacity = String(near);
      o.style.pointerEvents = near > 0.6 ? "auto" : "none";
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
    onTap: () => onTarget(null),
    // At rest: the chart drawn again at the camera's scale, when it has moved far from it.
    onRest: (cam) => {
      const want = Math.min(MAX_RASTER / CHART.w, cam.s);
      if (Math.abs(want / drawn.current - 1) > 0.12) setBase(want);
    },
  });
  useImperativeHandle(ref, () => ({
    toggle: () => camera.easeTo(nearNow.current ? farOn : nearOn),
    home: () => camera.easeTo(nearOn),
    far: () => camera.easeTo(farOn),
  }));
  // The places put on the chart at its scale, when they or the scale change (never per frame).
  useLayoutEffect(() => {
    for (const el of pins.current?.querySelectorAll<HTMLElement>("[data-at]") ?? []) {
      const [x = 0, y = 0] = (el.dataset.at ?? "0,0").split(",").map(Number);
      el.style.left = `${x * base}px`;
      el.style.top = `${y * base}px`;
    }
    camera.repaint();
  });

  const texture = artSource("world", "map")?.src;
  // The chart changes with the house's map and the placing, never with the clock.
  // biome-ignore lint/correctness/useExhaustiveDependencies: p stands for its view's map
  const chart = useMemo(
    () =>
      view ? (
        <Chart
          p={p}
          base={base}
          texture={texture}
          placing={placing}
          picked={picked}
          onPick={onPick}
        />
      ) : null,
    [view?.map, view?.regions, base, texture, placing, picked, onPick],
  );
  if (!view) return null;
  const map = view.map;
  const [vx, vy] = seatOf("veneto");

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

      {/* The chart, under the finger: drawn at `base`, moved and scaled by the GPU. */}
      <div
        ref={ground}
        className="map-layer pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: CHART.w * base, height: CHART.h * base }}
      >
        {chart}
      </div>

      {/* The mists, between the chart and the places, drifting slowly. */}
      <div ref={mist} className="pointer-events-none absolute -inset-[50%]" aria-hidden="true">
        <div className="mist-drift absolute left-[30%] top-[35%] h-[30%] w-[45%] [background:radial-gradient(closest-side,rgb(191_227_255/0.06),transparent)]" />
        <div className="mist-drift absolute left-[55%] top-[55%] h-[22%] w-[35%] [background:radial-gradient(closest-side,rgb(125_181_150/0.06),transparent)] [animation-delay:-14s]" />
      </div>

      {/* The places, moved with the chart, kept at their size on screen. */}
      <div
        ref={pins}
        className="map-layer pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: CHART.w * base, height: CHART.h * base }}
      >
        {/* Venice's house, opening where it stands as the map comes near (the map's own size). */}
        <div
          ref={orbit}
          className="absolute -translate-x-1/2 -translate-y-1/2 opacity-0"
          style={{ left: vx * base, top: vy * base, width: ORBIT_UNITS * base }}
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
        <Names p={p} />
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
            <div key={`p${x.cell}`} data-at={`${px},${py}`} className="map-pin" data-post={x.cell}>
              <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-night-3 text-gold ring-1 ring-gold/70 shadow-md shadow-black/50 [&_svg]:h-4 [&_svg]:w-4">
                {Icon.banner()}
              </span>
            </div>
          );
        })}
        {map.sites.map((x) => {
          const [px, py] = cellCentre(x.cell);
          return (
            <div key={`s${x.cell}`} data-at={`${px},${py}`} className="map-pin" data-site={x.cell}>
              <span className="whitespace-nowrap rounded-full bg-night-3 px-2 py-0.5 font-display text-[0.6875rem] font-bold tabular-nums text-info ring-1 ring-info/70">
                {clock(x.endsAt - now)}
              </span>
            </div>
          );
        })}
        {/* The convoys on their way: a point along their road, gliding from second to second. */}
        {view.vehicles.voyages.map((v) => {
          const backAt =
            view.vehicles.mine.find((x) => x.id === v.vehicleId)?.busyUntil ?? v.arrivesAt;
          const left = 2 * v.arrivesAt - backAt;
          const k = (now - left) / Math.max(1, v.arrivesAt - left);
          const [x, y] = alongPath(routeBetween(v.from, v.to), k);
          return (
            <span
              key={v.id}
              data-convoy
              className="absolute left-0 top-0 h-3 w-3 rounded-full bg-lagoon ring-2 ring-night transition-transform duration-1000 ease-linear"
              style={{ transform: `translate(${x * base - 6}px, ${y * base - 6}px)` }}
            />
          );
        })}
        {map.arsenal &&
          (() => {
            const [px, py] = cellCentre(map.arsenal);
            return (
              <div data-at={`${px},${py}`} className="map-pin">
                <button
                  type="button"
                  onClick={() => onTarget({ kind: "arsenal" })}
                  data-arsenal-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-info ring-2 ring-info/70 shadow-md shadow-black/50 [&_svg]:h-5 [&_svg]:w-5">
                    {Icon.anchor()}
                  </span>
                  <span className="map-name">{t.scene.arsenal}</span>
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
});

/**
 * The chart itself, drawn at `base` (chart units × base = px): the ground, the dark over what is
 * not seen, the land cells seen, the roads, and while placing the cells lit. Memoized: it changes
 * with the house's map, not with the clock.
 */
const Chart = memo(function Chart({
  p,
  base,
  texture,
  placing,
  picked,
  onPick,
}: {
  p: EmpirePayload;
  base: number;
  texture?: string;
  placing: Placing | null;
  picked: string | null;
  onPick?: (cell: string) => void;
}) {
  const view = p.view;
  if (!view) return null;
  const map = view.map;
  const seen = new Set(map.revealed);
  const lands = Object.entries(map.cells);
  const allowed = placing ? placeable(p, placing) : null;
  const preview = picked && placing?.kind === "post" ? cellsWithin(picked, map.radius) : [];
  const seatSeen = (code: string) => seen.has(seatCellOf(p, code));
  return (
    <svg
      viewBox={`0 0 ${CHART.w} ${CHART.h}`}
      width={CHART.w * base}
      height={CHART.h * base}
      className="block"
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
      <rect
        x="-50"
        y="-50"
        width={CHART.w + 100}
        height={CHART.h + 100}
        fill="#060C17"
        opacity="0.94"
        mask="url(#fog-mask)"
        data-fog-layer
      />
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
          {allowed.map((cell) => (
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
  );
});

/** Each region named once, over the middle of its cells seen, the same size at every zoom. */
function Names({ p }: { p: EmpirePayload }) {
  const lands = Object.entries(p.view?.map.cells ?? {});
  const byRegion = lands.reduce<Record<string, [number, number][]>>((acc, [cell, c]) => {
    const list = acc[c.region] ?? [];
    list.push(cellCentre(cell));
    acc[c.region] = list;
    return acc;
  }, {});
  return (
    <>
      {Object.entries(byRegion)
        .filter(([region]) => region !== "veneto")
        .map(([region, pts]) => {
          const x = pts.reduce((n, q) => n + q[0], 0) / pts.length;
          const y = pts.reduce((n, q) => n + q[1], 0) / pts.length - 9;
          return (
            <div key={region} data-at={`${x},${y}`} className="map-pin" aria-hidden="true">
              <span className="whitespace-nowrap font-place text-xs font-bold uppercase tracking-[0.2em] text-[#BFE3FF]/50">
                {regionName(region)}
              </span>
            </div>
          );
        })}
    </>
  );
}

/** The seat of a region on the map: its first city's cell, Venice for Venetia. */
function seatCellOf(p: EmpirePayload, region: string): string {
  return p.view?.map.cities.find((c) => c.region === region)?.cell ?? "";
}

/** Venice on the map: the house's gold sun, its Casa written in it. */
function HomeMark({ p, onClick }: { p: EmpirePayload; onClick: () => void }) {
  const [x, y] = seatOf("veneto");
  return (
    <div data-at={`${x},${y}`} data-home className="map-pin map-home">
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
  // Within Venice's orbit, a city gives way to the house as it opens.
  const [vx, vy] = seatOf("veneto");
  const inOrbit = Math.hypot(x - vx, y - vy) < ORBIT_UNITS / 2;
  return (
    <div data-at={`${x},${y}`} className={`map-pin ${inOrbit ? "map-home" : ""}`}>
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
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-night-3 font-display text-xs font-bold shadow-lg shadow-black/50 ${open ? "text-cream ring-2 ring-lagoon" : "text-gold ring-2 ring-gold"}`}
        >
          {best ? <GoodsMark code={best} size={18} /> : open ? "•" : "+"}
        </span>
        <span className="map-name">{t.cityNames[code] ?? code}</span>
      </button>
    </div>
  );
}
