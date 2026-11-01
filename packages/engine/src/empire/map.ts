import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import { type EmpireHouse, type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, fail, nextId, transfer } from "../tx.js";
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

/** A cell's centre on the chart (pointy-top hexes of `hexSize`, as the screen draws them). */
export function cellCentreOf(key: string, s: EmpireSettings): [number, number] {
  const [q, r] = parseCell(key);
  const size = s.map.hexSize;
  return [Math.sqrt(3) * size * (q + r / 2), 1.5 * size * r];
}

/** The cell under a point of the chart. */
export function cellAtPoint(x: number, y: number, s: EmpireSettings): string {
  const size = s.map.hexSize;
  const qf = ((Math.sqrt(3) / 3) * x - y / 3) / size;
  const rf = ((2 / 3) * y) / size;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const z = Math.round(-qf - rf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const dz = Math.abs(z + qf + rf);
  if (dq > dr && dq > dz) q = -r - z;
  else if (dr > dz) r = -q - z;
  return cellKey(q + 0, r + 0);
}

/** A point of the chart, rounded to its units. */
const pointOf = (key: string, s: EmpireSettings): [number, number] => {
  const [x, y] = cellCentreOf(key, s);
  return [Math.round(x), Math.round(y)];
};

/** Where a city stands on the chart: its own point, else its cell's centre. */
export function citySpot(
  c: { cell: string; x?: number; y?: number },
  s: EmpireSettings,
): [number, number] {
  return c.x !== undefined && c.y !== undefined ? [c.x, c.y] : pointOf(c.cell, s);
}

/** A counter's reach at a level, in the chart's units (none without a reach set). */
export function reachOf(level: number, s: EmpireSettings): number {
  const r = s.map.reach;
  return r ? r.base + r.perLevel * (Math.max(1, level) - 1) : 0;
}

/**
 * The house's first fondaco, with its level: where the player put it down, else at the world's
 * point, else (a world without one) at Venice's place, as before.
 */
export function homePost(h: EmpireHouse, s: EmpireSettings) {
  const level = h.homeLevel ?? 1;
  if (h.home) return { id: "home", region: HOME, ...h.home, level };
  const at = s.map.home;
  if (at) return { id: "home", cell: cellAtPoint(at.x, at.y, s), region: HOME, ...at, level };
  const venice = s.map.cities.find((c) => c.region === HOME);
  const [x, y] = venice ? citySpot(venice, s) : pointOf(regionCells(s, HOME)[0] ?? "0,0", s);
  return { id: "home", cell: venice?.cell ?? "", region: HOME, x, y, level };
}

/**
 * Puts the house's first fondaco down (decision of the owner, 1 November 2026): once, free and at
 * once, at a point of a cell of the start the house sees, never on a town nor near another
 * fondaco. Its vehicles and its stock stand with it.
 */
export function placeHome(tx: Tx, playerId: PlayerId, cell: string, x: number, y: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  if (h.home) fail("built");
  const c = s.map.cells[cell];
  if (!c || c.region !== HOME) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (!Number.isInteger(x) || !Number.isInteger(y)) fail("unknown_cell");
  if (cellAtPoint(x, y, s) !== cell) fail("unknown_cell");
  const clear = s.map.cityClearance;
  if (clear > 0 && s.map.cities.some((t) => within(citySpot(t, s), [x, y], clear))) fail("on_city");
  const others = standingPosts(h, s).slice(1);
  if (
    s.map.postSpacing > 0 &&
    others.some((o) => within([o.x, o.y], [x, y], s.map.postSpacing - 1))
  )
    fail("post_too_close");
  h.home = { cell, x, y };
}

/** Every counter that stands, Venice's first, each with its point and its level. */
export function standingPosts(h: EmpireHouse, s: EmpireSettings) {
  return [
    homePost(h, s),
    ...(h.posts ?? []).map((p, i) => {
      const [cx, cy] = pointOf(p.cell, s);
      return {
        id: p.id ?? `p${i + 1}`,
        cell: p.cell,
        region: p.region,
        x: p.x ?? cx,
        y: p.y ?? cy,
        level: p.level ?? 1,
      };
    }),
  ];
}

const within = (a: [number, number], b: [number, number], r: number) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 <= r * r;

/** The cities the house serves: those within reach of one of its counters (the map that grows). */
export function citiesCovered(h: EmpireHouse, s: EmpireSettings): Set<string> {
  const posts = standingPosts(h, s);
  const out = new Set<string>();
  for (const c of s.map.cities) {
    const at = citySpot(c, s);
    if (posts.some((p) => within([p.x, p.y], at, reachOf(p.level, s)))) out.add(c.code);
  }
  return out;
}

/** Has the world a map: without one, the regions open as before (charters, whole books). */
export const hasMap = (s: EmpireSettings) => Object.keys(s.map.cells).length > 0;

/** The map read once per settings: each region's cells, its seat, its cities. */
interface MapIndex {
  cells: Map<string, string[]>;
  seats: Map<string, string | null>;
  cities: Map<string, { code: string; cell: string }[]>;
}
const indexes = new WeakMap<EmpireSettings, MapIndex>();

function indexOf(s: EmpireSettings): MapIndex {
  const known = indexes.get(s);
  if (known) return known;
  const cells = new Map<string, string[]>();
  for (const [k, c] of Object.entries(s.map.cells))
    cells.set(c.region, [...(cells.get(c.region) ?? []), k]);
  const cities = new Map<string, { code: string; cell: string }[]>();
  for (const c of s.map.cities) cities.set(c.region, [...(cities.get(c.region) ?? []), c]);
  const seats = new Map<string, string | null>();
  for (const r of s.regions)
    seats.set(r.code, cities.get(r.code)?.[0]?.cell ?? cells.get(r.code)?.[0] ?? null);
  const index = { cells, seats, cities };
  indexes.set(s, index);
  return index;
}

/** A region's land cells. */
export function regionCells(s: EmpireSettings, region: string): string[] {
  return indexOf(s).cells.get(region) ?? [];
}

/** A region's seat: its first city's cell, else its first cell. */
export function regionSeat(s: EmpireSettings, region: string): string | null {
  return indexOf(s).seats.get(region) ?? regionCells(s, region)[0] ?? null;
}

/** Venice's cell: Venetia's seat. */
const homeCell = (s: EmpireSettings) => regionSeat(s, HOME) ?? regionCells(s, HOME)[0];

/**
 * What a house sees at its founding: Venetia's cells, or on a map with a reach (the map that
 * grows) Venice's cell alone, the rest of Venetia found by the counters put down.
 */
export function startCells(s: EmpireSettings): string[] {
  const home = homeCell(s);
  return s.map.reach && home ? [home] : regionCells(s, HOME);
}

/** The sectors a house owns (the sectors bought one by one): Venice's at the least. */
export function unlockedOf(h: EmpireHouse, s: EmpireSettings): string[] {
  return h.unlocked ?? ownedAtStart(h, s);
}

/** What a house owns when the sectors become bought: Venice's, and those it has built on. */
function ownedAtStart(h: EmpireHouse, s: EmpireSettings): string[] {
  const home = homeCell(s);
  const built = [
    ...(h.posts ?? []).map((p) => p.cell),
    ...[h.depot, h.camp, h.arsenal].filter((c): c is string => typeof c === "string"),
  ];
  return [...new Set([...(home ? [home] : []), ...built])].filter((c) => s.map.cells[c]);
}

/**
 * The sectors a house may buy: next to one it owns, or, from a coast it owns, a coast within
 * `seaHops`; of a region its Casa has reached shown with their price (the others refused).
 */
export function buyableOf(h: EmpireHouse, s: EmpireSettings): string[] {
  const u = s.map.unlock;
  if (!u) return [];
  const owned = unlockedOf(h, s);
  const mine = new Set(owned);
  const coasts = owned.filter((c) => s.map.cells[c]?.coast);
  return Object.keys(s.map.cells)
    .filter((c) => !mine.has(c))
    .filter(
      (c) =>
        owned.some((o) => cellDistance(o, c) === 1) ||
        (s.map.cells[c]?.coast === true && coasts.some((o) => cellDistance(o, c) <= u.seaHops)),
    )
    .sort();
}

/** The price of the next sector bought. */
export function sectorCost(h: EmpireHouse, s: EmpireSettings): Deniers {
  const u = s.map.unlock;
  if (!u) return 0n;
  const owned = unlockedOf(h, s).length;
  let price = BigInt(u.costDucats) * DENIERS_PER_DUCAT;
  for (let i = 1; i < owned; i++) price = applyBpsFloor(price, 10_000 + u.stepBps);
  return price;
}

/** Buys a sector next to one's own (decision of the owner, 1 November 2026): it is seen at once. */
export function unlockCell(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  if (!s.map.unlock) fail("unknown_building_type");
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (unlockedOf(h, s).includes(cell)) fail("built");
  if (!buyableOf(h, s).includes(cell)) fail("not_adjacent");
  const r = s.regions.find((x) => x.code === c.region);
  if (!r || h.casa < r.casa) fail("requirement_unmet");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, sectorCost(h, s), "empire_build", cell);
  h.unlocked = [...unlockedOf(h, s), cell];
}

/** A region's cities. */
export function regionCities(s: EmpireSettings, region: string): { code: string; cell: string }[] {
  return indexOf(s).cities.get(region) ?? [];
}

/**
 * What the house sees: Venetia's cells at the least, what its counters revealed, and the seat of
 * each region its Casa has reached (the news of it comes to Venice, across any sea): a counter
 * put there reveals the rest.
 */
export function revealedOf(h: EmpireHouse, s: EmpireSettings): Set<string> {
  // The sectors bought one by one (1 November): one sees the sectors one owns.
  if (s.map.unlock) return new Set(unlockedOf(h, s));
  const seen = new Set(h.revealed ?? startCells(s));
  // A region the Casa reaches shows its sector nearest to what is known (step 4): never one far
  // off on its own, which a finger would not find.
  for (const r of s.regions) {
    if (h.casa < r.casa) continue;
    const cells = regionCells(s, r.code);
    if (cells.length === 0 || cells.some((c) => seen.has(c))) continue;
    const known = [...seen];
    const near = [...cells].sort(
      (a, b) =>
        Math.min(...known.map((k) => cellDistance(a, k))) -
          Math.min(...known.map((k) => cellDistance(b, k))) || a.localeCompare(b),
    )[0];
    if (near) seen.add(near);
  }
  return seen;
}

/** A region's cities the house has found, and all of them. */
export function citiesFound(
  h: EmpireHouse,
  region: string,
  s: EmpireSettings,
): { found: string[]; all: number } {
  const all = regionCities(s, region);
  if (all.length === 0) return { found: [], all: 0 };
  const seen = revealedOf(h, s);
  return { found: all.filter((c) => seen.has(c.cell)).map((c) => c.code), all: all.length };
}

/**
 * The share of a region's daily book the house reaches: that of the cities it has found (all of
 * it in a region without cities, or a world without a map).
 */
export function bookShareBps(h: EmpireHouse, region: string, s: EmpireSettings): number {
  // With a reach: the cities within reach of a counter, not merely those found.
  if (s.map.reach) {
    // Each city weighs its share (Venice, the capital, more than a market town).
    const all = s.map.cities.filter((c) => c.region === region);
    if (all.length === 0) return 10_000;
    const covered = citiesCovered(h, s);
    const total = all.reduce((n, c) => n + c.weight, 0);
    const reached = all.filter((c) => covered.has(c.code)).reduce((n, c) => n + c.weight, 0);
    return Math.floor((reached * 10_000) / total);
  }
  const { found, all } = citiesFound(h, region, s);
  if (all === 0) return 10_000;
  return Math.floor((found.length * 10_000) / all);
}

/** A counter of before: its name, its point at its cell's centre, its region's level. */
function namePosts(h: EmpireHouse, s: EmpireSettings): void {
  if (h.posts?.some((p) => p.id === undefined || p.x === undefined || p.level === undefined)) {
    const named = new Set<string>();
    h.posts = h.posts.map((p, i) => {
      const [x, y] = pointOf(p.cell, s);
      const first = !named.has(p.region);
      named.add(p.region);
      return {
        ...p,
        id: p.id ?? `p${i + 1}`,
        x: p.x ?? x,
        y: p.y ?? y,
        level: p.level ?? (first ? (h.counters?.[p.region] ?? 1) : 1),
      };
    });
  }
}

/**
 * A house of an older world, taken up on the map at its first read: Venetia seen, the seat of each
 * region where it holds a counter seen around and a counter put there, its Arsenal on Venetia's
 * coast when it has a ship. Never undoes what it already has.
 */
export function ensureMap(h: EmpireHouse, s: EmpireSettings): void {
  if (!hasMap(s)) return;
  // The Arsenal gone (1 November): a house that had one has its Remise there.
  if (s.map.depot && h.arsenal && !h.depot) h.depot = h.arsenal;
  // The sectors bought one by one: a house of before owns those it has built on.
  if (s.map.unlock && !h.unlocked && h.revealed && h.mapVersion === s.map.version)
    h.unlocked = ownedAtStart(h, s);
  // A house that already played the Terraferma keeps its door: its Campo in Venetia.
  if ((h.terraBest || h.terraSeals) && !h.camp) {
    const home = homeCell(s);
    if (home) h.camp = home;
  }
  // A house that already bought a land vehicle keeps its Remise: in Venetia.
  if (s.map.depot && !h.depot) {
    const land = (h.vehicles ?? []).length;
    const home = homeCell(s);
    if (home && (land > s.start.vehicles.length || h.vehicleLevels)) h.depot = home;
  }
  namePosts(h, s);
  // Taken up once per drawing of the map: a house of an older grid has its cells drawn again.
  if (h.revealed && h.mapVersion === s.map.version) return;
  const moved = h.revealed !== undefined;
  const seen = new Set(startCells(s));
  const posts: { cell: string; region: string }[] = [];
  for (const region of Object.keys(h.counters ?? {})) {
    const seat = regionSeat(s, region);
    if (!seat) continue;
    for (const c of cellsWithin(seat, s.map.revealRadius)) seen.add(c);
    posts.push({ cell: seat, region });
  }
  h.revealed = [...seen].sort();
  h.mapVersion = s.map.version;
  if (moved || !h.posts) h.posts = posts.length > 0 ? posts : undefined;
  namePosts(h, s);
  // The sectors owned: Venice's, and those of its counters and buildings.
  if (s.map.unlock) h.unlocked = ownedAtStart(h, s);
  if (h.camp && moved) h.camp = homeCell(s) ?? h.camp;
  if (h.depot && moved) h.depot = homeCell(s) ?? h.depot;
  // The sites under way on the cells of before end where they now stand.
  if (moved)
    for (const b of h.builds)
      if (b.cell && !s.map.cells[b.cell]) {
        b.cell = regionCells(s, b.region ?? HOME)[0] ?? b.cell;
        b.reveal = b.cell ? cellsWithin(b.cell, s.map.revealRadius) : b.reveal;
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
export function placeCounter(
  tx: Tx,
  playerId: PlayerId,
  cell: string,
  x?: number,
  y?: number,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail(s.map.unlock ? "locked_cell" : "hidden_cell");
  // Its point (the map that grows): anywhere in the cell, its centre when none is given.
  const [cx, cy] = pointOf(cell, s);
  const at: [number, number] = [x ?? cx, y ?? cy];
  if (!Number.isInteger(at[0]) || !Number.isInteger(at[1])) fail("unknown_cell");
  if (cellAtPoint(at[0], at[1], s) !== cell) fail("unknown_cell");
  if (s.map.postSpacing > 0) {
    const others: [number, number][] = [
      ...standingPosts(h, s).map((p): [number, number] => [p.x, p.y]),
      ...h.builds
        .filter((b) => b.kind === "post" && b.x !== undefined && b.y !== undefined)
        .map((b): [number, number] => [b.x ?? 0, b.y ?? 0]),
    ];
    if (others.some((o) => within(o, at, s.map.postSpacing - 1))) fail("post_too_close");
  } else if (
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
    x: at[0],
    y: at[1],
    post: nextId(tx, "c"),
    // The sectors bought one by one: a counter reveals nothing more of itself.
    reveal: s.map.unlock ? [] : revealedBy(cell, s),
    ...site,
  });
}

/**
 * Puts the Campo on a land cell the house sees, with nothing else on it, from its Casa: the door
 * of the Terraferma (decision of the owner, 31 October 2026).
 */
export function buildCamp(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const camp = s.map.camp;
  if (!camp) fail("unknown_building_type");
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (h.camp || h.builds.some((b) => b.kind === "camp")) fail("built");
  if (h.casa < camp.casa) fail("requirement_unmet");
  const price = BigInt(camp.costDucats) * DENIERS_PER_DUCAT;
  const site = openSite(tx, playerId, h, price, {}, camp.minutes, 0);
  h.builds.push({ kind: "camp", level: 1, region: c.region, cell, ...site });
}

/**
 * Puts the Remise on a land cell the house sees, from its Casa: there the land vehicles are bought
 * and their models raised (decision of the owner, 31 October 2026, evening).
 */
export function buildDepot(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const depot = s.map.depot;
  if (!depot) fail("unknown_building_type");
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (h.depot || h.builds.some((b) => b.kind === "depot")) fail("built");
  if (h.casa < depot.casa) fail("requirement_unmet");
  const price = BigInt(depot.costDucats) * DENIERS_PER_DUCAT;
  const site = openSite(tx, playerId, h, price, {}, depot.minutes, 0);
  h.builds.push({ kind: "depot", level: 1, region: c.region, cell, ...site });
}

/** The Remise asked by the land vehicles, in a world that sets one. */
export function checkDepot(h: EmpireHouse, s: EmpireSettings): void {
  if (hasMap(s) && s.map.depot && !h.depot) fail("no_depot");
}

/** The Campo asked by the Terraferma, in a world that sets one. */
export function checkCamp(h: EmpireHouse, s: EmpireSettings): void {
  if (hasMap(s) && s.map.camp && !h.camp) fail("no_camp");
}

/**
 * A counter's site done: it stands on its cell and reveals those around it (`radius`), and opens
 * its region if none stood there. Called by `settleBuilds`, which knows no settings: the build
 * carries the cells it reveals.
 */
export function settlePost(
  h: EmpireHouse,
  cell: string,
  region: string,
  reveal: string[],
  at?: { id?: string; x?: number; y?: number },
): void {
  const id = at?.id ?? `p${(h.posts ?? []).length + 1}`;
  h.posts = [...(h.posts ?? []), { id, cell, region, x: at?.x, y: at?.y, level: 1 }];
  h.revealed = [...new Set([...(h.revealed ?? []), ...reveal])].sort();
  if (region !== HOME && !h.counters?.[region]) h.counters = { ...(h.counters ?? {}), [region]: 1 };
}
