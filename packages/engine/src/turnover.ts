import type { LedgerEntry, LedgerReason } from "./effects.js";
import type { Deniers } from "./money.js";
import type { AccountId, PlayerId, WorldState } from "./state.js";

/**
 * Net sales of the season (the ranking): what a merchant was paid for goods, less what selling
 * them cost (taxes, gabelles, tolls), less what they paid for goods. Stock, buildings and gifts
 * count for nothing; buying back and reselling only loses the taxes.
 */

/** Paid to the merchant for goods. */
export const SALES = new Set<LedgerReason>([
  "trade",
  "market_maker_buy",
  "city_sale",
  "criee_sale",
  "project_delivery",
  "project_bonus",
  "contract_reward",
  "family_order_reward",
  "delivery",
  "decree_favour",
  "supplier_bonus",
  "tender_delivery",
  "quality_premium",
  "commission",
  "colleganza_share",
  "share_dividend",
  "signoria_toll",
]);

/** Paid by the merchant for goods, or to sell them. */
export const COSTS = new Set<LedgerReason>([
  "trade",
  "market_maker_sell",
  "market_tax",
  "decree_gabelle",
  "decree_toll",
  "signoria_toll",
  "fattore",
  "commission",
  "colleganza_share",
  "share_dividend",
]);

/** The merchant behind a cash, escrow or hold account. */
function merchantOf(account: AccountId): PlayerId | undefined {
  const [kind] = account.split(":", 1);
  return kind === "cash" || kind === "escrow" || kind === "hold"
    ? account.slice(kind.length + 1)
    : undefined;
}

/** Called for every ledger entry (see `transfer`). */
export function recordTurnover(state: WorldState, entry: LedgerEntry): void {
  const add = (playerId: PlayerId, amount: Deniers) => {
    state.turnover ??= {};
    state.turnover[playerId] = (state.turnover[playerId] ?? 0n) + amount;
  };
  const to = SALES.has(entry.reason) ? merchantOf(entry.to) : undefined;
  const from = COSTS.has(entry.reason) ? merchantOf(entry.from) : undefined;
  // Money moving between two accounts of the same merchant is no sale.
  if (to && to === from) return;
  if (to) add(to, entry.amount);
  if (from) add(from, -entry.amount);
}

/**
 * After each command that moved money: the highest net sales of the season are raised where they
 * were passed (once the command is whole, so that a sale counts net of its tax).
 */
export function markTurnoverPeaks(state: WorldState): void {
  for (const [playerId, now] of Object.entries(state.turnover ?? {})) {
    if (now <= (state.turnoverPeak?.[playerId] ?? 0n)) continue;
    state.turnoverPeak ??= {};
    state.turnoverPeak[playerId] = now;
  }
}

export function turnoverOf(state: WorldState, playerId: PlayerId): Deniers {
  return state.turnover?.[playerId] ?? 0n;
}

/**
 * The highest net sales of the season so far (never below zero): what the merchant's level counts,
 * so that buying goods never takes a level back. Saves from before it start from today's mark.
 */
export function turnoverPeakOf(state: WorldState, playerId: PlayerId): Deniers {
  const peak = state.turnoverPeak?.[playerId] ?? 0n;
  const now = turnoverOf(state, playerId);
  return now > peak ? now : peak;
}

/**
 * A save from before the ranking by net sales: rebuilds them from the ledger of the season (the
 * entries may be summed per accounts and reason), and the start of the current week from the
 * entries dated before it. Saves that already count net sales are left as they are.
 */
export function adoptTurnover(
  state: WorldState,
  entries: LedgerEntry[],
  weekStartAt: number,
): WorldState {
  if (state.turnover) return state;
  const total: WorldState = { ...state, turnover: {} };
  const before: WorldState = { ...state, turnover: {} };
  for (const e of entries) {
    recordTurnover(total, e);
    if (e.at < weekStartAt) recordTurnover(before, e);
  }
  const known = (rows: Record<PlayerId, Deniers> = {}) =>
    Object.fromEntries(Object.entries(rows).filter(([id]) => state.players[id]));
  const turnover = known(total.turnover);
  if (!state.weekly) return { ...state, turnover };
  const start: Record<PlayerId, Deniers> = {};
  for (const id of Object.keys(state.weekly.start)) start[id] = before.turnover?.[id] ?? 0n;
  return { ...state, turnover, weekly: { ...state.weekly, start } };
}
