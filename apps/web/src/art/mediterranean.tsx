import { memo } from "react";
import { P } from "./palette.js";

/**
 * The empire's world map (lot D of the UX audit): Europe and the Mediterranean as a portolan, from
 * Flanders to the Levant, on their real longitudes and latitudes. A fisheye centred on Venice
 * gives room to the regions next to it (Friuli, Romagna, Lombardy), where a flat chart would pile
 * them on one another, and keeps the far ones where they belong.
 */

export type LonLat = readonly [number, number];

/** Venice, the centre of the chart. */
const VENICE: LonLat = [12.33, 45.44];
/** Pixels by degree of longitude, at the centre before the fisheye. */
const SCALE = 10;
/** A degree of latitude, longer than a degree of longitude at 45° north. */
const LAT = SCALE / Math.cos((45 * Math.PI) / 180);
/** The fisheye: so much larger at Venice, back to 1 at RADIUS. */
const MAGNIFY = 1.3;
const RADIUS = 300;

/** A place on the chart, in the units of WORLD_VIEW. */
export function project([lon, lat]: LonLat): [number, number] {
  const x = (lon - VENICE[0]) * SCALE;
  const y = (VENICE[1] - lat) * LAT;
  const r = Math.hypot(x, y);
  const k = (1 + MAGNIFY) / (1 + (MAGNIFY * r) / RADIUS);
  return [ORIGIN[0] + x * k, ORIGIN[1] + y * k];
}

/** Venice on the chart, and the frame around the ten regions. */
const ORIGIN: [number, number] = [165, 140];
export const WORLD_VIEW = { x: 0, y: 0, w: 440, h: 330 } as const;

/** Each region's seat (its counter's town, moved a little where two would touch). */
export const SEATS: Record<string, LonLat> = {
  veneto: VENICE,
  friuli: [13.9, 46.3],
  lombardia: [9.4, 45.5],
  romagna: [12.6, 43.9],
  dalmazia: [16.4, 43.5],
  germania: [10.9, 48.4],
  fiandra: [3.2, 51.1],
  grecia: [22.3, 37.6],
  costantinopoli: [28.98, 41.0],
  levante: [35.5, 33.9],
};

export const seatOf = (code: string): [number, number] => project(SEATS[code] ?? VENICE);

/**
 * The roads between regions, by land (the carts) or by sea (the ships), through their waypoints:
 * the Brenner to Germany, the Rhine to Flanders, the Adriatic to the Levant.
 */
export const ROUTES: { from: string; to: string; sea: boolean; via: LonLat[] }[] = [
  { from: "veneto", to: "lombardia", sea: false, via: [[10.99, 45.44]] },
  { from: "veneto", to: "friuli", sea: false, via: [] },
  { from: "veneto", to: "romagna", sea: false, via: [[12.1, 44.8]] },
  {
    from: "veneto",
    to: "germania",
    sea: false,
    via: [
      [11.35, 46.5],
      [11.4, 47.3],
    ],
  },
  {
    from: "germania",
    to: "fiandra",
    sea: false,
    via: [
      [8.7, 50.1],
      [6.9, 50.9],
    ],
  },
  { from: "veneto", to: "dalmazia", sea: true, via: [[13.4, 44.6]] },
  {
    from: "dalmazia",
    to: "grecia",
    sea: true,
    via: [
      [18.2, 42.1],
      [19.0, 40.2],
      [20.4, 38.4],
      [21.6, 36.9],
    ],
  },
  {
    from: "grecia",
    to: "costantinopoli",
    sea: true,
    via: [
      [23.6, 36.3],
      [25.0, 37.8],
      [25.9, 39.6],
      [26.5, 40.3],
      [27.6, 40.75],
    ],
  },
  {
    from: "grecia",
    to: "levante",
    sea: true,
    via: [
      [23.6, 36.3],
      [26.5, 35.7],
      [30.0, 35.4],
      [33.5, 34.2],
    ],
  },
];

/** A road from one region to another, through the others if no road joins them directly. */
export function routeBetween(from: string, to: string): [number, number][] {
  const step = (a: string) =>
    ROUTES.flatMap((r) =>
      r.from === a
        ? [{ next: r.to, pts: [...r.via] }]
        : r.to === a
          ? [{ next: r.from, pts: [...r.via].reverse() }]
          : [],
    );
  // Breadth first: the fewest roads.
  const seen = new Map<string, LonLat[]>([[from, [SEATS[from] ?? VENICE]]]);
  const queue = [from];
  while (queue.length > 0) {
    const a = queue.shift() as string;
    if (a === to) break;
    for (const { next, pts } of step(a)) {
      if (seen.has(next)) continue;
      seen.set(next, [...(seen.get(a) ?? []), ...pts, SEATS[next] ?? VENICE]);
      queue.push(next);
    }
  }
  const path = seen.get(to) ?? [SEATS[from] ?? VENICE, SEATS[to] ?? VENICE];
  return path.map(project);
}

/** The point at `k` (0 to 1) of the way along a path, by its length. */
export function alongPath(pts: [number, number][], k: number): [number, number] {
  const lengths = pts.slice(1).map((p, i) => {
    const a = pts[i] as [number, number];
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  });
  const total = lengths.reduce((s, l) => s + l, 0);
  let left = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i] as number;
    const a = pts[i] as [number, number];
    const b = pts[i + 1] as [number, number];
    if (left <= l || i === lengths.length - 1) {
      const t = l === 0 ? 0 : Math.min(1, left / l);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= l;
  }
  return pts[0] ?? [ORIGIN[0], ORIGIN[1]];
}

export const pathOf = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

const closed = (pts: LonLat[]) => `${pathOf(pts.map(project))} Z`;

// The seas, coast by coast (longitude, latitude), simplified to what a phone shows.
export const MEDITERRANEAN: LonLat[] = [
  [-6, 36.6],
  [-2, 36.7],
  [-0.5, 38.3],
  [-0.3, 39.5],
  [0.8, 40.7],
  [2.2, 41.4],
  [3.2, 42.1],
  [3.1, 43.0],
  [4.5, 43.4],
  [5.4, 43.2],
  [6.6, 43.1],
  [7.5, 43.8],
  [8.9, 44.4],
  [9.8, 44.1],
  [10.3, 43.5],
  [11.0, 42.4],
  [12.2, 41.7],
  [13.5, 41.2],
  [14.3, 40.8],
  [15.0, 40.2],
  [15.7, 40.0],
  [15.65, 38.2],
  [16.6, 38.4],
  [17.1, 39.0],
  [16.6, 40.1],
  [17.2, 40.45],
  [18.0, 40.2],
  [18.5, 40.1],
  [18.5, 40.6],
  [17.9, 40.65],
  [16.9, 41.1],
  [16.0, 41.5],
  [15.9, 41.9],
  [14.6, 42.2],
  [13.9, 42.9],
  [13.5, 43.6],
  [12.6, 44.1],
  [12.3, 44.5],
  [12.5, 45.0],
  [12.3, 45.35],
  [13.1, 45.75],
  [13.75, 45.65],
  [13.6, 45.2],
  [13.9, 44.8],
  [14.4, 45.3],
  [14.9, 44.9],
  [15.2, 44.3],
  [15.9, 43.7],
  [16.4, 43.5],
  [17.5, 43.0],
  [18.1, 42.65],
  [18.6, 42.4],
  [19.1, 42.0],
  [19.5, 41.3],
  [19.4, 40.5],
  [20.0, 39.7],
  [20.7, 39.0],
  [21.1, 38.4],
  [21.3, 37.8],
  [21.6, 37.0],
  [22.4, 36.45],
  [22.9, 36.8],
  [23.2, 36.45],
  [22.8, 37.6],
  [23.4, 37.9],
  [24.0, 37.65],
  [24.1, 38.2],
  [23.6, 38.6],
  [22.9, 39.3],
  [22.6, 40.0],
  [22.9, 40.6],
  [23.7, 40.2],
  [24.4, 40.9],
  [25.9, 40.85],
  [26.6, 40.5],
  [27.0, 40.9],
  [28.0, 41.0],
  [29.0, 41.05],
  [29.3, 40.7],
  [28.0, 40.4],
  [26.7, 40.2],
  [26.2, 39.9],
  [26.7, 39.3],
  [26.9, 38.5],
  [27.3, 37.9],
  [27.5, 37.0],
  [28.2, 36.7],
  [29.1, 36.6],
  [30.6, 36.85],
  [31.5, 36.6],
  [32.8, 36.1],
  [34.0, 36.3],
  [34.9, 36.8],
  [36.1, 36.7],
  [35.9, 35.8],
  [35.9, 35.0],
  [35.5, 33.9],
  [35.1, 33.0],
  [34.9, 32.4],
  [34.5, 31.5],
  [32.3, 31.2],
  [29.9, 31.2],
  [25.0, 31.6],
  [23.0, 32.6],
  [20.1, 32.0],
  [19.5, 30.3],
  [15.6, 31.7],
  [13.2, 32.9],
  [11.1, 33.2],
  [10.4, 34.3],
  [11.1, 35.2],
  [10.6, 35.9],
  [10.2, 36.8],
  [11.0, 37.1],
  [9.8, 37.3],
  [8.6, 36.9],
  [6.6, 37.1],
  [5.0, 36.7],
  [3.0, 36.8],
  [1.3, 36.5],
  [-0.6, 35.7],
  [-6, 35.0],
];
export const BLACK_SEA: LonLat[] = [
  [29.05, 41.2],
  [28.0, 41.6],
  [27.9, 42.6],
  [28.0, 43.2],
  [28.6, 44.2],
  [29.7, 45.2],
  [30.7, 46.5],
  [31.7, 46.6],
  [33.0, 46.0],
  [32.5, 45.4],
  [33.6, 44.4],
  [35.0, 44.8],
  [36.6, 45.3],
  [38.5, 44.5],
  [41.5, 41.5],
  [38.0, 40.95],
  [36.3, 41.3],
  [35.0, 42.0],
  [33.3, 42.0],
  [31.5, 41.3],
  [30.0, 41.2],
];
export const CHANNEL: LonLat[] = [
  [-6, 50.0],
  [-2, 50.6],
  [-1, 50.7],
  [0.5, 50.8],
  [1.4, 51.1],
  [1.5, 51.4],
  [0.9, 51.8],
  [1.7, 52.7],
  [1.0, 53.2],
  [0.5, 55],
  [8.5, 55],
  [8.6, 53.6],
  [7.0, 53.4],
  [4.8, 53.0],
  [4.6, 52.5],
  [4.0, 51.9],
  [3.2, 51.35],
  [2.4, 51.05],
  [1.6, 50.9],
  [1.6, 50.2],
  [0.1, 49.5],
  [-1.2, 49.4],
  [-1.6, 49.7],
  [-2, 49.6],
  [-3, 48.8],
  [-6, 48.5],
];
export const BISCAY: LonLat[] = [
  [-6, 48.0],
  [-4.5, 47.8],
  [-2.2, 47.2],
  [-1.2, 46.2],
  [-1.2, 45.0],
  [-1.25, 44.0],
  [-1.6, 43.4],
  [-6, 43.4],
];
export const ISLANDS: LonLat[][] = [
  // Sicily, Sardinia, Corsica, Crete, Cyprus, Majorca, Rhodes, Euboea.
  [
    [12.4, 38.0],
    [13.4, 38.2],
    [15.6, 38.3],
    [15.1, 37.3],
    [15.1, 36.7],
    [14.4, 36.8],
    [12.6, 37.6],
  ],
  [
    [8.4, 41.1],
    [9.6, 41.1],
    [9.8, 40.0],
    [9.6, 39.1],
    [8.4, 38.9],
    [8.4, 40.0],
  ],
  [
    [9.4, 43.0],
    [9.6, 42.4],
    [9.4, 41.4],
    [8.7, 41.6],
    [8.6, 42.4],
  ],
  [
    [23.5, 35.5],
    [24.5, 35.4],
    [26.3, 35.3],
    [25.8, 35.0],
    [24.0, 35.2],
  ],
  [
    [32.3, 35.0],
    [34.6, 35.7],
    [34.0, 35.0],
    [33.0, 34.6],
  ],
  [
    [2.4, 39.9],
    [3.4, 39.8],
    [3.2, 39.3],
    [2.6, 39.5],
  ],
  [
    [27.7, 36.2],
    [28.2, 36.45],
    [28.0, 35.9],
  ],
  [
    [23.3, 38.9],
    [24.6, 38.2],
    [24.1, 38.2],
    [23.2, 38.6],
  ],
];
/** The Alps, as ink peaks along their arc. */
const ALPS: LonLat[] = [
  [6.9, 45.9],
  [7.8, 46.1],
  [8.8, 46.4],
  [9.9, 46.5],
  [11.0, 46.9],
  [12.2, 46.8],
  [13.3, 47.2],
];

/** The chart's own colours, those of the monthly portolan (Terrain.tsx), in every palette. */
const INK = "#BFE3FF";
const LAND = "#3A5677";
const LAND_DEEP = "#2B4463";
const WATER = "#174A78";
const WATER_DEEP = "#103A62";

/**
 * The chart's ground, drawn once: slate land, the seas washed in deep blue with their waves, the
 * coasts in ink, the Alps, and the rhumb lines from a wind rose in the Ionian sea. A generated
 * texture (world/map, docs/commandes-images.md) lies over the land when there is one.
 */
export const MediterraneanGround = memo(function MediterraneanGround({
  texture,
}: {
  texture?: string;
}) {
  const rose = project([18.5, 37.2]);
  const rhumbs = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8);
  const seas = [MEDITERRANEAN, BLACK_SEA, CHANNEL, BISCAY].map(closed);
  return (
    <g>
      <defs>
        <radialGradient id="wm-land" cx="45%" cy="40%" r="75%">
          <stop offset="0%" stopColor={LAND} />
          <stop offset="100%" stopColor={LAND_DEEP} />
        </radialGradient>
        <linearGradient id="wm-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={WATER} />
          <stop offset="100%" stopColor={WATER_DEEP} />
        </linearGradient>
        <pattern id="wm-waves" width="16" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0 4 Q4 1 8 4 T16 4"
            fill="none"
            stroke={INK}
            strokeOpacity="0.18"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect
        x={WORLD_VIEW.x}
        y={WORLD_VIEW.y}
        width={WORLD_VIEW.w}
        height={WORLD_VIEW.h}
        fill="url(#wm-land)"
      />
      {texture && (
        <image
          href={texture}
          x={WORLD_VIEW.x}
          y={WORLD_VIEW.y}
          width={WORLD_VIEW.w}
          height={WORLD_VIEW.h}
          preserveAspectRatio="xMidYMid slice"
          opacity="0.35"
        />
      )}
      {seas.map((d) => (
        <g key={d}>
          <path d={d} fill="url(#wm-sea)" />
          <path d={d} fill="url(#wm-waves)" />
          <path
            d={d}
            fill="none"
            stroke={INK}
            strokeOpacity="0.45"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {ISLANDS.map((isle) => (
        <path
          key={isle.join()}
          d={closed(isle)}
          fill={LAND}
          stroke={INK}
          strokeOpacity="0.45"
          strokeWidth="0.6"
        />
      ))}
      <g stroke={INK} strokeOpacity="0.08" strokeWidth="0.4">
        {rhumbs.map((a) => (
          <line
            key={a}
            x1={rose[0]}
            y1={rose[1]}
            x2={rose[0] + Math.cos(a) * 500}
            y2={rose[1] + Math.sin(a) * 500}
          />
        ))}
      </g>
      <g transform={`translate(${rose[0]} ${rose[1]})`} opacity="0.5">
        <path d="M0 -9 L2 0 L0 9 L-2 0 Z M-9 0 L0 2 L9 0 L0 -2 Z" fill={P.goldSoft} />
        <circle r="5" fill="none" stroke={INK} strokeWidth="0.5" />
      </g>
      {ALPS.map((at) => {
        const [x, y] = project(at);
        return (
          <path
            key={at.join()}
            transform={`translate(${x} ${y}) scale(0.5)`}
            d="M-14 0 L-3 -18 L3 -10 L8 -15 L17 0"
            fill={LAND_DEEP}
            stroke={INK}
            strokeOpacity="0.5"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
});
