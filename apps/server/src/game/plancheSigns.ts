import { and, desc, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, plancheSeats, plancheSigns } from "../db/schema.js";
import { CompanyError, companyIdOf } from "./company.js";
import { mondayOf } from "./planche.js";

/** A company's signs (docs/plan-compagnie.md K2): on a port, a tower, a good; one a kind a member. */
export const COMPANY_SIGNS = ["attaque", "tour", "besoin"] as const;
/** A neighbour's greetings, without free text. */
export const GREETINGS = ["salut", "bravo"] as const;
const DAY = 86_400_000;
const TARGET =
  /^(house|passage|city):[\w-]{1,40}$|^port:[\w-]{8,40}:[\w-]{1,40}$|^good:[a-z_]{1,20}$/;

/** A member lays a sign of its company: it replaces its own of that kind, for the week. */
export async function laySign(
  db: Db,
  accountId: string,
  worldId: string,
  kind: string,
  target: string,
  now: number,
) {
  if (!(COMPANY_SIGNS as readonly string[]).includes(kind) || !TARGET.test(target))
    throw new CompanyError("invalid_sign");
  const companyId = await companyIdOf(db, accountId);
  if (!companyId) throw new CompanyError("not_member", 403);
  const week = new Date(mondayOf(now));
  await db
    .delete(plancheSigns)
    .where(
      and(
        eq(plancheSigns.accountId, accountId),
        eq(plancheSigns.kind, kind),
        eq(plancheSigns.companyId, companyId),
      ),
    );
  await db
    .insert(plancheSigns)
    .values({ accountId, companyId, worldId, kind, target, week, at: new Date(now) });
}

/** A member takes back its sign of a kind. */
export async function liftSign(db: Db, accountId: string, kind: string) {
  await db
    .delete(plancheSigns)
    .where(and(eq(plancheSigns.accountId, accountId), eq(plancheSigns.kind, kind)));
}

/** The signs of an account's company this week, with who laid them. */
export async function companySigns(db: Db, accountId: string, now: number) {
  const companyId = await companyIdOf(db, accountId);
  if (!companyId) return [];
  const rows = await db
    .select({
      kind: plancheSigns.kind,
      target: plancheSigns.target,
      worldId: plancheSigns.worldId,
      by: accounts.pseudo,
      mine: plancheSigns.accountId,
      at: plancheSigns.at,
    })
    .from(plancheSigns)
    .innerJoin(accounts, eq(accounts.id, plancheSigns.accountId))
    .where(
      and(eq(plancheSigns.companyId, companyId), eq(plancheSigns.week, new Date(mondayOf(now)))),
    );
  return rows.map((r) => ({
    kind: r.kind,
    target: r.target,
    world: r.worldId,
    by: r.by ?? "Un membre",
    mine: r.mine === accountId,
    at: r.at.getTime(),
  }));
}

/** A greeting to the player of a house of the same board: once a day a pair and a kind. */
export async function greet(
  db: Db,
  accountId: string,
  worldId: string,
  house: string,
  kind: string,
  now: number,
) {
  if (!(GREETINGS as readonly string[]).includes(kind)) throw new CompanyError("invalid_sign");
  const [seat] = await db
    .select({ accountId: plancheSeats.accountId })
    .from(plancheSeats)
    .where(and(eq(plancheSeats.worldId, worldId), eq(plancheSeats.house, house)));
  if (!seat || seat.accountId === accountId) throw new CompanyError("not_a_player", 404);
  const [already] = await db
    .select({ id: plancheSigns.id })
    .from(plancheSigns)
    .where(
      and(
        eq(plancheSigns.accountId, accountId),
        eq(plancheSigns.toAccount, seat.accountId),
        eq(plancheSigns.kind, kind),
        gte(plancheSigns.at, new Date(now - DAY)),
      ),
    );
  if (already) throw new CompanyError("greeted_today", 409);
  await db.insert(plancheSigns).values({
    accountId,
    toAccount: seat.accountId,
    worldId,
    kind,
    target: `house:${house}`,
    week: new Date(mondayOf(now)),
    at: new Date(now),
  });
  return seat.accountId;
}

/** The greetings an account received in the last day: who, which, when. */
export async function greetings(db: Db, accountId: string, now: number) {
  const rows = await db
    .select({
      kind: plancheSigns.kind,
      by: accounts.pseudo,
      at: plancheSigns.at,
      from: plancheSigns.accountId,
    })
    .from(plancheSigns)
    .innerJoin(accounts, eq(accounts.id, plancheSigns.accountId))
    .where(and(eq(plancheSigns.toAccount, accountId), gte(plancheSigns.at, new Date(now - DAY))))
    .orderBy(desc(plancheSigns.at))
    .limit(10);
  return rows.map((r) => ({ kind: r.kind, by: r.by ?? "Un voisin", at: r.at.getTime() }));
}
