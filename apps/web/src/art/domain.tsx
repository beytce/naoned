import type { ReactNode } from "react";
import { IsoBox, IsoRoof, IsoTile, IsoTree, iso, pts } from "./iso.js";
import { IsoWorkshop, workshopHeight } from "./isoBuildings.js";
import { P } from "./palette.js";
import { ResourceIcon } from "./resources.js";
import { VehicleGlyph } from "./veneto.js";

/** A workshop standing on its plot. */
export interface DomainPlot {
  id: string;
  type: string;
  level: number;
  /**
   * What the workshop asks for, shown in a bubble over its roof: goods to collect, a batch under
   * way, nothing to do (it may produce), or an input missing. `still`: no recipe (the palace).
   */
  state: PlotState;
  /** Ready: units to collect. Idle: units of a batch. */
  quantity?: number;
  /** The goods it gives, or the input it lacks. */
  resource?: string;
  /** Running: share of the batch under way done (0 to 1), and its time left, written. */
  progress?: number;
  left?: string;
  /** An upgrade the merchant can afford: a golden arrow at its foot. */
  canUpgrade?: boolean;
  /** Just built or upgraded: a golden burst. */
  burst: boolean;
  /** Just collected: the goods rise from the plot. */
  gain?: { quantity: number; resource: string; key: number };
  /** Target of the guide. */
  coach?: string;
}

export type PlotState = "ready" | "running" | "idle" | "blocked" | "still";

export type SkyPhase = "day" | "dusk" | "night";

/** The phase of the sky at this hour (Paris). */
export function skyPhase(hour: number): SkyPhase {
  if (hour >= 21 || hour < 6) return "night";
  if (hour < 8 || hour >= 18) return "dusk";
  return "day";
}

/** Golden sparks around a plot just built or upgraded. */
function Burst() {
  return (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <path
          key={deg}
          d="M60 40 L60 22"
          stroke={P.goldSoft}
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${deg} 60 46)`}
        >
          <animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="2" />
        </path>
      ))}
      <circle cx="60" cy="46" r="30" fill="none" stroke={P.gold} strokeWidth="3">
        <animate attributeName="r" values="10;56" dur="1.4s" repeatCount="2" />
        <animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="2" />
      </circle>
    </g>
  );
}

/** A resource icon placed in the scene, centred on (x, y). */
function Icon({ code, x, y, size }: { code: string; x: number; y: number; size: number }) {
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <ResourceIcon code={code} size={48} />
    </svg>
  );
}

/** What the workshop asks for, over its roof. */
function Bubble({ plot }: { plot: DomainPlot }) {
  const tail = (fill: string) => <path d="M-4 9 L0 15 L4 9 Z" fill={fill} />;
  switch (plot.state) {
    case "ready":
      return (
        <g>
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;0 -2.5;0 0"
              dur="1.2s"
              repeatCount="indefinite"
            />
            {tail(P.gold)}
            <rect x="-24" y="-12" width="48" height="22" rx="11" fill={P.gold} />
            {plot.resource && <Icon code={plot.resource} x={-11} y={-1} size={18} />}
            <text
              x="11"
              y="4"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={P.night}
              fontFamily="Archivo, sans-serif"
            >
              +{plot.quantity ?? 0}
            </text>
          </g>
        </g>
      );
    case "running": {
      const r = 9;
      const c = 2 * Math.PI * r;
      return (
        <g>
          {tail(P.night)}
          <rect x="-26" y="-12" width="52" height="22" rx="11" fill={P.night} opacity="0.9" />
          <circle cx="-14" cy="-1" r={r} fill="none" stroke={P.line} strokeWidth="3" />
          <circle
            cx="-14"
            cy="-1"
            r={r}
            fill="none"
            stroke={P.lagoon}
            strokeWidth="3"
            strokeDasharray={`${c * Math.min(1, Math.max(0, plot.progress ?? 0))} ${c}`}
            transform="rotate(-90 -14 -1)"
          />
          <text
            x="7"
            y="3"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill={P.cream}
            fontFamily="Archivo, sans-serif"
          >
            {plot.left ?? ""}
          </text>
        </g>
      );
    }
    case "idle":
      return (
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.1;1"
            dur="1.8s"
            repeatCount="indefinite"
          />
          {tail(P.lagoon)}
          <circle r="11" fill={P.lagoon} />
          <path d="M-3.5 -5.5 L5.5 0 L-3.5 5.5 Z" fill={P.night} />
        </g>
      );
    case "blocked":
      return (
        <g>
          {tail(P.cream)}
          <circle r="11" fill={P.cream} stroke={P.vermilion} strokeWidth="1.5" />
          {plot.resource && <Icon code={plot.resource} x={0} y={0} size={17} />}
          <circle cx="8" cy="-8" r="5" fill={P.vermilion} />
          <path
            d="M8 -11 V-8 M8 -6 V-5.5"
            stroke={P.cream}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      );
    default:
      return null;
  }
}

const ROMAN = ["", "I", "II", "III", "IV", "V"];

/**
 * The land, in cells: twelve plots of 2 × 2 with paths between them, filled from the yard
 * outwards; the palace's place of honour behind; the yard in front, with the store, the vehicles
 * and the gate to the road.
 */
const SLOTS: { x: number; y: number }[] = [
  { x: 0, y: 6 },
  { x: 3, y: 6 },
  { x: 6, y: 6 },
  { x: 0, y: 3 },
  { x: 3, y: 3 },
  { x: 6, y: 3 },
  { x: 9, y: 6 },
  { x: 9, y: 3 },
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 6, y: 0 },
  { x: 9, y: 0 },
];
const HONOUR = { x: 4.5, y: -3.2 };
/** The yard: a band in front of the plots, the gate at its right end. */
export const YARD = { x: 0, y: 9.2, w: 9, d: 2 };
export const GATE = { x: 9.4, y: 9.2 };
/** Empty plots shown ahead: the next ones to build on, not the whole land. */
const EMPTY_SHOWN = 2;

const GROUND: Record<string, { field: string; path: string; tree: string }> = {
  terraferma: { field: "#7E8B3E", path: "#D8C8A0", tree: "#3F6B3A" },
  lagoon: { field: "#6F7D5A", path: "#D9CDB2", tree: "#3E6A55" },
  dolomites: { field: "#4F7A52", path: "#CFC6B0", tree: "#2C5A40" },
};

/** A workshop in volume on its plot, with its bubble, plaque and the touch that opens it. */
function Workshop({
  plot,
  at,
  night,
  label,
  onSelect,
}: {
  plot: DomainPlot;
  at: { x: number; y: number };
  night: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { x, y } = at;
  const top = workshopHeight(plot.type, plot.level);
  const [bx, by] = iso(x + 1, y + 1, top + 10);
  const [px, py] = iso(x + 1.15, y + 2.05);
  const [cx, cy] = iso(x + 1, y + 1, top / 2);
  return (
    // A <button> cannot live inside an SVG: the plot is a group with the button role.
    <g
      // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
      role="button"
      tabIndex={0}
      aria-label={label}
      data-coach={plot.coach}
      data-plot={plot.id}
      data-ready={plot.state === "ready" ? "1" : undefined}
      className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      {/* The whole plot and its building answer a touch. */}
      <polygon
        points={pts(
          iso(x, y, top),
          iso(x + 2, y, top),
          iso(x + 2, y, 0),
          iso(x + 2, y + 2, 0),
          iso(x, y + 2, 0),
          iso(x, y + 2, top),
        )}
        fill="transparent"
      />
      <g key={plot.gain?.key ?? 0} className={plot.gain ? "domain-bump" : undefined}>
        <IsoWorkshop
          type={plot.type}
          x={x}
          y={y}
          level={plot.level}
          active={plot.state === "running"}
          night={night}
        />
      </g>
      <g transform={`translate(${px} ${py})`}>
        <rect x="-9" y="-5" width="18" height="10" rx="2" fill={P.night} stroke={P.gold} />
        <text
          textAnchor="middle"
          y="3"
          fontSize="7.5"
          fontWeight="700"
          fill={P.gold}
          fontFamily="Archivo, sans-serif"
        >
          {ROMAN[Math.min(5, plot.level)] ?? plot.level}
        </text>
        {plot.canUpgrade && (
          <g transform="translate(14 0)">
            <circle r="6" fill={P.gold} stroke={P.night} strokeWidth="1.2" />
            <path
              d="M0 3.5 V-3 M-3 0 L0 -3.3 L3 0"
              stroke={P.night}
              strokeWidth="1.8"
              fill="none"
            />
          </g>
        )}
      </g>
      <g transform={`translate(${bx} ${by})`}>
        <Bubble plot={plot} />
      </g>
      {plot.gain && (
        <g key={plot.gain.key} transform={`translate(${bx} ${by + 6})`}>
          <g className="domain-gain">
            <text
              textAnchor="end"
              x="-1"
              y="5"
              fontSize="14"
              fontWeight="800"
              fill={P.goldSoft}
              stroke={P.night}
              strokeWidth="3"
              paintOrder="stroke"
              fontFamily="Archivo, sans-serif"
            >
              +{plot.gain.quantity}
            </text>
            <Icon code={plot.gain.resource} x={9} y={0} size={17} />
          </g>
        </g>
      )}
      {plot.burst && (
        <g transform={`translate(${cx - 60} ${cy - 46})`}>
          <Burst />
        </g>
      )}
    </g>
  );
}

/** An empty plot, waiting to be built on. */
function EmptyPlot({
  at,
  first,
  label,
  onSelect,
}: {
  at: { x: number; y: number };
  first: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { x, y } = at;
  const [cx, cy] = iso(x + 1, y + 1);
  return (
    <g
      // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <IsoTile x={x + 0.1} y={y + 0.1} w={1.8} d={1.8} fill="#000" opacity={0.12} />
      <IsoTile
        x={x + 0.1}
        y={y + 0.1}
        w={1.8}
        d={1.8}
        fill="transparent"
        stroke={P.cream}
        dash="4 4"
      />
      <path
        d={`M${cx - 6} ${cy} H${cx + 6} M${cx} ${cy - 6} V${cy + 6}`}
        stroke={P.cream}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      {first && (
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fontSize="9"
          fill={P.cream}
          fontFamily="Space Mono, monospace"
          letterSpacing="1"
        >
          {label.toUpperCase()}
        </text>
      )}
    </g>
  );
}

/** The ground of the region, its paths, and what grows or flows around the domain. */
function Land({ region, slots }: { region: string; slots: { x: number; y: number }[] }) {
  const g = GROUND[region] ?? GROUND.terraferma ?? { field: "#777", path: "#ccc", tree: "#363" };
  const maxX = Math.max(11, ...slots.map((s) => s.x + 2));
  const minY = Math.min(0, ...slots.map((s) => s.y));
  const trees: [number, number][] = [
    [-1.6, 1],
    [-1.4, 4.5],
    [-1.8, 7.5],
    [12.6, 1.5],
    [12.4, 5],
    [1.5, -1.8],
    [7.5, -1.6],
    [-1.2, 11.5],
  ];
  return (
    <g>
      <IsoTile x={-8} y={-10} w={30} d={26} fill={g.field} />
      {region === "lagoon" && (
        <g>
          <IsoTile x={-8} y={-10} w={30} d={5.6} fill={P.lagoonDeep} />
          <IsoTile x={-8} y={-4.6} w={30} d={0.3} fill={P.lagoon} opacity={0.6} />
        </g>
      )}
      {region === "dolomites" &&
        [
          [-2, -6],
          [3, -7],
          [9, -6.5],
          [14, -5],
        ].map(([x = 0, y = 0]) => {
          const [a, b] = iso(x, y);
          return (
            <g key={`${x}`} transform={`translate(${a} ${b})`}>
              <path d="M-30 0 L0 -46 L30 0 Z" fill="#6E7F86" stroke={P.night} strokeWidth="0.6" />
              <path d="M0 -46 L30 0 L6 0 Z" fill="#55666D" />
              <path d="M-9 -32 L0 -46 L9 -32 L3 -34 L0 -30 L-4 -34 Z" fill={P.cream} />
            </g>
          );
        })}
      {/* Paths between the plots and along the yard. */}
      <IsoTile x={-0.5} y={8.2} w={maxX + 4} d={0.9} fill={g.path} opacity={0.9} />
      {[2.1, 5.1, 8.1].map((x) => (
        <IsoTile key={x} x={x} y={minY - 0.5} w={0.8} d={8.7 - minY} fill={g.path} opacity={0.75} />
      ))}
      {[2.1, 5.1].map((y) => (
        <IsoTile key={y} x={-0.5} y={y} w={maxX + 0.5} d={0.8} fill={g.path} opacity={0.6} />
      ))}
      {trees.map(([x, y]) => (
        <IsoTree key={`${x}-${y}`} x={x} y={y} color={g.tree} />
      ))}
    </g>
  );
}

/** The yard's ground: paving, and the road out beyond the gate. */
function YardGround() {
  return (
    <g>
      <IsoTile
        x={YARD.x - 0.3}
        y={YARD.y}
        w={YARD.w + 0.6}
        d={YARD.d}
        fill="#B9AE95"
        stroke="#8C826D"
      />
      <IsoTile x={GATE.x} y={YARD.y + 0.5} w={8} d={1} fill="#9C8E70" />
    </g>
  );
}

/** The yard's buildings: the store with its piles of goods (a touch opens it) and the gate. */
function Yard({
  stock,
  storeLabel,
  onStore,
  alert,
}: {
  stock: number;
  storeLabel: string;
  onStore: () => void;
  /** An ambush waiting for an answer: a red bubble over the gate. */
  alert: boolean;
}) {
  const piles = Math.min(4, Math.ceil(stock / 60));
  const [gx, gy] = iso(GATE.x + 0.15, GATE.y + 1, 44);
  return (
    <g>
      <g
        // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
        role="button"
        tabIndex={0}
        aria-label={storeLabel}
        data-coach="store"
        className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        onClick={onStore}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onStore();
        }}
      >
        <polygon
          points={pts(
            iso(-0.1, 9.3, 34),
            iso(2.3, 9.3, 34),
            iso(2.3, 9.3, 0),
            iso(2.3, 11.1, 0),
            iso(-0.1, 11.1, 0),
            iso(-0.1, 11.1, 34),
          )}
          fill="transparent"
        />
        <IsoBox x={0} y={9.4} w={2.2} d={1.6} h={3} color="#8C826D" />
        {[0, 1, 2, 3].slice(0, piles).map((i) => (
          <IsoBox
            key={i}
            x={0.2 + (i % 2) * 0.9}
            y={9.6 + Math.floor(i / 2) * 0.7}
            w={0.6}
            d={0.5}
            h={6 + (i % 3) * 3}
            z={3}
            color={i % 2 ? P.woodLight : P.wood}
          />
        ))}
        {[0.1, 2.0].map((u) => (
          <IsoBox key={u} x={u} y={9.4} w={0.12} d={0.12} h={22} z={3} color={P.wood} />
        ))}
        <IsoRoof x={-0.1} y={9.3} w={2.4} d={1.8} z={25} rise={7} color={ROOF_TILE} wall={P.wood} />
      </g>
      {/* The gate. */}
      <IsoBox x={GATE.x} y={GATE.y} w={0.3} d={0.3} h={26} color={STONE} />
      <IsoBox x={GATE.x} y={GATE.y + 1.7} w={0.3} d={0.3} h={26} color={STONE} />
      <IsoBox x={GATE.x} y={GATE.y} w={0.3} d={2} h={5} z={26} color={STONE} top={P.vermilion} />
      {alert && (
        <g transform={`translate(${gx} ${gy})`}>
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`${gx} ${gy};${gx} ${gy - 3};${gx} ${gy}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
          <path d="M-4 9 L0 15 L4 9 Z" fill={P.vermilion} />
          <circle r="11" fill={P.vermilion} />
          <text textAnchor="middle" y="4.5" fontSize="12" fill={P.cream}>
            ⚔
          </text>
        </g>
      )}
    </g>
  );
}

/** A vehicle of the merchant: at the depot, or on the road out (loaded) and back (empty). */
export interface DomainVehicle {
  id: string;
  type: string;
  where: "home" | "out" | "back";
  /** On the road: share of the leg done (0 to 1). */
  progress: number;
  /** Colour of the goods carried, when loaded. */
  load: string | null;
  /** At the depot with an order its stock covers: a bubble invites to load it. */
  ready: boolean;
  /** Stopped by bandits, waiting for an answer. */
  stopped: boolean;
}

/** A vehicle in the yard or on the road, which a touch opens. */
function Vehicle({
  v,
  slot,
  label,
  onSelect,
}: {
  v: DomainVehicle;
  slot: number;
  label: string;
  onSelect: () => void;
}) {
  // At the depot: parked side by side. On the road: from the gate out, or back to it.
  const lane = YARD.y + 0.65 + (slot % 2) * 0.55;
  const along = v.where === "out" ? v.progress : 1 - v.progress;
  const at = v.where === "home" ? iso(3 + slot * 1.5, 10.2) : iso(GATE.x + 0.8 + along * 3.4, lane);
  return (
    <g
      // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
      role="button"
      tabIndex={0}
      aria-label={label}
      data-vehicle={v.id}
      className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      style={{ transform: `translate(${at[0]}px, ${at[1]}px)`, transition: "transform 1s linear" }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <rect x="-18" y="-16" width="36" height="24" fill="transparent" />
      <ellipse cx="0" cy="3" rx="16" ry="4" fill="#000" opacity="0.18" />
      <g transform={v.where === "back" ? "scale(-1.1 1.1)" : "scale(1.1)"}>
        <g className={v.where === "home" ? undefined : "cart-roll"}>
          <VehicleGlyph type={v.type} load={v.load} />
        </g>
      </g>
      {(v.ready || v.stopped) && (
        <g transform="translate(0 -26) scale(0.85)">
          {v.stopped ? (
            <g>
              <path d="M-4 9 L0 15 L4 9 Z" fill={P.vermilion} />
              <circle r="11" fill={P.vermilion} />
              <text textAnchor="middle" y="4.5" fontSize="12" fill={P.cream}>
                ⚔
              </text>
            </g>
          ) : (
            <Bubble plot={{ id: v.id, type: v.type, level: 1, state: "idle", burst: false }} />
          )}
        </g>
      )}
    </g>
  );
}

/** A worker of the house and the bread they need. */
export interface DomainWorker {
  id: string;
  /** The workshop they serve. */
  plot: string;
  /** Walking between the workshop and the store while it produces, waiting at its door when not. */
  walking: boolean;
  /** Bread: enough, short (less than a day in store), or none (hungry, slower). */
  need: "ok" | "low" | "hungry";
  /** Shows the bubble of the need (not every worker carries it, when short). */
  bubble: boolean;
}

const SHIRTS = ["#6DB3A2", "#E0AD4B", "#E2694F", "#8E6BD8", "#F1E4C6", "#3FA36B"];

/** A worker on their round between their workshop's door and the store. */
function Worker({
  w,
  home,
  index,
  label,
  onSelect,
}: {
  w: DomainWorker;
  home: { x: number; y: number };
  index: number;
  label: string;
  onSelect: () => void;
}) {
  const door = iso(home.x + 1, home.y + 2.25);
  const lane = iso(home.x + 1, 8.7);
  const store = iso(1.1 + (index % 3) * 0.3, 8.75);
  const route = [door, lane, store, lane, door];
  const length = route.slice(1).reduce((n, p, i) => {
    const q = route[i] ?? p;
    return n + Math.hypot(p[0] - q[0], p[1] - q[1]);
  }, 0);
  const speed = w.need === "hungry" ? 9 : 16;
  const dur = Math.max(6, length / speed);
  const path = `M${route.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L")}`;
  const wait = iso(home.x + 0.55 + (index % 2) * 0.9, home.y + 2.35);
  return (
    <g
      // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
      role="button"
      tabIndex={0}
      aria-label={label}
      data-worker={w.id}
      className="cursor-pointer outline-none"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      transform={w.walking ? undefined : `translate(${wait[0]} ${wait[1]})`}
    >
      {w.walking && (
        <animateMotion
          path={path}
          dur={`${dur.toFixed(1)}s`}
          begin={`-${((index * 7.3) % dur).toFixed(1)}s`}
          repeatCount="indefinite"
        />
      )}
      <rect x="-6" y="-16" width="12" height="18" fill="transparent" />
      <ellipse cx="0" cy="1" rx="4.5" ry="1.8" fill="#000" opacity="0.22" />
      <g className={w.walking ? "worker-step" : undefined}>
        <rect
          x="-3.2"
          y="-9"
          width="6.4"
          height="9"
          rx="3"
          fill={SHIRTS[index % SHIRTS.length]}
          stroke={P.night}
          strokeWidth="0.7"
        />
        <circle cy="-11.5" r="3.2" fill="#E7B98F" stroke={P.night} strokeWidth="0.7" />
        <path d="M-3.2 -12.5 Q0 -16.5 3.2 -12.5 Z" fill="#4A3426" />
      </g>
      {w.bubble && w.need !== "ok" && (
        <g transform="translate(0 -26) scale(0.7)">
          <path d="M-4 9 L0 15 L4 9 Z" fill={w.need === "hungry" ? P.vermilion : P.cream} />
          <circle
            r="11"
            fill={w.need === "hungry" ? P.vermilion : P.cream}
            stroke={P.night}
            strokeWidth="1"
          />
          <Icon code="bread" x={0} y={0} size={15} />
        </g>
      )}
    </g>
  );
}

const ROOF_TILE = "#C8693F";
const STONE = "#CFC6B0";

/**
 * The merchant's domain, in volume: their workshops on the land of their region, the palace in
 * the place of honour, the yard with the store and the vehicles, the gate to the road, their arms
 * on the mast. The view frames what is built: it starts close and widens as the domain grows.
 */
export function DomainScene(props: {
  region: string;
  phase: SkyPhase;
  plots: DomainPlot[];
  /** Plots a merchant may build on. */
  maxPlots: number;
  /** The vehicles, at the depot or on the road. */
  vehicles: DomainVehicle[];
  vehicleLabel: (v: DomainVehicle) => string;
  onVehicle: (v: DomainVehicle) => void;
  /** The workers, on their rounds, and what they need. */
  workers: DomainWorker[];
  workerLabel: string;
  onWorker: () => void;
  storeLabel: string;
  onStore: () => void;
  /** An ambush waits for an answer on the road. */
  alert: boolean;
  /** Units in store, for the piles of goods. */
  stock: number;
  /** The merchant's arms, drawn on the mast. */
  crest: ReactNode;
  /** The sign of the house's mastery, hung under the arms. */
  emblem?: ReactNode;
  labelOf: (plot: DomainPlot) => string;
  emptyLabel: string;
  /** What the scene shows, for screen readers. */
  title: string;
  onPlot: (plot: DomainPlot) => void;
  onEmpty: () => void;
  /** Drawn over the buildings: what moves in the yard and on the paths. */
  children?: ReactNode;
  /** Height over width of the frame: a little taller than wide on a phone, wide on a computer. */
  ratio?: number;
}) {
  const { phase } = props;
  const night = phase === "night";
  const palaces = props.plots.filter((p) => p.type === "palazzo");
  const others = props.plots.filter((p) => p.type !== "palazzo");
  // The first palace takes the place of honour; everything else fills the plots from the yard out.
  const placed: { plot: DomainPlot; at: { x: number; y: number } }[] = [];
  const queue = [...palaces.slice(1), ...others];
  if (palaces[0]) placed.push({ plot: palaces[0], at: HONOUR });
  queue.slice(0, SLOTS.length).forEach((plot, i) => {
    const at = SLOTS[i];
    if (at) placed.push({ plot, at });
  });
  const used = Math.min(queue.length, SLOTS.length);
  const free = Math.max(0, Math.min(props.maxPlots, SLOTS.length + 1) - props.plots.length);
  const empties = SLOTS.slice(used, used + Math.min(free, EMPTY_SHOWN));
  const drawOrder = [...placed].sort((a, b) => a.at.x + a.at.y - (b.at.x + b.at.y));
  const shown = [...placed.map((p) => p.at), ...empties];

  // The frame: what is built, the next plots and the yard, with room above for roofs and bubbles.
  const corners = [
    ...shown.flatMap((s) => [
      iso(s.x, s.y, 70),
      iso(s.x + 2, s.y),
      iso(s.x, s.y + 2),
      iso(s.x + 2, s.y + 2),
    ]),
    iso(YARD.x - 0.6, YARD.y + YARD.d),
    iso(GATE.x + 2.5, YARD.y + YARD.d),
    iso(GATE.x, GATE.y, 40),
    iso(-1, 8.6, 70),
  ];
  const minX = Math.min(...corners.map((c) => c[0])) - 10;
  const maxX = Math.max(...corners.map((c) => c[0])) + 10;
  const minY = Math.min(...corners.map((c) => c[1])) - 6;
  const maxY = Math.max(...corners.map((c) => c[1])) + 8;
  // Keep the scene's proportions (a little taller than wide on a phone): widen or heighten.
  const ratio = props.ratio ?? 0.82;
  let w = maxX - minX;
  let h = maxY - minY;
  if (h / w < ratio) h = w * ratio;
  else w = h / ratio;
  const vx = (minX + maxX) / 2 - w / 2;
  const vy = (minY + maxY) / 2 - h / 2;
  const [mx, my] = iso(-1, 8.6);
  return (
    <svg
      viewBox={`${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`}
      className="block h-auto w-full"
      role="img"
    >
      <title>{props.title}</title>
      <rect
        x={vx}
        y={vy}
        width={w}
        height={h}
        fill={(GROUND[props.region] ?? GROUND.terraferma)?.field}
      />
      <Land region={props.region} slots={shown} />
      <YardGround />
      {empties.map((at, i) => (
        <EmptyPlot
          key={`${at.x}-${at.y}`}
          at={at}
          first={i === 0}
          label={props.emptyLabel}
          onSelect={props.onEmpty}
        />
      ))}
      {drawOrder.map(({ plot, at }) => (
        <Workshop
          key={plot.id}
          plot={plot}
          at={at}
          night={night}
          label={props.labelOf(plot)}
          onSelect={() => props.onPlot(plot)}
        />
      ))}
      <Yard
        stock={props.stock}
        storeLabel={props.storeLabel}
        onStore={props.onStore}
        alert={props.alert}
      />
      {props.workers.map((w, i) => {
        const home = placed.find((p) => p.plot.id === w.plot)?.at;
        return home ? (
          <Worker
            key={w.id}
            w={w}
            home={home}
            index={i}
            label={props.workerLabel}
            onSelect={props.onWorker}
          />
        ) : null;
      })}
      {props.vehicles.map((v, i) => (
        <Vehicle
          key={v.id}
          v={v}
          slot={
            v.where === "home" ? props.vehicles.filter((x) => x.where === "home").indexOf(v) : i
          }
          label={props.vehicleLabel(v)}
          onSelect={() => props.onVehicle(v)}
        />
      ))}
      {props.children}
      {/* The mast with the merchant's arms, at the corner of the yard. */}
      <g transform={`translate(${mx} ${my})`}>
        <path d="M0 0 V-62" stroke={P.woodLight} strokeWidth="2.5" strokeLinecap="round" />
        <g transform="translate(-13 -74)">{props.crest}</g>
        {props.emblem && <g transform="translate(-10 -44)">{props.emblem}</g>}
      </g>
      {/* Dusk warms the land, night darkens it (the windows stay lit). */}
      {phase !== "day" && (
        <rect
          x={vx}
          y={vy}
          width={w}
          height={h}
          fill={night ? "#0A1A2E" : "#7A3A2A"}
          opacity={night ? 0.38 : 0.14}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
