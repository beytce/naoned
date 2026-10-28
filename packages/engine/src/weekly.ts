import { dayStartIn } from "./clock.js";
import { commerceInfluence } from "./house.js";
import type { Deniers } from "./money.js";
import { DAY_MS, type PlayerId, type WorldContext, type WorldState, seasonEnd } from "./state.js";
import { payDividends } from "./shares.js";
import { nameSuppliers } from "./suppliers.js";
import { turnoverOf, turnoverPeakOf } from "./turnover.js";
import { type Tx, emit } from "./tx.js";
import { netWorth } from "./valuation.js";
import { closeWarehouseAuctions } from "./warehouses.js";

const WEEK_MS = 7 * DAY_MS;
const HOUR_MS = 3_600_000;

export interface WeeklyStanding {
  playerId: PlayerId;
  /** Net sales since the start of the week (or since joining), in deniers. */
  gain: Deniers;
}

/** A piece of week shorter than this, at either end of the season, joins its neighbour. */
const SHORT_WEEK_MS = 3 * DAY_MS;

const boundsCache = new WeakMap<WorldContext, number[]>();

/**
 * Where the season's weeks begin, and the season's end: every seven days from the start (the
 * last week running to the end of the month), or on Mondays at midnight in Paris, a piece of
 * fewer than three days at either end joined to the week beside it.
 */
export function weekBounds(ctx: WorldContext): number[] {
  const known = boundsCache.get(ctx);
  if (known) return known;
  const start = ctx.startAt;
  const end = seasonEnd(ctx);
  const bounds = [start];
  if (ctx.settings.weekStart === "monday") {
    let day = dayStartIn(start).start;
    while (dayStartIn(day + 12 * HOUR_MS).weekday !== 1 || day <= start)
      day = dayStartIn(day + 36 * HOUR_MS).start;
    const mondays: number[] = [];
    for (; day < end; day = dayStartIn(day + WEEK_MS + 12 * HOUR_MS).start) mondays.push(day);
    if (mondays.length > 0 && (mondays[0] as number) - start < SHORT_WEEK_MS) mondays.shift();
    if (mondays.length > 0 && end - (mondays.at(-1) as number) < SHORT_WEEK_MS) mondays.pop();
    bounds.push(...mondays);
  } else {
    const weeks = Math.max(1, Math.floor((end - start) / WEEK_MS));
    for (let k = 1; k < weeks; k++) bounds.push(start + k * WEEK_MS);
  }
  bounds.push(end);
  boundsCache.set(ctx, bounds);
  return bounds;
}

/** Weeks in the season (at least one); the last one runs to the end of the month. */
export function seasonWeeks(ctx: WorldContext): number {
  return weekBounds(ctx).length - 1;
}

export function weekIndex(ctx: WorldContext, at: number): number {
  const bounds = weekBounds(ctx);
  // Before the season: weeks counted back from its start.
  if (at < ctx.startAt) return Math.floor((at - ctx.startAt) / WEEK_MS);
  let k = 0;
  while (k < bounds.length - 2 && at >= (bounds[k + 1] as number)) k++;
  return k;
}

/** Start of a week of the season (a week past the season: seven days a week after its end). */
export function weekStart(ctx: WorldContext, week: number): number {
  const bounds = weekBounds(ctx);
  if (week < bounds.length - 1) return bounds[Math.max(0, week)] as number;
  return (bounds.at(-1) as number) + (week - (bounds.length - 1)) * WEEK_MS;
}

/** End of a week of the season: the last one runs to the end of the season. */
export function weekEnd(ctx: WorldContext, week: number): number {
  return weekStart(ctx, week + 1);
}

/** Live weekly ranking, best gain first. */
export function weeklyStandings(
  ctx: WorldContext,
  state: WorldState,
  now: number,
): WeeklyStanding[] {
  const start = state.weekly?.start ?? {};
  return Object.keys(state.players)
    .map((playerId) => {
      const sales = turnoverOf(state, playerId);
      return { playerId, gain: sales - (start[playerId] ?? sales) };
    })
    .sort((a, b) =>
      a.gain === b.gain ? a.playerId.localeCompare(b.playerId) : a.gain > b.gain ? -1 : 1,
    );
}

/** Final ranking of the season: net sales, best first (net worth reported beside them). */
export function seasonStandings(
  ctx: WorldContext,
  state: WorldState,
  now: number,
): { playerId: PlayerId; turnover: Deniers; worth: Deniers }[] {
  return Object.keys(state.players)
    .map((playerId) => ({
      playerId,
      turnover: turnoverOf(state, playerId),
      worth: netWorth(ctx, state, playerId, now).total,
    }))
    .sort((a, b) =>
      a.turnover === b.turnover
        ? a.playerId.localeCompare(b.playerId)
        : a.turnover > b.turnover
          ? -1
          : 1,
    );
}

/**
 * Scheduled: on the first tick after the end of the season, freezes the final ranking (event
 * `season_closed`). The caller hands out the rewards and opens the next season.
 */
export function closeSeason(tx: Tx): void {
  if (tx.s.seasonClosed || tx.now < seasonEnd(tx.ctx)) return;
  // Valued at the last moment of the season: nothing moves after it.
  const at = seasonEnd(tx.ctx) - 1;
  emit(tx, "season_closed", undefined, {
    standings: seasonStandings(tx.ctx, tx.s, at).map((s) => ({
      playerId: s.playerId,
      turnover: s.turnover.toString(),
      // The best mark of the season: what the merchant's level keeps (see `turnoverPeakOf`).
      turnoverPeak: turnoverPeakOf(tx.s as WorldState, s.playerId).toString(),
      worth: s.worth.toString(),
    })),
  });
  tx.s.seasonClosed = true;
}

/** Net sales a player starts the week with: now, on joining or restarting. */
export function startWeek(tx: Tx, playerId: PlayerId): void {
  const weekly = tx.s.weekly;
  if (!weekly) return;
  weekly.start[playerId] = turnoverOf(tx.s as WorldState, playerId);
}

function snapshot(tx: Tx): Record<PlayerId, Deniers> {
  const start: Record<PlayerId, Deniers> = {};
  for (const id of Object.keys(tx.s.players)) start[id] = turnoverOf(tx.s as WorldState, id);
  return start;
}

/**
 * Scheduled: on the first tick after a week boundary, publishes the ranking of the week that ended
 * (event `week_closed`) and starts the new week from everyone's current net sales.
 */
export function closeWeek(tx: Tx): void {
  // Once the season is over, the last week closes too.
  const week = tx.now >= seasonEnd(tx.ctx) ? seasonWeeks(tx.ctx) : weekIndex(tx.ctx, tx.now);
  const weekly = tx.s.weekly;
  if (!weekly) {
    tx.s.weekly = { week, start: snapshot(tx) };
    return;
  }
  if (weekly.week >= week) return;
  const standings = weeklyStandings(tx.ctx, tx.s, tx.now);
  emit(tx, "week_closed", undefined, {
    week: weekly.week,
    standings: standings.map((s) => ({ playerId: s.playerId, gain: s.gain.toString() })),
  });
  commerceInfluence(tx, weekly.week, standings);
  nameSuppliers(tx);
  closeWarehouseAuctions(tx);
  // The houses' holders share the week's gain (R9); out of the week's ranking, in the month's.
  payDividends(tx, standings);
  tx.s.weekly = { week, start: snapshot(tx) };
}
