import { draw } from "../draw.js";
import { type Deniers, applyBpsFloor } from "../money.js";
import {
  type EmpireVoyage,
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  cashAccount,
} from "../state.js";
import {
  type Tx,
  addStock,
  emit,
  fail,
  inventoryLine,
  nextId,
  removeStock,
  transfer,
} from "../tx.js";
import { returnSeaColleganza } from "./colleganzaSail.js";
import { corsairRiskBps } from "./corsairs.js";
import { houseEffect } from "./effects.js";
import { capacityOf } from "./fleet.js";
import { empireSettings, openSite, ownHouse } from "./house.js";
import { checkArsenal, checkDepot, ensureMap } from "./map.js";
import { mudaDeparture } from "./mudaSail.js";
import { priceAt, routeHours } from "./prices.js";
import type { EmpireSettings } from "./settings.js";
import { gainXp } from "./staff.js";
import { heldAt, postsIn, putAt, takeAt, takeFrom, wherePut } from "./stores.js";
import { buyAt, counterLevel, fillOrders, sellAt } from "./trade.js";

/** Buys a vehicle at its Casa (CADRAGE-v3 § 3.3): its price is destroyed. */
export function buyEmpireVehicle(tx: Tx, playerId: PlayerId, type: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const spec = s.vehicles[type];
  // A ship is built at the Arsenal, never bought.
  if (!spec || spec.build) fail("unknown_building_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  // On the map, the land vehicles are bought at the house's Remise.
  ensureMap(h, s);
  checkDepot(h, s);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, BigInt(spec.costDucats) * 100n, "empire_build");
  h.vehicles = [...(h.vehicles ?? []), { id: nextId(tx, "v"), type, busyUntil: 0 }];
}

/**
 * Lays a ship down at the private Arsenal (CADRAGE-v3 § 3.3): a site of the Casa's, its price and
 * its materials destroyed; the ship joins the house's vehicles when the site ends.
 */
export function buildShip(tx: Tx, playerId: PlayerId, type: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const spec = s.vehicles[type];
  if (!spec?.build) fail("unknown_building_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  // On the map, the ships are built at the house's Arsenal.
  checkArsenal(h, s);
  const site = openSite(
    tx,
    playerId,
    h,
    BigInt(spec.costDucats) * 100n,
    spec.build.materials,
    spec.build.minutes,
    0,
  );
  h.builds.push({ kind: "ship", level: 1, vehicleType: type, vehicleId: nextId(tx, "v"), ...site });
}

/** Fits a researched trade module on one of a ship's places: free, at once, once each. */
export function fitShip(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  slot: number,
  code: string,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  const m = s.modules.find((x) => x.code === code);
  if (!m || m.kind !== "trade" || !(h.modules?.[code] ?? 0)) fail("unknown_building_type");
  const slots = s.vehicles[v.type]?.slots ?? 0;
  if (!Number.isInteger(slot) || slot < 0 || slot >= slots) fail("no_room");
  const fitted = [...(v.fitted ?? [])];
  if (fitted.some((x, i) => x === code && i !== slot)) fail("built");
  fitted[slot] = code;
  v.fitted = fitted;
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
  insured = false,
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
  // A galley of the Muda leaves only with a place won, at its departure's hour.
  const start = mudaDeparture(tx, playerId, vehicleId, v.type);
  const hold = applyBpsFloor(
    BigInt(capacityOf(h, v.type, s)),
    10_000 + houseEffect(h, "capacity", s, { vehicleId }),
  );
  if (!Number.isInteger(qty) || qty <= 0 || qty > Number(hold)) fail("invalid_quantity");
  // The port of arrival must trade the good: its cities ask it, or its Dogana takes it.
  if (dest.produces[good] === undefined && dest.demands[good] === undefined)
    fail("unknown_resource");
  const r = s.regions.find((x) => x.code === from);
  const ref = r?.produces[good] ?? r?.demands[good];
  // Its own goods held at the counters of the port of departure (the map that grows).
  const posts = postsIn(h, s, from);
  const held = heldAt(tx, h, playerId, posts, good);
  const own = Math.min(qty, held);
  const before = tx.s.accounts[cashAccount(playerId)] ?? 0n;
  const bought = own < qty && ref !== undefined ? buyAt(tx, playerId, good, qty - own, from) : 0;
  const carried = own + bought;
  if (carried <= 0) fail("insufficient_stock");
  takeFrom(tx, h, playerId, posts, good, carried, "empire_voyage");
  const paid = before - (tx.s.accounts[cashAccount(playerId)] ?? 0n);
  const ownValue = ref !== undefined ? priceAt(ref, 10_000, s) * BigInt(own) : 0n;
  const hours = routeHours(from, to, spec.speedBps + houseEffect(h, "speed", s, { vehicleId }), s);
  v.busyUntil = start + 2 * hours * HOUR_MS;
  const voyage: EmpireVoyage = {
    id: nextId(tx, "y"),
    house: playerId,
    vehicleId,
    good,
    qty: carried,
    from,
    to,
    arrivesAt: start + hours * HOUR_MS,
    cost: paid + ownValue,
  };
  // The insurance: its premium destroyed now, against the risk of the way there.
  const premium = insurancePremium(voyage.cost, to, s);
  if (insured && premium > 0n) {
    transfer(tx, cashAccount(playerId), SINK_ACCOUNT, premium, "empire_insurance", voyage.id);
    voyage.insured = true;
  }
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
    const owner = tx.s.empire.houses[v.house];
    if (!owner) continue;
    // Unloaded at the port's first counter: what neither the orders nor the Dogana take stays there.
    const s = empireSettings(tx.ctx);
    const post = wherePut(owner, s, v.to);
    putAt(tx, owner, v.house, post, v.good, v.qty, "empire_voyage", v.id);
    // A colleganza's return: what the traveller's purse gains at the arrival.
    const purse = tx.s.accounts[cashAccount(v.house)] ?? 0n;
    const lost = corsairsTake(tx, v);
    // Its captain grows with each voyage.
    for (const m of tx.s.empire.houses[v.house]?.staff ?? [])
      if (m.placedAt === v.vehicleId) gainXp(m, s.staff.xpPerLevel, s);
    const left = v.qty - lost;
    const delivered = fillOrders(tx, v.house, v.good, left, v.to, [post]);
    sellAt(tx, v.house, v.good, left - delivered, v.to, [post]);
    if (v.colleganza)
      returnSeaColleganza(tx, v, (tx.s.accounts[cashAccount(v.house)] ?? 0n) - purse);
  }
}

/** The insurance's premium of a cargo of this value to a region: risk × value × the premium's rate. */
export function insurancePremium(value: Deniers, to: string, s: EmpireSettings): Deniers {
  const risk = corsairRiskBps(to, 0, s);
  return (value * BigInt(risk) * BigInt(s.corsairs.premiumBps)) / 100_000_000n;
}

/**
 * The corsairs (CADRAGE-v3 § 3 sexies), at the arrival: a draw on the world's seed and the voyage
 * against its region's risk (none in Venetia, more far away); an attack takes a share of the
 * cargo, never the ship, and an insured voyage has the units back at the reference. The escort
 * comes with the armed galleys.
 */
function corsairsTake(tx: Tx, v: EmpireVoyage): number {
  const s = empireSettings(tx.ctx);
  const risk = corsairRiskBps(v.to, 0, s);
  if (risk <= 0 || draw(tx.ctx, `corsairs:${v.id}`) % 10_000 >= risk) return 0;
  const lost = Math.floor((v.qty * s.corsairs.lossShareBps) / 10_000);
  if (lost <= 0) return 0;
  const owner = tx.s.empire?.houses[v.house];
  if (owner)
    takeAt(tx, owner, v.house, wherePut(owner, s, v.to), v.good, lost, "empire_corsairs", v.id);
  if (v.insured) {
    const r = s.regions.find((x) => x.code === v.to);
    const ref = r?.demands[v.good] ?? r?.produces[v.good] ?? 0n;
    if (ref > 0n)
      transfer(
        tx,
        SOURCE_ACCOUNT,
        cashAccount(v.house),
        ref * BigInt(lost),
        "empire_insurance",
        v.id,
      );
  }
  emit(tx, "empire_corsairs", v.house, { voyage: v.id, lost, insured: v.insured === true });
  return lost;
}

/** A voyage's expected margin a unit, for the view: the port's price less the cost, after tax. */
export function marginPerUnit(arrival: bigint, departure: bigint, taxBps: number): bigint {
  return applyBpsFloor(arrival, 10_000 - taxBps) - applyBpsFloor(departure, 10_000 + taxBps);
}
