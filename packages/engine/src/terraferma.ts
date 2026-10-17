import { hourIn, hourWithin } from "./clock.js";
import type { WorldSettings } from "./settings.js";
import { DAY_MS, MINUTE_MS } from "./state.js";
import { fail } from "./tx.js";

/**
 * The Terraferma after OpenFront (docs/plan-terraferme.md), first as a prototype played by the
 * simulator: a hexagonal map that grows with the world, Milan holding the west, each merchant's
 * own territory, troops that come back toward a cap set by the land held, and fronts that take
 * a few cells each step on their own, the nearest to their aim first.
 *
 * Pure and deterministic: the state is plain data, advanced step by step (only open steps count),
 * and every choice breaks ties on the cell's index.
 */

export type TerraConfig = NonNullable<WorldSettings["terraferma"]>;

export const MILAN = "milan";

export interface TerraMap {
  width: number;
  height: number;
  /** Terrain code, cell by cell (row by row, from the north-west). */
  terrain: string[];
  city: boolean[];
}

export interface TerraPlayer {
  troops: number;
  placedAt: number;
  protectedUntil: number;
  /** Glory of the week, per open step: cells and cities held. */
  glory: number;
  /** A cap that does not follow the land (Milan's): a nation that does not snowball. */
  fixedCap?: number;
  /** The cell it set down on: never taken, so a merchant is never wiped off the map. */
  capital?: number;
}

export interface TerraFront {
  id: string;
  owner: string;
  /** Whose cells it takes: a merchant, Milan, or null for neutral land. */
  against: string | null;
  /** The cell aimed at: the front takes the cells nearest to it first. */
  aim: number;
  troops: number;
  launchedAt: number;
  /** Open steps it has advanced. */
  steps?: number;
}

export interface TerraState {
  map: TerraMap;
  startAt: number;
  /** Who holds each cell (null: neutral, held by its militia). */
  owner: (string | null)[];
  players: Record<string, TerraPlayer>;
  /** Open fronts, in the order they were launched. */
  fronts: TerraFront[];
  nextFront: number;
  /** End of the last step resolved. */
  clock: number;
  /** Open steps since Milan last rode out. */
  milanSteps: number;
}

// ——— The map ———

/** FNV-1a and a final avalanche: the same seed and key, the same number. */
function hash(seed: string, key: string): number {
  const text = `${seed}|${key}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Rows offset by half a cell every other row ("odd-r"): the cube coordinates of a cell. */
function cube(map: Pick<TerraMap, "width">, i: number): [number, number, number] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  const x = col - (row - (row & 1)) / 2;
  return [x, -x - row, row];
}

export function hexDistance(map: Pick<TerraMap, "width">, a: number, b: number): number {
  const [ax, ay, az] = cube(map, a);
  const [bx, by, bz] = cube(map, b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

export function hexNeighbors(map: Pick<TerraMap, "width" | "height">, i: number): number[] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  const odd = row & 1;
  const steps = odd
    ? [
        [1, 0],
        [-1, 0],
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [-1, 1],
        [0, 1],
      ];
  const out: number[] = [];
  for (const [dc, dr] of steps) {
    const c = col + (dc as number);
    const r = row + (dr as number);
    if (c >= 0 && c < map.width && r >= 0 && r < map.height) out.push(r * map.width + c);
  }
  return out.sort((a, b) => a - b);
}

/** The map for so many active merchants: its terrain by bands from the north, its cities. */
export function terraMap(cfg: TerraConfig, seed: string, active: number): TerraMap {
  const cells = cfg.cellsPerActive * Math.max(cfg.minActive, active);
  const height = Math.max(3, Math.round(Math.sqrt((cells * 10_000) / cfg.aspectBps)));
  const width = Math.max(3, Math.ceil(cells / height));
  const terrain: string[] = [];
  for (let i = 0; i < width * height; i++) {
    const row = Math.floor(i / width);
    const share = Math.floor(((row + 1) * 10_000) / height);
    const band = cfg.bands.find((b) => share <= b.untilBps) ?? cfg.bands.at(-1);
    const weights = Object.entries(band?.weights ?? {}).filter(([k]) => cfg.terrains[k]);
    const total = weights.reduce((n, [, w]) => n + w, 0);
    let r = total > 0 ? hash(seed, `terrain:${i}`) % total : 0;
    let pick = weights[0]?.[0] ?? Object.keys(cfg.terrains)[0] ?? "plain";
    for (const [k, w] of weights) {
      if (r < w) {
        pick = k;
        break;
      }
      r -= w;
    }
    terrain.push(pick);
  }
  // Cities: spread over the land east of Milan, each the farthest from those already placed.
  const city = Array.from({ length: width * height }, () => false);
  const milanCols = Math.ceil((width * cfg.milanBps) / 10_000);
  const free = Array.from({ length: width * height }, (_, i) => i).filter(
    (i) => i % width >= milanCols,
  );
  const placed: number[] = [];
  for (let k = 0; k < cfg.cities && free.length > 0; k++) {
    const first = free[hash(seed, `city:${k}`) % free.length] as number;
    const next =
      placed.length === 0
        ? first
        : free.reduce((best, i) => {
            const d = (j: number) => Math.min(...placed.map((p) => hexDistance({ width }, p, j)));
            return d(i) > d(best) ? i : best;
          }, first);
    placed.push(next);
    city[next] = true;
  }
  return { width, height, terrain, city };
}

/** A fresh week: Milan in the west, the rest neutral. */
export function newTerra(
  cfg: TerraConfig,
  seed: string,
  active: number,
  startAt: number,
): TerraState {
  const map = terraMap(cfg, seed, active);
  const milanCols = Math.ceil((map.width * cfg.milanBps) / 10_000);
  return {
    map,
    startAt,
    owner: map.terrain.map((_, i) => (i % map.width < milanCols ? MILAN : null)),
    players: {
      [MILAN]: {
        troops: cfg.milan.troops + cfg.milan.troopsPerActive * active,
        placedAt: startAt,
        protectedUntil: startAt,
        glory: 0,
        fixedCap: cfg.milan.troops + cfg.milan.troopsPerActive * active,
      },
    },
    fronts: [],
    nextFront: 1,
    clock: startAt,
    milanSteps: 0,
  };
}

// ——— Reading ———

export function cellsOf(s: TerraState, id: string): number[] {
  const out: number[] = [];
  s.owner.forEach((o, i) => {
    if (o === id) out.push(i);
  });
  return out;
}

export function capOf(s: TerraState, cfg: TerraConfig, id: string): number {
  const fixed = s.players[id]?.fixedCap;
  if (fixed !== undefined) return fixed;
  const cells = cellsOf(s, id);
  const cities = cells.filter((i) => s.map.city[i]).length;
  return cfg.troops.base + cfg.troops.perCell * cells.length + cfg.troops.perCity * cities;
}

/** What a front pays for a cell: the militia of neutral land, else its holder's density. */
export function cellCost(s: TerraState, cfg: TerraConfig, i: number): number {
  const terrain = cfg.terrains[s.map.terrain[i] ?? ""] ?? { defenseBps: 10_000, militia: 1 };
  const city = s.map.city[i];
  const holder = s.owner[i];
  if (holder === null || holder === undefined) {
    const militia = city
      ? Math.ceil((terrain.militia * cfg.city.militiaBps) / 10_000)
      : terrain.militia;
    return Math.max(1, militia);
  }
  const defenseBps = city ? cfg.city.defenseBps : 10_000;
  return Math.max(1, Math.ceil((densityOf(s, holder) * terrain.defenseBps * defenseBps) / 1e8));
}

function densityOf(s: TerraState, id: string): number {
  const cells = cellsOf(s, id).length;
  return Math.max(1, Math.floor((s.players[id]?.troops ?? 0) / Math.max(1, cells)));
}

const borders = (s: TerraState, id: string, i: number) =>
  hexNeighbors(s.map, i).some((n) => s.owner[n] === id);

// ——— Acting ———

/** A merchant sets down on a free cell, far enough from everyone, with the neutral ring around. */
export function placeOnTerra(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  cell: number,
  now: number,
): void {
  if (s.players[id]) fail("already_placed");
  if (cell < 0 || cell >= s.owner.length || s.owner[cell] !== null) fail("not_neutral");
  for (let j = 0; j < s.owner.length; j++) {
    if (s.owner[j] !== null && hexDistance(s.map, cell, j) < cfg.start.minDistance)
      fail("too_close");
  }
  s.owner[cell] = id;
  for (const n of hexNeighbors(s.map, cell)) if (s.owner[n] === null) s.owner[n] = id;
  const day = Math.max(0, Math.floor((now - s.startAt) / DAY_MS));
  s.players[id] = {
    troops: cfg.start.troops + cfg.start.troopsPerDay * day,
    placedAt: now,
    protectedUntil: now + cfg.start.protectionHours * 3_600_000,
    glory: 0,
    capital: cell,
  };
}

/** A share of the merchant's troops leaves toward a neighbouring cell: a new front. */
export function launchFront(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  aim: number,
  shareBps: number,
  now: number,
): TerraFront {
  const player = s.players[id];
  if (!player) fail("not_placed");
  if (shareBps < cfg.fronts.minShareBps || shareBps > 10_000) fail("share_too_small");
  const against = s.owner[aim];
  if (against === undefined) fail("not_adjacent");
  if (against === id) fail("own_cell");
  if (!borders(s, id, aim)) fail("not_adjacent");
  if (against !== null) {
    if (id !== MILAN && player.protectedUntil > now && against !== MILAN) fail("protected");
    if ((s.players[against]?.protectedUntil ?? 0) > now) fail("protected");
  }
  if (s.fronts.filter((f) => f.owner === id).length >= cfg.fronts.max) fail("too_many_fronts");
  const troops = Math.floor((player.troops * shareBps) / 10_000);
  if (troops <= 0) fail("no_troops");
  player.troops -= troops;
  const front: TerraFront = {
    id: `t${s.nextFront++}`,
    owner: id,
    against,
    aim,
    troops,
    launchedAt: now,
  };
  s.fronts.push(front);
  return front;
}

/** The front called back: what is left of its troops comes home. */
export function recallFront(s: TerraState, id: string, frontId: string): void {
  const front = s.fronts.find((f) => f.id === frontId);
  if (!front) fail("unknown_front");
  if (front.owner !== id) fail("not_owner");
  endFront(s, front);
}

function endFront(s: TerraState, front: TerraFront): void {
  const owner = s.players[front.owner];
  if (owner) owner.troops += front.troops;
  s.fronts = s.fronts.filter((f) => f.id !== front.id);
}

// ——— Time ———

/** Resolves every whole step up to `until`; closed steps (the night) change nothing. */
export function advanceTerra(s: TerraState, cfg: TerraConfig, until: number): void {
  const stepMs = cfg.stepMinutes * MINUTE_MS;
  while (s.clock + stepMs <= until) {
    const from = s.clock;
    s.clock += stepMs;
    if (hourWithin(hourIn(from), cfg.openHours)) step(s, cfg, from);
  }
}

function step(s: TerraState, cfg: TerraConfig, at: number): void {
  // Troops come back toward the cap.
  for (const [id, p] of Object.entries(s.players)) {
    const cap = capOf(s, cfg, id);
    if (p.troops >= cap) continue;
    const rate = id === MILAN ? cfg.milan.regenBps : cfg.troops.regenBps;
    const back = Math.max(cfg.troops.regenMin, Math.floor(((cap - p.troops) * rate) / 10_000));
    p.troops = Math.min(cap, p.troops + back);
  }
  // Fronts, in the order they were launched.
  for (const front of [...s.fronts]) advanceFront(s, cfg, front);
  // Glory for the land held.
  for (const [id, p] of Object.entries(s.players)) {
    if (id === MILAN) continue;
    const cells = cellsOf(s, id);
    p.glory +=
      cfg.glory.perCell * cells.length +
      cfg.glory.perCity * cells.filter((i) => s.map.city[i]).length;
  }
  // Milan rides out.
  s.milanSteps++;
  if (s.milanSteps * cfg.stepMinutes >= cfg.milan.everyHours * 60) {
    s.milanSteps = 0;
    milanRides(s, cfg, at);
  }
}

function advanceFront(s: TerraState, cfg: TerraConfig, front: TerraFront): void {
  front.steps = (front.steps ?? 0) + 1;
  if (cfg.fronts.maxHours > 0 && front.steps * cfg.stepMinutes > cfg.fronts.maxHours * 60) {
    endFront(s, front);
    return;
  }
  for (let k = 0; k < cfg.fronts.cellsPerStep; k++) {
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    const capitals = new Set(Object.values(s.players).map((p) => p.capital));
    for (let i = 0; i < s.owner.length; i++) {
      if (s.owner[i] !== front.against || !borders(s, front.owner, i)) continue;
      if (capitals.has(i)) continue;
      const d = hexDistance(s.map, i, front.aim);
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    const cost = best < 0 ? 0 : cellCost(s, cfg, best);
    if (best < 0 || front.troops < cost) {
      endFront(s, front);
      return;
    }
    front.troops -= cost;
    if (front.against !== null) {
      const defender = s.players[front.against];
      if (defender) defender.troops = Math.max(0, defender.troops - densityOf(s, front.against));
    }
    s.owner[best] = front.owner;
  }
}

/** Milan's ride: at the leader in glory it borders (not protected), else into neutral land. */
function milanRides(s: TerraState, cfg: TerraConfig, at: number): void {
  if (s.fronts.some((f) => f.owner === MILAN)) return;
  const milan = cellsOf(s, MILAN);
  if (milan.length === 0) return;
  const leaders = Object.entries(s.players)
    .filter(([id, p]) => id !== MILAN && p.protectedUntil <= at)
    .sort((a, b) => b[1].glory - a[1].glory || (a[0] < b[0] ? -1 : 1));
  for (const [id] of leaders) {
    const target = s.owner.findIndex((o, i) => o === id && borders(s, MILAN, i));
    if (target >= 0) {
      launchFront(s, cfg, MILAN, target, cfg.milan.shareBps, at);
      return;
    }
  }
  // Nobody to strike: Milan spreads east, toward the middle of the map.
  const centre = Math.floor(s.map.height / 2) * s.map.width + Math.floor(s.map.width / 2);
  let best = -1;
  for (let i = 0; i < s.owner.length; i++) {
    if (s.owner[i] !== null || !borders(s, MILAN, i)) continue;
    if (best < 0 || hexDistance(s.map, i, centre) < hexDistance(s.map, best, centre)) best = i;
  }
  if (best >= 0) launchFront(s, cfg, MILAN, best, cfg.milan.shareBps, at);
}
