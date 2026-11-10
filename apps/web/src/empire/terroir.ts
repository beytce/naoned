/**
 * The terroirs as the screen tells them (docs/plan-carte-vivante.md, lot 3): a tile's terrain, the
 * workshops it favours and their share more, from the view (the engine draws them, terrain.ts).
 * Pure, tested (test/terroir.test.ts).
 */
import { fr } from "../i18n.js";
import { buildingName } from "./logic.js";
import type { EmpirePayload } from "./types.js";

export interface Terroir {
  kind: string;
  /** The workshops it favours, by type. */
  buildings: string[];
  /** Their share more, in bps of their lot. */
  bonusBps: number;
}

/** A tile's terroir, or null on plain land (and without terroirs). */
export function terroirAt(p: EmpirePayload, tile: string | undefined): Terroir | null {
  const map = p.view?.map;
  const kind = tile ? map?.terrain?.[tile] : undefined;
  const k = kind ? map?.terrains?.[kind] : undefined;
  return kind && k ? { kind, buildings: k.buildings, bonusBps: k.bonusBps } : null;
}

/** What a workshop of a type gains on a tile, in bps of its lot: nothing off its terroir. */
export function terroirBonus(p: EmpirePayload, tile: string | undefined, type: string): number {
  const t = terroirAt(p, tile);
  return t?.buildings.includes(type) ? t.bonusBps : 0;
}

/** A share in bps as a percentage, whole when it is. */
export const pct = (bps: number) => Math.round(bps / 10) / 10;

/** A terrain's name. */
export const terrainName = (kind: string) => fr.empire.terroir.names[kind] ?? kind;

/** « Forêt : camp de bûcherons +10 % » — what a tile's land is and whom it favours; null on plain land. */
export function terroirLine(p: EmpirePayload, tile: string | undefined): string | null {
  const t = terroirAt(p, tile);
  if (!t) return null;
  const whom = t.buildings.map((b) => buildingName(p, b)).join(", ");
  return fr.empire.terroir.favours(terrainName(t.kind), whom, pct(t.bonusBps));
}

/**
 * What a workshop's tile gives it, in one line: its terroir and its neighbourhood (« Terroir +10 % ·
 * voisinage +10 % »); null when its tile gives nothing.
 */
export function tileBonusLine(p: EmpirePayload, workshopId: string): string | null {
  const w = p.view?.workshopPlaces?.[workshopId];
  const terrain = w?.terrainBps ?? 0;
  const neighbour = w?.neighbourBps ?? 0;
  if (terrain <= 0 && neighbour <= 0) return null;
  const tt = fr.empire.terroir;
  return [
    terrain > 0 ? tt.bonusTerroir(pct(terrain)) : null,
    neighbour > 0 ? tt.bonusNeighbours(pct(neighbour)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The free tiles of the house's a workshop would gain on: where to move it (its own region's).
 * Sorted, the richest first.
 */
export function betterTiles(p: EmpirePayload, workshopId: string, free: string[]): string[] {
  const ws = p.view?.house.workshops.find((w) => w.id === workshopId);
  if (!ws) return [];
  const now = terroirBonus(p, ws.tile, ws.type);
  return free
    .filter((t) => terroirBonus(p, t, ws.type) > now)
    .sort(
      (a, b) => terroirBonus(p, b, ws.type) - terroirBonus(p, a, ws.type) || a.localeCompare(b),
    );
}
