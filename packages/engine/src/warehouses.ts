import type { Deniers } from "./money.js";
import { type PlayerId, SINK_ACCOUNT, type WorldState, cashAccount } from "./state.js";
import { type Tx, emit, fail, transfer } from "./tx.js";

/**
 * Warehouses in the cities (recommendations of 20 October 2026): a few places per city, auctioned
 * each week. A bid locks its ducats; at the week's close the highest bids win the places for the
 * week after, their ducats leave the game, the others come back. A holder delivers the city's
 * orders from the warehouse at once, without a vehicle, up to `unitsPerDay`. Off without settings.
 */

export function auctionAccount(city: string): string {
  return `auction:${city}`;
}

/** Who holds a warehouse in a city this week. */
export function warehouseHolders(state: WorldState, city: string): PlayerId[] {
  return state.warehouses?.holders[city] ?? [];
}

/** Units the merchant may still deliver from its warehouses today. */
export function warehouseUnitsLeft(
  tx: Tx | { ctx: Tx["ctx"]; s: WorldState },
  playerId: PlayerId,
  day: number,
): number {
  const rules = tx.ctx.settings.warehouses;
  if (!rules) return 0;
  const used = tx.s.warehouses?.used?.[playerId];
  return rules.unitsPerDay - (used && used.day === day ? used.units : 0);
}

/** A bid for a place in a city's warehouse next week; replaces the merchant's last one there. */
export function bidWarehouse(tx: Tx, playerId: PlayerId, city: string, amount: Deniers): void {
  const rules = tx.ctx.settings.warehouses;
  if (!rules) fail("unknown_city");
  if (!tx.ctx.theme.cities.some((c) => c.code === city)) fail("unknown_city");
  if (amount < rules.minBid) fail("bid_too_low");
  tx.s.warehouses ??= { holders: {}, bids: {} };
  const bids = tx.s.warehouses.bids[city] ?? {};
  const old = bids[playerId];
  if (old) transfer(tx, auctionAccount(city), cashAccount(playerId), old, "warehouse_refund", city);
  transfer(tx, cashAccount(playerId), auctionAccount(city), amount, "warehouse_bid", city);
  bids[playerId] = amount;
  tx.s.warehouses.bids[city] = bids;
  emit(tx, "warehouse_bid", playerId, { city });
}

/** Counts the units delivered from a warehouse today. */
export function useWarehouse(tx: Tx, playerId: PlayerId, day: number, units: number): void {
  if (units > warehouseUnitsLeft(tx, playerId, day)) fail("over_capacity");
  const w = tx.s.warehouses;
  if (!w) fail("no_warehouse");
  const used = w.used?.[playerId];
  w.used = { ...w.used, [playerId]: { day, units: (used?.day === day ? used.units : 0) + units } };
}

/** At the week's close: the highest bids of each city win its places, the others come back. */
export function closeWarehouseAuctions(tx: Tx): void {
  const rules = tx.ctx.settings.warehouses;
  const w = tx.s.warehouses;
  if (!rules || !w) return;
  const holders: Record<string, PlayerId[]> = {};
  for (const city of Object.keys(w.bids).sort()) {
    const ranked = Object.entries(w.bids[city] ?? {}).sort(([pa, a], [pb, b]) =>
      a === b ? pa.localeCompare(pb) : a > b ? -1 : 1,
    );
    ranked.forEach(([playerId, amount], i) => {
      const won = i < rules.perCity && !!tx.s.players[playerId];
      if (won) {
        transfer(tx, auctionAccount(city), SINK_ACCOUNT, amount, "warehouse_rent", city);
        holders[city] = [...(holders[city] ?? []), playerId];
      } else
        transfer(tx, auctionAccount(city), cashAccount(playerId), amount, "warehouse_refund", city);
    });
  }
  tx.s.warehouses = { holders, bids: {}, ...(w.used ? { used: w.used } : {}) };
  emit(tx, "warehouses_awarded", undefined, { holders });
}
