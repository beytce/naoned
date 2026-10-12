import type { ReactNode } from "react";
import { BuildingShape } from "./buildings.js";
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

const W = 360;
const H = 254;
/** Top of the yard strip, below the front row. */
const YARD = 232;

/**
 * Where the plots lie, back to front: a place of honour for the palace, then three rows that grow
 * larger as they come closer. Twelve plots in all, as many as the buildings a merchant may own.
 */
const HONOUR = { x: 180, y: 124, scale: 0.8 };
/** Filled from the front (the first workshops stand large and close) to the back. */
const ROWS: { x: number; y: number; scale: number }[] = [
  { x: 64, y: 214, scale: 0.94 },
  { x: 180, y: 214, scale: 0.94 },
  { x: 296, y: 214, scale: 0.94 },
  { x: 48, y: 164, scale: 0.7 },
  { x: 132, y: 164, scale: 0.7 },
  { x: 228, y: 164, scale: 0.7 },
  { x: 312, y: 164, scale: 0.7 },
  { x: 56, y: 122, scale: 0.52 },
  { x: 116, y: 122, scale: 0.52 },
  { x: 244, y: 122, scale: 0.52 },
  { x: 304, y: 122, scale: 0.52 },
];

/** Empty plots shown ahead: the next ones to build on, not the whole land. */
const EMPTY_SHOWN = 2;

const ROMAN = ["", "I", "II", "III", "IV", "V"];

/** The phase of the sky at this hour (Paris). */
export function skyPhase(hour: number): SkyPhase {
  if (hour >= 21 || hour < 6) return "night";
  if (hour < 8 || hour >= 18) return "dusk";
  return "day";
}

const SKY: Record<SkyPhase, [string, string]> = {
  day: ["#2C5E66", "#6E9F95"],
  dusk: ["#3A2440", "#C8693F"],
  night: ["#08141A", "#16292E"],
};

const GROUND: Record<string, [string, string]> = {
  terraferma: ["#5B5326", "#3E3A1C"],
  lagoon: ["#4A3A30", "#2F2620"],
  dolomites: ["#2E4A3A", "#1E3128"],
};

/** The far landscape of each region, behind the plots. */
function Backdrop({ region, phase }: { region: string; phase: SkyPhase }) {
  const far = phase === "night" ? P.night : P.night3;
  if (region === "lagoon") {
    return (
      <g>
        <g fill={far} opacity="0.9">
          <rect x="196" y="58" width="9" height="46" />
          <path d="M194 58 L200.5 42 L207 58 Z" />
          <path d="M214 104 V86 Q228 70 242 86 V104 Z" />
          <path d="M240 104 V80 Q258 60 276 80 V104 Z" />
          <rect x="278" y="88" width="40" height="16" />
          <rect x="120" y="92" width="60" height="12" />
          <rect x="60" y="94" width="40" height="10" />
        </g>
        <rect x="0" y="100" width={W} height="16" fill={P.lagoonDeep} opacity="0.75" />
        {[104, 109, 113].map((y, i) => (
          <path
            key={y}
            d={`M${20 + i * 40} ${y} h${60 - i * 10} M${200 - i * 30} ${y} h${90 - i * 20}`}
            stroke={P.lagoon}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.7 - i * 0.2}
          />
        ))}
        <g>
          <path d="M0 4 Q14 9 28 2 Q20 7 4 6 Z" fill={P.cream} />
          <path d="M20 3 L22 -8" stroke={P.cream} strokeWidth="1" />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-30 103; 380 103"
            dur="70s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    );
  }
  if (region === "dolomites") {
    return (
      <g>
        <path
          d="M0 112 L44 40 L76 82 L118 22 L164 92 L206 46 L254 100 L296 34 L340 86 L360 70 V116 H0 Z"
          fill={far}
        />
        <path
          d="M44 40 L54 56 L36 54 Z M118 22 L130 40 L106 38 Z M206 46 L216 60 L196 58 Z M296 34 L308 52 L286 50 Z"
          fill={P.cream}
          opacity="0.85"
        />
        {[16, 34, 92, 150, 186, 236, 268, 330, 348].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${92 + (i % 3) * 6} l-7 18 h14 Z`}
            fill={P.lagoonDeep}
            opacity="0.9"
          />
        ))}
      </g>
    );
  }
  // Terraferma: rolling fields, poplars, a windmill on the hill.
  return (
    <g>
      <path d="M0 98 Q60 74 130 92 T260 86 T360 90 V116 H0 Z" fill={P.goldDeep} opacity="0.55" />
      <path d="M0 108 Q90 92 180 104 T360 100 V116 H0 Z" fill={P.gold} opacity="0.35" />
      {[30, 44, 300, 316, 330].map((x) => (
        <ellipse key={x} cx={x} cy="90" rx="4" ry="12" fill={far} opacity="0.85" />
      ))}
      <g transform="translate(228 70)" fill={far}>
        <path d="M-4 22 L-2 4 H2 L4 22 Z" />
        <g>
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M0 4 L1 -10 H5 L1 4 Z" transform={`rotate(${r} 0 4)`} />
          ))}
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 4"
            to="360 0 4"
            dur="14s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </g>
  );
}

/** Texture of the land: furrows, paving or meadow, and the path to the depot. */
function Ground({ region }: { region: string }) {
  const mark = region === "lagoon" ? P.clay : region === "dolomites" ? P.lagoon : P.goldSoft;
  return (
    <g>
      <path
        d={`M168 ${H} Q172 170 180 128 L186 128 Q196 170 204 ${H} Z`}
        fill={P.cream}
        opacity="0.12"
      />
      {region === "lagoon"
        ? [130, 150, 176, 204].map((y) => (
            <path key={y} d={`M0 ${y} H${W}`} stroke={mark} strokeWidth="1" opacity="0.18" />
          ))
        : region === "dolomites"
          ? [
              [24, 140],
              [90, 150],
              [150, 186],
              [212, 140],
              [270, 190],
              [340, 150],
              [110, 200],
              [330, 206],
            ].map(([x = 0, y = 0]) => (
              <path
                key={`${x}-${y}`}
                d={`M${x} ${y} l3 -7 l3 7 M${x + 5} ${y} l3 -6 l3 6`}
                stroke={mark}
                strokeWidth="1.4"
                fill="none"
                opacity="0.5"
              />
            ))
          : [128, 140, 154, 170, 188, 208].map((y, i) => (
              <path
                key={y}
                d={`M0 ${y} Q${W / 2} ${y - 6 + i} ${W} ${y}`}
                stroke={mark}
                strokeWidth="1"
                fill="none"
                opacity="0.16"
              />
            ))}
    </g>
  );
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

/** A workshop on its plot, with what its level adds: banner, stone, tower, gold. */
function Workshop({
  plot,
  at,
  night,
  label,
  onSelect,
}: {
  plot: DomainPlot;
  at: { x: number; y: number; scale: number };
  night: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { level } = plot;
  const s = at.scale;
  return (
    // A <button> cannot live inside an SVG: the plot is a group with the button role.
    <g
      transform={`translate(${at.x - 60 * s} ${at.y - 80 * s}) scale(${s})`}
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
      {/* The whole plot answers a touch, not only the painted strokes. */}
      <rect x="8" y="8" width="104" height="84" fill="transparent" />
      <ellipse cx="60" cy="82" rx="56" ry="8" fill="#000" opacity="0.28" />
      {level >= 5 && (
        <ellipse cx="60" cy="54" rx="60" ry="40" fill={P.gold} opacity="0.16">
          <animate
            attributeName="opacity"
            values="0.1;0.24;0.1"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>
      )}
      {level >= 4 && (
        <g>
          <rect x="2" y="26" width="14" height="54" fill={P.cream} stroke={P.line} />
          <path d="M0 27 L9 12 L18 27 Z" fill={P.vermilion} />
          <path d="M9 12 V2" stroke={P.cream} strokeWidth="1.5" />
          <path d="M9 2 L19 5 L9 8 Z" fill={P.gold} />
          <rect x="6" y="40" width="6" height="8" rx="3" fill={night ? P.gold : P.night3} />
        </g>
      )}
      {level >= 3 && (
        <g>
          <rect x="8" y="80" width="104" height="7" rx="1.5" fill={P.cream} opacity="0.85" />
          <path d="M8 83.5 H112" stroke={P.line} strokeWidth="1" />
        </g>
      )}
      <g key={plot.gain?.key ?? 0} className={plot.gain ? "domain-bump" : undefined}>
        <BuildingShape type={plot.type} active={plot.state === "running"} />
      </g>
      {level >= 5 && (
        <path
          d="M30 14 L36 4 L42 14 L48 2 L54 14 L60 4 L66 14 Z"
          fill={P.gold}
          transform="translate(22 0)"
        />
      )}
      {level >= 2 && (
        <g>
          <path d="M112 80 V26" stroke={P.woodLight} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M112 27 H128 L123 34 L128 41 H112 Z" fill={level >= 4 ? P.gold : P.lagoon}>
            <animateTransform
              attributeName="transform"
              type="skewY"
              values="0;4;0"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      )}
      {night && (
        <g>
          <circle cx="60" cy="64" r="11" fill={P.gold} opacity="0.18" />
          <circle cx="60" cy="64" r="4" fill={P.goldSoft} opacity="0.8" />
        </g>
      )}
      <g transform="translate(60 92)">
        <rect x="-11" y="-6" width="22" height="12" rx="3" fill={P.night} stroke={P.gold} />
        <text
          textAnchor="middle"
          y="3.5"
          fontSize="9"
          fontWeight="700"
          fill={P.gold}
          fontFamily="Archivo, sans-serif"
        >
          {ROMAN[Math.min(5, level)] ?? level}
        </text>
      </g>
      {plot.canUpgrade && (
        <g transform="translate(84 92)">
          <circle r="7" fill={P.gold} stroke={P.night} strokeWidth="1.5" />
          <path
            d="M0 4 V-3.5 M-3.5 0 L0 -3.8 L3.5 0"
            stroke={P.night}
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
      {/* The bubble keeps one size from the front row to the back: it is read, not seen. */}
      <g transform={`translate(60 6) scale(${Math.min(1.3, 0.85 / s)})`}>
        <Bubble plot={plot} />
      </g>
      {plot.gain && (
        <g key={plot.gain.key} transform={`translate(60 10) scale(${Math.min(1.6, 1 / s)})`}>
          <g className="domain-gain">
            <text
              textAnchor="end"
              x="-1"
              y="5"
              fontSize="15"
              fontWeight="800"
              fill={P.goldSoft}
              stroke={P.night}
              strokeWidth="3"
              paintOrder="stroke"
              fontFamily="Archivo, sans-serif"
            >
              +{plot.gain.quantity}
            </text>
            <svg x="1" y="-9" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <ResourceIcon code={plot.gain.resource} size={48} />
            </svg>
          </g>
        </g>
      )}
      {plot.burst && <Burst />}
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
  at: { x: number; y: number; scale: number };
  first: boolean;
  label: string;
  onSelect: () => void;
}) {
  const s = at.scale;
  return (
    <g
      transform={`translate(${at.x} ${at.y}) scale(${s})`}
      // biome-ignore lint/a11y/useSemanticElements: no <button> inside an SVG scene
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      opacity="0.75"
    >
      <rect x="-46" y="-28" width="92" height="42" fill="transparent" />
      <ellipse rx="44" ry="10" fill="#000" opacity="0.15" />
      <ellipse rx="44" ry="10" fill="none" stroke={P.cream} strokeDasharray="5 5" opacity="0.5" />
      <path d="M-6 -2 H6 M0 -8 V4" stroke={P.cream} strokeWidth="2.5" strokeLinecap="round" />
      {first && (
        <text
          y="-16"
          textAnchor="middle"
          fontSize="11"
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

/**
 * The merchant's domain: their workshops on the land of their region, the palace in the place of
 * honour, the yard with the vehicles at the depot and the goods in store, their arms on the mast.
 * It grows with every building and every level.
 */
export function DomainScene(props: {
  region: string;
  phase: SkyPhase;
  plots: DomainPlot[];
  /** Plots a merchant may build on. */
  maxPlots: number;
  /** Vehicles at the depot (the others are on the road). */
  vehiclesHome: string[];
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
}) {
  const { phase } = props;
  const night = phase === "night";
  const [skyTop, skyLow] = SKY[phase];
  const [ground, groundDeep] = GROUND[props.region] ?? GROUND.terraferma ?? ["#333", "#222"];
  const palaces = props.plots.filter((p) => p.type === "palazzo");
  const others = props.plots.filter((p) => p.type !== "palazzo");
  // The first palace takes the place of honour; everything else fills the rows, back to front.
  const placed: { plot: DomainPlot; at: { x: number; y: number; scale: number } }[] = [];
  const queue = [...palaces.slice(1), ...others];
  if (palaces[0]) placed.push({ plot: palaces[0], at: HONOUR });
  queue.slice(0, ROWS.length).forEach((plot, i) => {
    const at = ROWS[i];
    if (at) placed.push({ plot, at });
  });
  const used = queue.length;
  const free = Math.max(0, Math.min(props.maxPlots, ROWS.length + 1) - props.plots.length);
  const emptyRows = ROWS.slice(used, used + Math.min(free, EMPTY_SHOWN));
  const piles = Math.min(4, Math.ceil(props.stock / 60));
  // Back rows first, so that nearer buildings hide farther ones.
  const drawOrder = [...placed].sort((a, b) => a.at.y - b.at.y);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
      <title>{props.title}</title>
      <defs>
        <linearGradient id="domain-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyLow} />
        </linearGradient>
        <linearGradient id="domain-ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={ground} />
          <stop offset="100%" stopColor={groundDeep} />
        </linearGradient>
      </defs>
      <rect width={W} height="120" fill="url(#domain-sky)" />
      {night ? (
        <g fill={P.cream}>
          {[
            [30, 18],
            [80, 34],
            [140, 12],
            [210, 26],
            [262, 10],
            [320, 30],
            [176, 44],
            [110, 54],
          ].map(([x = 0, y = 0]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" opacity="0.8">
              <animate
                attributeName="opacity"
                values="0.3;0.9;0.3"
                dur={`${2 + (x % 3)}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
          <circle cx="300" cy="34" r="11" fill={P.cream} opacity="0.85" />
          <circle cx="305" cy="31" r="10" fill={skyTop} />
        </g>
      ) : (
        <g>
          <circle
            cx="292"
            cy="38"
            r="26"
            fill={P.goldSoft}
            opacity={phase === "dusk" ? 0.35 : 0.2}
          />
          <circle cx="292" cy="38" r="12" fill={phase === "dusk" ? P.vermilion : P.goldSoft} />
        </g>
      )}
      <Backdrop region={props.region} phase={phase} />
      <rect y="112" width={W} height={H - 112} fill="url(#domain-ground)" />
      <Ground region={props.region} />
      <rect y={YARD} width={W} height={H - YARD} fill={P.night} opacity="0.35" />
      <path d={`M0 ${YARD} H${W}`} stroke={P.woodLight} strokeWidth="1" opacity="0.3" />

      {/* The mast with the merchant's arms. */}
      <g>
        <path d="M18 132 V66" stroke={P.woodLight} strokeWidth="2.5" strokeLinecap="round" />
        <g transform="translate(5 54)">{props.crest}</g>
        {props.emblem && <g transform="translate(8 84)">{props.emblem}</g>}
      </g>

      {emptyRows.map((at, i) => (
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

      {/* The yard: vehicles at the depot, goods in store. */}
      <g>
        {props.vehiclesHome.slice(0, 4).map((type, i) => (
          <g key={`${type}-${i * 1}`} transform={`translate(${26 + i * 30} ${H - 9}) scale(1.3)`}>
            <VehicleGlyph type={type} />
          </g>
        ))}
        {Array.from({ length: piles }, (_, i) => (
          <g key={`pile-${i * 1}`} transform={`translate(${W - 20 - i * 16} ${H - 13})`}>
            <rect width="13" height="10" rx="1.5" fill={P.wood} stroke={P.night} />
            <rect x="2" y="-8" width="10" height="8" rx="1.5" fill={P.woodLight} stroke={P.night} />
            <path d="M0 5 H13" stroke={P.night} strokeWidth="0.8" />
          </g>
        ))}
      </g>
    </svg>
  );
}
