/**
 * The island of a house (docs/plan-ile.md I1, CADRAGE-v4 § 4): square tiles bought one by one,
 * each with its terrain; workshops laid on them, raised up to three levels; three neighbourhood
 * rules, all told before a workshop is laid; goods made along the chain, a whole lot at a time,
 * into a store with a cap. Pure and deterministic; amounts in deniers (bigint).
 */

const HOUR = 3_600_000;
const BPS = 10_000;

export type IleTerrain = "rive" | "argile" | "foret" | "pre" | "sable";
export const ILE_TERRAINS: readonly IleTerrain[] = ["rive", "argile", "foret", "pre", "sable"];
/** The Fondaco, on the island's first tile: it makes nothing, never moves. */
export const ILE_FONDACO = "fondaco";

export interface IleWorkshop {
  name: string;
  /** 1 the raw, 2 the worked, 3 the fine: the order in which a slice of time runs them. */
  tier: number;
  /** The terrain it likes: +`terrainBps` there. */
  terrain: IleTerrain;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  /** Lots an hour at level 1, before its bonus. */
  lotsPerHour: number;
  /** Deniers to build it (level 1) and to raise it to each level after. */
  cost: number[];
  /** How long each level takes to build. */
  buildMs: number[];
  /** The workshops it is a nuisance to, or that are a nuisance to it. */
  nuisance?: string[];
  /** The house's level it opens at, besides its tier (docs/plan-economie.md C3). */
  level?: number;
  /**
   * A work of prestige (docs/plan-economie.md C3): it makes nothing and is not raised; each one
   * already on the island makes the next cost this much more (points of base).
   */
  ouvrage?: { growthBps: number };
}

/** An island's rules, as `worlds.settings` would give them. */
export interface IleRules {
  maxTiles: number;
  startTiles: string[];
  tileCost: { base: number; growthBps: number };
  /** What a lot is worth at each level, against level 1. */
  levelYieldBps: number[];
  bonus: { terrainBps: number; supplierBps: number; nuisanceBps: number };
  workshops: Record<string, IleWorkshop>;
}

export interface IleBuilding {
  type: string;
  level: number;
  /** Until then it is being built (or raised, or moved), and makes nothing. */
  readyAt: number;
  /** What it has done toward its next lot: lots × ms × bps², exact. */
  carry: number;
}

export interface IleTile {
  terrain: IleTerrain;
  building?: IleBuilding;
}

/** An island: plain data, so that a board can copy it and the server send it. */
export interface IleState {
  tiles: Record<string, IleTile>;
}

/** The terrain of any tile of a house's island: drawn from the house, never stored. */
export type IleGround = (x: number, y: number) => IleTerrain;

const fail = (code: string): never => {
  throw new Error(code);
};
const key = (x: number, y: number) => `${x},${y}`;
const parse = (k: string): [number, number] => {
  const [x = "0", y = "0"] = k.split(",");
  return [Number(x), Number(y)];
};
const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const near = (k: string) => {
  const [x, y] = parse(k);
  return STEPS.map(([dx, dy]) => key(x + dx, y + dy));
};
const workshopOf = (R: IleRules, type: string) =>
  Object.hasOwn(R.workshops, type) ? R.workshops[type] : undefined;
const cloneTiles = (t: Record<string, IleTile>) => {
  const out: Record<string, IleTile> = {};
  for (const [k, v] of Object.entries(t))
    out[k] = v.building
      ? { terrain: v.terrain, building: { ...v.building } }
      : { terrain: v.terrain };
  return out;
};

/** A house's island at its start: its first tiles, the Fondaco on the first. */
export function ileInit(R: IleRules, ground: IleGround): IleState {
  const tiles: Record<string, IleTile> = {};
  R.startTiles.forEach((k, n) => {
    const [x, y] = parse(k);
    tiles[k] = { terrain: ground(x, y) };
    if (n === 0)
      (tiles[k] as IleTile).building = { type: ILE_FONDACO, level: 1, readyAt: 0, carry: 0 };
  });
  return { tiles };
}

/** The tiles that touch the island and may be bought, none once it is full. */
export function ileBuyable(R: IleRules, s: IleState): string[] {
  if (Object.keys(s.tiles).length >= R.maxTiles) return [];
  const out = new Set<string>();
  for (const k of Object.keys(s.tiles)) for (const n of near(k)) if (!s.tiles[n]) out.add(n);
  return [...out].sort();
}

/** What the next tile costs: dearer by `growthBps` for each one bought. */
export function ileTileCost(R: IleRules, s: IleState): bigint {
  const bought = Object.keys(s.tiles).length - R.startTiles.length;
  let c = BigInt(R.tileCost.base);
  for (let n = 0; n < bought; n++) c = (c * BigInt(BPS + R.tileCost.growthBps)) / BigInt(BPS);
  return c;
}

export function ileBuyTile(
  R: IleRules,
  s: IleState,
  at: string,
  ground: IleGround,
): { ile: IleState; cost: bigint } {
  if (Object.keys(s.tiles).length >= R.maxTiles) return fail("ile_full");
  if (!ileBuyable(R, s).includes(at)) return fail("ile_not_buyable");
  const cost = ileTileCost(R, s);
  const tiles = cloneTiles(s.tiles);
  const [x, y] = parse(at);
  tiles[at] = { terrain: ground(x, y) };
  return { ile: { tiles }, cost };
}

/**
 * The pairs of neighbours where one feeds the other, with the good that passes: what the
 * supplier's bonus rests on, for a board to show it. In the order of the tiles' keys.
 */
export function ileSupplies(
  R: IleRules,
  s: IleState,
): { from: string; to: string; good: string }[] {
  const out: { from: string; to: string; good: string }[] = [];
  for (const at of Object.keys(s.tiles).sort()) {
    const b = s.tiles[at]?.building;
    const w = b && b.type !== ILE_FONDACO ? workshopOf(R, b.type) : undefined;
    if (!w) continue;
    for (const n of near(at)) {
      const other = s.tiles[n]?.building;
      if (!other || other.type === ILE_FONDACO) continue;
      const o = workshopOf(R, other.type);
      const good = o ? Object.keys(w.inputs).find((g) => Object.hasOwn(o.outputs, g)) : undefined;
      if (good) out.push({ from: n, to: at, good });
    }
  }
  return out;
}

/** What a workshop would gain on a tile: its terrain, its supplier beside it, a nuisance beside it. */
export function ileBonusBps(R: IleRules, s: IleState, type: string, at: string): number {
  const w = workshopOf(R, type);
  const tile = s.tiles[at];
  if (!w || !tile) return 0;
  let bonus = tile.terrain === w.terrain ? R.bonus.terrainBps : 0;
  let supplier = false;
  let nuisance = false;
  for (const n of near(at)) {
    const other = s.tiles[n]?.building;
    if (!other || other.type === ILE_FONDACO) continue;
    const o = workshopOf(R, other.type);
    if (!o) continue;
    if (Object.keys(w.inputs).some((g) => g in o.outputs)) supplier = true;
    if (w.nuisance?.includes(other.type) || o.nuisance?.includes(type)) nuisance = true;
  }
  if (supplier) bonus += R.bonus.supplierBps;
  if (nuisance) bonus += R.bonus.nuisanceBps;
  return bonus;
}

export function ileBuild(
  R: IleRules,
  s: IleState,
  type: string,
  at: string,
  now: number,
): { ile: IleState; cost: bigint } {
  const w = workshopOf(R, type);
  if (!w) return fail("ile_unknown");
  const tile = s.tiles[at];
  if (!tile) return fail("ile_not_owned");
  if (tile.building) return fail("ile_taken");
  const tiles = cloneTiles(s.tiles);
  (tiles[at] as IleTile).building = {
    type,
    level: 1,
    readyAt: now + (w.buildMs[0] ?? 0),
    carry: 0,
  };
  let cost = BigInt(w.cost[0] ?? 0);
  // A work costs more with each one the island already has.
  if (w.ouvrage)
    for (let n = ileOuvrages(R, s).length; n > 0; n--)
      cost = (cost * BigInt(BPS + w.ouvrage.growthBps)) / BigInt(BPS);
  return { ile: { tiles }, cost };
}

/** The works of prestige an island has (docs/plan-economie.md C3), by tile. */
export function ileOuvrages(R: IleRules, s: IleState): { at: string; type: string }[] {
  return Object.entries(s.tiles).flatMap(([at, t]) =>
    t.building && workshopOf(R, t.building.type)?.ouvrage ? [{ at, type: t.building.type }] : [],
  );
}

export function ileUpgrade(
  R: IleRules,
  s: IleState,
  at: string,
  now: number,
): { ile: IleState; cost: bigint } {
  const b = s.tiles[at]?.building;
  if (!b) return fail("ile_empty");
  const w = workshopOf(R, b.type);
  if (!w) return fail("ile_fixed");
  if (b.readyAt > now) return fail("ile_building");
  if (b.level >= Math.min(w.cost.length, R.levelYieldBps.length)) return fail("ile_top");
  const tiles = cloneTiles(s.tiles);
  const nb = (tiles[at] as IleTile).building as IleBuilding;
  nb.level += 1;
  nb.readyAt = now + (w.buildMs[nb.level - 1] ?? 0);
  nb.carry = 0;
  return { ile: { tiles }, cost: BigInt(w.cost[nb.level - 1] ?? 0) };
}

/** A workshop moved to a free tile of the island: it keeps its level, and builds again a while. */
export function ileMove(R: IleRules, s: IleState, from: string, to: string, now: number): IleState {
  const b = s.tiles[from]?.building;
  if (!b) return fail("ile_empty");
  const w = workshopOf(R, b.type);
  if (!w) return fail("ile_fixed");
  const dest = s.tiles[to];
  if (!dest) return fail("ile_not_owned");
  if (dest.building) return fail("ile_taken");
  const tiles = cloneTiles(s.tiles);
  tiles[from] = { terrain: (tiles[from] as IleTile).terrain };
  (tiles[to] as IleTile).building = {
    type: b.type,
    level: b.level,
    readyAt: now + (w.buildMs[b.level - 1] ?? 0),
    carry: 0,
  };
  return { tiles };
}

/** What a workshop makes an hour now, of its first good, its level and bonus counted (for display). */
export function ileRates(R: IleRules, s: IleState, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, t] of Object.entries(s.tiles)) {
    const b = t.building;
    const w = b ? workshopOf(R, b.type) : undefined;
    if (!b || !w || b.readyAt > now) continue;
    const [, perLot = 0] = Object.entries(w.outputs)[0] ?? [];
    const level = R.levelYieldBps[b.level - 1] ?? BPS;
    const v = (perLot * w.lotsPerHour * level * (BPS + ileBonusBps(R, s, b.type, k))) / (BPS * BPS);
    out[b.type] = (out[b.type] ?? 0) + v;
  }
  return out;
}

/**
 * A slice of time on the island: the raw first, then what works it; each workshop takes its inputs
 * from the store and puts its lot there. A workshop that lacks its inputs, or whose good is full,
 * waits: what it could not do is not owed later. The store is changed in place; so is the island.
 */
export function ileSlice(
  R: IleRules,
  s: IleState,
  stock: Record<string, number>,
  cap: number,
  ms: number,
  now: number,
): IleState {
  const lot = HOUR * BPS * BPS;
  const order = Object.entries(s.tiles)
    .filter(([, t]) => t.building && workshopOf(R, t.building.type))
    .sort(
      ([a, ta], [b, tb]) =>
        (workshopOf(R, ta.building?.type ?? "")?.tier ?? 0) -
          (workshopOf(R, tb.building?.type ?? "")?.tier ?? 0) || a.localeCompare(b),
    );
  for (const [k, t] of order) {
    const b = t.building as IleBuilding;
    const w = workshopOf(R, b.type) as IleWorkshop;
    if (b.readyAt > now) continue;
    const level = R.levelYieldBps[b.level - 1] ?? BPS;
    b.carry += w.lotsPerHour * level * (BPS + ileBonusBps(R, s, b.type, k)) * ms;
    while (b.carry >= lot) {
      const lacks = Object.entries(w.inputs).some(([g, n]) => (stock[g] ?? 0) < n);
      const full = Object.entries(w.outputs).some(([g, n]) => (stock[g] ?? 0) + n > cap);
      if (lacks || full) {
        b.carry = 0;
        break;
      }
      for (const [g, n] of Object.entries(w.inputs)) stock[g] = (stock[g] ?? 0) - n;
      for (const [g, n] of Object.entries(w.outputs)) stock[g] = (stock[g] ?? 0) + n;
      b.carry -= lot;
    }
  }
  return s;
}

/**
 * What the island makes and uses of each good an hour at its present rates, every workshop running
 * (for display, and for a house of the computer to weigh its threads).
 */
export function ileFlows(
  R: IleRules,
  s: IleState,
  now: number,
): { made: Record<string, number>; used: Record<string, number> } {
  const made: Record<string, number> = {};
  const used: Record<string, number> = {};
  for (const [k, t] of Object.entries(s.tiles)) {
    const b = t.building;
    const w = b ? workshopOf(R, b.type) : undefined;
    if (!b || !w || b.readyAt > now) continue;
    const level = R.levelYieldBps[b.level - 1] ?? BPS;
    const lots = (w.lotsPerHour * level * (BPS + ileBonusBps(R, s, b.type, k))) / (BPS * BPS);
    for (const [g, n] of Object.entries(w.outputs)) made[g] = (made[g] ?? 0) + n * lots;
    for (const [g, n] of Object.entries(w.inputs)) used[g] = (used[g] ?? 0) + n * lots;
  }
  return { made, used };
}

/** A tile's terrain drawn from a seed and the weights of a soil, the same at every call. */
export function ileGround(
  seed: number,
  soil: Partial<Record<IleTerrain, number>>,
): (x: number, y: number) => IleTerrain {
  const weights = ILE_TERRAINS.map((t) => [t, Math.max(0, soil[t] ?? 0)] as const).filter(
    ([, w]) => w > 0,
  );
  const total = weights.reduce((n, [, w]) => n + w, 0);
  return (x, y) => {
    if (!total) return "pre";
    let h = (seed ^ Math.imul(x + 1_000, 73_856_093) ^ Math.imul(y + 1_000, 19_349_663)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    let pick = ((h ^ (h >>> 16)) >>> 0) % total;
    for (const [t, w] of weights) {
      if (pick < w) return t;
      pick -= w;
    }
    return weights[0]?.[0] ?? "pre";
  };
}
