import { DENIERS_PER_DUCAT, type Deniers } from "../../money.js";
import {
  type ArmComponent,
  type CombatVehicle,
  type EmpireArms,
  type EmpireHouse,
  type PlayerId,
  SINK_ACCOUNT,
  cashAccount,
} from "../../state.js";
import { type Tx, fail, nextId, transfer } from "../../tx.js";
import { empireSettings, ownHouse } from "../house.js";
import { checkDepot, ensureMap } from "../map.js";
import type { EmpireSettings } from "../settings.js";
import type { ComponentEffect, PlaceKind } from "./settings.js";

/**
 * The arms of the Porta (docs/plan-porta.md §§ 4–5): the combat vehicles bought and raised at the
 * Remise, the components bought one by one, fitted on their places and raised from 1 to 5. Their
 * prices are destroyed. A combat vehicle has no hold: it is kept apart from the land vehicles.
 */

const armsOf = (h: EmpireHouse): EmpireArms => {
  h.arms ??= { vehicles: [], components: [] };
  return h.arms;
};

const ducats = (n: number | bigint): Deniers => BigInt(n) * DENIERS_PER_DUCAT;

/** A combat model's level for the house: 1 until it is raised. */
export const armLevelOf = (h: EmpireHouse, model: string): number => h.arms?.levels?.[model] ?? 1;

/**
 * A combat model's places at the house's level of it (1 November 2026, after Hades' Star's
 * battleships): its typed places and a support more at each level of `supportAt`; a model without
 * typed places has `slots` places taking any component (null).
 */
export function placesOf(h: EmpireHouse, model: string, s: EmpireSettings): (PlaceKind | null)[] {
  const spec = s.porta.models[model];
  if (!spec) return [];
  if (!spec.places) return Array.from({ length: spec.slots ?? 1 }, () => null);
  const level = armLevelOf(h, model);
  const more = s.porta.modelLevels.supportAt.filter((at) => level >= at).length;
  return [...spec.places, ...Array.from({ length: more }, () => "support" as const)];
}

/**
 * Each combat vehicle with its model's places: one gained at a level is added empty; a component
 * on a place of another kind goes back to the Remise (it stays the house's, unfitted).
 */
export function ensureArmPlaces(h: EmpireHouse, s: EmpireSettings): void {
  for (const v of h.arms?.vehicles ?? []) {
    const places = placesOf(h, v.model, s);
    if (places.length === 0) continue;
    const kindOf = (id: string | null) => {
      const c = id ? h.arms?.components.find((x) => x.id === id) : undefined;
      return c ? s.porta.components[c.code]?.kind : undefined;
    };
    const slots = places.map((kind, i) => {
      const id = v.slots[i] ?? null;
      return id && (kind === null || kindOf(id) === kind) ? id : null;
    });
    if (slots.length !== v.slots.length || slots.some((x, i) => x !== v.slots[i])) v.slots = slots;
  }
}

/** The price of a combat model's next level, or null at the last: its price doubled each level. */
export function armUpgradeCost(h: EmpireHouse, model: string, s: EmpireSettings): Deniers | null {
  const spec = s.porta.models[model];
  const level = armLevelOf(h, model);
  if (!spec || level >= s.porta.modelLevels.max) return null;
  return ducats(spec.costDucats) * BigInt(s.porta.modelLevels.costTimes) * 2n ** BigInt(level);
}

/** The price of a component's next level, or null at the last: its price doubled each level. */
export function componentUpgradeCost(
  h: EmpireHouse,
  componentId: string,
  s: EmpireSettings,
): Deniers | null {
  const c = h.arms?.components.find((x) => x.id === componentId);
  const spec = c && s.porta.components[c.code];
  if (!c || !spec || c.level >= s.porta.componentMaxLevel) return null;
  return ducats(spec.costDucats) * 2n ** BigInt(c.level);
}

/** The Remise asked by the arms, as by the land vehicles. */
function atRemise(tx: Tx, playerId: PlayerId): { h: EmpireHouse; s: EmpireSettings } {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  checkDepot(h, s);
  return { h, s };
}

const pay = (tx: Tx, playerId: PlayerId, price: Deniers) =>
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, price, "empire_build");

/** Buys a combat vehicle of a model, from its Casa, with its places empty. */
export function buyArm(tx: Tx, playerId: PlayerId, model: string): void {
  const { h, s } = atRemise(tx, playerId);
  const spec = s.porta.models[model];
  if (!spec) fail("unknown_vehicle_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  pay(tx, playerId, ducats(spec.costDucats));
  const arms = armsOf(h);
  arms.vehicles = [
    ...arms.vehicles,
    { id: nextId(tx, "cv"), model, slots: placesOf(h, model, s).map(() => null) },
  ];
}

/** Raises a combat model by a level: every vehicle of it gains hp and damage. */
export function upgradeArm(tx: Tx, playerId: PlayerId, model: string): void {
  const { h, s } = atRemise(tx, playerId);
  const spec = s.porta.models[model];
  if (!spec) fail("unknown_vehicle_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  const cost = armUpgradeCost(h, model, s);
  if (cost === null) fail("max_level");
  pay(tx, playerId, cost);
  const arms = armsOf(h);
  arms.levels = { ...(arms.levels ?? {}), [model]: armLevelOf(h, model) + 1 };
  ensureArmPlaces(h, s);
}

/** Buys a component, from its Casa: it waits at the Remise until it is fitted. */
export function buyComponent(tx: Tx, playerId: PlayerId, code: string): void {
  const { h, s } = atRemise(tx, playerId);
  const spec = s.porta.components[code];
  if (!spec) fail("unknown_arm");
  if (h.casa < spec.casa) fail("requirement_unmet");
  pay(tx, playerId, ducats(spec.costDucats));
  const arms = armsOf(h);
  arms.components = [...arms.components, { id: nextId(tx, "cp"), code, level: 1 }];
}

/** A combat vehicle away from the Remise: at the Porta, or on its way back. */
export const armAway = (v: CombatVehicle, now: number) =>
  v.porta !== undefined || (v.backAt ?? 0) > now;

/** The vehicle a component is fitted on, if any. */
const carrierOf = (arms: EmpireArms, componentId: string): CombatVehicle | undefined =>
  arms.vehicles.find((v) => v.slots.includes(componentId));

/** Raises a component by a level, at the Remise: never on a vehicle away. */
export function upgradeComponent(tx: Tx, playerId: PlayerId, componentId: string): void {
  const { h, s } = atRemise(tx, playerId);
  const arms = armsOf(h);
  const c = arms.components.find((x) => x.id === componentId);
  if (!c) fail("unknown_arm");
  const carrier = carrierOf(arms, componentId);
  if (carrier && armAway(carrier, tx.now)) fail("vehicle_busy");
  const cost = componentUpgradeCost(h, componentId, s);
  if (cost === null) fail("max_level");
  pay(tx, playerId, cost);
  c.level += 1;
}

/**
 * Fits a component on a place of a combat vehicle (null: empties the place), at the Remise. A
 * component fitted elsewhere leaves its first place; a vehicle away is not touched.
 */
export function fitArm(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  slot: number,
  componentId: string | null,
): void {
  const { h, s } = atRemise(tx, playerId);
  ensureArmPlaces(h, s);
  const arms = armsOf(h);
  const v = arms.vehicles.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_vehicle");
  if (!Number.isInteger(slot) || slot < 0 || slot >= v.slots.length) fail("no_room");
  if (armAway(v, tx.now)) fail("vehicle_busy");
  if (componentId !== null) {
    const c = arms.components.find((x) => x.id === componentId);
    if (!c) fail("unknown_arm");
    // A typed place takes only its kind (a weapon, a defense, a support).
    const kind = placesOf(h, v.model, s)[slot];
    if (kind && s.porta.components[c.code]?.kind !== kind) fail("wrong_place");
    const from = carrierOf(arms, componentId);
    if (from && armAway(from, tx.now)) fail("vehicle_busy");
    if (from) from.slots = from.slots.map((x) => (x === componentId ? null : x));
  }
  v.slots = v.slots.map((x, i) => (i === slot ? componentId : x));
}

/** A weapon of a combat vehicle, as the battle reads it. */
export interface WeaponStats {
  componentId: string;
  effect: ComponentEffect;
  /** Damage a second, or a shot's damage for a weapon that fires in shots. */
  power: number;
  rangeCenti: number;
  periodS: number;
  rampBps: number;
  rampEveryS: number;
  rampMaxBps: number;
}

/** An active component (pavise, surgeon, trumpet, smoke), launched by its round button. */
export interface ActiveStats {
  componentId: string;
  effect: ComponentEffect;
  power: number;
  rangeCenti: number;
  durationS: number;
  cooldownS: number;
}

/** A combat vehicle's strength (plan-porta.md § 4): its model at its level, its components. */
export interface ArmStats {
  model: string;
  hp: number;
  speedCenti: number;
  weapons: WeaponStats[];
  actives: ActiveStats[];
  /** The damage its passive defences cut, in bps (the cuirass), at most 90 %. */
  damageCutBps: number;
}

const ACTIVE: ReadonlySet<ComponentEffect> = new Set(["pavise", "surgeon", "trumpet", "smoke"]);
const MAX_CUT_BPS = 9_000;

/** A component's strength at its level. */
function powerAt(c: ArmComponent, s: EmpireSettings): number {
  const spec = s.porta.components[c.code];
  if (!spec) return 0;
  return spec.power + Math.floor((spec.power * spec.perLevelBps * (c.level - 1)) / 10_000);
}

/** The strength of a combat vehicle of the house. */
export function armStats(h: EmpireHouse, vehicleId: string, s: EmpireSettings): ArmStats {
  const v = h.arms?.vehicles.find((x) => x.id === vehicleId);
  const model = v && s.porta.models[v.model];
  if (!v || !model) throw new RangeError(`no combat vehicle ${vehicleId}`);
  const levelBps = 10_000 + s.porta.modelLevels.stepBps * (armLevelOf(h, v.model) - 1);
  const scaled = (n: number) => Math.floor((n * levelBps) / 10_000);
  const out: ArmStats = {
    model: v.model,
    hp: scaled(model.hp),
    speedCenti: model.speedCenti,
    weapons: [],
    actives: [],
    damageCutBps: 0,
  };
  for (const id of v.slots) {
    const c = id ? h.arms?.components.find((x) => x.id === id) : undefined;
    const spec = c && s.porta.components[c.code];
    if (!c || !spec) continue;
    const power = powerAt(c, s);
    if (spec.kind === "weapon")
      out.weapons.push({
        componentId: c.id,
        effect: spec.effect,
        power: scaled(power),
        rangeCenti: spec.rangeCenti,
        periodS: spec.periodS,
        rampBps: spec.rampBps,
        rampEveryS: spec.rampEveryS,
        rampMaxBps: spec.rampMaxBps,
      });
    else if (ACTIVE.has(spec.effect))
      out.actives.push({
        componentId: c.id,
        effect: spec.effect,
        power,
        rangeCenti: spec.rangeCenti,
        durationS: spec.durationS + spec.durationPerLevelS * (c.level - 1),
        cooldownS: spec.cooldownS,
      });
    else out.damageCutBps = Math.min(MAX_CUT_BPS, out.damageCutBps + power);
  }
  return out;
}
