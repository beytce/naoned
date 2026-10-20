import { type Deniers, applyBpsFloor } from "./money.js";
import { type PlayerId, SOURCE_ACCOUNT, type WorldState, cashAccount } from "./state.js";
import { type Tx, emit, transfer } from "./tx.js";

/**
 * The official supplier of a city (recommendations of 20 October 2026): for each good and each
 * city, the merchant who delivered the most of it there in the week is named at its close, and
 * that city pays them `bonusBps` more for that good all the next week. Off without its settings.
 */

export function supplierKey(city: string, resource: string): string {
  return `${city}|${resource}`;
}

/** The official supplier of a good in a city this week (undefined: none). */
export function supplierOf(
  state: WorldState,
  city: string,
  resource: string,
): PlayerId | undefined {
  return state.suppliers?.holders[supplierKey(city, resource)];
}

/** The week's deliverers of a good to a city so far, the most first. */
export function supplierStandings(
  state: WorldState,
  city: string,
  resource: string,
): { playerId: PlayerId; units: number }[] {
  const units = state.suppliers?.units[supplierKey(city, resource)] ?? {};
  return Object.entries(units)
    .map(([playerId, n]) => ({ playerId, units: n }))
    .sort((a, b) => b.units - a.units || a.playerId.localeCompare(b.playerId));
}

/**
 * Goods arrived in a city: counted for the week's ranking, and the official supplier's premium
 * paid on what each good was paid (`paid`, by resource). Returns the premium.
 */
export function supplyArrived(
  tx: Tx,
  playerId: PlayerId,
  city: string,
  arrived: Record<string, number>,
  paid: Record<string, Deniers>,
  ref: string,
): Deniers {
  const rules = tx.ctx.settings.suppliers;
  if (!rules) return 0n;
  tx.s.suppliers ??= { units: {}, holders: {} };
  const suppliers = tx.s.suppliers;
  let premium = 0n;
  for (const [resource, qty] of Object.entries(arrived)) {
    if (qty <= 0) continue;
    const key = supplierKey(city, resource);
    const units = suppliers.units[key] ?? {};
    units[playerId] = (units[playerId] ?? 0) + qty;
    suppliers.units[key] = units;
    if (suppliers.holders[key] === playerId)
      premium += applyBpsFloor(paid[resource] ?? 0n, rules.bonusBps);
  }
  if (premium > 0n)
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), premium, "supplier_bonus", ref);
  return premium;
}

/** At the week's close: the best of each good in each city is named, the ranking starts afresh. */
export function nameSuppliers(tx: Tx): void {
  const rules = tx.ctx.settings.suppliers;
  const suppliers = tx.s.suppliers;
  if (!rules || !suppliers) return;
  const holders: Record<string, PlayerId> = {};
  const named: { city: string; resource: string; playerId: PlayerId; units: number }[] = [];
  for (const key of Object.keys(suppliers.units).sort()) {
    const [city = "", resource = ""] = key.split("|");
    const best = supplierStandings(tx.s as WorldState, city, resource)[0];
    if (!best || best.units < rules.minUnits || !tx.s.players[best.playerId]) continue;
    holders[key] = best.playerId;
    named.push({ city, resource, playerId: best.playerId, units: best.units });
  }
  tx.s.suppliers = { units: {}, holders };
  if (named.length > 0) emit(tx, "suppliers_named", undefined, { suppliers: named });
}
