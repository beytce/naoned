import { tileCentre, tileDistance } from "../empire/grid.js";
import type { EmpireSettingsInput } from "../empire/settings.js";
import { mergeCities } from "../empire/towns.js";
import { venice1450Empire } from "./venice1450.empire.js";
import { VENICE_MAP_CITIES } from "./venice1450.map.js";
import {
  VENICE_SQUARE_TILES,
  VENICE_SQUARE_TOWNS,
  VENICE_TILE_SIZE,
} from "./venice1450.squares.js";
import { VENICE_TOWNS_MERGED } from "./venice1450.towns.js";

/**
 * Venice's empire on square tiles (docs/plan-porcellana.md M3 and M4; docs/calibration.md, « La
 * carte en cases carrées », scenario G, validated at the 24 months' simulator): the map of
 * venice1450.squares.ts, the towns of now (their weights and sizes) on their tiles, the first
 * fondaco on the free tile nearest its point of now, a tile at 75 ducats a fourth root of a fifth
 * dearer each, the sea within 8 tiles, 3 s a unit on the longer square roads. The world turns to it
 * when the owner says (the server's `EMPIRE_GRID`); its houses are taken up then (map.ts,
 * migrateToSquare).
 */
const hexMap = venice1450Empire.map as NonNullable<typeof venice1450Empire.map>;
const now = new Map(
  mergeCities(
    VENICE_MAP_CITIES.map((c) => (c.code === "venezia" ? { ...c, weight: 20 } : c)),
    VENICE_TOWNS_MERGED,
  ).map((c) => [c.code, c]),
);
const cities = VENICE_SQUARE_TOWNS.map((t) => {
  const was = now.get(t.code);
  return {
    code: t.code,
    cell: t.tile,
    region: t.region,
    x: t.x,
    y: t.y,
    weight: (was as { weight?: number } | undefined)?.weight ?? 1,
    size: was?.size ?? t.size,
  };
});
const townTiles = cities.map((c) => c.cell);
// The first fondaco near the Rialto (D8 and P1-24 of the players' audit, 8 November 2026): on the
// free tile of Venetia nearest Venice, so that the towns open Venice → Padua and Treviso → Verona →
// Bologna and Ancona. A house already founded keeps its fondaco.
const venice = cities.find((c) => c.code === "venezia");
const at = venice ? { x: venice.x, y: venice.y } : (hexMap.home ?? { x: 0, y: 0 });
const homeTile = Object.keys(VENICE_SQUARE_TILES)
  .filter(
    (t) =>
      VENICE_SQUARE_TILES[t]?.region === "veneto" &&
      !townTiles.some((u) => tileDistance(u, t) <= 1),
  )
  .sort((a, b) => {
    const [ax, ay] = tileCentre(a, VENICE_TILE_SIZE);
    const [bx, by] = tileCentre(b, VENICE_TILE_SIZE);
    return (
      Math.hypot(ax - at.x, ay - at.y) - Math.hypot(bx - at.x, by - at.y) || a.localeCompare(b)
    );
  })[0] as string;
const [hx, hy] = tileCentre(homeTile, VENICE_TILE_SIZE);

export const venice1450EmpireSquare: EmpireSettingsInput = {
  ...venice1450Empire,
  map: {
    ...hexMap,
    grid: "square",
    tileSize: VENICE_TILE_SIZE,
    cells: VENICE_SQUARE_TILES,
    cities,
    tiles: true,
    water: [],
    home: { x: Math.round(hx), y: Math.round(hy) },
    unlock: { costDucats: 75, stepBps: 470, seaHops: 8 },
    // The terroirs (docs/plan-carte-vivante.md, lot 3; decision of the owner, 9 November 2026;
    // docs/calibration.md, « Les terroirs »): the raw trades love their land, a tenth more of their
    // lot there, as a neighbour that feeds them gives. Sand and salt only on a coast. Venetia is
    // richer in terrains than the regions further on; the seed is the one whose draw gives the
    // first Fondaco a forest, clay and fields by its sides (the guide's first three workshops).
    terrain: {
      kinds: {
        forest: { buildings: ["lumber_camp"], bonusBps: 1_000 },
        clay: { buildings: ["clay_pit"], bonusBps: 1_000 },
        fields: { buildings: ["farm", "hemp_field"], bonusBps: 1_000 },
        pasture: { buildings: ["sheepfold"], bonusBps: 1_000 },
        sand: { buildings: ["sand_pit", "salt_pans"], bonusBps: 1_000, coast: true },
      },
      weights: {
        veneto: { forest: 3, clay: 3, fields: 4, pasture: 2, sand: 4, plain: 4 },
        default: { forest: 2, clay: 1, fields: 3, pasture: 2, sand: 3, plain: 6 },
      },
      seed: 17,
    },
    // A new drawing: the houses are taken up on it once.
    version: (hexMap.version ?? 1) + 1,
  },
  moves: { ...venice1450Empire.moves, secondsPerUnit: 3 },
};
