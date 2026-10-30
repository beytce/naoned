import type { EmpireSettingsInput } from "../empire/settings.js";

/**
 * The persistent empire of Venice (CADRAGE-v3 § 3, docs/refonte-2026-10-29/profondeur.md): orders
 * of magnitude to calibrate with the 24-month simulator, money in deniers, rates in bps.
 */

const D = 100; // deniers a ducat

/** The Casa 1 to 20 (CADRAGE-v3 § 3.1 and § 3 septies). */
const CASA: [number, Record<string, number>, number, string[]][] = [
  [0, {}, 0, []],
  [50, { bricks: 5, planks: 5 }, 2, []],
  [100, { bricks: 10, planks: 10 }, 10, ["cart", "limitOrders"]],
  [150, { bricks: 15, planks: 15 }, 30, ["scuola", "tradeModules"]],
  [400, { bricks: 30, planks: 30 }, 60, ["burchio", "extraction"]],
  [1_000, { bricks: 60, planks: 60 }, 120, ["lombardia", "datedNews"]],
  [1_600, { bricks: 80, planks: 80 }, 240, ["arte", "workshopModules", "qualities"]],
  [2_500, { bricks: 100, planks: 100, glass: 20 }, 480, ["stato", "friuli", "forwards"]],
  [3_800, { bricks: 120, planks: 120, iron: 30 }, 720, ["arms", "marciliana", "romagna"]],
  [5_500, { planks: 150, oak: 40 }, 1_080, ["expeditions", "dalmazia"]],
  [7_500, { planks: 180, oak: 60 }, 2_160, ["colleganza", "cocca", "ambassadors"]],
  [10_000, { bricks: 200, marble: 40 }, 3_240, ["germania", "grecia", "fog"]],
  [13_500, { marble: 60, glass: 60 }, 4_320, ["minorArte"]],
  [17_000, { marble: 80, silk: 30 }, 5_400, ["levante", "galeaGrossa", "freePorts"]],
  [22_000, { oak: 150, silk: 40 }, 6_480, []],
  [27_000, { marble: 120, alum: 40 }, 7_560, ["costantinopoli"]],
  [34_000, { marble: 150, alum: 60 }, 8_640, ["procuratia"]],
  [41_000, { marble: 180, cloth: 80 }, 10_800, ["fiandra", "flandersGalley"]],
  [49_000, { marble: 220, cloth: 100 }, 12_960, []],
  [64_000, { marble: 300, silk: 100, alum: 100, cloth: 100 }, 15_120, ["maestria"]],
];

const slots = (level: number, at: number[]) => at.filter((l) => level >= l).length;

/** The ten regions, by their order of opening (CADRAGE-v3 § 3.4). */
const REGIONS: EmpireSettingsInput["regions"] = [
  {
    code: "veneto",
    casa: 1,
    charterFavour: 0,
    hoursFromVenice: 0,
    workshopSlots: 0,
    produces: { wheat: 4 * D, clay: 3 * D, wood: 3 * D, salt: 5 * D },
    demands: { bread: 12 * D, bricks: 10 * D, planks: 10 * D, spices: 70 * D, cloth: 45 * D },
    localOrdersPerCounter: 20,
    corsairRiskBps: 0,
  },
  {
    code: "lombardia",
    casa: 6,
    charterFavour: 40,
    hoursFromVenice: 6,
    workshopSlots: 3,
    produces: { iron: 9 * D, wool: 8 * D, wheat: 4 * D },
    demands: { salt: 9 * D, glass: 30 * D, cloth: 40 * D },
    localOrdersPerCounter: 20,
    corsairRiskBps: 0,
  },
  {
    code: "friuli",
    casa: 8,
    charterFavour: 80,
    hoursFromVenice: 8,
    workshopSlots: 3,
    produces: { wood: 2 * D, marble: 15 * D, wine: 6 * D },
    demands: { bread: 13 * D, iron: 14 * D, cloth: 42 * D },
    localOrdersPerCounter: 16,
    corsairRiskBps: 0,
  },
  {
    code: "romagna",
    casa: 9,
    charterFavour: 120,
    hoursFromVenice: 10,
    workshopSlots: 3,
    produces: { salt: 3 * D, wheat: 3 * D },
    demands: { planks: 13 * D, glass: 32 * D },
    localOrdersPerCounter: 16,
    corsairRiskBps: 100,
  },
  {
    code: "dalmazia",
    casa: 10,
    charterFavour: 200,
    hoursFromVenice: 24,
    workshopSlots: 4,
    produces: { oak: 12 * D, salt: 3 * D, wine: 5 * D },
    demands: { bread: 14 * D, cloth: 46 * D, iron: 15 * D },
    localOrdersPerCounter: 16,
    corsairRiskBps: 400,
  },
  {
    code: "germania",
    casa: 12,
    charterFavour: 300,
    hoursFromVenice: 48,
    workshopSlots: 4,
    produces: { silver: 60 * D, copper: 20 * D, iron: 7 * D },
    demands: { spices: 110 * D, glass: 45 * D, silk: 160 * D },
    localOrdersPerCounter: 6,
    corsairRiskBps: 200,
  },
  {
    code: "grecia",
    casa: 12,
    charterFavour: 300,
    hoursFromVenice: 72,
    workshopSlots: 4,
    produces: { sugar: 25 * D, wine: 4 * D, cotton: 18 * D },
    demands: { cloth: 50 * D, glass: 40 * D, iron: 16 * D },
    localOrdersPerCounter: 6,
    corsairRiskBps: 800,
  },
  {
    code: "levante",
    casa: 14,
    charterFavour: 500,
    hoursFromVenice: 120,
    workshopSlots: 4,
    produces: { spices: 35 * D, silk: 80 * D, cotton: 12 * D },
    demands: { cloth: 60 * D, silver: 85 * D, copper: 32 * D, glass: 50 * D },
    localOrdersPerCounter: 5,
    corsairRiskBps: 1_200,
  },
  {
    code: "costantinopoli",
    casa: 16,
    charterFavour: 700,
    hoursFromVenice: 144,
    workshopSlots: 4,
    produces: { alum: 20 * D, furs: 40 * D, wheat: 3 * D },
    demands: { cloth: 58 * D, glass: 48 * D, spices: 90 * D },
    localOrdersPerCounter: 5,
    corsairRiskBps: 1_500,
  },
  {
    code: "fiandra",
    casa: 18,
    charterFavour: 1_000,
    hoursFromVenice: 288,
    workshopSlots: 4,
    produces: { cloth: 30 * D, wool: 6 * D },
    demands: { spices: 140 * D, silk: 200 * D, alum: 45 * D, sugar: 55 * D, wine: 14 * D },
    localOrdersPerCounter: 5,
    corsairRiskBps: 1_000,
  },
];

const module = (
  code: string,
  kind: "trade" | "extract" | "arms" | "workshop",
  effect: string,
  firstLevelBps: number,
  perLevelBps: number,
) => ({ code, kind, effect, firstLevelBps, perLevelBps });

/** The modules (profondeur.md § B), each from level 1 to 10. */
const MODULES = [
  module("hold", "trade", "capacity", 1_500, 700),
  module("sails", "trade", "speed", 1_000, 500),
  module("prompt", "trade", "turnaround", 2_000, 800),
  module("courier", "trade", "dispatch", 1_000, 500),
  module("floating", "trade", "portSale", 500, 300),
  module("convoy", "trade", "orderBonus", 500, 300),
  module("flag", "trade", "warPass", 3_000, 700),
  module("portolan", "trade", "intel", 2_000, 800),
  module("letter", "trade", "noCash", 1_000, 1_000),
  module("recall", "trade", "recall", 1_000, 1_000),
  module("yield", "extract", "yield", 2_000, 1_000),
  module("campaign", "extract", "burst", 3_000, 3_000),
  module("remote", "extract", "range", 1_000, 1_000),
  module("prospect", "extract", "spawn", 1_000, 500),
  module("sustain", "extract", "depletion", 1_000, 500),
  module("haul", "extract", "haul", 1_000, 1_000),
  module("crossbow", "arms", "strength", 2_000, 1_200),
  module("bombard", "arms", "strength", 2_500, 1_400),
  module("greekfire", "arms", "strength", 2_200, 1_300),
  module("culverin", "arms", "strength", 2_400, 1_300),
  module("pavise", "arms", "defence", 2_000, 1_000),
  module("mantlet", "arms", "defence", 2_500, 1_100),
  module("cuirass", "arms", "defence", 3_000, 1_200),
  module("surgeon", "arms", "support", 1_500, 800),
  module("scout", "arms", "support", 1_000, 600),
  module("victualler", "arms", "support", 1_000, 600),
  module("engineer", "arms", "support", 1_500, 800),
  module("trumpet", "arms", "support", 1_000, 600),
  module("tools", "workshop", "workshopYield", 1_000, 500),
  module("apprentices", "workshop", "workshopSpeed", 1_000, 500),
  module("master", "workshop", "quality", 1_000, 500),
  module("furnace", "workshop", "inputs", 500, 300),
];

export const venice1450Empire: EmpireSettingsInput = {
  casa: CASA.map(([ducats, materials, buildMinutes, opens], i) => {
    const level = i + 1;
    return {
      costDucats: ducats * D,
      materials,
      buildMinutes,
      workshopSlots: 4 + slots(level, [2, 5, 8, 12]),
      buildSlots: 1 + slots(level, [5, 15, 19]),
      researchSlots: slots(level, [4, 12, 18]),
      opens,
      // From the Casa 9: so many workshops at the level just below (the empire follows).
      requires:
        level >= 9
          ? { workshops: Math.min(level - 3, 12), level: level - 1 }
          : { workshops: 0, level: 0 },
    };
  }),
  workshops: {
    yieldStepBps: 1_500,
    costGrowthBps: 13_000,
    baseCostDucats: 120,
    buildMinutes: [
      1, 5, 15, 30, 60, 120, 240, 480, 720, 720, 1_080, 1_440, 1_440, 2_160, 4_320, 7_200, 9_000,
      10_800, 12_600, 14_400, 18_000, 18_000, 20_160, 20_160, 20_160,
    ],
    maxLevel: 25,
    neighbourBps: 1_000,
  },
  counters: { maxLevel: 10, bookStepBps: 4_000 },
  // The socle in Venetia: the clay, the wood and the planks of the Casa 2; its bricks ask the
  // fourth place, a brickworks, the first choice (a farm instead would leave the Casa waiting).
  start: {
    capitalDucats: 500,
    workshops: [
      { type: "clay_pit", recipe: "dig_clay" },
      { type: "lumber_camp", recipe: "cut_wood" },
      { type: "sawmill", recipe: "saw_planks" },
    ],
    vehicles: ["mule", "mule"],
  },
  // The vehicles of step 4 (CADRAGE-v3 § 3.3), as the 24-month simulator has them; the ships come
  // with the sea.
  vehicles: {
    mule: { casa: 1, capacity: 25, costDucats: 60, regions: ["veneto"], speedBps: 0 },
    cart: { casa: 3, capacity: 40, costDucats: 120, regions: ["veneto"], speedBps: 0 },
    burchio: {
      casa: 5,
      capacity: 90,
      costDucats: 400,
      regions: ["veneto", "lombardia", "romagna"],
      speedBps: 0,
    },
    chariot: {
      casa: 6,
      capacity: 70,
      costDucats: 500,
      regions: ["veneto", "lombardia", "friuli", "germania"],
      speedBps: 0,
    },
  },
  localTripsPerDay: 4,
  newcomers: { rawBonusBps: 2_000, untilCasa: 8 },
  // The knowledge (CADRAGE-v3 § 3.5): four branches, four knowledges and two capstones each,
  // from 30 minutes to 10 days; one place from the Casa 4, two from the 12.
  knowledge: {
    baseCostDucats: 300,
    costGrowthBps: 25_000,
    minutes: [30, 240, 1_440, 4_320, 14_400],
    slotsAt: [4, 12],
    branches: [
      {
        code: "abaco",
        nodes: [
          { code: "tariffa", effects: { taxCut: 50 } },
          { code: "scritta", effects: { orderBonus: 500 } },
          { code: "libro", effects: { book: 1_000 } },
          { code: "cambio", effects: { taxCut: 50 } },
        ],
        capstones: [
          { code: "partita", effects: { wagesCut: 1_500 } },
          { code: "banco", effects: { orderBonus: 1_500 } },
        ],
      },
      {
        code: "navigazione",
        nodes: [
          { code: "bussola", effects: { speed: 1_000 } },
          { code: "stiva", effects: { capacity: 1_000 } },
          { code: "corriere", effects: { intel: 3_333 } },
          { code: "carri", effects: { haul: 1_000 } },
        ],
        capstones: [
          { code: "portolano", effects: { newsLive: 1 } },
          { code: "convoglio", effects: { tripsExtra: 1 } },
        ],
      },
      {
        code: "arti",
        nodes: [
          { code: "mestiere", effects: { workshopYield: 500 } },
          { code: "cantiere", effects: { buildTime: 1_000 } },
          { code: "risparmio", effects: { inputs: 500 } },
          { code: "finezza", effects: { quality: 500 } },
        ],
        capstones: [
          { code: "bottega", effects: { moduleSlotsExtra: 1 } },
          { code: "catena", effects: { neighbour: 10_000 } },
        ],
      },
      {
        code: "diplomazia",
        nodes: [
          { code: "lettere", effects: { charterCut: 2_000 } },
          { code: "patti", effects: { counterCut: 1_000 } },
          { code: "favori", effects: { carnetFavour: 2_000 } },
          { code: "squadre", effects: { teamsExtra: 1 } },
        ],
        capstones: [
          { code: "ambasciata", effects: { charterCut: 5_000 } },
          { code: "signoria", effects: { carnetExtra: 1 } },
        ],
      },
    ],
  },
  // The staff (CADRAGE-v3 § 3 quinquies): the master of a workshop, the factor of a region, the
  // captain of a vehicle; a path every five levels, a place more every four levels of the Casa.
  staff: {
    hireCostDucats: 200,
    hireGrowthBps: 15_000,
    slotsBase: 1,
    casaPerSlot: 4,
    xpPerLevel: 50,
    maxLevel: 30,
    tierEvery: 5,
    rarityBps: { common: 10_000, rare: 15_000, illustrious: 20_000 },
    roles: {
      master: {
        place: "workshop",
        perLevel: { workshopYield: 30, quality: 20 },
        paths: [{ quality: 300 }, { workshopYield: 300 }],
      },
      factor: {
        place: "region",
        perLevel: { book: 50 },
        paths: [{ book: 500 }, { orderBonus: 200 }],
      },
      captain: {
        place: "vehicle",
        perLevel: { speed: 50, capacity: 50 },
        paths: [{ speed: 500 }, { capacity: 500 }],
      },
    },
  },
  // The family (CADRAGE-v3 § 3.5): a generation a quarter, a rare member of the family each, and
  // the lineage's traits, small and for good.
  family: {
    roles: ["master", "factor", "captain"],
    rarity: "rare",
    traits: [
      { code: "mercanti", effects: { orderBonus: 300 } },
      { code: "artigiani", effects: { workshopYield: 200 } },
      { code: "navigatori", effects: { speed: 500 } },
      { code: "diplomatici", effects: { charterCut: 1_000 } },
      { code: "prudenti", effects: { wagesCut: 500 } },
    ],
  },
  // The Arti (CADRAGE-v3 § 3.5, the owner's choice of 30 October 2026): the chains of the theme.
  arte: {
    fromCasa: 7,
    minorFromCasa: 13,
    chainYieldBps: 1_000,
    minorYieldBps: 500,
    topLevel: 25,
    renounceLevel: 15,
    artes: [
      { code: "lanaioli", buildings: ["sheepfold", "loom", "tailor"] },
      { code: "vetrai", buildings: ["sand_pit", "glassworks", "mirrorworks"] },
      { code: "speziali", buildings: ["spicery"] },
      { code: "arsenalotti", buildings: ["lumber_camp", "sawmill", "brickworks"] },
      { code: "banchieri", buildings: [], effects: { taxCut: 100, orderBonus: 500 } },
    ],
  },
  highRecipes: { fromLevel: 12, rawPerLevelBps: 500, goods: ["wheat", "clay", "wood", "salt"] },
  salaries: { minBps: 300, maxBps: 2_500, halfPower: 4_000 },
  power: {
    casa: 100,
    workshopLevel: 10,
    counterLevel: 40,
    moduleLevel: 5,
    staffLevel: 3,
    vehicle: 20,
    // The first band left in 4 to 6 months (the owner's target of 30 October 2026).
    bands: [0, 4_500, 7_000, 9_500, 12_000],
  },
  catchup: { fromShareBps: 3_500, maxCostCutBps: 6_000, maxTimeCutBps: 7_000 },
  prices: { floorBps: 6_000, ceilBps: 15_000, impactBps: 1_200, halfLifeHours: 36 },
  regions: REGIONS,
  modules: MODULES,
  research: {
    baseCostDucats: 50,
    costGrowthBps: 16_000,
    minutes: [30, 90, 240, 480, 960, 1_440, 2_880, 5_760, 10_080, 14_400],
    plansFromLevel: 4,
    plansPerLevel: 2,
    // Step 4: the trade modules whose systems exist, and the deposits'; the others wait for theirs.
    available: [
      "hold",
      "sails",
      "portolan",
      "convoy",
      "yield",
      "remote",
      "tools",
      "apprentices",
      "master",
      "furnace",
    ],
  },
  deposits: { spawnBpsPerRegionDay: 15_000, minStock: 1_000, maxStock: 5_000, teamPerHour: 30 },
  expeditions: {
    tiers: Array.from({ length: 12 }, (_, i) => ({
      strength: Math.round(10 * 1.6 ** i),
      relics: 1 + Math.floor(i / 2),
    })),
    baseSuccessBps: 6_500,
  },
  corsairs: { lossShareBps: 2_500, escortHalving: 30 },
  muda: {
    vehicles: ["galea", "fiandra"],
    departuresPerWeek: 2,
    placesShareBps: 5_000,
    reserveDaysBps: 10_000,
  },
  colleganza: { travellerShareBps: 2_500 },
};
