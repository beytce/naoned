import { seasonTier } from "@comptoirs/engine";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, players, seasonResults, weeklyResults, worlds } from "../db/schema.js";
import { nextSeasonBounds } from "./calendar.js";
import { grantPass } from "./pass.js";
import { TITLES, titleFor } from "./profile.js";

/**
 * Rewards of the final ranking, among people (bots never take a place). Everyone who played a
 * week gets something; each place in the top 10 counts.
 */
export const SEASON_TIERS = [
  { tier: "doge", name: "Doge de la saison", renown: 100, passDays: "season" },
  { tier: "podium", name: "Podium de la saison", renown: 65, passDays: "season" },
  { tier: "top10", name: "Top 10 de la saison", renown: 40, passDays: "season" },
  { tier: "elite", name: "Top 10 % de la saison", renown: 25, passDays: 21 },
  { tier: "notable", name: "Top 25 % de la saison", renown: 15, passDays: 7 },
  { tier: "participant", name: "Marchand de la saison", renown: 5, passDays: 0 },
  { tier: "none", name: "", renown: 0, passDays: 0 },
] as const;

const NO_REWARD = { tier: "none", name: "", renown: 0, passDays: 0 } as const;

export type SeasonTier = (typeof SEASON_TIERS)[number]["tier"];

/** The tier of a rank: the engine's rule (a participant has played a week). */
export function tierFor(rank: number, people: number, daysPlayed: number): SeasonTier {
  return seasonTier(rank, people, daysPlayed);
}

/** The season's milestone: the merchant title held at the close, and the renown it adds. */
export function milestoneFor(turnover: bigint) {
  return titleFor(turnover).current;
}

export function milestoneInfo(code: string) {
  return TITLES.find((t) => t.code === code) ?? TITLES[0];
}

/** What a merchant earns at the close: the tier of the rank plus the milestone of the title. */
export function seasonReward(rank: number, people: number, daysPlayed: number, turnover: bigint) {
  const tier = tierFor(rank, people, daysPlayed);
  const milestone = milestoneFor(turnover);
  return { tier, milestone: milestone.code, renown: tierInfo(tier).renown + milestone.renown };
}

export function tierInfo(tier: string): (typeof SEASON_TIERS)[number] {
  return SEASON_TIERS.find((t) => t.tier === tier) ?? NO_REWARD;
}

/** Renown: lasting prestige across seasons. Titles only, never an economic head start. */
export const RENOWN_TITLES = [
  { from: 0, name: "Inconnu du Rialto" },
  { from: 5, name: "Habitué du Rialto" },
  { from: 25, name: "Marchand notable" },
  { from: 60, name: "Marchand illustre" },
  { from: 120, name: "Légende de Venise" },
  { from: 250, name: "Lion de Saint-Marc" },
] as const;

export function renownTitle(points: number) {
  let index = 0;
  RENOWN_TITLES.forEach((t, i) => {
    if (points >= t.from) index = i;
  });
  const current = RENOWN_TITLES[index] ?? RENOWN_TITLES[0];
  const next = RENOWN_TITLES[index + 1] ?? null;
  return { points, current, next };
}

/**
 * Saves the final ranking (engine event `season_closed`), in the transaction of the closing tick.
 * Ranks count people only; bots are left out of the results.
 */
export async function recordSeason(
  db: Db,
  worldId: string,
  data: Record<string, unknown>,
  /** End of this season: the Pass won is held during the next one (none won if absent). */
  endsAt?: number,
) {
  // Ranked by net sales; standings saved before them carry net worth only.
  const standings = (data.standings ?? []) as {
    playerId: string;
    worth: string;
    turnover?: string;
  }[];
  if (standings.length === 0) return [];
  const ids = standings.map((s) => s.playerId);
  const people = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(inArray(accounts.id, ids), eq(accounts.isBot, false)));
  const isPerson = new Set(people.map((p) => p.id));
  const ranked = standings.filter((s) => isPerson.has(s.playerId));
  if (ranked.length === 0) return [];
  const dayRows = await db.execute(sql`
    select account_id as id, count(distinct date_trunc('day', at))::int as days
    from telemetry where world_id = ${worldId} group by account_id`);
  const days = new Map(
    ((dayRows as { rows?: { id: string; days: number }[] }).rows ?? []).map((r) => [
      String(r.id),
      Number(r.days),
    ]),
  );
  const rows = ranked.map((s, i) => {
    const score = BigInt(s.turnover ?? s.worth);
    const reward = seasonReward(i + 1, ranked.length, days.get(s.playerId) ?? 0, score);
    return {
      worldId,
      accountId: s.playerId,
      rank: i + 1,
      players: ranked.length,
      worth: BigInt(s.worth),
      turnover: s.turnover === undefined ? null : BigInt(s.turnover),
      ...reward,
    };
  });
  await db.insert(seasonResults).values(rows).onConflictDoNothing();
  if (endsAt !== undefined) {
    const next = nextSeasonBounds(endsAt);
    for (const r of rows) {
      const span = tierInfo(r.tier).passDays;
      const until = span === "season" ? next.endsAt : endsAt + span * 86_400_000;
      if (until > endsAt) await grantPass(db, r.accountId, "season", endsAt, until, r.tier);
    }
  }
  // Days of play beside each result: the house's Influence of the season asks for a week.
  return rows.map((r) => ({ ...r, days: days.get(r.accountId) ?? 0 }));
}

/** Renown of an account: the sum over its seasons. */
export async function renownOf(db: Db, accountId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${seasonResults.renown}), 0)::int` })
    .from(seasonResults)
    .where(eq(seasonResults.accountId, accountId));
  return Number(row?.total ?? 0);
}

/** Seasons an account took part in, latest first: the palmarès. */
export async function seasonRecord(db: Db, accountId: string) {
  const rows = await db
    .select({
      worldId: seasonResults.worldId,
      name: worlds.name,
      endsAt: worlds.endsAt,
      rank: seasonResults.rank,
      players: seasonResults.players,
      worth: seasonResults.worth,
      turnover: seasonResults.turnover,
      tier: seasonResults.tier,
      milestone: seasonResults.milestone,
      renown: seasonResults.renown,
    })
    .from(seasonResults)
    .innerJoin(worlds, eq(worlds.id, seasonResults.worldId))
    .where(eq(seasonResults.accountId, accountId))
    .orderBy(desc(worlds.endsAt));
  return rows.map((r) => ({
    season: r.name,
    endsAt: r.endsAt.getTime(),
    rank: r.rank,
    players: r.players,
    worth: r.worth.toString(),
    turnover: r.turnover?.toString() ?? null,
    tier: r.tier,
    award: tierInfo(r.tier).name,
    milestone: { name: milestoneInfo(r.milestone).name, renown: milestoneInfo(r.milestone).renown },
    renown: r.renown,
  }));
}

/** The closing ceremony not yet watched by this account, if any (latest season only). */
export async function pendingCeremony(
  db: Db,
  accountId: string,
  /** The Pass is on: the ceremony tells the Pass won. */
  passOn = true,
) {
  const [row] = await db
    .select({
      worldId: seasonResults.worldId,
      name: worlds.name,
      rank: seasonResults.rank,
      players: seasonResults.players,
      worth: seasonResults.worth,
      turnover: seasonResults.turnover,
      tier: seasonResults.tier,
      milestone: seasonResults.milestone,
      renown: seasonResults.renown,
    })
    .from(seasonResults)
    .innerJoin(worlds, eq(worlds.id, seasonResults.worldId))
    .where(and(eq(seasonResults.accountId, accountId), isNull(seasonResults.seenAt)))
    .orderBy(desc(worlds.endsAt))
    .limit(1);
  if (!row) return null;
  const podium = await db
    .select({
      rank: seasonResults.rank,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      worth: seasonResults.worth,
      turnover: seasonResults.turnover,
    })
    .from(seasonResults)
    .innerJoin(accounts, eq(accounts.id, seasonResults.accountId))
    .where(and(eq(seasonResults.worldId, row.worldId), sql`${seasonResults.rank} <= 3`))
    .orderBy(seasonResults.rank);
  const info = tierInfo(row.tier);
  return {
    worldId: row.worldId,
    season: row.name,
    rank: row.rank,
    players: row.players,
    worth: row.worth.toString(),
    turnover: row.turnover?.toString() ?? null,
    tier: row.tier,
    award: info.name,
    milestone: {
      name: milestoneInfo(row.milestone).name,
      renown: milestoneInfo(row.milestone).renown,
    },
    renown: row.renown,
    passDays: passOn ? info.passDays : 0,
    totalRenown: renownTitle(await renownOf(db, accountId)),
    podium: podium.map((p) => ({
      ...p,
      worth: p.worth.toString(),
      turnover: p.turnover?.toString() ?? null,
    })),
  };
}

export async function markCeremonySeen(db: Db, accountId: string, worldId: string, at: Date) {
  await db
    .update(seasonResults)
    .set({ seenAt: at })
    .where(and(eq(seasonResults.accountId, accountId), eq(seasonResults.worldId, worldId)));
}

/** The Doge of the season before: honoured on the Dogana's façade during the next one. */
export async function previousDoge(db: Db, currentWorldId: string) {
  const [row] = await db
    .select({
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      season: worlds.name,
    })
    .from(seasonResults)
    .innerJoin(worlds, eq(worlds.id, seasonResults.worldId))
    .innerJoin(accounts, eq(accounts.id, seasonResults.accountId))
    .where(and(eq(seasonResults.rank, 1), sql`${worlds.id} <> ${currentWorldId}`))
    .orderBy(desc(worlds.endsAt))
    .limit(1);
  return row ?? null;
}

/** People who played a season: told when the next one opens. */
export async function seasonPlayers(db: Db, worldId: string): Promise<string[]> {
  const rows = await db
    .select({ id: players.accountId })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(and(eq(players.worldId, worldId), eq(accounts.isBot, false)));
  return rows.map((r) => r.id);
}

/** Weekly results across every season: totals and the latest weeks. */
export async function weeklyHistory(db: Db, accountId: string) {
  const rows = await db
    .select({
      season: worlds.name,
      startsAt: worlds.startsAt,
      week: weeklyResults.week,
      rank: weeklyResults.rank,
      gain: weeklyResults.gain,
      award: weeklyResults.award,
    })
    .from(weeklyResults)
    .innerJoin(worlds, eq(worlds.id, weeklyResults.worldId))
    .where(eq(weeklyResults.accountId, accountId))
    .orderBy(desc(worlds.startsAt), desc(weeklyResults.week));
  return {
    weeks: rows.length,
    podiums: rows.filter((r) => r.award).length,
    wins: rows.filter((r) => r.award === "doge").length,
    top10: rows.filter((r) => r.rank <= 10).length,
    best: rows.reduce<number | null>((b, r) => (b === null || r.rank < b ? r.rank : b), null),
    latest: rows.slice(0, 8).map((r) => ({
      season: r.season,
      week: r.week + 1,
      rank: r.rank,
      gain: r.gain.toString(),
      award: r.award,
    })),
  };
}

/** The palmarès of an account: renown, seasons and weeks. Public (shown to other players). */
export async function palmares(db: Db, accountId: string) {
  return {
    renown: renownTitle(await renownOf(db, accountId)),
    seasons: await seasonRecord(db, accountId),
    weekly: await weeklyHistory(db, accountId),
  };
}
