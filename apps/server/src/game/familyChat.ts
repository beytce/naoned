import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, familyMessages, messageReports, telemetry } from "../db/schema.js";
import type { GameWorld } from "./world.js";

/**
 * The family's thread: short messages between members of a patrician family, the first place
 * where merchants talk to each other. Kept small and moderated: members only, a pace, a word
 * filter, no links, and a message three members report is hidden.
 */
export const MESSAGE_MAX = 280;
export const MESSAGE_GAP_MS = 10_000;
export const MESSAGES_PER_DAY = 50;
export const HIDE_AFTER_REPORTS = 3;
const THREAD_LENGTH = 50;

/** Words refused in the thread (compared without accents or case, as whole words). */
const REFUSED = [
  "connard",
  "connasse",
  "salope",
  "salaud",
  "pute",
  "putain",
  "encule",
  "enculee",
  "nique",
  "niquer",
  "batard",
  "negre",
  "bougnoule",
  "youpin",
  "pede",
  "tapette",
  "gouine",
  "bite",
  "couille",
  "fdp",
  "ntm",
];

export class ChatError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
  }
}

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** The message as it will be kept (trimmed, spaces collapsed), or why it is refused. */
export function checkMessage(text: string): string {
  const body = text.replace(/\s+/g, " ").trim();
  if (body.length === 0) throw new ChatError("message_empty");
  if (body.length > MESSAGE_MAX) throw new ChatError("message_too_long");
  const words = plain(body).split(/[^a-z0-9]+/);
  if (words.some((w) => REFUSED.includes(w))) throw new ChatError("message_refused");
  if (/https?:|www\.|\.(com|fr|net|org|io|gg)\b/i.test(body)) {
    throw new ChatError("message_refused");
  }
  return body;
}

function familyOf(world: GameWorld, accountId: string): string {
  const family = world.current.families?.members[accountId];
  if (!family) throw new ChatError("not_member", 403);
  return family;
}

/** The latest messages of the merchant's family, oldest first. */
export async function familyThread(db: Db, world: GameWorld, accountId: string) {
  const family = familyOf(world, accountId);
  const rows = await db
    .select({
      id: familyMessages.id,
      accountId: familyMessages.accountId,
      pseudo: accounts.pseudo,
      body: familyMessages.body,
      at: familyMessages.createdAt,
    })
    .from(familyMessages)
    .innerJoin(accounts, eq(accounts.id, familyMessages.accountId))
    .where(
      and(
        eq(familyMessages.worldId, world.id),
        eq(familyMessages.family, family),
        eq(familyMessages.hidden, false),
      ),
    )
    .orderBy(desc(familyMessages.createdAt))
    .limit(THREAD_LENGTH);
  return {
    family,
    messages: rows.reverse().map((r) => ({
      id: r.id,
      pseudo: r.pseudo,
      body: r.body,
      at: r.at.getTime(),
      mine: r.accountId === accountId,
    })),
  };
}

export async function postMessage(
  db: Db,
  world: GameWorld,
  accountId: string,
  text: string,
  now: number,
) {
  const family = familyOf(world, accountId);
  const body = checkMessage(text);
  const since = new Date(now - 86_400_000);
  const [last] = await db
    .select({ at: familyMessages.createdAt })
    .from(familyMessages)
    .where(eq(familyMessages.accountId, accountId))
    .orderBy(desc(familyMessages.createdAt))
    .limit(1);
  if (last && now - last.at.getTime() < MESSAGE_GAP_MS) throw new ChatError("message_too_fast");
  const [today] = await db
    .select({ n: count() })
    .from(familyMessages)
    .where(and(eq(familyMessages.accountId, accountId), gte(familyMessages.createdAt, since)));
  if (Number(today?.n ?? 0) >= MESSAGES_PER_DAY) throw new ChatError("message_too_many");
  const at = new Date(now);
  await db
    .insert(familyMessages)
    .values({ worldId: world.id, family, accountId, body, createdAt: at });
  await db.insert(telemetry).values({
    accountId,
    worldId: world.id,
    type: "family_message",
    at,
    props: { family, length: body.length },
  });
}

/** A member reports a message of their family: hidden once enough members did. */
export async function reportMessage(
  db: Db,
  world: GameWorld,
  accountId: string,
  messageId: string,
  now: number,
) {
  const family = familyOf(world, accountId);
  const [message] = await db
    .select()
    .from(familyMessages)
    .where(
      and(
        eq(familyMessages.id, messageId),
        eq(familyMessages.worldId, world.id),
        eq(familyMessages.family, family),
      ),
    );
  if (!message) throw new ChatError("unknown_message", 404);
  if (message.accountId === accountId) throw new ChatError("own_message");
  await db
    .insert(messageReports)
    .values({ messageId, reporterId: accountId, createdAt: new Date(now) })
    .onConflictDoNothing();
  const [reports] = await db
    .select({ n: count() })
    .from(messageReports)
    .where(eq(messageReports.messageId, messageId));
  if (Number(reports?.n ?? 0) >= HIDE_AFTER_REPORTS) {
    await db.update(familyMessages).set({ hidden: true }).where(eq(familyMessages.id, messageId));
  }
}

/** Admin: reported messages of the world, most reported first. */
export async function reportedMessages(db: Db, worldId: string) {
  const counts = await db
    .select({ messageId: messageReports.messageId, n: count() })
    .from(messageReports)
    .groupBy(messageReports.messageId);
  const ids = counts.map((c) => c.messageId);
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: familyMessages.id,
      family: familyMessages.family,
      pseudo: accounts.pseudo,
      body: familyMessages.body,
      at: familyMessages.createdAt,
      hidden: familyMessages.hidden,
    })
    .from(familyMessages)
    .innerJoin(accounts, eq(accounts.id, familyMessages.accountId))
    .where(and(eq(familyMessages.worldId, worldId), inArray(familyMessages.id, ids)));
  const n = new Map(counts.map((c) => [c.messageId, Number(c.n)]));
  return rows
    .map((r) => ({ ...r, at: r.at.getTime(), reports: n.get(r.id) ?? 0 }))
    .sort((a, b) => b.reports - a.reports || b.at - a.at);
}

/** Admin: hides a message for good. */
export async function hideMessage(db: Db, worldId: string, messageId: string) {
  await db
    .update(familyMessages)
    .set({ hidden: true })
    .where(and(eq(familyMessages.id, messageId), eq(familyMessages.worldId, worldId)));
}

/** The newest visible message of the merchant's family (to mark the thread unread). */
export async function latestMessageAt(db: Db, world: GameWorld, accountId: string) {
  const family = world.current.families?.members[accountId];
  if (!family) return null;
  const [row] = await db
    .select({ at: sql<Date>`max(${familyMessages.createdAt})` })
    .from(familyMessages)
    .where(
      and(
        eq(familyMessages.worldId, world.id),
        eq(familyMessages.family, family),
        eq(familyMessages.hidden, false),
      ),
    );
  return row?.at ? new Date(row.at).getTime() : null;
}
