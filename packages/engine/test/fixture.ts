import type { Theme, WorldSettingsInput } from "../src/index.js";
import { venice1450 } from "../src/index.js";

/**
 * Frozen theme and settings for engine tests, so that balancing the real worlds never changes
 * what the tests check.
 */
export const testTheme: Theme = {
  ...venice1450,
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
