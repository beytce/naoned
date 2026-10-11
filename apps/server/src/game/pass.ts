import { and, eq, gt, lte } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { passGrants } from "../db/schema.js";
import type { GameWorld } from "./world.js";

const DAY_MS = 86_400_000;

/** Prices shown in the game (payment comes later): in euro cents. */
export const PASS_PRICES = { season: 399, week: 149 } as const;

/** Days of Pass won by the weekly top 10 (people only). */
export const WEEKLY_PASS_DAYS = 7;

export async function grantPass(
  db: Db,
  accountId: string,
  source: "purchase" | "weekly_top10" | "season" | "admin",
  startsAt: number,
  endsAt: number,
  note?: string,
) {
  if (endsAt <= startsAt) return;
  await db.insert(passGrants).values({
    accountId,
    source,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    note: note ?? null,
  });
}

/**
 * End of the Pass held from `now` on: grants that follow each other without a gap add up (a
 * week won during a season bought). 0 without a Pass now.
 */
export async function passUntil(db: Db, accountId: string, now: number): Promise<number> {
  const rows = await db
    .select({ startsAt: passGrants.startsAt, endsAt: passGrants.endsAt })
    .from(passGrants)
    .where(and(eq(passGrants.accountId, accountId), gt(passGrants.endsAt, new Date(now))));
  const spans = rows
    .map((r) => ({ from: r.startsAt.getTime(), to: r.endsAt.getTime() }))
    .sort((a, b) => a.from - b.from);
  let until = 0;
  let at = now;
  for (const s of spans) {
    if (s.from > at) break;
    until = Math.max(until, s.to);
    at = Math.max(at, s.to);
  }
  return until;
}

/** Grants that start later (a season won, waiting for the next month). */
export async function upcomingPass(db: Db, accountId: string, now: number) {
  const [row] = await db
    .select({ startsAt: passGrants.startsAt, endsAt: passGrants.endsAt, source: passGrants.source })
    .from(passGrants)
    .where(and(eq(passGrants.accountId, accountId), gt(passGrants.startsAt, new Date(now))))
    .orderBy(passGrants.startsAt)
    .limit(1);
  return row
    ? { startsAt: row.startsAt.getTime(), endsAt: row.endsAt.getTime(), source: row.source }
    : null;
}

/** Tells the engine about a Pass the merchant holds (bought, won, granted) if it does not know. */
export async function syncPass(db: Db, world: GameWorld, accountId: string): Promise<void> {
  const player = world.current.players[accountId];
  if (!player) return;
  const now = world.now();
  const until = await passUntil(db, accountId, now);
  if (until > (player.passUntil ?? 0)) {
    await world.execute({ type: "grantPass", playerId: accountId, until });
  }
}

/** Accounts that held a Pass at some point in [from, to) (for the rankings' seal). */
export async function passHoldersAt(db: Db, at: number): Promise<Set<string>> {
  const rows = await db
    .select({ id: passGrants.accountId })
    .from(passGrants)
    .where(and(lte(passGrants.startsAt, new Date(at)), gt(passGrants.endsAt, new Date(at))));
  return new Set(rows.map((r) => r.id));
}

export const days = (n: number) => n * DAY_MS;
