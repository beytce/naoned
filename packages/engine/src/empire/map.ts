import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import type { EmpireHouse, PlayerId } from "../state.js";
import { type Tx, fail } from "../tx.js";
import { levelCost } from "./curves.js";
import { houseEffect } from "./effects.js";
import { counterCostOf, empireSettings, openSite, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The map at the centre of the game (step 2): a hex grid over the Mediterranean, in axial cells
 * « q,r ». The house sees Venetia's cells; a counter put down on a cell it sees reveals those
 * around it, and the cities hidden there with their share of the region's book; the first counter
 * of a region opens it. The Arsenal stands on a coast. Pure, but for the commands at the end.
 */

const HOME = "veneto";

export const cellKey = (q: number, r: number) => `${q},${r}`;

export function parseCell(key: string): [number, number] {
  const [q = Number.NaN, r = Number.NaN] = key.split(",").map(Number);
  return [q, r];
}

/** Hex distance between two axial cells. */
export function cellDistance(a: string, b: string): number {
  const [aq, ar] = parseCell(a);
  const [bq, br] = parseCell(b);
  const dq = aq - bq;
  const dr = ar - br;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Every cell within `radius` of a cell, land or sea, itself first. */
export function cellsWithin(cell: string, radius: number): string[] {
  const [q, r] = parseCell(cell);
  const out = [cell];
  for (let dq = -radius; dq <= radius; dq++)
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++)
      if (dq !== 0 || dr !== 0) out.push(cellKey(q + dq, r + dr));
  return out;
}

/** Has the world a map: without one, the regions open as before (charters, whole books). */
export const hasMap = (s: EmpireSettings) => Object.keys(s.map.cells).length > 0;

/** A region's land cells. */
export function regionCells(s: EmpireSettings, region: string): string[] {
  return Object.entries(s.map.cells)
    .filter(([, c]) => c.region === region)
    .map(([k]) => k);
}

/** A region's seat: its first city's cell, else its first cell. */
export function regionSeat(s: EmpireSettings, region: string): string | null {
  return s.map.cities.find((c) => c.region === region)?.cell ?? regionCells(s, region)[0] ?? null;
}

/** What the house sees, Venetia's cells at the least. */
export function revealedOf(h: EmpireHouse, s: EmpireSettings): Set<string> {
  return new Set(h.revealed ?? regionCells(s, HOME));
}

/** A region's cities the house has found, and all of them. */
export function citiesFound(
  h: EmpireHouse,
  region: string,
  s: EmpireSettings,
): { found: string[]; all: number } {
  const all = s.map.cities.filter((c) => c.region === region);
  const seen = revealedOf(h, s);
  return { found: all.filter((c) => seen.has(c.cell)).map((c) => c.code), all: all.length };
}

/**
 * The share of a region's daily book the house reaches: that of the cities it has found (all of
 * it in a region without cities, or a world without a map).
 */
export function bookShareBps(h: EmpireHouse, region: string, s: EmpireSettings): number {
  const { found, all } = citiesFound(h, region, s);
  if (all === 0) return 10_000;
  return Math.floor((found.length * 10_000) / all);
}

/**
 * A house of an older world, taken up on the map at its first read: Venetia seen, the seat of each
 * region where it holds a counter seen around and a counter put there, its Arsenal on Venetia's
 * coast when it has a ship. Never undoes what it already has.
 */
export function ensureMap(h: EmpireHouse, s: EmpireSettings): void {
  if (!hasMap(s) || h.revealed) return;
  const seen = new Set(regionCells(s, HOME));
  const posts: { cell: string; region: string }[] = [];
  for (const region of Object.keys(h.counters ?? {})) {
    const seat = regionSeat(s, region);
    if (!seat) continue;
    for (const c of cellsWithin(seat, s.map.revealRadius)) seen.add(c);
    posts.push({ cell: seat, region });
  }
  h.revealed = [...seen].sort();
  if (posts.length > 0 && !h.posts) h.posts = posts;
  const ships = (h.vehicles ?? []).some((v) => s.vehicles[v.type]?.build);
  if (ships && !h.arsenal) {
    const coast = regionCells(s, HOME).find((c) => s.map.cells[c]?.coast);
    if (coast) h.arsenal = coast;
  }
}

/** The counters the house has put down or is putting down. */
const postsOf = (h: EmpireHouse) =>
  (h.posts ?? []).length + h.builds.filter((b) => b.kind === "post").length;

/**
 * The ducats of a counter put down in a region: its charter's of before (its region's Casa,
 * so many times a workshop), dearer by a step for each counter already down, less the house's
 * letters (charterCut) and pacts (counterCut).
 */
export function postCost(h: EmpireHouse, region: string, s: EmpireSettings): Deniers {
  const r = s.regions.find((x) => x.code === region);
  const base = levelCost(r?.casa ?? 1, s) * BigInt(s.counters.costTimes);
  const dearer = applyBpsFloor(base, 10_000 + s.map.costStepBps * postsOf(h));
  const letters = Math.min(10_000, houseEffect(h, "charterCut", s));
  return counterCostOf(h, applyBpsFloor(dearer, 10_000 - letters), s);
}

/** The cells a counter on `cell` would reveal: those within the radius. */
export function revealedBy(cell: string, s: EmpireSettings): string[] {
  return cellsWithin(cell, s.map.revealRadius);
}

/**
 * Puts a counter down on a land cell the house sees, of a region its Casa has reached: a site of
 * the hours of the opening voyage and one more. Done, it reveals the cells around it, and the
 * first counter of a region opens the region.
 */
export function placeCounter(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (
    (h.posts ?? []).some((p) => p.cell === cell) ||
    h.builds.some((b) => b.kind === "post" && b.cell === cell)
  )
    fail("built");
  const r = s.regions.find((x) => x.code === c.region);
  if (!r) fail("unknown_region");
  if (h.casa < r.casa) fail("requirement_unmet");
  const site = openSite(
    tx,
    playerId,
    h,
    postCost(h, r.code, s),
    {},
    r.hoursFromVenice * 60 + 60,
    0,
  );
  h.builds.push({
    kind: "post",
    level: 1,
    region: r.code,
    cell,
    reveal: revealedBy(cell, s),
    ...site,
  });
}

/** Puts the Arsenal on a coast the house sees, from the Casa of its first ship. */
export function buildArsenal(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const a = s.map.arsenal;
  if (!a) fail("unknown_building_type");
  const c = s.map.cells[cell];
  if (!c?.coast) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (h.arsenal || h.builds.some((b) => b.kind === "arsenal")) fail("built");
  if (h.casa < a.casa) fail("requirement_unmet");
  const site = openSite(tx, playerId, h, arsenalCost(s), {}, a.minutes, 0);
  h.builds.push({ kind: "arsenal", level: 1, region: c.region, cell, ...site });
}

/** The Arsenal's ducats, in deniers. */
export const arsenalCost = (s: EmpireSettings): Deniers =>
  BigInt(s.map.arsenal?.costDucats ?? 0) * DENIERS_PER_DUCAT;

/** The Arsenal asked by the ships, in a world that sets one. */
export function checkArsenal(h: EmpireHouse, s: EmpireSettings): void {
  if (hasMap(s) && s.map.arsenal && !h.arsenal) fail("no_arsenal");
}

/**
 * A counter's site done: it stands on its cell and reveals those around it (`radius`), and opens
 * its region if none stood there. Called by `settleBuilds`, which knows no settings: the build
 * carries the cells it reveals.
 */
export function settlePost(h: EmpireHouse, cell: string, region: string, reveal: string[]): void {
  h.posts = [...(h.posts ?? []), { cell, region }];
  h.revealed = [...new Set([...(h.revealed ?? []), ...reveal])].sort();
  if (region !== HOME && !h.counters?.[region]) h.counters = { ...(h.counters ?? {}), [region]: 1 };
}
