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
  | "unknown_destination"
  | "too_many_galleys"
  | "invalid_cargo"
  | "cargo_too_valuable"
  | "unknown_expedition"
  | "expedition_not_back";

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
  tx.fx.ledger.push({ from, to, amount, reason, ref, at: tx.now });
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
