/**
 * Venice's lagoon of 48 houses (docs/plan-lagunes.md): four sestieri of twelve, the towns of the
 * mainland above each, Murano, the Rialto and Chioggia between them, four towns of the open sea
 * beyond the mouths. The same map for every lagoon (the owner's choice, 12 November 2026). Its
 * islands, its time, its rules and its rank are those of Venice's board; its orders of magnitude
 * are measured at the bench (docs/calibration.md, § Les lagunes).
 */
import type { LagoonParams, LagoonTown } from "../planche/lagune.js";
import { plancheLagoon } from "../planche/lagune.js";
import type { PlancheWant } from "../planche/planche.js";
import { venice1450Planche } from "./venice1450.planche.js";

/**
 * A town's demand in a lagoon of 48: half as much again as on the board of 8, so that a town grows
 * back more than one thread takes from it (12 an hour against 10): a thread held pays, chasing the
 * full gauges pays less (docs/calibration.md, § Les lagunes).
 */
const DEMAND = 1.5;
const want = (price: number, cap: number, regenPerHour: number, floorBps = 3_000): PlancheWant => ({
  price,
  floorBps,
  cap: Math.round(cap * DEMAND),
  regenPerHour: Math.round(regenPerHour * DEMAND),
});
const town = (name: string, wants: Record<string, PlancheWant>): LagoonTown => ({ name, wants });

/** Venice's families: the houses' names, Ca’ and the family. */
const FAMILIES = [
  "Bembo",
  "Zane",
  "Venier",
  "Loredan",
  "Morosini",
  "Dandolo",
  "Foscari",
  "Grimani",
  "Mocenigo",
  "Contarini",
  "Corner",
  "Pisani",
  "Gritti",
  "Tron",
  "Zorzi",
  "Barbarigo",
  "Badoer",
  "Balbi",
  "Barbaro",
  "Bragadin",
  "Cappello",
  "Dolfin",
  "Donà",
  "Emo",
  "Erizzo",
  "Falier",
  "Gradenigo",
  "Giustinian",
  "Lando",
  "Malipiero",
  "Marcello",
  "Michiel",
  "Molin",
  "Nani",
  "Orio",
  "Pesaro",
  "Priuli",
  "Querini",
  "Sagredo",
  "Soranzo",
  "Steno",
  "Tiepolo",
  "Trevisan",
  "Vendramin",
  "Zen",
  "Memmo",
  "Valier",
  "Zeno",
];

const base = venice1450Planche;

export const venice1450LaguneParams: LagoonParams = {
  sestieri: [
    { id: "cannaregio", name: "Cannaregio" },
    { id: "castello", name: "Castello" },
    { id: "dorsoduro", name: "Dorsoduro" },
    { id: "sanpolo", name: "San Polo" },
  ],
  housesPerSestiere: 12,
  column: 13,
  houseNames: FAMILIES.map((f) => `Ca’ ${f}`),
  plans: base.houses.map((h) => h.plan ?? []).filter((p) => p.length),
  soils: base.houses.map((h) => h.soil ?? { pre: 1 }),
  makes: {},
  sestiereTowns: 3,
  towns: {
    // Each sestiere's own: near, free, a little of everything worked.
    sestiere: [
      town("Padoue", {
        glass: want(1_300, 140, 9),
        rope: want(900, 120, 8),
        flour: want(500, 140, 9),
      }),
      town("Trévise", {
        bricks: want(650, 140, 9),
        planks: want(700, 140, 9),
        salt: want(500, 120, 8),
      }),
      town("Vicence", {
        glass: want(1_400, 120, 8),
        flour: want(550, 130, 8),
        rope: want(950, 120, 8),
      }),
      town("Vérone", {
        bricks: want(750, 140, 8),
        planks: want(800, 140, 8),
        glass: want(1_500, 120, 7),
      }),
      town("Bassano", {
        planks: want(720, 140, 9),
        rope: want(920, 120, 8),
        salt: want(520, 120, 8),
      }),
      town("Mestre", {
        flour: want(520, 140, 9),
        bricks: want(680, 140, 9),
        glass: want(1_350, 120, 8),
      }),
      town("Rovigo", {
        salt: want(540, 120, 8),
        flour: want(560, 130, 8),
        planks: want(760, 140, 8),
      }),
      town("Ferrare", {
        glass: want(1_450, 120, 8),
        rope: want(960, 120, 8),
        bricks: want(720, 140, 8),
      }),
      town("Mantoue", {
        salt: want(530, 120, 8),
        glass: want(1_420, 120, 8),
        rope: want(940, 120, 8),
      }),
      town("Brescia", {
        bricks: want(700, 140, 8),
        flour: want(540, 130, 8),
        planks: want(740, 140, 8),
      }),
      town("Bergame", {
        rope: want(930, 120, 8),
        salt: want(510, 120, 8),
        glass: want(1_380, 120, 8),
      }),
      town("Udine", {
        planks: want(780, 140, 8),
        bricks: want(710, 140, 8),
        flour: want(530, 130, 8),
      }),
    ],
    // The lagoon's, between two sestieri: Murano and Chioggia behind a canal, the Rialto free.
    lagoon: [
      town("Murano", {
        sand: want(240, 300, 20, 4_000),
        wood: want(260, 300, 20, 4_000),
        glass: want(1_800, 200, 10),
      }),
      town("Rialto", {
        wheat: want(150, 400, 26, 4_000),
        clay: want(180, 400, 26, 4_000),
        wood: want(200, 400, 26, 4_000),
        sand: want(160, 400, 26, 4_000),
        salt: want(400, 320, 20, 4_000),
        hemp: want(220, 400, 26, 4_000),
      }),
      town("Chioggia", {
        salt: want(700, 200, 10),
        rope: want(1_500, 180, 9),
        flour: want(900, 180, 9),
        bricks: want(1_100, 180, 9),
      }),
    ],
    // The open sea's, beyond a mouth and a strait: the richest.
    large: [
      town("Raguse", {
        glass: want(3_800, 200, 9, 5_000),
        rope: want(3_400, 200, 9, 5_000),
        bricks: want(3_000, 180, 8, 5_000),
        planks: want(3_200, 180, 8, 5_000),
      }),
      town("Alexandrie", {
        glass: want(6_500, 220, 8, 5_000),
        planks: want(5_500, 220, 8, 5_000),
        rope: want(6_000, 220, 8, 5_000),
        flour: want(4_500, 220, 8, 5_000),
      }),
      town("Constantinople", {
        glass: want(5_800, 220, 8, 5_000),
        bricks: want(4_200, 200, 8, 5_000),
        salt: want(3_000, 200, 8, 5_000),
        flour: want(4_000, 220, 8, 5_000),
      }),
      town("Candie", {
        rope: want(4_200, 200, 8, 5_000),
        planks: want(4_400, 200, 8, 5_000),
        salt: want(2_800, 200, 8, 5_000),
        glass: want(4_800, 200, 8, 5_000),
      }),
    ],
  },
  passages: {
    tollBps: 1_000,
    seals: 3,
    bouche: "chioggia",
    canal: "lido",
    strait: "segna",
    corsairs: ["Ivo le Borgne", "Dragut", "Uluç Ali", "Kemal Reis", "Barberousse", "Turgut"],
  },
  detourBps: 6_000,
  base: {
    sliceMs: base.sliceMs,
    goods: base.goods,
    // A bobbin takes longer to come home, and a thread held gains faster (docs/calibration.md).
    rules: { ...base.rules, rewindMsPerTile: 20 * 60_000, patinaBpsPerDay: 1_000 },
    ...(base.ile ? { ile: base.ile } : {}),
    ...(base.rank ? { rank: base.rank } : {}),
  },
};

export const venice1450Lagune = plancheLagoon(venice1450LaguneParams);
