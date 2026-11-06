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
import { tilesTouch } from "./grid.js";
import { empireSettings, ownHouse } from "./house.js";
import {
  interiorByproduct,
  interiorPaceBps,
  interiorQualityBps,
  interiorXp,
  settleInterior,
} from "./interior/run.js";
import { giveWelcomeOrder, welcomeOrderId } from "./orders.js";
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
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  // Its inside's wear and fatigue first, while the queue still tells when it ran.
  settleInterior(ws, h, s, tx.now);
  const job = ws.job;
  if (!job) return;
  const done = Math.min(job.batches, Math.floor((tx.now - job.startedAt) / job.batchMs));
  if (done <= 0) return;
  const recipe = recipeOf(tx, ws);
  const yieldBps = applyBps(
    lotYieldBps(ws.level, s),
    houseEffect(h, "workshopYield", s, { workshopId: ws.id }) + neighbourBonus(tx.ctx, h, ws, s),
  );
  // A share of the lots comes out better (the master), a share of those exquisite.
  const quality = Math.min(
    10_000,
    houseEffect(h, "quality", s, { workshopId: ws.id }) + interiorQualityBps(ws, h, s, tx.now),
  );
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
  // What falls aside (the sawdust), when the theme knows the good.
  const by = interiorByproduct(ws, done, s);
  if (by && tx.ctx.theme.resources.some((r) => r.code === by.good))
    putAt(tx, h, playerId, workshopPost(h, s, ws), by.good, by.qty, "production_output", ws.id);
  // Its master grows with the lots of its workshop, and its hands.
  for (const m of h.staff ?? []) if (m.placedAt === ws.id) gainXp(m, done, s);
  interiorXp(ws, done, s);
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
  const fresh = freshBatchMs(tx, h, ws, s);
  // An inside that cannot work (a station without its hands) queues nothing; nor does the
  // welcome's quick lot until it is done (lot 2).
  if (!ws.job && fresh === null) return;
  if (ws.job?.once) return;
  const batchMs = ws.job?.batchMs ?? (fresh as number);
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
  // The welcome (the first steps, lot 2): the first lot of its workshop in seconds, alone in its
  // queue, and an order of welcome waiting for exactly it in the nearest town.
  if (
    !ws.job &&
    add > 0 &&
    h.welcome &&
    !h.welcome.batch &&
    s.welcome &&
    ws.type === s.welcome.workshop.type
  ) {
    for (const [good, per = 0] of Object.entries(r.inputs))
      takeAt(tx, h, playerId, post, good, need(per, 1), "production_input", ws.id);
    ws.job = {
      recipe: ws.recipe,
      startedAt: tx.now,
      batches: 1,
      level: ws.level,
      batchMs: s.welcome.batchSeconds * 1_000,
      once: true,
    };
    h.welcome.batch = true;
    const [good, qty = 0] = Object.entries(r.outputs)[0] ?? [];
    const made = Math.floor((qty * lotYieldBps(ws.level, s)) / 10_000);
    const city = good ? giveWelcomeOrder(tx.ctx, h, playerId, s, good, made, tx.now) : null;
    if (city) h.welcome.order = welcomeOrderId(city);
    return;
  }
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

/**
 * A lot's length for a queue filled now: the recipe's, quicker with the apprentices, and at its
 * inside's pace (docs/plan-ateliers.md § 5.1); null while the inside cannot work.
 */
function freshBatchMs(
  tx: Tx,
  h: EmpireHouse,
  ws: EmpireWorkshop,
  s: EmpireSettings,
): number | null {
  const r = recipeOf(tx, ws);
  const speed = houseEffect(h, "workshopSpeed", s, { workshopId: ws.id });
  const pace = interiorPaceBps(ws, h, s, tx.now);
  if (pace <= 0) return null;
  return Math.max(
    1,
    Math.round(
      (Math.max(1, r.durationMinutes) * MINUTE_MS * 10_000 * 10_000) / ((10_000 + speed) * pace),
    ),
  );
}

/**
 * After a change inside: the lot under way ends when it would have, the lots after it take the new
 * pace (no going back on what is done, no gain on what is under way). A pace of nothing changes
 * nothing: the queue keeps the pace it was filled at.
 */
export function repaceWorkshop(tx: Tx, playerId: PlayerId, ws: EmpireWorkshop): void {
  const job = ws.job;
  if (!job) return;
  const fresh = freshBatchMs(tx, ownHouse(tx, playerId), ws, empireSettings(tx.ctx));
  if (fresh === null || fresh === job.batchMs) return;
  const firstEnds = job.startedAt + job.batchMs;
  job.batchMs = fresh;
  job.startedAt = firstEnds - fresh;
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
  let sides: Set<EmpireWorkshop | undefined>;
  if (ws.tile) {
    // On square tiles (D7): its neighbours are the workshops on the tiles beside it by a side.
    const at = ws.tile;
    sides = new Set(h.workshops.filter((w) => w !== ws && w.tile && tilesTouch(w.tile, at)));
  } else {
    const ring = h.workshops.filter((w) => (w.region ?? "veneto") === (ws.region ?? "veneto"));
    const i = ring.findIndex((w) => w.id === ws.id);
    if (i < 0 || ring.length < 2) return 0;
    sides = new Set([ring[(i + 1) % ring.length], ring[(i - 1 + ring.length) % ring.length]]);
    sides.delete(ws);
  }
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
  // On square tiles, the two exchange their tiles.
  if (wa.tile && wb.tile) {
    const t = wa.tile;
    wa.tile = wb.tile;
    wb.tile = t;
    return;
  }
  h.workshops[i] = wb;
  h.workshops[j] = wa;
}
