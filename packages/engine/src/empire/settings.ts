import { z } from "zod";

/**
 * The persistent empire's parameters (CADRAGE-v3, docs/refonte-2026-10-29/profondeur.md), an
 * optional section of a world's settings: the worlds of the monthly seasons do without it. Money in
 * deniers (JSON integers, bigint on parse), rates in basis points, durations in minutes.
 */

const money = z
  .number()
  .int()
  .nonnegative()
  .transform((n) => BigInt(n));
const qty = z.number().int().nonnegative();
const bps = z.number().int().nonnegative();
const positive = z.number().int().positive();

/** One level of the Casa: what it costs, how long it takes, what it opens. */
const casaLevel = z.object({
  costDucats: money,
  materials: z.record(z.string(), qty).prefault({}),
  buildMinutes: qty,
  /** Workshop places in Venetia at this level. */
  workshopSlots: positive,
  /** Building sites worked at once (the maestranze). */
  buildSlots: positive,
  /** Researches run at once. */
  researchSlots: qty,
  /** What the level opens, by code (regions, systems, vehicles). */
  opens: z.array(z.string()).prefault([]),
  /**
   * What the empire must have built to start this level: so many workshops at a level (the master
   * level asks the rest to follow, as Hades' Star's). None by default.
   */
  requires: z.object({ workshops: qty, level: qty }).prefault({ workshops: 0, level: 0 }),
});

const region = z.object({
  code: z.string(),
  /** Casa level that lets its charter be bought. */
  casa: positive,
  /** The charter's price, in Favour. */
  charterFavour: qty,
  /** Hours of travel from Venice for a ship of base speed (Venice is 0); routes pass by Venice. */
  hoursFromVenice: qty,
  /** Workshop places a counter gives in the region. */
  workshopSlots: qty,
  /** Goods made or found cheaply there: their local reference price, in deniers a unit. */
  produces: z.record(z.string(), money).prefault({}),
  /** Goods wanted there: their local reference price, in deniers a unit. */
  demands: z.record(z.string(), money).prefault({}),
  /** Units of orders a day the region's cities give each counter there (its private book). */
  localOrdersPerCounter: qty,
  /** The corsairs' risk on the way there, per voyage (0: none, as in Venetia). */
  corsairRiskBps: bps.max(10_000),
});

const moduleDef = z.object({
  code: z.string(),
  kind: z.enum(["trade", "extract", "arms", "workshop"]),
  /** What it changes, read by the model: capacity, speed, price, risk, yield, strength… */
  effect: z.string(),
  /** Its effect at level 1, then each level after. */
  firstLevelBps: bps,
  perLevelBps: bps,
});

export const empireSettingsSchema = z.object({
  casa: z.array(casaLevel).min(1),
  /** What a new house is given: its capital, and its first workshops (a building of the theme and its recipe). */
  start: z
    .object({
      capitalDucats: qty,
      workshops: z.array(z.object({ type: z.string(), recipe: z.string() })),
    })
    .prefault({ capitalDucats: 0, workshops: [] }),
  /** The night queue: a workshop is relaunched for this many hours at most, for everyone. */
  queueHours: positive.prefault(12),
  /**
   * The markets of a region (calibrated at the 24-month simulator): the Dogana buys up to its depth
   * a day (a base, and so much a house awake), the cities' common board holds so many units a day
   * a house awake, of which the large houses reach only a share; the orders pay a premium.
   */
  markets: z
    .object({
      depthBase: qty,
      depthPerHouse: qty,
      boardPerHouse: qty,
      smallShareBps: bps.max(10_000),
      smallCasa: qty,
      orderPremiumBps: bps,
      taxBps: bps.max(10_000),
    })
    .prefault({
      depthBase: 20,
      depthPerHouse: 3,
      boardPerHouse: 5,
      smallShareBps: 5_000,
      smallCasa: 10,
      orderPremiumBps: 1_000,
      taxBps: 300,
    }),
  /** Days without an action after which a house falls asleep (CADRAGE-v3 § 6). */
  sleepAfterDays: positive.prefault(14),
  workshops: z.object({
    /** k of Y(n) = n × (1 + k × (n − 1)), in bps (1 500 = 0,15). */
    yieldStepBps: bps,
    /** g of W(n) = base × g^(n − 1), in bps (13 000 = ×1,3). */
    costGrowthBps: positive,
    baseCostDucats: money,
    /** Building minutes of a workshop's level n (index n − 1). */
    buildMinutes: z.array(qty).min(1),
    /** A workshop's level never passes the Casa's, nor this. */
    maxLevel: positive,
  }),
  counters: z
    .object({
      maxLevel: positive,
      /** Each level past the first adds this share of the region's private book. */
      bookStepBps: bps,
    })
    .prefault({ maxLevel: 10, bookStepBps: 10_000 }),
  /** The young houses' raw goods sell this much dearer, up to a Casa (CADRAGE-v3 § 6). */
  newcomers: z
    .object({ rawBonusBps: bps, untilCasa: qty })
    .prefault({ rawBonusBps: 0, untilCasa: 0 }),
  /**
   * From a workshop level, each unit made also eats Venetia's raw goods (CADRAGE-v3 § 12 bis):
   * this share of a unit per level from the threshold. The veterans buy what the young make.
   */
  highRecipes: z
    .object({ fromLevel: positive, rawPerLevelBps: bps, goods: z.array(z.string()) })
    .prefault({ fromLevel: 1, rawPerLevelBps: 0, goods: [] }),
  salaries: z.object({
    /** The share of receipts paid in wages by the smallest house, then the largest. */
    minBps: bps.max(10_000),
    maxBps: bps.max(10_000),
    /** The Power at which the share is halfway between the two. */
    halfPower: positive,
  }),
  power: z.object({
    casa: qty,
    workshopLevel: qty,
    counterLevel: qty,
    moduleLevel: qty,
    staffLevel: qty,
    vehicle: qty,
    /** The bands' lower bounds, in increasing order (the first is 0). */
    bands: z.array(qty).min(1),
  }),
  catchup: z.object({
    /** From this share of the active houses owning a level, it gets cheaper and quicker. */
    fromShareBps: bps.max(10_000),
    maxCostCutBps: bps.max(10_000),
    maxTimeCutBps: bps.max(10_000),
  }),
  prices: z.object({
    floorBps: bps,
    ceilBps: bps,
    /** How far a trade of a market's daily depth moves its price, in bps. */
    impactBps: bps,
    /** Hours for a market's pressure to come halfway back to its reference. */
    halfLifeHours: positive,
  }),
  regions: z.array(region).min(1),
  modules: z.array(moduleDef).prefault([]),
  research: z.object({
    baseCostDucats: money,
    costGrowthBps: positive,
    /** Minutes of research of a module's level n (index n − 1). */
    minutes: z.array(qty).min(1),
    /** From this level on, a level also asks plans (from relics). */
    plansFromLevel: positive,
    plansPerLevel: qty,
  }),
  deposits: z.object({
    /** Chance a day that a deposit appears in a region open to some house, in bps. */
    spawnBpsPerRegionDay: bps,
    minStock: positive,
    maxStock: positive,
    /** Units an hour a team of base level takes. */
    teamPerHour: positive,
  }),
  expeditions: z.object({
    /** Per tier (index tier − 1): the fleet strength it asks, and the relics it gives on success. */
    tiers: z.array(z.object({ strength: positive, relics: positive })).min(1),
    /** Success at exactly the asked strength; more strength adds, less takes away. */
    baseSuccessBps: bps.max(10_000),
  }),
  corsairs: z.object({
    /** The share of a cargo an attack takes, before the escort. */
    lossShareBps: bps.max(10_000),
    /** An escort of this strength halves the risk; each as much again halves it again. */
    escortHalving: positive,
  }),
  /**
   * The Muda's galleys sail in convoy, twice a week; their places are auctioned (the incanto,
   * CADRAGE-v3 § 12 bis): places in proportion to the houses owning such a galley, a reserve in
   * days of the bidders' median income, and the price paid destroyed.
   */
  muda: z
    .object({
      vehicles: z.array(z.string()),
      departuresPerWeek: positive,
      placesShareBps: bps,
      reserveDaysBps: bps,
    })
    .prefault({ vehicles: [], departuresPerWeek: 2, placesShareBps: 10_000, reserveDaysBps: 0 }),
  colleganza: z.object({
    /** The traveller's share of the profit (the custom: a quarter). */
    travellerShareBps: bps.max(10_000),
  }),
});

export type EmpireSettingsInput = z.input<typeof empireSettingsSchema>;
export type EmpireSettings = z.output<typeof empireSettingsSchema>;
export type RegionSettings = EmpireSettings["regions"][number];
export type ModuleSettings = EmpireSettings["modules"][number];

export function parseEmpireSettings(input: unknown): EmpireSettings {
  return empireSettingsSchema.parse(input);
}
