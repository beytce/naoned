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
          <stop offset="0%" stopColor="#3A2C21" />
          <stop offset="60%" stopColor="#2A2019" />
          <stop offset="100%" stopColor="#1E1611" stopOpacity="0" />
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
          fill="#2A2019"
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
