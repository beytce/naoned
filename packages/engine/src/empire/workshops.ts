import { type EmpireWorkshop, HOUR_MS, MINUTE_MS, type PlayerId } from "../state.js";
import { type Tx, addStock, fail, inventoryLine, removeStock } from "../tx.js";
import { lotYieldBps } from "./curves.js";
import { empireSettings, ownHouse } from "./house.js";
import { highRecipeRaw } from "./recipes.js";

function recipeOf(tx: Tx, ws: EmpireWorkshop) {
  const r = tx.ctx.theme.recipes.find((x) => x.code === ws.recipe && x.building === ws.type);
  if (!r) fail("unknown_recipe");
  return r;
}

/**
 * Gives the lots done by `now`, Y(n) times the recipe's outputs at the workshop's level: a level
 * finished counts for every lot not yet taken.
 */
export function collectWorkshop(tx: Tx, playerId: PlayerId, ws: EmpireWorkshop): void {
  const job = ws.job;
  if (!job) return;
  const done = Math.min(job.batches, Math.floor((tx.now - job.startedAt) / job.batchMs));
  if (done <= 0) return;
  const s = empireSettings(tx.ctx);
  const recipe = recipeOf(tx, ws);
  const yieldBps = lotYieldBps(ws.level, s);
  for (const [good, qty = 0] of Object.entries(recipe.outputs))
    addStock(
      tx,
      playerId,
      good,
      Math.floor((qty * done * yieldBps) / 10_000),
      "production_output",
      ws.id,
    );
  job.batches -= done;
  job.startedAt += done * job.batchMs;
  if (job.batches === 0) ws.job = null;
}

/**
 * Takes what is done, then fills the night queue up to `queueHours` from now, as far as the
 * inputs allow (taken at once). A full queue makes no more: absence costs nothing, gives no more.
 */
export function relaunchWorkshop(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  recipe?: string,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const ws = h.workshops.find((w) => w.id === workshopId);
  if (!ws) fail("unknown_building");
  collectWorkshop(tx, playerId, ws);
  if (recipe !== undefined && recipe !== ws.recipe) {
    if (!tx.ctx.theme.recipes.some((r) => r.code === recipe && r.building === ws.type))
      fail("unknown_recipe");
    if (ws.job) fail("building_busy");
    ws.recipe = recipe;
  }
  const r = recipeOf(tx, ws);
  const batchMs = Math.max(1, r.durationMinutes) * MINUTE_MS;
  const queueEnd = ws.job ? ws.job.startedAt + ws.job.batches * batchMs : tx.now;
  let add = Math.floor((tx.now + s.queueHours * HOUR_MS - queueEnd) / batchMs);
  for (const [good, per = 0] of Object.entries(r.inputs))
    if (per > 0) add = Math.min(add, Math.floor(inventoryLine(tx, playerId, good).available / per));
  // A high recipe also eats Venetia's raw goods, the ones it does not make (CADRAGE-v3 § 12 bis).
  const raws = s.highRecipes.goods.filter((g) => !(g in r.outputs));
  const rawHeld = raws.reduce((n, g) => n + inventoryLine(tx, playerId, g).available, 0);
  while (add > 0 && highRecipeRaw(ws.level, add, s) > rawHeld) add--;
  if (add <= 0) return;
  for (const [good, per = 0] of Object.entries(r.inputs))
    removeStock(tx, playerId, good, per * add, "production_input", ws.id);
  let raw = highRecipeRaw(ws.level, add, s);
  for (const g of [...raws].sort(
    (a, b) => inventoryLine(tx, playerId, b).available - inventoryLine(tx, playerId, a).available,
  )) {
    const take = Math.min(raw, inventoryLine(tx, playerId, g).available);
    removeStock(tx, playerId, g, take, "production_input", ws.id);
    raw -= take;
  }
  if (ws.job) ws.job.batches += add;
  else ws.job = { recipe: ws.recipe, startedAt: tx.now, batches: add, level: ws.level, batchMs };
}

export function relaunchAll(tx: Tx, playerId: PlayerId): void {
  // Raw goods first: what they make feeds the workshops that follow.
  const h = ownHouse(tx, playerId);
  const order = [...h.workshops].sort(
    (a, b) =>
      Object.keys(recipeOf(tx, a).inputs).length - Object.keys(recipeOf(tx, b).inputs).length,
  );
  for (const ws of order) relaunchWorkshop(tx, playerId, ws.id);
}
