/**
 * A lagoon's map (docs/plan-lagunes.md G1): its sestieri side by side, the mainland to the north,
 * the open sea to the south. Each sestiere is a column of the same shape, so that all stand as far
 * from the land, from their mouth and from their towns: its houses in the water, two towns of its
 * own on the land, its mouth on the way to the open sea. Between two sestieri, a town of the
 * lagoon, every other one behind a canal; beyond each mouth, a strait and a town of the open sea.
 * Every town behind a passage can be reached the long way round, without a duel.
 *
 * Pure and deterministic: the same parameters draw the same map, for every lagoon.
 */

import type { IleTerrain } from "../ile/ile.js";
import type {
  PlancheCity,
  PlancheHouseSetup,
  PlanchePassage,
  PlancheSetup,
  PlancheWant,
} from "./planche.js";

export interface LagoonTown {
  name: string;
  wants: Record<string, PlancheWant>;
}

/** What a lagoon is drawn from: as `worlds.settings` would hold it. */
export interface LagoonParams {
  sestieri: { id: string; name: string }[];
  housesPerSestiere: number;
  /** The width of a sestiere's column, in tiles. */
  column: number;
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
  };
  /** What a thread carries by the detour, in points of base of what it would by the passages. */
  detourBps: number;
  /** Everything else of the board: its goods, its time, its rules, its islands, its rank. */
  base: Omit<PlancheSetup, "width" | "height" | "houses" | "cities" | "passages">;
}

/** Rows of the map: the land, the houses, the mouths, the straits, the open sea's towns. */
const LAND = 1;
const HOUSES = 6;
const MOUTH = 17;
const STRAIT = 21;
const FAR = 24;
const HEIGHT = 26;
const MID = 12;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function plancheLagoon(P: LagoonParams): PlancheSetup {
  const C = P.column;
  const n = P.sestieri.length;
  const houses: PlancheHouseSetup[] = [];
  const cities: PlancheCity[] = [];
  const passages: PlanchePassage[] = [];
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
  const tower = (id: string, name: string, x: number, y: number, board: string, k: number) =>
    passages.push({
      id,
      name,
      x,
      y,
      holder: corsair(k),
      tollBps: P.passages.tollBps,
      board,
      seals: P.passages.seals,
    });

  P.sestieri.forEach((sest, si) => {
    const x0 = si * C;
    // The houses: a grid in the water, every other one a row lower, the same in each column.
    const cols = Math.min(4, P.housesPerSestiere);
    for (let k = 0; k < P.housesPerSestiere; k++) {
      const col = k % cols;
      const row = Math.floor(k / cols);
      const i = si * P.housesPerSestiere + k;
      houses.push({
        id: `${sest.id}-${k + 1}`,
        name: P.houseNames[i] ?? `Maison ${i + 1}`,
        robot: true,
        x: x0 + 1 + Math.floor(((col + 0.5) * (C - 2)) / cols),
        y: HOUSES + row * 3 + (col % 2),
        makes: { ...P.makes },
        // A plan and its soil come from the same model house: the glass where the sand is.
        soil: { ...(P.soils[(k + si) % P.soils.length] ?? { pre: 1 }) },
        plan: [...(P.plans[(k + si) % P.plans.length] ?? [])],
        sestiere: sest.id,
      });
    }
    // Its own towns, on the land above it: near, small, free.
    const K = P.sestiereTowns;
    for (let k = 0; k < K; k++) {
      const t = P.towns.sestiere[(si * K + k) % P.towns.sestiere.length];
      if (!t) continue;
      cities.push({
        id: cityId(t.name),
        name: t.name,
        x: x0 + Math.floor(((k + 1) * C) / (K + 1)),
        y: LAND,
        via: [],
        wants: structuredClone(t.wants),
        ring: "sestiere",
        sestiere: sest.id,
      });
    }
    // Its mouth to the open sea, a strait beyond, and the open sea's town behind both.
    const mid = x0 + Math.floor(C / 2);
    tower(`bouche-${sest.id}`, `Bouche de ${sest.name}`, mid, MOUTH, P.passages.bouche, si);
    tower(`detroit-${sest.id}`, `Détroit de ${sest.name}`, mid, STRAIT, P.passages.strait, si + n);
    const far = P.towns.large[si % P.towns.large.length];
    if (far)
      cities.push({
        id: cityId(far.name),
        name: far.name,
        x: mid,
        y: FAR,
        via: [`bouche-${sest.id}`, `detroit-${sest.id}`],
        wants: structuredClone(far.wants),
        ring: "large",
        detourBps: P.detourBps,
      });
  });
  // Between two sestieri, a town of the lagoon; every other one behind a canal.
  for (let b = 1; b < n; b++) {
    const t = P.towns.lagoon[(b - 1) % P.towns.lagoon.length];
    if (!t) continue;
    const x = b * C;
    const canal = b % 2 === 1;
    if (canal) tower(`canal-${b}`, `Canal ${b}`, x, MID + 2, P.passages.canal, 2 * n + b);
    cities.push({
      id: cityId(t.name),
      name: t.name,
      x,
      y: MID,
      via: canal ? [`canal-${b}`] : [],
      wants: structuredClone(t.wants),
      ring: "lagoon",
      ...(canal ? { detourBps: P.detourBps } : {}),
    });
  }
  return {
    ...structuredClone(P.base),
    width: n * C,
    height: HEIGHT,
    houses,
    cities,
    passages,
  };
}
