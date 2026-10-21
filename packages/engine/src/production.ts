import { marketYieldBps } from "./acts.js";
import { workLevel } from "./buildings.js";
import { applyBonusToQuantity, applyBpsFloor } from "./money.js";
import { specialtyEffects } from "./specialties.js";
import {
  type Building,
  HOUR_MS,
  MINUTE_MS,
  type Player,
  type WorldContext,
  type WorldState,
} from "./state.js";
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
  bonus += marketYieldBps(ctx, at, resource);
  const late = ctx.settings.lateJoiner;
  const lateFrom = ctx.startAt + late.afterDay * 24 * HOUR_MS;
  if (player.joinedAt >= lateFrom && at < player.joinedAt + late.hours * HOUR_MS) {
    bonus += late.bonusBps;
  }
  return Math.max(-10_000, bonus);
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
  const batchMs = job.batchMs;
  const done = Math.min(job.batches, Math.floor((tx.now - job.startedAt) / batchMs));
  if (done <= 0) return;

  // Mastery: a master of the workshop makes more of what they transform.
  const transform =
    Object.keys(recipe.inputs).length > 0
      ? specialtyEffects(tx.ctx, tx.s as WorldState, building.playerId).transformYieldBps
      : 0;
  for (const [resource, perBatch] of Object.entries(recipe.outputs)) {
    let total = 0;
    for (let k = 0; k < done; k++) {
      const completedAt = job.startedAt + (k + 1) * batchMs;
      const base = (perBatch ?? 0) * job.level;
      // Specialisation: each level above the first adds to the yield.
      const levelBonus = (job.level - 1) * tx.ctx.settings.levelYieldBonusBps;
      // Fresh produce: collected soon after the batch was done.
      // The same for everyone: the Pass Négociant never adds to a harvest.
      const fresh = tx.ctx.settings.fresh;
      const freshBonus =
        fresh.minutes > 0 && tx.now - completedAt <= fresh.minutes * 60_000 ? fresh.bonusBps : 0;
      total += applyBonusToQuantity(
        base,
        yieldBonusBps(tx.ctx, player, resource, completedAt) + levelBonus + freshBonus + transform,
      );
    }
    addStock(tx, building.playerId, resource, total, "production_output", building.id);
  }

  job.startedAt += done * batchMs;
  job.batches -= done;
  if (job.batches === 0) building.job = null;
  emit(tx, "harvest", building.playerId, { building: building.id, batches: done });
}

/** Tutorial: in the first minutes, a single batch of a starting building finishes in seconds. */
export function fastBatchNext(
  ctx: WorldContext,
  building: Building,
  player: Player,
  now: number,
): boolean {
  return (
    !building.job &&
    building.fastBatchesLeft > 0 &&
    now < player.joinedAt + ctx.settings.tutorial.minutes * MINUTE_MS
  );
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

  collect(tx, building);
  const normalMs = batchDuration(tx.ctx, player, recipe.durationMinutes, tx.now);
  const job = building.job;
  if (
    job &&
    (job.recipe !== recipeCode ||
      job.level !== workLevel(tx.ctx, building) ||
      job.batchMs !== normalMs)
  ) {
    fail("building_busy");
  }

  const tutorial = tx.ctx.settings.tutorial;
  const fast = batches === 1 && fastBatchNext(tx.ctx, building, player, tx.now);
  const batchMs = fast ? tutorial.fastBatchSeconds * 1000 : normalMs;

  const queuedEnd = job ? job.startedAt + job.batches * batchMs : tx.now;
  const newEnd = queuedEnd + batches * batchMs;
  if (newEnd - tx.now > tx.ctx.settings.productionQueueMaxHours * HOUR_MS) fail("queue_full");

  for (const [resource, perBatch] of Object.entries(recipe.inputs)) {
    const qty = (perBatch ?? 0) * workLevel(tx.ctx, building) * batches;
    removeStock(tx, building.playerId, resource, qty, "production_input", building.id);
  }

  if (fast) building.fastBatchesLeft -= 1;
  if (job) job.batches += batches;
  else {
    building.job = {
      recipe: recipeCode,
      startedAt: tx.now,
      batches,
      level: workLevel(tx.ctx, building),
      batchMs,
    };
  }
  emit(tx, "production_started", building.playerId, {
    building: building.id,
    recipe: recipeCode,
    batches,
  });
}

/** Duration of a normal batch for this player now: longer while workers lack rations. */
export function batchDuration(
  ctx: WorldContext,
  player: Player,
  minutes: number,
  now: number,
): number {
  const base = minutes * MINUTE_MS;
  if (now >= (player.hungryUntil ?? 0)) return base;
  return Number(applyBpsFloor(BigInt(base), 10_000 + ctx.settings.rations.slowdownBps));
}

/** Number of batches that still fit in the queue of a building for a recipe. */
export function freeBatches(
  ctx: WorldContext,
  building: Building,
  recipeCode: string,
  now: number,
  player?: Player,
) {
  const recipe = findRecipe(ctx.theme, recipeCode);
  if (!recipe) return 0;
  const batchMs = player
    ? batchDuration(ctx, player, recipe.durationMinutes, now)
    : recipe.durationMinutes * MINUTE_MS;
  const job = building.job;
  const sameQueue =
    job &&
    job.recipe === recipeCode &&
    job.level === workLevel(ctx, building) &&
    job.batchMs === batchMs;
  const jobEnd = job ? job.startedAt + job.batches * job.batchMs : now;
  if (job && !sameQueue && jobEnd > now) return 0;
  const queuedEnd = job && sameQueue ? Math.max(now, jobEnd) : now;
  const room = ctx.settings.productionQueueMaxHours * HOUR_MS - (queuedEnd - now);
  return Math.max(0, Math.floor(room / batchMs));
}

export function defaultRecipe(ctx: WorldContext, building: Building): string | undefined {
  return recipesFor(ctx.theme, building.type)[0]?.code;
}
