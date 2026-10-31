import { DENIERS_PER_DUCAT, type Deniers } from "../../money.js";
import type { CombatVehicle, EmpireHouse, EmpirePorta, PlayerId } from "../../state.js";
import { type Tx, addStock, fail, removeStock } from "../../tx.js";
import { carnetWeek } from "../carnet.js";
import { capacityOf } from "../fleet.js";
import { empireSettings, openSite, ownHouse } from "../house.js";
import { cellDistance, checkDepot, ensureMap, regionCells, revealedOf } from "../map.js";
import type { EmpireSettings } from "../settings.js";
import { receive } from "../trade.js";
import { armStats } from "./arms.js";
import type { BattleEntrant } from "./battle/map.js";
import type { BattleOutcome } from "./battle/sim.js";
import { RARITIES, type Rarity } from "./settings.js";

/**
 * The Porta (docs/plan-porta.md §§ 3, 7–9): put down on the map like the Remise, raised to open
 * the tiers; the vehicles sent there from the Remise and back; a battle entered with a combat
 * vehicle and a transport, its victuals paid; its outcome settled (the vehicles lost, the relics
 * brought out, the tier won); the relics sold to the antiquarian, their points to the week.
 */

/** A land vehicle held at the Porta keeps its `busyUntil` here: never free for the deliveries. */
const HELD = Number.MAX_SAFE_INTEGER;

const ducats = (n: number | bigint): Deniers => BigInt(n) * DENIERS_PER_DUCAT;

function buildingOf(s: EmpireSettings) {
  const b = s.porta.building;
  if (!b) fail("unknown_building_type");
  return b;
}

function portaOf(h: EmpireHouse): EmpirePorta {
  if (!h.porta) fail("no_porta");
  return h.porta;
}

/**
 * Puts the Porta down on a land cell the house sees, from its Casa: a sector holds several
 * buildings, as the Remise and the Campo share theirs.
 */
export function buildPorta(tx: Tx, playerId: PlayerId, cell: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const b = buildingOf(s);
  const c = s.map.cells[cell];
  if (!c) fail("unknown_cell");
  if (!revealedOf(h, s).has(cell)) fail("hidden_cell");
  if (h.porta || h.builds.some((x) => x.kind === "porta")) fail("built");
  if (h.casa < b.casa) fail("requirement_unmet");
  const site = openSite(tx, playerId, h, ducats(b.costDucats), {}, b.minutes, 0);
  h.builds.push({ kind: "porta", level: 1, region: c.region, cell, ...site });
}

/** The price of the Porta's next level, or null at the last tier. */
export function portaUpgradeCost(h: EmpireHouse, s: EmpireSettings): Deniers | null {
  const b = s.porta.building;
  if (!b || !h.porta || h.porta.level >= s.porta.tiers.length) return null;
  return ducats(b.levelCostDucats) * 2n ** BigInt(h.porta.level);
}

/** Raises the Porta a level: a site of so many minutes a level. */
export function upgradePorta(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const b = buildingOf(s);
  const porta = portaOf(h);
  if (h.builds.some((x) => x.kind === "porta")) fail("building_busy");
  const cost = portaUpgradeCost(h, s);
  if (cost === null) fail("max_level");
  const site = openSite(tx, playerId, h, cost, {}, b.levelMinutes * porta.level, 0);
  h.builds.push({ kind: "porta", level: porta.level + 1, cell: porta.cell, ...site });
}

/** Minutes of the way between the Remise and the Porta. */
export function portaTravelMinutes(h: EmpireHouse, s: EmpireSettings): number {
  const b = buildingOf(s);
  const from = h.depot ?? regionCells(s, "veneto")[0];
  const cells = h.porta && from ? cellDistance(from, h.porta.cell) : 1;
  return Math.max(1, cells) * b.travelMinutesPerCell;
}

/** Is a tier open to the house: its Porta's level, and the tier before it won. */
export const tierOpen = (h: EmpireHouse, tier: number) =>
  !!h.porta && tier >= 1 && h.porta.level >= tier && h.porta.best >= tier - 1;

const landOf = (h: EmpireHouse, id: string) => h.vehicles?.find((v) => v.id === id);
const combatOf = (h: EmpireHouse, id: string) => h.arms?.vehicles.find((v) => v.id === id);
const landVehicle = (s: EmpireSettings, type: string) =>
  s.vehicles[type] !== undefined && !s.vehicles[type]?.build;

/** Sends vehicles from the Remise to the Porta: land vehicles that are free, combat vehicles home. */
export function sendToPorta(tx: Tx, playerId: PlayerId, ids: string[]): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  checkDepot(h, s);
  portaOf(h);
  const arrivesAt = tx.now + portaTravelMinutes(h, s) * 60_000;
  for (const id of new Set(ids)) {
    const land = landOf(h, id);
    const combat = combatOf(h, id);
    if (land) {
      if (!landVehicle(s, land.type)) fail("unknown_vehicle");
      if (land.porta || land.busyUntil > tx.now) fail("vehicle_busy");
      land.porta = { arrivesAt };
      land.busyUntil = HELD;
    } else if (combat) {
      if (combat.porta || (combat.backAt ?? 0) > tx.now) fail("vehicle_busy");
      combat.porta = { arrivesAt };
      combat.backAt = undefined;
    } else fail("unknown_vehicle");
  }
}

/** Calls vehicles at the Porta back to the Remise, outside a battle. */
export function recallFromPorta(tx: Tx, playerId: PlayerId, ids: string[]): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const back = tx.now + portaTravelMinutes(h, s) * 60_000;
  for (const id of new Set(ids)) {
    const v = landOf(h, id) ?? combatOf(h, id);
    if (!v?.porta) fail("unknown_vehicle");
    if (v.porta.battle || v.porta.arrivesAt > tx.now) fail("vehicle_busy");
    v.porta = undefined;
    if ("busyUntil" in v) v.busyUntil = back;
    else (v as CombatVehicle).backAt = back;
  }
}

/** A vehicle docked at the Porta, out of a battle. */
const docked = (v: { porta?: { arrivesAt: number; battle?: string } } | undefined, now: number) =>
  !!v?.porta && !v.porta.battle && v.porta.arrivesAt <= now;

/** The victuals a battle of a tier asks, for its two vehicles. */
export function entryCost(tier: number, s: EmpireSettings): number {
  return (s.porta.tiers[tier - 1]?.breadPerVehicle ?? 0) * 2;
}

/**
 * Enters a battle (plan-porta.md § 7): a combat vehicle and a transport docked at the Porta, a
 * tier the house has opened, its victuals paid (destroyed, at the stock journal).
 */
export function enterPorta(
  tx: Tx,
  playerId: PlayerId,
  battleId: string,
  tier: number,
  combatId: string,
  transportId: string,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const porta = portaOf(h);
  if (porta.battle) fail("vehicle_busy");
  if (!s.porta.tiers[tier - 1] || !tierOpen(h, tier)) fail("requirement_unmet");
  const combat = combatOf(h, combatId);
  const transport = landOf(h, transportId);
  if (!combat || !transport || !landVehicle(s, transport.type)) fail("unknown_vehicle");
  if (!docked(combat, tx.now) || !docked(transport, tx.now)) fail("vehicle_busy");
  const paid = entryCost(tier, s);
  removeStock(tx, playerId, buildingOf(s).entryGood, paid, "empire_porta", battleId);
  if (combat.porta) combat.porta.battle = battleId;
  if (transport.porta) transport.porta.battle = battleId;
  porta.battle = { id: battleId, tier, combatId, transportId, paid };
}

/** What a house brings into a battle: its combat vehicle at its strength, its transport's hold. */
export function portaEntrant(h: EmpireHouse, playerId: PlayerId, s: EmpireSettings): BattleEntrant {
  const b = h.porta?.battle;
  const transport = b && landOf(h, b.transportId);
  if (!b || !transport) throw new RangeError("not in a battle");
  return {
    id: playerId,
    combat: { vehicleId: b.combatId, stats: armStats(h, b.combatId, s) },
    transport: { vehicleId: b.transportId, hold: capacityOf(h, transport.type, s) },
  };
}

/** Frees the vehicles of the house's battle, on the Porta's quay. */
function release(h: EmpireHouse) {
  for (const v of [...(h.vehicles ?? []), ...(h.arms?.vehicles ?? [])])
    if (v.porta?.battle) v.porta.battle = undefined;
  if (h.porta) h.porta.battle = undefined;
}

/** Destroys a vehicle lost in the lands of Rome, a combat vehicle with its components. */
function destroy(h: EmpireHouse, vehicleId: string) {
  if (h.vehicles?.some((v) => v.id === vehicleId))
    h.vehicles = h.vehicles.filter((v) => v.id !== vehicleId);
  const arms = h.arms;
  const v = arms?.vehicles.find((x) => x.id === vehicleId);
  if (!arms || !v) return;
  const fitted = new Set(v.slots.filter((x): x is string => x !== null));
  arms.vehicles = arms.vehicles.filter((x) => x.id !== vehicleId);
  arms.components = arms.components.filter((c) => !fitted.has(c.id));
}

/**
 * Settles a battle's outcome for the house (plan-porta.md § 8): the vehicles that came out stay
 * at the Porta at full strength, the others are destroyed with their components and cargo; the
 * relics brought out are kept; a tier won opens the next.
 */
export function settlePorta(
  tx: Tx,
  playerId: PlayerId,
  battleId: string,
  outcome: BattleOutcome,
): void {
  const h = ownHouse(tx, playerId);
  const porta = portaOf(h);
  const b = porta.battle;
  if (!b || b.id !== battleId) fail("not_here");
  const ours = new Set([b.combatId, b.transportId]);
  for (const v of outcome.vehicles)
    if (ours.has(v.vehicleId) && v.outcome !== "exited") destroy(h, v.vehicleId);
  for (const r of outcome.relics)
    if (RARITIES.includes(r)) porta.relics[r] = (porta.relics[r] ?? 0) + 1;
  if (outcome.relics.length > 0) porta.best = Math.max(porta.best, b.tier);
  release(h);
}

/** A battle undone (the server restarted): the vehicles freed, the victuals given back. */
export function cancelPorta(tx: Tx, playerId: PlayerId, battleId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const b = portaOf(h).battle;
  if (!b || b.id !== battleId) fail("not_here");
  addStock(tx, playerId, buildingOf(s).entryGood, b.paid, "empire_porta", battleId);
  release(h);
}

/** The house's points of the current week. */
export function weekPoints(h: EmpireHouse, now: number): number {
  const w = h.porta?.week;
  return w && w.index === carnetWeek(now) ? w.points : 0;
}

/** Sells relics to the antiquarian, at the Porta: ducats by rarity, and the week's points. */
export function sellRelics(tx: Tx, playerId: PlayerId, rarity: Rarity, qty: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const porta = portaOf(h);
  const spec = s.porta.relics?.[rarity];
  if (!spec) fail("unknown_arm");
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  if ((porta.relics[rarity] ?? 0) < qty) fail("insufficient_stock");
  porta.relics[rarity] = (porta.relics[rarity] ?? 0) - qty;
  receive(tx, playerId, ducats(spec.priceDucats) * BigInt(qty), "porta");
  const index = carnetWeek(tx.now);
  porta.week = { index, points: weekPoints(h, tx.now) + spec.points * qty };
}
