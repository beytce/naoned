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
          <stop offset="0%" stopColor="#1E1611" />
          <stop offset="75%" stopColor="#2A2A20" />
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

/** A beast of burden seen from the side, facing right, its body from x to x + 11. */
function beast(x: number, coat: string, horned = false) {
  return (
    <g>
      <path
        d={`M${x + 1} 1 V8 M${x + 3.5} 1 V8 M${x + 8} 1 V8 M${x + 10.5} 1 V8`}
        stroke={coat}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d={`M${x} -1 Q${x} -5 ${x + 3} -5 H${x + 10} L${x + 13} -8 L${x + 16} -6.5 L${x + 13.5} -3 Q${x + 12} 2 ${x + 9} 2 H${x + 2} Q${x} 2 ${x} -1 Z`}
        fill={coat}
        stroke={P.night}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {horned ? (
        <path
          d={`M${x + 12.5} -7.5 Q${x + 12} -10.5 ${x + 14.5} -10.5`}
          fill="none"
          stroke={P.cream}
          strokeWidth="1"
        />
      ) : (
        <path
          d={`M${x + 12.6} -7.6 L${x + 12} -10.5 L${x + 14} -8.2`}
          fill={coat}
          stroke={P.night}
          strokeWidth="0.6"
        />
      )}
    </g>
  );
}

/**
 * A vehicle seen from the side, facing right (the caller mirrors it), one drawing per step:
 * the mule with its packs, the handcart, the ox wagon, the great wagon and its two horses.
 * Loaded: the goods' colour on the packs or the crates.
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
      <circle cx={cx} cy={8 - r} r={r} fill={P.night} stroke={P.woodLight} strokeWidth="1.4" />
      <circle cx={cx} cy={8 - r} r="0.9" fill={P.woodLight} />
    </g>
  );
  const goods = load ?? P.wood;
  const cover = (x0: number, x1: number, top: number) => (
    <path
      d={`M${x0} -2 Q${x0} ${top} ${(x0 + x1) / 2} ${top} Q${x1} ${top} ${x1} -2 Z`}
      fill={P.cream}
      stroke={P.night}
      strokeWidth="0.8"
    />
  );
  if (type === "mule") {
    // In profile, read at a glance: its two long ears, its head carried low, its tail, the pack
    // saddle on its back and a bag hanging at its flank.
    const coat = P.woodLight;
    return (
      <g>
        <path
          d="M-8 0 V8 M-5.5 0.5 V8 M1 0.5 V8 M3.5 0 V8"
          stroke={coat}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M-9.5 -2.5 Q-11.5 0 -10.5 3.5"
          fill="none"
          stroke={P.night}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M-9.5 -2 Q-9.5 -5 -6 -5 H2 Q4.5 -5 5.5 -7.5 L8.5 -8 Q10.5 -7 11 -3.8 L9.6 -2.8 L7.5 -4.4 Q6 -1.5 4 1.2 H-7 Q-9.5 1.2 -9.5 -2 Z"
          fill={coat}
          stroke={P.night}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path
          d="M6.6 -7.6 L5.4 -12.5 L7.6 -8.1 M7.8 -7.9 L7.6 -12.8 L9 -7.8"
          fill={coat}
          stroke={P.night}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <circle cx="8.6" cy="-6.2" r="0.6" fill={P.night} />
        <rect
          x="-7.5"
          y="-10"
          width="9.5"
          height="5.5"
          rx="1.5"
          fill={goods}
          stroke={P.night}
          strokeWidth="0.8"
        />
        <path d="M-7.5 -7.2 H2" stroke={P.night} strokeWidth="0.6" />
        <rect
          x="-5.5"
          y="-4.6"
          width="5.5"
          height="5"
          rx="1.6"
          fill={goods}
          stroke={P.night}
          strokeWidth="0.8"
        />
      </g>
    );
  }
  if (type === "wagon") {
    return (
      <g>
        <path d="M-1 -1 H5" stroke={P.woodLight} strokeWidth="1.4" />
        <rect x="-19" y="-2" width="18" height="4" rx="1" fill={P.wood} />
        {cover(-18.5, -1.5, -12)}
        {load && <rect x="-14" y="-6" width="8" height="4" rx="1" fill={load} />}
        {wheel(-15, 4)}
        {wheel(-5, 4)}
        {beast(3, "#A8784A", true)}
      </g>
    );
  }
  if (type === "great_wagon") {
    return (
      <g>
        <path d="M-3 -1 H2" stroke={P.woodLight} strokeWidth="1.4" />
        <rect x="-19" y="-2" width="17" height="4.5" rx="1" fill={P.wood} />
        {cover(-19, -2, -14)}
        <path d="M-13.5 -2 V-11 M-7.5 -2 V-11" stroke={P.woodLight} strokeWidth="0.8" />
        {load && <rect x="-14" y="-7" width="9" height="5" rx="1" fill={load} />}
        {wheel(-15, 4.5)}
        {wheel(-5.5, 4.5)}
        <g opacity="0.75">{beast(3, P.wood)}</g>
        {beast(0, "#5A3D22")}
      </g>
    );
  }
  // The cart: a bed on one big wheel, pulled by its shafts.
  return (
    <g>
      <path d="M6 -1 L17 1" stroke={P.woodLight} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-13 -3 H7 L6 2 H-12 Z" fill={P.wood} stroke={P.night} strokeWidth="0.8" />
      {load && (
        <g>
          <rect x="-11" y="-9" width="8" height="6" rx="1" fill={load} stroke={P.night} />
          <rect x="-2" y="-8" width="7" height="5" rx="1" fill={load} stroke={P.night} />
        </g>
      )}
      {wheel(-3, 5.5)}
    </g>
  );
}
