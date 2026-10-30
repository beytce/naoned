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
import { plansFor, researchCost, researchMinutesOf } from "./modules.js";
import type { EmpireSettings } from "./settings.js";

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
    } else if (b.kind === "counter" && b.region) {
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
function openSite(
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
  for (const [good, qty] of Object.entries(materials))
    removeStock(tx, playerId, good, qty, "empire_build");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, price, "empire_build");
  const ms = Math.round((minutes * MINUTE_MS * (10_000 - cut.timeCutBps)) / 10_000);
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
  if (level > h.casa || level > s.workshops.maxLevel) fail("max_level");
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
 * Buys a region's charter with Favour (CADRAGE-v3 § 3.4) and opens the site of its counter: the
 * opening voyage and the building, the hours from Venice and one more. Favour is no money: it only
 * leaves the house.
 */
export function charterRegion(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const r = farRegion(tx, code);
  if (h.counters?.[code] || h.builds.some((b) => b.kind === "counter" && b.region === code))
    fail("built");
  if (h.casa < r.casa) fail("requirement_unmet");
  if (h.favour < r.charterFavour) fail("insufficient_favour");
  const cost = levelCost(r.casa, s) * BigInt(s.counters.costTimes);
  const site = openSite(tx, playerId, h, cost, {}, r.hoursFromVenice * 60 + 60, 0);
  h.favour -= r.charterFavour;
  h.builds.push({ kind: "counter", level: 1, region: code, ...site });
}

/** Raises a counter one level: its private book grows with it. */
export function upgradeCounter(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  farRegion(tx, code);
  const level = h.counters?.[code];
  if (!level) fail("unknown_region");
  if (h.builds.some((b) => b.kind === "counter" && b.region === code)) fail("building_busy");
  if (level >= s.counters.maxLevel) fail("max_level");
  const cost = levelCost(level + 1, s) * BigInt(s.counters.costTimes);
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
  if (plansFor(level, s) > 0) fail("requirement_unmet");
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
