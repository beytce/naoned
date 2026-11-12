import { beaconLevel } from "@comptoirs/engine";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { companyBeaconGifts, companyBeacons, companyMembers, plancheSeats } from "../db/schema.js";
import { CompanyError, companyIdOf } from "./company.js";
import type { PlancheHubTheme } from "./planche.js";
import type { PlancheLagoons } from "./plancheLagoons.js";

const DAY = 86_400_000;

/** A company's beacon: its points, its level, the next threshold. */
export async function beaconOf(db: Db, theme: PlancheHubTheme, companyId: string) {
  const B = theme.board.compagnie?.beacon;
  const [row] = await db
    .select()
    .from(companyBeacons)
    .where(eq(companyBeacons.companyId, companyId));
  const points = row?.points ?? 0;
  const level = B ? beaconLevel(B.thresholds, points) : 0;
  return { points, level, next: B?.thresholds[level] ?? null, max: B?.thresholds.length ?? 0 };
}

/** What a member gave today, and may still give. */
export async function givenToday(db: Db, theme: PlancheHubTheme, accountId: string, now: number) {
  const [row] = await db
    .select({ units: companyBeaconGifts.units })
    .from(companyBeaconGifts)
    .where(
      and(
        eq(companyBeaconGifts.accountId, accountId),
        eq(companyBeaconGifts.day, Math.floor(now / DAY)),
      ),
    );
  const cap = theme.board.compagnie?.beacon.dailyCap ?? 0;
  return { given: row?.units ?? 0, cap };
}

/**
 * A member gives goods of its store to its company's beacon (docs/plan-compagnie.md K4): within
 * the day's cap, the goods leave its store by a command of its board, the beacon gains as many
 * points; a level reached is carried to every member's house.
 */
export async function giveToBeacon(
  db: Db,
  lagoons: PlancheLagoons,
  theme: PlancheHubTheme,
  accountId: string,
  goods: Record<string, number>,
  now: number,
  gameNow: number,
) {
  const companyId = await companyIdOf(db, accountId);
  if (!companyId) throw new CompanyError("not_member", 403);
  const units = Object.values(goods).reduce((n, x) => n + x, 0);
  const { given, cap } = await givenToday(db, theme, accountId, now);
  if (units <= 0 || given + units > cap) throw new CompanyError("beacon_cap", 409);
  const { store } = await lagoons.seatOf(accountId, "", gameNow);
  const answer = await store.hub.give(accountId, goods, gameNow);
  if (answer !== "ok") throw new CompanyError(answer, 409);
  const before = await beaconOf(db, theme, companyId);
  await db
    .insert(companyBeaconGifts)
    .values({ accountId, day: Math.floor(now / DAY), units })
    .onConflictDoUpdate({
      target: [companyBeaconGifts.accountId, companyBeaconGifts.day],
      set: { units: sql`${companyBeaconGifts.units} + ${units}` },
    });
  await db
    .insert(companyBeacons)
    .values({ companyId, points: units, updatedAt: new Date(now) })
    .onConflictDoUpdate({
      target: companyBeacons.companyId,
      set: { points: sql`${companyBeacons.points} + ${units}`, updatedAt: new Date(now) },
    });
  const after = await beaconOf(db, theme, companyId);
  if (after.level !== before.level) await carryBeacon(db, lagoons, companyId, after.level, gameNow);
  return after;
}

/** A company's beacon level carried to every member's house (and taken off one who leaves). */
export async function carryBeacon(
  db: Db,
  lagoons: PlancheLagoons,
  companyId: string | null,
  level: number,
  gameNow: number,
  only?: string,
) {
  const members = companyId
    ? await db
        .select({ accountId: companyMembers.accountId })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, companyId))
    : [];
  const ids = only ? [only] : members.map((m) => m.accountId);
  for (const id of ids) {
    const [seat] = await db.select().from(plancheSeats).where(eq(plancheSeats.accountId, id));
    const store = seat && lagoons.all().find((s) => s.worldId === seat.worldId);
    if (store) await store.hub.beacon(id, level, gameNow);
  }
}
