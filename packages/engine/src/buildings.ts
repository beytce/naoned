import { type Deniers, applyBpsFloor } from "./money.js";
import {
  type Building,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

export interface BuildingCost {
  ducats: Deniers;
  materials: Record<string, number>;
}

/** Cost to reach `level` (1 = new building). Level L costs base × (1 + (L − 1) × growth). */
export function costForLevel(ctx: WorldContext, type: string, level: number): BuildingCost {
  const def = ctx.settings.buildings[type];
  if (!def) fail("unknown_building_type");
  const factorBps = 10_000 + (level - 1) * ctx.settings.levelCostGrowthBps;
  const materials: Record<string, number> = {};
  for (const [res, qty] of Object.entries(def.costMaterials)) {
    materials[res] = Math.ceil((qty * factorBps) / 10_000);
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

export function upkeepPerDay(ctx: WorldContext, building: Building): Deniers {
  const def = ctx.settings.buildings[building.type];
  const level = BigInt(building.level);
  const growthBps = 10_000 + (building.level - 1) * ctx.settings.upkeepLevelGrowthBps;
  return applyBpsFloor((def?.upkeepPerDay ?? 0n) * level, growthBps);
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
  if (buildingsOf(tx, playerId).length >= tx.ctx.settings.maxBuildings) fail("max_buildings");
  const cost = costForLevel(tx.ctx, type, 1);
  const building = grantBuilding(tx, playerId, type);
  payCost(tx, playerId, cost, building.id);
  emit(tx, "build", playerId, { building: building.id, type });
  return building;
}

export function upgrade(tx: Tx, building: Building): void {
  if (building.level >= tx.ctx.settings.maxBuildingLevel) fail("max_level");
  checkRegion(tx, building.playerId, building.type);
  const cost = costForLevel(tx.ctx, building.type, building.level + 1);
  payCost(tx, building.playerId, cost, building.id);
  building.level += 1;
  building.investedValue += costValue(tx.ctx, cost);
  emit(tx, "upgrade", building.playerId, { building: building.id, level: building.level });
}
