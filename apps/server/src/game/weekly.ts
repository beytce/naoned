import {
  type WorldContext,
  type WorldState,
  seasonEnd,
  weekEnd,
  weekIndex,
  weeklyStandings,
} from "@comptoirs/engine";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, players, weeklyResults } from "../db/schema.js";
import { WEEKLY_PASS_DAYS, days, grantPass } from "./pass.js";

/** Cosmetic awards of the week, for the three best people (bots never take one). */
export const WEEKLY_AWARDS = [
  { code: "doge", name: "Doge de la semaine" },
  { code: "procurator", name: "Procurateur de la semaine" },
  { code: "senator", name: "Sénateur de la semaine" },
] as const;

const WEEK_MS = 7 * 86_400_000;

interface Who {
  pseudo: string | null;
  crest: { shape: string; color: string; symbol: string } | null;
  bot: boolean;
  retired: boolean;
}

/** Pseudo, crest and bot status of the world's players. */
async function who(db: Db, worldId: string, ids: string[]): Promise<Map<string, Who>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: accounts.id,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      bot: accounts.isBot,
      retiredAt: players.retiredAt,
    })
    .from(accounts)
    .innerJoin(players, and(eq(players.accountId, accounts.id), eq(players.worldId, worldId)))
    .where(inArray(accounts.id, ids));
  return new Map(
    rows.map((r) => [
      r.id,
      { pseudo: r.pseudo, crest: r.crest, bot: r.bot, retired: r.retiredAt !== null },
    ]),
  );
}

/**
 * Saves a closed week (engine event `week_closed`), in the transaction of the tick that closed it.
 * Retired bots are left out; the awards go to the three best people with a positive gain.
 */
export async function recordWeek(
  db: Db,
  worldId: string,
  data: Record<string, unknown>,
  /** When the week closed: the weekly top 10 hold the Pass for the next seven days (none if absent). */
  at?: number,
) {
  const week = Number(data.week);
  const standings = (data.standings ?? []) as { playerId: string; gain: string }[];
  const info = await who(
    db,
    worldId,
    standings.map((s) => s.playerId),
  );
  const ranked = standings.filter((s) => {
    const w = info.get(s.playerId);
    return w && !(w.bot && w.retired);
  });
  if (ranked.length === 0) return [];
  let awarded = 0;
  const rows = ranked.map((s, i) => {
    const gain = BigInt(s.gain);
    const person = !info.get(s.playerId)?.bot;
    const award =
      person && gain > 0n && awarded < WEEKLY_AWARDS.length
        ? (WEEKLY_AWARDS[awarded++]?.code ?? null)
        : null;
    return { worldId, week, accountId: s.playerId, rank: i + 1, gain, award };
  });
  await db.insert(weeklyResults).values(rows).onConflictDoNothing();
  if (at !== undefined) {
    const people = rows.filter((r) => !info.get(r.accountId)?.bot).slice(0, 10);
    for (const r of people) {
      await grantPass(
        db,
        r.accountId,
        "weekly_top10",
        at,
        at + days(WEEKLY_PASS_DAYS),
        `week ${week + 1}`,
      );
    }
  }
  return rows;
}

/** Live weekly ranking, with the podium of the week before. */
export async function weeklyTable(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
) {
  const week = weekIndex(ctx, now);
  const standings = weeklyStandings(ctx, state, now);
  const info = await who(
    db,
    worldId,
    standings.map((s) => s.playerId),
  );
  const rows = standings
    .filter((s) => {
      const w = info.get(s.playerId);
      return w && !(w.bot && w.retired);
    })
    .map((s, i) => {
      const w = info.get(s.playerId);
      return {
        rank: i + 1,
        playerId: s.playerId,
        pseudo: w?.pseudo ?? null,
        crest: w?.crest ?? null,
        bot: w?.bot ?? false,
        region: state.players[s.playerId]?.region ?? "",
        gain: s.gain,
      };
    });

  const podium =
    week === 0
      ? []
      : await db
          .select({
            id: accounts.id,
            rank: weeklyResults.rank,
            gain: weeklyResults.gain,
            award: weeklyResults.award,
            pseudo: accounts.pseudo,
            crest: accounts.crest,
            bot: accounts.isBot,
          })
          .from(weeklyResults)
          .innerJoin(accounts, eq(accounts.id, weeklyResults.accountId))
          .where(and(eq(weeklyResults.worldId, worldId), eq(weeklyResults.week, week - 1)))
          .orderBy(weeklyResults.rank)
          .limit(3);

  return {
    week: week + 1,
    // The last week of the month runs to the end of the season.
    endsAt: weekEnd(ctx, week),
    rows,
    lastWeek: podium,
  };
}

/**
 * The merchant's rival of the week: the one just ahead in the weekly ranking (the one just behind
 * for the leader), with both gains. A house of the computer says its character. Null alone.
 */
export async function weeklyRival(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
  playerId: string,
) {
  const standings = weeklyStandings(ctx, state, now);
  const at = standings.findIndex((s) => s.playerId === playerId);
  if (at < 0 || standings.length < 2) return null;
  // The nearest above first, then below; a retired house is skipped.
  const order = [...standings.slice(0, at).reverse(), ...standings.slice(at + 1)].slice(0, 6);
  const rows = await db
    .select({
      id: accounts.id,
      pseudo: accounts.pseudo,
      bot: accounts.isBot,
      profile: players.botProfile,
      retiredAt: players.retiredAt,
    })
    .from(accounts)
    .innerJoin(players, and(eq(players.accountId, accounts.id), eq(players.worldId, worldId)))
    .where(
      inArray(
        accounts.id,
        order.map((s) => s.playerId),
      ),
    );
  const info = new Map(rows.map((r) => [r.id, r]));
  const rival = order.find((s) => {
    const r = info.get(s.playerId);
    return r && r.retiredAt === null;
  });
  const r = rival && info.get(rival.playerId);
  if (!rival || !r) return null;
  const mine = standings[at]?.gain ?? 0n;
  return {
    pseudo: r.pseudo,
    bot: r.bot,
    /** The house's play style, for a house of the computer. */
    character: r.bot ? r.profile : null,
    gain: rival.gain,
    mine,
    /** Whether the rival is ahead (the merchant chases) or behind (the leader is chased). */
    ahead: standings.indexOf(rival) < at,
  };
}

/** A player's weekly awards and podiums, for the profile. */
export async function weeklyRecord(db: Db, worldId: string, accountId: string) {
  return db
    .select({
      week: weeklyResults.week,
      rank: weeklyResults.rank,
      gain: weeklyResults.gain,
      award: weeklyResults.award,
    })
    .from(weeklyResults)
    .where(and(eq(weeklyResults.worldId, worldId), eq(weeklyResults.accountId, accountId)))
    .orderBy(desc(weeklyResults.week));
}
