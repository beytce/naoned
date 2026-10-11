import type { Deniers } from "./money.js";
import { DAY_MS, type PlayerId, type WorldContext, type WorldState, seasonEnd } from "./state.js";
import { type Tx, emit } from "./tx.js";
import { netWorth } from "./valuation.js";

const WEEK_MS = 7 * DAY_MS;

export interface WeeklyStanding {
  playerId: PlayerId;
  /** Net worth gained since the start of the week (or since joining), in deniers. */
  gain: Deniers;
}

/** Whole weeks in the season (at least one); the last one runs to the end of the month. */
export function seasonWeeks(ctx: WorldContext): number {
  return Math.max(1, Math.floor((seasonEnd(ctx) - ctx.startAt) / WEEK_MS));
}

export function weekIndex(ctx: WorldContext, at: number): number {
  return Math.min(Math.floor((at - ctx.startAt) / WEEK_MS), seasonWeeks(ctx) - 1);
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
      const worth = netWorth(ctx, state, playerId, now).total;
      return { playerId, gain: worth - (start[playerId] ?? worth) };
    })
    .sort((a, b) =>
      a.gain === b.gain ? a.playerId.localeCompare(b.playerId) : a.gain > b.gain ? -1 : 1,
    );
}

/** Final ranking of the season: net worth, best first. */
export function seasonStandings(
  ctx: WorldContext,
  state: WorldState,
  now: number,
): { playerId: PlayerId; worth: Deniers }[] {
  return Object.keys(state.players)
    .map((playerId) => ({ playerId, worth: netWorth(ctx, state, playerId, now).total }))
    .sort((a, b) =>
      a.worth === b.worth ? a.playerId.localeCompare(b.playerId) : a.worth > b.worth ? -1 : 1,
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
      worth: s.worth.toString(),
    })),
  });
  tx.s.seasonClosed = true;
}

/** Worth a player starts the week with: now, on joining or restarting. */
export function startWeek(tx: Tx, playerId: PlayerId): void {
  const weekly = tx.s.weekly;
  if (!weekly) return;
  weekly.start[playerId] = netWorth(tx.ctx, tx.s, playerId, tx.now).total;
}

function snapshot(tx: Tx): Record<PlayerId, Deniers> {
  const start: Record<PlayerId, Deniers> = {};
  for (const id of Object.keys(tx.s.players)) {
    start[id] = netWorth(tx.ctx, tx.s, id, tx.now).total;
  }
  return start;
}

/**
 * Scheduled: on the first tick after a week boundary, publishes the ranking of the week that ended
 * (event `week_closed`) and starts the new week from everyone's current worth.
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
  tx.s.weekly = { week, start: snapshot(tx) };
}
