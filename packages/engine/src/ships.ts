import { costValue } from "./buildings.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type Ship,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

export function shipsOf(state: WorldState, playerId: PlayerId): Ship[] {
  return Object.values(state.ships ?? {}).filter((s) => s.playerId === playerId);
}

/** At sea (convoy not yet unloaded) or cruising as a privateer. */
export function shipAtSea(state: WorldState, shipId: string): boolean {
  const sailing = Object.values(state.expeditions ?? {}).some(
    (e) => e.outcome === "pending" && e.ships?.includes(shipId),
  );
  if (sailing) return true;
  return Object.values(state.raids ?? {}).some(
    (r) => r.outcome === "cruising" && r.ships.includes(shipId),
  );
}

export type ShipStatus = "ready" | "at_sea" | "damaged" | "repairing";

export function shipStatus(state: WorldState, ship: Ship, now: number): ShipStatus {
  if (shipAtSea(state, ship.id)) return "at_sea";
  if (ship.damaged) return "damaged";
  if (now < ship.readyAt) return "repairing";
  return "ready";
}

export function shipUpkeep(ctx: WorldContext, ship: Ship): Deniers {
  return ctx.settings.ships.types[ship.type]?.upkeepPerDay ?? 0n;
}

export function buildShip(tx: Tx, playerId: PlayerId, type: string): Ship {
  const { ships } = tx.ctx.settings;
  const def = ships.types[type];
  if (!def) fail("unknown_ship_type");
  if (shipsOf(tx.s as WorldState, playerId).length >= ships.maxPerPlayer) fail("max_ships");
  const id = nextId(tx, "s");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, def.costDucats, "construction", id);
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    removeStock(tx, playerId, res, qty, "construction", id);
  }
  const ship: Ship = {
    id,
    playerId,
    type,
    investedValue: costValue(tx.ctx, { ducats: def.costDucats, materials: def.costMaterials }),
    damaged: false,
    readyAt: tx.now,
  };
  tx.s.ships ??= {};
  tx.s.ships[id] = ship;
  emit(tx, "ship_built", playerId, { ship: id, type });
  return ship;
}

export function repairShip(tx: Tx, playerId: PlayerId, shipId: string): void {
  const ship = tx.s.ships?.[shipId];
  if (!ship) fail("unknown_ship");
  if (ship.playerId !== playerId) fail("not_owner");
  if (shipAtSea(tx.s as WorldState, shipId)) fail("ship_busy");
  if (!ship.damaged) fail("ship_not_damaged");
  const def = tx.ctx.settings.ships.types[ship.type];
  if (!def) fail("unknown_ship_type");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, def.repairCost, "ship_repair", shipId);
  ship.damaged = false;
  ship.readyAt = tx.now + def.repairHours * HOUR_MS;
  emit(tx, "ship_repaired", playerId, { ship: shipId });
}

export interface Fleet {
  ships: string[];
  hold: Deniers;
  speedBps: number;
  defense: number;
}

/** Checks a fleet for sailing: the player's own ships, distinct, all ready. Merchant ship first. */
export function readyFleet(tx: Tx, playerId: PlayerId, ids: string[]): Fleet {
  if (ids.length === 0 || ids.length > 4 || new Set(ids).size !== ids.length) fail("invalid_fleet");
  let speedBps = 0;
  let defense = 0;
  let hold = 0n;
  ids.forEach((id, i) => {
    const ship = tx.s.ships?.[id];
    if (!ship) fail("unknown_ship");
    if (ship.playerId !== playerId) fail("not_owner");
    const status = shipStatus(tx.s as WorldState, ship as Ship, tx.now);
    if (status === "damaged") fail("ship_damaged");
    if (status !== "ready") fail("ship_busy");
    const def = tx.ctx.settings.ships.types[ship.type];
    if (!def) fail("unknown_ship_type");
    if (i === 0) hold = def.holdValue;
    speedBps = Math.max(speedBps, def.speedBps);
    defense += def.defense;
  });
  return { ships: ids, hold, speedBps, defense };
}

/** Port dues for a convoy on one's own ships. */
export function portDues(ctx: WorldContext, charter: Deniers): Deniers {
  return applyBpsFloor(charter, ctx.settings.ships.portDuesBps);
}

/** Pirate risk for a convoy of this defense: the route's base risk alone, its escorted risk at 3. */
export function pirateRiskBps(riskBps: number, escortRiskBps: number, defense: number): number {
  if (defense <= 1) return riskBps;
  if (defense === 2) return Math.round((riskBps + escortRiskBps) / 2);
  return Math.floor((escortRiskBps * 3) / defense);
}
