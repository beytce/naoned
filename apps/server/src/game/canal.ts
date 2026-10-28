import { PARTICIPANT_DAYS, type WorldState, citiesHeldBy } from "@comptoirs/engine";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accountAtouts, accounts, canalPlots } from "../db/schema.js";
import { latestGenerations } from "./dynasty.js";

/**
 * The Grand Canal (R5, docs/plan-rupture.md): forty palaces shared by every month, given by each
 * month's final ranking. A house that stays in the forty keeps its palace; one that leaves them
 * loses it; the newcomers take the finest free plots in the order of the ranking. Only people who
 * played a week of the month; never a house of the computer (`recordSeason` ranks people only).
 * Purely for show: no effect on the game.
 */

export const CANAL_PLOTS = 40;

/** At the month's close, after `recordSeason`: the forty palaces given again. */
export async function redistributeCanal(
  db: Db,
  worldId: string,
  ranked: { accountId: string; rank: number; days: number }[],
  at: Date,
): Promise<void> {
  const forty = ranked
    .filter((r) => r.days >= PARTICIPANT_DAYS)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, CANAL_PLOTS)
    .map((r) => r.accountId);
  // Who left the forty loses its palace.
  if (forty.length === 0) await db.delete(canalPlots);
  else await db.delete(canalPlots).where(notInArray(canalPlots.accountId, forty));
  const held = await db.select().from(canalPlots);
  const keeps = new Set(held.map((h) => h.accountId));
  const taken = new Set(held.map((h) => h.plot));
  const free = Array.from({ length: CANAL_PLOTS }, (_, i) => i + 1).filter((p) => !taken.has(p));
  const rows = forty
    .filter((id) => !keeps.has(id))
    .map((accountId, i) => ({ plot: free[i] ?? 0, accountId, sinceWorldId: worldId, at }))
    .filter((r) => r.plot > 0);
  if (rows.length > 0) await db.insert(canalPlots).values(rows).onConflictDoNothing();
}

/** An account's palace on the Canal (null: none). */
export async function palaceOf(db: Db, accountId: string): Promise<number | null> {
  const [row] = await db
    .select({ plot: canalPlots.plot })
    .from(canalPlots)
    .where(eq(canalPlots.accountId, accountId));
  return row?.plot ?? null;
}

/**
 * The Canal for everyone, signed in or not: each palace with its house's name and crest, and
 * its façade — the generations of its line, the Atouts it unlocked, the cities it holds now as
 * Podestà, the Doge's crown. No e-mail, nothing private: the names are the ranking's.
 */
export async function canalView(db: Db, state: WorldState | null, dogeId: string | null) {
  const plots = await db
    .select({
      plot: canalPlots.plot,
      accountId: canalPlots.accountId,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
    })
    .from(canalPlots)
    .innerJoin(accounts, eq(accounts.id, canalPlots.accountId))
    .orderBy(canalPlots.plot);
  const ids = plots.map((p) => p.accountId);
  const lines = await latestGenerations(db, ids);
  const atouts =
    ids.length === 0
      ? []
      : await db
          .select({ id: accountAtouts.accountId, n: sql<number>`count(*)::int` })
          .from(accountAtouts)
          .where(and(inArray(accountAtouts.accountId, ids)))
          .groupBy(accountAtouts.accountId);
  const unlocked = new Map(atouts.map((a) => [a.id, Number(a.n)]));
  return plots.map((p) => ({
    plot: p.plot,
    pseudo: p.pseudo,
    crest: p.crest,
    generations: lines.get(p.accountId)?.count ?? 0,
    atouts: unlocked.get(p.accountId) ?? 0,
    cities: state ? citiesHeldBy(state, p.accountId).length : 0,
    doge: p.accountId === dogeId,
  }));
}
