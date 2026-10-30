import { GAME_TIME_ZONE, offsetAt } from "../clock.js";
import { draw } from "../draw.js";
import { DENIERS_PER_DUCAT } from "../money.js";
import {
  type CarnetKind,
  type CarnetObjective,
  DAY_MS,
  type EmpireHouse,
  type PlayerId,
  type WorldContext,
} from "../state.js";
import { type Tx, fail } from "../tx.js";
import { houseEffect } from "./effects.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";

const WEEK_MS = 7 * DAY_MS;
/** Monday 5 January 1970, 00:00: the weeks of the Carnet start on Mondays, at midnight in Venice. */
const MONDAY = 4 * DAY_MS;

export const carnetWeek = (now: number) =>
  Math.floor((now + offsetAt(now, GAME_TIME_ZONE) - MONDAY) / WEEK_MS);

/** Adds to the objectives of a kind, this week's and those carried from the last. */
export function advanceCarnet(h: EmpireHouse, kind: CarnetKind, amount: number): void {
  if (!h.carnet || amount <= 0) return;
  for (const o of [...h.carnet.objectives, ...h.carnet.carried])
    if (o.kind === kind && !o.claimed) o.progress = Math.min(o.target, o.progress + amount);
}

/**
 * The week's objectives, at the measure of the house: an easy and a harder one of each kind but
 * the Casa; the easy relaunch and the next Casa always, the rest drawn by the world's seed.
 */
function drawCarnet(
  ctx: WorldContext,
  playerId: PlayerId,
  h: EmpireHouse,
  week: number,
  s: EmpireSettings,
): CarnetObjective[] {
  const c = Math.max(1, h.casa);
  const next = s.casa[h.casa]?.costDucats ?? s.casa.at(-1)?.costDucats ?? 0n;
  const earn = Math.max(50, Number(next / DENIERS_PER_DUCAT));
  const goal = (kind: CarnetKind, target: number): CarnetObjective => ({
    kind,
    target: Math.max(1, Math.round(target)),
    progress: 0,
    claimed: false,
  });
  const always = [goal("relaunch", 3), goal("casa", 1)];
  const pool = [
    goal("relaunch", 10),
    goal("deliver", 10 * c),
    goal("deliver", 40 * c),
    goal("sell", 10 * c),
    goal("sell", 30 * c),
    goal("sites", 2),
    goal("sites", 5),
    goal("levels", 1),
    goal("levels", 3),
    goal("earn", earn),
    goal("earn", 3 * earn),
  ];
  const keyed = pool.map((o, i) => ({ o, k: draw(ctx, `carnet:${week}:${playerId}:${i}`) }));
  keyed.sort((a, b) => a.k - b.k);
  const extra = houseEffect(h, "carnetExtra", s);
  return [...always, ...keyed.map((x) => x.o)].slice(0, s.carnet.objectives + extra);
}

/** The carnet a house would find now: this week's, or the next one drawn as it will be. */
export function carnetPreview(
  ctx: WorldContext,
  playerId: PlayerId,
  h: EmpireHouse,
  now: number,
  s: EmpireSettings,
): {
  week: number;
  objectives: CarnetObjective[];
  carried: CarnetObjective[];
  windUntil: number | null;
} {
  const week = carnetWeek(now);
  const c = h.carnet?.week === week ? h.carnet : nextCarnet(ctx, playerId, h, week, s);
  return { week, objectives: c.objectives, carried: c.carried, windUntil: h.windUntil ?? null };
}

function nextCarnet(
  ctx: WorldContext,
  playerId: PlayerId,
  h: EmpireHouse,
  week: number,
  s: EmpireSettings,
) {
  const previous = h.carnet?.week === week - 1 ? h.carnet.objectives : [];
  const carried = previous
    .filter((o) => !o.claimed)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, s.carnet.carryOver)
    .map((o) => ({ ...o }));
  return { week, objectives: drawCarnet(ctx, playerId, h, week, s), carried, full: false };
}

/** Opens the week's carnet when the week turns, keeping last week's best unclaimed to catch up. */
export function ensureCarnet(tx: Tx, playerId: PlayerId, h: EmpireHouse): void {
  const s = empireSettings(tx.ctx);
  const week = carnetWeek(tx.now);
  if (h.carnet?.week === week) return;
  h.carnet = nextCarnet(tx.ctx, playerId, h, week, s);
}

/** Back after a long absence: a following wind for a few days. */
export function windOnReturn(tx: Tx, h: EmpireHouse): void {
  const s = empireSettings(tx.ctx);
  if (tx.now - h.lastActionAt >= s.carnet.windAfterDays * DAY_MS)
    h.windUntil = tx.now + s.carnet.windDays * DAY_MS;
}

/**
 * Claims an objective met (this week's, then the carried ones by their index after): Favour,
 * doubled in a following wind, and the Seal of the full carnet once.
 */
export function claimObjective(tx: Tx, playerId: PlayerId, index: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const c = h.carnet;
  if (!c) fail("too_early");
  const o = c.objectives[index] ?? c.carried[index - c.objectives.length];
  if (!o) fail("unknown_choice");
  if (o.claimed) fail("already_paid");
  if (o.progress < o.target) fail("too_early");
  o.claimed = true;
  const wind = (h.windUntil ?? 0) > tx.now ? 2 : 1;
  const more = houseEffect(h, "carnetFavour", s);
  h.favour += Math.floor((s.carnet.favourPerObjective * wind * (10_000 + more)) / 10_000);
  if (!c.full && c.objectives.every((x) => x.claimed)) {
    c.full = true;
    h.seals += s.carnet.sealForFull;
  }
}
