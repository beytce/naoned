import type { EmpireSettingsInput, Theme, WorldSettingsInput } from "../src/index.js";
import { venice1450 } from "../src/index.js";

/**
 * Frozen theme and settings for engine tests, so that balancing the real worlds never changes
 * what the tests check.
 */
// The goods and buildings of Venice when the fixture was frozen (later ones stay out).
const FROZEN_GOODS = new Set(
  "wheat flour bread clay bricks wood planks spices silk salt wine furs cloth".split(" "),
);
const FROZEN_BUILDINGS = new Set(
  "farm clay_pit lumber_camp mill bakery brickworks sawmill palazzo".split(" "),
);

export const testTheme: Theme = {
  ...venice1450,
  resources: venice1450.resources.filter((r) => FROZEN_GOODS.has(r.code)),
  buildings: venice1450.buildings.filter((b) => FROZEN_BUILDINGS.has(b.type)),
  cities: [
    { code: "venezia", name: "Venise" },
    { code: "padova", name: "Padoue" },
    { code: "verona", name: "Vérone" },
  ],
  recipes: [
    {
      code: "grow_wheat",
      building: "farm",
      inputs: {},
      outputs: { wheat: 20 },
      durationMinutes: 60,
    },
    {
      code: "dig_clay",
      building: "clay_pit",
      inputs: {},
      outputs: { clay: 20 },
      durationMinutes: 60,
    },
    {
      code: "cut_wood",
      building: "lumber_camp",
      inputs: {},
      outputs: { wood: 20 },
      durationMinutes: 60,
    },
    {
      code: "mill_flour",
      building: "mill",
      inputs: { wheat: 10 },
      outputs: { flour: 8 },
      durationMinutes: 30,
    },
    {
      code: "bake_bread",
      building: "bakery",
      inputs: { flour: 8 },
      outputs: { bread: 10 },
      durationMinutes: 60,
    },
    {
      code: "fire_bricks",
      building: "brickworks",
      inputs: { clay: 20 },
      outputs: { bricks: 12 },
      durationMinutes: 60,
    },
    {
      code: "saw_planks",
      building: "sawmill",
      inputs: { wood: 20 },
      outputs: { planks: 12 },
      durationMinutes: 60,
    },
  ],
};

const building = (costDucats: number, bricks: number, planks: number) => ({
  costDucats,
  costMaterials: { bricks, planks },
});

export const testSettings: WorldSettingsInput = {
  seasonDays: 42,
  registrationClosesDay: 28,
  startingCapital: 100_000,
  startingBuildings: {
    terraferma: ["farm", "mill"],
    lagoon: ["clay_pit", "brickworks"],
    dolomites: ["lumber_camp", "sawmill"],
  },
  marketTaxBps: 300,
  orderMaxHours: 72,
  maxOpenOrders: 10,
  instantOrderSlippageBps: 1_000,
  productionQueueMaxHours: 8,
  regionBonusBps: 3_000,
  lateJoiner: { afterDay: 7, bonusBps: 5_000, hours: 72 },
  maxBuildings: 12,
  maxBuildingLevel: 5,
  levelCostGrowthBps: 10_000,
  activeWindowHours: 72,
  advice: { glutHours: 24 },
  buildings: {
    farm: building(30_000, 20, 20),
    clay_pit: building(30_000, 20, 20),
    lumber_camp: building(30_000, 20, 20),
    mill: building(40_000, 30, 30),
    bakery: building(60_000, 40, 40),
    brickworks: building(50_000, 20, 40),
    sawmill: building(50_000, 40, 20),
  },
  referencePrices: {
    wheat: 100,
    flour: 160,
    bread: 180,
    clay: 100,
    bricks: 220,
    wood: 100,
    planks: 220,
  },
  marketMaker: {
    spreadStartBps: 400,
    spreadEndBps: 2_000,
    spreadRampDays: 14,
    referenceFloorBps: 5_000,
    dailyDepthPerPlayer: { wheat: 5, flour: 5, bread: 5, clay: 5, bricks: 5, wood: 5, planks: 5 },
  },
  cities: {
    venezia: { bread: { basePrice: 220, dailyCapacityPerPlayer: 60, maxDropBps: 5_000 } },
    padova: { bread: { basePrice: 210, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 } },
    verona: { bread: { basePrice: 200, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 } },
  },
  projects: {
    intervalDays: 7,
    durationDays: 7,
    needsPerPlayer: { bricks: 60, planks: 60 },
    premiumBps: 1_000,
  },
  valuation: { vwapDays: 7, minVolume: 200, buildingValueBps: 10_000 },
};

/**
 * Deliveries by road, for their own tests (off in `testSettings`, so that the other
 * tests keep selling to cities).
 */
export const testDeliveries = {
  ordersPerDay: { min: 10, max: 12 },
  dogeOrdersPerDay: 2,
  urgentPerDay: 1,
  urgentPremiumBps: 1_500,
  urgentOpenMinutes: 60,
  cityPriceBps: 10_000,
  distanceBonusBpsPerHour: 1_000,
  quantity: { bread: [10, 20] as [number, number], bricks: [5, 10] as [number, number] },
  routes: {
    terraferma: { venezia: 60, padova: 30, verona: 45 },
    lagoon: { venezia: 20, padova: 45, verona: 90 },
    dolomites: { venezia: 90, padova: 75, verona: 60 },
  },
  maxDeliveryMinutes: 120,
  vehicles: {
    mule: {
      costDucats: 5_000,
      costMaterials: {},
      capacity: 15,
      speedBps: 5_000,
    },
    cart: {
      costDucats: 10_000,
      costMaterials: { planks: 10 },
      capacity: 40,
      speedBps: 10_000,
    },
  },
  startingVehicles: ["cart"],
  maxVehicles: 3,
};

/** Overrides of `testSettings` for a world with deliveries. */
export const deliverySettings: Partial<WorldSettingsInput> = {
  cities: {
    venezia: {
      bread: { basePrice: 220, dailyCapacityPerPlayer: 60, maxDropBps: 5_000 },
      bricks: { basePrice: 260, dailyCapacityPerPlayer: 15, maxDropBps: 5_000 },
    },
    padova: { bread: { basePrice: 210, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 } },
    verona: { bread: { basePrice: 200, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 } },
  },
  contracts: { perDay: 2, premiumBps: 2_000, quantities: { bread: 20, bricks: 10 } },
  deliveries: testDeliveries,
};

/**
 * A small campaign for the families' tests: three lands by three, two families in opposite
 * corners, Milan in the middle.
 *
 *   nord(seat rossi)  borgo(village)  colle(bourg)
 *   campo(village)    rocca(Milan)    padova(city)
 *   lago(bourg)       verona(city)    sud(seat verdi)
 */
const grid = [
  ["nord", "borgo", "colle"],
  ["campo", "rocca", "padova"],
  ["lago", "verona", "sud"],
];
const kindOf: Record<string, string> = {
  nord: "seat",
  sud: "seat",
  borgo: "village",
  campo: "village",
  colle: "bourg",
  lago: "bourg",
  rocca: "fortress",
  padova: "city",
  verona: "city",
};

export const testFamilies = {
  openDay: 0,
  list: [
    { code: "rossi", seat: "nord" },
    { code: "verdi", seat: "sud" },
  ],
  levyMinBps: 7_500,
  levyMaxBps: 15_000,
};

export const testCampaign = {
  lands: grid.flatMap((row, r) =>
    row.map((code, c) => ({
      code,
      kind: kindOf[code] ?? "village",
      milan: code === "rocca",
      ...(code === "padova" || code === "verona" ? { city: code } : {}),
      neighbors: [grid[r - 1]?.[c], grid[r + 1]?.[c], row[c - 1], row[c + 1]].filter(
        (n): n is string => n !== undefined,
      ),
    })),
  ),
  kinds: {
    seat: { glory: 0, defenseBps: 10_000, militia: 0, militiaPerActive: 0 },
    village: { glory: 1, defenseBps: 10_000, militia: 2, militiaPerActive: 1 },
    bourg: { glory: 2, defenseBps: 12_000, militia: 3, militiaPerActive: 1 },
    city: { glory: 3, defenseBps: 15_000, militia: 4, militiaPerActive: 1 },
    fortress: { glory: 4, defenseBps: 20_000, militia: 6, militiaPerActive: 2 },
  },
  openHours: { from: 8, to: 22 },
  levy: { perHour: 2, max: 10 },
  hire: [
    { count: 5, price: 100 },
    { count: 5, price: 200 },
  ],
  lanceHours: 48,
  march: { baseMinutes: 20, perHopMinutes: 10 },
  milan: { everyHours: 4, warningMinutes: 30, base: 4, perActive: 1, leadBonusBps: 10_000 },
  garrisonLancesPerPoint: 10,
  works: {
    kinds: {
      tower: { price: 500, defenseBonusBps: 10_000 },
      camp: { price: 300, staging: true },
      toll: { price: 400, gloryBonusBps: 10_000 },
    },
    buildMinutes: 60,
    perFamily: 1,
    perMembers: 2,
    razeMerit: 3,
  },
};

export const testDecrees = {
  catalog: ["fondaco", "gabelle", "faveur", "peage", "levant", "calmiere"],
  perWinner: 2,
  maxVoteBps: 5_000,
  defaults: [{ code: "fondaco" }, { code: "levant" }],
  fondaco: { taxBps: 100, quotaBps: 5_000 },
  gabelle: { extraTaxBps: 400 },
  faveur: { premiumBps: 1_000, reservedMinutes: 30 },
  peage: { tollBps: 300 },
  levant: { memberQuotaBps: 5_000, othersCutBps: 2_500 },
  calmiere: { capBps: 11_500 },
};

/** Overrides of `testSettings` for a world with the families and their campaign. */
export const campaignSettings: Partial<WorldSettingsInput> = {
  families: testFamilies,
  campaign: testCampaign,
  decrees: testDecrees,
};

/** The house between seasons: Influence earned each week, and a privilege (the gilded name). */
export const testHouse = {
  influence: {
    commerce: { ducatsPerPoint: 10, weeklyCap: 12 },
    campaign: { meritPerPoint: 10, winBonus: 5, weeklyCap: 15 },
    season: { doge: 50, podium: 30, top10: 20, elite: 15, notable: 10, participant: 5 },
  },
  patents: { gilded_name: { cost: 40, requires: [] as string[] } },
  missions: {
    everyHours: 84,
    perBoard: 3,
    pool: [
      { id: "sell", event: "city_sale", count: 1, influence: 3 },
      { id: "sell_more", event: "city_sale", count: 2, influence: 5 },
      { id: "offer", event: "order_placed", count: 1, influence: 2 },
      { id: "upgrade", event: "upgrade", count: 1, influence: 4 },
    ],
  },
  spend: {
    rushMinutesPerPoint: 20,
    rushPerDay: 2,
    troopsPerPoint: 2,
    troopsPerDay: 10,
    dailyReroll: 3,
    respec: 15,
    rushWork: 5,
  },
};

/** The Terraferma on a small map: 10 cells a merchant, always open unless a test says otherwise. */
export const testTerraferma = {
  cellsPerActive: 10,
  minActive: 4,
  aspectBps: 15_000,
  milanBps: 2_000,
  cities: 2,
  openHours: { from: 0, to: 24 },
  stepMinutes: 10,
  terrains: {
    plain: { defenseBps: 10_000, militia: 3 },
    hill: { defenseBps: 15_000, militia: 6 },
  },
  bands: [{ untilBps: 10_000, weights: { plain: 3, hill: 1 } }],
  city: { militiaBps: 20_000, defenseBps: 15_000 },
  start: { minDistance: 3, troops: 30, troopsPerDay: 10, protectionHours: 24 },
  troops: { base: 20, perCell: 3, perCity: 10, regenBps: 1_000, regenMin: 1 },
  fronts: { max: 3, cellsPerStep: 2, minShareBps: 1_000, maxHours: 0 },
  milan: { troops: 60, troopsPerActive: 5, regenBps: 500, everyHours: 4, shareBps: 3_000 },
  glory: { perCell: 1, perCity: 3 },
};

/** The persistent empire (CADRAGE-v3), frozen for the tests: five Casa levels, three regions. */
export const testEmpire: EmpireSettingsInput = {
  casa: [
    { costDucats: 0, buildMinutes: 0, workshopSlots: 4, buildSlots: 1, researchSlots: 0 },
    { costDucats: 10_000, buildMinutes: 2, workshopSlots: 5, buildSlots: 1, researchSlots: 0 },
    {
      costDucats: 20_000,
      materials: { bricks: 20 },
      buildMinutes: 10,
      workshopSlots: 5,
      buildSlots: 1,
      researchSlots: 1,
      opens: ["scuola"],
    },
    {
      costDucats: 35_000,
      buildMinutes: 30,
      workshopSlots: 5,
      buildSlots: 2,
      researchSlots: 1,
      opens: ["lombardia"],
    },
    { costDucats: 60_000, buildMinutes: 60, workshopSlots: 6, buildSlots: 2, researchSlots: 2 },
  ],
  workshops: {
    yieldStepBps: 1_500,
    costGrowthBps: 13_000,
    baseCostDucats: 5_000,
    buildMinutes: [1, 5, 15, 30, 60],
    maxLevel: 20,
  },
  salaries: { minBps: 300, maxBps: 2_500, halfPower: 1_000 },
  power: {
    casa: 50,
    workshopLevel: 5,
    counterLevel: 20,
    moduleLevel: 3,
    staffLevel: 2,
    vehicle: 10,
    bands: [0, 200, 600, 1_500],
  },
  catchup: { fromShareBps: 5_000, maxCostCutBps: 5_000, maxTimeCutBps: 6_000 },
  prices: { floorBps: 6_000, ceilBps: 15_000, impactBps: 2_000, halfLifeHours: 24 },
  // A small map: Venetia's four cells, Lombardy two to four cells off, the Levant far east.
  map: {
    cells: {
      "0,0": { region: "veneto", coast: true },
      "1,0": { region: "veneto" },
      "0,1": { region: "veneto" },
      "1,1": { region: "veneto" },
      "3,0": { region: "lombardia" },
      "4,0": { region: "lombardia" },
      "3,1": { region: "lombardia" },
      "6,0": { region: "lombardia" },
      "9,0": { region: "levante", coast: true },
      "10,0": { region: "levante" },
    },
    cities: [
      { code: "venezia", cell: "0,0", region: "veneto" },
      { code: "padova", cell: "0,1", region: "veneto" },
      { code: "milano", cell: "4,0", region: "lombardia" },
      { code: "verona", cell: "3,1", region: "lombardia" },
      { code: "brescia", cell: "6,0", region: "lombardia" },
      { code: "acri", cell: "9,0", region: "levante" },
    ],
    revealRadius: 2,
    costStepBps: 2_500,
    arsenal: { costDucats: 500, casa: 2, minutes: 60 },
  },
  regions: [
    {
      code: "veneto",
      casa: 1,
      charterFavour: 0,
      hoursFromVenice: 0,
      workshopSlots: 0,
      produces: { wheat: 400 },
      demands: { bread: 1_200, spices: 6_000 },
      localOrdersPerCounter: 40,
      corsairRiskBps: 0,
    },
    {
      code: "lombardia",
      casa: 4,
      charterFavour: 50,
      hoursFromVenice: 6,
      workshopSlots: 3,
      produces: { iron: 900 },
      demands: { salt: 700 },
      localOrdersPerCounter: 30,
      corsairRiskBps: 0,
    },
    {
      code: "levante",
      casa: 14,
      charterFavour: 400,
      hoursFromVenice: 96,
      workshopSlots: 4,
      produces: { spices: 2_500 },
      demands: { cloth: 3_000 },
      localOrdersPerCounter: 20,
      corsairRiskBps: 1_200,
    },
  ],
  modules: [
    { code: "hold", kind: "trade", effect: "capacity", firstLevelBps: 1_000, perLevelBps: 500 },
    { code: "sails", kind: "trade", effect: "speed", firstLevelBps: 800, perLevelBps: 400 },
    { code: "yield", kind: "extract", effect: "yield", firstLevelBps: 1_500, perLevelBps: 700 },
    {
      code: "crossbow",
      kind: "arms",
      effect: "strength",
      firstLevelBps: 2_000,
      perLevelBps: 1_000,
    },
  ],
  research: {
    baseCostDucats: 2_000,
    costGrowthBps: 14_000,
    minutes: [30, 60, 120, 240, 480, 960, 1_440, 2_880, 7_200, 14_400],
    plansFromLevel: 4,
    plansPerLevel: 2,
  },
  deposits: { spawnBpsPerRegionDay: 3_000, minStock: 200, maxStock: 1_000, teamPerHour: 10 },
  expeditions: {
    tiers: [
      { strength: 10, relics: 1 },
      { strength: 25, relics: 2 },
      { strength: 60, relics: 3 },
    ],
    baseSuccessBps: 6_000,
  },
  corsairs: { lossShareBps: 3_000, escortHalving: 20 },
  colleganza: { travellerShareBps: 2_500 },
  // The Porta (docs/plan-porta.md): two combat models and four components, round numbers.
  porta: {
    models: {
      rider: { casa: 2, costDucats: 1_000, hp: 1_000, speedCenti: 600, slots: 1 },
      wagon: { casa: 4, costDucats: 3_000, hp: 3_000, speedCenti: 400, slots: 2 },
    },
    modelLevels: { max: 5, stepBps: 1_000, costTimes: 1 },
    components: {
      lances: {
        kind: "weapon",
        effect: "lances",
        casa: 2,
        costDucats: 500,
        power: 40,
        perLevelBps: 2_000,
        rangeCenti: 150,
        rampBps: 1_500,
        rampEveryS: 2,
        rampMaxBps: 15_000,
      },
      culverin: {
        kind: "weapon",
        effect: "culverin",
        casa: 4,
        costDucats: 1_000,
        power: 400,
        perLevelBps: 2_000,
        rangeCenti: 300,
        periodS: 6,
      },
      cuirass: {
        kind: "defense",
        effect: "cuirass",
        casa: 2,
        costDucats: 400,
        power: 1_500,
        perLevelBps: 3_334,
      },
      smoke: {
        kind: "support",
        effect: "smoke",
        casa: 2,
        costDucats: 600,
        power: 0,
        durationS: 8,
        cooldownS: 60,
        durationPerLevelS: 2,
      },
    },
    componentMaxLevel: 5,
  },
};
