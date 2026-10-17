import type { Draft } from "immer";
import type { Effects, LedgerReason, StockReason } from "./effects.js";
import type { Deniers } from "./money.js";
import {
  type AccountId,
  type InventoryLine,
  type PlayerId,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
} from "./state.js";
import type { ResourceCode } from "./theme.js";
import { recordTurnover } from "./turnover.js";

export type EngineErrorCode =
  | "unknown_player"
  | "player_exists"
  | "unknown_region"
  | "registration_closed"
  | "season_over"
  | "unknown_building"
  | "unknown_building_type"
  | "unknown_recipe"
  | "unknown_resource"
  | "unknown_order"
  | "unknown_city"
  | "unknown_project"
  | "not_owner"
  | "invalid_quantity"
  | "invalid_price"
  | "insufficient_funds"
  | "insufficient_stock"
  | "building_busy"
  | "queue_full"
  | "upkeep_default"
  | "max_buildings"
  | "max_level"
  | "max_open_orders"
  | "no_liquidity"
  | "not_bought_here"
  | "project_closed"
  | "project_full"
  | "reset_limit"
  | "unknown_contract"
  | "contract_expired"
  | "contract_done"
  | "wrong_region"
  | "unknown_mission"
  | "mission_locked"
  | "mission_not_done"
  | "mission_claimed"
  | "order_taken"
  | "specialty_chosen"
  | "unknown_specialty"
  | "specialty_locked"
  | "no_criee"
  | "criee_quota"
  | "criee_sold_out"
  | "unknown_daily"
  | "daily_not_done"
  | "daily_claimed"
  | "pass_required"
  | "no_reroll_left"
  | "price_out_of_band"
  | "families_off"
  | "family_locked"
  | "family_chosen"
  | "unknown_family"
  | "no_family"
  | "unknown_land"
  | "seat_untouchable"
  | "not_adjacent"
  | "works_off"
  | "unknown_work"
  | "not_held"
  | "work_exists"
  | "too_many_works"
  | "not_enough_lances"
  | "nothing_to_levy"
  | "hire_limit"
  | "unknown_march"
  | "invalid_programme"
  | "no_decree"
  | "order_reserved"
  | "city_sales_closed"
  | "unknown_vehicle_type"
  | "unknown_vehicle"
  | "max_vehicles"
  | "vehicle_busy"
  | "vehicle_not_for_sale"
  | "no_patent"
  | "unknown_patent"
  | "unknown_mission"
  | "mission_not_done"
  | "mission_claimed"
  | "not_en_route"
  | "rush_limit"
  | "troop_limit"
  | "no_specialty"
  | "no_work"
  | "work_ready"
  | "same_region"
  | "second_counter_set"
  | "no_second_counter"
  | "vehicle_max_level"
  | "over_capacity"
  | "several_cities"
  | "too_many_orders"
  | "unknown_delivery_order"
  | "order_not_open"
  | "order_expired"
  | "order_done"
  | "no_route"
  | "bales_off"
  | "no_bale";

export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function fail(code: EngineErrorCode, message?: string): never {
  throw new EngineError(code, message);
}

/**
 * Working context of one command. All writes go through these helpers so that every balance
 * change has a matching ledger entry or stock movement.
 */
export interface Tx {
  ctx: WorldContext;
  s: Draft<WorldState>;
  now: number;
  fx: Effects;
}

export function nextSeq(tx: Tx): number {
  tx.s.seq += 1;
  return tx.s.seq;
}

export function nextId(tx: Tx, prefix: string): string {
  return `${prefix}${nextSeq(tx)}`;
}

export function balance(tx: Tx, account: AccountId): Deniers {
  return tx.s.accounts[account] ?? 0n;
}

export function transfer(
  tx: Tx,
  from: AccountId,
  to: AccountId,
  amount: Deniers,
  reason: LedgerReason,
  ref?: string,
): void {
  if (amount < 0n) throw new RangeError("negative transfer");
  if (amount === 0n) return;
  const fromBalance = balance(tx, from) - amount;
  if (fromBalance < 0n && from !== SOURCE_ACCOUNT) fail("insufficient_funds");
  tx.s.accounts[from] = fromBalance;
  tx.s.accounts[to] = balance(tx, to) + amount;
  const entry = { from, to, amount, reason, ref, at: tx.now };
  tx.fx.ledger.push(entry);
  recordTurnover(tx.s as WorldState, entry);
}

export function inventoryLine(tx: Tx, playerId: PlayerId, resource: ResourceCode): InventoryLine {
  let inv = tx.s.inventories[playerId];
  if (!inv) {
    inv = {};
    tx.s.inventories[playerId] = inv;
  }
  let line = inv[resource];
  if (!line) {
    line = { available: 0, escrow: 0 };
    inv[resource] = line;
  }
  return line;
}

export function addStock(
  tx: Tx,
  playerId: PlayerId,
  resource: ResourceCode,
  quantity: number,
  reason: StockReason,
  ref?: string,
): void {
  if (quantity < 0) throw new RangeError("negative stock addition");
  if (quantity === 0) return;
  inventoryLine(tx, playerId, resource).available += quantity;
  tx.fx.stock.push({ playerId, resource, quantity, reason, ref, at: tx.now });
}

export function removeStock(
  tx: Tx,
  playerId: PlayerId,
  resource: ResourceCode,
  quantity: number,
  reason: StockReason,
  ref?: string,
): void {
  if (quantity < 0) throw new RangeError("negative stock removal");
  if (quantity === 0) return;
  const line = inventoryLine(tx, playerId, resource);
  if (line.available < quantity) fail("insufficient_stock");
  line.available -= quantity;
  tx.fx.stock.push({ playerId, resource, quantity: -quantity, reason, ref, at: tx.now });
}

/** Moves stock from available to escrow. The total holding does not change: no movement. */
export function lockStock(tx: Tx, playerId: PlayerId, resource: ResourceCode, qty: number): void {
  const line = inventoryLine(tx, playerId, resource);
  if (line.available < qty) fail("insufficient_stock");
  line.available -= qty;
  line.escrow += qty;
}

export function unlockStock(tx: Tx, playerId: PlayerId, resource: ResourceCode, qty: number): void {
  const line = inventoryLine(tx, playerId, resource);
  if (line.escrow < qty) throw new RangeError("escrow underflow");
  line.escrow -= qty;
  line.available += qty;
}

/** Removes stock that was held in escrow (a sell order being filled). */
export function removeEscrowedStock(
  tx: Tx,
  playerId: PlayerId,
  resource: ResourceCode,
  quantity: number,
  reason: StockReason,
  ref?: string,
): void {
  const line = inventoryLine(tx, playerId, resource);
  if (line.escrow < quantity) throw new RangeError("escrow underflow");
  line.escrow -= quantity;
  tx.fx.stock.push({ playerId, resource, quantity: -quantity, reason, ref, at: tx.now });
}

export function emit(tx: Tx, type: string, playerId?: PlayerId, data?: Record<string, unknown>) {
  tx.fx.events.push({ type, playerId, at: tx.now, data });
}
