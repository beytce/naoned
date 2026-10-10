import { z } from "zod";

/**
 * Balancing parameters of a world, stored in `worlds.settings` (JSON).
 * Money is written in deniers as JSON integers and converted to bigint on parse; rates are in bps.
 */

const money = z
  .number()
  .int()
  .nonnegative()
  .transform((n) => BigInt(n));
const qty = z.number().int().nonnegative();
const bps = z.number().int().nonnegative();
const positive = z.number().int().positive();

const buildingSettings = z.object({
  costDucats: money,
  costMaterials: z.record(qty).default({}),
  upkeepPerDay: money,
});

const cityDemand = z.object({
  basePrice: money,
  /** Daily capacity per active player, so demand follows the size of the world. */
  dailyCapacityPerPlayer: positive,
  maxDropBps: bps.max(10_000),
});

export const worldSettingsSchema = z.object({
  seasonDays: positive,
  registrationClosesDay: positive,
  startingCapital: money,
  startingBuildings: z.record(z.array(z.string())),
  marketTaxBps: bps,
  orderMaxHours: positive,
  maxOpenOrders: positive,
  instantOrderSlippageBps: bps,
  productionQueueMaxHours: positive,
  regionBonusBps: bps,
  lateJoiner: z.object({ afterDay: qty, bonusBps: bps, hours: positive }),
  maxBuildings: positive,
  maxBuildingLevel: positive,
  levelCostGrowthBps: bps,
  upkeepDefaultHours: positive,
  /** A player counts as active if they acted within this many hours. */
  activeWindowHours: positive,
  buildings: z.record(buildingSettings),
  referencePrices: z.record(money),
  marketMaker: z.object({
    spreadStartBps: bps,
    spreadEndBps: bps,
    spreadRampDays: positive,
    /** Daily quantity per resource and per active player, in each direction. */
    dailyDepthPerPlayer: z.record(qty),
  }),
  cities: z.record(z.record(cityDemand)),
  projects: z.object({
    intervalDays: positive,
    durationDays: positive,
    needsPerPlayer: z.record(qty),
    premiumBps: bps,
  }),
  valuation: z.object({
    vwapDays: positive,
    minVolume: qty,
    buildingValueBps: bps,
  }),
});

export type WorldSettingsInput = z.input<typeof worldSettingsSchema>;
export type WorldSettings = z.output<typeof worldSettingsSchema>;

export function parseSettings(input: unknown): WorldSettings {
  return worldSettingsSchema.parse(input);
}
