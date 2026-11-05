// Draws the engine's square map from the chart (docs/plan-porcellana.md § 2 bis, M2; decision of the
// owner, 5 November 2026): each square tile of `TILE` units is land when its centre (or three of its
// quarters) lies in no sea of art/mediterranean.tsx (or on an island) and within a sector of the hexagonal map
// (venice1450.map.ts: the same lands, the same regions), its region that sector's; a coast when a
// side of it touches the sea. Venice's lagoon (the small tile of water east of it) stays water. The
// towns kept (some thirty, venice1450.towns.ts) on their tiles (engine, grid.ts: placeTowns).
// Writes packages/engine/src/themes/venice1450.squares.ts.
// Run: node --import tsx apps/web/scripts/squaremap.ts (tsx from apps/server).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type EmpireSettings,
  VENICE_TOWNS_MERGED,
  mergeCities,
  neighbours4,
  placeTowns,
  slotPoint,
  tileAt,
  tileCentre,
  tileKey,
} from "@comptoirs/engine";
import {
  VENICE_MAP_CELLS,
  VENICE_MAP_CITIES,
} from "../../../packages/engine/src/themes/venice1450.map.js";
import { cellAt } from "../src/art/hexmap.js";
import {
  BISCAY,
  BLACK_SEA,
  CHANNEL,
  ISLANDS,
  MEDITERRANEAN,
  WORLD_VIEW,
  project,
} from "../src/art/mediterranean.js";

/** A tile's side, in the chart's units: about one of the small hexagonal tiles it replaces. */
export const TILE = 15;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../packages/engine/src/themes/venice1450.squares.ts");

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
const land = (p: [number, number]) =>
  isles.some((i) => inside(p, i)) || !seas.some((sea) => inside(p, sea));

const HEX = { map: { hexSize: 24 } } as EmpireSettings;
// The lagoon east of Venice (venice1450.empire.ts, `water`): its tile stays water.
const lagoon = tileAt(...slotPoint("2,4", 1, HEX), TILE);

const tiles: Record<string, { region: string; coast?: true }> = {};
for (let j = 0; j * TILE < WORLD_VIEW.h; j++)
  for (let i = 0; i * TILE < WORLD_VIEW.w; i++) {
    const key = tileKey(i, j);
    const c = tileCentre(key, TILE);
    // Land when its middle or most of its quarters are: the coast follows the chart, not the
    // middle alone (a tile half on the shore stays a tile).
    const q = TILE / 4;
    const quarters = [
      [c[0] - q, c[1] - q],
      [c[0] + q, c[1] - q],
      [c[0] - q, c[1] + q],
      [c[0] + q, c[1] + q],
    ].filter((p) => land(p as [number, number])).length;
    if ((!land(c) && quarters < 3) || key === lagoon) continue;
    const sector = VENICE_MAP_CELLS[cellAt(...c)];
    if (!sector) continue;
    tiles[key] = { region: sector.region };
  }
const towns = placeTowns(
  mergeCities(VENICE_MAP_CITIES, VENICE_TOWNS_MERGED).map(({ cell: _cell, ...c }) => c),
  { tileSize: TILE, tiles },
);
// A town always stands on land of its own region.
for (const t of towns) {
  const was = tiles[t.tile];
  tiles[t.tile] = { ...(was ?? {}), region: t.region };
}
for (const key of Object.keys(tiles))
  if (neighbours4(key).some((n) => !tiles[n] && !land(tileCentre(n, TILE))))
    (tiles[key] as { coast?: true }).coast = true;

const sorted = Object.fromEntries(
  Object.entries(tiles).sort(([a], [b]) => {
    const [ai = 0, aj = 0] = a.split(",").map(Number);
    const [bi = 0, bj = 0] = b.split(",").map(Number);
    return aj - bj || ai - bi;
  }),
);
writeFileSync(
  out,
  `// Written by apps/web/scripts/squaremap.ts from the chart (apps/web/src/art/mediterranean.tsx) and
// the hexagonal map's sectors (venice1450.map.ts): do not edit by hand.

/** A tile's side, in the chart's units. */
export const VENICE_TILE_SIZE = ${TILE};

/** The map's land tiles (« i,j »), each with its region and whether the sea touches a side. */
export const VENICE_SQUARE_TILES: Record<string, { region: string; coast?: boolean }> = ${JSON.stringify(sorted)};

/** The towns kept, each on its tile, at its tile's middle (the chart's units). */
export const VENICE_SQUARE_TOWNS: { code: string; tile: string; region: string; x: number; y: number; size: number; weight?: number }[] = ${JSON.stringify(towns)};
`,
);
const byRegion: Record<string, number> = {};
for (const c of Object.values(tiles)) byRegion[c.region] = (byRegion[c.region] ?? 0) + 1;
console.log(
  `${Object.keys(tiles).length} land tiles, ${towns.length} towns, lagoon ${lagoon}`,
  byRegion,
);
