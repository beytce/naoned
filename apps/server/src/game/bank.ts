import {
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
} from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";

const DAY = 86_400_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * The Rapport de la Banque de Venise (recommendations of 20 October 2026): the world's money in
 * the open, for anyone. The money held by merchants, per active merchant; what the last seven
 * days created and destroyed, by cause; nothing is ever sold for real money.
 */
export async function bankReport(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  now: number,
) {
  const active = Math.max(1, activePlayerCount(ctx, state, now));
  let held = 0n;
  for (const [account, amount] of Object.entries(state.accounts))
    if (account.startsWith("cash:") || account.startsWith("escrow:")) held += amount;
  const since = new Date(now - 7 * DAY).toISOString();
  const flows = rowsOf<{ side: string; reason: string; amount: string }>(
    await db.execute(sql`
      select case when from_account = ${SOURCE_ACCOUNT} then 'created' else 'destroyed' end as side,
        reason, sum(amount)::text as amount
      from ledger_entries
      where world_id = ${worldId} and at >= ${since}::timestamptz
        and (from_account = ${SOURCE_ACCOUNT} or to_account = ${SINK_ACCOUNT})
      group by 1, 2 order by sum(amount) desc`),
  );
  const side = (s: string) =>
    flows.filter((f) => f.side === s).map((f) => ({ reason: f.reason, amount: BigInt(f.amount) }));
  const created = side("created");
  const destroyed = side("destroyed");
  const total = (xs: { amount: bigint }[]) => xs.reduce((a, x) => a + x.amount, 0n);
  return {
    at: now,
    activeMerchants: active,
    moneyPerMerchant: held / BigInt(active),
    startingCapital: ctx.settings.startingCapital,
    week: { created, destroyed, net: total(created) - total(destroyed) },
  };
}

/** The merchant's ledger in this world, as CSV (date, cause, amount in and out, reference). */
export async function ledgerCsv(db: Db, worldId: string, playerId: string): Promise<string> {
  const cash = `cash:${playerId}`;
  const rows = rowsOf<{
    at: string;
    reason: string;
    amount: string;
    incoming: boolean;
    ref: string | null;
  }>(
    await db.execute(sql`
      select to_char(at at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI') as at, reason,
        amount::text as amount, to_account = ${cash} as incoming, ref
      from ledger_entries
      where world_id = ${worldId} and (from_account = ${cash} or to_account = ${cash})
      order by id`),
  );
  const ducats = (deniers: string) => {
    const n = BigInt(deniers);
    return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
  };
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [
    "date;cause;entree;sortie;reference",
    ...rows.map((r) =>
      [
        r.at,
        r.reason,
        r.incoming ? ducats(r.amount) : "",
        r.incoming ? "" : ducats(r.amount),
        quote(r.ref ?? ""),
      ].join(";"),
    ),
  ].join("\n");
}
