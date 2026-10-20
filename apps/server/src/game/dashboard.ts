import {
  type LedgerReason,
  TURNOVER_COSTS,
  TURNOVER_SALES,
  type WorldContext,
  type WorldState,
  dayStartIn,
  weeklyStandings,
  workshopEconomics,
} from "@comptoirs/engine";
import { inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";

const DAY = 86_400_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * The counter's dashboard (recommendations of 20 October 2026): what the workshops earn an hour,
 * the net sales of the day, the week and the season, and the last seven days of net sales of the
 * merchant, its rival of the week and the week's leader, day by day.
 */
export async function dashboard(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  now: number,
) {
  const perHour = Object.values(state.buildings)
    .filter((b) => b.playerId === playerId)
    .reduce((n, b) => n + workshopEconomics(ctx, state, playerId, b, now).marginPerHour, 0n);
  const standings = weeklyStandings(ctx, state, now);
  const at = standings.findIndex((s) => s.playerId === playerId);
  const leader = standings[0]?.playerId ?? null;
  const rival = at > 0 ? standings[at - 1]?.playerId : standings[1]?.playerId;
  const ids = [...new Set([playerId, rival, leader].filter((x): x is string => !!x))];
  const since = dayStartIn(now - 6 * DAY).start;
  const accountsOf = ids.flatMap((id) => [`cash:${id}`, `escrow:${id}`]);
  const list = sql.join(
    accountsOf.map((a) => sql`${a}`),
    sql`, `,
  );
  const rows = rowsOf<{
    from_account: string;
    to_account: string;
    amount: string;
    reason: string;
    day: string;
  }>(
    await db.execute(sql`
      select from_account, to_account, amount::text as amount, reason,
        to_char(at at time zone 'Europe/Paris', 'YYYY-MM-DD') as day
      from ledger_entries
      where world_id = ${worldId} and at >= ${new Date(since).toISOString()}::timestamptz
        and (to_account in (${list}) or from_account in (${list}))`),
  );
  const days = Array.from({ length: 7 }, (_, k) =>
    new Date(dayStartIn(now - (6 - k) * DAY).start + 12 * 3_600_000).toLocaleDateString("fr-CA", {
      timeZone: "Europe/Paris",
    }),
  );
  // Net sales per merchant and day, counted as the ranking counts them (see turnover.ts).
  const net = new Map<string, bigint>();
  const add = (id: string, day: string, amount: bigint) =>
    net.set(`${id}|${day}`, (net.get(`${id}|${day}`) ?? 0n) + amount);
  const merchant = (account: string) => account.replace(/^(cash|escrow):/, "");
  for (const r of rows) {
    const reason = r.reason as LedgerReason;
    const to =
      TURNOVER_SALES.has(reason) && accountsOf.includes(r.to_account)
        ? merchant(r.to_account)
        : null;
    const from =
      TURNOVER_COSTS.has(reason) && accountsOf.includes(r.from_account)
        ? merchant(r.from_account)
        : null;
    if (to && to === from) continue;
    if (to) add(to, r.day, BigInt(r.amount));
    if (from) add(from, r.day, -BigInt(r.amount));
  }
  const series = (id: string) => days.map((day) => net.get(`${id}|${day}`) ?? 0n);
  const names = new Map<string, string | null>();
  if (ids.length > 0) {
    const rs = await db
      .select({ id: accounts.id, pseudo: accounts.pseudo })
      .from(accounts)
      .where(inArray(accounts.id, ids));
    for (const r of rs) names.set(r.id, r.pseudo);
  }
  const today = series(playerId).at(-1) ?? 0n;
  return {
    perHour,
    today,
    week: standings[at]?.gain ?? 0n,
    days,
    lines: ids.map((id) => ({
      who: id === playerId ? "me" : id === leader ? "leader" : "rival",
      pseudo: names.get(id) ?? null,
      daily: series(id),
    })),
  };
}
