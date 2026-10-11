import { type WorldContext, type WorldState, cashAccount } from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";

/** A visit after this long gets the "while you were away" summary. */
export const WELCOME_AFTER_MS = 4 * 3_600_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * What happened while the player was away: money earned by source, upkeep paid, batches ready to
 * collect and notices received. Read from the journals, so it is exact.
 */
export async function welcomeBack(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  since: Date,
  now: number,
) {
  const cash = cashAccount(playerId);
  const income = rowsOf<{ reason: string; total: string }>(
    await db.execute(sql`
      select reason, sum(amount)::text as total from ledger_entries
      where world_id = ${worldId} and to_account = ${cash} and at > ${since.toISOString()}::timestamptz
        and reason in ('city_sale', 'trade', 'contract_reward', 'family_order_reward', 'project_delivery', 'market_maker_buy', 'mission_reward')
      group by reason`),
  );
  const [upkeep] = rowsOf<{ total: string | null }>(
    await db.execute(sql`
      select sum(amount)::text as total from ledger_entries
      where world_id = ${worldId} and from_account = ${cash} and reason = 'upkeep'
        and at > ${since.toISOString()}::timestamptz`),
  );
  const notices = rowsOf<{ kind: string; n: number }>(
    await db.execute(sql`
      select kind, count(*)::int as n from notifications
      where world_id = ${worldId} and account_id = ${playerId}::uuid
        and created_at > ${since.toISOString()}::timestamptz
      group by kind`),
  );
  let ready = 0;
  for (const b of Object.values(state.buildings)) {
    if (b.playerId !== playerId || !b.job) continue;
    ready += Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs));
  }
  const dormantAfter = ctx.settings.dormancy.afterHours * 3_600_000;
  return {
    since: since.getTime(),
    income: Object.fromEntries(income.map((r) => [r.reason, r.total])),
    upkeep: upkeep?.total ?? "0",
    readyBatches: ready,
    notices: Object.fromEntries(notices.map((r) => [r.kind, Number(r.n)])),
    /** The counting house slept (reduced upkeep, no hunger) for part of the absence. */
    slept: dormantAfter > 0 && now - since.getTime() > dormantAfter,
  };
}
