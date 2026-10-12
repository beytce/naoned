import { memo } from "react";
import { P } from "./palette.js";

/**
 * The map of the Veneto: terrain, cities, depots, roads and vehicles. Positions come from the
 * real latitude and longitude, squeezed into a portrait card (360 × 480) that fills a phone.
 */
export const MAP_W = 360;
export const MAP_H = 440;

/** Cities and depots, from their real places, spread a little to fill a portrait card. */
export const PLACES: Record<string, [number, number]> = {
  venezia: [302, 246],
  padova: [218, 262],
  verona: [70, 226],
  vicenza: [158, 192],
  treviso: [270, 158],
  mantova: [56, 344],
  ferrara: [192, 396],
  // The regions' depots: the merchant's counting house, where the vehicles leave from.
  terraferma: [134, 300],
  lagoon: [292, 322],
  dolomites: [236, 70],
};

/** Roads that must bend a given way (to pass beside a city rather than through it). */
const BENDS: Record<string, number> = { "terraferma:venezia": 0.26, "dolomites:venezia": -0.2 };

/** A small deterministic bend for each road, so that roads curve instead of crossing straight. */
function bend(route: string): number {
  if (route in BENDS) return BENDS[route] ?? 0;
  let h = 0;
  for (let i = 0; i < route.length; i++) h = (h * 31 + route.charCodeAt(i)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 0.36;
}

export interface Curve {
  from: [number, number];
  ctrl: [number, number];
  to: [number, number];
}

/** The road `region:city` as a quadratic curve from the depot to the city. */
export function roadCurve(route: string): Curve | null {
  const [region = "", city = ""] = route.split(":");
  const from = PLACES[region];
  const to = PLACES[city];
  if (!from || !to) return null;
  const [x0, y0] = from;
  const [x1, y1] = to;
  const k = bend(route);
  // Control point: the middle, pushed sideways by a share of the length.
  const ctrl: [number, number] = [(x0 + x1) / 2 - (y1 - y0) * k, (y0 + y1) / 2 + (x1 - x0) * k];
  return { from, ctrl, to };
}

export function curvePath(c: Curve): string {
  return `M${c.from[0]} ${c.from[1]} Q${c.ctrl[0]} ${c.ctrl[1]} ${c.to[0]} ${c.to[1]}`;
}

/** Point and heading at `t` (0 at the depot, 1 at the city). */
export function pointOn(c: Curve, t: number): { x: number; y: number; dx: number; dy: number } {
  const k = Math.max(0, Math.min(1, t));
  const a = 1 - k;
  const x = a * a * c.from[0] + 2 * a * k * c.ctrl[0] + k * k * c.to[0];
  const y = a * a * c.from[1] + 2 * a * k * c.ctrl[1] + k * k * c.to[1];
  const dx = 2 * a * (c.ctrl[0] - c.from[0]) + 2 * k * (c.to[0] - c.ctrl[0]);
  const dy = 2 * a * (c.ctrl[1] - c.from[1]) + 2 * k * (c.to[1] - c.ctrl[1]);
  return { x, y, dx, dy };
}

/** The part of the road between `t0` and `t1`, as a path (for the travelled stretch). */
export function partialPath(c: Curve, t0: number, t1: number, steps = 24): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = pointOn(c, t0 + ((t1 - t0) * i) / steps);
    pts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const mountain = (x: number, y: number, s: number) => (
  <g key={`m-${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-17 0 L-4 -23 L3 -13 L9 -19 L21 0 Z" fill="#2B4744" />
    <path d="M-4 -23 L3 -13 L9 -19 L21 0 L-1 0 Z" fill="#203936" />
    <path d="M-4 -23 L1 -14 L-2 -12 L-5 -16 L-8 -11 Z" fill={P.cream} opacity="0.9" />
    <path d="M9 -19 L13 -13 L10 -12 Z" fill={P.cream} opacity="0.75" />
  </g>
);

const tree = (x: number, y: number) => (
  <g key={`t-${x}-${y}`} transform={`translate(${x} ${y})`}>
    <path d="M0 -7 L4 1 H-4 Z" fill="#2F5A45" />
    <path d="M0 -10 L3 -3 H-3 Z" fill="#3A6B50" />
  </g>
);

const hill = (x: number, y: number, s: number) => (
  <g key={`h-${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 0 Q-6 -13 0 -12 Q8 -11 16 0 Z" fill="#33503F" />
    <path d="M-6 -9 Q0 -13 6 -8" fill="none" stroke={P.goldSoft} strokeOpacity="0.25" />
  </g>
);

/** Names of the three regions, written large on the land like an old map. */
const regionName = (x: number, y: number, text: string, rotate = 0) => (
  <text
    key={text}
    x={x}
    y={y}
    transform={`rotate(${rotate} ${x} ${y})`}
    textAnchor="middle"
    fontSize="13"
    letterSpacing="5"
    fontWeight="800"
    fill={P.goldSoft}
    opacity="0.13"
    fontFamily="Archivo Variable, sans-serif"
  >
    {text}
  </text>
);

/** The Alps along the north: x, y, scale. */
export const MOUNTAINS: [number, number, number][] = [
  [20, 74, 1.1],
  [56, 58, 1.3],
  [96, 80, 1],
  [132, 50, 1.4],
  [176, 74, 1.1],
  [204, 40, 1.5],
  [282, 46, 1.3],
  [322, 78, 1.1],
  [160, 28, 1.1],
  [84, 26, 1.1],
  [26, 30, 1.2],
  [340, 30, 1.1],
  [268, 96, 0.9],
  [124, 100, 0.8],
];

/** Woods of the Montello and the Cansiglio, the Berici. */
export const WOODS: [number, number][] = [
  [246, 128],
  [256, 136],
  [236, 138],
  [300, 112],
  [312, 120],
  [290, 122],
  [116, 160],
  [126, 168],
  [106, 170],
];

/** The Euganean and Berici hills: x, y, scale. */
export const HILLS: [number, number, number][] = [
  [188, 292, 0.9],
  [204, 300, 0.7],
  [150, 222, 0.8],
];

/** Lake Garda, the lagoon and the rivers (the Po, the Adige, the Brenta, the Piave), as paths. */
export const GARDA = "M30 130 Q46 152 42 190 Q38 210 26 206 Q18 178 22 150 Q24 132 30 130 Z";
export const LAGOON =
  "M326 222 Q306 236 308 262 Q312 290 300 320 Q290 304 284 276 Q282 248 302 228 Z";
export const RIVERS = [
  "M0 368 Q60 352 110 372 Q160 390 210 378 Q258 368 296 386 Q306 392 314 402",
  "M58 110 Q64 180 72 222 Q90 266 140 322 Q200 344 256 342 Q286 340 310 348",
  "M204 70 Q196 130 208 180 Q220 222 250 254 Q268 276 288 284",
  "M268 40 Q276 96 290 146 Q304 188 330 214",
];

export const SEA = `M${MAP_W} 120 Q338 160 342 210 Q346 236 330 256 Q316 276 322 312 Q330 352 316 392 Q306 420 312 ${MAP_H} H${MAP_W} Z`;

/** The land, the lagoon, the sea, the Alps, rivers and woods. Drawn once (memoised). */
export const VenetoTerrain = memo(function VenetoTerrain() {
  return (
    <g>
      <defs>
        <radialGradient id="vn-land" cx="45%" cy="60%" r="80%">
          <stop offset="0%" stopColor="#2E4A37" />
          <stop offset="55%" stopColor="#233A2E" />
          <stop offset="100%" stopColor="#152620" />
        </radialGradient>
        <linearGradient id="vn-alps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#13222A" />
          <stop offset="75%" stopColor="#1C3333" />
          <stop offset="100%" stopColor="#233A2E" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vn-sea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1E4C50" />
          <stop offset="100%" stopColor="#10292D" />
        </linearGradient>
        <pattern id="vn-fields" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 18 L18 0" stroke={P.goldSoft} strokeOpacity="0.055" strokeWidth="1" />
          <circle cx="4" cy="5" r="0.7" fill={P.goldSoft} opacity="0.12" />
        </pattern>
        <pattern id="vn-waves" width="22" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0 5 Q5.5 1 11 5 T22 5"
            fill="none"
            stroke={P.lagoon}
            strokeOpacity="0.3"
            strokeWidth="0.8"
          />
        </pattern>
        <radialGradient id="vn-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={P.gold} stopOpacity="0.35" />
          <stop offset="100%" stopColor={P.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vn-vignette" cx="50%" cy="50%" r="72%">
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="url(#vn-land)" />
      <rect width={MAP_W} height={MAP_H} fill="url(#vn-fields)" />
      {/* The Alps and the Dolomites along the north. */}
      <rect width={MAP_W} height="130" fill="url(#vn-alps)" />
      {MOUNTAINS.map(([x, y, s]) => mountain(x, y, s))}
      {/* Woods of the Montello and the Cansiglio, the Euganean and Berici hills. */}
      {WOODS.map(([x, y]) => tree(x, y))}
      {HILLS.map(([x, y, s]) => hill(x, y, s))}
      {/* Lake Garda. */}
      <path d={GARDA} fill="#235A58" stroke={P.lagoon} strokeOpacity="0.5" />
      {/* The Adriatic, the lagoon and its barrier islands. */}
      <path d={SEA} fill="url(#vn-sea)" />
      <path d={SEA} fill="url(#vn-waves)" />
      <path d={LAGOON} fill="#245A58" opacity="0.9" />
      <path
        d="M332 222 Q322 256 326 290 Q328 314 318 334"
        fill="none"
        stroke={P.goldSoft}
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* The Po, the Adige, the Brenta and the Piave. */}
      {RIVERS.map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#10292D" strokeWidth="4.5" strokeLinecap="round" />
          <path
            d={d}
            fill="none"
            stroke={P.lagoon}
            strokeOpacity="0.7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      ))}
      {regionName(206, 338, "TERRAFERMA", -8)}
      {regionName(220, 112, "DOLOMITI", -4)}
      {regionName(334, 380, "LAGUNA", 76)}
      {/* Compass rose. */}
      <g transform="translate(32 410)" opacity="0.7">
        <circle r="15" fill={P.night} fillOpacity="0.4" stroke={P.gold} strokeOpacity="0.4" />
        <path d="M0 -14 L3 0 L0 14 L-3 0 Z" fill={P.gold} />
        <path d="M-14 0 L0 -3 L14 0 L0 3 Z" fill={P.goldDeep} />
        <text
          y="-18"
          textAnchor="middle"
          fontSize="7"
          fill={P.gold}
          fontFamily="Archivo Variable, sans-serif"
          fontWeight="800"
        >
          N
        </text>
      </g>
      <text
        x="352"
        y="430"
        textAnchor="end"
        fontSize="6.5"
        letterSpacing="3"
        fill={P.lagoon}
        opacity="0.7"
        fontFamily="Space Mono, monospace"
      >
        MARE ADRIATICUM
      </text>
      <rect width={MAP_W} height={MAP_H} fill="url(#vn-vignette)" pointerEvents="none" />
    </g>
  );
});

/** A walled city seen from afar: ramparts and three towers. */
export function CityGlyph({ dim }: { dim?: boolean }) {
  const wall = dim ? "#3A4E4E" : P.cream;
  const roof = dim ? "#2A3A3A" : P.vermilion;
  return (
    <g>
      <path d="M-11 6 V-1 H-7 V-4 H-3 V-1 H3 V-4 H7 V-1 H11 V6 Z" fill={wall} />
      <rect x="-2" y="-11" width="4" height="10" fill={wall} />
      <path d="M-3 -11 L0 -16 L3 -11 Z" fill={roof} />
      <path d="M-10 -1 L-8 -5 L-6 -1 Z" fill={roof} />
      <path d="M6 -1 L8 -5 L10 -1 Z" fill={roof} />
      <rect x="-1.5" y="1.5" width="3" height="4.5" rx="1.5" fill={P.night} />
    </g>
  );
}

/** The merchant's depot: a glowing hexagon with a warehouse door. */
export function DepotGlyph() {
  return (
    <g>
      <circle r="20" fill={P.gold} opacity="0.12" />
      <circle r="14" fill={P.gold} opacity="0.18" />
      <path
        d="M0 -11 L9.5 -5.5 V5.5 L0 11 L-9.5 5.5 V-5.5 Z"
        fill={P.night}
        stroke={P.gold}
        strokeWidth="2"
      />
      <path d="M-5 5 V-1 L0 -4 L5 -1 V5 Z" fill={P.gold} />
      <rect x="-2" y="1" width="4" height="4" fill={P.night} />
    </g>
  );
}

/**
 * A vehicle seen from the side, facing right (the caller mirrors it). Loaded: crates on the bed,
 * coloured like the goods.
 */
export function VehicleGlyph({
  type,
  load,
}: {
  type: string;
  /** Colour of the goods, none when empty. */
  load?: string | null;
}) {
  const wheel = (cx: number, r: number) => (
    <g key={cx}>
      <circle cx={cx} cy="4" r={r} fill={P.night} stroke={P.woodLight} strokeWidth="1.4" />
      <circle cx={cx} cy="4" r="0.9" fill={P.woodLight} />
    </g>
  );
  if (type === "mule") {
    return (
      <g>
        <path
          d="M-8 -2 Q-8 -6 -3 -6 H5 L8 -10 L11 -9 L9 -4 Q9 0 6 0 L6 6 M-6 0 L-6 6 M-2 0 L-2 6 M3 0 L3 6"
          fill="none"
          stroke={P.woodLight}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M-8 -2 Q-8 -6 -3 -6 H5 Q8 -2 6 0 H-6 Q-8 0 -8 -2 Z" fill={P.wood} />
        {load && <rect x="-6" y="-11" width="9" height="5" rx="1" fill={load} stroke={P.night} />}
      </g>
    );
  }
  const wagon = type === "wagon";
  return (
    <g>
      <path d="M-13 0 H-17" stroke={P.woodLight} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="-12" y="-3" width={wagon ? 25 : 20} height="5" rx="1" fill={P.wood} />
      {wagon ? (
        <path
          d="M-11 -3 Q-11 -14 0.5 -14 Q12 -14 12 -3 Z"
          fill={P.cream}
          stroke={P.night}
          strokeWidth="0.8"
        />
      ) : (
        load && (
          <g>
            <rect x="-10" y="-9" width="7" height="6" rx="1" fill={load} stroke={P.night} />
            <rect x="-2" y="-8" width="7" height="5" rx="1" fill={load} stroke={P.night} />
          </g>
        )
      )}
      {wagon && load && <rect x="-4" y="-9" width="9" height="5" rx="1" fill={load} />}
      {wheel(-7, wagon ? 4 : 3.5)}
      {wheel(wagon ? 9 : 5, wagon ? 4 : 3.5)}
    </g>
  );
}

/** Colour of a load on the map, by resource. */
export const GOODS_COLOUR: Record<string, string> = {
  wheat: P.gold,
  flour: P.goldSoft,
  bread: P.woodLight,
  clay: P.clay,
  bricks: P.vermilion,
  wood: P.wood,
  planks: P.woodLight,
  spices: P.vermilionDeep,
  silk: P.violet,
  salt: P.cream,
  wine: "#7A2E3A",
  furs: "#8A6A4A",
  cloth: P.lagoon,
};

/** A bandits' camp: a tent and a little fire. */
export function CampGlyph() {
  return (
    <g>
      <path d="M-8 5 L0 -8 L8 5 Z" fill={P.vermilionDeep} stroke={P.night} strokeWidth="1" />
      <path d="M0 -8 L0 5" stroke={P.night} strokeWidth="1" />
      <path d="M9 5 Q11 0 12 4 Q13 1 14 5 Z" fill={P.gold} />
    </g>
  );
}
