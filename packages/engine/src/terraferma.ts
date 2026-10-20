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
  /** Centre of the first cell and the cells' radius, in the drawn map's coordinates. */
  origin: [number, number];
  size: number;
  /** Land cells; the others are water, never held. */
  land: boolean[];
  /** Terrain code, cell by cell (row by row, from the north-west). */
  terrain: string[];
  city: boolean[];
  /** The city a cell stands for, when the map follows the real geography. */
  cityCode: (string | null)[];
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
  /** Troops of cap bought with ducats this week. */
  boughtCap?: number;
  /** Cap raises and troops sent to allies, on the day they were counted. */
  today?: { day: number; raises: number; gifts: number };
  /** Alliances broken this week, and until when it is a traitor. */
  breaks?: number;
  traitorUntil?: number;
  /** Launched a front at another merchant this week: its capital may fall (`peacefulSafe`). */
  aggressor?: boolean;
  /** Share of its people working the land rather than under arms (bps; absent: half). */
  peasantsBps?: number;
  /** Goods its land has grown, not yet in its stock, in 1/10 000 of a unit. */
  harvest?: Record<string, number>;
  /** Ducats its city routes have earned, not yet paid (deniers). */
  routeOwed?: bigint;
  /** When it lost its last cell: out of the week. */
  eliminatedAt?: number;
}

export type TerraBuilding = "rocca" | "borgo";

export interface TerraAlliance {
  a: string;
  b: string;
  /** Once broken: when the break takes effect. */
  endsAt?: number;
}

export interface TerraClose {
  at: number;
  signore: string | null;
  /** Took the land before the week's end. */
  conquest: boolean;
  ranking: { id: string; glory: number; cells: number; tier: string; influence: number }[];
  decree: { code: string; target?: string } | null;
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
  /** Troops it left with, and the cells it has taken. */
  sent?: number;
  taken?: number;
}

/** A front come home: what it took, spent and brought back (kept a day). */
export interface TerraReturn {
  front: string;
  owner: string;
  against: string | null;
  cells: number;
  spent: number;
  back: number;
  at: number;
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
  /** Open steps since pockets last fell. */
  hourSteps?: number;
  /** Minutes of battle steps since the last step of troops and glory. */
  battleMinutes?: number;
  alliances?: TerraAlliance[];
  /** Alliances asked for, not yet accepted: from → to. */
  requests?: { from: string; to: string }[];
  buildings?: Record<number, { owner: string; kind: TerraBuilding }>;
  /** The decree each merchant would impose as Signore (public). */
  programme?: Record<string, { code: string; target?: string }>;
  /** The week closed: no step any more. */
  closed?: TerraClose;
  /** Its Influence and decree handed out to the world. */
  closedSeen?: boolean;
  /** When each cell last changed hands, and from whom (null: neutral land). */
  taken?: Record<number, { at: number; from: string | null }>;
  /** The fronts come home in the last day, oldest first. */
  returns?: TerraReturn[];
  /** Only on a forecast's copy: each cell a front takes, when the step that takes it ends. */
  trace?: { front: string; cell: number; at: number }[];
}

/** A cell changing hands, remembered for the merchants who were away. */
function seize(s: TerraState, cell: number, id: string, at: number): void {
  const from = s.owner[cell] ?? null;
  if (from === id) return;
  s.owner[cell] = id;
  s.taken ??= {};
  s.taken[cell] = { at, from };
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

/** Centre of a cell, in the drawn map's coordinates (pointy hexagons, odd rows shifted). */
export function cellCenter(map: TerraMap, i: number): [number, number] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  return [
    map.origin[0] + map.size * Math.sqrt(3) * (col + 0.5 * (row & 1)),
    map.origin[1] + map.size * 1.5 * row,
  ];
}

function inPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as [number, number];
    const [xj, yj] = poly[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The map for so many active merchants: on the real land when the settings draw it (the cells
 * finer as the world grows, the same shape), else a rectangle; the terrain by bands from the
 * north, the cities.
 */
export function terraMap(cfg: TerraConfig, seed: string, active: number): TerraMap {
  const target = cfg.cellsPerActive * Math.max(cfg.minActive, active);
  const geo = cfg.geography;
  let width: number;
  let height: number;
  let size: number;
  let origin: [number, number];
  let isLand: (x: number, y: number) => boolean;
  if (geo) {
    const { x0, y0, x1, y1 } = geo.box;
    isLand = (x, y) =>
      x >= x0 && x <= x1 && y >= y0 && y <= y1 && !geo.water.some((w) => inPolygon(x, y, w));
    // The land's area, sampled; then the radius that gives about `target` land cells.
    let landSamples = 0;
    for (let a = 0; a < 80; a++) {
      for (let b = 0; b < 80; b++) {
        if (isLand(x0 + ((a + 0.5) * (x1 - x0)) / 80, y0 + ((b + 0.5) * (y1 - y0)) / 80))
          landSamples++;
      }
    }
    const area = ((x1 - x0) * (y1 - y0) * landSamples) / 6_400;
    size = Math.sqrt(area / (target * ((3 * Math.sqrt(3)) / 2)));
    width = Math.max(3, Math.ceil((x1 - x0) / (size * Math.sqrt(3))));
    height = Math.max(3, Math.floor((y1 - y0) / (size * 1.5)) + 1);
    origin = [x0, y0];
  } else {
    height = Math.max(3, Math.round(Math.sqrt((target * 10_000) / cfg.aspectBps)));
    width = Math.max(3, Math.ceil(target / height));
    size = 1;
    origin = [0, 0];
    isLand = () => true;
  }
  const map: TerraMap = {
    width,
    height,
    origin,
    size,
    land: [],
    terrain: [],
    city: Array.from({ length: width * height }, () => false),
    cityCode: Array.from({ length: width * height }, () => null),
  };
  for (let i = 0; i < width * height; i++) {
    const [x, y] = cellCenter(map, i);
    const land = isLand(x, y);
    map.land.push(land);
    if (!land) {
      map.terrain.push("water");
      continue;
    }
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
    map.terrain.push(pick);
  }
  if (geo) {
    // Each city on the land cell nearest to where it stands.
    for (const c of geo.cities) {
      let best = -1;
      let bestD = Number.POSITIVE_INFINITY;
      for (let i = 0; i < map.land.length; i++) {
        if (!map.land[i] || map.city[i]) continue;
        const [x, y] = cellCenter(map, i);
        const d = (x - c.x) ** 2 + (y - c.y) ** 2;
        if (d < bestD) {
          best = i;
          bestD = d;
        }
      }
      if (best >= 0) {
        map.city[best] = true;
        map.cityCode[best] = c.code;
      }
    }
    return map;
  }
  // Without geography: cities spread over the land east of Milan, each the farthest from the
  // ones already placed.
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
    map.city[next] = true;
  }
  return map;
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
    owner: map.terrain.map((_, i) => (map.land[i] && i % map.width < milanCols ? MILAN : null)),
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
  return (
    cfg.troops.base +
    cfg.troops.perCell * cells.length +
    cfg.troops.perCity * cities +
    (cfg.buildings.borgo?.capBonus ?? 0) * terraBuildingsOf(s, id, "borgo").length +
    (s.players[id]?.boughtCap ?? 0)
  );
}

/** Troops a merchant recruits each open hour (with `troops.recruit`): more with more land. */
export function recruitPerHour(s: TerraState, cfg: TerraConfig, id: string): number {
  const r = cfg.troops.recruit;
  if (!r) return 0;
  const cells = cellsOf(s, id);
  const base =
    r.base + r.perCell * cells.length + r.perCity * cells.filter((i) => s.map.city[i]).length;
  // With peasants: soldiers recruit in proportion, twice as many when nobody works the land.
  if (!cfg.peasants) return base;
  return Math.floor((base * (10_000 - peasantsOf(s, id)) * 2) / 10_000);
}

/** The share of a merchant's people working the land (bps). */
export function peasantsOf(s: TerraState, id: string): number {
  return s.players[id]?.peasantsBps ?? 5_000;
}

/**
 * What a merchant's land yields an open hour at its current slider: goods in hundredths of a
 * unit, and the routes' ducats (deniers).
 */
export function yieldPerHour(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
): { goods: Record<string, number>; route: bigint } {
  const pc = cfg.peasants;
  const p = s.players[id];
  if (!pc || !p) return { goods: {}, route: 0n };
  const cells = cellsOf(s, id);
  const share = peasantsOf(s, id);
  const goods: Record<string, number> = {};
  for (const [terrain, y] of Object.entries(pc.yields)) {
    const n = cells.filter((i) => s.map.terrain[i] === terrain).length;
    if (n > 0)
      goods[y.resource] =
        (goods[y.resource] ?? 0) + Math.floor((n * 100 * share * 2) / (y.perCells * 10_000));
  }
  let route = 0n;
  if (p.capital !== undefined && s.owner[p.capital] === id) {
    const joined = [...component(s, id, p.capital)].filter((i) => s.map.city[i]).length;
    if (joined >= 2) route = pc.routeDucats * BigInt(joined);
  }
  return { goods, route };
}

/** The merchant moves the slider between soldiers and peasants. */
export function setPeasants(s: TerraState, id: string, bps: number): void {
  const p = s.players[id];
  if (!p || id === MILAN) fail("not_placed");
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) fail("invalid_quantity");
  p.peasantsBps = bps;
}

/**
 * The land's yield and the city routes, for an economic step of `minutes`: each terrain grows its
 * good (one unit per `perCells` cells an hour, at half peasants, more with more), and the cities
 * joined to the capital by the merchant's own land, two at least, earn their ducats.
 */
function harvestStep(s: TerraState, cfg: TerraConfig, minutes: number): void {
  const pc = cfg.peasants;
  if (!pc) return;
  for (const [id, p] of Object.entries(s.players)) {
    if (id === MILAN || p.eliminatedAt !== undefined) continue;
    const cells = cellsOf(s, id);
    const share = peasantsOf(s, id);
    for (const [terrain, y] of Object.entries(pc.yields)) {
      const n = cells.filter((i) => s.map.terrain[i] === terrain).length;
      if (n === 0) continue;
      const grown = Math.floor((n * 10_000 * minutes * share * 2) / (y.perCells * 60 * 10_000));
      p.harvest = { ...p.harvest, [y.resource]: (p.harvest?.[y.resource] ?? 0) + grown };
    }
    if (pc.routeDucats > 0n && p.capital !== undefined && s.owner[p.capital] === id) {
      const joined = [...component(s, id, p.capital)].filter((i) => s.map.city[i]).length;
      if (joined >= 2)
        p.routeOwed = (p.routeOwed ?? 0n) + (pc.routeDucats * BigInt(joined * minutes)) / 60n;
    }
  }
}

export function terraBuildingsOf(s: TerraState, id: string, kind?: TerraBuilding): number[] {
  return Object.entries(s.buildings ?? {})
    .filter(([, b]) => b.owner === id && (kind === undefined || b.kind === kind))
    .map(([cell]) => Number(cell));
}

export function alliesOf(s: TerraState, id: string): string[] {
  return (s.alliances ?? [])
    .filter((a) => a.a === id || a.b === id)
    .map((a) => (a.a === id ? a.b : a.a))
    .sort();
}

const allied = (s: TerraState, x: string, y: string) => alliesOf(s, x).includes(y);
const traitor = (s: TerraState, id: string, at: number) => (s.players[id]?.traitorUntil ?? 0) > at;

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
  // A rocca guards its cell and the six around it.
  const rocca = [i, ...hexNeighbors(s.map, i)].some((c) => {
    const b = s.buildings?.[c];
    return b?.kind === "rocca" && b.owner === holder;
  });
  const roccaBps = rocca ? cfg.buildings.rocca.defenseBps : 10_000;
  const traitorBps = traitor(s, holder, s.clock) ? cfg.alliances.traitorDefenseBps : 10_000;
  // Exact: density × four multipliers in bps, rounded up.
  const num =
    BigInt(densityOf(s, holder)) *
    BigInt(terrain.defenseBps) *
    BigInt(defenseBps) *
    BigInt(roccaBps) *
    BigInt(traitorBps);
  const den = 10_000n ** 4n;
  return Math.max(1, Number((num + den - 1n) / den));
}

function densityOf(s: TerraState, id: string): number {
  const cells = cellsOf(s, id).length;
  return Math.max(1, Math.floor((s.players[id]?.troops ?? 0) / Math.max(1, cells)));
}

const borders = (s: TerraState, id: string, i: number) =>
  hexNeighbors(s.map, i).some((n) => s.owner[n] === id);

// ——— Acting ———

/** Whether a neutral land cell is still far enough from everyone to set down on. */
function neutralSpotLeft(s: TerraState, cfg: TerraConfig): boolean {
  const held: number[] = [];
  s.owner.forEach((o, j) => {
    if (o !== null) held.push(j);
  });
  return s.owner.some(
    (o, i) =>
      o === null &&
      s.map.land[i] &&
      held.every((j) => hexDistance(s.map, i, j) >= cfg.start.minDistance),
  );
}

/**
 * A merchant sets down: on a free land cell far enough from everyone, with the neutral ring
 * around; or, once no such cell is left (the latecomer's case), on the edge of Milan's land,
 * taking the ring from Milan.
 */
export function placeOnTerra(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  cell: number,
  now: number,
): void {
  if (s.players[id]) fail("already_placed");
  const placementEnd =
    cfg.start.placementHours > 0 ? s.startAt + cfg.start.placementHours * 3_600_000 : 0;
  if (placementEnd > 0 && now >= placementEnd) fail("placement_closed");
  if (cell < 0 || cell >= s.owner.length || !s.map.land[cell]) fail("not_neutral");
  const holder = s.owner[cell];
  const onMilan = holder === MILAN;
  if (onMilan) {
    const edge = hexNeighbors(s.map, cell).some((n) => s.map.land[n] && s.owner[n] !== MILAN);
    if (!edge) fail("not_neutral");
    if (neutralSpotLeft(s, cfg)) fail("neutral_left");
  } else {
    if (holder !== null) fail("not_neutral");
    for (let j = 0; j < s.owner.length; j++) {
      if (s.owner[j] !== null && hexDistance(s.map, cell, j) < cfg.start.minDistance)
        fail("too_close");
    }
  }
  const takes = (o: string | null | undefined) => o === null || (onMilan && o === MILAN);
  seize(s, cell, id, now);
  for (const n of hexNeighbors(s.map, cell)) {
    if (s.map.land[n] && takes(s.owner[n])) seize(s, n, id, now);
  }
  const day = Math.max(0, Math.floor((now - s.startAt) / DAY_MS));
  s.players[id] = {
    troops: cfg.start.troops + cfg.start.troopsPerDay * day,
    placedAt: now,
    protectedUntil: Math.max(
      placementEnd,
      s.startAt + cfg.start.truceHours * 3_600_000,
      now + cfg.start.protectionHours * 3_600_000,
    ),
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
  if (against === undefined || !s.map.land[aim]) fail("not_adjacent");
  if (against === id) fail("own_cell");
  if (!borders(s, id, aim)) fail("not_adjacent");
  if (against !== null) {
    if (allied(s, id, against)) fail("allied");
    if (id !== MILAN && player.protectedUntil > now && against !== MILAN) fail("protected");
    if ((s.players[against]?.protectedUntil ?? 0) > now) fail("protected");
  }
  if (s.fronts.filter((f) => f.owner === id).length >= cfg.fronts.max) fail("too_many_fronts");
  const troops = Math.floor((player.troops * shareBps) / 10_000);
  if (troops <= 0) fail("no_troops");
  // Not even the cell aimed at: the front would come straight home (Milan rides as it can).
  if (id !== MILAN && troops < cellCost(s, cfg, aim)) fail("too_weak");
  player.troops -= troops;
  if (against !== null && against !== MILAN && id !== MILAN) player.aggressor = true;
  const front: TerraFront = {
    id: `t${s.nextFront++}`,
    owner: id,
    against,
    aim,
    troops,
    launchedAt: now,
    sent: troops,
    taken: 0,
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
  // Its account, for the merchant who was away (Milan's are not kept).
  if (front.owner === MILAN) return;
  const sent = front.sent ?? front.troops;
  s.returns = [
    ...(s.returns ?? []).filter((r) => r.at > s.clock - DAY_MS),
    {
      front: front.id,
      owner: front.owner,
      against: front.against,
      cells: front.taken ?? 0,
      spent: sent - front.troops,
      back: front.troops,
      at: s.clock,
    },
  ];
}

// ——— Alliances ———

const merchant = (s: TerraState, id: string) => {
  if (id === MILAN || !s.players[id]) fail("not_placed");
};

/** Asks another merchant for an alliance; if it had asked first, the alliance is made. */
export function proposeAlliance(
  s: TerraState,
  cfg: TerraConfig,
  from: string,
  to: string,
  now: number,
): void {
  merchant(s, from);
  merchant(s, to);
  if (from === to) fail("own_cell");
  if (allied(s, from, to)) fail("allied");
  if (traitor(s, from, now) || traitor(s, to, now)) fail("traitor");
  if ((s.requests ?? []).some((r) => r.from === to && r.to === from)) {
    acceptAlliance(s, cfg, from, to, now);
    return;
  }
  if (alliesOf(s, from).length >= cfg.alliances.max) fail("too_many_allies");
  s.requests = [
    ...(s.requests ?? []).filter((r) => !(r.from === from && r.to === to)),
    { from, to },
  ];
}

/** Accepts an alliance asked for: no more fronts between the two, none to come. */
export function acceptAlliance(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  from: string,
  now: number,
): void {
  merchant(s, id);
  if (!(s.requests ?? []).some((r) => r.from === from && r.to === id)) fail("no_request");
  if (traitor(s, id, now) || traitor(s, from, now)) fail("traitor");
  if (alliesOf(s, id).length >= cfg.alliances.max || alliesOf(s, from).length >= cfg.alliances.max)
    fail("too_many_allies");
  s.requests = (s.requests ?? []).filter(
    (r) => !((r.from === from && r.to === id) || (r.from === id && r.to === from)),
  );
  const [a, b] = from < id ? [from, id] : [id, from];
  s.alliances = [...(s.alliances ?? []), { a, b }];
  for (const f of [...s.fronts]) {
    if ((f.owner === a && f.against === b) || (f.owner === b && f.against === a)) endFront(s, f);
  }
}

/**
 * Breaks an alliance: it ends after `breakHours`, which the other sees. Breaking too often in
 * the week makes a traitor: weaker land, and nobody may ally with it for a while.
 */
export function breakAlliance(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  other: string,
  now: number,
): void {
  const alliance = (s.alliances ?? []).find(
    (x) => (x.a === id && x.b === other) || (x.a === other && x.b === id),
  );
  if (!alliance) fail("not_allied");
  if (alliance.endsAt !== undefined) fail("breaking");
  alliance.endsAt = now + cfg.alliances.breakHours * 3_600_000;
  const player = s.players[id];
  if (!player) fail("not_placed");
  player.breaks = (player.breaks ?? 0) + 1;
  if (player.breaks > cfg.alliances.traitorBreaks)
    player.traitorUntil = now + cfg.alliances.traitorHours * 3_600_000;
}

/** Counters of the day (cap raises, troops sent), started afresh each day. */
function todayOf(s: TerraState, p: TerraPlayer, now: number) {
  const day = Math.floor((now - s.startAt) / DAY_MS);
  if (!p.today || p.today.day !== day) p.today = { day, raises: 0, gifts: 0 };
  return p.today;
}

/** Troops sent to an ally, within a share of the sender's cap a day. */
export function sendTroops(
  s: TerraState,
  cfg: TerraConfig,
  from: string,
  to: string,
  count: number,
  now: number,
): void {
  merchant(s, from);
  merchant(s, to);
  if (!allied(s, from, to)) fail("not_allied");
  if (!Number.isInteger(count) || count <= 0) fail("invalid_quantity");
  const sender = s.players[from] as TerraPlayer;
  const today = todayOf(s, sender, now);
  const limit = Math.floor((capOf(s, cfg, from) * cfg.alliances.giftShareBps) / 10_000);
  if (today.gifts + count > limit) fail("gift_limit");
  if (sender.troops < count) fail("no_troops");
  sender.troops -= count;
  today.gifts += count;
  (s.players[to] as TerraPlayer).troops += count;
}

// ——— Ducats: buildings and the cap (the caller takes the price) ———

/** A rocca or a borgo on one of the merchant's cells. Returns its price in deniers. */
export function buildOnTerra(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  cell: number,
  kind: TerraBuilding,
): bigint {
  merchant(s, id);
  if (s.owner[cell] !== id) fail("not_owner");
  if (s.buildings?.[cell]) fail("built");
  const def = cfg.buildings[kind];
  if (!def) fail("no_room");
  const room = Math.floor(cellsOf(s, id).length / def.perCells);
  if (terraBuildingsOf(s, id, kind).length >= room) fail("no_room");
  s.buildings = { ...(s.buildings ?? {}), [cell]: { owner: id, kind } };
  return def.price;
}

/** The cap of troops raised for the week, a few times a day. Returns its price in deniers. */
export function raiseCap(s: TerraState, cfg: TerraConfig, id: string, now: number): bigint {
  merchant(s, id);
  const player = s.players[id] as TerraPlayer;
  const today = todayOf(s, player, now);
  if (today.raises >= cfg.capRaise.perDay) fail("raise_limit");
  today.raises++;
  player.boughtCap = (player.boughtCap ?? 0) + cfg.capRaise.amount;
  return cfg.capRaise.price;
}

/** The decree the merchant would impose as Signore: public, it may change until the close. */
export function chooseDecree(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  pick: { code: string; target?: string },
): void {
  merchant(s, id);
  if (!cfg.close.decrees.includes(pick.code)) fail("invalid_programme");
  s.programme = { ...(s.programme ?? {}), [id]: pick };
}

// ——— The close ———

/**
 * The week closed (or the land taken): the merchants ranked by glory, Influence by tier, the
 * Signore and the decree it chose. Steps stop.
 */
export function closeTerra(
  s: TerraState,
  cfg: TerraConfig,
  at: number,
  winner?: string,
): TerraClose {
  if (s.closed) return s.closed;
  const ranked = Object.entries(s.players)
    .filter(([id]) => id !== MILAN)
    .map(([id, p]) => ({ id, glory: p.glory, cells: cellsOf(s, id).length }))
    .sort(
      (a, b) =>
        (winner ? (a.id === winner ? -1 : b.id === winner ? 1 : 0) : 0) ||
        b.glory - a.glory ||
        (a.id < b.id ? -1 : 1),
    );
  const n = ranked.length;
  const t = cfg.close.influence;
  const ranking = ranked.map((r, k) => {
    const rank = k + 1;
    const tier =
      rank === 1 && r.glory > 0
        ? "signore"
        : rank <= 3
          ? "podium"
          : rank <= 10
            ? "top10"
            : rank <= Math.ceil(n / 4)
              ? "quarter"
              : r.glory > 0
                ? "participant"
                : "none";
    const influence = tier === "none" ? 0 : t[tier as keyof typeof t];
    return { ...r, tier, influence };
  });
  const signore = ranking[0]?.tier === "signore" ? (ranking[0]?.id ?? null) : null;
  s.closed = {
    at,
    signore,
    conquest: winner !== undefined,
    ranking,
    decree: signore ? (s.programme?.[signore] ?? null) : null,
  };
  return s.closed;
}

// ——— Time ———

/** Resolves every whole step up to `until`; closed steps (the night) change nothing. */
export function advanceTerra(s: TerraState, cfg: TerraConfig, until: number): void {
  while (!s.closed) {
    const minutes = stepMinutesAt(cfg, s.clock);
    if (s.clock + minutes * MINUTE_MS > until) break;
    const from = s.clock;
    s.clock += minutes * MINUTE_MS;
    if (!hourWithin(hourIn(from), cfg.openHours)) continue;
    if (minutes >= cfg.stepMinutes) {
      step(s, cfg, from);
      continue;
    }
    // The battle hour: the fronts march at each short step, the rest at the usual pace.
    for (const front of [...s.fronts]) advanceFront(s, cfg, front, from, minutes);
    eliminate(s, from);
    s.battleMinutes = (s.battleMinutes ?? 0) + minutes;
    if (s.battleMinutes >= cfg.stepMinutes) {
      s.battleMinutes -= cfg.stepMinutes;
      step(s, cfg, from, false);
    }
  }
}

/** Whether the battle hour is on at `at`. */
export function inBattle(cfg: TerraConfig, at: number): boolean {
  const b = cfg.battle;
  return !!b && b.stepMinutes < cfg.stepMinutes && hourWithin(hourIn(at), b);
}

/** Minutes of the step starting at `at`: short in the battle hour. */
function stepMinutesAt(cfg: TerraConfig, at: number): number {
  return inBattle(cfg, at) ? (cfg.battle?.stepMinutes ?? cfg.stepMinutes) : cfg.stepMinutes;
}

function step(s: TerraState, cfg: TerraConfig, at: number, fronts = true): void {
  // Alliances whose break has come.
  if (s.alliances?.some((a) => a.endsAt !== undefined && a.endsAt <= at))
    s.alliances = s.alliances.filter((a) => a.endsAt === undefined || a.endsAt > at);
  // Troops come back toward the cap: recruited by the hour, or a share of the gap (the borgos
  // bring them back faster).
  for (const [id, p] of Object.entries(s.players)) {
    if (p.eliminatedAt !== undefined) continue;
    const cap = capOf(s, cfg, id);
    if (p.troops >= cap) continue;
    if (cfg.troops.recruit && id !== MILAN) {
      const back = Math.floor((recruitPerHour(s, cfg, id) * cfg.stepMinutes) / 60);
      p.troops = Math.min(cap, p.troops + back);
      continue;
    }
    const borgos = terraBuildingsOf(s, id, "borgo").length;
    const rate =
      id === MILAN
        ? cfg.milan.regenBps
        : Math.floor(
            (cfg.troops.regenBps * (10_000 + borgos * (cfg.buildings.borgo?.regenBonusBps ?? 0))) /
              10_000,
          );
    const back = Math.max(cfg.troops.regenMin, Math.floor(((cap - p.troops) * rate) / 10_000));
    p.troops = Math.min(cap, p.troops + back);
  }
  // Fronts, in the order they were launched (in the battle hour, they march on their own pace).
  if (fronts) for (const front of [...s.fronts]) advanceFront(s, cfg, front, at, cfg.stepMinutes);
  eliminate(s, at);
  // Every open hour, the pockets cut off from their capital fall a little.
  s.hourSteps = (s.hourSteps ?? 0) + 1;
  if (s.hourSteps * cfg.stepMinutes >= 60) {
    s.hourSteps = 0;
    fallPockets(s, cfg, at);
  }
  // The land's yield and the city routes.
  harvestStep(s, cfg, cfg.stepMinutes);
  // Glory for the land held.
  for (const [id, p] of Object.entries(s.players)) {
    if (id === MILAN) continue;
    const cells = cellsOf(s, id);
    p.glory +=
      cfg.glory.perCell * cells.length +
      cfg.glory.perCity * cells.filter((i) => s.map.city[i]).length;
  }
  // The land taken: the week is won at once.
  const land = s.map.land.filter(Boolean).length;
  for (const id of Object.keys(s.players)) {
    if (id === MILAN) continue;
    if (cellsOf(s, id).length * 10_000 >= cfg.close.winBps * land) {
      closeTerra(s, cfg, at + cfg.stepMinutes * MINUTE_MS, id);
      return;
    }
  }
  // Milan rides out.
  s.milanSteps++;
  if (s.milanSteps * cfg.stepMinutes >= cfg.milan.everyHours * 60) {
    s.milanSteps = 0;
    milanRides(s, cfg, at);
  }
}

export interface FrontForecast {
  /** The cells the front will take, in order, and when each will be its owner's. */
  takes: { cell: number; at: number }[];
  /** When it will stop and come home (null: still marching at the horizon). */
  endsAt: number | null;
}

/**
 * Where some fronts will go and when, if nobody acts: the map played on a copy, step by step,
 * up to `horizon` or until they have all stopped. The map itself is not touched.
 */
export function forecastFronts(
  s: TerraState,
  cfg: TerraConfig,
  ids: string[],
  horizon: number,
): Record<string, FrontForecast> {
  const out: Record<string, FrontForecast> = {};
  for (const id of ids)
    if (s.fronts.some((f) => f.id === id)) out[id] = { takes: [], endsAt: null };
  const copy: TerraState = structuredClone(s);
  copy.trace = [];
  const stepMs = cfg.stepMinutes * MINUTE_MS;
  const marching = new Set(Object.keys(out));
  while (marching.size > 0 && !copy.closed && copy.clock + stepMs <= horizon) {
    advanceTerra(copy, cfg, copy.clock + stepMs);
    for (const t of copy.trace) out[t.front]?.takes.push({ cell: t.cell, at: t.at });
    copy.trace = [];
    for (const id of [...marching]) {
      if (copy.fronts.some((f) => f.id === id)) continue;
      marching.delete(id);
      (out[id] as FrontForecast).endsAt = copy.clock;
    }
  }
  return out;
}

/** The next cell a front takes: its target's cell along the border nearest its aim (-1: none). */
function nextCell(s: TerraState, cfg: TerraConfig, front: TerraFront): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const capitals = new Set(
    Object.values(s.players)
      .filter((p) => cfg.fronts.capitalSafe || (cfg.fronts.peacefulSafe && !p.aggressor))
      .map((p) => p.capital),
  );
  for (let i = 0; i < s.owner.length; i++) {
    if (!s.map.land[i] || s.owner[i] !== front.against || !borders(s, front.owner, i)) continue;
    if (capitals.has(i)) continue;
    const d = hexDistance(s.map, i, front.aim);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

/** Whether a front can still pay its next cell. */
function canGoOn(s: TerraState, cfg: TerraConfig, front: TerraFront): boolean {
  const next = nextCell(s, cfg, front);
  return next >= 0 && front.troops >= cellCost(s, cfg, next);
}

function advanceFront(
  s: TerraState,
  cfg: TerraConfig,
  front: TerraFront,
  at: number,
  minutes: number,
): void {
  front.steps = (front.steps ?? 0) + 1;
  if (cfg.fronts.maxHours > 0 && front.steps * cfg.stepMinutes > cfg.fronts.maxHours * 60) {
    endFront(s, front);
    return;
  }
  // Free land is taken slowly: the race for it lasts.
  const waits = front.against === null && front.steps % cfg.fronts.neutralEverySteps !== 0;
  for (let k = 0; !waits && k < cfg.fronts.cellsPerStep; k++) {
    const best = nextCell(s, cfg, front);
    const cost = best < 0 ? 0 : cellCost(s, cfg, best);
    if (best < 0 || front.troops < cost) break;
    front.troops -= cost;
    if (front.against !== null) {
      const defender = s.players[front.against];
      if (defender) defender.troops = Math.max(0, defender.troops - densityOf(s, front.against));
    }
    seize(s, best, front.owner, at);
    razeAt(s, best);
    front.taken = (front.taken ?? 0) + 1;
    s.trace?.push({ front: front.id, cell: best, at: at + minutes * MINUTE_MS });
  }
  // A front that can no longer pay its next cell comes home at once, what is left of it.
  if (!canGoOn(s, cfg, front)) endFront(s, front);
}

/** Merchants left without a cell are out of the week: no troops, no fronts. */
function eliminate(s: TerraState, at: number): void {
  for (const [id, p] of Object.entries(s.players)) {
    if (id === MILAN || p.eliminatedAt !== undefined || s.owner.includes(id)) continue;
    p.eliminatedAt = at;
    p.troops = 0;
    s.fronts = s.fronts.filter((f) => f.owner !== id);
  }
}

function razeAt(s: TerraState, cell: number): void {
  if (s.buildings?.[cell]) {
    const { [cell]: _gone, ...rest } = s.buildings;
    s.buildings = rest;
  }
}

/** Cells of `id` connected to `from` through its own land. */
function component(s: TerraState, id: string, from: number): Set<number> {
  const seen = new Set<number>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const c = queue.pop() as number;
    for (const n of hexNeighbors(s.map, c)) {
      if (!seen.has(n) && s.owner[n] === id) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

/**
 * A pocket of a merchant's land, cut off from its capital and ringed by a single rival (not
 * neutral land, not an ally), loses a share of its cells to that rival.
 */
function fallPockets(s: TerraState, cfg: TerraConfig, at: number): void {
  for (const [id, p] of Object.entries(s.players)) {
    if (id === MILAN || p.capital === undefined) continue;
    // The main land: around the capital, or, once it is taken, the largest piece left.
    let main = s.owner[p.capital] === id ? component(s, id, p.capital) : new Set<number>();
    if (main.size === 0) {
      const seen = new Set<number>();
      for (const c of cellsOf(s, id)) {
        if (seen.has(c)) continue;
        const piece = component(s, id, c);
        for (const x of piece) seen.add(x);
        if (piece.size > main.size) main = piece;
      }
    }
    const done = new Set(main);
    for (const start of cellsOf(s, id)) {
      if (done.has(start)) continue;
      const pocket = component(s, id, start);
      for (const c of pocket) done.add(c);
      const ring = new Set<string | null>();
      for (const c of pocket) {
        for (const n of hexNeighbors(s.map, c)) {
          if (s.map.land[n] && s.owner[n] !== id) ring.add(s.owner[n] ?? null);
        }
      }
      if (ring.size !== 1) continue;
      const [rival] = [...ring];
      if (rival === null || rival === undefined || allied(s, id, rival)) continue;
      const lost = Math.max(1, Math.ceil((pocket.size * cfg.encircle.lossBps) / 10_000));
      for (const c of [...pocket].sort((a, b) => a - b).slice(0, lost)) {
        seize(s, c, rival, at);
        razeAt(s, c);
      }
    }
  }
}

/**
 * Milan's ride: at a merchant it borders (not protected), the leader in glory or the weakest
 * (fewest troops a cell), as the settings say; else into neutral land.
 */
function milanRides(s: TerraState, cfg: TerraConfig, at: number): void {
  if (s.fronts.some((f) => f.owner === MILAN)) return;
  const milan = cellsOf(s, MILAN);
  if (milan.length === 0) return;
  const weakest = cfg.milan.target === "weakest";
  const leaders = Object.entries(s.players)
    .filter(([id, p]) => id !== MILAN && p.protectedUntil <= at && p.eliminatedAt === undefined)
    .sort(
      (a, b) =>
        (weakest ? densityOf(s, a[0]) - densityOf(s, b[0]) : b[1].glory - a[1].glory) ||
        (a[0] < b[0] ? -1 : 1),
    );
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
    if (!s.map.land[i] || s.owner[i] !== null || !borders(s, MILAN, i)) continue;
    if (best < 0 || hexDistance(s.map, i, centre) < hexDistance(s.map, best, centre)) best = i;
  }
  if (best >= 0) launchFront(s, cfg, MILAN, best, cfg.milan.shareBps, at);
}
