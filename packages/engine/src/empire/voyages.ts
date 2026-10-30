import { applyBpsFloor } from "../money.js";
import { type EmpireVoyage, HOUR_MS, type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, addStock, fail, inventoryLine, nextId, removeStock, transfer } from "../tx.js";
import { houseEffect } from "./effects.js";
import { empireSettings, ownHouse } from "./house.js";
import { priceAt, routeHours } from "./prices.js";
import { gainXp } from "./staff.js";
import { buyAt, counterLevel, fillOrders, homesOf, sellAt } from "./trade.js";

/** Buys a vehicle at its Casa (CADRAGE-v3 § 3.3): its price is destroyed. */
export function buyEmpireVehicle(tx: Tx, playerId: PlayerId, type: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const spec = s.vehicles[type];
  if (!spec) fail("unknown_building_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, BigInt(spec.costDucats) * 100n, "empire_build");
  h.vehicles = [...(h.vehicles ?? []), { id: nextId(tx, "v"), type, busyUntil: 0 }];
}

/**
 * Sends a vehicle between two regions of its routes, from one the house is in: its own goods held
 * there first, the rest bought at the port. It arrives after the route's hours and is back after
 * twice as long; its cargo sells at the arrival (settleVoyages).
 */
export function startVoyage(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  from: string,
  to: string,
  good: string,
  qty: number,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  const spec = s.vehicles[v.type];
  if (!spec) fail("unknown_building_type");
  const dest = s.regions.find((r) => r.code === to);
  if (
    from === to ||
    !spec.regions.includes(from) ||
    !spec.regions.includes(to) ||
    counterLevel(h, from) <= 0 ||
    !dest ||
    dest.casa > h.casa
  )
    fail("unknown_region");
  if (v.busyUntil > tx.now) fail("building_busy");
  const hold = applyBpsFloor(
    BigInt(spec.capacity),
    10_000 + houseEffect(h, "capacity", s, { vehicleId }),
  );
  if (!Number.isInteger(qty) || qty <= 0 || qty > Number(hold)) fail("invalid_quantity");
  // The port of arrival must trade the good: its cities ask it, or its Dogana takes it.
  if (dest.produces[good] === undefined && dest.demands[good] === undefined)
    fail("unknown_resource");
  const r = s.regions.find((x) => x.code === from);
  const ref = r?.produces[good] ?? r?.demands[good];
  const held = homesOf(tx, h, good).has(from) ? inventoryLine(tx, playerId, good).available : 0;
  const own = Math.min(qty, held);
  const before = tx.s.accounts[cashAccount(playerId)] ?? 0n;
  const bought = own < qty && ref !== undefined ? buyAt(tx, playerId, good, qty - own, from) : 0;
  const carried = own + bought;
  if (carried <= 0) fail("insufficient_stock");
  removeStock(tx, playerId, good, carried, "empire_voyage");
  const paid = before - (tx.s.accounts[cashAccount(playerId)] ?? 0n);
  const ownValue = ref !== undefined ? priceAt(ref, 10_000, s) * BigInt(own) : 0n;
  const hours = routeHours(from, to, spec.speedBps + houseEffect(h, "speed", s, { vehicleId }), s);
  v.busyUntil = tx.now + 2 * hours * HOUR_MS;
  const voyage: EmpireVoyage = {
    id: nextId(tx, "y"),
    house: playerId,
    vehicleId,
    good,
    qty: carried,
    from,
    to,
    arrivesAt: tx.now + hours * HOUR_MS,
    cost: paid + ownValue,
  };
  if (tx.s.empire) tx.s.empire.voyages = [...(tx.s.empire.voyages ?? []), voyage];
}

/**
 * The voyages arrived by now, every house's, in the order they arrived: the port's orders first,
 * then its Dogana; what neither takes comes back to the store. Settled at each command of the
 * empire, never by the tick: the world stays the engine's alone.
 */
export function settleVoyages(tx: Tx): void {
  const all = tx.s.empire?.voyages ?? [];
  const due = all.filter((v) => v.arrivesAt <= tx.now).sort((a, b) => a.arrivesAt - b.arrivesAt);
  if (due.length === 0 || !tx.s.empire) return;
  tx.s.empire.voyages = all.filter((v) => v.arrivesAt > tx.now);
  for (const v of due) {
    if (!tx.s.empire.houses[v.house]) continue;
    addStock(tx, v.house, v.good, v.qty, "empire_voyage", v.id);
    // Its captain grows with each voyage.
    const s = empireSettings(tx.ctx);
    for (const m of tx.s.empire.houses[v.house]?.staff ?? [])
      if (m.placedAt === v.vehicleId) gainXp(m, s.staff.xpPerLevel, s);
    const delivered = fillOrders(tx, v.house, v.good, v.qty, v.to);
    sellAt(tx, v.house, v.good, v.qty - delivered, v.to);
  }
}

/** A voyage's expected margin a unit, for the view: the port's price less the cost, after tax. */
export function marginPerUnit(arrival: bigint, departure: bigint, taxBps: number): bigint {
  return applyBpsFloor(arrival, 10_000 - taxBps) - applyBpsFloor(departure, 10_000 + taxBps);
}
