import type { WorldContext, WorldSettings } from "@comptoirs/engine";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accountAtouts, accounts, players } from "../db/schema.js";

/**
 * The Atouts on the server (R3, docs/plan-rupture.md): what an account unlocked by a feat, kept
 * from season to season, given to the world when the merchant joins and when a feat unlocks one.
 * The rules (offer, choice, effects) are the engine's (`atouts.ts`).
 */

/** The feats that unlock an Atout, from the engine's events. */
const FEATS: Record<string, (data: Record<string, unknown>) => boolean> = {
  podesta_named: () => true,
  incanto_won: () => true,
  terra_result: (data) => data.signore === true,
};
const REASON: Record<string, string> = {
  podesta_named: "podesta",
  incanto_won: "incanto",
  terra_result: "signore",
};

/** The Atouts an account unlocked, those still in the world's catalog. */
export async function atoutPoolFor(
  db: Db,
  settings: WorldSettings,
  accountId: string,
): Promise<string[]> {
  const catalog = settings.atouts?.catalog;
  if (!catalog) return [];
  const rows = await db
    .select({ code: accountAtouts.code })
    .from(accountAtouts)
    .where(eq(accountAtouts.accountId, accountId));
  return rows.map((r) => r.code).filter((c) => catalog[c]);
}

/** The catalog's Atouts a feat unlocks. */
function unlockedBy(settings: WorldSettings, reason: string): string[] {
  return Object.entries(settings.atouts?.catalog ?? {})
    .filter(([, a]) => a.unlock === reason)
    .map(([code]) => code);
}

/** People only: the computer's houses unlock nothing. */
async function people(db: Db, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(inArray(accounts.id, ids), eq(accounts.isBot, false)));
  return new Set(rows.map((r) => r.id));
}

/** Records the Atouts unlocked; returns the new ones, to be given to the world. */
async function unlock(
  db: Db,
  worldId: string,
  settings: WorldSettings,
  pairs: { accountId: string; reason: string }[],
  at: Date,
): Promise<{ accountId: string; code: string }[]> {
  const rows = pairs.flatMap((p) =>
    unlockedBy(settings, p.reason).map((code) => ({
      accountId: p.accountId,
      code,
      reason: p.reason,
      worldId,
      at,
    })),
  );
  if (rows.length === 0) return [];
  const done = await db
    .insert(accountAtouts)
    .values(rows)
    .onConflictDoNothing()
    .returning({ accountId: accountAtouts.accountId, code: accountAtouts.code });
  return done;
}

/**
 * The feats of a transaction's events: a Podestà named, a lot won at the incanto, the Signore of
 * a week. Returns the Atouts newly unlocked.
 */
export async function recordAtoutUnlocks(
  db: Db,
  worldId: string,
  settings: WorldSettings,
  events: { type: string; playerId?: string; data?: Record<string, unknown> }[],
  at: Date,
): Promise<{ accountId: string; code: string }[]> {
  if (!settings.atouts) return [];
  const feats = events.filter((e) => e.playerId && FEATS[e.type]?.(e.data ?? {}) && REASON[e.type]);
  if (feats.length === 0) return [];
  const humans = await people(
    db,
    feats.map((e) => e.playerId ?? ""),
  );
  const pairs = feats
    .filter((e) => humans.has(e.playerId ?? ""))
    .map((e) => ({ accountId: e.playerId ?? "", reason: REASON[e.type] ?? "" }));
  return unlock(db, worldId, settings, pairs, at);
}

/** The Mercante's rank at the Lustre, reached by the world's people at a week's close. */
export async function unlockByLustre(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  at: Date,
): Promise<{ accountId: string; code: string }[]> {
  const rules = ctx.settings.lustre;
  if (!ctx.settings.atouts || !rules) return [];
  const mercante = rules.tiers.find((t) => t.code === "mercante");
  if (!mercante) return [];
  const rows = await db
    .select({ id: accounts.id, lustre: accounts.lustre })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(
      and(
        eq(players.worldId, worldId),
        eq(accounts.isBot, false),
        isNull(players.retiredAt),
        gte(accounts.lustre, mercante.from),
      ),
    );
  return unlock(
    db,
    worldId,
    ctx.settings,
    rows.map((r) => ({ accountId: r.id, reason: "mercante" })),
    at,
  );
}
