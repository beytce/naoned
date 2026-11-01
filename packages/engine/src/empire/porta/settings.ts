import { z } from "zod";

/**
 * The Porta's parameters (docs/plan-porta.md): the combat vehicles of the Remise and their
 * components, for the battles in the lands of Rome. Prices in ducats, rates in bps, ranges in
 * hundredths of a cell, speeds in hundredths of a cell a minute, durations in seconds.
 */

const qty = z.number().int().nonnegative();
const bps = z.number().int().nonnegative();
const positive = z.number().int().positive();

/** A combat model of the Remise (plan-porta.md § 4): no hold, so many places for components. */
const combatModel = z.object({
  casa: positive,
  costDucats: positive,
  hp: positive,
  speedCenti: positive,
  slots: positive,
});

/** What a component does in battle (plan-porta.md § 5), after Hades' Star's modules. */
export const COMPONENT_EFFECTS = [
  "lances",
  "crossbows",
  "culverin",
  "pavise",
  "cuirass",
  "surgeon",
  "trumpet",
  "smoke",
] as const;
export type ComponentEffect = (typeof COMPONENT_EFFECTS)[number];

/** A component, bought one by one at the Remise and fitted on a combat vehicle. */
const component = z.object({
  kind: z.enum(["weapon", "defense", "support"]),
  effect: z.enum(COMPONENT_EFFECTS),
  casa: positive.prefault(1),
  costDucats: positive,
  /**
   * Its strength at level 1: damage a second (lances, crossbows), a shot's damage (culverin),
   * damage absorbed (pavise), damage cut in bps (cuirass), healing a second (surgeon), speed in
   * bps (trumpet); none for the smoke.
   */
  power: qty,
  /** The strength a level beyond the first adds, in bps of the first. */
  perLevelBps: bps.prefault(0),
  /** Its reach, around the vehicle (0: the vehicle itself). */
  rangeCenti: qty.prefault(0),
  /** A weapon that fires in shots: seconds between two. */
  periodS: qty.prefault(0),
  /** An active component: how long it lasts, and the wait before it serves again. */
  durationS: qty.prefault(0),
  cooldownS: qty.prefault(0),
  /** Seconds the duration gains a level beyond the first. */
  durationPerLevelS: qty.prefault(0),
  /** The lances: so much more damage for each `rampEveryS` on one target, up to `rampMaxBps`. */
  rampBps: bps.prefault(0),
  rampEveryS: qty.prefault(0),
  rampMaxBps: bps.prefault(0),
});

/** The rarities of a relic, from the commonest (plan-porta.md § 6.3). */
export const RARITIES = ["common", "rare", "precious", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Rome's units (plan-porta.md § 6.4), after Hades' Star's Cerberus. */
export const ROME_KINDS = [
  "crossbowman",
  "halberdier",
  "light_horse",
  "bombard",
  "gonfalonier",
] as const;
export type RomeKind = (typeof ROME_KINDS)[number];

/** A unit of Rome, at tier strength 1. */
const romeUnit = z.object({
  hp: positive,
  /** Damage a second; for a unit firing in shots (`periodS`), a shot's damage. */
  power: positive,
  rangeCenti: positive,
  visionCenti: positive,
  speedCenti: qty,
  /** Seconds between two choices of target (the Guardian 8 s, the Colossus 20 s). */
  reviewS: positive,
  /** How far from its city it follows a target before it goes back. */
  leashCenti: positive,
  /** It falls back to its city below this share of its hp (0: never). */
  retreatBelowBps: bps.prefault(0),
  periodS: qty.prefault(0),
  /** A shot that hurts all around the point it falls on (the bombard). */
  areaCenti: qty.prefault(0),
  rampBps: bps.prefault(0),
  rampEveryS: qty.prefault(0),
  rampMaxBps: bps.prefault(0),
  /** The light horse: hunts the transports first. */
  prefersTransport: z.boolean().prefault(false),
  /** Roams between the cities instead of guarding one. */
  roams: z.boolean().prefault(false),
});

const counts = z.partialRecord(z.enum(ROME_KINDS), qty).prefault({});

/** A tier of the lands of Rome (plan-porta.md § 6.6). */
const tier = z.object({
  minPlayers: positive.prefault(1),
  maxPlayers: positive.prefault(4),
  /** The map's radius, in cells. */
  radius: positive,
  cities: positive,
  /** Each city's garrison, by kind. */
  garrison: counts,
  /** The units roaming the map, by kind. */
  roamers: counts,
  /** The Gonfaloniers, in the city farthest from the gate. */
  bosses: qty.prefault(0),
  /** Rome's hp and damage at this tier, in bps of the units' own. */
  strengthBps: positive,
  /** Each player's relics in a city. */
  relicsPerCity: z.object({ min: qty, max: qty }),
  /** The odds of each rarity, as weights. */
  rarityWeights: z.object({ common: qty, rare: qty, precious: qty, legendary: qty }),
  /** The bread a vehicle eats to enter (lot 3). */
  breadPerVehicle: qty.prefault(0),
});

/** The battle's own rules (plan-porta.md § 6). */
const battle = z
  .object({
    stepMs: positive.prefault(250),
    minutes: positive.prefault(10),
    /** A vehicle within this of the gate may leave; a transport within that of a city loads. */
    gateRadiusCenti: positive.prefault(100),
    cityRadiusCenti: positive.prefault(100),
    /** A unit of Rome that sees an enemy warns those of its city so near. */
    alertRadiusCenti: positive.prefault(300),
    /** A unit struck sees its striker so long, and counts it more threatening. */
    hitMemoryS: positive.prefault(10),
    /** A unit fallen back heals so much a second at its city, and comes out again at `backBps`. */
    retreatHealBpsPerS: bps.prefault(200),
    retreatBackBps: bps.prefault(8_000),
    /** Units added for each player beyond the first, in bps. */
    extraPlayerBps: bps.prefault(5_000),
    /** A transport in battle: no defence. It carries a relic for every `holdPerRelic` of hold. */
    transport: z
      .object({
        hp: positive.prefault(800),
        speedCenti: positive.prefault(500),
        holdPerRelic: positive.prefault(25),
      })
      .prefault({}),
  })
  .prefault({});

/** The Porta itself (plan-porta.md § 3): put down like the Remise, raised to open the tiers. */
const building = z.object({
  casa: positive,
  costDucats: positive,
  minutes: positive,
  /** Level n + 1 costs this × 2^n ducats and a site of `levelMinutes` × n. */
  levelCostDucats: positive,
  levelMinutes: positive,
  /** Minutes of the way from the Remise to the Porta, a cell (one cell at the least). */
  travelMinutesPerCell: positive,
  /** The good the entry is paid in (the expedition's victuals). */
  entryGood: z.string().prefault("bread"),
});

export const portaSettingsSchema = z
  .object({
    building: building.optional(),
    models: z.record(z.string(), combatModel).prefault({}),
    /** A combat model's level: up to `max`, each beyond the first gives `stepBps` hp and damage. */
    modelLevels: z
      .object({
        max: positive.prefault(5),
        stepBps: bps.prefault(1_000),
        costTimes: positive.prefault(1),
      })
      .prefault({}),
    components: z.record(z.string(), component).prefault({}),
    componentMaxLevel: positive.prefault(5),
    battle,
    rome: z.partialRecord(z.enum(ROME_KINDS), romeUnit).prefault({}),
    tiers: z.array(tier).prefault([]),
    /** Each rarity: its loading in seconds, the antiquarian's price, the ranking's points. */
    relics: z
      .record(z.enum(RARITIES), z.object({ loadS: positive, priceDucats: qty, points: qty }))
      .optional(),
  })
  .prefault({});

export type PortaSettings = z.output<typeof portaSettingsSchema>;
export type CombatModelSettings = z.output<typeof combatModel>;
export type ComponentSettings = z.output<typeof component>;
export type RomeUnitSettings = z.output<typeof romeUnit>;
export type TierSettings = z.output<typeof tier>;
