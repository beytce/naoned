// Draws the engine's map from the chart (the map at the centre, step 2): each cell of the grid
// (src/art/hexmap.ts) is land when its centre lies in no sea of art/mediterranean.tsx (or on an
// island), its region that of the nearest seat, a coast when a sea touches it; the cities on the
// cell under their place. Writes packages/engine/src/themes/venice1450.map.ts.
// Run: node --import tsx apps/web/scripts/hexmap.ts (tsx from apps/server).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cellAt, cellCentre, gridCells, neighbours } from "../src/art/hexmap.js";
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

/** The cities hidden in each region, at their real place, the most important first. */
const CITIES: { code: string; region: string; at: LonLat }[] = [
  { code: "venezia", region: "veneto", at: [12.33, 45.44] },
  { code: "padova", region: "veneto", at: [11.88, 45.41] },
  { code: "treviso", region: "veneto", at: [12.24, 45.67] },
  { code: "vicenza", region: "veneto", at: [11.55, 45.55] },
  { code: "milano", region: "lombardia", at: [9.19, 45.46] },
  { code: "brescia", region: "veneto", at: [10.21, 45.54] },
  { code: "mantova", region: "veneto", at: [10.79, 45.16] },
  { code: "bergamo", region: "lombardia", at: [9.67, 45.7] },
  { code: "udine", region: "friuli", at: [13.23, 46.06] },
  { code: "trieste", region: "friuli", at: [13.77, 45.65] },
  { code: "pola", region: "friuli", at: [13.85, 44.87] },
  { code: "ravenna", region: "veneto", at: [12.2, 44.42] },
  { code: "ancona", region: "romagna", at: [13.52, 43.62] },
  { code: "rimini", region: "romagna", at: [12.57, 44.06] },
  { code: "zara", region: "dalmazia", at: [15.23, 44.12] },
  { code: "spalato", region: "dalmazia", at: [16.44, 43.51] },
  { code: "ragusa", region: "dalmazia", at: [18.09, 42.65] },
  { code: "augusta", region: "germania", at: [10.9, 48.37] },
  { code: "norimberga", region: "germania", at: [11.08, 49.45] },
  { code: "innsbruck", region: "germania", at: [11.4, 47.27] },
  { code: "modone", region: "grecia", at: [21.7, 36.82] },
  { code: "negroponte", region: "grecia", at: [23.6, 38.46] },
  { code: "candia", region: "grecia", at: [25.13, 35.34] },
  { code: "corfu", region: "grecia", at: [19.92, 39.62] },
  { code: "acri", region: "levante", at: [35.08, 32.93] },
  { code: "beirut", region: "levante", at: [35.5, 33.89] },
  { code: "alessandria", region: "levante", at: [29.92, 31.2] },
  { code: "famagosta", region: "levante", at: [33.94, 35.12] },
  { code: "costantinopoli", region: "costantinopoli", at: [28.98, 41.01] },
  { code: "caffa", region: "costantinopoli", at: [35.38, 45.03] },
  { code: "varna", region: "costantinopoli", at: [27.91, 43.21] },
  { code: "bruges", region: "fiandra", at: [3.22, 51.21] },
  { code: "anversa", region: "fiandra", at: [4.4, 51.22] },
  { code: "londra", region: "fiandra", at: [-0.13, 51.51] },
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
// The cities: each on the sector under its place, several a sector (step 4, the sectors
// inhabited). A sector takes the region of its first city, the most important.
const ruled = new Set<string>();
const cities: { code: string; cell: string; region: string }[] = [];
const spots: Record<string, [number, number]> = {};
for (const c of CITIES) {
  const at = project(c.at);
  const cell = cellAt(...at);
  if (!ruled.has(cell)) {
    cells[cell] = { region: c.region };
    ruled.add(cell);
  }
  cities.push({ code: c.code, cell, region: c.region });
  spots[c.code] = [Number(at[0].toFixed(1)), Number(at[1].toFixed(1))];
}
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

/** The cities hidden on the map, each on its cell. */
export const VENICE_MAP_CITIES: { code: string; cell: string; region: string }[] = ${JSON.stringify(cities)};
`,
);
writeFileSync(
  join(here, "../src/art/citySpots.ts"),
  `// Written by scripts/hexmap.ts from the chart: do not edit by hand.

/** Where each city stands on the chart (art/mediterranean.tsx units), inside its sector. */
export const CITY_SPOTS: Record<string, [number, number]> = ${JSON.stringify(spots)};
`,
);
const byRegion: Record<string, number> = {};
for (const c of Object.values(cells)) byRegion[c.region] = (byRegion[c.region] ?? 0) + 1;
console.log(`${Object.keys(cells).length} land cells`, byRegion);
