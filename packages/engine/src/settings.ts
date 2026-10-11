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

const signedBps = z.number().int().min(-10_000);

/** A market event: for a while, cities pay more (or buy more) and some yields change. */
const eventDef = z.object({
  code: z.string(),
  weight: positive,
  /** Only this city is affected (all cities when absent). */
  city: z.string().optional(),
  cityPriceBps: z.record(bps).default({}),
  cityCapacityBps: z.record(bps).default({}),
  /** Added to the yield of a resource while the event lasts (may be negative). */
  yieldBps: z.record(signedBps).default({}),
});

/** A sea route: cargo leaves, exotic goods come back, unless pirates strike. */
const destinationDef = z.object({
  hours: positive,
  charter: money,
  escort: money,
  provisions: z.record(qty).default({}),
  riskBps: bps.max(10_000),
  escortRiskBps: bps.max(10_000),
  /** Exotic resource brought back. */
  returns: z.string(),
  /** Value brought back = cargo value at reference prices × (1 + gain). */
  gainBps: bps,
  maxCargoValue: money,
  /** What the port pays for our goods, above (or below) the reference price. */
  wants: z.record(signedBps).default({}),
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
  /** First minutes of play: a few one-batch jobs finish in seconds, so the tutorial can flow. */
  tutorial: z
    .object({ minutes: qty, fastBatchSeconds: positive, fastBatchesPerBuilding: qty })
    .default({ minutes: 0, fastBatchSeconds: 30, fastBatchesPerBuilding: 0 }),
  /** Goods given to a new player, by region (resource → quantity). */
  startingStock: z.record(z.record(qty)).default({}),
  /** Workers eat: each building level consumes rations every day; without, production slows. */
  rations: z
    .object({ resource: z.string(), perLevelPerDay: qty, slowdownBps: bps })
    .default({ resource: "bread", perLevelPerDay: 0, slowdownBps: 0 }),
  /** Daily orders from the Doge, per player: deliver goods to a city at a premium. */
  contracts: z
    .object({
      perDay: qty,
      premiumBps: bps,
      quantities: z.record(qty),
      /** Some orders ask for goods from overseas instead (never needed for building). */
      luxury: z
        .object({ chanceBps: bps.max(10_000), quantities: z.record(qty) })
        .default({ chanceBps: 0, quantities: {} }),
    })
    .default({ perDay: 0, premiumBps: 0, quantities: {} }),
  events: z
    .object({ everyDays: positive, durationHours: positive, catalog: z.array(eventDef) })
    .default({ everyDays: 2, durationHours: 24, catalog: [] }),
  expeditions: z
    .object({
      maxActive: positive,
      /** Port prices move each week by up to this much, drawn from the world's secret seed. */
      weeklySwingBps: bps.default(0),
      destinations: z.record(destinationDef),
    })
    .default({ maxActive: 1, weeklySwingBps: 0, destinations: {} }),
  /** Computer-run merchants keep the world at this many active merchants while players are few. */
  bots: z.object({ population: qty }).default({ population: 0 }),
  /**
   * Buildings that may only be built (or upgraded) in some regions: raw materials are local.
   * Building type → regions. Absent: anywhere.
   */
  buildingRegions: z.record(z.array(z.string())).default({}),
  /** Yield bonus per building level above the first: specialising pays. */
  levelYieldBonusBps: bps.default(0),
  /** Ships built at the arsenal: they carry convoys and escort them. */
  ships: z
    .object({
      maxPerPlayer: qty,
      /** Port dues for a convoy on one's own ships, as a share of the route's charter. */
      portDuesBps: bps.default(0),
      types: z.record(
        z.object({
          costDucats: money,
          costMaterials: z.record(qty).default({}),
          /** Most cargo the ship carries as the merchant ship, at reference prices. */
          holdValue: money,
          /** Voyage duration factor: below 10 000 is faster. */
          speedBps: positive,
          defense: positive,
          upkeepPerDay: money,
          repairCost: money,
          repairHours: positive,
        }),
      ),
    })
    .default({ maxPerPlayer: 0, portDuesBps: 0, types: {} }),
  /** Letters of marque: privateers hunt other players' convoys on a route. */
  privateers: z
    .object({
      /** Privateer cruises per player at once; 0 turns the feature off. */
      maxActive: qty,
      letterFee: money,
      hours: positive,
      /** Per ship. */
      provisions: z.record(qty).default({}),
      /** Share of each cargo line taken by a successful boarding. */
      shareBps: bps.max(10_000),
      minChanceBps: bps.max(10_000),
      maxChanceBps: bps.max(10_000),
      /** New merchants cannot be boarded for this many days. */
      newcomerDays: qty,
      /** Only merchants worth at least this share of the corsair's net worth are hunted. */
      minTargetWorthBps: bps,
      /** After a successful boarding, the victim is left alone this long. */
      cooldownHours: qty,
    })
    .default({
      maxActive: 0,
      letterFee: 0,
      hours: 12,
      provisions: {},
      shareBps: 0,
      minChanceBps: 0,
      maxChanceBps: 0,
      newcomerDays: 0,
      minTargetWorthBps: 0,
      cooldownHours: 0,
    }),
  /**
   * A counting house left alone this long is dormant: it pays a share of its upkeep and its
   * workers do not go hungry, so a returning player finds it intact. 0 turns it off.
   */
  dormancy: z
    .object({ afterHours: qty, upkeepBps: bps.max(10_000) })
    .default({ afterHours: 0, upkeepBps: 10_000 }),
  /** The merchant's ledger: short goals opening day after day, with a small reward. */
  missions: z
    .array(
      z.object({
        id: z.string(),
        /** Days after joining when it opens. */
        day: qty,
        /** Engine event that counts towards it, optionally only with these data values. */
        event: z.string(),
        filter: z.record(z.union([z.string(), z.number()])).default({}),
        count: positive,
        reward: z.object({ goods: z.record(qty).default({}), ducats: money.default(0) }),
      }),
    )
    .default([]),
  /**
   * Fresh produce: batches collected within `minutes` of being done yield `bonusBps` more.
   * Rewards coming back on time, never punishes the absent. 0 minutes turns it off.
   */
  fresh: z.object({ minutes: qty, bonusBps: bps }).default({ minutes: 0, bonusBps: 0 }),
  /**
   * The Criées of the Rialto: a few times a day, at hours drawn in advance but never shown before,
   * a city buys one resource at a premium for a few minutes, up to a share per merchant and a
   * total that grows with the number of active merchants. 0 per day turns them off.
   */
  criees: z
    .object({
      perDay: qty,
      /** Window of the day (hours after the season's daily boundary) when they may start. */
      fromHour: qty,
      toHour: qty,
      minutes: positive,
      minPremiumBps: bps,
      maxPremiumBps: bps,
      perPlayer: qty,
      perActivePlayer: qty,
      minTotal: qty,
      resources: z.array(z.string()),
    })
    .default({
      perDay: 0,
      fromHour: 0,
      toHour: 24,
      minutes: 20,
      minPremiumBps: 0,
      maxPremiumBps: 0,
      perPlayer: 0,
      perActivePlayer: 0,
      minTotal: 0,
      resources: [],
    }),
  /**
   * Tasks of the day: `perDay` drawn from the pool every day (the same for everyone), each with a
   * small reward; doing them all opens the day's chest, larger for each day in a row (up to
   * `maxStreak`). 0 per day turns them off.
   */
  daily: z
    .object({
      perDay: qty,
      tasks: z.array(
        z.object({
          id: z.string(),
          event: z.string(),
          filter: z.record(z.union([z.string(), z.number()])).default({}),
          count: positive,
          reward: z.object({ goods: z.record(qty).default({}), ducats: money.default(0) }),
        }),
      ),
      chest: z.object({ ducats: money, perStreakDay: money, maxStreak: positive }),
    })
    .default({ perDay: 0, tasks: [], chest: { ducats: 0, perStreakDay: 0, maxStreak: 1 } }),
  /**
   * Pass Négociant: light advantages that only help a merchant who plays. Never ducats, goods,
   * production speed or a longer queue. All zero turns it off.
   */
  pass: z
    .object({
      /** Extra share of the daily quota at the Dogana (2 000 = a fifth more). */
      marketMakerQuotaBps: bps,
      extraOpenOrders: qty,
      /** Fresh produce bonus for Pass holders (instead of the usual one). */
      freshBonusBps: bps,
      contractRerollsPerDay: qty,
    })
    .default({
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
      freshBonusBps: 0,
      contractRerollsPerDay: 0,
    }),
  /** How many times a player may restart from scratch during a season. */
  maxResetsPerPlayer: qty.default(1),
  maxBuildings: positive,
  maxBuildingLevel: positive,
  levelCostGrowthBps: bps,
  /** Extra upkeep per level above 1: a level-L building costs base × L × (1 + (L − 1) × growth). */
  upkeepLevelGrowthBps: bps.default(0),
  upkeepDefaultHours: positive,
  /** A player counts as active if they acted within this many hours. */
  activeWindowHours: positive,
  buildings: z.record(buildingSettings),
  referencePrices: z.record(money),
  marketMaker: z.object({
    spreadStartBps: bps,
    spreadEndBps: bps,
    spreadRampDays: positive,
    /** The quoted reference follows the market down (never up), to this fraction at most. */
    referenceFloorBps: bps.max(10_000),
    /** Daily quantity per resource and per active player, in each direction. */
    dailyDepthPerPlayer: z.record(qty),
    /** Floor of the daily quantity, so that a small world (beta) still has a market. */
    minDailyDepth: z.record(qty).default({}),
    /**
     * Units each player may buy from the market maker per resource and per day, so that nobody
     * can empty it for the others. Its daily stock grows to this × active players.
     * No entry: no quota per player.
     */
    playerDailyQuota: z.record(qty).default({}),
    /** Same, for selling to the market maker (which creates money: kept tighter). */
    playerDailySellQuota: z.record(qty).default({}),
    /**
     * Most the market maker trades per resource and per day, all players together: as the world
     * fills up, each player's quota shrinks to their share of it (never below 1).
     */
    maxDailyDepth: z.record(qty).default({}),
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
