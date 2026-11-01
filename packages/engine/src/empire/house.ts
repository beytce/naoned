import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  DAY_MS,
  type EmpireHouse,
  type EmpireState,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  escrowAccount,
} from "../state.js";
import { type Tx, fail, nextId, removeStock, transfer } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { catchupCut } from "./catchup.js";
import { buildMinutesOf, casaLevelOf, casaRequirementMet, levelCost } from "./curves.js";
import { houseEffect } from "./effects.js";
import { settleLearning } from "./knowledge.js";
import { ensureMap, settlePost } from "./map.js";
import { researchCost, researchMinutesOf } from "./modules.js";
import type { EmpireSettings } from "./settings.js";
import { HOME_POST, putAt, storeOf, takeAt, wherePut } from "./stores.js";

/** The empire's settings, or a refusal in a world of the monthly seasons. */
export function empireSettings(ctx: WorldContext): EmpireSettings {
  const s = ctx.settings.empire;
  if (!s) fail("not_empire_world");
  return s;
}

function empireState(tx: Tx): EmpireState {
  empireSettings(tx.ctx);
  if (!tx.s.empire) tx.s.empire = { houses: {} };
  return tx.s.empire as EmpireState;
}

export function ownHouse(tx: Tx, playerId: PlayerId): EmpireHouse {
  const h = empireState(tx).houses[playerId];
  if (!h) fail("unknown_player");
  return h;
}

/** A house sleeps after so many days without an action (CADRAGE-v3 § 6); it wakes at the next. */
export function isAsleep(h: EmpireHouse, now: number, s: EmpireSettings): boolean {
  return now - h.lastActionAt >= s.sleepAfterDays * DAY_MS;
}

/** Applies the researches that ended by `now`: their modules' new levels. */
function settleResearch(h: EmpireHouse, now: number): void {
  const done = (h.research ?? []).filter((r) => r.endsAt <= now);
  if (done.length === 0) return;
  h.research = (h.research ?? []).filter((r) => r.endsAt > now);
  const modules = { ...(h.modules ?? {}) };
  for (const r of done) modules[r.code] = Math.max(modules[r.code] ?? 0, r.level);
  h.modules = modules;
}

/** Applies the building sites (and the researches) that ended by `now`, in the order they end. */
export function settleBuilds(h: EmpireHouse, now: number): void {
  settleResearch(h, now);
  settleLearning(h, now);
  const done = h.builds.filter((b) => b.endsAt <= now).sort((a, b) => a.endsAt - b.endsAt);
  if (done.length === 0) return;
  h.builds = h.builds.filter((b) => b.endsAt > now);
  for (const b of done) {
    if (b.kind === "casa") {
      if (b.level > h.casa) advanceCarnet(h, "casa", 1);
      h.casa = Math.max(h.casa, b.level);
    } else if (b.kind === "newWorkshop" && b.workshopId && b.workshopType && b.recipe) {
      // Its region rides on the build (Venetia when it says none).
      h.workshops.push({
        id: b.workshopId,
        ...(b.region ? { region: b.region } : {}),
        type: b.workshopType,
        recipe: b.recipe,
        level: 1,
        job: null,
      });
      advanceCarnet(h, "levels", 1);
    } else if (b.kind === "ship" && b.vehicleType && b.vehicleId) {
      // A ship of the Arsenal, launched.
      h.vehicles = [...(h.vehicles ?? []), { id: b.vehicleId, type: b.vehicleType, busyUntil: 0 }];
    } else if (b.kind === "post" && b.cell && b.region) {
      settlePost(h, b.cell, b.region, b.reveal ?? [b.cell], { id: b.post, x: b.x, y: b.y });
    } else if (b.kind === "arsenal" && b.cell) {
      h.arsenal = b.cell;
    } else if (b.kind === "camp" && b.cell) {
      h.camp = b.cell;
    } else if (b.kind === "depot" && b.cell) {
      h.depot = b.cell;
    } else if (b.kind === "depot") {
      // The Remise raised: a greater fleet.
      h.depotLevel = Math.max(h.depotLevel ?? 1, b.level);
    } else if (b.kind === "porta" && b.cell) {
      // The Porta put down, then raised (docs/plan-porta.md § 3).
      if (!h.porta)
        h.porta = { cell: b.cell, level: 1, best: 0, relics: {}, week: { index: 0, points: 0 } };
      else h.porta.level = Math.max(h.porta.level, b.level);
    } else if (b.kind === "counter" && b.post === "home") {
      h.homeLevel = Math.max(h.homeLevel ?? 1, b.level);
    } else if (b.kind === "counter" && b.region) {
      // A counter of the map raised, and its region's level with it (its best counter's).
      const post = b.post ? h.posts?.find((p) => p.id === b.post) : undefined;
      if (post) post.level = Math.max(post.level ?? 1, b.level);
      else {
        const first = h.posts?.find((p) => p.region === b.region);
        if (first) first.level = Math.max(first.level ?? 1, b.level);
      }
      h.counters = {
        ...(h.counters ?? {}),
        [b.region]: Math.max(h.counters?.[b.region] ?? 0, b.level),
      };
    } else if (b.kind === "upgrade") {
      const ws = h.workshops.find((x) => x.id === b.workshopId);
      if (ws && b.level > ws.level) {
        ws.level = b.level;
        advanceCarnet(h, "levels", 1);
      }
    }
  }
}

/** A house as it stands at `now`, its ended sites settled: for the view, the state untouched. */
export function empireHouseAt(
  _ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): EmpireHouse | null {
  const h = state.empire?.houses[playerId];
  if (!h) return null;
  const copy = structuredClone(h);
  settleBuilds(copy, now);
  return copy;
}

/** The share of the awake houses that pass a test, in bps: « le savoir circule ». */
function shareOwningBps(tx: Tx, owns: (h: EmpireHouse) => boolean): number {
  const s = empireSettings(tx.ctx);
  const houses = Object.values(empireState(tx).houses);
  // What the others finished counts at once, though they have not played since.
  for (const h of houses) settleBuilds(h, tx.now);
  const awake = houses.filter((h) => !isAsleep(h, tx.now, s));
  if (awake.length === 0) return 0;
  return Math.floor((awake.filter(owns).length * 10_000) / awake.length);
}

function checkRecipe(tx: Tx, type: string, recipe: string): void {
  if (!tx.ctx.theme.buildings.some((b) => b.type === type)) fail("unknown_building_type");
  if (!tx.ctx.theme.recipes.some((r) => r.code === recipe && r.building === type))
    fail("unknown_recipe");
}

/** A new house: the Casa 1, its capital and its first workshops. */
export function empireJoin(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const empire = empireState(tx);
  if (tx.s.players[playerId] || empire.houses[playerId]) fail("player_exists");
  for (const w of s.start.workshops) checkRecipe(tx, w.type, w.recipe);
  tx.s.players[playerId] = {
    id: playerId,
    region: tx.ctx.theme.regions[0]?.code ?? "veneto",
    joinedAt: tx.now,
    lastActionAt: tx.now,
  };
  tx.s.accounts[cashAccount(playerId)] = 0n;
  tx.s.accounts[escrowAccount(playerId)] = 0n;
  tx.s.inventories[playerId] = {};
  empire.houses[playerId] = {
    casa: 1,
    joinedAt: tx.now,
    lastActionAt: tx.now,
    workshops: s.start.workshops.map((w) => ({
      id: nextId(tx, "w"),
      type: w.type,
      recipe: w.recipe,
      level: 1,
      job: null,
    })),
    builds: [],
    favour: 0,
    seals: 0,
    ...(s.start.vehicles.length > 0
      ? { vehicles: s.start.vehicles.map((type) => ({ id: nextId(tx, "v"), type, busyUntil: 0 })) }
      : {}),
  };
  const capital = BigInt(s.start.capitalDucats) * DENIERS_PER_DUCAT;
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), capital, "starting_capital");
}

/** Opens a site: checks its slot, pays its cost and its materials, cut by the catch-up. */
export function openSite(
  tx: Tx,
  playerId: PlayerId,
  h: EmpireHouse,
  cost: Deniers,
  materials: Record<string, number>,
  minutes: number,
  shareBps: number,
): { startedAt: number; endsAt: number } {
  const s = empireSettings(tx.ctx);
  if (h.builds.length >= casaLevelOf(h.casa, s).buildSlots) fail("no_build_slot");
  const cut = catchupCut(shareBps, s);
  const price = applyBpsFloor(cost, 10_000 - cut.costCutBps);
  // The materials come from Venice's stock, where the house builds.
  for (const [good, qty] of Object.entries(materials))
    takeAt(tx, h, playerId, HOME_POST, good, qty, "empire_build");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, price, "empire_build");
  const quicker = Math.min(9_000, cut.timeCutBps + houseEffect(h, "buildTime", s));
  const ms = Math.round((minutes * MINUTE_MS * (10_000 - quicker)) / 10_000);
  advanceCarnet(h, "sites", 1);
  return { startedAt: tx.now, endsAt: tx.now + ms };
}

/** Starts the next level of the Casa. */
export function startCasa(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (h.builds.some((b) => b.kind === "casa")) fail("building_busy");
  const level = h.casa + 1;
  if (level > s.casa.length) fail("max_level");
  const line = casaLevelOf(level, s);
  if (
    !casaRequirementMet(
      level,
      h.workshops.map((w) => w.level),
      s,
    )
  )
    fail("requirement_unmet");
  const share = shareOwningBps(tx, (x) => x.casa >= level);
  const site = openSite(tx, playerId, h, line.costDucats, line.materials, line.buildMinutes, share);
  h.builds.push({ kind: "casa", level, ...site });
}

/** A workshop's region: Venetia when it says none. */
export const regionOfWorkshop = (w: { region?: string }) => w.region ?? "veneto";

/** The workshop places of a region: the Casa's in Venetia, its counter's elsewhere (none without). */
export function workshopPlaces(h: EmpireHouse, region: string, s: EmpireSettings): number {
  if (region === "veneto") return casaLevelOf(h.casa, s).workshopSlots;
  if (!h.counters?.[region]) return 0;
  return s.regions.find((r) => r.code === region)?.workshopSlots ?? 0;
}

/**
 * Starts a new workshop at level 1, in a free place of its region: the Casa's in Venetia, the
 * counter's elsewhere, where it makes no raw good the region does not make.
 */
export function startWorkshop(
  tx: Tx,
  playerId: PlayerId,
  type: string,
  recipe: string,
  region = "veneto",
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  checkRecipe(tx, type, recipe);
  const r = s.regions.find((x) => x.code === region);
  if (!r || (region !== "veneto" && !h.counters?.[region])) fail("unknown_region");
  const def = tx.ctx.theme.recipes.find((x) => x.code === recipe);
  const raw = def && Object.keys(def.inputs).length === 0;
  if (region !== "veneto" && raw && !Object.keys(def.outputs).some((g) => g in r.produces))
    fail("unknown_recipe");
  const here = h.workshops.filter((w) => regionOfWorkshop(w) === region).length;
  const pending = h.builds.filter(
    (b) => b.kind === "newWorkshop" && (b.region ?? "veneto") === region,
  ).length;
  if (here + pending >= workshopPlaces(h, region, s)) fail("no_room");
  const share = shareOwningBps(tx, (x) => x.workshops.some((w) => w.level >= 1));
  const site = openSite(tx, playerId, h, levelCost(1, s), {}, buildMinutesOf(1, s), share);
  h.builds.push({
    kind: "newWorkshop",
    level: 1,
    workshopId: nextId(tx, "w"),
    workshopType: type,
    recipe,
    ...(region !== "veneto" ? { region } : {}),
    ...site,
  });
}

/** Starts a workshop's next level, never past the Casa's. */
export function startUpgrade(tx: Tx, playerId: PlayerId, workshopId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const ws = h.workshops.find((w) => w.id === workshopId);
  if (!ws) fail("unknown_building");
  if (h.builds.some((b) => b.workshopId === workshopId)) fail("building_busy");
  const level = ws.level + 1;
  if (level > workshopTop(h, ws.type, s)) fail("max_level");
  const share = shareOwningBps(tx, (x) => x.workshops.some((w) => w.level >= level));
  const site = openSite(tx, playerId, h, levelCost(level, s), {}, buildMinutesOf(level, s), share);
  h.builds.push({ kind: "upgrade", level, workshopId, ...site });
}

/** A region beyond Venetia, from the settings, or a refusal. */
function farRegion(tx: Tx, code: string) {
  const r = empireSettings(tx.ctx).regions.find((x) => x.code === code);
  if (!r || r.hoursFromVenice === 0) fail("unknown_region");
  return r;
}

/**
 * Raises a counter one level: its private book grows with it, and on a map with a reach, its
 * reach. `code` names a region (its first counter), a counter put down, or « home », Venice's.
 */
export function upgradeCounter(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  ensureMap(h, s);
  const post = code === "home" ? null : (h.posts ?? []).find((p) => p.id === code);
  if (code === "home" || post) {
    if (h.builds.some((b) => b.kind === "counter" && b.post === code)) fail("building_busy");
    const level = code === "home" ? (h.homeLevel ?? 1) : (post?.level ?? 1);
    if (level >= s.counters.maxLevel) fail("max_level");
    const cost = counterCostOf(h, levelCost(level + 1, s) * BigInt(s.counters.costTimes), s);
    const site = openSite(tx, playerId, h, cost, {}, buildMinutesOf(level + 2, s), 0);
    h.builds.push({
      kind: "counter",
      level: level + 1,
      region: post?.region ?? "veneto",
      post: code,
      ...site,
    });
    return;
  }
  farRegion(tx, code);
  const level = h.counters?.[code];
  if (!level) fail("unknown_region");
  if (h.builds.some((b) => b.kind === "counter" && b.region === code)) fail("building_busy");
  if (level >= s.counters.maxLevel) fail("max_level");
  const cost = counterCostOf(h, levelCost(level + 1, s) * BigInt(s.counters.costTimes), s);
  const site = openSite(tx, playerId, h, cost, {}, buildMinutesOf(level + 2, s), 0);
  h.builds.push({ kind: "counter", level: level + 1, region: code, ...site });
}

/**
 * Researches a module's next level at the Scuola (profondeur.md § B.4): a place of research of
 * the Casa, its cost and its time; the levels that ask plans wait for the relics.
 */
export function startResearch(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const m = s.modules.find((x) => x.code === code);
  if (!m || (s.research.available.length > 0 && !s.research.available.includes(code)))
    fail("unknown_building_type");
  if (!openedFor(h, m.kind, s)) fail("requirement_unmet");
  if ((h.research ?? []).some((r) => r.code === code)) fail("building_busy");
  if ((h.research ?? []).length >= casaLevelOf(h.casa, s).researchSlots) fail("no_build_slot");
  const level = (h.modules?.[code] ?? 0) + 1;
  if (level > s.research.minutes.length) fail("max_level");
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    researchCost(level, s),
    "empire_research",
    code,
  );
  const ms = researchMinutesOf(level, s) * MINUTE_MS;
  h.research = [...(h.research ?? []), { code, level, startedAt: tx.now, endsAt: tx.now + ms }];
}

/** What a kind of module waits for: the workshops' open with the Casa that opens them. */
const OPENS_KIND: Record<string, string> = { workshop: "workshopModules" };

/** Has the house reached the Casa that opens this kind of module (none named: open)? */
function openedFor(h: EmpireHouse, kind: string, s: EmpireSettings): boolean {
  const code = OPENS_KIND[kind];
  const at = code ? s.casa.findIndex((c) => c.opens.includes(code)) : -1;
  return at < 0 || h.casa >= at + 1;
}

/**
 * The level a workshop may reach: the Casa's, and, for its Arte's chain once the Casa is at its
 * top, the Arte's own top; never the settings' bound.
 */
export function workshopTop(h: EmpireHouse, type: string, s: EmpireSettings): number {
  const arte = s.arte.artes.find((a) => a.code === h.arte);
  const top = arte?.buildings.includes(type) && h.casa >= s.casa.length ? s.arte.topLevel : h.casa;
  return Math.min(top, s.workshops.maxLevel);
}

/**
 * Chooses the house's Arte (or its minor Arte), from their Casa. Changing the Arte costs a
 * renunciation: the old chain's workshops above a level fall back to it.
 */
export function chooseArte(tx: Tx, playerId: PlayerId, code: string, minor = false): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const arte = s.arte.artes.find((a) => a.code === code);
  if (!arte) fail("unknown_choice");
  if (h.casa < (minor ? s.arte.minorFromCasa : s.arte.fromCasa)) fail("requirement_unmet");
  if (minor) {
    if (code === h.arte || code === h.minorArte) fail("built");
    h.minorArte = code;
    return;
  }
  if (code === h.arte) fail("built");
  const old = s.arte.artes.find((a) => a.code === h.arte);
  if (old)
    for (const ws of h.workshops)
      if (old.buildings.includes(ws.type)) ws.level = Math.min(ws.level, s.arte.renounceLevel);
  h.arte = code;
  if (h.minorArte === code) h.minorArte = undefined;
}

/** A charter's Favour, less the house's diplomacy (letters, embassy). */
export function charterFavourOf(h: EmpireHouse, favour: number, s: EmpireSettings): number {
  const cut = Math.min(10_000, houseEffect(h, "charterCut", s));
  return Math.ceil((favour * (10_000 - cut)) / 10_000);
}

/** A counter's ducats, less the house's pacts. */
export function counterCostOf(h: EmpireHouse, cost: Deniers, s: EmpireSettings): Deniers {
  return applyBpsFloor(cost, 10_000 - Math.min(10_000, houseEffect(h, "counterCut", s)));
}
