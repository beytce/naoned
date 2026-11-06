import { z } from "zod";

/**
 * The workshops' insides (docs/plan-ateliers.md § 5.2): the hall that grows with a workshop's
 * level, the carrying between stations, the buffers, wear and fatigue, the hands' trades, care,
 * the catalogue of stations and, by building type, its doors, walls, stages and default plan.
 * Durations in seconds, rates in bps, money in deniers. Absent: the workshops of before.
 */

const money = z
  .number()
  .int()
  .nonnegative()
  .transform((n) => BigInt(n));
const qty = z.number().int().nonnegative();
const bps = z.number().int().nonnegative();
const positive = z.number().int().positive();
/** A flagstone of the hall, « x, y »; a door stands just outside the hall. */
const tile = z.tuple([z.number().int(), z.number().int()]);

/** A level of a station: its cycle, what it makes a cycle, its seats, its building site. */
const stationLevel = z.object({
  cycleS: positive,
  capacity: positive,
  /** Hands it takes at once; 0: it runs alone (a drying shed). */
  seats: qty,
  costDucats: money,
  buildMinutes: qty,
});

/** A kind of station: its footprint (turned with it), the trades it fits, its wear, its levels. */
const stationKind = z.object({
  size: z.tuple([positive, positive]).prefault([1, 1]),
  trades: z.array(z.string()).prefault([]),
  /** Wear a unit worked adds. */
  wearPerUnitBps: qty.prefault(0),
  /** Quality an inspection station adds to the workshop's, while it has its hands. */
  qualityBps: bps.prefault(0),
  levels: z.array(stationLevel).min(1),
});

const building = z.object({
  doors: z.object({ in: tile, out: tile }),
  /** Walled flagstones: pillars, a hearth, a well, a canal. */
  walls: z.array(tile).prefault([]),
  /** The chain, in order: each stage and the kinds of station that work it. */
  stages: z.array(z.object({ code: z.string(), stations: z.array(z.string()).min(1) })).min(1),
  /** The common stations it may also take (conveyor, reserve, bench, inspection, rest). */
  common: z.array(z.string()).prefault([]),
  /** Units of the inside in a lot of its recipe. */
  unitsPerLot: positive,
  /** What falls aside at each unit (sawdust): a good, so much a unit. */
  byproduct: z.object({ good: z.string(), perUnitBps: bps }).optional(),
  /** The plan of a new (or migrated) workshop. */
  preset: z
    .array(
      z.object({
        kind: z.string(),
        x: z.number().int(),
        y: z.number().int(),
        rot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      }),
    )
    .min(1),
});

export const interiorSettingsSchema = z
  .object({
    /** The hall's size from a workshop's level: [level, width, height], by level rising. */
    floorAt: z.array(z.tuple([positive, positive, positive])).min(1),
    /** Seconds a unit takes to be carried a flagstone. */
    handlingSPerTile: qty,
    /** Seconds a unit takes along a conveyor, whatever its length. */
    conveyorHandlingS: qty,
    /**
     * The crates waiting between two stages: without any, the stage after loses `lossBps` to the
     * variations (a worn blade, a change of shift); `fullAt` crates give it all back.
     */
    buffer: z.object({ max: positive, lossBps: bps, fullAt: positive }),
    /** A machine's wear slows it by `slowdownBps` of itself, to a floor; its care costs so much. */
    wear: z.object({ slowdownBps: bps, floorBps: bps, careCostDucats: money }),
    /** A hand's fatigue rises at work, falls at rest; it slows the hand, to a floor. */
    fatigue: z.object({ perHourBps: qty, restPerHourBps: qty, floorBps: bps }),
    /** A hand at a station of its trade, a labourer, a stranger to it. */
    tradeFit: z.object({ same: bps, labourer: bps, other: bps }),
    /** Each level of a hand past the first adds so much. */
    skillPerLevelBps: qty,
    /** Care at its full (10 000) lengthens a cycle by `slowdownBps` and gives `qualityBps`. */
    care: z.object({ slowdownBps: bps, qualityBps: bps }),
    /** A hand hired at a workshop's door; so many hands a seat of its stations, at most. */
    hands: z.object({ hireCostDucats: money, perSeat: positive }),
    /** A conveyor's price, a flagstone. */
    conveyorCostDucats: money,
    /** What a station taken down (or a conveyor) gives back of what it cost. */
    refundBps: bps,
    stations: z.record(z.string(), stationKind),
    buildings: z.record(z.string(), building),
  })
  .superRefine((v, ctx) => {
    for (const [type, b] of Object.entries(v.buildings)) {
      const kinds = [
        ...b.stages.flatMap((x) => x.stations),
        ...b.common,
        ...b.preset.map((p) => p.kind),
      ];
      for (const k of kinds)
        if (!v.stations[k])
          ctx.addIssue({
            code: "custom",
            message: `${type}: no station « ${k} »`,
            path: ["buildings", type],
          });
    }
  });

export type InteriorSettings = z.output<typeof interiorSettingsSchema>;
export type InteriorBuilding = InteriorSettings["buildings"][string];
export type StationKind = InteriorSettings["stations"][string];
