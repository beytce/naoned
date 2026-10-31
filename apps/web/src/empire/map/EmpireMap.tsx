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
import { CITY_SPOTS } from "../../art/citySpots.js";
import { GoodsMark } from "../../art/goods.js";
import { HEX_SIZE, cellCentre, hexPath, neighbours } from "../../art/hexmap.js";
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
  farCamera,
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

/** A sector across the screen, as the example's systems (step 4): Venice's, at the start. */
const sectorOn = (v: Viewport) =>
  centredOn(
    seatOf("veneto"),
    Math.min((v.w * 0.95) / (Math.sqrt(3) * HEX_SIZE), (v.h * 0.62) / (2 * HEX_SIZE)),
    v,
  );
/** Up close on a counter, its workshops in orbit around it. */
const orbitOn = (at: [number, number]) => (v: Viewport) =>
  centredOn(at, (Math.min(v.w, v.h) * 0.86) / ORBIT_UNITS, v);

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
  // The counter whose workshops are deployed around it, opened at its touch (never by a zoom).
  const [opened, setOpened] = useState<string | null>(null);
  const openedNow = useRef<string | null>(null);
  openedNow.current = opened;
  const view = p.view;
  const casa = view?.house.casa ?? 1;
  const farOn = (v: Viewport) => farCamera(p, v);
  // The scale the chart is drawn at; between two rests the GPU scales it.
  const [base, setBase] = useState(() => {
    const v = { w: window.innerWidth, h: window.innerHeight };
    return Math.min(MAX_RASTER / CHART.w, sectorOn(v).s);
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
    const layer = pins.current;
    if (layer) {
      layer.style.transform = moved;
      // The places keep their size on screen.
      layer.style.setProperty("--inv", String(1 / k));
    }
    void v;
  }, []);

  // Every house starts on Venice's sector, across the screen.
  const camera = useCamera({
    root,
    initial: sectorOn,
    onPaint: paint,
    onDoubleTap: () => camera.easeTo(farOn),
    // The sea touched: the panel and the deployed workshops fold away.
    onTap: () => {
      onTarget(null);
      setOpened(null);
    },
    // At rest: the chart drawn again at the camera's scale, when it has moved far from it.
    onRest: (cam) => {
      const want = Math.min(MAX_RASTER / CHART.w, cam.s);
      if (Math.abs(want / drawn.current - 1) > 0.12) setBase(want);
    },
  });
  /** A counter touched: the camera comes to it and its workshops deploy around it. */
  const deploy = (region: string, at: [number, number]) => {
    setOpened(region);
    camera.easeTo(orbitOn(at));
  };
  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (openedNow.current) setOpened(null);
      camera.easeTo(openedNow.current ? sectorOn : farOn);
    },
    home: () => deploy("veneto", seatOf("veneto")),
    far: () => {
      setOpened(null);
      camera.easeTo(farOn);
    },
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
  // The cities under the workshops deployed give way to them.
  const centre = opened ? orbitAt(p, opened) : null;
  const underOrbit = (code: string, cell: string) => {
    if (!centre) return false;
    const [x, y] = CITY_SPOTS[code] ?? cellCentre(cell);
    return Math.hypot(x - centre[0], y - centre[1]) < ORBIT_UNITS / 2;
  };

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-[#08111F]"
      data-map="empire"
      data-orbit={opened ?? undefined}
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
        {/* The workshops of the counter touched, deployed around it (the map's own size). */}
        {opened &&
          (() => {
            const [ox, oy] = orbitAt(p, opened);
            return (
              <div
                key={opened}
                className="orbit-in absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: ox * base, top: oy * base, width: ORBIT_UNITS * base }}
                data-orbit-open={opened}
              >
                <div className="pointer-events-auto">
                  <EmpireOrbit
                    p={p}
                    now={now}
                    busy={busy}
                    act={act}
                    region={opened}
                    onWorkshop={(id) => onTarget({ kind: "workshop", id })}
                    onCasa={() =>
                      onTarget(
                        opened === "veneto" ? { kind: "casa" } : { kind: "region", code: opened },
                      )
                    }
                    onFree={() =>
                      opened === "veneto"
                        ? onTarget({ kind: "free" })
                        : onTarget({ kind: "region", code: opened })
                    }
                  />
                </div>
              </div>
            );
          })()}
        <Names p={p} />
        <HomeMark
          p={p}
          hidden={opened === "veneto"}
          onClick={() => deploy("veneto", seatOf("veneto"))}
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
              hidden={underOrbit(c.code, c.cell)}
              onClick={() => onTarget({ kind: "city", code: c.code })}
            />
          ))}
        {map.posts.map((x) => {
          const [px, py] = postSpot(x.cell);
          return (
            <div key={`p${x.cell}`} data-at={`${px},${py}`} className="map-pin" data-post={x.cell}>
              {/* A counter touched: its region's workshops deploy around it. */}
              <button
                type="button"
                onClick={() => deploy(x.region, [px, py])}
                aria-label={t.placing.postCard}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg bg-night-3 text-gold ring-2 ring-gold/70 shadow-md shadow-black/50 active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
              >
                {Icon.banner()}
              </button>
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
        {map.camp &&
          (() => {
            const [px, py] = cellCentre(map.camp);
            return (
              <div data-at={`${px},${py + 7}`} className="map-pin">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-night-3 text-vermilion ring-2 ring-vermilion/70 shadow-md shadow-black/50 [&_svg]:h-4 [&_svg]:w-4"
                  data-camp-mark
                  title={t.placing.campCard}
                >
                  {Icon.troops()}
                </span>
              </div>
            );
          })()}
        {map.depot &&
          (() => {
            const [px, py] = cellCentre(map.depot);
            return (
              <div data-at={`${px - 9},${py + 9}`} className="map-pin">
                <button
                  type="button"
                  onClick={() => onTarget({ kind: "depot" })}
                  data-depot-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-gold ring-2 ring-gold/70 shadow-md shadow-black/50 [&_svg]:h-5 [&_svg]:w-5">
                    {Icon.cart()}
                  </span>
                  <span className="map-name">{t.scene.depot}</span>
                </button>
              </div>
            );
          })()}
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
  const frontier = [
    ...new Set(map.revealed.flatMap((c) => neighbours(c)).filter((c) => !seen.has(c))),
  ];
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
        {/* The dark, all but the sectors the house sees, a thin gap of night between them. */}
        <mask id="fog-mask" maskUnits="userSpaceOnUse">
          <rect x="-50" y="-50" width={CHART.w + 100} height={CHART.h + 100} fill="#fff" />
          {map.revealed.map((cell) => (
            <path key={cell} d={hexPath(cell, 1.2)} fill="#000" />
          ))}
        </mask>
      </defs>
      <rect
        x="-50"
        y="-50"
        width={CHART.w + 100}
        height={CHART.h + 100}
        fill="#060C17"
        opacity="0.96"
        mask="url(#fog-mask)"
        data-fog-layer
      />
      {/* The edge of the known: the sectors next to those seen, dark shapes outlined. */}
      <g data-frontier>
        {frontier.map((cell) => (
          <path
            key={cell}
            d={hexPath(cell, 1.2)}
            fill="#0C1729"
            stroke="#BFE3FF"
            strokeOpacity="0.14"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {/* The sectors seen: a tile each, washed in its region's colour, grained, hatched with
          fields and hills, lit in its middle and shaded to its edges, outlined. */}
      <defs>
        <pattern id="tex-grain" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1.2" r="0.32" fill="#F6E8CC" opacity="0.18" />
          <circle cx="3.6" cy="3.4" r="0.24" fill="#BFE3FF" opacity="0.14" />
        </pattern>
        <pattern
          id="tex-fields"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <path d="M0 2 H6 M0 4.6 H3.5" stroke="#F6E8CC" strokeOpacity="0.07" strokeWidth="0.5" />
        </pattern>
        <pattern id="tex-hills" width="18" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M1 9 Q5 4 9 9 M10 6 Q13 2.5 16 6"
            fill="none"
            stroke="#BFE3FF"
            strokeOpacity="0.1"
            strokeWidth="0.6"
          />
        </pattern>
        <radialGradient id="tex-light" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#F6E8CC" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#F6E8CC" stopOpacity="0" />
          <stop offset="100%" stopColor="#060C17" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <g data-cells>
        {lands.map(([cell, c]) => {
          const d = hexPath(cell, 1.2);
          return (
            <g key={cell}>
              <path d={d} fill={tintOf(c.region)} fillOpacity="0.12" />
              <path d={d} fill="url(#tex-fields)" />
              <path d={d} fill="url(#tex-hills)" />
              <path d={d} fill="url(#tex-grain)" />
              <path d={d} fill="url(#tex-light)" />
              <path
                d={d}
                fill="none"
                stroke={tintOf(c.region)}
                strokeOpacity="0.45"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
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

/** Each region's colour on the map: its sectors' wash and its cities' globes. */
const REGION_TINT: Record<string, string> = {
  veneto: "#E8B24C",
  lombardia: "#7DB596",
  friuli: "#6EC8F5",
  romagna: "#C98E52",
  dalmazia: "#4C8366",
  germania: "#93B95C",
  grecia: "#F6E8CC",
  levante: "#E36A4A",
  costantinopoli: "#8E6BD8",
  fiandra: "#A6A3B5",
};
const tintOf = (region: string) => REGION_TINT[region] ?? "#BFE3FF";

/** Where a counter stands in its sector: below its middle, clear of the cities. */
function postSpot(cell: string): [number, number] {
  const [x, y] = cellCentre(cell);
  return [x + HEX_SIZE * 0.25, y + HEX_SIZE * 0.5];
}

/** Where a counter's workshops deploy: Venice's Casa, or the region's first counter. */
function orbitAt(p: EmpirePayload, region: string): [number, number] {
  if (region === "veneto") return seatOf("veneto");
  const post = p.view?.map.posts.find((x) => x.region === region);
  return post ? postSpot(post.cell) : seatOf(region);
}

/** Venice on the map: the house's gold sun, its Casa written in it; touched, its workshops deploy. */
function HomeMark({
  p,
  hidden,
  onClick,
}: {
  p: EmpirePayload;
  hidden: boolean;
  onClick: () => void;
}) {
  const [x, y] = seatOf("veneto");
  return (
    <div
      data-at={`${x},${y}`}
      data-home
      className={`map-pin transition-opacity duration-[var(--t-base)] ${hidden ? "pointer-events-none opacity-0" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        data-region="veneto"
        aria-label={t.world.venice}
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        <span className="sun-breathe flex h-16 w-16 items-center justify-center rounded-full font-display text-base font-bold text-ink shadow-[0_0_32px_rgb(var(--gold)/0.45)] [background:radial-gradient(circle_at_34%_30%,rgb(var(--gold-soft))_0%,rgb(var(--gold))_50%,rgb(var(--gold-deep))_100%)]">
          {p.view?.house.casa ?? 1}
        </span>
        <span className="map-name">{t.world.venice}</span>
      </button>
    </div>
  );
}

/**
 * A city found on the map, a globe at its real place in its sector (as the example's planets):
 * its region's colour, a ring of lagoon where the house trades, of gold where a counter would
 * open it; its region's best paid good on it.
 */
function CityMark({
  p,
  code,
  cell,
  region,
  hidden,
  onClick,
}: {
  p: EmpirePayload;
  code: string;
  cell: string;
  region: string;
  hidden: boolean;
  onClick: () => void;
}) {
  const r = p.view?.regions.find((x) => x.code === region);
  const open = (r?.counter ?? 0) > 0;
  const best = open ? bestQuote(p, region) : null;
  const [x, y] = CITY_SPOTS[code] ?? cellCentre(cell);
  const tint = tintOf(region);
  return (
    <div
      data-at={`${x},${y}`}
      className={`map-pin transition-opacity duration-[var(--t-base)] ${hidden ? "pointer-events-none opacity-0" : ""}`}
    >
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
          className={`relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg shadow-black/60 ring-2 ${open ? "ring-lagoon" : "ring-gold/80"}`}
          style={{
            background: `radial-gradient(circle at 34% 30%, #F6E8CC 0%, ${tint} 38%, #16263E 100%)`,
          }}
        >
          {best && (
            <span className="rounded-full bg-night/70 p-0.5">
              <GoodsMark code={best} size={18} />
            </span>
          )}
        </span>
        <span className="map-name">{t.cityNames[code] ?? code}</span>
      </button>
    </div>
  );
}
