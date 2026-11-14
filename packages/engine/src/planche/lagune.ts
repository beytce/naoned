/**
 * A lagoon's map (docs/plan-lagune-ronde.md L1): a square round its middle. One quarter is given,
 * in whole tiles from the middle (x to the east, y to the south): the houses of a sestiere, its
 * towns on their shore, its mouth, its strait, its town of the open sea in the corner. Each
 * sestiere is that quarter turned a quarter turn further, so that all stand exactly as far from the
 * middle, from their towns and from their passages. On the axes, what is everyone's: the towns of
 * the lagoon, some behind a canal. Every town behind a passage can be reached the long way round,
 * without a duel.
 *
 * Pure and deterministic, in whole numbers: the same parameters draw the same map, for every lagoon.
 */

import type { IleTerrain } from "../ile/ile.js";
import type {
  PlancheCity,
  PlancheHouseSetup,
  PlanchePassage,
  PlancheSetup,
  PlancheWant,
} from "./planche.js";

/** A tile from the board's middle: x to the east, y to the south. */
export type LagoonTile = [number, number];

/** A sestiere's quarter: its houses' islands, its own towns, its way out to the open sea. */
export interface LagoonQuarter {
  houses: LagoonTile[];
  towns: LagoonTile[];
  mouth: LagoonTile;
  strait: LagoonTile;
  far: LagoonTile;
}

export interface LagoonTown {
  name: string;
  wants: Record<string, PlancheWant>;
}

/** What a lagoon is drawn from: as `worlds.settings` would hold it. */
export interface LagoonParams {
  sestieri: { id: string; name: string }[];
  housesPerSestiere: number;
  /** Tiles from the middle to an edge: the board is `2 × half + 1` tiles wide and high. */
  half: number;
  /** The first sestiere's quarter; the next ones are it turned a quarter turn each (four at most). */
  quarter: LagoonQuarter;
  /** Where the lagoon's towns stand, in turn, and the canal one stands behind (none: free). */
  axes: { at: LagoonTile; canal?: LagoonTile }[];
  /** The houses' names, in order; the computer holds them until a player takes one. */
  houseNames: string[];
  /** What the computer's houses build, and their islands' soils, given in turn. */
  plans: string[][];
  soils: Partial<Record<IleTerrain, number>>[];
  /** What a house makes when the board has no islands. */
  makes: Record<string, number>;
  /** How many towns of its own each sestiere has, on the land above it. */
  sestiereTowns: number;
  /** The towns of each ring, given in turn: the sestieri's own, the lagoon's, the open sea's. */
  towns: { sestiere: LagoonTown[]; lagoon: LagoonTown[]; large: LagoonTown[] };
  passages: {
    tollBps: number;
    seals: number;
    /** The boards of the Passe of each kind of passage. */
    bouche: string;
    canal: string;
    strait: string;
    /** The corsairs who hold them at first, given in turn. */
    corsairs?: string[];
    /** The links a holder lays in advance (docs/plan-hex-commerce.md H4): on a tower, on a strait. */
    guard?: { links: number; strait: number };
  };
  /** What a thread carries by the detour, in points of base of what it would by the passages. */
  detourBps: number;
  /** Everything else of the board: its goods, its time, its rules, its islands, its rank. */
  base: Omit<PlancheSetup, "width" | "height" | "houses" | "cities" | "passages">;
}

/** A tile turned `k` quarter turns round the middle (clockwise on the board: north to east). */
const turn = ([x, y]: LagoonTile, k: number): LagoonTile => {
  let t: LagoonTile = [x, y];
  for (let n = 0; n < k; n++) t = [-t[1] || 0, t[0]];
  return t;
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function plancheLagoon(P: LagoonParams): PlancheSetup {
  const n = P.sestieri.length;
  const Q = P.quarter;
  if (n > 4) throw new Error("lagoon_sestieri");
  if (Q.houses.length < P.housesPerSestiere || Q.towns.length < P.sestiereTowns)
    throw new Error("lagoon_quarter");
  const houses: PlancheHouseSetup[] = [];
  const cities: PlancheCity[] = [];
  const passages: PlanchePassage[] = [];
  /** A tile of the middle's on the board. */
  const at = ([x, y]: LagoonTile) => {
    if (Math.abs(x) > P.half || Math.abs(y) > P.half) throw new Error("lagoon_off_board");
    return { x: P.half + x, y: P.half + y };
  };
  const corsair = (k: number) => {
    const names = P.passages.corsairs?.length ? P.passages.corsairs : ["Le Borgne"];
    return `corsair:${names[k % names.length]}`;
  };
  const taken = new Set<string>();
  const cityId = (name: string) => {
    let id = slug(name) || "ville";
    for (let k = 2; taken.has(id); k++) id = `${slug(name)}-${k}`;
    taken.add(id);
    return id;
  };
  const tower = (id: string, name: string, tile: LagoonTile, board: string, k: number) =>
    passages.push({
      id,
      name,
      ...at(tile),
      holder: corsair(k),
      tollBps: P.passages.tollBps,
      board,
      seals: P.passages.seals,
      ...(P.passages.guard
        ? { guard: id.startsWith("detroit-") ? P.passages.guard.strait : P.passages.guard.links }
        : {}),
    });

  P.sestieri.forEach((sest, si) => {
    // The houses: the quarter's islands, in the order given, the same in each sestiere.
    for (let k = 0; k < P.housesPerSestiere; k++) {
      const i = si * P.housesPerSestiere + k;
      houses.push({
        id: `${sest.id}-${k + 1}`,
        name: P.houseNames[i] ?? `Maison ${i + 1}`,
        robot: true,
        ...at(turn(Q.houses[k] as LagoonTile, si)),
        makes: { ...P.makes },
        // A plan and its soil come from the same model house: the glass where the sand is.
        soil: { ...(P.soils[(k + si) % P.soils.length] ?? { pre: 1 }) },
        plan: [...(P.plans[(k + si) % P.plans.length] ?? [])],
        sestiere: sest.id,
      });
    }
    // Its own towns, on its shore: near, small, free.
    const K = P.sestiereTowns;
    for (let k = 0; k < K; k++) {
      const t = P.towns.sestiere[(si * K + k) % P.towns.sestiere.length];
      if (!t) continue;
      cities.push({
        id: cityId(t.name),
        name: t.name,
        ...at(turn(Q.towns[k] as LagoonTile, si)),
        via: [],
        wants: structuredClone(t.wants),
        ring: "sestiere",
        sestiere: sest.id,
      });
    }
    // Its mouth to the open sea, a strait beyond, and the open sea's town behind both.
    tower(`bouche-${sest.id}`, `Bouche de ${sest.name}`, turn(Q.mouth, si), P.passages.bouche, si);
    tower(
      `detroit-${sest.id}`,
      `Détroit de ${sest.name}`,
      turn(Q.strait, si),
      P.passages.strait,
      si + n,
    );
    const far = P.towns.large[si % P.towns.large.length];
    if (far)
      cities.push({
        id: cityId(far.name),
        name: far.name,
        ...at(turn(Q.far, si)),
        via: [`bouche-${sest.id}`, `detroit-${sest.id}`],
        wants: structuredClone(far.wants),
        ring: "large",
        detourBps: P.detourBps,
      });
  });
  // On the axes, the towns of the lagoon, in turn; those with a canal behind it.
  P.axes.forEach((axis, k) => {
    const t = P.towns.lagoon[k % P.towns.lagoon.length];
    if (!t) return;
    const b = k + 1;
    if (axis.canal) tower(`canal-${b}`, `Canal ${b}`, axis.canal, P.passages.canal, 2 * n + b);
    cities.push({
      id: cityId(t.name),
      name: t.name,
      ...at(axis.at),
      via: axis.canal ? [`canal-${b}`] : [],
      wants: structuredClone(t.wants),
      ring: "lagoon",
      ...(axis.canal ? { detourBps: P.detourBps } : {}),
    });
  });
  const side = 2 * P.half + 1;
  return { ...structuredClone(P.base), width: side, height: side, houses, cities, passages };
}

/**
 * How far a tile is from the board's middle, in hundredths of a tile: a whole number, the same on
 * every machine (the square root of a whole number, floored).
 */
export function plancheDepth(S: Pick<PlancheSetup, "width" | "height">, x: number, y: number) {
  const dx = 2 * x - (S.width - 1);
  const dy = 2 * y - (S.height - 1);
  return Math.floor(Math.sqrt((dx * dx + dy * dy) * 2_500));
}

/**
 * The lagoon's land and its ink, for the board's drawing (docs/plan-lagune-ronde.md L1): a shore
 * under each sestiere's towns, cut by the channel to its mouth; an islet under each town of the
 * lagoon and of the open sea; the water white in the lagoon, darkening past the mouths toward the
 * board's corners. For the drawing alone: no rule reads it.
 */
export function plancheLagoonLand(S: PlancheSetup): {
  land: (x: number, y: number) => boolean;
  peril: (x: number, y: number) => number;
} {
  const cx = (S.width - 1) / 2;
  const cy = (S.height - 1) / 2;
  const r = (p: { x: number; y: number }) => Math.hypot(p.x - cx, p.y - cy);
  const key = (x: number, y: number) => `${x},${y}`;
  const kept = new Set([...S.houses, ...S.passages].map((p) => key(p.x, p.y)));
  const towns = new Set(S.cities.map((c) => key(c.x, c.y)));
  const islets = S.cities.filter((c) => c.ring === "lagoon" || c.ring === "large");
  // Each sestiere's shore: the ring its towns stand on, as wide as they spread, less its channel.
  const shores = [...new Set(S.cities.map((c) => c.sestiere ?? ""))].filter(Boolean).map((id) => {
    const own = S.cities.filter((c) => c.sestiere === id);
    const radius = own.reduce((n, c) => n + r(c), 0) / own.length;
    const mouth = S.passages.find((p) => p.id === `bouche-${id}`);
    // Its middle: the way to its mouth; without one, the middle of its towns.
    const mid = mouth
      ? Math.atan2(mouth.y - cy, mouth.x - cx)
      : Math.atan2(
          own.reduce((n, c) => n + (c.y - cy) / r(c), 0),
          own.reduce((n, c) => n + (c.x - cx) / r(c), 0),
        );
    const off = (x: number, y: number) => {
      const a = Math.atan2(y - cy, x - cx) - mid;
      return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    };
    return { radius, off, spread: Math.max(...own.map((c) => off(c.x, c.y))), mouth };
  });
  const mouths = S.passages.filter((p) => p.id.startsWith("bouche-")).map(r);
  const from = (mouths.length ? Math.min(...mouths) : Math.hypot(cx, cy) / 2) - 3;
  const to = Math.max(from + 1, ...S.cities.filter((c) => c.ring === "large").map(r));
  return {
    land: (x, y) => {
      if (kept.has(key(x, y))) return false;
      if (towns.has(key(x, y))) return true;
      if (islets.some((c) => Math.abs(x - c.x) <= 1 && Math.abs(y - c.y) <= 1)) return true;
      const d = Math.hypot(x - cx, y - cy);
      return shores.some((s) => {
        if (Math.abs(d - s.radius) > 1.25 || s.off(x, y) > s.spread + 1.6 / s.radius) return false;
        if (!s.mouth) return true;
        // The channel: the straight water from the middle to the mouth.
        const mx = s.mouth.x - cx;
        const my = s.mouth.y - cy;
        return Math.abs((x - cx) * my - (y - cy) * mx) / Math.hypot(mx, my) > 1.2;
      });
    },
    peril: (x, y) => {
      const t = Math.min(1, Math.max(0, (Math.hypot(x - cx, y - cy) - from) / (to - from)));
      return t * t * (3 - 2 * t);
    },
  };
}
