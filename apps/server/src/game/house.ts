import { randomUUID } from "node:crypto";
import { type GameEvent, PARTICIPANT_DAYS, type WorldSettings } from "@comptoirs/engine";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, influenceEntries } from "../db/schema.js";

/**
 * The house between seasons, kept by the server (docs/plan-progression.md): its Influence is a
 * signed journal (`influence_entries`) that outlives the worlds — earned by the engine's events
 * at each week's close and by the season's tier, spent on patents. The engine is only told which
 * patents a house holds (on joining, or at once when one is bought during the season).
 */

export type HouseError =
  | "unknown_use"
  | "house_off"
  | "unknown_patent"
  | "patent_owned"
  | "patent_requires"
  | "not_enough_influence";

export class HouseRefused extends Error {
  constructor(readonly code: HouseError) {
    super(code);
  }
}

/** Influence earned by a command (engine events `influence_earned`), in its transaction. */
export async function recordInfluence(
  tx: Db,
  worldId: string,
  events: GameEvent[],
  at: Date,
): Promise<void> {
  const rows = events
    .filter((e) => e.type === "influence_earned" && e.playerId)
    .map((e) => {
      const source = String(e.data?.source ?? "commerce");
      const week = e.data?.week === undefined ? null : Number(e.data.week);
      // A mission carries its own key (board and mission); a week's earning, its week.
      const key = e.data?.key ? String(e.data.key) : `${source}:${week}`;
      return {
        accountId: e.playerId as string,
        worldId,
        source,
        week,
        amount: Number(e.data?.amount ?? 0),
        key: `${worldId}:${key}`,
        at,
      };
    })
    .filter((r) => r.amount > 0);
  if (rows.length > 0) await tx.insert(influenceEntries).values(rows).onConflictDoNothing();
}

/**
 * Influence of the season's tier, for each person ranked at the close who played a week of it:
 * a season closed early (or a merchant who barely came) brings none, whatever the rank.
 */
export async function recordSeasonInfluence(
  tx: Db,
  worldId: string,
  settings: WorldSettings,
  ranked: { accountId: string; tier: string; days: number }[],
  at: Date,
): Promise<void> {
  const scale = settings.house?.influence.season ?? {};
  const rows = ranked
    .filter((r) => r.days >= PARTICIPANT_DAYS)
    .map((r) => ({
      accountId: r.accountId,
      worldId,
      source: "season",
      amount: scale[r.tier] ?? 0,
      key: `${worldId}:season`,
      at,
    }))
    .filter((r) => r.amount > 0);
  if (rows.length > 0) await tx.insert(influenceEntries).values(rows).onConflictDoNothing();
}

/** The account's Influence and the patents it holds. */
export async function balanceOf(
  db: Db,
  accountId: string,
): Promise<{ influence: number; patents: string[] }> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${influenceEntries.amount}), 0)::int` })
    .from(influenceEntries)
    .where(eq(influenceEntries.accountId, accountId));
  const lines = await db
    .select({ source: influenceEntries.source, patent: influenceEntries.patent })
    .from(influenceEntries)
    .where(
      and(
        eq(influenceEntries.accountId, accountId),
        inArray(influenceEntries.source, ["patent", "refund"]),
      ),
    )
    .orderBy(influenceEntries.id);
  // A privilege withdrawn from the game was paid back: no longer held.
  const refunded = new Set(lines.filter((l) => l.source === "refund").map((l) => l.patent));
  return {
    influence: Number(row?.total ?? 0),
    patents: lines
      .filter((l) => l.source === "patent" && !refunded.has(l.patent))
      .map((l) => l.patent)
      .filter((p): p is string => !!p),
  };
}

/** Patents the account holds that this world knows (passed to the engine on joining). */
export async function patentsFor(db: Db, settings: WorldSettings, accountId: string) {
  const known = settings.house?.patents ?? {};
  return (await balanceOf(db, accountId)).patents.filter((p) => known[p]);
}

/** The Livre de la Maison: balance, latest lines, the catalogue and what is held. */
export async function houseOf(db: Db, settings: WorldSettings, accountId: string) {
  if (!settings.house) return { enabled: false as const };
  const { influence, patents } = await balanceOf(db, accountId);
  const entries = await db
    .select({
      source: influenceEntries.source,
      week: influenceEntries.week,
      amount: influenceEntries.amount,
      patent: influenceEntries.patent,
      at: influenceEntries.at,
    })
    .from(influenceEntries)
    .where(eq(influenceEntries.accountId, accountId))
    .orderBy(desc(influenceEntries.id))
    .limit(20);
  const catalog = Object.entries(settings.house.patents)
    .map(([code, p]) => ({
      code,
      cost: p.cost,
      requires: p.requires,
      owned: patents.includes(code),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return { enabled: true as const, influence, patents, entries, catalog };
}

/**
 * Buys a patent with Influence, in one transaction serialised per account: known to the world,
 * not held yet, its prerequisites held, the balance enough. Returns the new balance.
 */
export async function buyPatent(
  db: Db,
  settings: WorldSettings,
  accountId: string,
  patent: string,
  worldId: string,
  at: Date,
): Promise<{ influence: number; patents: string[] }> {
  if (!settings.house) throw new HouseRefused("house_off");
  const def = settings.house.patents[patent];
  if (!def) throw new HouseRefused("unknown_patent");
  return db.transaction(async (tx) => {
    // One purchase at a time per account: the balance cannot be spent twice.
    await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    const { influence, patents } = await balanceOf(tx, accountId);
    if (patents.includes(patent)) throw new HouseRefused("patent_owned");
    if (!def.requires.every((r) => patents.includes(r))) throw new HouseRefused("patent_requires");
    if (influence < def.cost) throw new HouseRefused("not_enough_influence");
    await tx.insert(influenceEntries).values({
      accountId,
      worldId,
      source: "patent",
      amount: -def.cost,
      patent,
      key: `patent:${patent}`,
      at,
    });
    return { influence: influence - def.cost, patents: [...patents, patent] };
  });
}

/**
 * A house of the computer at the season's start spends its Influence as a merchant would: the
 * cheapest patent within reach, again while the balance allows. Returns the patents held.
 */
export async function botBuysPatents(
  db: Db,
  settings: WorldSettings,
  accountId: string,
  worldId: string,
  at: Date,
): Promise<string[]> {
  if (!settings.house) return [];
  const catalog = Object.entries(settings.house.patents).sort(
    ([a, x], [b, y]) => x.cost - y.cost || a.localeCompare(b),
  );
  for (;;) {
    const { influence, patents } = await balanceOf(db, accountId);
    const next = catalog.find(
      ([code, p]) =>
        !patents.includes(code) &&
        p.cost <= influence &&
        p.requires.every((r) => patents.includes(r)),
    );
    if (!next) return patentsFor(db, settings, accountId);
    await buyPatent(db, settings, accountId, next[0], worldId, at);
  }
}

/**
 * Takes Influence for something bought in the world, in a transaction serialised per account.
 * Returns the line's key, to give the Influence back if the world then refuses.
 */
export async function spendInfluence(
  db: Db,
  accountId: string,
  use: string,
  cost: number,
  worldId: string,
  at: Date,
): Promise<string> {
  const key = `spend:${use}:${randomUUID()}`;
  await db.transaction(async (tx) => {
    await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    const { influence } = await balanceOf(tx, accountId);
    if (influence < cost) throw new HouseRefused("not_enough_influence");
    await tx
      .insert(influenceEntries)
      .values({ accountId, worldId, source: "spend", amount: -cost, patent: use, key, at });
  });
  return key;
}

/** Gives back Influence taken for something the world refused. */
export async function refundInfluence(db: Db, accountId: string, key: string): Promise<void> {
  await db
    .delete(influenceEntries)
    .where(and(eq(influenceEntries.accountId, accountId), eq(influenceEntries.key, key)));
}

/** Accounts among `ids` holding a patent (the gilded name in the rankings). */
export async function holdersOf(db: Db, ids: string[], patent: string): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: influenceEntries.accountId })
    .from(influenceEntries)
    .where(
      and(
        inArray(influenceEntries.accountId, ids),
        eq(influenceEntries.source, "patent"),
        eq(influenceEntries.patent, patent),
      ),
    );
  return new Set(rows.map((r) => r.id));
}
