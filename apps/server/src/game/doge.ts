import {
  type WorldContext,
  type WorldState,
  citiesHeldBy,
  dogeTally,
  electionOpen,
  seasonEnd,
} from "@comptoirs/engine";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, doges } from "../db/schema.js";
import { nextSeasonBounds, seasonMonthKey } from "./calendar.js";

/**
 * The Doge on the server (R7, docs/plan-rupture.md): the election runs in the engine
 * (`doge.ts`); the server keeps the Doge elected for the month it rules, writes its programme
 * into that month's settings at the world's creation (announced before the 1st, stable all
 * month), and shows the election.
 */

/** The month a world's election chooses the Doge of: the next one. */
export function ruledMonth(ctx: WorldContext): string {
  return seasonMonthKey(nextSeasonBounds(seasonEnd(ctx)).endsAt);
}

/** At `doge_elected`: the Doge of the next month, kept with its programme. */
export async function recordDoge(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  e: { playerId?: string; data?: Record<string, unknown> },
  at: Date,
): Promise<void> {
  if (!e.playerId) return;
  const data = e.data ?? {};
  const row = {
    month: ruledMonth(ctx),
    accountId: e.playerId,
    worldId,
    mutator: typeof data.mutator === "string" ? data.mutator : null,
    decree: data.decree as { code: string; target?: string },
    votes: Number(data.votes ?? 0),
    at,
  };
  await db.insert(doges).values(row).onConflictDoUpdate({ target: doges.month, set: row });
}

/** The Doge ruling a month, with its programme (null: none was elected). */
export async function dogeOf(db: Db, month: string) {
  const [row] = await db
    .select({
      accountId: doges.accountId,
      pseudo: accounts.pseudo,
      crest: accounts.crest,
      mutator: doges.mutator,
      decree: doges.decree,
      votes: doges.votes,
    })
    .from(doges)
    .innerJoin(accounts, eq(accounts.id, doges.accountId))
    .where(eq(doges.month, month));
  return row ?? null;
}

/**
 * The settings a new month's world takes from its Doge: the decree and the mutator it rules
 * with, and itself as `previous` (it may not stand again this month). Nothing without a Doge.
 */
export async function dogeSettingsFor(db: Db, endsAt: number) {
  const doge = await dogeOf(db, seasonMonthKey(endsAt));
  if (!doge) return null;
  return {
    decree: doge.decree,
    ...(doge.mutator ? { mutator: doge.mutator } : {}),
    previous: doge.accountId,
  };
}

/**
 * The election for the screens: whether it runs and until when, the candidates with their
 * programme and voices, the merchant's own voice and what it would weigh, and the catalogs.
 */
export async function electionView(
  db: Db,
  ctx: WorldContext,
  state: WorldState,
  accountId: string,
  now: number,
) {
  const rules = ctx.settings.doge;
  if (!rules) return null;
  const election = state.election;
  const ids = election?.candidates ?? [];
  const names =
    ids.length === 0
      ? []
      : await db
          .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
          .from(accounts)
          .where(inArray(accounts.id, ids));
  const tally = new Map(dogeTally(state).map((t) => [t.playerId, t.votes]));
  const mine = election?.votes[accountId] ?? null;
  return {
    open: electionOpen(ctx, now),
    opensAt: seasonEnd(ctx) - rules.electionDays * 86_400_000,
    closesAt: seasonEnd(ctx),
    candidates: ids.map((id, i) => {
      const n = names.find((x) => x.id === id);
      return {
        id,
        rank: i + 1,
        pseudo: n?.pseudo ?? null,
        crest: n?.crest ?? null,
        programme: election?.programmes[id] ?? null,
        votes: tally.get(id) ?? 0,
      };
    }),
    candidate: ids.includes(accountId),
    mine,
    // One voice, one more a city held as Podestà; Influence on top, up to the cap.
    weight: 1 + citiesHeldBy(state, accountId).length,
    maxBoost: rules.maxBoost,
    influencePerVoice: rules.influencePerVoice,
    mutators: (ctx.settings.mutators?.catalog ?? []).map((m) => m.code),
    decrees: rules.decrees,
    effects: rules.effects,
    ruling: rules.decree ? { decree: rules.decree, mutator: rules.mutator ?? null } : null,
  };
}
