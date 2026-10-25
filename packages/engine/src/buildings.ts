import { type Deniers, applyBpsFloor } from "./money.js";
import {
  type Building,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { recipesFor } from "./theme.js";
import { turnoverOf } from "./turnover.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";
import { isUnlocked } from "./unlocks.js";

export interface BuildingCost {
  ducats: Deniers;
  materials: Record<string, number>;
}

/** Cost to reach `level` (1 = new building). Level L costs base × (1 + (L − 1) × growth). */
export function costForLevel(ctx: WorldContext, type: string, level: number): BuildingCost {
  const def = ctx.settings.buildings[type];
  if (!def) fail("unknown_building_type");
  const factorBps = 10_000 + (level - 1) * ctx.settings.levelCostGrowthBps;
  // Some levels may ask fewer materials (an easier first step), never fewer ducats.
  const materialsBps = ctx.settings.upgradeMaterialsBps[String(level)] ?? 10_000;
  const materials: Record<string, number> = {};
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    materials[res] = Math.ceil((qty * factorBps * materialsBps) / 100_000_000);
  }
  return { ducats: applyBpsFloor(def.costDucats, factorBps), materials };
}

/** Cost valued in deniers, materials at reference price. */
export function costValue(ctx: WorldContext, cost: BuildingCost): Deniers {
  let value = cost.ducats;
  for (const [res, qty] of Object.entries(cost.materials)) {
    value += (ctx.settings.referencePrices[res] ?? 0n) * BigInt(qty);
  }
  return value;
}

/** Output of a workshop at `level`, in ten-thousandths of a level-1 workshop's (yield bonus included). */
function outputBps(ctx: WorldContext, level: number): number {
  if (level <= 0) return 0;
  return level * (10_000 + (level - 1) * ctx.settings.levelYieldBonusBps);
}

/** Output a step from `level` adds (from 0: a new workshop), in ten-thousandths of a level 1's. */
export function addedOutputBps(ctx: WorldContext, level: number): number {
  return outputBps(ctx, level + 1) - outputBps(ctx, level);
}

/**
 * What a unit of output costs when bought by a step from `level` (0: building), materials at
 * reference prices: the lower, the better the investment.
 */
export function costPerOutput(ctx: WorldContext, type: string, level: number): Deniers {
  const added = BigInt(Math.max(1, addedOutputBps(ctx, level)));
  return (costValue(ctx, costForLevel(ctx, type, level + 1)) * 10_000n) / added;
}

/** Batches a workshop is reckoned to start a day, for the bread kept back (E1-4). */
const BATCHES_A_DAY = 12;

/**
 * Bread the player's workers eat a day: so much per level of a workshop (the palazzo eats none),
 * and with rations by the batch, what twelve batches a day of each workshop would eat.
 */
export function rationsPerDay(
  ctx: WorldContext,
  buildings: Building[],
  playerId: PlayerId,
): number {
  const r = ctx.settings.rations;
  let levels = 0;
  let quarters = 0;
  for (const b of buildings) {
    if (b.playerId !== playerId || b.type === "palazzo") continue;
    levels += b.level;
    const transforms = recipesFor(ctx.theme, b.type).some((x) => Object.keys(x.inputs).length > 0);
    quarters +=
      b.level *
      BATCHES_A_DAY *
      (transforms ? r.perBatchQuarters.transform : r.perBatchQuarters.raw);
  }
  return levels * r.perLevelPerDay + Math.floor(quarters / 4);
}

function payCost(tx: Tx, playerId: PlayerId, cost: BuildingCost, ref: string): void {
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, cost.ducats, "construction", ref);
  for (const [res, qty] of Object.entries(cost.materials)) {
    removeStock(tx, playerId, res, qty, "construction", ref);
  }
}

/** Creates a building without paying for it (starting kit). */
export function grantBuilding(tx: Tx, playerId: PlayerId, type: string): Building {
  if (!tx.ctx.theme.buildings.some((b) => b.type === type)) fail("unknown_building_type");
  const id = nextId(tx, "b");
  const building: Building = {
    id,
    playerId,
    type,
    level: 1,
    job: null,
    investedValue: costValue(tx.ctx, costForLevel(tx.ctx, type, 1)),
    fastBatchesLeft: 0,
  };
  tx.s.buildings[id] = building;
  return tx.s.buildings[id] as Building;
}

export function buildingsOf(tx: Tx, playerId: PlayerId): Building[] {
  return Object.values(tx.s.buildings).filter((b) => b.playerId === playerId) as Building[];
}

/** Raw materials are local: some buildings belong to some regions only. */
export function allowedHere(ctx: WorldContext, region: string, type: string): boolean {
  const regions = ctx.settings.buildingRegions[type];
  return !regions || regions.includes(region);
}

function checkRegion(tx: Tx, playerId: PlayerId, type: string): void {
  const region = tx.s.players[playerId]?.region ?? "";
  if (!allowedHere(tx.ctx, region, type)) fail("wrong_region");
}

export function build(tx: Tx, playerId: PlayerId, type: string): Building {
  if (!tx.ctx.theme.buildings.some((b) => b.type === type)) fail("unknown_building_type");
  checkRegion(tx, playerId, type);
  if (!isUnlocked(tx.ctx, tx.s as WorldState, playerId, type)) fail("locked");
  if (buildingsOf(tx, playerId).length >= tx.ctx.settings.maxBuildings) fail("max_buildings");
  const cost = costForLevel(tx.ctx, type, 1);
  const building = grantBuilding(tx, playerId, type);
  payCost(tx, playerId, cost, building.id);
  emit(tx, "build", playerId, { building: building.id, type });
  return building;
}

/**
 * The level a workshop works at: its level, but a manufacture on the quality path keeps the
 * batches of the last ordinary level.
 */
export function workLevel(ctx: WorldContext, building: Building): number {
  return building.path === "quality"
    ? Math.min(building.level, ctx.settings.maxBuildingLevel)
    : building.level;
}

/** The highest level a workshop may reach now. */
export function topLevel(ctx: WorldContext, building: Building): number {
  const m = ctx.settings.manufacture;
  return m && building.path ? m.maxLevel : ctx.settings.maxBuildingLevel;
}

/**
 * The cities pay a merchant's goods more for the quality of its manufactures: the best of the
 * workshops making the good on the quality path, per level past the last ordinary one.
 */
export function qualityBps(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  resource: string,
): number {
  const m = ctx.settings.manufacture;
  if (!m) return 0;
  let best = 0;
  for (const b of Object.values(state.buildings)) {
    if (b.playerId !== playerId || b.path !== "quality") continue;
    if (!ctx.theme.recipes.some((r) => r.building === b.type && (r.outputs[resource] ?? 0) > 0))
      continue;
    best = Math.max(best, (b.level - ctx.settings.maxBuildingLevel) * m.qualityBpsPerLevel);
  }
  return best;
}

/** A manufacture's path, chosen once at the last ordinary level. */
export function choosePath(tx: Tx, building: Building, path: "volume" | "quality"): void {
  const m = tx.ctx.settings.manufacture;
  if (!m || building.type === "palazzo") fail("not_ready");
  if (building.path) fail("path_chosen");
  if (building.level < tx.ctx.settings.maxBuildingLevel) fail("not_ready");
  if (turnoverOf(tx.s as WorldState, building.playerId) < m.unlock) fail("locked");
  building.path = path;
  emit(tx, "manufacture_path", building.playerId, { building: building.id, path });
}

export function upgrade(tx: Tx, building: Building): void {
  if (
    building.level >= tx.ctx.settings.maxBuildingLevel &&
    !building.path &&
    tx.ctx.settings.manufacture &&
    building.type !== "palazzo"
  )
    fail("choose_path");
  if (building.level >= topLevel(tx.ctx, building)) fail("max_level");
  checkRegion(tx, building.playerId, building.type);
  const cost = costForLevel(tx.ctx, building.type, building.level + 1);
  payCost(tx, building.playerId, cost, building.id);
  building.level += 1;
  building.investedValue += costValue(tx.ctx, cost);
  emit(tx, "upgrade", building.playerId, { building: building.id, level: building.level });
}
