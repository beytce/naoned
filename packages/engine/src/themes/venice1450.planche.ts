/**
 * Venice's board with its islands (docs/plan-planche.md, docs/plan-ile.md): eight houses in the
 * lagoon, each on its island; the Rialto, which buys the raw goods; the towns of the mainland and
 * of the sea, which want the worked ones; three passages. The workshops are Venice's recipes, the
 * ones the kit draws. In the game these are a world's settings (`worlds.settings`), never constants
 * of the engine. Orders of magnitude, measured at the bench (docs/calibration.md, § L'île).
 */
import type { IleRules, IleWorkshop } from "../ile/ile.js";
import type { PlancheCity, PlancheSetup, PlancheWant } from "../planche/planche.js";

const HOUR = 3_600_000;
const MIN = 60_000;
const want = (price: number, cap: number, regenPerHour: number, floorBps = 3_000): PlancheWant => ({
  price,
  floorBps,
  cap,
  regenPerHour,
});
const city = (
  id: string,
  name: string,
  x: number,
  y: number,
  wants: Record<string, PlancheWant>,
  via: string[] = [],
): PlancheCity => ({ id, name, x, y, via, wants });

/** A workshop of the first tier (the raw) or the second (the worked), at Venice's prices. */
const raw = (
  name: string,
  terrain: IleWorkshop["terrain"],
  outputs: Record<string, number>,
): IleWorkshop => ({
  name,
  tier: 1,
  terrain,
  inputs: {},
  outputs,
  lotsPerHour: 2,
  cost: [60_000, 300_000, 900_000],
  buildMs: [5 * MIN, 2 * HOUR, 12 * HOUR],
});
const worked = (
  name: string,
  terrain: IleWorkshop["terrain"],
  inputs: Record<string, number>,
  outputs: Record<string, number>,
  nuisance?: string[],
): IleWorkshop => ({
  name,
  tier: 2,
  terrain,
  inputs,
  outputs,
  lotsPerHour: 2,
  cost: [150_000, 700_000, 2_000_000],
  buildMs: [10 * MIN, 3 * HOUR, 16 * HOUR],
  ...(nuisance ? { nuisance } : {}),
});

const ile: IleRules = {
  maxTiles: 36,
  startTiles: ["0,0", "1,0", "0,1", "1,1"],
  tileCost: { base: 40_000, growthBps: 2_500 },
  levelYieldBps: [10_000, 18_000, 26_000],
  bonus: { terrainBps: 5_000, supplierBps: 2_000, nuisanceBps: -2_000 },
  workshops: {
    farm: raw("Ferme", "pre", { wheat: 8 }),
    clay_pit: raw("Carrière d'argile", "argile", { clay: 8 }),
    lumber_camp: raw("Camp de bûcherons", "foret", { wood: 12 }),
    sand_pit: raw("Sablière", "sable", { sand: 8 }),
    salt_pans: raw("Saline", "rive", { salt: 10 }),
    hemp_field: raw("Champ de chanvre", "pre", { hemp: 10 }),
    mill: worked("Moulin", "pre", { wheat: 10 }, { flour: 8 }),
    sawmill: worked("Scierie", "rive", { wood: 10 }, { planks: 6 }),
    brickworks: worked("Briqueterie", "argile", { clay: 8, wood: 2 }, { bricks: 6 }, ["farm"]),
    glassworks: worked("Verrerie", "rive", { sand: 10, wood: 4 }, { glass: 5 }, ["farm"]),
    rope_walk: worked("Corderie", "rive", { hemp: 8 }, { rope: 4 }),
  },
};

export const venice1450Planche: PlancheSetup & {
  /** The lagoon's middle and the reach of the calm water, for the board's ink. */
  lagoon: { x: number; y: number };
  /** The Rialto's tile: the market of Venice, which buys the raw goods. */
  rialto: { x: number; y: number };
} = {
  width: 28,
  height: 18,
  lagoon: { x: 13, y: 9 },
  rialto: { x: 15, y: 6 },
  sliceMs: HOUR / 6,
  goods: {
    wheat: "Blé",
    clay: "Argile",
    wood: "Bois",
    sand: "Sable",
    salt: "Sel",
    hemp: "Chanvre",
    flour: "Farine",
    planks: "Planches",
    bricks: "Briques",
    glass: "Verre",
    rope: "Cordages",
  },
  ile,
  houses: [
    {
      id: "toi",
      name: "Ta Maison",
      robot: false,
      x: 12,
      y: 8,
      makes: {},
      soil: { rive: 2, sable: 2, foret: 2, pre: 1, argile: 1 },
      // Played by the computer only while no player holds it (the bench, a board on line).
      plan: ["sand_pit", "lumber_camp", "glassworks", "salt_pans", "sawmill", "lumber_camp"],
    },
    {
      id: "contarini",
      name: "Ca’ Contarini",
      robot: true,
      x: 15,
      y: 10,
      makes: {},
      soil: { sable: 2, rive: 2, foret: 1 },
      plan: ["sand_pit", "lumber_camp", "glassworks", "sand_pit", "lumber_camp", "glassworks"],
    },
    {
      id: "loredan",
      name: "Ca’ Loredan",
      robot: true,
      x: 10,
      y: 11,
      makes: {},
      soil: { foret: 3, argile: 2, rive: 1 },
      plan: ["lumber_camp", "sawmill", "clay_pit", "brickworks", "lumber_camp", "sawmill"],
    },
    {
      id: "morosini",
      name: "Ca’ Morosini",
      robot: true,
      x: 13,
      y: 12,
      makes: {},
      soil: { rive: 3, pre: 2 },
      plan: ["salt_pans", "hemp_field", "rope_walk", "salt_pans", "hemp_field", "rope_walk"],
    },
    {
      id: "dandolo",
      name: "Ca’ Dandolo",
      robot: true,
      x: 16,
      y: 8,
      makes: {},
      soil: { argile: 3, foret: 2 },
      plan: ["clay_pit", "lumber_camp", "brickworks", "clay_pit", "brickworks", "lumber_camp"],
    },
    {
      id: "foscari",
      name: "Ca’ Foscari",
      robot: true,
      x: 11,
      y: 6,
      makes: {},
      soil: { pre: 3, rive: 1 },
      plan: ["farm", "mill", "farm", "hemp_field", "mill", "salt_pans"],
    },
    {
      id: "grimani",
      name: "Ca’ Grimani",
      robot: true,
      x: 14,
      y: 14,
      makes: {},
      soil: { pre: 2, rive: 2 },
      plan: ["hemp_field", "rope_walk", "salt_pans", "hemp_field", "rope_walk", "farm"],
    },
    {
      id: "mocenigo",
      name: "Ca’ Mocenigo",
      robot: true,
      x: 9,
      y: 9,
      makes: {},
      soil: { sable: 2, foret: 2, rive: 1 },
      plan: ["sand_pit", "lumber_camp", "glassworks", "sawmill", "sand_pit", "lumber_camp"],
    },
  ],
  cities: [
    city("rialto", "Rialto", 15, 6, {
      wheat: want(150, 300, 20, 4_000),
      clay: want(180, 300, 20, 4_000),
      wood: want(200, 300, 20, 4_000),
      sand: want(160, 300, 20, 4_000),
      salt: want(400, 240, 16, 4_000),
      hemp: want(220, 300, 20, 4_000),
    }),
    city("padoue", "Padoue", 5, 9, {
      glass: want(1_300, 140, 9),
      rope: want(900, 120, 8),
      flour: want(500, 140, 9),
    }),
    city("trevise", "Trévise", 12, 2, {
      bricks: want(650, 140, 9),
      planks: want(700, 140, 9),
      salt: want(500, 120, 8),
    }),
    city("vicence", "Vicence", 3, 5, {
      glass: want(1_400, 120, 8),
      flour: want(550, 130, 8),
      rope: want(950, 120, 8),
    }),
    city("verone", "Vérone", 1, 8, {
      bricks: want(750, 140, 8),
      planks: want(800, 140, 8),
      glass: want(1_500, 120, 7),
    }),
    city(
      "ferrare",
      "Ferrare",
      4,
      15,
      {
        glass: want(2_000, 150, 8),
        rope: want(1_500, 140, 8),
        flour: want(900, 140, 8),
        bricks: want(1_100, 140, 8),
      },
      ["chioggia"],
    ),
    city(
      "raguse",
      "Raguse",
      23,
      12,
      {
        glass: want(3_800, 200, 9, 5_000),
        rope: want(3_400, 200, 9, 5_000),
        bricks: want(3_000, 180, 8, 5_000),
        planks: want(3_200, 180, 8, 5_000),
      },
      ["segna"],
    ),
    city(
      "alexandrie",
      "Alexandrie",
      25,
      16,
      {
        glass: want(6_500, 220, 8, 5_000),
        planks: want(5_500, 220, 8, 5_000),
        rope: want(6_000, 220, 8, 5_000),
        flour: want(4_500, 220, 8, 5_000),
      },
      ["segna", "otrante"],
    ),
  ],
  passages: [
    {
      id: "chioggia",
      name: "Bouche de Chioggia",
      x: 12,
      y: 15,
      holder: "contarini",
      tollBps: 1_000,
      board: "chioggia",
      seals: 3,
      peril: 1,
    },
    {
      id: "segna",
      name: "Détroit de Segna",
      x: 20,
      y: 8,
      holder: "corsair:Ivo le Borgne",
      tollBps: 1_000,
      board: "segna",
      seals: 3,
      peril: 2,
    },
    {
      id: "otrante",
      name: "Canal d’Otrante",
      x: 24,
      y: 14,
      holder: "corsair:Dragut",
      tollBps: 1_000,
      board: "otrante",
      seals: 3,
      peril: 3,
    },
  ],
  // The rank (docs/plan-classement.md): six weeks a tide, a day of thread to stand in the Négoce.
  rank: {
    tideWeeks: 6,
    weekMs: 7 * 24 * 3_600_000,
    negoceMinMs: 24 * 3_600_000,
    coteStart: 1_200,
    coteK: 32,
    // The laurel of the Passe asks three challenges played in the tide (docs/plan-duels.md B4).
    defisMin: 3,
    repelledHours: 12,
  },
  rules: {
    bobbins: 5,
    store: 240,
    startStock: 0,
    startDucats: 300_000,
    threadPerHour: 10,
    patinaBpsPerDay: 500,
    patinaMaxBps: 5_000,
    tollMaxBps: 1_500,
    tollBurnBps: 3_000,
    freeAfterForceMs: 24 * HOUR,
    rewindMsPerTile: 5 * 60_000,
  },
};
