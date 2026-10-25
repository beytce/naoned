import { randomBytes } from "node:crypto";
import { nextSkirmishCall } from "@comptoirs/engine";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  accounts,
  companies,
  companyMembers,
  companyMessageReports,
  companyMessages,
  players,
  seasonResults,
  telemetry,
  worlds,
} from "../db/schema.js";
import {
  ChatError,
  HIDE_AFTER_REPORTS,
  MESSAGES_PER_DAY,
  MESSAGE_GAP_MS,
  THREAD_LENGTH,
  checkMessage,
} from "./chatRules.js";
import { MONTH_TITLES, monthTitles, tierInfo } from "./season.js";
import type { GameWorld } from "./world.js";

/**
 * Companies (E2-8 of the experts, 25 October 2026): two to six friends, recruited by a link,
 * who keep together from month to month. What a company gives, and nothing else: a thread, a
 * call to skirmish together, a shared record, a mark of friendship on the Terraferma's map. No
 * treasury, no transfer, no reserved offer, no bonus, no alliance of itself.
 */
export const COMPANY_MIN = 2;
export const COMPANY_MAX = 6;
/** Who leaves a company waits this long before joining another (or founding one). */
export const COMPANY_REJOIN_MS = 7 * 86_400_000;
const NAME = { min: 3, max: 24 };

export class CompanyError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
  }
}

/** The company of an account, or null. */
export async function companyIdOf(db: Db, accountId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: companyMembers.companyId })
    .from(companyMembers)
    .where(eq(companyMembers.accountId, accountId));
  return row?.id ?? null;
}

/** The members of a company, oldest first. */
async function membersOf(db: Db, companyId: string) {
  return db
    .select({ id: accounts.id, pseudo: accounts.pseudo, joinedAt: companyMembers.joinedAt })
    .from(companyMembers)
    .innerJoin(accounts, eq(accounts.id, companyMembers.accountId))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(companyMembers.joinedAt);
}

/** Fellow members of an account (itself aside), for the Terraferma's map and the calls. */
export async function companions(db: Db, accountId: string): Promise<string[]> {
  const id = await companyIdOf(db, accountId);
  if (!id) return [];
  return (await membersOf(db, id)).map((m) => m.id).filter((m) => m !== accountId);
}

/** An account may join or found a company: in none, and not one left less than a week ago. */
async function mayJoin(db: Db, accountId: string, now: number): Promise<void> {
  if (await companyIdOf(db, accountId)) throw new CompanyError("already_member", 409);
  const [row] = await db
    .select({ left: accounts.companyLeftAt })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (row?.left && now - row.left.getTime() < COMPANY_REJOIN_MS) {
    throw new CompanyError("left_recently", 409);
  }
}

/** The name as kept (trimmed, spaces collapsed), or why it is refused. */
export function checkCompanyName(text: string): string {
  const name = text.replace(/\s+/g, " ").trim();
  if (name.length < NAME.min || name.length > NAME.max) throw new CompanyError("invalid_name");
  try {
    checkMessage(name);
  } catch {
    throw new CompanyError("invalid_name");
  }
  return name;
}

const newCode = () => randomBytes(6).toString("base64url");

export async function createCompany(db: Db, accountId: string, text: string, now: number) {
  const name = checkCompanyName(text);
  await mayJoin(db, accountId, now);
  const at = new Date(now);
  const [taken] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`lower(${companies.name}) = lower(${name})`);
  if (taken) throw new CompanyError("name_taken", 409);
  const [company] = await db
    .insert(companies)
    .values({ name, code: newCode(), createdBy: accountId, createdAt: at })
    .returning({ id: companies.id });
  if (!company) throw new CompanyError("name_taken", 409);
  await db.insert(companyMembers).values({ accountId, companyId: company.id, joinedAt: at });
  await db
    .insert(telemetry)
    .values({ accountId, type: "company_created", at, props: { company: company.id } });
  return company.id;
}

export async function joinCompany(db: Db, accountId: string, code: string, now: number) {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.code, code));
  if (!company) throw new CompanyError("unknown_company", 404);
  await mayJoin(db, accountId, now);
  if ((await membersOf(db, company.id)).length >= COMPANY_MAX) {
    throw new CompanyError("company_full", 409);
  }
  const at = new Date(now);
  await db.insert(companyMembers).values({ accountId, companyId: company.id, joinedAt: at });
  await db
    .insert(telemetry)
    .values({ accountId, type: "company_joined", at, props: { company: company.id } });
}

/** Leaves the company (the last one out closes it): a week before joining another. */
export async function leaveCompany(db: Db, accountId: string, now: number) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new CompanyError("not_member", 403);
  await db.delete(companyMembers).where(eq(companyMembers.accountId, accountId));
  await db
    .update(accounts)
    .set({ companyLeftAt: new Date(now) })
    .where(eq(accounts.id, accountId));
  if ((await membersOf(db, id)).length === 0) {
    await db.delete(companies).where(eq(companies.id, id));
  }
}

/** The region the company lacks in this world (the first of the theme's), or null. */
function missingRegion(world: GameWorld, memberIds: string[]): string | null {
  const taken = new Set(memberIds.map((id) => world.current.players[id]?.region));
  return world.ctx.theme.regions.find((r) => !taken.has(r.code))?.code ?? null;
}

/** What an invitation shows before joining: the company, whether it is full, what it lacks. */
export async function invitation(db: Db, world: GameWorld, code: string) {
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.code, code));
  if (!company) throw new CompanyError("unknown_company", 404);
  const members = await membersOf(db, company.id);
  const regions = members
    .map((m) => world.current.players[m.id]?.region)
    .filter((r): r is string => !!r);
  return {
    name: company.name,
    members: members.length,
    full: members.length >= COMPANY_MAX,
    regions: [...new Set(regions)],
    missingRegion: missingRegion(
      world,
      members.map((m) => m.id),
    ),
  };
}

/**
 * The shared record: every closed season two members or more played, with each one's place,
 * award and titles of the month.
 */
async function sharedRecord(db: Db, memberIds: string[], pseudo: Map<string, string | null>) {
  if (memberIds.length < COMPANY_MIN) return [];
  const rows = await db
    .select({
      worldId: seasonResults.worldId,
      name: worlds.name,
      endsAt: worlds.endsAt,
      accountId: seasonResults.accountId,
      rank: seasonResults.rank,
      tier: seasonResults.tier,
    })
    .from(seasonResults)
    .innerJoin(worlds, eq(worlds.id, seasonResults.worldId))
    .where(inArray(seasonResults.accountId, memberIds))
    .orderBy(desc(worlds.endsAt), seasonResults.rank);
  const byWorld = new Map<string, typeof rows>();
  for (const r of rows) byWorld.set(r.worldId, [...(byWorld.get(r.worldId) ?? []), r]);
  const out = [];
  for (const [worldId, list] of byWorld) {
    if (list.length < COMPANY_MIN) continue;
    const t = await monthTitles(db, worldId);
    out.push({
      season: list[0]?.name ?? "",
      endsAt: list[0]?.endsAt.getTime() ?? 0,
      members: list.map((r) => ({
        pseudo: pseudo.get(r.accountId) ?? null,
        rank: r.rank,
        award: tierInfo(r.tier).name,
        titles: [
          t.capitano === r.accountId ? MONTH_TITLES.capitano : null,
          t.gonfalone === r.accountId ? MONTH_TITLES.gonfalone : null,
        ].filter((x): x is string => x !== null),
      })),
    });
  }
  return out;
}

/** The company as a member sees it, or null outside any. */
export async function companyView(db: Db, world: GameWorld, accountId: string) {
  const id = await companyIdOf(db, accountId);
  if (!id) {
    const [row] = await db
      .select({ left: accounts.companyLeftAt })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    const until = row?.left ? row.left.getTime() + COMPANY_REJOIN_MS : null;
    return { company: null, mayJoinAt: until && until > world.now() ? until : null };
  }
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) return { company: null, mayJoinAt: null };
  const members = await membersOf(db, id);
  const ids = members.map((m) => m.id);
  const seen = new Map(
    (
      await db
        .select({ id: players.accountId, at: players.lastSeenAt })
        .from(players)
        .where(and(eq(players.worldId, world.id), inArray(players.accountId, ids)))
    ).map((r) => [r.id, r.at?.getTime() ?? null]),
  );
  const pseudo = new Map(members.map((m) => [m.id, m.pseudo]));
  const call = company.callAt && company.callAt.getTime() > world.now() ? company.callAt : null;
  return {
    company: {
      name: company.name,
      code: company.code,
      max: COMPANY_MAX,
      members: members.map((m) => ({
        pseudo: m.pseudo,
        me: m.id === accountId,
        region: world.current.players[m.id]?.region ?? null,
        lastSeenAt: seen.get(m.id) ?? null,
      })),
      missingRegion: missingRegion(world, ids),
      nextCall: nextSkirmishCall(world.ctx.settings.terraferma, world.now()),
      call: call
        ? { at: call.getTime(), by: company.callBy ? (pseudo.get(company.callBy) ?? null) : null }
        : null,
      record: await sharedRecord(db, ids, pseudo),
    },
    mayJoinAt: null,
  };
}

/**
 * A member calls the company to the next call to skirmish (E2-2): its members are told a
 * quarter of an hour before, within the daily cap of pushes, whether or not they asked for calls.
 */
export async function callCompany(db: Db, world: GameWorld, accountId: string, now: number) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new CompanyError("not_member", 403);
  const at = nextSkirmishCall(world.ctx.settings.terraferma, now);
  if (at === null) throw new CompanyError("no_call");
  await db
    .update(companies)
    .set({ callAt: new Date(at), callBy: accountId })
    .where(eq(companies.id, id));
  await db.insert(telemetry).values({
    accountId,
    worldId: world.id,
    type: "company_call",
    at: new Date(now),
    props: { at },
  });
  return at;
}

/** Members of every company called to the call at `at`, with the company's name. */
export async function calledTo(db: Db, at: number) {
  return db
    .select({ accountId: companyMembers.accountId, company: companies.name })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companies.callAt, new Date(at)));
}

/** The latest messages of the company's thread, oldest first. */
export async function companyThread(db: Db, accountId: string) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new ChatError("not_member", 403);
  const rows = await db
    .select({
      id: companyMessages.id,
      accountId: companyMessages.accountId,
      pseudo: accounts.pseudo,
      body: companyMessages.body,
      at: companyMessages.createdAt,
    })
    .from(companyMessages)
    .innerJoin(accounts, eq(accounts.id, companyMessages.accountId))
    .where(and(eq(companyMessages.companyId, id), eq(companyMessages.hidden, false)))
    .orderBy(desc(companyMessages.createdAt))
    .limit(THREAD_LENGTH);
  return {
    messages: rows.reverse().map((r) => ({
      id: r.id,
      pseudo: r.pseudo,
      body: r.body,
      at: r.at.getTime(),
      mine: r.accountId === accountId,
    })),
  };
}

export async function postCompanyMessage(db: Db, accountId: string, text: string, now: number) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new ChatError("not_member", 403);
  const body = checkMessage(text);
  const [last] = await db
    .select({ at: companyMessages.createdAt })
    .from(companyMessages)
    .where(eq(companyMessages.accountId, accountId))
    .orderBy(desc(companyMessages.createdAt))
    .limit(1);
  if (last && now - last.at.getTime() < MESSAGE_GAP_MS) throw new ChatError("message_too_fast");
  const [today] = await db
    .select({ n: count() })
    .from(companyMessages)
    .where(
      and(
        eq(companyMessages.accountId, accountId),
        gte(companyMessages.createdAt, new Date(now - 86_400_000)),
      ),
    );
  if (Number(today?.n ?? 0) >= MESSAGES_PER_DAY) throw new ChatError("message_too_many");
  const at = new Date(now);
  await db.insert(companyMessages).values({ companyId: id, accountId, body, createdAt: at });
  await db
    .insert(telemetry)
    .values({ accountId, type: "company_message", at, props: { length: body.length } });
}

/** A member reports a message of the company: hidden once enough members did. */
export async function reportCompanyMessage(
  db: Db,
  accountId: string,
  messageId: string,
  now: number,
) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new ChatError("not_member", 403);
  const [message] = await db
    .select()
    .from(companyMessages)
    .where(and(eq(companyMessages.id, messageId), eq(companyMessages.companyId, id)));
  if (!message) throw new ChatError("unknown_message", 404);
  if (message.accountId === accountId) throw new ChatError("own_message");
  await db
    .insert(companyMessageReports)
    .values({ messageId, reporterId: accountId, createdAt: new Date(now) })
    .onConflictDoNothing();
  const [reports] = await db
    .select({ n: count() })
    .from(companyMessageReports)
    .where(eq(companyMessageReports.messageId, messageId));
  if (Number(reports?.n ?? 0) >= HIDE_AFTER_REPORTS) {
    await db.update(companyMessages).set({ hidden: true }).where(eq(companyMessages.id, messageId));
  }
}

/** The invitation link was shared (for the measure of invitations per player). */
export async function inviteShared(db: Db, accountId: string, now: number) {
  const id = await companyIdOf(db, accountId);
  if (!id) throw new CompanyError("not_member", 403);
  await db
    .insert(telemetry)
    .values({ accountId, type: "company_invite", at: new Date(now), props: { company: id } });
}
