import { costValue } from "./buildings.js";
import type { Deniers } from "./money.js";
import {
  type PlayerId,
  SINK_ACCOUNT,
  type Vehicle,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/**
 * Deliveries by road: the land side of the sea. Each merchant gets a board of personal orders
 * every day and carts the goods to the city with their own vehicles; the city pays on arrival.
 * Bandits (players or the computer) may lie in wait on a road; a merchant without escort can fight
 * back for a few minutes.
 */

// ——— Vehicles ———

export function vehiclesOf(state: WorldState, playerId: PlayerId): Vehicle[] {
  return Object.values(state.vehicles ?? {})
    .filter((v) => v.playerId === playerId)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

export function vehicleFree(v: Vehicle, now: number): boolean {
  return v.busyUntil <= now;
}

export function vehicleUpkeep(ctx: WorldContext, v: Vehicle): Deniers {
  return ctx.settings.deliveries.vehicles[v.type]?.upkeepPerDay ?? 0n;
}

function addVehicle(tx: Tx, playerId: PlayerId, type: string): Vehicle {
  const def = tx.ctx.settings.deliveries.vehicles[type];
  if (!def) fail("unknown_vehicle_type");
  const id = nextId(tx, "v");
  const vehicle: Vehicle = {
    id,
    playerId,
    type,
    investedValue: costValue(tx.ctx, { ducats: def.costDucats, materials: def.costMaterials }),
    busyUntil: 0,
  };
  tx.s.vehicles ??= {};
  tx.s.vehicles[id] = vehicle;
  return vehicle;
}

/** The vehicles given on joining (not paid for, like the starting buildings). */
export function grantStartingVehicles(tx: Tx, playerId: PlayerId): void {
  for (const type of tx.ctx.settings.deliveries.startingVehicles) addVehicle(tx, playerId, type);
}

export function buyVehicle(tx: Tx, playerId: PlayerId, type: string): Vehicle {
  const { deliveries } = tx.ctx.settings;
  const def = deliveries.vehicles[type];
  if (!def) fail("unknown_vehicle_type");
  if (vehiclesOf(tx.s as WorldState, playerId).length >= deliveries.maxVehicles)
    fail("max_vehicles");
  const vehicle = addVehicle(tx, playerId, type);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, def.costDucats, "vehicle", vehicle.id);
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    removeStock(tx, playerId, res, qty, "vehicle", vehicle.id);
  }
  emit(tx, "vehicle_bought", playerId, { vehicle: vehicle.id, type });
  return vehicle;
}
