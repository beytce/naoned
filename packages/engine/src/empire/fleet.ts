import { DENIERS_PER_DUCAT, type Deniers } from "../money.js";
import { type EmpireHouse, type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, fail, transfer } from "../tx.js";
import { empireSettings, openSite, ownHouse } from "./house.js";
import { checkDepot, ensureMap } from "./map.js";
import type { EmpireSettings } from "./settings.js";

/** A model's level for the house: 1 until it is raised. */
export const vehicleLevelOf = (h: EmpireHouse, type: string): number =>
  h.vehicleLevels?.[type] ?? 1;

/**
 * A vehicle's places of hold for the cities' orders (after Hades' Star's transport): its model's,
 * and `placesPerLevel` a level beyond the first.
 */
export function holdPlacesOf(h: EmpireHouse, type: string, s: EmpireSettings): number {
  const base = s.vehicles[type]?.places ?? 0;
  return base + s.vehicleLevels.placesPerLevel * (vehicleLevelOf(h, type) - 1);
}

/**
 * The hold of a vehicle of the model, at the house's level of it (before the modules and the
 * knowledge): a tenth more a level beyond the first, by default.
 */
export function capacityOf(h: EmpireHouse, type: string, s: EmpireSettings): number {
  const spec = s.vehicles[type];
  const base = spec?.capacity ?? 0;
  const lv = s.vehicleLevels;
  const step = lv.stepBps * (vehicleLevelOf(h, type) - 1);
  return Math.floor((base * (10_000 + step)) / 10_000);
}

/** The price of the model's next level, or null at the last. */
export function upgradeCost(h: EmpireHouse, type: string, s: EmpireSettings): Deniers | null {
  const spec = s.vehicles[type];
  const level = vehicleLevelOf(h, type);
  if (!spec || level >= s.vehicleLevels.max) return null;
  return (
    BigInt(Math.max(spec.costDucats, s.vehicleLevels.minCostDucats)) *
    BigInt(s.vehicleLevels.costTimes) *
    2n ** BigInt(level) *
    DENIERS_PER_DUCAT
  );
}

/** The building a model is bought and raised at: the Remise. */
export function checkYard(h: EmpireHouse, _type: string, s: EmpireSettings): void {
  checkDepot(h, s);
}

/**
 * Raises a model of the house by a level (decision of the owner, 31 October 2026): every vehicle
 * of it holds more. Its price is destroyed.
 */
export function upgradeModel(tx: Tx, playerId: PlayerId, type: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const spec = s.vehicles[type];
  if (!spec) fail("unknown_building_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  checkYard(h, type, s);
  const cost = upgradeCost(h, type, s);
  if (cost === null) fail("max_level");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, cost, "empire_build");
  h.vehicleLevels = { ...(h.vehicleLevels ?? {}), [type]: vehicleLevelOf(h, type) + 1 };
}

/** The Remise's level for the house: 1 until it is raised. */
export const depotLevelOf = (h: EmpireHouse): number => h.depotLevel ?? 1;

/** The transport vehicles the house may hold at its Remise's level (no cap without `fleet`). */
export function fleetCapOf(h: EmpireHouse, s: EmpireSettings): number {
  const levels = s.fleet?.levels;
  if (!levels) return Number.POSITIVE_INFINITY;
  const line = levels[Math.min(depotLevelOf(h), levels.length) - 1];
  return line?.vehicles ?? Number.POSITIVE_INFINITY;
}

/** Refuses a vehicle more at the cap; a house beyond it (given, of before) keeps what it holds. */
export function checkFleetRoom(h: EmpireHouse, s: EmpireSettings): void {
  if ((h.vehicles ?? []).length >= fleetCapOf(h, s)) fail("fleet_full");
}

/** The Remise's next level, or null at the last (or in a world without the fleet's levels). */
export function nextDepotLevel(h: EmpireHouse, s: EmpireSettings) {
  const levels = s.fleet?.levels;
  const line = levels?.[depotLevelOf(h)];
  if (!line) return null;
  return {
    level: depotLevelOf(h) + 1,
    vehicles: line.vehicles,
    casa: line.casa,
    cost: BigInt(line.costDucats) * DENIERS_PER_DUCAT,
    minutes: line.minutes,
  };
}

/**
 * Raises the Remise by a level (after Hades' Star's shipyard): a site at its Casa and price, one at
 * a time; standing, it lets the house hold more transport vehicles. Its price is destroyed.
 */
export function upgradeDepot(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  if (!s.fleet) fail("unknown_building_type");
  if (!h.depot) fail("no_depot");
  const next = nextDepotLevel(h, s);
  if (!next) fail("max_level");
  if (h.casa < next.casa) fail("requirement_unmet");
  if (h.builds.some((b) => b.kind === "depot")) fail("building_busy");
  const site = openSite(tx, playerId, h, next.cost, {}, next.minutes, 0);
  h.builds.push({ kind: "depot", level: next.level, ...site });
}
