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
  | "unknown_cell"
  | "hidden_cell"
  | "no_arsenal"
  | "no_camp"
  | "no_depot"
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
  | "incanto_off"
  | "atouts_off"
  | "atout_taken"
  | "atout_not_offered"
  | "unknown_atout"
  | "letters_off"
  | "no_free_left"
  | "doge_off"
  | "broglio_off"
  | "shares_off"
  | "too_early"
  | "not_for_npc"
  | "already_listed"
  | "not_listed"
  | "over_float"
  | "insufficient_shares"
  | "unknown_rumour"
  | "rumour_true"
  | "invalid_subject"
  | "forge_limit"
  | "own_offer"
  | "already_bought"
  | "not_for_you"
  | "offers_limit"
  | "unknown_offer"
  | "spy_exists"
  | "no_spy"
  | "unknown_target"
  | "election_closed"
  | "not_candidate"
  | "unknown_mutator"
  | "unknown_decree"
  | "no_programme"
  | "cannot_vote"
  | "too_new"
  | "no_letter"
  | "letter_answered"
  | "unknown_choice"
  | "unknown_lot"
  | "lot_closed"
  | "one_lot"
  | "building_busy"
  | "queue_full"
  | "max_buildings"
  | "max_level"
  | "max_open_orders"
  | "no_liquidity"
  | "not_bought_here"
  | "project_closed"
  | "project_full"
  | "unknown_tender"
  | "tender_closed"
  | "over_ceiling"
  | "not_awarded"
  | "already_delivered"
  | "bid_too_low"
  | "unknown_city"
  | "no_warehouse"
  | "fondaci_off"
  | "fondaci_full"
  | "fondaco_top_level"
  | "locked"
  | "choose_path"
  | "path_chosen"
  | "not_ready"
  | "unknown_commission"
  | "commission_closed"
  | "own_commission"
  | "not_for_you"
  | "unknown_colleganza"
  | "colleganza_closed"
  | "own_colleganza"
  | "over_limit"
  | "loan_open"
  | "no_loan"
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
  | "vehicle_max_level"
  | "over_capacity"
  | "several_cities"
  | "too_many_orders"
  | "unknown_delivery_order"
  | "order_not_open"
  | "board_closed"
  | "order_expired"
  | "order_done"
  | "no_route"
  | "bales_off"
  | "no_bale"
  // The Terraferma.
  | "already_placed"
  | "not_placed"
  | "not_neutral"
  | "too_close"
  | "neutral_left"
  | "too_weak"
  | "not_coastal"
  | "no_port"
  | "no_sea_route"
  | "no_shot"
  | "walled"
  | "out_of_range"
  | "too_soon"
  | "team_week"
  | "placement_closed"
  | "not_adjacent"
  | "own_cell"
  | "protected"
  | "too_many_fronts"
  | "share_too_small"
  | "no_troops"
  | "unknown_front"
  | "allied"
  | "not_allied"
  | "traitor"
  | "too_many_allies"
  | "no_request"
  | "breaking"
  | "gift_limit"
  | "built"
  | "no_room"
  | "raise_limit"
  | "terra_off"
  | "terra_closed"
  | "decree_repeat"
  | "night"
  | "too_few_humans"
  | "already_ranked"
  | "already_paid"
  | "not_empire_world"
  | "no_build_slot"
  | "requirement_unmet"
  | "insufficient_favour"
  | "not_here"
  | "no_company"
  | "not_same_company"
  | "own_order"
  | "not_in_theatre"
  | "already_in_theatre"
  | "contesa_week"
  | "not_contesa_week"
  | "roster_closed"
  | "roster_size"
  | "muda_only";

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
