import { applyBonusToQuantity } from "./money.js";
import { type Building, HOUR_MS, MINUTE_MS, type Player, type WorldContext } from "./state.js";
import { findRecipe, findRegion, recipesFor } from "./theme.js";
import { type Tx, addStock, emit, fail, removeStock } from "./tx.js";

/** Yield bonus in bps for one batch completing at `at`. */
export function yieldBonusBps(
  ctx: WorldContext,
  player: Player,
  resource: string,
  at: number,
): number {
  let bonus = 0;
  if (findRegion(ctx.theme, player.region)?.bonusResource === resource) {
    bonus += ctx.settings.regionBonusBps;
  }
  const late = ctx.settings.lateJoiner;
  const lateFrom = ctx.startAt + late.afterDay * 24 * HOUR_MS;
  if (player.joinedAt >= lateFrom && at < player.joinedAt + late.hours * HOUR_MS) {
    bonus += late.bonusBps;
  }
  return bonus;
}

/**
 * Lazy production: credits every batch finished by `tx.now`. Production is never advanced by the
 * tick, so the result does not depend on how often this is called.
 */
export function collect(tx: Tx, building: Building): void {
  const job = building.job;
  if (!job) return;
  const recipe = findRecipe(tx.ctx.theme, job.recipe);
  if (!recipe) fail("unknown_recipe");
  const player = tx.s.players[building.playerId];
  if (!player) fail("unknown_player");
  const batchMs = recipe.durationMinutes * MINUTE_MS;
  const done = Math.min(job.batches, Math.floor((tx.now - job.startedAt) / batchMs));
  if (done <= 0) return;

  for (const [resource, perBatch] of Object.entries(recipe.outputs)) {
    let total = 0;
    for (let k = 0; k < done; k++) {
      const completedAt = job.startedAt + (k + 1) * batchMs;
      const base = (perBatch ?? 0) * job.level;
      total += applyBonusToQuantity(base, yieldBonusBps(tx.ctx, player, resource, completedAt));
    }
    addStock(tx, building.playerId, resource, total, "production_output", building.id);
  }

  job.startedAt += done * batchMs;
  job.batches -= done;
  if (job.batches === 0) building.job = null;
  emit(tx, "harvest", building.playerId, { building: building.id, batches: done });
}

export function startProduction(
  tx: Tx,
  building: Building,
  recipeCode: string,
  batches: number,
): void {
  if (!Number.isInteger(batches) || batches <= 0) fail("invalid_quantity");
  const recipe = findRecipe(tx.ctx.theme, recipeCode);
  if (!recipe || recipe.building !== building.type) fail("unknown_recipe");
  const player = tx.s.players[building.playerId];
  if (!player) fail("unknown_player");
  if (tx.now < player.upkeepDefaultUntil) fail("upkeep_default");

  collect(tx, building);
  const batchMs = recipe.durationMinutes * MINUTE_MS;
  const job = building.job;
  if (job && (job.recipe !== recipeCode || job.level !== building.level)) fail("building_busy");

  const queuedEnd = job ? job.startedAt + job.batches * batchMs : tx.now;
  const newEnd = queuedEnd + batches * batchMs;
  if (newEnd - tx.now > tx.ctx.settings.productionQueueMaxHours * HOUR_MS) fail("queue_full");

  for (const [resource, perBatch] of Object.entries(recipe.inputs)) {
    const qty = (perBatch ?? 0) * building.level * batches;
    removeStock(tx, building.playerId, resource, qty, "production_input", building.id);
  }

  if (job) job.batches += batches;
  else building.job = { recipe: recipeCode, startedAt: tx.now, batches, level: building.level };
  emit(tx, "production_started", building.playerId, {
    building: building.id,
    recipe: recipeCode,
    batches,
  });
}

/** Number of batches that still fit in the queue of a building for a recipe. */
export function freeBatches(
  ctx: WorldContext,
  building: Building,
  recipeCode: string,
  now: number,
) {
  const recipe = findRecipe(ctx.theme, recipeCode);
  if (!recipe) return 0;
  const batchMs = recipe.durationMinutes * MINUTE_MS;
  const job = building.job;
  const sameQueue = job && job.recipe === recipeCode && job.level === building.level;
  if (job && !sameQueue) {
    const end = job.startedAt + job.batches * batchMs;
    if (end > now) return 0;
  }
  let queuedEnd = now;
  if (job && sameQueue) {
    const done = Math.min(job.batches, Math.floor((now - job.startedAt) / batchMs));
    queuedEnd = Math.max(now, job.startedAt + job.batches * batchMs);
    if (done === job.batches) queuedEnd = now;
  }
  const room = ctx.settings.productionQueueMaxHours * HOUR_MS - (queuedEnd - now);
  return Math.max(0, Math.floor(room / batchMs));
}

export function defaultRecipe(ctx: WorldContext, building: Building): string | undefined {
  return recipesFor(ctx.theme, building.type)[0]?.code;
}
