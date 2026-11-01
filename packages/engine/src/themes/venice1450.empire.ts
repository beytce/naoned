import type { EmpireSettingsInput } from "../empire/settings.js";
import { VENICE_MAP_CELLS, VENICE_MAP_CITIES } from "./venice1450.map.js";

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
    // Shared by its seven cities, Venice weighing twenty (the map that grows): the founding serves
    // twenty-one parts in twenty-six, every city found and reached adds to it (calibration.md).
    localOrdersPerCounter: 22,
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
  },
];

const ADRIATIC = ["veneto", "romagna", "friuli", "dalmazia"];
const SEA = [...ADRIATIC, "grecia"];
const GALLEY = [...SEA, "levante", "costantinopoli"];

const module = (
  code: string,
  kind: "trade" | "extract" | "arms" | "workshop",
  effect: string,
  firstLevelBps: number,
  perLevelBps: number,
) => ({ code, kind, effect, firstLevelBps, perLevelBps });

/** The modules (profondeur.md § B), each from level 1 to 10. */
const MODULES = [
  // The trade modules, fitted on the vehicles (1 November 2026, after Hades' Star's ships): a place
  // a level of the model.
  module("hold", "trade", "capacity", 1_500, 700),
  module("convoy", "trade", "orderBonus", 500, 300),
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
  // The map at the centre of the game: the large sectors drawn from the chart (step 3), a city at
  // most in each; a counter reveals the six sectors around, each one a quarter dearer than the
  // last; the Arsenal on a coast, from the Casa of the first ship (calibrated at the simulator).
  map: {
    cells: VENICE_MAP_CELLS,
    // Venice, the capital, weighs most in Venetia's book (the map that grows, calibration.md).
    cities: VENICE_MAP_CITIES.map((c) => (c.code === "venezia" ? { ...c, weight: 20 } : c)),
    revealRadius: 1,
    // The fifth drawing (1 November): some forty sectors, each with one town or two, bought one
    // next to another; a counter's reach takes in its sector and its neighbours, about two rings
    // of sectors at its top.
    version: 5,
    hexSize: 24,
    unlock: { costDucats: 300, stepBps: 2_000, seaHops: 3 },
    reach: { base: 36, perLevel: 8 },
    postSpacing: 8,
    costStepBps: 2_500,
    // The Campo, the door of the Terraferma, from the Casa 4 (600 ducats: at 1 200 the miners
    // fell short of their share, calibration.md).
    camp: { costDucats: 600, casa: 4, minutes: 240 },
    // The Remise, where the vehicles are bought and their models raised, the ships too.
    depot: { costDucats: 200, casa: 2, minutes: 120 },
  },
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
    mule: { casa: 1, capacity: 25, places: 2, costDucats: 60, regions: ["veneto"], speedBps: 0 },
    cart: { casa: 3, capacity: 40, places: 3, costDucats: 120, regions: ["veneto"], speedBps: 0 },
    burchio: {
      casa: 5,
      capacity: 90,
      places: 6,
      costDucats: 400,
      regions: ["veneto", "lombardia", "romagna"],
      speedBps: 0,
    },
    chariot: {
      casa: 6,
      capacity: 70,
      places: 5,
      costDucats: 500,
      regions: ["veneto", "lombardia", "friuli", "germania"],
      speedBps: 0,
    },
  },
  // The cities' orders (1 November, after Hades' Star's shipments): a town fills over a day, one
  // order every four hours up to three for a market town, every 51 minutes up to fourteen for a
  // capital; a lot worth some eighty ducats of a good the house's workshops make, one place of a
  // hold, paid its reference and 15 % (calibration.md, the orders as shipments).
  orders: {
    cap: [3, 5, 8, 11, 14],
    everyMinutes: [240, 144, 90, 65, 51],
    lotDucats: 80,
    tierTimes: {},
    lots: {},
    premiumBps: 1_500,
  },
  // A hop: ten seconds to leave (left at once, or taken back), then eight units of the chart a
  // second, three to ten seconds across a counter's reach; fifteen stops queued at most.
  moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15 },
  // A model raised at the Remise or the Arsenal: its price, 500 ducats at the least, doubled at
  // each level; +10 % a level on land, +5 % at sea (at +10 %, the ships took the trade from the
  // miners and the traders: decision of the owner, calibration.md).
  vehicleLevels: {
    max: 5,
    stepBps: 1_000,
    shipStepBps: 500,
    costTimes: 1,
    minCostDucats: 500,
    // A place of hold more a level (the orders, after Hades' Star's transport).
    placesPerLevel: 1,
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
          { code: "libro", effects: { orderBonus: 1_000 } },
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
          { code: "bussola", effects: { haul: 500 } },
          { code: "stiva", effects: { capacity: 1_000 } },
          { code: "corriere", effects: { orderBonus: 500 } },
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
          { code: "squadre", effects: { counterCut: 1_000 } },
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
    bands: [0, 4_000, 6_500, 9_000, 11_500],
  },
  catchup: { fromShareBps: 3_500, maxCostCutBps: 6_000, maxTimeCutBps: 7_000 },
  prices: { floorBps: 6_000, ceilBps: 15_000, impactBps: 1_200, halfLifeHours: 36 },
  regions: REGIONS,
  modules: MODULES,
  research: {
    baseCostDucats: 50,
    costGrowthBps: 16_000,
    minutes: [30, 90, 240, 480, 960, 1_440, 2_880, 5_760, 10_080, 14_400],
    // One trade, delivering (1 November): the carts' hold and haul, the orders' bonus, the
    // workshops'. The sea, the deposits and the expeditions are gone.
    available: ["hold", "convoy", "tools", "apprentices", "master", "furnace"],
  },
  // The Porta's arms (docs/plan-porta.md §§ 4–5), to calibrate at the 24-month simulator (lot 6).
  porta: {
    // The Porta (plan-porta.md § 3), from the Casa 10.
    building: {
      casa: 10,
      costDucats: 4_000,
      minutes: 360,
      levelCostDucats: 4_000,
      levelMinutes: 120,
      travelMinutesPerCell: 10,
    },
    models: {
      cavaliere: { casa: 9, costDucats: 1_500, hp: 1_200, speedCenti: 600, places: ["weapon"] },
      carro: {
        casa: 11,
        costDucats: 4_000,
        hp: 3_000,
        speedCenti: 400,
        places: ["weapon", "defense"],
      },
      // Typed places (1 November, after Hades' Star's battleships): a weapon, a defense, then
      // supports, a support more at the model's levels 3 and 5.
      carro_grande: {
        casa: 14,
        costDucats: 10_000,
        hp: 6_500,
        speedCenti: 300,
        places: ["weapon", "defense", "support"],
      },
    },
    modelLevels: { max: 5, stepBps: 1_000, costTimes: 1 },
    components: {
      lances: {
        kind: "weapon",
        effect: "lances",
        casa: 9,
        costDucats: 800,
        power: 40,
        perLevelBps: 2_000,
        rangeCenti: 150,
        rampBps: 1_500,
        rampEveryS: 2,
        rampMaxBps: 15_000,
      },
      crossbows: {
        kind: "weapon",
        effect: "crossbows",
        casa: 9,
        costDucats: 1_000,
        power: 18,
        perLevelBps: 2_000,
        rangeCenti: 200,
      },
      culverin: {
        kind: "weapon",
        effect: "culverin",
        casa: 11,
        costDucats: 1_200,
        power: 400,
        perLevelBps: 2_000,
        rangeCenti: 300,
        periodS: 6,
      },
      pavise: {
        kind: "defense",
        effect: "pavise",
        casa: 9,
        costDucats: 900,
        power: 500,
        perLevelBps: 2_500,
        durationS: 10,
        cooldownS: 40,
      },
      cuirass: {
        kind: "defense",
        effect: "cuirass",
        casa: 9,
        costDucats: 700,
        power: 1_500,
        perLevelBps: 3_334,
      },
      surgeon: {
        kind: "support",
        effect: "surgeon",
        casa: 11,
        costDucats: 900,
        power: 60,
        perLevelBps: 2_000,
        rangeCenti: 200,
        durationS: 10,
        cooldownS: 45,
      },
      trumpet: {
        kind: "support",
        effect: "trumpet",
        casa: 11,
        costDucats: 600,
        power: 5_000,
        rangeCenti: 200,
        durationS: 8,
        cooldownS: 40,
        durationPerLevelS: 2,
      },
      smoke: {
        kind: "support",
        effect: "smoke",
        casa: 14,
        costDucats: 800,
        power: 0,
        durationS: 8,
        cooldownS: 60,
        durationPerLevelS: 2,
      },
    },
    componentMaxLevel: 5,
    battle: {
      stepMs: 250,
      minutes: 10,
      gateRadiusCenti: 100,
      cityRadiusCenti: 100,
      alertRadiusCenti: 300,
      hitMemoryS: 10,
      retreatHealBpsPerS: 200,
      retreatBackBps: 8_000,
      extraPlayerBps: 5_000,
      transport: { hp: 800, speedCenti: 500, holdPerRelic: 25 },
    },
    // Rome of the popes, after Hades' Star's Cerberus (plan-porta.md § 6.4).
    rome: {
      crossbowman: {
        hp: 600,
        power: 20,
        rangeCenti: 200,
        visionCenti: 300,
        speedCenti: 0,
        reviewS: 2,
        leashCenti: 100,
      },
      halberdier: {
        hp: 2_000,
        power: 25,
        rangeCenti: 120,
        visionCenti: 250,
        speedCenti: 300,
        reviewS: 8,
        leashCenti: 300,
        retreatBelowBps: 2_500,
      },
      light_horse: {
        hp: 900,
        power: 40,
        rangeCenti: 100,
        visionCenti: 400,
        speedCenti: 800,
        reviewS: 3,
        leashCenti: 600,
        retreatBelowBps: 2_500,
        prefersTransport: true,
      },
      bombard: {
        hp: 1_500,
        power: 120,
        rangeCenti: 300,
        visionCenti: 300,
        speedCenti: 150,
        reviewS: 6,
        leashCenti: 300,
        periodS: 4,
        areaCenti: 100,
      },
      gonfalonier: {
        hp: 25_000,
        power: 150,
        rangeCenti: 200,
        visionCenti: 300,
        speedCenti: 200,
        reviewS: 20,
        leashCenti: 300,
        rampBps: 1_500,
        rampEveryS: 2,
        rampMaxBps: 15_000,
      },
    },
    // The six tiers (plan-porta.md § 6.6): alone up to the 4th, two at least for the 5th and 6th.
    tiers: [
      {
        minPlayers: 1,
        radius: 8,
        cities: 4,
        garrison: { crossbowman: 1 },
        roamers: {},
        bosses: 0,
        strengthBps: 10_000,
        relicsPerCity: { min: 1, max: 2 },
        rarityWeights: { common: 90, rare: 10, precious: 0, legendary: 0 },
        breadPerVehicle: 4,
      },
      {
        minPlayers: 1,
        radius: 8,
        cities: 5,
        garrison: { crossbowman: 1, halberdier: 1 },
        roamers: { light_horse: 1 },
        bosses: 0,
        strengthBps: 11_000,
        relicsPerCity: { min: 1, max: 2 },
        rarityWeights: { common: 70, rare: 25, precious: 5, legendary: 0 },
        breadPerVehicle: 8,
      },
      {
        minPlayers: 1,
        radius: 9,
        cities: 5,
        garrison: { crossbowman: 2, halberdier: 1 },
        roamers: { light_horse: 1 },
        bosses: 0,
        strengthBps: 13_000,
        relicsPerCity: { min: 1, max: 3 },
        rarityWeights: { common: 50, rare: 35, precious: 15, legendary: 0 },
        breadPerVehicle: 15,
      },
      {
        minPlayers: 1,
        radius: 9,
        cities: 6,
        garrison: { crossbowman: 2, halberdier: 1 },
        roamers: { light_horse: 2 },
        bosses: 1,
        strengthBps: 24_000,
        relicsPerCity: { min: 2, max: 3 },
        rarityWeights: { common: 35, rare: 40, precious: 22, legendary: 3 },
        breadPerVehicle: 25,
      },
      {
        minPlayers: 2,
        radius: 10,
        cities: 7,
        garrison: { crossbowman: 2, halberdier: 2, bombard: 1 },
        roamers: { light_horse: 3 },
        bosses: 1,
        strengthBps: 28_000,
        relicsPerCity: { min: 2, max: 3 },
        rarityWeights: { common: 20, rare: 40, precious: 32, legendary: 8 },
        breadPerVehicle: 40,
      },
      {
        minPlayers: 2,
        radius: 10,
        cities: 8,
        garrison: { crossbowman: 3, halberdier: 2, bombard: 1 },
        roamers: { light_horse: 4 },
        bosses: 2,
        strengthBps: 36_000,
        relicsPerCity: { min: 2, max: 4 },
        rarityWeights: { common: 10, rare: 35, precious: 40, legendary: 15 },
        breadPerVehicle: 60,
      },
    ],
    relics: {
      // A battle worth about half a day of income at the Casa its tier is played at (lot 6).
      common: { loadS: 10, priceDucats: 150, points: 1 },
      rare: { loadS: 20, priceDucats: 1_000, points: 3 },
      precious: { loadS: 35, priceDucats: 4_000, points: 8 },
      legendary: { loadS: 60, priceDucats: 15_000, points: 20 },
    },
  },
};
