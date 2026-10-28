import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Db } from "./db/client.js";
import {
  accounts,
  companies,
  companyMembers,
  companyMessages,
  generations,
  influenceEntries,
  ledgerEntries,
  loginTokens,
  notifications,
  passGrants,
  players,
  pushSubscriptions,
  seasonResults,
  sessions,
  sfide,
  telemetry,
  trades,
  weeklyResults,
  worlds,
} from "./db/schema.js";

/**
 * Everything the game keeps about an account (GDPR, right of access and portability): the
 * account, the seasons played, results, Pass, notifications, activity, money and trades.
 */
export async function exportAccount(db: Db, accountId: string) {
  const [account] = await db
    .select({
      email: accounts.email,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      createdAt: accounts.createdAt,
      lastLoginAt: accounts.lastLoginAt,
      pushOff: accounts.pushOff,
      lustre: accounts.lustre,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  const cash = `cash:${accountId}`;
  return {
    exportedAt: new Date().toISOString(),
    account,
    seasons: await db
      .select({
        world: worlds.name,
        region: players.region,
        joinedAt: players.joinedAt,
        lastSeenAt: players.lastSeenAt,
      })
      .from(players)
      .innerJoin(worlds, eq(worlds.id, players.worldId))
      .where(eq(players.accountId, accountId)),
    seasonResults: await db
      .select()
      .from(seasonResults)
      .where(eq(seasonResults.accountId, accountId)),
    weeklyResults: await db
      .select()
      .from(weeklyResults)
      .where(eq(weeklyResults.accountId, accountId)),
    pass: await db.select().from(passGrants).where(eq(passGrants.accountId, accountId)),
    // The Lustre's Sfide (R6), as either side.
    sfide: await db
      .select({
        week: sfide.week,
        kind: sfide.kind,
        stake: sfide.stake,
        aGain: sfide.aGain,
        bGain: sfide.bGain,
        delta: sql<number>`case when ${sfide.a} = ${accountId} then ${sfide.deltaA} else ${sfide.deltaB} end`,
      })
      .from(sfide)
      .where(or(eq(sfide.a, accountId), eq(sfide.b, accountId))),
    // The Dynastie (R4): the line, one generation a month.
    generations: await db.select().from(generations).where(eq(generations.accountId, accountId)),
    influence: await db
      .select()
      .from(influenceEntries)
      .where(eq(influenceEntries.accountId, accountId)),
    notifications: await db
      .select()
      .from(notifications)
      .where(eq(notifications.accountId, accountId))
      .orderBy(desc(notifications.createdAt)),
    pushDevices: (
      await db
        .select({ createdAt: pushSubscriptions.createdAt })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.accountId, accountId))
    ).length,
    activity: await db
      .select({ type: telemetry.type, at: telemetry.at, props: telemetry.props })
      .from(telemetry)
      .where(eq(telemetry.accountId, accountId))
      .orderBy(telemetry.at),
    money: await db
      .select({
        at: ledgerEntries.at,
        from: ledgerEntries.fromAccount,
        to: ledgerEntries.toAccount,
        amount: ledgerEntries.amount,
        reason: ledgerEntries.reason,
      })
      .from(ledgerEntries)
      .where(or(eq(ledgerEntries.fromAccount, cash), eq(ledgerEntries.toAccount, cash)))
      .orderBy(ledgerEntries.at),
    trades: await db
      .select({
        at: trades.at,
        resource: trades.resource,
        price: trades.price,
        quantity: trades.quantity,
        bought: sql<boolean>`${trades.buyerId} = ${accountId}`,
      })
      .from(trades)
      .where(or(eq(trades.buyerId, accountId), eq(trades.sellerId, accountId)))
      .orderBy(trades.at),
    company:
      (
        await db
          .select({ name: companies.name, joinedAt: companyMembers.joinedAt })
          .from(companyMembers)
          .innerJoin(companies, eq(companies.id, companyMembers.companyId))
          .where(eq(companyMembers.accountId, accountId))
      )[0] ?? null,
    companyMessages: await db
      .select({ body: companyMessages.body, at: companyMessages.createdAt })
      .from(companyMessages)
      .where(eq(companyMessages.accountId, accountId))
      .orderBy(companyMessages.createdAt),
  };
}

/**
 * Deletes an account (GDPR, right to erasure). The person disappears: e-mail, name, crest,
 * sessions, devices, notifications and activity are erased. The merchant's books stay in the
 * world, unnamed, so the ledger and the other players' trades remain consistent.
 */
export async function deleteAccount(db: Db, accountId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!row) return;
    await tx.delete(sessions).where(eq(sessions.accountId, accountId));
    await tx.delete(loginTokens).where(eq(loginTokens.email, row.email));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.accountId, accountId));
    await tx.delete(notifications).where(eq(notifications.accountId, accountId));
    await tx.delete(telemetry).where(eq(telemetry.accountId, accountId));
    // Out of the company and its thread; a company left empty closes.
    await tx.delete(companyMessages).where(eq(companyMessages.accountId, accountId));
    const [member] = await tx
      .delete(companyMembers)
      .where(eq(companyMembers.accountId, accountId))
      .returning({ companyId: companyMembers.companyId });
    if (member) {
      const [left] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, member.companyId));
      if (Number(left?.n ?? 0) === 0) {
        await tx.delete(companies).where(eq(companies.id, member.companyId));
      }
    }
    await tx
      .update(accounts)
      .set({
        email: `deleted-${accountId}@deleted.invalid`,
        // The mailbox is free again: a new sign-up with it makes a new account.
        emailCanonical: null,
        pseudo: null,
        crest: null,
        lastLoginAt: null,
        pushOff: [],
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.isBot, false)));
  });
}
