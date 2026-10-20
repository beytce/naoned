import { memo } from "react";
import { P } from "../../art/palette.js";
import {
  GARDA,
  HILLS,
  LAGOON,
  MAP_H,
  MAP_W,
  MOUNTAINS,
  RIVERS,
  SEA,
  WOODS,
} from "../../art/veneto.js";

/**
 * The Veneto by night, as the world map's ground: dark land under a faint lamp-light, the sea and
 * the lagoon a deep teal, the Alps as pale outlines, the rivers as threads of light. Quiet on
 * purpose: the cities and the carts are what the eye should find. Drawn once.
 */
export const NightTerrain = memo(function NightTerrain() {
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      className="block"
    >
      <defs>
        <radialGradient id="nt-land" cx="48%" cy="58%" r="70%">
          <stop offset="0%" stopColor="#2E4766" />
          <stop offset="60%" stopColor="#223853" />
          <stop offset="100%" stopColor="#16263E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nt-sea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#173B3D" />
          <stop offset="100%" stopColor="#0E2326" stopOpacity="0" />
        </linearGradient>
        <pattern id="nt-waves" width="24" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M0 6 Q6 2 12 6 T24 6"
            fill="none"
            stroke={P.lagoon}
            strokeOpacity="0.16"
            strokeWidth="0.7"
          />
        </pattern>
        <pattern id="nt-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.55" fill={P.goldSoft} opacity="0.13" />
          <circle cx="10" cy="11" r="0.4" fill={P.goldSoft} opacity="0.08" />
        </pattern>
      </defs>
      <ellipse
        cx={MAP_W * 0.48}
        cy={MAP_H * 0.55}
        rx={MAP_W * 0.62}
        ry={MAP_H * 0.56}
        fill="url(#nt-land)"
      />
      <rect width={MAP_W} height={MAP_H} fill="url(#nt-dots)" />
      {MOUNTAINS.map(([x, y, s]) => (
        <path
          key={`m${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M-17 0 L-4 -23 L3 -13 L9 -19 L21 0"
          fill="#223853"
          stroke={P.goldSoft}
          strokeOpacity="0.16"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      ))}
      {WOODS.map(([x, y]) => (
        <path
          key={`w${x}-${y}`}
          transform={`translate(${x} ${y})`}
          d="M0 -6 L3.5 1 H-3.5 Z"
          fill={P.lagoon}
          opacity="0.12"
        />
      ))}
      {HILLS.map(([x, y, s]) => (
        <path
          key={`h${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M-16 0 Q-6 -13 0 -12 Q8 -11 16 0"
          fill="none"
          stroke={P.goldSoft}
          strokeOpacity="0.14"
        />
      ))}
      <path d={GARDA} fill="#173B3D" stroke={P.lagoon} strokeOpacity="0.25" strokeWidth="0.8" />
      <path d={SEA} fill="url(#nt-sea)" />
      <path d={SEA} fill="url(#nt-waves)" />
      <path d={LAGOON} fill="#1B4446" opacity="0.85" />
      {RIVERS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={P.lagoon}
          strokeOpacity="0.22"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
});

/**
 * Ink and washes of the portolan: a blue chart at dusk (slate land, deep blue water, pale cyan
 * ink), its own colours in every palette. The sepia one read as too dark (playtest, 20 October).
 */
const INK = "#BFE3FF";
const LAND = "#3A5677";
const LAND_DEEP = "#2B4463";
const WATER = "#174A78";
const WATER_DEEP = "#103A62";
const WOOD = "#5FA88E";

/** Where the rhumb lines of the chart start: the wind rose, out in the Adriatic. */
const ROSE: [number, number] = [334, 420];

/**
 * The Veneto as a Quattrocento portolan: slate-blue land, the Alps in hatched ink, the rivers in a
 * double line, the sea and the lagoon washed in deep blue, rhumb lines from a wind rose, the regions
 * named in spaced capitals. Lit enough to be read; the cities and the carts stay what the eye
 * finds first. Drawn once.
 */
export const PortolanTerrain = memo(function PortolanTerrain() {
  const rhumbs = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8);
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      className="block"
    >
      <defs>
        <radialGradient id="pt-land" cx="46%" cy="55%" r="72%">
          <stop offset="0%" stopColor={LAND} />
          <stop offset="70%" stopColor={LAND_DEEP} />
          <stop offset="100%" stopColor={P.night} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pt-sea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={WATER} />
          <stop offset="100%" stopColor={WATER_DEEP} />
        </linearGradient>
        <pattern id="pt-grain" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.45" fill={INK} opacity="0.12" />
          <circle cx="7" cy="7" r="0.35" fill={INK} opacity="0.08" />
        </pattern>
        <pattern id="pt-waves" width="20" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0 5 Q5 1.5 10 5 T20 5"
            fill="none"
            stroke={INK}
            strokeOpacity="0.22"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <ellipse
        cx={MAP_W * 0.47}
        cy={MAP_H * 0.52}
        rx={MAP_W * 0.68}
        ry={MAP_H * 0.6}
        fill="url(#pt-land)"
      />
      <rect width={MAP_W} height={MAP_H} fill="url(#pt-grain)" />
      {/* Rhumb lines from the wind rose, under everything else. */}
      <g stroke={INK} strokeOpacity="0.1" strokeWidth="0.5">
        {rhumbs.map((a) => (
          <line
            key={a}
            x1={ROSE[0]}
            y1={ROSE[1]}
            x2={ROSE[0] + Math.cos(a) * 520}
            y2={ROSE[1] + Math.sin(a) * 520}
          />
        ))}
      </g>
      {/* The Alps: ink peaks, hatched on their shaded side. */}
      {MOUNTAINS.map(([x, y, s]) => (
        <g key={`m${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-17 0 L-4 -23 L3 -13 L9 -19 L21 0 Z" fill={LAND_DEEP} />
          <path
            d="M-17 0 L-4 -23 L3 -13 L9 -19 L21 0"
            fill="none"
            stroke={INK}
            strokeOpacity="0.55"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path
            d="M-2 -18 L-6 -4 M1 -14 L-1 -3 M4 -12 L4 -2 M10 -15 L12 -4 M14 -9 L16 -2"
            stroke={INK}
            strokeOpacity="0.3"
            strokeWidth="0.6"
          />
        </g>
      ))}
      {HILLS.map(([x, y, s]) => (
        <path
          key={`h${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M-16 0 Q-6 -13 0 -12 Q8 -11 16 0 M-9 -2 Q-3 -9 2 -8"
          fill="none"
          stroke={INK}
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
      ))}
      {WOODS.map(([x, y]) => (
        <g key={`w${x}-${y}`} transform={`translate(${x} ${y})`}>
          <circle cy="-3" r="3.2" fill={WOOD} opacity="0.5" />
          <path d="M0 -1 V3" stroke={INK} strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
      ))}
      {/* Waters: Garda, the Adriatic and the lagoon, a coast line in ink, the lido. */}
      <path d={GARDA} fill={WATER} stroke={INK} strokeOpacity="0.45" strokeWidth="0.8" />
      <path d={SEA} fill="url(#pt-sea)" />
      <path d={SEA} fill="url(#pt-waves)" />
      <path d={SEA} fill="none" stroke={INK} strokeOpacity="0.5" strokeWidth="1" />
      <path d={LAGOON} fill={WATER} stroke={INK} strokeOpacity="0.45" strokeWidth="0.8" />
      <path
        d="M332 222 Q322 256 326 290 Q328 314 318 334"
        fill="none"
        stroke={INK}
        strokeOpacity="0.6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* The Po, the Adige, the Brenta and the Piave: a double line, ink and water. */}
      {RIVERS.map((d) => (
        <g key={d}>
          <path
            d={d}
            fill="none"
            stroke={INK}
            strokeOpacity="0.4"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d={d} fill="none" stroke={WATER} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      {/* The regions named as on a chart. */}
      <g
        fill={INK}
        fillOpacity="0.55"
        fontFamily="Space Mono, monospace"
        fontSize="8"
        letterSpacing="4"
        textAnchor="middle"
      >
        <text x="96" y="424" transform="rotate(-4 96 424)">
          TERRAFERMA
        </text>
        <text x="200" y="128">
          DOLOMITI
        </text>
        <text x="300" y="300" transform="rotate(76 300 300)">
          LAGUNA
        </text>
        <text x="346" y="160" fontSize="6.5" letterSpacing="3" transform="rotate(90 346 160)">
          MARE ADRIATICUM
        </text>
      </g>
      {/* The wind rose: its lily to the north. */}
      <g transform={`translate(${ROSE[0]} ${ROSE[1]})`} opacity="0.85">
        <circle r="13" fill={WATER_DEEP} stroke={INK} strokeOpacity="0.6" strokeWidth="0.7" />
        <path d="M0 -12 L2.6 0 L0 12 L-2.6 0 Z" fill={P.gold} />
        <path d="M-12 0 L0 -2.6 L12 0 L0 2.6 Z" fill={P.goldDeep} />
        <text
          y="-16"
          textAnchor="middle"
          fontSize="6.5"
          fill={P.gold}
          fontFamily="Archivo Variable, sans-serif"
          fontWeight="800"
        >
          N
        </text>
      </g>
    </svg>
  );
});
