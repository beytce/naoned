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

export const portaSettingsSchema = z
  .object({
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
  })
  .prefault({});

export type PortaSettings = z.output<typeof portaSettingsSchema>;
export type CombatModelSettings = z.output<typeof combatModel>;
export type ComponentSettings = z.output<typeof component>;
