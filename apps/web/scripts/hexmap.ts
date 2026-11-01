// Draws the engine's map from the chart (the map at the centre, step 2): each cell of the grid
// (src/art/hexmap.ts) is land when its centre lies in no sea of art/mediterranean.tsx (or on an
// island), its region that of the nearest seat, a coast when a sea touches it; the cities on the
// cell under their place. Writes packages/engine/src/themes/venice1450.map.ts.
// Run: node --import tsx apps/web/scripts/hexmap.ts (tsx from apps/server).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HEX_SIZE, cellAt, cellCentre, gridCells, neighbours } from "../src/art/hexmap.js";
import {
  BISCAY,
  BLACK_SEA,
  CHANNEL,
  ISLANDS,
  type LonLat,
  MEDITERRANEAN,
  SEATS,
  project,
} from "../src/art/mediterranean.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../packages/engine/src/themes/venice1450.map.ts");

/** A land cell no further than this from its region's seat (chart units): Spain, Africa stay out. */
const REACH = 62;

/**
 * The cities hidden in each region, at their real place, the most important first, with their
 * size (1, a market town, to 5, a capital): its bubble, and how many orders it gives.
 */
const CITIES: { code: string; region: string; at: LonLat; size: number }[] = [
  { code: "venezia", region: "veneto", at: [12.33, 45.44], size: 5 },
  { code: "padova", region: "veneto", at: [11.88, 45.41], size: 3 },
  { code: "treviso", region: "veneto", at: [12.24, 45.67], size: 2 },
  { code: "vicenza", region: "veneto", at: [11.55, 45.55], size: 2 },
  { code: "milano", region: "lombardia", at: [9.19, 45.46], size: 5 },
  { code: "brescia", region: "veneto", at: [10.21, 45.54], size: 3 },
  { code: "mantova", region: "veneto", at: [10.79, 45.16], size: 2 },
  { code: "bergamo", region: "lombardia", at: [9.67, 45.7], size: 2 },
  { code: "udine", region: "friuli", at: [13.23, 46.06], size: 2 },
  { code: "trieste", region: "friuli", at: [13.77, 45.65], size: 2 },
  { code: "pola", region: "friuli", at: [13.85, 44.87], size: 1 },
  { code: "ravenna", region: "veneto", at: [12.2, 44.42], size: 2 },
  { code: "ancona", region: "romagna", at: [13.52, 43.62], size: 2 },
  { code: "rimini", region: "romagna", at: [12.57, 44.06], size: 1 },
  { code: "zara", region: "dalmazia", at: [15.23, 44.12], size: 2 },
  { code: "spalato", region: "dalmazia", at: [16.44, 43.51], size: 2 },
  { code: "ragusa", region: "dalmazia", at: [18.09, 42.65], size: 3 },
  { code: "augusta", region: "germania", at: [10.9, 48.37], size: 3 },
  { code: "norimberga", region: "germania", at: [11.08, 49.45], size: 4 },
  { code: "innsbruck", region: "germania", at: [11.4, 47.27], size: 1 },
  { code: "modone", region: "grecia", at: [21.7, 36.82], size: 1 },
  { code: "negroponte", region: "grecia", at: [23.6, 38.46], size: 2 },
  { code: "candia", region: "grecia", at: [25.13, 35.34], size: 3 },
  { code: "corfu", region: "grecia", at: [19.92, 39.62], size: 2 },
  { code: "acri", region: "levante", at: [35.08, 32.93], size: 2 },
  { code: "beirut", region: "levante", at: [35.5, 33.89], size: 3 },
  { code: "alessandria", region: "levante", at: [29.92, 31.2], size: 5 },
  { code: "famagosta", region: "levante", at: [33.94, 35.12], size: 2 },
  { code: "costantinopoli", region: "costantinopoli", at: [28.98, 41.01], size: 5 },
  { code: "caffa", region: "costantinopoli", at: [35.38, 45.03], size: 3 },
  { code: "varna", region: "costantinopoli", at: [27.91, 43.21], size: 2 },
  { code: "bruges", region: "fiandra", at: [3.22, 51.21], size: 4 },
  { code: "anversa", region: "fiandra", at: [4.4, 51.22], size: 3 },
  { code: "londra", region: "fiandra", at: [-0.13, 51.51], size: 4 },
  // The map that grows (1 November 2026): a town in every sector, small or great.
  { code: "verona", region: "veneto", at: [10.99, 45.44], size: 3 },
  { code: "belluno", region: "veneto", at: [12.22, 46.14], size: 1 },
  { code: "ferrara", region: "romagna", at: [11.62, 44.84], size: 2 },
  { code: "bologna", region: "romagna", at: [11.34, 44.49], size: 4 },
  { code: "firenze", region: "romagna", at: [11.26, 43.77], size: 4 },
  { code: "pisa", region: "romagna", at: [10.4, 43.72], size: 2 },
  { code: "genova", region: "lombardia", at: [8.93, 44.41], size: 4 },
  { code: "cremona", region: "lombardia", at: [10.02, 45.13], size: 2 },
  { code: "pavia", region: "lombardia", at: [9.16, 45.19], size: 2 },
  { code: "como", region: "lombardia", at: [9.08, 45.81], size: 1 },
  { code: "trento", region: "germania", at: [11.12, 46.07], size: 1 },
  { code: "bolzano", region: "germania", at: [11.35, 46.5], size: 1 },
  { code: "salisburgo", region: "germania", at: [13.05, 47.8], size: 2 },
  { code: "vienna", region: "germania", at: [16.37, 48.21], size: 4 },
  { code: "ulma", region: "germania", at: [9.99, 48.4], size: 2 },
  { code: "gorizia", region: "friuli", at: [13.62, 45.94], size: 1 },
  { code: "capodistria", region: "friuli", at: [13.73, 45.55], size: 1 },
  { code: "sebenico", region: "dalmazia", at: [15.89, 43.73], size: 1 },
  { code: "durazzo", region: "dalmazia", at: [19.45, 41.32], size: 2 },
  { code: "patrasso", region: "grecia", at: [21.73, 38.25], size: 2 },
  { code: "corone", region: "grecia", at: [21.96, 36.8], size: 1 },
  { code: "monemvasia", region: "grecia", at: [23.06, 36.69], size: 1 },
  { code: "salonicco", region: "grecia", at: [22.94, 40.64], size: 3 },
  { code: "rodi", region: "levante", at: [28.22, 36.43], size: 2 },
  { code: "nicosia", region: "levante", at: [33.36, 35.17], size: 2 },
  { code: "tripoli", region: "levante", at: [35.85, 34.43], size: 2 },
  { code: "damasco", region: "levante", at: [36.29, 33.51], size: 4 },
  { code: "tiro", region: "levante", at: [35.2, 33.27], size: 1 },
  { code: "adrianopoli", region: "costantinopoli", at: [26.56, 41.68], size: 3 },
  { code: "smirne", region: "costantinopoli", at: [27.14, 38.42], size: 2 },
  { code: "trebisonda", region: "costantinopoli", at: [39.72, 41.0], size: 3 },
  { code: "tana", region: "costantinopoli", at: [39.42, 47.1], size: 2 },
  { code: "gand", region: "fiandra", at: [3.72, 51.05], size: 3 },
  { code: "lilla", region: "fiandra", at: [3.06, 50.63], size: 2 },
];

function inside([x, y]: [number, number], poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi = 0, yi = 0] = poly[i] ?? [];
    const [xj = 0, yj = 0] = poly[j] ?? [];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const seas = [MEDITERRANEAN, BLACK_SEA, CHANNEL, BISCAY].map((p) => p.map(project));
const isles = ISLANDS.map((p) => p.map(project));
const seats = Object.entries(SEATS).map(([code, at]) => ({ code, at: project(at) }));
const land = (p: [number, number]) =>
  isles.some((i) => inside(p, i)) || !seas.some((sea) => inside(p, sea));

const cells: Record<string, { region: string; coast?: true }> = {};
for (const key of gridCells()) {
  const c = cellCentre(key);
  if (!land(c)) continue;
  const near = seats
    .map((s) => ({ code: s.code, d: Math.hypot(s.at[0] - c[0], s.at[1] - c[1]) }))
    .sort((a, b) => a.d - b.d)[0];
  if (!near || near.d > REACH) continue;
  cells[key] = { region: near.code };
}
// The cities: each on the sector under its place, two at most a sector (the map that grows,
// 31 October): one more goes to the nearest land sector with room, drawn there toward its real
// place. A sector takes the region of its first city, the most important.
const MOST = 2;
const ruled = new Set<string>();
const held: Record<string, number> = {};
const cities: {
  code: string;
  cell: string;
  region: string;
  x: number;
  y: number;
  size: number;
}[] = [];
for (const c of CITIES) {
  let at = project(c.at);
  let cell = cellAt(...at);
  if ((held[cell] ?? 0) >= MOST) {
    const from = at;
    const room = Object.keys(cells)
      .filter((k) => (held[k] ?? 0) < MOST && land(cellCentre(k)))
      .map((k) => ({
        k,
        d: Math.hypot(cellCentre(k)[0] - from[0], cellCentre(k)[1] - from[1]),
        // A sector of its own region first, a town drawn into a neighbour's only if none has room.
        other: (cells[k]?.region ?? c.region) === c.region ? 0 : 1,
      }))
      .sort((a, b) => a.other - b.other || a.d - b.d)[0];
    if (!room) throw new Error(`no room for ${c.code}`);
    cell = room.k;
    const [cx, cy] = cellCentre(cell);
    const d = Math.max(1, room.d);
    const k = Math.min(1, (0.45 * HEX_SIZE) / d);
    at = [cx + (from[0] - cx) * k, cy + (from[1] - cy) * k];
  }
  held[cell] = (held[cell] ?? 0) + 1;
  if (!ruled.has(cell)) {
    cells[cell] = { region: c.region };
    ruled.add(cell);
  }
  cities.push({
    code: c.code,
    cell,
    region: c.region,
    x: Math.round(at[0]),
    y: Math.round(at[1]),
    size: c.size,
  });
}
// A sector without a town is no sector of the map (1 November): every one has one town or two.
const empty = Object.keys(cells).filter((k) => !held[k]);
for (const k of empty) delete cells[k];
console.log(`${empty.length} sectors without a town left out`);
for (const key of Object.keys(cells)) {
  const c = cellCentre(key);
  const wet = neighbours(key).some((n) => !cells[n] && !land(cellCentre(n)));
  if (wet && land(c)) (cells[key] as { coast?: true }).coast = true;
}
// The cities' cells by the sea are coasts too, an island's always.
for (const key of Object.keys(cells))
  if (neighbours(key).some((n) => !land(cellCentre(n))))
    (cells[key] as { coast?: true }).coast = true;

const sorted = Object.fromEntries(Object.entries(cells).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  out,
  `// Written by apps/web/scripts/hexmap.ts from the chart (apps/web/src/art/mediterranean.tsx,
// apps/web/src/art/hexmap.ts): do not edit by hand.

/** The map's land cells (« q,r »), each with its region and whether the sea touches it. */
export const VENICE_MAP_CELLS: Record<string, { region: string; coast?: boolean }> = ${JSON.stringify(sorted)};

/** The cities hidden on the map, each on its cell, at its place on the chart (its units). */
export const VENICE_MAP_CITIES: { code: string; cell: string; region: string; x: number; y: number; size: number }[] = ${JSON.stringify(cities)};
`,
);
const byRegion: Record<string, number> = {};
for (const c of Object.values(cells)) byRegion[c.region] = (byRegion[c.region] ?? 0) + 1;
console.log(`${Object.keys(cells).length} land cells`, byRegion);
