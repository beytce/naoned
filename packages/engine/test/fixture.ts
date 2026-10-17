import type { Theme, WorldSettingsInput } from "../src/index.js";
import { venice1450 } from "../src/index.js";

/**
 * Frozen theme and settings for engine tests, so that balancing the real worlds never changes
 * what the tests check.
 */
export const testTheme: Theme = {
  ...venice1450,
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

const building = (costDucats: number, bricks: number, planks: number, upkeepPerDay: number) => ({
  costDucats,
  costMaterials: { bricks, planks },
  upkeepPerDay,
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
  upkeepDefaultHours: 24,
  activeWindowHours: 72,
  buildings: {
    farm: building(30_000, 20, 20, 1_000),
    clay_pit: building(30_000, 20, 20, 1_000),
    lumber_camp: building(30_000, 20, 20, 1_000),
    mill: building(40_000, 30, 30, 1_500),
    bakery: building(60_000, 40, 40, 2_000),
    brickworks: building(50_000, 20, 40, 1_500),
    sawmill: building(50_000, 40, 20, 1_500),
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
      upkeepPerDay: 100,
    },
    cart: {
      costDucats: 10_000,
      costMaterials: { planks: 10 },
      capacity: 40,
      speedBps: 10_000,
      upkeepPerDay: 200,
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
  catalog: ["fondaco", "gabelle", "faveur", "peage", "levant", "calmiere", "franchise"],
  perWinner: 2,
  maxVoteBps: 5_000,
  defaults: [{ code: "fondaco" }, { code: "franchise" }],
  fondaco: { taxBps: 100, quotaBps: 5_000 },
  gabelle: { extraTaxBps: 400 },
  faveur: { premiumBps: 1_000, reservedMinutes: 30 },
  peage: { tollBps: 300 },
  levant: { memberQuotaBps: 5_000, othersCutBps: 2_500 },
  calmiere: { capBps: 11_500 },
  franchise: { upkeepDiscountBps: 2_000 },
};

/** Overrides of `testSettings` for a world with the families and their campaign. */
export const campaignSettings: Partial<WorldSettingsInput> = {
  families: testFamilies,
  campaign: testCampaign,
  decrees: testDecrees,
};

/** The house between seasons: Influence earned each week, and the second counter's patent. */
export const testHouse = {
  influence: {
    commerce: { ducatsPerPoint: 10, weeklyCap: 12 },
    campaign: { meritPerPoint: 10, winBonus: 5, weeklyCap: 15 },
    season: { doge: 50, podium: 30, top10: 20, elite: 15, notable: 10, participant: 5 },
  },
  patents: { second_counter: { cost: 40, requires: [] as string[] } },
};
