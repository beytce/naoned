import type { Effects } from "./effects.js";
import type { Deniers } from "./money.js";
import {
  MARKET_MAKER,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldState,
  escrowAccount,
} from "./state.js";

/**
 * Running totals of the journals (ledger and stock movements), built only from effects.
 * In production these are SUM() queries over ledger_entries and stock_movements.
 */
export interface JournalTotals {
  accounts: Map<string, Deniers>;
  stock: Map<string, number>;
  entries: number;
  badEntries: number;
}

export function emptyTotals(): JournalTotals {
  return { accounts: new Map(), stock: new Map(), entries: 0, badEntries: 0 };
}

const stockKey = (playerId: string, resource: string) => `${playerId}|${resource}`;

export function accumulate(totals: JournalTotals, fx: Effects): void {
  for (const e of fx.ledger) {
    totals.entries++;
    if (e.amount <= 0n || e.from === e.to) totals.badEntries++;
    totals.accounts.set(e.from, (totals.accounts.get(e.from) ?? 0n) - e.amount);
    totals.accounts.set(e.to, (totals.accounts.get(e.to) ?? 0n) + e.amount);
  }
  for (const m of fx.stock) {
    const key = stockKey(m.playerId, m.resource);
    totals.stock.set(key, (totals.stock.get(key) ?? 0) + m.quantity);
  }
}

export interface InvariantViolation {
  invariant: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  detail: string;
}

/** The invariants of docs/CADRAGE.md (and the road). An empty result means the world is consistent. */
export function checkInvariants(state: WorldState, totals: JournalTotals): InvariantViolation[] {
  const out: InvariantViolation[] = [];

  // 1. Every entry is balanced: one positive amount between two distinct accounts.
  if (totals.badEntries > 0) out.push({ invariant: 1, detail: `${totals.badEntries} bad entries` });

  // 2. Every stored balance equals the sum of its entries.
  const accounts = new Set([...Object.keys(state.accounts), ...totals.accounts.keys()]);
  for (const acc of accounts) {
    const stored = state.accounts[acc] ?? 0n;
    const journal = totals.accounts.get(acc) ?? 0n;
    if (stored !== journal) out.push({ invariant: 2, detail: `${acc}: ${stored} ≠ ${journal}` });
  }

  // 3. Money held by players = created − destroyed.
  let players = 0n;
  for (const [acc, bal] of Object.entries(state.accounts)) {
    if (acc !== SOURCE_ACCOUNT && acc !== SINK_ACCOUNT) players += bal;
  }
  const created = -(state.accounts[SOURCE_ACCOUNT] ?? 0n);
  const destroyed = state.accounts[SINK_ACCOUNT] ?? 0n;
  if (players !== created - destroyed) {
    out.push({ invariant: 3, detail: `players ${players} ≠ ${created} − ${destroyed}` });
  }

  // 4. Every stored holding equals the sum of its stock movements.
  const keys = new Set(totals.stock.keys());
  for (const [pid, lines] of Object.entries(state.inventories)) {
    for (const res of Object.keys(lines)) keys.add(stockKey(pid, res));
  }
  for (const key of keys) {
    const [pid = "", res = ""] = key.split("|");
    const line = state.inventories[pid]?.[res];
    const stored = line ? line.available + line.escrow : 0;
    const journal = totals.stock.get(key) ?? 0;
    if (stored !== journal) out.push({ invariant: 4, detail: `${key}: ${stored} ≠ ${journal}` });
  }

  // 5. Nothing a player owns is negative.
  for (const [acc, bal] of Object.entries(state.accounts)) {
    if (acc !== SOURCE_ACCOUNT && bal < 0n) out.push({ invariant: 5, detail: `${acc} = ${bal}` });
  }
  for (const [pid, lines] of Object.entries(state.inventories)) {
    for (const [res, line] of Object.entries(lines)) {
      if (line.available < 0 || line.escrow < 0) {
        out.push({ invariant: 5, detail: `${pid}|${res} negative` });
      }
    }
  }

  // 6. Escrow equals what open orders still hold.
  const moneyHeld = new Map<string, Deniers>();
  const stockHeld = new Map<string, number>();
  for (const o of Object.values(state.orders)) {
    if (o.playerId === MARKET_MAKER) continue;
    if (o.side === "buy") {
      moneyHeld.set(o.playerId, (moneyHeld.get(o.playerId) ?? 0n) + o.price * BigInt(o.remaining));
    } else {
      const key = stockKey(o.playerId, o.resource);
      stockHeld.set(key, (stockHeld.get(key) ?? 0) + o.remaining);
    }
  }
  for (const pid of Object.keys(state.players)) {
    const stored = state.accounts[escrowAccount(pid)] ?? 0n;
    const held = moneyHeld.get(pid) ?? 0n;
    if (stored !== held) out.push({ invariant: 6, detail: `escrow ${pid}: ${stored} ≠ ${held}` });
    for (const [res, line] of Object.entries(state.inventories[pid] ?? {})) {
      const heldQty = stockHeld.get(stockKey(pid, res)) ?? 0;
      if (line.escrow !== heldQty) {
        out.push({ invariant: 6, detail: `escrow ${pid}|${res}: ${line.escrow} ≠ ${heldQty}` });
      }
    }
  }

  // 7. Goods on the road: what is left is what was loaded (less what bandits took, in saves of
  // their time).
  for (const d of Object.values(state.deliveries ?? {})) {
    // A load may carry several orders, of several goods.
    const loadedBy: Record<string, number> = {};
    for (const l of d.orders ?? [{ resource: d.resource, quantity: d.loaded }])
      loadedBy[l.resource] = (loadedBy[l.resource] ?? 0) + l.quantity;
    for (const [res, qty] of Object.entries(d.cargo)) {
      const taken = (d as { attack?: { taken: Record<string, number> } }).attack?.taken[res] ?? 0;
      const loaded = loadedBy[res] ?? 0;
      if (qty < 0 || qty + taken !== loaded) {
        out.push({
          invariant: 7,
          detail: `delivery ${d.id}|${res}: ${qty} + ${taken} ≠ ${loaded}`,
        });
      }
    }
  }
  return out;
}
