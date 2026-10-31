import {
  type EmpireHouse,
  type EmpireWorkshop,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
} from "../state.js";
import { type Tx, fail } from "../tx.js";

/** A rate raised by an effect in bps. */
const applyBps = (base: number, bps: number) => Math.floor((base * (10_000 + bps)) / 10_000);
import { lotYieldBps } from "./curves.js";
import { houseEffect } from "./effects.js";
import { empireSettings, ownHouse } from "./house.js";
import { highRecipeRaw } from "./recipes.js";
import type { EmpireSettings } from "./settings.js";
import { gainXp } from "./staff.js";
import { putAt, storeOf, takeAt, workshopPost } from "./stores.js";

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
  const h = ownHouse(tx, playerId);
  const yieldBps = applyBps(
    lotYieldBps(ws.level, s),
    houseEffect(h, "workshopYield", s, { workshopId: ws.id }) + neighbourBonus(tx.ctx, h, ws, s),
  );
  // A share of the lots comes out better (the master), a share of those exquisite.
  const quality = Math.min(10_000, houseEffect(h, "quality", s, { workshopId: ws.id }));
  for (const [good, qty = 0] of Object.entries(recipe.outputs)) {
    const made = Math.floor((qty * done * yieldBps) / 10_000);
    const better = Math.floor((made * quality) / 10_000);
    const exquisite = Math.floor((better * s.qualities.exquisiteShareBps) / 10_000);
    // Into its counter's stock (the map that grows).
    const post = workshopPost(h, s, ws);
    putAt(tx, h, playerId, post, good, made - better, "production_output", ws.id);
    putAt(tx, h, playerId, post, `${good}:fine`, better - exquisite, "production_output", ws.id);
    putAt(tx, h, playerId, post, `${good}:exquisite`, exquisite, "production_output", ws.id);
  }
  // Its master grows with the lots of its workshop.
  for (const m of h.staff ?? []) if (m.placedAt === ws.id) gainXp(m, done, s);
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
  const place = { workshopId: ws.id };
  // The apprentices make a lot quicker; a queue under way keeps its pace.
  const speed = houseEffect(h, "workshopSpeed", s, place);
  const fresh = Math.round(
    (Math.max(1, r.durationMinutes) * MINUTE_MS * 10_000) / (10_000 + speed),
  );
  const batchMs = ws.job?.batchMs ?? fresh;
  const queueEnd = ws.job ? ws.job.startedAt + ws.job.batches * batchMs : tx.now;
  let add = Math.floor((tx.now + s.queueHours * HOUR_MS - queueEnd) / batchMs);
  // The furnace saves inputs: a share of a lot's, in whole units over the queue.
  const saved = Math.min(9_000, houseEffect(h, "inputs", s, place));
  // From its counter's stock (the map that grows).
  const post = workshopPost(h, s, ws);
  const held = (good: string) => storeOf(tx, h, playerId, post, good);
  const need = (per: number, lots: number) => Math.ceil((per * lots * (10_000 - saved)) / 10_000);
  for (const [good, per = 0] of Object.entries(r.inputs))
    if (per > 0) while (add > 0 && need(per, add) > held(good)) add--;
  // A high recipe also eats Venetia's raw goods, the ones it does not make (CADRAGE-v3 § 12 bis).
  const raws = s.highRecipes.goods.filter((g) => !(g in r.outputs));
  const rawHeld = raws.reduce((n, g) => n + held(g), 0);
  while (add > 0 && highRecipeRaw(ws.level, add, s) > rawHeld) add--;
  if (add <= 0) return;
  for (const [good, per = 0] of Object.entries(r.inputs))
    takeAt(tx, h, playerId, post, good, need(per, add), "production_input", ws.id);
  let raw = highRecipeRaw(ws.level, add, s);
  for (const g of [...raws].sort((a, b) => held(b) - held(a))) {
    const take = Math.min(raw, held(g));
    takeAt(tx, h, playerId, post, g, take, "production_input", ws.id);
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

/** The places a workshop has for modules, by its level. */
export function moduleSlotsOf(level: number, s: EmpireSettings, h?: EmpireHouse): number {
  // The master's workshop (bottega maestra) gives a place more.
  return (
    s.workshops.moduleSlotsAt.filter((at) => level >= at).length +
    houseEffect(h, "moduleSlotsExtra", s)
  );
}

/** Fits a researched workshop module in one of a workshop's places: free, at once, once each. */
export function fitModule(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  slot: number,
  code: string,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const ws = h.workshops.find((w) => w.id === workshopId);
  if (!ws) fail("unknown_building");
  const m = s.modules.find((x) => x.code === code);
  if (!m || m.kind !== "workshop" || !(h.modules?.[code] ?? 0)) fail("unknown_building_type");
  if (!Number.isInteger(slot) || slot < 0 || slot >= moduleSlotsOf(ws.level, s, h)) fail("no_room");
  const fitted = [...(ws.fitted ?? [])];
  if (fitted.some((x, i) => x === code && i !== slot)) fail("built");
  fitted[slot] = code;
  ws.fitted = fitted;
}

/** Does one workshop make what the other takes in? */
function feeds(ctx: WorldContext, a: EmpireWorkshop, b: EmpireWorkshop): boolean {
  const of = (w: EmpireWorkshop) =>
    ctx.theme.recipes.find((x) => x.code === w.recipe && x.building === w.type);
  const out = Object.keys(of(a)?.outputs ?? {});
  return Object.keys(of(b)?.inputs ?? {}).some((g) => out.includes(g));
}

/**
 * The neighbourhood's bonus (profondeur.md § G): the workshops of a region sit in a ring on its
 * orbit, in their order; each neighbour whose chain follows this one's (it feeds it, or is fed by
 * it) adds its share. The order is a little puzzle.
 */
export function neighbourBonus(
  ctx: WorldContext,
  h: EmpireHouse,
  ws: EmpireWorkshop,
  s: EmpireSettings,
): number {
  const ring = h.workshops.filter((w) => (w.region ?? "veneto") === (ws.region ?? "veneto"));
  const i = ring.findIndex((w) => w.id === ws.id);
  if (i < 0 || ring.length < 2) return 0;
  const sides = new Set([ring[(i + 1) % ring.length], ring[(i - 1 + ring.length) % ring.length]]);
  sides.delete(ws);
  let links = 0;
  for (const n of sides) if (n && (feeds(ctx, n, ws) || feeds(ctx, ws, n))) links++;
  return (
    links * s.workshops.neighbourBps * (1 + Math.floor(houseEffect(h, "neighbour", s) / 10_000))
  );
}

/** Swaps the places of two workshops of a region on its orbit: free, at once. */
export function swapWorkshops(tx: Tx, playerId: PlayerId, a: string, b: string): void {
  const h = ownHouse(tx, playerId);
  const i = h.workshops.findIndex((w) => w.id === a);
  const j = h.workshops.findIndex((w) => w.id === b);
  const wa = h.workshops[i];
  const wb = h.workshops[j];
  if (!wa || !wb || i === j) fail("unknown_building");
  if ((wa.region ?? "veneto") !== (wb.region ?? "veneto")) fail("unknown_region");
  h.workshops[i] = wb;
  h.workshops[j] = wa;
}
