import { parseTile } from "./grid.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The terroirs (docs/plan-carte-vivante.md, lot 3; decision of the owner, 9 November 2026): each
 * land tile of the square map has its terrain — a forest, clay, sand on the shore, pasture,
 * fields — seen before it is bought; the workshop that suits it yields a share more there. A bonus
 * only, never a malus nor a ban: a workshop stands anywhere as before (golden rule 1). The raw
 * trades love their land, the others their neighbours (workshops.ts, neighbourBonus).
 *
 * A tile's terrain is the one written on the map, else drawn from the tile itself over its region's
 * weights: the same for every house, at every call, with nothing stored. Pure.
 */

/** The land without a terrain, in the weights and on the map. */
export const PLAIN = "plain";

/** A whole number out of a text, the same everywhere (FNV-1a). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // A last stir: neighbouring tiles must not draw alike.
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** The town tiles: a town stands on its own ground, no terrain under it. */
function townTiles(s: EmpireSettings): Set<string> {
  return new Set(s.map.cities.map((c) => c.cell));
}

/**
 * A tile's terrain, or null: none without terroirs, on the sea, under a town, or on plain land.
 * `towns` spares the reckoning of the towns' tiles to one who asks for many tiles.
 */
export function terrainOf(
  tile: string | undefined,
  s: EmpireSettings,
  towns: Set<string> = townTiles(s),
): string | null {
  const t = s.map.terrain;
  if (!t || !tile) return null;
  const cell = s.map.cells[tile];
  if (!cell || towns.has(tile)) return null;
  if (cell.terrain !== undefined) return cell.terrain in t.kinds ? cell.terrain : null;
  const weights = t.weights[cell.region] ?? t.weights.default ?? {};
  // In the order of their names, so that the draw never depends on how the settings were written.
  const kinds = Object.keys(weights)
    .filter((k) => (weights[k] ?? 0) > 0)
    .filter((k) => k === PLAIN || (k in t.kinds && (!t.kinds[k]?.coast || cell.coast)))
    .sort();
  const total = kinds.reduce((n, k) => n + (weights[k] ?? 0), 0);
  if (total <= 0) return null;
  const [i, j] = parseTile(tile);
  let draw = hash(`${t.seed}|${i}|${j}`) % total;
  for (const k of kinds) {
    draw -= weights[k] ?? 0;
    if (draw < 0) return k === PLAIN ? null : k;
  }
  return null;
}

/** What a workshop of a type gains on a tile, in bps of its lot: its terroir's share, else nothing. */
export function terrainBonusBps(s: EmpireSettings, tile: string | undefined, type: string): number {
  const kind = terrainOf(tile, s);
  if (!kind) return 0;
  const k = s.map.terrain?.kinds[kind];
  return k?.buildings.includes(type) ? k.bonusBps : 0;
}

/** The terrains of the tiles given, plain land left out: what the view shows of the land. */
export function terrainsOf(tiles: Iterable<string>, s: EmpireSettings): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s.map.terrain) return out;
  const towns = townTiles(s);
  for (const tile of tiles) {
    const kind = terrainOf(tile, s, towns);
    if (kind) out[tile] = kind;
  }
  return out;
}
