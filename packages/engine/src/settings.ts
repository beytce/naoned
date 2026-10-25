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
  costMaterials: z.record(z.string(), qty).prefault({}),
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
  cityPriceBps: z.record(z.string(), bps).prefault({}),
  cityCapacityBps: z.record(z.string(), bps).prefault({}),
  /** Added to the yield of a resource while the event lasts (may be negative). */
  yieldBps: z.record(z.string(), signedBps).prefault({}),
});

export const worldSettingsSchema = z.object({
  seasonDays: positive,
  /**
   * Where the weeks of the season (weekly ranking, Terraferma, decrees) begin: every seven days
   * from the season's start, or on Mondays at midnight in Paris.
   */
  weekStart: z.enum(["season", "monday"]).prefault("season"),
  registrationClosesDay: positive,
  startingCapital: money,
  startingBuildings: z.record(z.string(), z.array(z.string())),
  marketTaxBps: bps,
  orderMaxHours: positive,
  maxOpenOrders: positive,
  instantOrderSlippageBps: bps,
  productionQueueMaxHours: positive,
  regionBonusBps: bps,
  lateJoiner: z.object({ afterDay: qty, bonusBps: bps, hours: positive }),
  /**
   * First minutes of play: a few one-batch jobs finish in seconds, so the tutorial can flow; the
   * welcome order, loaded alone, goes and comes back in `welcomeTripSeconds` each way (0: its
   * road's length).
   */
  tutorial: z
    .object({
      minutes: qty,
      fastBatchSeconds: positive,
      fastBatchesPerBuilding: qty,
      welcomeTripSeconds: qty.prefault(0),
    })
    .prefault({
      minutes: 0,
      fastBatchSeconds: 30,
      fastBatchesPerBuilding: 0,
      welcomeTripSeconds: 0,
    }),
  /** Goods given to a new player, by region (resource → quantity). */
  startingStock: z.record(z.string(), z.record(z.string(), qty)).prefault({}),
  /**
   * Workers eat: each building level consumes rations every day; without, production slows.
   * `graceHours` after joining, a newcomer's workers do not eat yet.
   */
  rations: z
    .object({
      resource: z.string(),
      perLevelPerDay: qty,
      slowdownBps: bps,
      graceHours: qty.prefault(0),
      /**
       * E1-4 of the experts: the workers eat when they work. Each batch started costs, a level,
       * so many quarters of a loaf (`transform` in a workshop with inputs, `raw` for a raw
       * material), the rounding's rest kept by the workshop. Short of bread, a new queue starts
       * slowed by `slowdownBps`: never blocked.
       */
      perBatchQuarters: z.object({ transform: qty, raw: qty }).prefault({ transform: 0, raw: 0 }),
    })
    .prefault({ resource: "bread", perLevelPerDay: 0, slowdownBps: 0, graceHours: 0 }),
  /**
   * The galleys of the Muda bring the goods from overseas to Venice every `everyDays` days at
   * `hour`: the Dogana sells a lot in proportion to active merchants, dearer as it runs out
   * (up to `priceRiseBps` more when all is gone), a few units per merchant and per arrival.
   */
  muda: z
    .object({
      everyDays: positive,
      hour: qty.max(23),
      lotPerActivePlayer: z.record(z.string(), qty),
      quotaPerPlayer: z.record(z.string(), qty),
      priceRiseBps: bps,
      maxStockLots: positive,
    })
    .optional(),
  /** Daily orders from the Doge, per player: deliver goods to a city at a premium. */
  contracts: z
    .object({
      perDay: qty,
      premiumBps: bps,
      quantities: z.record(z.string(), qty),
      /** Some orders ask for goods from overseas instead (never needed for building). */
      luxury: z
        .object({ chanceBps: bps.max(10_000), quantities: z.record(z.string(), qty) })
        .prefault({ chanceBps: 0, quantities: {} }),
    })
    .prefault({ perDay: 0, premiumBps: 0, quantities: {} }),
  events: z
    .object({ everyDays: positive, durationHours: positive, catalog: z.array(eventDef) })
    .prefault({ everyDays: 2, durationHours: 24, catalog: [] }),
  /** Computer-run merchants keep the world at this many active merchants while players are few. */
  bots: z.object({ population: qty }).prefault({ population: 0 }),
  /**
   * Buildings that may only be built (or upgraded) in some regions: raw materials are local.
   * Building type → regions. Absent: anywhere.
   */
  buildingRegions: z.record(z.string(), z.array(z.string())).prefault({}),
  /** Yield bonus per building level above the first: specialising pays. */
  levelYieldBonusBps: bps.prefault(0),
  /**
   * A counting house left alone this long is dormant: its workers do not go hungry, so a
   * returning player finds it intact. 0 turns it off.
   */
  dormancy: z.object({ afterHours: qty }).prefault({ afterHours: 0 }),
  /**
   * The guide's advice (advice.ts): a workshop with this many hours of its output unsold in stock
   * is not advised for an upgrade. 0 turns the check off.
   */
  advice: z.object({ glutHours: qty }).prefault({ glutHours: 0 }),
  /** The merchant's ledger: short goals opening day after day, with a small reward. */
  missions: z
    .array(
      z.object({
        id: z.string(),
        /** Days after joining when it opens. */
        day: qty,
        /** Engine event that counts towards it, optionally only with these data values. */
        event: z.string(),
        filter: z.record(z.string(), z.union([z.string(), z.number()])).prefault({}),
        count: positive,
        reward: z.object({
          goods: z.record(z.string(), qty).prefault({}),
          ducats: money.prefault(0),
          /** Vehicles given (within the limit), counted in net worth at cost. */
          vehicles: z.array(z.string()).prefault([]),
        }),
      }),
    )
    .prefault([]),
  /**
   * Fresh produce: batches collected within `minutes` of being done yield `bonusBps` more.
   * Rewards coming back on time, never punishes the absent. 0 minutes turns it off.
   */
  fresh: z.object({ minutes: qty, bonusBps: bps }).prefault({ minutes: 0, bonusBps: 0 }),
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
    .prefault({
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
          filter: z.record(z.string(), z.union([z.string(), z.number()])).prefault({}),
          count: positive,
          reward: z.object({
            goods: z.record(z.string(), qty).prefault({}),
            ducats: money.prefault(0),
          }),
        }),
      ),
      chest: z.object({ ducats: money, perStreakDay: money, maxStreak: positive }),
    })
    .prefault({ perDay: 0, tasks: [], chest: { ducats: 0, perStreakDay: 0, maxStreak: 1 } }),
  /**
   * Faraj's bales: a friend of Alexandria sends a sealed bale every `intervalHours`, kept up to
   * `maxStored`. Each holds `cardsPerBale` cards: a rarity drawn by weight, then one of its goods,
   * then one to five units (`quantityWeights[i]` is the weight of i + 1 units). The raw good of
   * the merchant's own region weighs `ownRegionWeightBps` of the others. Never sold, never better
   * with the Pass. 0 hours turns them off.
   */
  bales: z
    .object({
      intervalHours: qty,
      maxStored: positive,
      /** Bales waiting on joining (Lorenzo brings the first one). */
      onJoin: qty,
      cardsPerBale: positive,
      ownRegionWeightBps: bps.max(10_000),
      rarities: z.array(
        z.object({
          code: z.string(),
          weight: positive,
          resources: z.array(z.string()).min(1),
          quantityWeights: z
            .array(qty)
            .min(1)
            .max(5)
            .refine((w) => w.some((n) => n > 0), "at least one quantity"),
        }),
      ),
    })
    .prefault({
      intervalHours: 0,
      maxStored: 1,
      onJoin: 0,
      cardsPerBale: 1,
      ownRegionWeightBps: 10_000,
      rarities: [],
    }),
  /**
   * Pass Négociant: information to read and cosmetics, nothing more. Never ducats, goods,
   * production, the Dogana's quota, a longer queue, time or a swapped order (CLAUDE.md): the
   * four perks that once sold some are kept for the schema and refused unless zero.
   */
  pass: z
    .object({
      /** Off: no merchant holds the Pass, whatever was granted (it comes back later). */
      enabled: z.boolean().prefault(true),
      /** Refused unless zero: once a share of the Dogana's quota. */
      marketMakerQuotaBps: bps.prefault(0),
      /** Refused unless zero: once more open offers at the Rialto. */
      extraOpenOrders: qty.prefault(0),
      /** Refused unless zero: once fresher produce. */
      freshBonusBps: bps.prefault(0),
      /** Refused unless zero: once one of the Doge's orders swapped a day. */
      contractRerollsPerDay: qty.prefault(0),
      /**
       * What the Pass (the « Mécène ») gives: things to show, nothing else (E3-9 of the experts,
       * 25 October 2026). The information it once sold is everyone's; the keys of a world saved
       * before are dropped, and any other key is refused.
       */
      perks: z
        .preprocess(
          (v) => {
            if (!v || typeof v !== "object") return v;
            const {
              history30Days: _h,
              dashboardDetail: _d,
              deepBook: _b,
              ...rest
            } = v as Record<string, unknown>;
            return rest;
          },
          z
            .object({
              cosmetics: z.boolean().prefault(false),
              seal: z.boolean().prefault(false),
              domainOrnaments: z.boolean().prefault(false),
              goldenName: z.boolean().prefault(false),
              illustratedChronicle: z.boolean().prefault(false),
            })
            .strict(),
        )
        .prefault({}),
    })
    .refine(
      (p) =>
        p.marketMakerQuotaBps === 0 &&
        p.extraOpenOrders === 0 &&
        p.freshBonusBps === 0 &&
        p.contractRerollsPerDay === 0,
      "Pass Négociant: no perk on production, the Dogana's quota, the open offers or the orders",
    )
    .prefault({
      enabled: true,
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
      freshBonusBps: 0,
      contractRerollsPerDay: 0,
      perks: {},
    }),
  /**
   * The four great families: each merchant swears allegiance to one for the season. No family
   * listed turns them off (and the campaign with them).
   */
  families: z
    .object({
      /** Days after joining before a merchant may choose a family. */
      openDay: qty,
      /** Each family and the land it starts from (a land of the campaign, never taken). */
      list: z.array(z.object({ code: z.string(), seat: z.string() })),
      /**
       * Levy of a family's members, by its size: average active members per family ÷ its active
       * members, kept between these bounds (a small family levies more).
       */
      levyMinBps: bps,
      levyMaxBps: bps,
    })
    .prefault({ openDay: 0, list: [], levyMinBps: 10_000, levyMaxBps: 10_000 }),
  /**
   * The Terraferma after OpenFront (docs/plan-terraferme.md): a hexagonal map that grows with the
   * world, each merchant's own territory, troops that come back with the land held, fronts that
   * advance on their own a few cells an hour, Milan as a nation. Absent: no Terraferma.
   */
  terraferma: z
    .object({
      /**
       * Played in the world (its weeks, commands and decrees); off, only the simulator plays it.
       * Switched on at a season's opening, never during one.
       */
      live: z.boolean().prefault(false),
      /** Land cells per active merchant (at least `minActive` merchants counted). */
      cellsPerActive: positive,
      minActive: positive,
      /** Width over height of the map, in bps (16 000: half as wide again as high). */
      aspectBps: positive,
      /** Share of the columns, from the west, that Milan holds at the week's start. */
      milanBps: bps.max(10_000),
      /** City cells on the map, spread out: more glory and a higher cap for who holds them. */
      cities: qty,
      /**
       * The real land (coordinates of the drawn map, `art/veneto`): the frame, the waters (the sea,
       * the lagoon, the lakes) as polygons, the cities where they stand. Absent: a plain rectangle.
       */
      geography: z
        .object({
          box: z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() }),
          water: z.array(z.array(z.tuple([z.number(), z.number()])).min(3)),
          cities: z.array(z.object({ code: z.string(), x: z.number(), y: z.number() })),
        })
        .optional(),
      /** Fronts advance and troops come back only between these hours (Paris). */
      openHours: z.object({
        from: z.number().int().min(0).max(23),
        to: z.number().int().min(0).max(24),
      }),
      /** Length of a step of resolution, in minutes. */
      stepMinutes: positive,
      /**
       * Soldiers and peasants: a slider per merchant between recruits and the land's yield. Each
       * terrain grows a good, one unit per `perCells` cells an hour at half peasants; cities
       * joined to the capital by one's own land, two at least, earn `routeDucats` each an hour.
       */
      peasants: z
        .object({
          yields: z.record(z.string(), z.object({ resource: z.string(), perCells: positive })),
          routeDucats: money,
        })
        .optional(),
      /**
       * The battle hour: from `from` to `to` (Paris), the fronts march a step every
       * `stepMinutes` (troops, glory and Milan keep their pace); merchants on the map are warned
       * `warnMinutes` before.
       */
      battle: z
        .object({
          from: qty.max(24),
          to: qty.max(24),
          stepMinutes: positive,
          warnMinutes: qty.prefault(15),
        })
        .optional(),
      /** Terrains: defense multiplier, militia of a neutral cell. */
      terrains: z.record(z.string(), z.object({ defenseBps: positive, militia: qty })),
      /** Bands of rows from the north (up to `untilBps` of the height), each with its terrain weights. */
      bands: z
        .array(z.object({ untilBps: bps.max(10_000), weights: z.record(z.string(), qty) }))
        .min(1),
      /** A city cell's militia and defense, over its terrain's. */
      city: z.object({ militiaBps: positive, defenseBps: positive }),
      start: z.object({
        /** No other territory within this many cells of the chosen one. */
        minDistance: positive,
        troops: qty,
        /** More for whom comes later in the week, per day. */
        troopsPerDay: qty,
        protectionHours: qty,
        /**
         * Merchants set down only in the week's first hours (0: any time), all of them safe from
         * each other until then: the week's game is played by those who came.
         */
        placementHours: qty.prefault(0),
        /** Hours from the week's start during which nobody may attack another merchant. */
        truceHours: qty.prefault(0),
      }),
      troops: z.object({
        base: qty,
        perCell: qty,
        perCity: qty,
        /** Share of the gap to the cap that comes back each step. */
        regenBps: bps.max(10_000),
        regenMin: qty,
        /**
         * When set, troops are recruited by the hour instead (in place of `regenBps`): so many,
         * plus so many per cell and per city held, up to the cap.
         */
        recruit: z.object({ base: qty, perCell: qty, perCity: qty.prefault(0) }).optional(),
      }),
      fronts: z.object({
        max: positive,
        cellsPerStep: positive,
        minShareBps: bps.max(10_000),
        /** A front comes home after so many open hours (0: never): presence relaunches it. */
        maxHours: qty.prefault(0),
        /** A neutral cell only every so many steps: the race for free land lasts. */
        neutralEverySteps: positive.prefault(1),
        /** A merchant's capital is never taken (false: a merchant may be wiped off the map). */
        capitalSafe: z.boolean().prefault(true),
        /**
         * The capital of a merchant who has launched no front at another merchant this week is
         * never taken: who does not make war is never wiped off the map.
         */
        peacefulSafe: z.boolean().prefault(false),
      }),
      milan: z.object({
        troops: qty,
        troopsPerActive: qty,
        regenBps: bps.max(10_000),
        /** Every so many open hours, a front against a merchant it borders (or into neutral land). */
        everyHours: positive,
        shareBps: bps.max(10_000),
        /** At whom it rides: the leader in glory (a brake on the favourite) or its weakest neighbour. */
        target: z.enum(["leader", "weakest"]).prefault("leader"),
      }),
      /**
       * Skirmishes: a live match of `minutes`, its time running `speed` times as fast on the same
       * engine (a step every `stepMinutes` of its time), `players` merchants and houses of the
       * computer on a map of `cellsPerPlayer` cells each, opened after `lobbySeconds`; the ranks
       * bring `glory` (first, second…) to the week's Terraferma. Only a ranked match does: within
       * the Terraferma's open hours, with `minHumans` merchants at least, `rankedPerDay` a day for
       * each of them (the others are friendly, without glory).
       */
      skirmish: z
        .object({
          minutes: positive,
          speed: positive,
          stepMinutes: positive,
          players: positive,
          cellsPerPlayer: positive,
          lobbySeconds: positive,
          troops: positive,
          recruit: z.object({ base: qty, perCell: qty, perCity: qty }),
          glory: z.array(qty),
          rankedPerDay: qty.prefault(1),
          minHumans: positive.prefault(2),
          /**
           * The calls of the day (E2-2 of the experts), in minutes after midnight in Paris: a
           * lobby opens `callLobbyMinutes` before each and starts at its hour, so that merchants
           * meet. Outside them, the lobby of `lobbySeconds` as before.
           */
          calls: z.array(z.number().int().min(0).max(1_439)).prefault([]),
          callLobbyMinutes: positive.prefault(10),
        })
        .optional(),
      /**
       * The Condotta (E2-5 of the experts, the owner's decision of 24 October 2026): 1 to
       * `maxPlayers` allied merchants set down in the middle against `nations` of the catalogue
       * and Milan from the edges, a live match of `minutes` at `speed` on the skirmishes' engine.
       * Won holding `holdCity` (else the city nearest the middle) and `holdShareBps` of the land
       * at the end. `levels` levels: each nation (and Milan) has `nationTroops`, raised by
       * `levelStepBps` a level. It pays nothing: no ducats, no goods, no Muda, no Glory.
       */
      condotta: z
        .object({
          minutes: positive,
          speed: positive,
          stepMinutes: positive,
          maxPlayers: positive,
          cellsPerPlayer: positive,
          lobbySeconds: positive,
          troops: positive,
          recruit: z.object({ base: qty, perCell: qty, perCity: qty }),
          nations: z.object({ min: positive, max: positive }),
          nationTroops: positive,
          levels: positive,
          levelStepBps: bps,
          holdCity: z.string().optional(),
          holdShareBps: bps.max(10_000),
        })
        .optional(),
      /** Weeks of the season (from 0) played in teams: the merchants of a region together. */
      teams: z.object({ weeks: z.array(qty) }).optional(),
      /**
       * Diplomacy: quick signals on the map (one each `signalMinutes`), ducats given to allies
       * (`ducatGiftPerDay` at most), and an embargo from the cities one holds: they pay the
       * rival `embargoBps` less for its deliveries.
       */
      diplomacy: z
        .object({ ducatGiftPerDay: money, embargoBps: bps.max(10_000), signalMinutes: positive })
        .optional(),
      /**
       * The other powers of 1450, beside Milan: each holds the land within `radius` of its seat
       * (a city of the map, or a point in bps of the map), a fixed cap of troops, and rides every
       * `everyHours` open hours as its `behavior` says: `defensive` strikes back at whoever
       * attacked it, `opportunist` at a neighbour half as dense, `raider` at any neighbour,
       * `slow` only spreads into free land.
       */
      nations: z
        .array(
          z.object({
            id: z.string(),
            city: z.string().optional(),
            atBps: z.object({ x: bps.max(10_000), y: bps.max(10_000) }).optional(),
            radius: qty,
            troops: qty,
            troopsPerActive: qty,
            regenBps: bps.max(10_000),
            everyHours: positive,
            shareBps: bps.max(10_000),
            behavior: z.enum(["defensive", "opportunist", "raider", "slow"]),
          }),
        )
        .prefault([]),
      glory: z.object({ perCell: qty, perCity: qty }),
      /** Alliances between merchants: how many, how long a break takes, the traitor's lot. */
      alliances: z
        .object({
          max: qty,
          breakHours: qty,
          /** Troops a merchant may send its allies in a day, as a share of its cap. */
          giftShareBps: bps.max(10_000),
          /** Breaking more often than this in the week makes a traitor. */
          traitorBreaks: qty,
          traitorHours: qty,
          /** A traitor's land is this much easier to take. */
          traitorDefenseBps: bps.max(10_000),
        })
        .prefault({
          max: 2,
          breakHours: 2,
          giftShareBps: 3_000,
          traitorBreaks: 2,
          traitorHours: 24,
          traitorDefenseBps: 7_500,
        }),
      /** A pocket cut off from its capital and ringed by one rival falls to it, a share an hour. */
      encircle: z.object({ lossBps: bps.max(10_000) }).prefault({ lossBps: 1_000 }),
      /** Buildings, paid in ducats (destroyed) by the caller, one per so many cells held. */
      buildings: z
        .object({
          rocca: z.object({ price: money, defenseBps: positive, perCells: positive }),
          /** Absent: no borgo to build (the maximum of troops is raised by ducats only). */
          borgo: z
            .object({
              price: money,
              capBonus: qty,
              regenBonusBps: bps,
              perCells: positive,
            })
            .optional(),
          /**
           * The port, on a cell by the water: boats sail from it to any shore of the same water,
           * `minutesPerWater` a cell of water; an enemy landing on a shore of a water where the
           * merchant has a port loses `guardBps` of its troops to its galleys.
           */
          porto: z
            .object({
              price: money,
              perCells: positive,
              guardBps: bps.max(10_000),
              minutesPerWater: positive,
            })
            .optional(),
          /**
           * The bombard: `shotsPerDay` shots at an enemy cell within `range`, which turns it and
           * its neighbours of the same holder back to free land (never a capital) and kills the
           * troops that held them.
           */
          bombarda: z
            .object({ price: money, perCells: positive, range: positive, shotsPerDay: positive })
            .optional(),
          /** Walls: no bombard reaches the cells within `radius` of them. */
          mura: z.object({ price: money, perCells: positive, radius: qty }).optional(),
        })
        .prefault({
          rocca: { price: 4_000, defenseBps: 16_000, perCells: 15 },
          borgo: { price: 5_000, capBonus: 20, regenBonusBps: 1_000, perCells: 20 },
        }),
      /** The cap raised for ducats (destroyed by the caller), a few times a day. */
      capRaise: z
        .object({ amount: qty, price: money, perDay: qty })
        .prefault({ amount: 10, price: 10_000, perDay: 2 }),
      /** The week's close: the land that wins at once, Influence by tier, the decrees. */
      close: z
        .object({
          winBps: bps.max(10_000),
          influence: z.object({
            signore: qty,
            podium: qty,
            top10: qty,
            quarter: qty,
            participant: qty,
          }),
          /** The strong decrees the Signore chooses from. */
          decrees: z.array(z.string()),
          /** Their strength, for the Signore and its allies at the close (the members). */
          effects: z.object({
            /** Members: market tax and a larger share of the Dogana. */
            franchise_rialto: z.object({ taxBps: bps, quotaBps: bps }),
            /** Others' sales of a good pay more tax, shared out among the members. */
            monopole: z.object({ extraTaxBps: bps }),
            /** Others' deliveries to a city paid less; its urgent orders the members' a while. */
            embargo: z.object({ cutBps: bps.max(10_000), reservedMinutes: qty }),
            /** A share of every delivery of the others, shared out among the members. */
            dime: z.object({ tollBps: bps }),
            /** Members' contracts of the Doge paid more, and more of them a day. */
            faveur_doge: z.object({ premiumBps: bps, extraOrders: qty.prefault(1) }),
            /** No offer of a good above this share of its reference. */
            calmiere: z.object({ capBps: bps }),
          }),
        })
        .prefault({
          winBps: 8_000,
          influence: { signore: 20, podium: 12, top10: 8, quarter: 5, participant: 2 },
          decrees: ["monopole", "embargo", "dime", "faveur_doge", "franchise_rialto", "calmiere"],
          effects: {
            franchise_rialto: { taxBps: 0, quotaBps: 10_000 },
            monopole: { extraTaxBps: 1_500 },
            embargo: { cutBps: 2_500, reservedMinutes: 60 },
            dime: { tollBps: 300 },
            faveur_doge: { premiumBps: 4_000, extraOrders: 1 },
            calmiere: { capBps: 10_500 },
          },
        }),
    })
    .optional(),
  /**
   * The week's campaign in the Terraferma: lands held by militias and Milan, conquered with lances
   * (levied for free, or engaged for ducats destroyed), worth glory every open hour.
   */
  campaign: z
    .object({
      /** The map: lands, their kind, their neighbours; a land may stand for a city of the game. */
      lands: z.array(
        z.object({
          code: z.string(),
          kind: z.string(),
          neighbors: z.array(z.string()),
          city: z.string().optional(),
          /** Held by Milan when the week opens (by the militia otherwise). */
          milan: z.boolean().prefault(false),
          /** Where it stands on the drawn map of the theme (x to the east, y to the south). */
          x: z.number().int().prefault(0),
          y: z.number().int().prefault(0),
        }),
      ),
      kinds: z.record(
        z.string(),
        z.object({
          /** Glory per open hour to the family holding it. */
          glory: qty,
          /** The garrison counts this much in a battle (10 000 = as many as it is). */
          defenseBps: positive,
          /** Militia (or Milan) holding it when the week opens: base + per active merchant. */
          militia: qty,
          militiaPerActive: qty,
        }),
      ),
      /** Hours of the day (Paris) when marches arrive, Milan rides and glory counts. */
      openHours: z.object({ from: qty.max(24), to: qty.max(24) }),
      /** Free lances: so many per open hour, so many waiting at most. */
      levy: z.object({ perHour: qty, max: qty }),
      /** Lances engaged for ducats each day: so many at each price, in this order. */
      hire: z.array(z.object({ count: positive, price: money })),
      /** A lance leaves this long after being levied or engaged. */
      lanceHours: positive,
      /** A march takes base + perHop per land beyond the first from the family's seat. */
      march: z.object({ baseMinutes: positive, perHopMinutes: qty }),
      /**
       * Milan rides every so many open hours against the family leading in glory: base + per
       * active merchant lances, more the further ahead it is (leadBonusBps at a lead of 100 %).
       */
      milan: z.object({
        everyHours: positive,
        warningMinutes: positive,
        base: qty,
        perActive: qty,
        leadBonusBps: bps,
      }),
      /** Merit: a point per lance in a battle won, and per so many lances held an hour. */
      garrisonLancesPerPoint: positive,
      /**
       * Works a member builds for ducats (destroyed) on a land the family holds, one a land; a
       * land taken razes its work, and the map opening again each week clears them all.
       */
      works: z
        .object({
          kinds: z.record(
            z.string(),
            z.object({
              price: money,
              /** The garrison counts this much more in a battle. */
              defenseBonusBps: bps.prefault(0),
              /** The land's glory counts this much more. */
              gloryBonusBps: bps.prefault(0),
              /** The family's marches may leave from here rather than from the seat. */
              staging: z.boolean().prefault(false),
            }),
          ),
          /** Open minutes of works before it serves. */
          buildMinutes: qty,
          /** Works a family may have standing: so many, and one more per so many members. */
          perFamily: qty,
          perMembers: positive,
          /** Merit to each merchant of an assault that razes a work. */
          razeMerit: qty,
        })
        .optional(),
    })
    .optional(),
  /**
   * Laws and decrees: the family that wins the week imposes its programme for the next one.
   * Each decree of the catalogue is set here; absent from `catalog`, it cannot be voted.
   */
  decrees: z
    .object({
      catalog: z.array(z.string()),
      perWinner: qty,
      /** Most weight of one member in the programme's vote (by merit), as a share. */
      maxVoteBps: bps.max(10_000),
      /** The programme of a family that voted nothing (or not enough). */
      defaults: z.array(z.object({ code: z.string(), target: z.string().optional() })),
      /** Members' market tax and a larger share of the Dogana. */
      fondaco: z.object({ taxBps: bps, quotaBps: bps }),
      /** Added to the market tax of others' sales of a good, shared out among the members. */
      gabelle: z.object({ extraTaxBps: bps }),
      /** Members paid more for deliveries to a city; its urgent orders theirs for a while. */
      faveur: z.object({ premiumBps: bps, reservedMinutes: qty }),
      /** Paid by others' deliveries to the cities the family held, shared out among members. */
      peage: z.object({ tollBps: bps }),
      /** Members' quota at the Muda larger, others' smaller. */
      levant: z.object({ memberQuotaBps: bps, othersCutBps: bps.max(10_000) }),
      /** No offer of a good above this share of its reference price. */
      calmiere: z.object({ capBps: bps }),
    })
    .prefault({
      catalog: [],
      perWinner: 0,
      maxVoteBps: 10_000,
      defaults: [],
      fondaco: { taxBps: 0, quotaBps: 0 },
      gabelle: { extraTaxBps: 0 },
      faveur: { premiumBps: 0, reservedMinutes: 0 },
      peage: { tollBps: 0 },
      levant: { memberQuotaBps: 0, othersCutBps: 0 },
      calmiere: { capBps: 10_000 },
    }),
  /**
   * Offers between players must stay within this share of the reference price: a merchant
   * cannot hand ducats to another account by selling a loaf for a fortune. 0 turns it off.
   */
  priceBand: z.object({ minBps: bps, maxBps: bps }).prefault({ minBps: 0, maxBps: 0 }),
  /**
   * Deliveries by road: each merchant gets a board of personal orders every day (cities, the Doge,
   * their family, urgent ones) and carts them to the city with their own vehicles; payment is made
   * on arrival. 0 orders a day turns them off (and keeps the instant sale to cities).
   */
  deliveries: z
    .object({
      /** Orders drawn per merchant and per day. */
      ordersPerDay: z.object({ min: qty, max: qty }),
      /** The Doge's orders on the board (taken from `contracts`, at its premium). */
      dogeOrdersPerDay: qty,
      /** Urgent orders: open a short while, at a premium (they replace the Criées). */
      urgentPerDay: qty,
      urgentPremiumBps: bps,
      urgentOpenMinutes: positive,
      /** Hours of the day (Paris) when an urgent order may open: [from, to). */
      urgentHours: z.object({ from: qty.max(23), to: qty.max(24) }).prefault({ from: 8, to: 21 }),
      /**
       * The fattore: a clerk who sends a vehicle left at the counter (`idleMinutes` after the
       * merchant's last action, or its return) with the best order the stock covers, `perDay`
       * times a day, from 8 h to 22 h, for a merchant seen in the last `activeHours`; the city's
       * payment loses `commissionBps` (destroyed). Off when absent.
       */
      fattore: z
        .object({ perDay: qty, idleMinutes: positive, commissionBps: bps, activeHours: positive })
        .optional(),
      /** A city order pays the reference price × this… */
      cityPriceBps: bps,
      /** … plus this much per hour of road (one way, normal speed). */
      distanceBonusBpsPerHour: bps,
      /**
       * City prices follow the Rialto: the reference blended with yesterday's traded price
       * (`weightBps` of it, when the volume suffices), kept between `floorBps` and `capBps` of the
       * reference. Weight 0 turns it off.
       */
      marketIndex: z
        .object({ weightBps: bps.max(10_000), floorBps: bps, capBps: bps })
        .prefault({ weightBps: 0, floorBps: 10_000, capBps: 10_000 }),
      /** Quantity range of a city order, per resource (also the resources cities order). */
      quantity: z.record(z.string(), z.tuple([positive, positive])),
      /** How often each resource is ordered, relative to the others (1 when absent). */
      weights: z.record(z.string(), positive).prefault({}),
      /**
       * Elastic demand on the shared board: a good priced at the Rialto under its reference is
       * ordered more often (over it, less), by this share of the gap (10 000: in proportion), and
       * the board grows (or shrinks) with the average, from half its size to `elasticMaxBps`.
       */
      elasticityBps: bps.prefault(0),
      /** Largest the board grows with cheap goods (bps of its set size). */
      elasticMaxBps: bps.min(10_000).prefault(15_000),
      /**
       * Share of city orders drawn among the goods of the merchant's own chain (what the starting
       * buildings of their region make), so that the board speaks to their trade.
       */
      homeShareBps: bps.max(10_000).prefault(0),
      /**
       * On the day of a market event, this many of the city orders go where the event asks for
       * more (a city and a resource whose capacity it raises), within the day's total.
       */
      eventOrdersPerDay: qty.prefault(0),
      /**
       * Shared demand: when above 0, the cities' orders form one board for the world, this many
       * city orders (and `urgentPerDay` urgent ones) per active merchant, taken by the first who
       * sends a vehicle. The Doge's, family and welcome orders stay personal.
       */
      sharedOrdersPerActivePlayer: qty.prefault(0),
      /**
       * The cities' orders of the shared board come in waves through the day instead of all at
       * midnight: a wave every `everyHours` (cut at midnight), or at the `hours` of Paris, each
       * order open `openHours`. A wave that would run into `closedHours` lasts instead until
       * `carryUntilHour` the next morning, on the next day's board; in `closedHours` nobody takes
       * an order of the board. The day's count is unchanged. Absent: one board at midnight.
       */
      waves: z
        .object({
          everyHours: positive.optional(),
          hours: z.array(z.number().int().min(0).max(23)).optional(),
          openHours: positive,
          carryUntilHour: z.number().int().min(0).max(23).optional(),
          closedHours: z
            .object({ from: z.number().int().min(0).max(23), to: z.number().int().min(0).max(23) })
            .optional(),
        })
        .optional(),
      /**
       * On the day of joining, a first order the starting stock (or the first batch) covers, by
       * region. `reward`: deniers paid for the whole order, so the first delivery is felt.
       */
      welcome: z
        .record(
          z.string(),
          z.object({ resource: z.string(), quantity: positive, reward: money.optional() }),
        )
        .prefault({}),
      /** Minutes of road one way at normal speed: region → city → minutes. */
      routes: z.record(z.string(), z.record(z.string(), positive)),
      maxDeliveryMinutes: positive,
      /** Orders a vehicle may carry together, all to the same city. */
      maxOrdersPerLoad: positive.prefault(1),
      vehicles: z.record(
        z.string(),
        z.object({
          costDucats: money,
          costMaterials: z.record(z.string(), qty).prefault({}),
          /** Units carried. */
          capacity: positive,
          /** Above 10 000 is faster. */
          speedBps: positive,
          /** The next step for ducats (destroyed), made at home: bigger, faster. */
          upgrade: z.object({ to: z.string(), costDucats: money }).optional(),
        }),
      ),
      /** Types that may be bought (the others are reached by upgrading). Absent: all. */
      forSale: z.array(z.string()).optional(),
      /** Given on joining, counted in net worth. */
      startingVehicles: z.array(z.string()).prefault([]),
      maxVehicles: qty,
    })
    .prefault({
      ordersPerDay: { min: 0, max: 0 },
      dogeOrdersPerDay: 0,
      urgentPerDay: 0,
      urgentPremiumBps: 0,
      urgentOpenMinutes: 60,
      cityPriceBps: 10_000,
      distanceBonusBpsPerHour: 0,
      quantity: {},
      routes: {},
      maxDeliveryMinutes: 120,
      vehicles: {},
      maxVehicles: 0,
    }),
  /** How many times a player may restart from scratch during a season. */
  maxResetsPerPlayer: qty.prefault(1),
  maxBuildings: positive,
  maxBuildingLevel: positive,
  levelCostGrowthBps: bps,
  /**
   * Masteries: once the house's workshops add up to `unlockLevels`, the merchant chooses one for
   * the season. Each changes a few rules for them alone.
   */
  specialties: z
    .object({
      unlockLevels: positive,
      options: z.record(
        z.string(),
        z.object({
          /** Added to the yield of recipes with inputs (transformation). */
          transformYieldBps: bps.prefault(0),
          /** Vehicles go faster by this much. */
          vehicleSpeedBps: bps.prefault(0),
          extraVehicles: qty.prefault(0),
          /** A larger quota at the galleys of the Muda. */
          mudaQuotaBps: bps.prefault(0),
          /** A larger share of the market maker's daily quota. */
          marketMakerQuotaBps: bps.prefault(0),
          /** Taken off the market tax on the merchant's sales. */
          taxDiscountBps: bps.prefault(0),
          extraOpenOrders: qty.prefault(0),
        }),
      ),
    })
    .prefault({ unlockLevels: 5, options: {} }),
  /**
   * The season in acts: from its week (0 = the first), each act may draw a market modifier among
   * its variants (like an event, for the whole act) and make Milan stronger in the campaign.
   */
  acts: z
    .array(
      z.object({
        code: z.string(),
        week: qty,
        variants: z.array(eventDef).prefault([]),
        /** Milan's garrisons and rides during the act (10 000 = as usual). */
        milanBps: bps.prefault(10_000),
      }),
    )
    .prefault([]),
  /** Share of the materials asked for a level (level → bps; 10 000 when absent). */
  upgradeMaterialsBps: z.record(z.string(), bps).prefault({}),
  /** A player counts as active if they acted within this many hours. */
  activeWindowHours: positive,
  buildings: z.record(z.string(), buildingSettings),
  referencePrices: z.record(z.string(), money),
  marketMaker: z.object({
    spreadStartBps: bps,
    spreadEndBps: bps,
    spreadRampDays: positive,
    /** The quoted reference follows the market down (never up), to this fraction at most. */
    referenceFloorBps: bps.max(10_000),
    /** Daily quantity per resource and per active player, in each direction. */
    dailyDepthPerPlayer: z.record(z.string(), qty),
    /** Floor of the daily quantity, so that a small world (beta) still has a market. */
    minDailyDepth: z.record(z.string(), qty).prefault({}),
    /**
     * Units each player may buy from the market maker per resource and per day, so that nobody
     * can empty it for the others. Its daily stock grows to this × active players.
     * No entry: no quota per player.
     */
    playerDailyQuota: z.record(z.string(), qty).prefault({}),
    /** Same, for selling to the market maker (which creates money: kept tighter). */
    playerDailySellQuota: z.record(z.string(), qty).prefault({}),
    /**
     * Most the market maker trades per resource and per day, all players together: as the world
     * fills up, each player's quota shrinks to their share of it (never below 1).
     */
    maxDailyDepth: z.record(z.string(), qty).prefault({}),
    /**
     * The Dogana's price follows supply and demand: each day, what merchants bought from it more
     * than they sold it (as a share of its daily depth) moves its price up by up to `stepBps` of
     * the reference, and the reverse down, between `minBps` and `maxBps` of the reference.
     * Each day it also comes back `revertBps` of the way to the reference.
     * Absent: its price follows the market down only (`referenceFloorBps`).
     */
    drift: z
      .object({
        stepBps: bps,
        minBps: bps.max(10_000),
        maxBps: bps.min(10_000),
        /** Share of the gap to the reference closed each day: prices come back when trade stops. */
        revertBps: bps.max(10_000).prefault(0),
      })
      .optional(),
  }),
  cities: z.record(z.string(), z.record(z.string(), cityDemand)),
  /**
   * The house between seasons: the Influence it earns each week (net sales, the campaign's merit,
   * each capped) and the patents it may hold. Absent: no Influence, and no patent has effect.
   */
  house: z
    .object({
      /**
       * Influence earned without missions (each source optional): net sales, the campaign's
       * merit, the season's tier. Venice earns it by its missions only.
       */
      influence: z
        .object({
          commerce: z.object({ ducatsPerPoint: positive, weeklyCap: qty }).optional(),
          campaign: z.object({ meritPerPoint: positive, winBonus: qty, weeklyCap: qty }).optional(),
          /** At the season's close, by tier of the ranking (`seasonTier`); none without. */
          season: z.record(z.string(), qty).prefault({}),
        })
        .prefault({}),
      /**
       * The house's missions: a board of `perBoard` drawn from the pool every `everyHours`, the
       * same for every merchant, each paid in Influence once done.
       */
      missions: z
        .object({
          everyHours: positive,
          perBoard: qty,
          pool: z.array(
            z.object({
              id: z.string(),
              event: z.string(),
              filter: z.record(z.string(), z.union([z.string(), z.number()])).prefault({}),
              /** The event's data field to add up (absent: each event counts one). */
              sum: z.string().optional(),
              /** A family of missions, capped on a board by `groupMax`. */
              group: z.string().optional(),
              count: positive,
              influence: positive,
            }),
          ),
          /** At most this many missions of a group on a board (the optional Terraferma's). */
          groupMax: z.record(z.string(), qty).prefault({}),
        })
        .optional(),
      /** What Influence buys in the world (absent: nothing but patents). */
      spend: z
        .object({
          /** A delivery arrives at once: 1 Influence per this many minutes left, a few a day. */
          rushMinutesPerPoint: positive,
          rushPerDay: qty,
          /** Troops for the campaign, besides the ducats: this many a point, so many a day. */
          troopsPerPoint: positive,
          troopsPerDay: qty,
          /** Another task of the day in place of one. */
          dailyReroll: positive,
          /** The mastery chosen again during the season. */
          respec: positive,
          /** A campaign work finished at once. */
          rushWork: positive,
        })
        .optional(),
      /** Patent code → its price in Influence and the patents it asks for first. */
      patents: z.record(
        z.string(),
        z.object({ cost: positive, requires: z.array(z.string()).prefault([]) }),
      ),
    })
    .optional(),
  /**
   * The Doge's tenders: every `everyDays`, a good of `quantity` (its range) at most `ceilingBps`
   * of its reference; bids for `bidHours` with a caution of `cautionBps` of the bid, delivery
   * within `deliverHours` of the close. Off when absent.
   */
  tenders: z
    .object({
      everyDays: positive,
      bidHours: positive,
      deliverHours: positive,
      quantity: z.record(z.string(), z.tuple([positive, positive])),
      ceilingBps: bps,
      cautionBps: bps,
    })
    .optional(),
  /**
   * The Bank's loans: up to `maxShareBps` of the net worth and `maxAmount`, `maxDays` at most, at
   * `interestBpsPerDay` simple; `lateBps` more on what is missing at term. Off when absent.
   */
  loans: z
    .object({
      maxShareBps: bps,
      maxAmount: money,
      interestBpsPerDay: bps,
      maxDays: positive,
      lateBps: bps,
    })
    .optional(),
  /** Commissions between merchants, open `maxDays` at most. Off when absent. */
  commissions: z.object({ maxDays: positive }).optional(),
  /** The colleganza: `maxDays` at most, the investor's share at most `maxShareBps`. */
  colleganza: z.object({ maxDays: positive, maxShareBps: bps.max(10_000) }).optional(),
  /**
   * The manufactures: past `maxBuildingLevel`, a workshop climbs to `maxLevel` once its merchant
   * (with net sales of `unlock`) chose a path: volume (bigger batches, as before) or quality (the
   * batches stay, the cities pay its goods `qualityBpsPerLevel` more per level). Off when absent.
   */
  manufacture: z
    .object({ maxLevel: positive, qualityBpsPerLevel: bps, unlock: money.prefault(0) })
    .optional(),
  /**
   * The luxury chains: a workshop type opens once the merchant's net sales of the season reach
   * this many deniers (its goods are then ordered only of those who make them).
   */
  unlocks: z.record(z.string(), money).prefault({}),
  /**
   * Warehouses in the cities: `perCity` places auctioned each week (at least `minBid`), each
   * letting its holder deliver the city's orders at once, `unitsPerDay`. Off when absent.
   */
  warehouses: z.object({ perCity: positive, minBid: money, unitsPerDay: positive }).optional(),
  /**
   * The official supplier of a city: the week's best deliverer of a good to a city (at least
   * `minUnits`) is paid `bonusBps` more for it there all the next week. Off when absent.
   */
  suppliers: z.object({ bonusBps: bps, minUnits: positive }).optional(),
  /** Weekly city projects; no needs turns them off. */
  projects: z
    .object({
      intervalDays: positive,
      durationDays: positive,
      needsPerPlayer: z.record(z.string(), qty),
      premiumBps: bps,
      /**
       * Company orders: once every need is filled, each merchant who delivered gets this share
       * of what he was paid on top, from the city.
       */
      bonusBps: bps.prefault(0),
    })
    .prefault({ intervalDays: 7, durationDays: 7, needsPerPlayer: {}, premiumBps: 0, bonusBps: 0 }),
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

/** The Pass's perks that once sold production, the Dogana's quota, open offers or orders. */
const RETIRED_PASS_PERKS = [
  "marketMakerQuotaBps",
  "extraOpenOrders",
  "freshBonusBps",
  "contractRerollsPerDay",
] as const;

/**
 * Settings saved by a world before live-2 (21 October 2026) are brought within the rule: the
 * Pass's four retired perks go to zero (the engine no longer reads them), the rest is kept.
 */
export function upgradeLegacySettings(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const pass = (input as { pass?: unknown }).pass;
  if (!pass || typeof pass !== "object") return input;
  const p = pass as Record<string, unknown>;
  if (RETIRED_PASS_PERKS.every((k) => p[k] === undefined || p[k] === 0)) return input;
  const zeroed = Object.fromEntries(
    RETIRED_PASS_PERKS.filter((k) => p[k] !== undefined).map((k) => [k, 0]),
  );
  return { ...input, pass: { ...p, ...zeroed } };
}
