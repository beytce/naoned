import {
  TURNOVER_SALES,
  type WorldContext,
  type WorldState,
  capOf,
  cashAccount,
  cellsOf,
  isNation,
  recruitPerHour,
  terraOn,
} from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";

/** A visit after this long (a new session) gets the "while you were away" summary. */
export const WELCOME_AFTER_MS = 30 * 60_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * What happened while the player was away: money earned by source, batches ready to collect and
 * notices received. Read from the journals, so it is exact.
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
  // Every sale the ranking counts, and the rewards of the ledger and the guilds.
  const reasons = [
    ...TURNOVER_SALES,
    "mission_reward",
    "guild_dividend",
    "guild_payout",
    "decree_share",
  ];
  const income = rowsOf<{ reason: string; total: string }>(
    await db.execute(sql`
      select reason, sum(amount)::text as total from ledger_entries
      where world_id = ${worldId} and to_account = ${cash} and at > ${since.toISOString()}::timestamptz
        and reason in (${sql.join(
          reasons.map((r) => sql`${r}`),
          sql`, `,
        )})
      group by reason`),
  );
  // The week closed while away, if any: the latest results.
  const [week] = rowsOf<{ data: { week: number; rank: number; gain: string; award?: string } }>(
    await db.execute(sql`
      select data from notifications
      where world_id = ${worldId} and account_id = ${playerId}::uuid and kind = 'week'
        and created_at > ${since.toISOString()}::timestamptz
      order by created_at desc limit 1`),
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
  // The road: deliveries arrived.
  const from = since.getTime();
  const road = { arrived: 0 };
  for (const d of Object.values(state.deliveries ?? {})) {
    if (d.playerId === playerId && d.outcome !== "en_route" && d.arriveAt > from) road.arrived++;
  }
  // What the fattore sent meanwhile: the goods left the stock without the merchant.
  const commissionBps = ctx.settings.deliveries.fattore?.commissionBps ?? 0;
  const fattore = Object.values(state.deliveries ?? {})
    .filter((d) => d.playerId === playerId && d.fattore && d.departAt > from)
    .sort((a, b) => a.departAt - b.departAt)
    .map((d) => ({
      id: d.id,
      city: d.route.split(":")[1] ?? "",
      resource: d.resource,
      quantity: d.loaded,
      paid: d.outcome === "delivered" ? (d.paid ?? 0n) : null,
      commissionBps,
    }));
  const dormantAfter = ctx.settings.dormancy.afterHours * 3_600_000;
  return {
    terra: terraWhileAway(ctx, state, playerId, from),
    since: since.getTime(),
    income: Object.fromEntries(income.map((r) => [r.reason, r.total])),
    readyBatches: ready,
    notices: Object.fromEntries(notices.map((r) => [r.kind, Number(r.n)])),
    road,
    week: week
      ? {
          week: Number(week.data.week),
          rank: Number(week.data.rank),
          gain: String(week.data.gain ?? "0"),
          award: week.data.award ?? null,
        }
      : null,
    fattore,
    /** The counting house slept (no hunger) for part of the absence. */
    slept: dormantAfter > 0 && now - since.getTime() > dormantAfter,
  };
}

/**
 * The Terraferma while the merchant was away: the cells taken and lost since (the last change of
 * each cell), its fronts come home, and where it stands now (troops, glory, rank).
 */
function terraWhileAway(ctx: WorldContext, state: WorldState, playerId: string, since: number) {
  const cfg = terraOn(ctx);
  const map = state.terra?.map;
  const me = map?.players[playerId];
  if (!cfg || !map || !me) return null;
  let gained = 0;
  let lost = 0;
  for (const [cell, t] of Object.entries(map.taken ?? {})) {
    if (t.at <= since) continue;
    const holder = map.owner[Number(cell)];
    if (holder === playerId && t.from !== playerId) gained++;
    else if (t.from === playerId && holder !== playerId) lost++;
  }
  const returns = (map.returns ?? []).filter((r) => r.owner === playerId && r.at > since);
  const ranking = Object.entries(map.players)
    .filter(([id]) => !isNation(id))
    .sort((a, b) => b[1].glory - a[1].glory || (a[0] < b[0] ? -1 : 1));
  return {
    gained,
    lost,
    fronts: returns.length,
    spent: returns.reduce((n, r) => n + r.spent, 0),
    cells: cellsOf(map, playerId).length,
    troops: me.troops,
    cap: capOf(map, cfg, playerId),
    perHour: recruitPerHour(map, cfg, playerId),
    glory: me.glory,
    rank: ranking.findIndex(([id]) => id === playerId) + 1,
    eliminated: me.eliminatedAt !== undefined,
  };
}
