// The map in square tiles, bought one at a time (docs/plan-porcellana.md M3, decision of the owner
// of 5 November 2026): writes the scenario of the 24 months' simulator from the game's own settings.
//   G, scenarios/cases-carrees.json: the square map of Venice (venice1450.squares.ts, tiles of 15
//      units), the towns on their tiles with their weights and sizes of now, the first fondaco on
//      the free tile nearest its point of now; a tile priced so that the land of a sector of before
//      costs about as much (four tiles a sector: 300 ducats a sector, a fifth dearer each, becomes
//      75 a tile, `stepBps` the fourth root of a fifth); the sea crossed within as many tiles as
//      sectors before; the roads' seconds a unit set so that the way to each town lasts as long.
//   npx tsx src/scenario-cases.ts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VENICE_SQUARE_TILES,
  VENICE_SQUARE_TOWNS,
  VENICE_TILE_SIZE,
  parseEmpireSettings,
  roadBetween,
  roadLength,
  tileAt,
  tileCentre,
  tileDistance,
  venice1450Empire,
} from "@comptoirs/engine";

const here = dirname(fileURLToPath(import.meta.url));
const hex = parseEmpireSettings(venice1450Empire);
const byCode = new Map(hex.map.cities.map((c) => [c.code, c]));
const cities = VENICE_SQUARE_TOWNS.map((t) => {
  const was = byCode.get(t.code);
  return {
    code: t.code,
    cell: t.tile,
    region: t.region,
    x: t.x,
    y: t.y,
    weight: was?.weight ?? 1,
    size: was?.size ?? t.size,
  };
});
const size = VENICE_TILE_SIZE;
const towns = new Set(cities.map((c) => c.cell));
// The first fondaco: the free land tile of Venetia nearest its point of now, touching no town.
const at = hex.map.home ?? { x: 0, y: 0 };
const homeTile = Object.keys(VENICE_SQUARE_TILES)
  .filter(
    (t) =>
      VENICE_SQUARE_TILES[t]?.region === "veneto" &&
      ![...towns].some((u) => u === t || tileDistance(u, t) === 1),
  )
  .sort((a, b) => {
    const [ax, ay] = tileCentre(a, size);
    const [bx, by] = tileCentre(b, size);
    return (
      Math.hypot(ax - at.x, ay - at.y) - Math.hypot(bx - at.x, by - at.y) || a.localeCompare(b)
    );
  })[0] as string;
const [hx, hy] = tileCentre(homeTile, size);
const map = {
  ...venice1450Empire.map,
  grid: "square" as const,
  tileSize: size,
  cells: VENICE_SQUARE_TILES,
  cities,
  tiles: true,
  water: [],
  home: { x: Math.round(hx), y: Math.round(hy) },
  unlock: { costDucats: 75, stepBps: 470, seaHops: 8 },
};
const square = parseEmpireSettings({ ...venice1450Empire, map });
// The roads' length from the first fondaco to every town, hexagonal then square: their ratio.
let hexLen = 0;
let sqLen = 0;
for (const c of hex.map.cities) {
  const t = cities.find((x) => x.code === c.code);
  if (!t || c.x === undefined || c.y === undefined) continue;
  hexLen += roadLength(roadBetween([at.x, at.y], [c.x, c.y], hex));
  sqLen += roadLength(roadBetween([map.home.x, map.home.y], [t.x, t.y], square));
}
const moves = (venice1450Empire.moves ?? {}) as { secondsPerUnit?: number };
// A whole number (the settings ask one): the nearest.
const exact = ((moves.secondsPerUnit ?? 4) * hexLen) / sqLen;
const secondsPerUnit = Math.max(1, Math.round(exact));
const settings = { map, moves: { ...moves, secondsPerUnit } };
writeFileSync(
  join(here, "..", "scenarios", "cases-carrees.json"),
  `${JSON.stringify({ settings, model: { roundsPerSession: 2 } }, null, 2)}\n`,
);
console.log(
  `home ${homeTile} (${tileAt(at.x, at.y, size)} before); roads ${Math.round(sqLen)} units against ${Math.round(hexLen)}: ${exact.toFixed(2)} s a unit, ${secondsPerUnit} kept`,
);
