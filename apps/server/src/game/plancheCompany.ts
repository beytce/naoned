import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, companies, companyMembers, plancheSeats, telemetry } from "../db/schema.js";
import { CompanyError, checkCompanyName, companyIdOf, membersOf } from "./company.js";

/**
 * The company on the shared board (docs/plan-compagnie.md K1): the old game's companies, their
 * members and their thread, taken up as they are; up to twelve houses (the owner's choice of 12
 * November 2026), across the lagoons; a doge of the company, captains and members; a flag.
 */
export const COMPAGNIE_MAX = 12;
/** Who leaves a company waits this long before joining or founding another. */
export const COMPAGNIE_REJOIN_MS = 3 * 86_400_000;
export const COMPAGNIE_ROLES = ["doge", "capitaine"] as const;
export type CompagnieRole = (typeof COMPAGNIE_ROLES)[number];
/** The captains of a company, at most. */
export const CAPTAINS_MAX = 3;

export interface CompagnieFlag {
  color: string;
  symbol: string;
}
const COLORS = ["lagoon", "emerald", "gold", "violet", "ink"];
const SYMBOLS = ["lion", "anchor", "key", "star", "tower", "ship", "wheat", "crown"];

export function checkFlag(f: unknown): CompagnieFlag {
  const x = f as Partial<CompagnieFlag> | null;
  if (!x || !COLORS.includes(x.color ?? "") || !SYMBOLS.includes(x.symbol ?? ""))
    throw new CompanyError("invalid_flag");
  return { color: x.color as string, symbol: x.symbol as string };
}

async function mayJoin(db: Db, accountId: string, now: number): Promise<void> {
  if (await companyIdOf(db, accountId)) throw new CompanyError("already_member", 409);
  const [row] = await db
    .select({ left: accounts.companyLeftAt })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (row?.left && now - row.left.getTime() < COMPAGNIE_REJOIN_MS)
    throw new CompanyError("left_recently", 409);
}

/** A company founded: its founder is its doge. */
export async function foundCompagnie(
  db: Db,
  accountId: string,
  text: string,
  flag: unknown,
  now: number,
): Promise<string> {
  const name = checkCompanyName(text);
  const f = checkFlag(flag);
  await mayJoin(db, accountId, now);
  const [taken] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`lower(${companies.name}) = lower(${name})`);
  if (taken) throw new CompanyError("name_taken", 409);
  const at = new Date(now);
  const [company] = await db
    .insert(companies)
    .values({
      name,
      code: randomBytes(6).toString("base64url"),
      createdBy: accountId,
      createdAt: at,
      flag: f,
    })
    .returning({ id: companies.id });
  if (!company) throw new CompanyError("name_taken", 409);
  await db
    .insert(companyMembers)
    .values({ accountId, companyId: company.id, joinedAt: at, role: "doge" });
  await db
    .insert(telemetry)
    .values({ accountId, type: "compagnie_founded", at, props: { company: company.id } });
  return company.id;
}

/** The company a link's code names, with the lagoons its members are in. */
export async function compagnieOfCode(db: Db, code: string) {
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.code, code));
  if (!company) return null;
  const seats = await db
    .select({ worldId: plancheSeats.worldId })
    .from(plancheSeats)
    .innerJoin(companyMembers, eq(companyMembers.accountId, plancheSeats.accountId))
    .where(eq(companyMembers.companyId, company.id));
  return { ...company, worlds: [...new Set(seats.map((s) => s.worldId))] };
}

/** An account joins a company by its link. */
export async function joinCompagnie(db: Db, accountId: string, code: string, now: number) {
  const company = await compagnieOfCode(db, code);
  if (!company) throw new CompanyError("unknown_company", 404);
  await mayJoin(db, accountId, now);
  if ((await membersOf(db, company.id)).length >= COMPAGNIE_MAX)
    throw new CompanyError("company_full", 409);
  const at = new Date(now);
  await db.insert(companyMembers).values({ accountId, companyId: company.id, joinedAt: at });
  await db
    .insert(telemetry)
    .values({ accountId, type: "compagnie_joined", at, props: { company: company.id } });
  return company.id;
}

/** An account leaves; the last one out closes the company; a doge leaving hands over to the oldest. */
export async function leaveCompagnie(db: Db, accountId: string, now: number) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new CompanyError("not_member", 403);
  await db.delete(companyMembers).where(eq(companyMembers.accountId, accountId));
  await db
    .update(accounts)
    .set({ companyLeftAt: new Date(now) })
    .where(eq(accounts.id, accountId));
  const left = await membersOf(db, id);
  if (!left.length) {
    await db.delete(companies).where(eq(companies.id, id));
    return;
  }
  if (!left.some((m) => m.role === "doge")) {
    const next = left.find((m) => m.role === "capitaine") ?? left[0];
    if (next)
      await db
        .update(companyMembers)
        .set({ role: "doge" })
        .where(eq(companyMembers.accountId, next.id));
  }
}

/** The doge names a captain, or makes one a member again; or hands the company over. */
export async function setCompagnieRole(
  db: Db,
  accountId: string,
  member: string,
  role: CompagnieRole | null,
) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new CompanyError("not_member", 403);
  const members = await membersOf(db, id);
  if (members.find((m) => m.id === accountId)?.role !== "doge")
    throw new CompanyError("not_doge", 403);
  const target = members.find((m) => m.id === member);
  if (!target || member === accountId) throw new CompanyError("not_member", 404);
  if (role === "capitaine" && members.filter((m) => m.role === "capitaine").length >= CAPTAINS_MAX)
    throw new CompanyError("too_many_captains", 409);
  if (role === "doge")
    await db
      .update(companyMembers)
      .set({ role: "capitaine" })
      .where(eq(companyMembers.accountId, accountId));
  await db.update(companyMembers).set({ role }).where(eq(companyMembers.accountId, member));
}

/** The company of an account, as the board shows it: its members, where they stand. */
export async function compagnieView(db: Db, accountId: string) {
  const id = await companyIdOf(db, accountId);
  if (!id) return null;
  const [c] = await db.select().from(companies).where(eq(companies.id, id));
  if (!c) return null;
  const members = await membersOf(db, id);
  const seats = members.length
    ? await db
        .select()
        .from(plancheSeats)
        .where(
          inArray(
            plancheSeats.accountId,
            members.map((m) => m.id),
          ),
        )
    : [];
  const seatOf = new Map(seats.map((s) => [s.accountId, s]));
  return {
    id,
    name: c.name,
    code: c.code,
    flag: (c.flag as CompagnieFlag | null) ?? { color: "ink", symbol: "lion" },
    max: COMPAGNIE_MAX,
    members: members.map((m) => ({
      id: m.id,
      pseudo: m.pseudo,
      role: (m.role === "doge" || m.role === "capitaine" ? m.role : null) as CompagnieRole | null,
      world: seatOf.get(m.id)?.worldId ?? null,
      house: seatOf.get(m.id)?.house ?? null,
      me: m.id === accountId,
    })),
  };
}

/** The companies of the houses of a board (its seated players), for their flags on the board. */
export async function compagniesOnBoard(db: Db, worldId: string) {
  const rows = await db
    .select({
      house: plancheSeats.house,
      id: companies.id,
      name: companies.name,
      flag: companies.flag,
    })
    .from(plancheSeats)
    .innerJoin(companyMembers, eq(companyMembers.accountId, plancheSeats.accountId))
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(plancheSeats.worldId, worldId));
  return Object.fromEntries(
    rows.map((r) => [
      r.house,
      {
        id: r.id,
        name: r.name,
        flag: (r.flag as CompagnieFlag | null) ?? { color: "ink", symbol: "lion" },
      },
    ]),
  );
}
