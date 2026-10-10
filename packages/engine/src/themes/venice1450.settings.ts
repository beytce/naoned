import type { WorldSettingsInput } from "../settings.js";

/** Default balancing for a Venice 1450 world. Amounts in deniers, rates in bps. */
export const venice1450Settings: WorldSettingsInput = {
  seasonDays: 42,
  registrationClosesDay: 28,
  startingCapital: 100_000,
  startingBuildings: {
    terraferma: ["farm", "mill", "bakery"],
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
  upkeepLevelGrowthBps: 2_000,
  upkeepDefaultHours: 24,
  activeWindowHours: 72,
  buildings: {
    farm: { costDucats: 30_000, costMaterials: { bricks: 20, planks: 20 }, upkeepPerDay: 2_000 },
    clay_pit: {
      costDucats: 30_000,
      costMaterials: { bricks: 20, planks: 20 },
      upkeepPerDay: 2_000,
    },
    lumber_camp: {
      costDucats: 30_000,
      costMaterials: { bricks: 20, planks: 20 },
      upkeepPerDay: 2_000,
    },
    mill: { costDucats: 40_000, costMaterials: { bricks: 30, planks: 30 }, upkeepPerDay: 2_500 },
    bakery: { costDucats: 60_000, costMaterials: { bricks: 40, planks: 40 }, upkeepPerDay: 3_000 },
    brickworks: {
      costDucats: 50_000,
      costMaterials: { bricks: 20, planks: 40 },
      upkeepPerDay: 2_500,
    },
    sawmill: { costDucats: 50_000, costMaterials: { bricks: 40, planks: 20 }, upkeepPerDay: 2_500 },
    // Prestige sink: produces nothing, counts at cost in the ranking.
    palazzo: { costDucats: 80_000, costMaterials: { bricks: 40, planks: 40 }, upkeepPerDay: 1_000 },
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
    dailyDepthPerPlayer: {
      wheat: 2,
      flour: 2,
      bread: 2,
      clay: 2,
      bricks: 2,
      wood: 2,
      planks: 2,
    },
  },
  cities: {
    venezia: {
      bread: { basePrice: 220, dailyCapacityPerPlayer: 50, maxDropBps: 5_000 },
      bricks: { basePrice: 260, dailyCapacityPerPlayer: 15, maxDropBps: 5_000 },
      planks: { basePrice: 260, dailyCapacityPerPlayer: 15, maxDropBps: 5_000 },
    },
    padova: {
      bread: { basePrice: 210, dailyCapacityPerPlayer: 40, maxDropBps: 5_000 },
      bricks: { basePrice: 250, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      planks: { basePrice: 250, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
    verona: {
      bread: { basePrice: 200, dailyCapacityPerPlayer: 40, maxDropBps: 5_000 },
      bricks: { basePrice: 240, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
      planks: { basePrice: 240, dailyCapacityPerPlayer: 10, maxDropBps: 5_000 },
    },
  },
  projects: {
    intervalDays: 7,
    durationDays: 7,
    needsPerPlayer: { bricks: 60, planks: 60 },
    premiumBps: 1_000,
  },
  valuation: {
    vwapDays: 7,
    minVolume: 200,
    buildingValueBps: 10_000,
  },
};
