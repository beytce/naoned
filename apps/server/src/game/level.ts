import { type WorldState, turnoverPeakOf } from "@comptoirs/engine";
import { inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { seasonResults } from "../db/schema.js";

/**
 * The merchant's level, which never goes back: one point of experience per ducat of net sales,
 * season after season (a season's losses count for nothing). Honorary only, like renown: it
 * never changes the economy, and every season everyone starts afresh.
 * Level n + 1 takes `LEVEL_STEP × n` more points than level n: a merchant of the median (about
 * 5 000 ducats of net sales a season in the simulation) reaches level 6 in a first season, one
 * of the best tenth (about 12 000) level 9; the curve flattens over the seasons.
 */
export const LEVEL_STEP = 300;

export interface Level {
  level: number;
  /** Points of experience: ducats of net sales, all seasons. */
  xp: number;
  /** Points at which this level and the next begin. */
  from: number;
  to: number;
  progress: number;
}

export function levelFor(xp: number): Level {
  let level = 1;
  let from = 0;
  while (xp >= from + LEVEL_STEP * level) {
    from += LEVEL_STEP * level;
    level++;
  }
  const to = from + LEVEL_STEP * level;
  return { level, xp, from, to, progress: (xp - from) / (to - from) };
}

/** Ducats of net sales of the closed seasons, per account. */
export async function pastSales(db: Db, accountIds: string[]): Promise<Map<string, number>> {
  if (accountIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: seasonResults.accountId,
      deniers: sql<string>`coalesce(sum(greatest(${seasonResults.turnover}, 0)), 0)::text`,
    })
    .from(seasonResults)
    .where(inArray(seasonResults.accountId, accountIds))
    .groupBy(seasonResults.accountId);
  return new Map(rows.map((r) => [r.id, Number(BigInt(r.deniers) / 100n)]));
}

/**
 * Levels of these accounts: closed seasons plus the best net sales of the season under way, so
 * that a purchase, which lowers the net sales, never takes a level back.
 */
export async function levelsOf(
  db: Db,
  state: WorldState,
  accountIds: string[],
): Promise<Map<string, Level>> {
  const past = await pastSales(db, accountIds);
  const live = (id: string) => {
    const t = turnoverPeakOf(state, id);
    return t > 0n ? Number(t / 100n) : 0;
  };
  return new Map(accountIds.map((id) => [id, levelFor((past.get(id) ?? 0) + live(id))]));
}
