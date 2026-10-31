import { z } from "zod";
import { portaSettingsSchema } from "./porta/settings.js";

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
      /** Its first vehicles, by type. */
      vehicles: z.array(z.string()).prefault([]),
    })
    .prefault({ capitalDucats: 0, workshops: [], vehicles: [] }),
  /**
   * The vehicles (CADRAGE-v3 § 3.3): the Casa that opens each, its hold, its price in ducats, the
   * regions it goes between (one only: a land vehicle of the deliveries), its speed in bps.
   */
  vehicles: z
    .record(
      z.string(),
      z.object({
        casa: positive,
        capacity: positive,
        costDucats: qty,
        regions: z.array(z.string()).min(1),
        speedBps: bps,
        /** A ship: built at the private Arsenal (its site's minutes and materials), not bought. */
        build: z
          .object({ minutes: positive, materials: z.record(z.string(), qty).prefault({}) })
          .optional(),
        /** Its places for trade modules: on a ship, they count only where they are fitted. */
        slots: qty.prefault(0),
      }),
    )
    .prefault({}),
  /**
   * A model's level (decision of the owner, 31 October 2026): up to `max`, each level beyond the
   * first holds `stepBps` more for every vehicle of the model, and costs the model's price (at
   * least `minCostDucats`) times `costTimes`, doubled at each level.
   */
  vehicleLevels: z
    .object({
      max: positive.prefault(5),
      stepBps: bps.prefault(1_000),
      /** A ship's step, when it differs (a ship's hold weighs on every port: 31 October). */
      shipStepBps: bps.optional(),
      costTimes: positive.prefault(1),
      /** The price a level is reckoned from, at the least: a cheap model is not raised for nothing. */
      minCostDucats: qty.prefault(0),
    })
    .prefault({}),
  /** A land vehicle's round trips a day for the cities' orders. */
  localTripsPerDay: positive.prefault(4),
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
  /**
   * The Carnet of the week (CADRAGE-v3 § 4.2): objectives drawn each Monday, filled any day of the
   * week; some of last week's to catch up; Favour for each, a Seal for a full carnet, never
   * ducats nor yield. After a long absence, a following wind doubles the Favour for a few days.
   */
  carnet: z
    .object({
      objectives: positive,
      carryOver: qty,
      favourPerObjective: qty,
      sealForFull: qty,
      windAfterDays: positive,
      windDays: qty,
    })
    .prefault({
      objectives: 11,
      carryOver: 2,
      favourPerObjective: 10,
      sealForFull: 1,
      windAfterDays: 7,
      windDays: 3,
    }),
  /**
   * The qualities (profondeur.md § G): the share of a workshop's lots made better is its quality
   * effect, a share of those exquisite; only the court of Venice buys them, dearer, within its book
   * of the day (so many units a level of the Casa).
   */
  qualities: z
    .object({
      fineBps: bps,
      exquisiteBps: bps,
      exquisiteShareBps: bps.max(10_000),
      courtPerCasa: qty,
    })
    .prefault({ fineBps: 15_000, exquisiteBps: 30_000, exquisiteShareBps: 2_500, courtPerCasa: 5 }),
  /**
   * The Arti (CADRAGE-v3 § 3.5): one chosen from a Casa, its chain's workshops (by building)
   * yielding more and passing the Casa's level at its top, up to its own; another, minor, later,
   * yielding less. Changing costs a renunciation: the old chain falls back to a level. An Arte may
   * also carry effects of its own (the Banchieri, no chain).
   */
  arte: z
    .object({
      fromCasa: positive,
      minorFromCasa: positive,
      chainYieldBps: bps,
      minorYieldBps: bps,
      topLevel: positive,
      renounceLevel: positive,
      artes: z.array(
        z.object({
          code: z.string(),
          buildings: z.array(z.string()),
          effects: z.record(z.string(), z.number().int()).prefault({}),
        }),
      ),
    })
    .prefault({
      fromCasa: 7,
      minorFromCasa: 13,
      chainYieldBps: 1_000,
      minorYieldBps: 500,
      topLevel: 25,
      renounceLevel: 15,
      artes: [],
    }),
  /**
   * The knowledge (CADRAGE-v3 § 3.5): branches of knowledges learnt in order, each ending in a
   * choice between two capstones, for good; learnt at the Scuola, its own places (by Casa), its cost
   * and time growing with the depth in the branch. The whole tree takes years: one chooses.
   */
  knowledge: z
    .object({
      baseCostDucats: qty,
      costGrowthBps: positive,
      /** Minutes of a knowledge by its depth in the branch (index depth − 1). */
      minutes: z.array(qty).min(1),
      /** The Casa levels that open a place of learning each. */
      slotsAt: z.array(positive),
      branches: z.array(
        z.object({
          code: z.string(),
          nodes: z.array(
            z.object({ code: z.string(), effects: z.record(z.string(), z.number().int()) }),
          ),
          capstones: z.array(
            z.object({ code: z.string(), effects: z.record(z.string(), z.number().int()) }),
          ),
        }),
      ),
    })
    .prefault({
      baseCostDucats: 0,
      costGrowthBps: 10_000,
      minutes: [0],
      slotsAt: [],
      branches: [],
    }),
  /**
   * The staff (CADRAGE-v3 § 3 quinquies): hired for ducats, dearer each time, within the Casa's
   * places; placed where it works (a workshop, a region, a vehicle); growing with its work, a level
   * by so much experience; at each tier a path chosen for good. Its rarity multiplies all it gives.
   * Never sold.
   */
  staff: z
    .object({
      hireCostDucats: qty,
      hireGrowthBps: positive,
      slotsBase: qty,
      casaPerSlot: positive,
      xpPerLevel: positive,
      maxLevel: positive,
      tierEvery: positive,
      rarityBps: z.record(z.string(), positive),
      roles: z.record(
        z.string(),
        z.object({
          place: z.enum(["workshop", "region", "vehicle"]),
          perLevel: z.record(z.string(), z.number().int()),
          paths: z.array(z.record(z.string(), z.number().int())),
        }),
      ),
    })
    .prefault({
      hireCostDucats: 200,
      hireGrowthBps: 15_000,
      slotsBase: 1,
      casaPerSlot: 4,
      xpPerLevel: 50,
      maxLevel: 30,
      tierEvery: 5,
      rarityBps: { common: 10_000, rare: 15_000, illustrious: 20_000 },
      roles: {},
    }),
  /**
   * The family (CADRAGE-v3 § 3.5): a generation each calendar quarter, in Venice's time; each brings
   * a member of the family to the staff (the roles in turn, of a rarity) and a point of Heritage,
   * which opens a lineage trait for good: it adds, never takes away.
   */
  family: z
    .object({
      roles: z.array(z.string()),
      rarity: z.string(),
      traits: z.array(
        z.object({ code: z.string(), effects: z.record(z.string(), z.number().int()) }),
      ),
    })
    .prefault({ roles: [], rarity: "rare", traits: [] }),
  /**
   * The company (CADRAGE-v3 § 7): up to `max` partners, `rejoinDays` before changing, a Capo
   * absent `capoAbsentDays` gives way, two to four Consiglieri. Vocations, never a bonus.
   */
  company: z
    .object({
      max: positive,
      rejoinDays: positive,
      capoAbsentDays: positive,
      consiglieriMax: positive,
    })
    .prefault({ max: 25, rejoinDays: 3, capoAbsentDays: 7, consiglieriMax: 4 }),
  /**
   * The entraide (CADRAGE-v3 § 7): a partner asks a lot every `everyHours`, up to `lotPerCasa`
   * units a Casa; another supplies it at Venice's reference price, no tax, after `minDays` in the
   * company, up to `dailyDucatsPerCasa` a day; Merit for the supplier. A request lapses after
   * `expireHours`.
   */
  aid: z
    .object({
      everyHours: positive,
      lotPerCasa: positive,
      minDays: qty,
      dailyDucatsPerCasa: positive,
      expireHours: positive,
      meritPer100Ducats: qty,
    })
    .prefault({
      everyHours: 8,
      lotPerCasa: 20,
      minDays: 3,
      dailyDucatsPerCasa: 300,
      expireHours: 24,
      meritPer100Ducats: 10,
    }),
  /**
   * The Condotta of the empire (CADRAGE-v3 § 7): its tier n opens from the Casa n + `casaOffset`
   * (and by the win of the tier before); a won match a day pays `sealsByTier[n − 1]` Seals.
   */
  condotta: z
    .object({ casaOffset: qty, sealsByTier: z.array(qty).min(1) })
    .prefault({ casaOffset: 2, sealsByTier: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3] }),
  /**
   * The Terraferma of the empire (CADRAGE-v3 § 8): a week from Monday, in theatres of at most
   * `theatreMax` merchants of a band; the entry paid in goods (planks, which a house makes from
   * its first day: the war eats the bread and the bricks itself, in rations and buildings); the Republic's ration of bread, the
   * same for all, each day; Favour and Seals by rank, `sealsPerWeek` at most. Even weeks, the
   * Contesa: rosters of a company set down by Thursday (`deadlineDay` from Monday), 2 to
   * `maxCompanies` a theatre by their summed Power. Never ducats, never yield.
   */
  terra: z
    .object({
      entry: z.record(z.string(), qty),
      theatreMax: positive,
      rationBread: qty,
      favour: z.object({
        signore: qty,
        podium: qty,
        top10: qty,
        quarter: qty,
        participant: qty,
      }),
      seals: z.object({ signore: qty, podium: qty }),
      sealsPerWeek: qty,
      contesa: z.object({
        rosterSizes: z.array(positive).min(1),
        deadlineDay: qty.max(6),
        maxCompanies: positive,
        sealsPerMember: qty,
        winnerSeals: qty,
        aloneBps: bps.max(10_000),
        lustre: qty,
      }),
    })
    .prefault({
      entry: { planks: 20 },
      theatreMax: 40,
      rationBread: 20,
      favour: { signore: 60, podium: 30, top10: 15, quarter: 8, participant: 4 },
      seals: { signore: 2, podium: 1 },
      sealsPerWeek: 2,
      contesa: {
        rosterSizes: [5, 10, 15],
        deadlineDay: 3,
        maxCompanies: 4,
        sealsPerMember: 1,
        winnerSeals: 1,
        aloneBps: 5_000,
        lustre: 10,
      },
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
    /** Two workshops side by side whose chain follows: each makes this share more (§ G). */
    neighbourBps: bps.prefault(0),
    /** The levels that open a workshop's places for modules (profondeur.md § G): 1, 8, 15. */
    moduleSlotsAt: z.array(positive).prefault([1, 8, 15]),
  }),
  counters: z
    .object({
      maxLevel: positive,
      /** Each level past the first adds this share of the region's private book. */
      bookStepBps: bps,
      /**
       * A counter costs so many times a workshop of the level it stands for: its region's Casa
       * for the first, the next level for the others (calibrated at the 24-month simulator).
       */
      costTimes: positive.prefault(4),
    })
    .prefault({ maxLevel: 10, bookStepBps: 10_000, costTimes: 4 }),
  /**
   * The map at the centre of the game (step 2): the land cells of a hex grid (« q,r », axial),
   * each with its region and whether the sea touches it; the cities hidden in them; how far a
   * counter put down reveals, how much dearer each one makes the next; the Arsenal, put on a
   * coast. Without cells, the regions open as before, and their books are whole.
   */
  map: z
    .object({
      cells: z
        .record(z.string(), z.object({ region: z.string(), coast: z.boolean().prefault(false) }))
        .prefault({}),
      cities: z
        .array(
          z.object({
            code: z.string(),
            cell: z.string(),
            region: z.string(),
            /** Its place on the chart, in its units: its cell's centre when absent. */
            x: z.number().int().optional(),
            y: z.number().int().optional(),
            /** Its weight in its region's book, against its region's other cities. */
            weight: positive.prefault(1),
          }),
        )
        .prefault([]),
      /** The hexes' size across their corners, in the chart's units (pointy-top, axial cells). */
      hexSize: positive.prefault(24),
      /**
       * A counter's reach (the map that grows, 31 October 2026): the cities within `base` units,
       * and `perLevel` more a level beyond the first, are served by it. None: every city found is.
       */
      reach: z.object({ base: positive, perLevel: qty }).nullable().prefault(null),
      /** No counter closer than this to another, in the chart's units. */
      postSpacing: qty.prefault(0),
      /** A land vehicle between two counters: so many of the chart's units an hour. */
      transferUnitsPerHour: positive.prefault(20),
      revealRadius: positive.prefault(2),
      /** The drawing of the grid: a house of another drawing is taken up again on it. */
      version: positive.prefault(1),
      /** Each counter already put down makes the next this much dearer. */
      costStepBps: bps.prefault(2_500),
      arsenal: z
        .object({ costDucats: qty, casa: positive, minutes: qty })
        .nullable()
        .prefault(null),
      /** The Campo, on a land cell: the door of the Terraferma (decision of 31 October 2026). */
      camp: z.object({ costDucats: qty, casa: positive, minutes: qty }).nullable().prefault(null),
      /** The Remise, on a land cell: where the land vehicles are bought and their models raised. */
      depot: z.object({ costDucats: qty, casa: positive, minutes: qty }).nullable().prefault(null),
    })
    .prefault({}),
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
    /** The modules a house may research in this world (their systems exist); none listed: all. */
    available: z.array(z.string()).prefault([]),
  }),
  deposits: z.object({
    /** Chance a day that a deposit appears in a region open to some house, in bps. */
    spawnBpsPerRegionDay: bps,
    minStock: positive,
    maxStock: positive,
    /** Units an hour a team of base level takes. */
    teamPerHour: positive,
    /** A region gets its daily chance once per so many houses present there (one at least). */
    housesPerDeposit: positive.prefault(10),
    /** The Casa of the first team, and a team more every so many levels. */
    teamsFromCasa: positive.prefault(5),
    casaPerTeam: positive.prefault(4),
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
    /** The insurance's premium: the risk times the cargo's value times this (12 000: × 1,2). */
    premiumBps: bps.prefault(12_000),
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
      /** The departures, by day from Monday (0) and hour in Venice: Tuesday and Friday at 18. */
      departures: z
        .array(z.object({ day: qty.max(6), hour: qty.max(23) }))
        .min(1)
        .prefault([
          { day: 1, hour: 18 },
          { day: 4, hour: 18 },
        ]),
      /** A place won lets its galley leave this long after the departure (it sails at its hour). */
      passHours: positive.prefault(24),
    })
    .prefault({ vehicles: [], departuresPerWeek: 2, placesShareBps: 10_000, reserveDaysBps: 0 }),
  colleganza: z.object({
    /** The traveller's share of the profit (the custom: a quarter). */
    travellerShareBps: bps.max(10_000),
  }),
  /** The Porta, the battles in the lands of Rome (docs/plan-porta.md). */
  porta: portaSettingsSchema,
});

export type EmpireSettingsInput = z.input<typeof empireSettingsSchema>;
export type EmpireSettings = z.output<typeof empireSettingsSchema>;
export type RegionSettings = EmpireSettings["regions"][number];
export type ModuleSettings = EmpireSettings["modules"][number];

export function parseEmpireSettings(input: unknown): EmpireSettings {
  return empireSettingsSchema.parse(input);
}
