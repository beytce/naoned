import { crestColours } from "./crest.js";
import { P } from "./palette.js";

/** A palace's façade, from what its house won (R5). */
export interface Facade {
  plot: number;
  color: string | null;
  /** Generations of its line: a floor each, up to four. */
  generations: number;
  /** Atouts unlocked: a star each, up to five. */
  atouts: number;
  /** Cities held as Podestà: a shield each, up to three. */
  cities: number;
  doge: boolean;
}

const W = 56;

/** 0, 1, … n − 1: the floors, stars and shields drawn, each its own key. */
const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
const GAP = 6;

/**
 * One Venetian palace on the water (Lagune): its floors from its line, gothic windows, a banner
 * in its crest's colour, stars for the Atouts it unlocked, shields for its cities, the corno on
 * the roof of a Doge. An empty plot is a dim outline waiting for its house.
 */
function Palace({ x, f }: { x: number; f: Facade | null }) {
  if (!f) {
    return (
      <g transform={`translate(${x} 0)`} opacity="0.35">
        <rect
          x="4"
          y="60"
          width={W - 8}
          height="44"
          rx="3"
          fill="none"
          stroke={P.line}
          strokeDasharray="3 3"
        />
      </g>
    );
  }
  const floors = Math.min(4, Math.max(1, f.generations));
  const h = 30 + floors * 16;
  const top = 104 - h;
  const [field, edge] = crestColours(f.color ?? "gold");
  return (
    <g transform={`translate(${x} 0)`}>
      {/* The façade, the colour of the lagoon's stone at night. */}
      <rect x="2" y={top} width={W - 4} height={h} rx="3" fill={P.night3} stroke={P.line} />
      {range(floors).map((i) => (
        <g key={i}>
          {[0, 1, 2].map((k) => (
            <path
              key={k}
              d={`M${12 + k * 14} ${top + 24 + i * 16} v-6 q3 -5 6 0 v6 z`}
              fill={P.gold}
              fillOpacity={0.55}
            />
          ))}
        </g>
      ))}
      {/* The water door. */}
      <path d={`M${W / 2 - 6} 104 v-10 q6 -8 12 0 v10 z`} fill={P.night} />
      {/* The banner of its crest. */}
      <path d={`M${W - 10} ${top} v-16 h10 l-4 4 l4 4 h-10`} fill={field} stroke={edge} />
      <line x1={W - 10} y1={top} x2={W - 10} y2={top - 18} stroke={P.cream} strokeOpacity="0.6" />
      {/* Stars for the Atouts, shields for the cities. */}
      {range(Math.min(5, f.atouts)).map((i) => (
        <circle key={`s${i}`} cx={8 + i * 6} cy={top + 6} r="1.8" fill={P.gold} />
      ))}
      {range(Math.min(3, f.cities)).map((i) => (
        <path key={`c${i}`} d={`M${8 + i * 9} ${top + 10} h6 v4 q-3 4 -6 0 z`} fill={P.lagoon} />
      ))}
      {f.doge && (
        // The corno ducale on the roof.
        <path d={`M14 ${top} q4 -14 16 -12 q6 2 4 12 z`} fill={P.gold} stroke={P.goldDeep} />
      )}
    </g>
  );
}

/**
 * The Grand Canal: its palaces side by side, plot 1 by the Doges' palace on the left, over the
 * water. `count` plots drawn (the forty in the ranking, the first few on the sign-in screen).
 */
export function CanalStrip({
  facades,
  count,
  className = "",
  label,
  height,
}: {
  facades: Facade[];
  count: number;
  className?: string;
  label: string;
  /** Drawn this tall in px, as wide as it needs (the ranking scrolls it); else to its box. */
  height?: number;
}) {
  const width = count * (W + GAP) + GAP;
  const byPlot = new Map(facades.map((f) => [f.plot, f]));
  return (
    <svg
      viewBox={`0 0 ${width} 130`}
      className={className}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMax meet"
      style={height ? { height, width: Math.round((width * height) / 130) } : undefined}
    >
      <defs>
        <linearGradient id="canal-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.info} stopOpacity="0.35" />
          <stop offset="1" stopColor={P.night} stopOpacity="0" />
        </linearGradient>
      </defs>
      {range(count).map((i) => (
        <Palace key={i} x={GAP + i * (W + GAP)} f={byPlot.get(i + 1) ?? null} />
      ))}
      <rect x="0" y="104" width={width} height="26" fill="url(#canal-water)" />
      <path
        d={`M0 112 ${Array.from({ length: Math.ceil(width / 40) }, () => "q10 -4 20 0 t20 0").join(" ")}`}
        fill="none"
        stroke={P.info}
        strokeOpacity="0.4"
      />
    </svg>
  );
}
