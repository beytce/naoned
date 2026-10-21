import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, skirmishMatches, terraResults } from "../db/schema.js";

/** How far one week moves a rating at most. */
const K = 32;

type Result = {
  accountId: string;
  week: number;
  rank: number;
  of: number;
  glory: number;
  cells: number;
};

/**
 * The new ratings of a week's merchants (Elo against the whole field): each is scored against
 * every other by their ranks, and moves by K × (actual − expected) / (n − 1). Integers out.
 */
export function newRatings(
  field: { id: string; rank: number; rating: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  const n = field.length;
  for (const a of field) {
    if (n < 2) {
      out.set(a.id, a.rating);
      continue;
    }
    let delta = 0;
    for (const b of field) {
      if (b.id === a.id) continue;
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      const actual = a.rank < b.rank ? 1 : a.rank > b.rank ? 0 : 0.5;
      delta += actual - expected;
    }
    out.set(a.id, Math.round(a.rating + (K * delta) / (n - 1)));
  }
  return out;
}

/**
 * Saves the weeks of the Terraferma closed in this transaction (engine events `terra_result`):
 * a row a merchant, and its rating moved.
 */
export async function recordTerra(
  tx: Db,
  worldId: string,
  events: { type: string; playerId?: string; data?: Record<string, unknown> }[],
  at: Date,
): Promise<void> {
  const results: Result[] = events
    .filter((e) => e.type === "terra_result" && e.playerId)
    .map((e) => ({
      accountId: e.playerId as string,
      week: Number(e.data?.week ?? 0),
      rank: Number(e.data?.rank ?? 0),
      of: Number(e.data?.of ?? 0),
      glory: Number(e.data?.glory ?? 0),
      cells: Number(e.data?.cells ?? 0),
    }));
  if (results.length === 0) return;
  const ids = results.map((r) => r.accountId);
  const rows = await tx
    .select({ id: accounts.id, rating: accounts.terraRating })
    .from(accounts)
    .where(inArray(accounts.id, ids));
  const rating = new Map(rows.map((r) => [r.id, r.rating]));
  const known = results.filter((r) => rating.has(r.accountId));
  const next = newRatings(
    known.map((r) => ({ id: r.accountId, rank: r.rank, rating: rating.get(r.accountId) ?? 1000 })),
  );
  if (known.length === 0) return;
  await tx
    .insert(terraResults)
    .values(
      known.map((r) => ({
        worldId,
        week: r.week,
        accountId: r.accountId,
        rank: r.rank,
        of: r.of,
        glory: r.glory,
        cells: r.cells,
        rating: next.get(r.accountId) ?? 1000,
        at,
      })),
    )
    .onConflictDoNothing();
  for (const r of known) {
    await tx
      .update(accounts)
      .set({ terraRating: next.get(r.accountId) ?? 1000 })
      .where(eq(accounts.id, r.accountId));
  }
}

/** A merchant's rating and its last weeks of the Terraferma, for its profile. */
export async function terraRecord(db: Db, accountId: string) {
  const [row] = await db
    .select({ rating: accounts.terraRating })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  const weeks = await db
    .select({
      week: terraResults.week,
      rank: terraResults.rank,
      of: terraResults.of,
      glory: terraResults.glory,
      cells: terraResults.cells,
      rating: terraResults.rating,
      at: terraResults.at,
    })
    .from(terraResults)
    .where(and(eq(terraResults.accountId, accountId), sql`true`))
    .orderBy(desc(terraResults.at))
    .limit(10);
  return { rating: row?.rating ?? 1000, weeks: weeks.map((w) => ({ ...w, at: w.at.getTime() })) };
}

/**
 * Settles the rows of the skirmishes paid in this transaction (engine events
 * `terra_skirmish_paid`): paid with the glory, or not at all.
 */
export async function recordSkirmishesPaid(
  tx: Db,
  worldId: string,
  events: { type: string; data?: Record<string, unknown> }[],
  at: Date,
): Promise<void> {
  const ids = events
    .filter((e) => e.type === "terra_skirmish_paid")
    .map((e) => String(e.data?.matchId ?? ""))
    .filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (ids.length === 0) return;
  await tx
    .update(skirmishMatches)
    .set({ status: "paid", endedAt: at })
    .where(and(eq(skirmishMatches.worldId, worldId), inArray(skirmishMatches.id, ids)));
}
