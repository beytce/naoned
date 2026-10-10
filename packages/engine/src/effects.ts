import type { Deniers } from "./money.js";
import type { AccountId, OrderId, PlayerId } from "./state.js";
import type { ResourceCode } from "./theme.js";

export type LedgerReason =
  | "starting_capital"
  | "city_sale"
  | "project_delivery"
  | "market_maker_buy"
  | "market_maker_sell"
  | "market_tax"
  | "upkeep"
  | "construction"
  | "escrow_lock"
  | "escrow_release"
  | "trade"
  | "player_reset"
  | "contract_reward"
  | "expedition_charter"
  | "ship_repair";

/**
 * Double-entry ledger line: `amount` leaves `from` and enters `to`.
 * Every entry touches exactly two accounts, so the sum of all balances is always zero.
 */
export interface LedgerEntry {
  from: AccountId;
  to: AccountId;
  amount: Deniers;
  reason: LedgerReason;
  ref?: string;
  at: number;
}

export type StockReason =
  | "starting_kit"
  | "production_input"
  | "production_output"
  | "construction"
  | "trade_buy"
  | "trade_sell"
  | "city_sale"
  | "project_delivery"
  | "player_reset"
  | "rations"
  | "contract"
  | "expedition_out"
  | "expedition_return";

/** Change of a player's total holding (available + escrow) of one resource. */
export interface StockMovement {
  playerId: PlayerId;
  resource: ResourceCode;
  quantity: number;
  reason: StockReason;
  ref?: string;
  at: number;
}

export interface Trade {
  id: string;
  resource: ResourceCode;
  price: Deniers;
  quantity: number;
  buyerId: PlayerId;
  sellerId: PlayerId;
  buyOrderId: OrderId;
  sellOrderId: OrderId;
  tax: Deniers;
  at: number;
}

export interface GameEvent {
  type: string;
  playerId?: PlayerId;
  at: number;
  data?: Record<string, unknown>;
}

/** Everything a command wrote, in order. The caller persists it in the same transaction. */
export interface Effects {
  ledger: LedgerEntry[];
  stock: StockMovement[];
  trades: Trade[];
  events: GameEvent[];
}

export function emptyEffects(): Effects {
  return { ledger: [], stock: [], trades: [], events: [] };
}
