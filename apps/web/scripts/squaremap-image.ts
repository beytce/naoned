// The square map's control image (docs/plan-porcellana.md M2): the tiles by region (a coast ringed in
// blue), the hexagonal sectors they replace in dashed red, the towns. Writes an SVG.
// Run: node --import tsx apps/web/scripts/squaremap-image.ts <out.svg> (tsx from apps/server).
import { writeFileSync } from "node:fs";
import { VENICE_MAP_CELLS } from "../../../packages/engine/src/themes/venice1450.map.js";
import {
  VENICE_TILE_SIZE as T,
  VENICE_SQUARE_TILES,
  VENICE_SQUARE_TOWNS,
} from "../../../packages/engine/src/themes/venice1450.squares.js";
import { hexPath } from "../src/art/hexmap.js";
import {
  BISCAY,
  BLACK_SEA,
  CHANNEL,
  ISLANDS,
  MEDITERRANEAN,
  WORLD_VIEW,
  project,
} from "../src/art/mediterranean.js";
const COL: Record<string, string> = {
  veneto: "#e9d9b0",
  lombardia: "#cfe0c4",
  germania: "#d9d2e8",
  friuli: "#f0cfc0",
  romagna: "#c9dfe6",
  dalmazia: "#e8e0c0",
  grecia: "#dcd0bc",
  levante: "#f1d9a8",
  costantinopoli: "#d6c4d8",
  fiandra: "#c8d6c8",
};
const poly = (p: [number, number][]) =>
  p
    .map(project)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_VIEW.w} ${WORLD_VIEW.h}" width="${WORLD_VIEW.w * 4}" height="${WORLD_VIEW.h * 4}" style="background:#f4f1ea;font-family:sans-serif">`;
for (const s of [MEDITERRANEAN, BLACK_SEA, CHANNEL, BISCAY])
  svg += `<polygon points="${poly(s)}" fill="#cfdde3"/>`;
for (const s of ISLANDS) svg += `<polygon points="${poly(s)}" fill="#f4f1ea"/>`;
for (const [k, v] of Object.entries(VENICE_SQUARE_TILES)) {
  const [i, j] = k.split(",").map(Number);
  svg += `<rect x="${i * T + 0.4}" y="${j * T + 0.4}" width="${T - 0.8}" height="${T - 0.8}" rx="1.2" fill="${COL[v.region] ?? "#ccc"}" stroke="${v.coast ? "#3b6e8a" : "#8a7d66"}" stroke-width="${v.coast ? 0.6 : 0.25}"/>`;
}
for (const k of Object.keys(VENICE_MAP_CELLS))
  svg += `<path d="${hexPath(k)}" fill="none" stroke="#c23b2e" stroke-width="0.3" stroke-dasharray="1 1"/>`;
for (const t of VENICE_SQUARE_TOWNS)
  svg += `<circle cx="${t.x}" cy="${t.y}" r="${1 + t.size * 0.5}" fill="#24211e"/><text x="${t.x + 3}" y="${t.y - 2}" font-size="3.2" fill="#24211e">${t.code}</text>`;
svg += "</svg>";
writeFileSync(process.argv[2] ?? "squaremap.svg", svg);
