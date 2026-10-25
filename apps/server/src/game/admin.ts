import { eq, sql } from "drizzle-orm";
import { canonicalEmail } from "../auth/canonical.js";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { TUTORIAL_STEPS } from "./tutorial.js";

const DAY = 86_400_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * Retention of people (bots excluded): day N retention among those who joined at least N days
 * ago, counted from any recorded activity; sessions per day; the tutorial funnel; and how long
 * ago players were last seen.
 */
export async function retention(db: Db, worldId: string, now: number) {
  const players = rowsOf<{ id: string; joined: string; last_seen: string | null; steps: string[] }>(
    await db.execute(sql`
      select p.account_id as id, extract(epoch from p.joined_at)::bigint * 1000 as joined,
        extract(epoch from p.last_seen_at)::bigint * 1000 as last_seen, p.tutorial_steps as steps
      from players p join accounts a on a.id = p.account_id
      where p.world_id = ${worldId} and a.is_bot = false`),
  );
  const activity = rowsOf<{ id: string; at: string }>(
    await db.execute(sql`
      select t.account_id as id, extract(epoch from t.at)::bigint * 1000 as at
      from telemetry t join accounts a on a.id = t.account_id
      where t.world_id = ${worldId} and a.is_bot = false`),
  );
  const days = new Map<string, Set<number>>();
  const joinedAt = new Map(players.map((p) => [p.id, Number(p.joined)]));
  for (const a of activity) {
    const joined = joinedAt.get(a.id);
    if (joined === undefined) continue;
    const set = days.get(a.id) ?? new Set<number>();
    set.add(Math.floor((Number(a.at) - joined) / DAY));
    days.set(a.id, set);
  }
  const retained = (n: number) => {
    const eligible = players.filter((p) => now - Number(p.joined) >= n * DAY);
    const back = eligible.filter((p) => [...(days.get(p.id) ?? [])].some((d) => d >= n));
    return { day: n, eligible: eligible.length, returned: back.length };
  };

  const sessions = rowsOf<{ day: string; sessions: number; players: number }>(
    await db.execute(sql`
      select to_char(date_trunc('day', t.at), 'YYYY-MM-DD') as day, count(*)::int as sessions,
        count(distinct t.account_id)::int as players
      from telemetry t join accounts a on a.id = t.account_id
      where t.world_id = ${worldId} and a.is_bot = false and t.type = 'session_start'
        and t.at > ${new Date(now - 14 * DAY).toISOString()}::timestamptz
      group by 1 order by 1`),
  );

  // Skirmishes: each merchant's match of the day, ranked or friendly; and any glory paid at
  // night (22 h to 8 h in Paris), which the rules forbid.
  const skirmishes = rowsOf<{ day: string; ranked: number; friendly: number; night: number }>(
    await db.execute(sql`
      select to_char(date_trunc('day', t.at at time zone 'Europe/Paris'), 'YYYY-MM-DD') as day,
        count(*) filter (where t.type = 'skirmish_played' and (t.props->>'ranked')::boolean)::int
          as ranked,
        count(*) filter (where t.type = 'skirmish_played'
          and not (t.props->>'ranked')::boolean)::int as friendly,
        count(*) filter (where t.type = 'terra_skirmish' and (extract(hour from
          t.at at time zone 'Europe/Paris') < 8 or extract(hour from
          t.at at time zone 'Europe/Paris') >= 22))::int as night
      from telemetry t join accounts a on a.id = t.account_id
      where t.world_id = ${worldId} and a.is_bot = false
        and t.type in ('skirmish_played', 'terra_skirmish')
        and t.at > ${new Date(now - 14 * DAY).toISOString()}::timestamptz
      group by 1 order by 1`),
  );

  // The calls to skirmish (E2-2): per day and call (« hors » outside them), the matches with a
  // merchant ranked or all friendly, and the merchants per match on average.
  const skirmishCalls = rowsOf<{
    day: string;
    call: string;
    ranked: number;
    friendly: number;
    humans: number;
  }>(
    await db.execute(sql`
      select day, call,
        count(*) filter (where ranked)::int as ranked,
        count(*) filter (where not ranked)::int as friendly,
        round(avg(humans), 1)::float as humans
      from (
        select to_char(date_trunc('day', t.at at time zone 'Europe/Paris'), 'YYYY-MM-DD') as day,
          coalesce(t.props->>'call', 'hors') as call, t.props->>'match' as match,
          bool_or((t.props->>'ranked')::boolean) as ranked,
          max((t.props->>'humans')::int) as humans
        from telemetry t join accounts a on a.id = t.account_id
        where t.world_id = ${worldId} and a.is_bot = false and t.type = 'skirmish_played'
          and t.props ? 'match'
          and t.at > ${new Date(now - 14 * DAY).toISOString()}::timestamptz
        group by 1, 2, 3
      ) m
      group by 1, 2 order by 1, 2`),
  );

  // The skirmishes' matches by week (Paris): paid, friendly or unpaid, lost to a restart; and the
  // checks that must stay at 0: a match's glory paid twice to a merchant, glory paid for a match
  // marked aborted (its quota spent).
  const skirmishWeeks = rowsOf<{ week: string; paid: number; done: number; aborted: number }>(
    await db.execute(sql`
      select to_char(date_trunc('week', m.opened_at at time zone 'Europe/Paris'), 'YYYY-MM-DD')
          as week,
        count(*) filter (where m.status = 'paid')::int as paid,
        count(*) filter (where m.status = 'done')::int as done,
        count(*) filter (where m.status = 'aborted')::int as aborted
      from skirmish_matches m
      where m.world_id = ${worldId}
      group by 1 order by 1`),
  );
  const [checks] = rowsOf<{ duplicates: number; aborted_paid: number }>(
    await db.execute(sql`
      select
        (select count(*)::int from (
          select t.props->>'matchId', t.account_id from telemetry t
          where t.world_id = ${worldId} and t.type = 'terra_skirmish' and t.props ? 'matchId'
          group by 1, 2 having count(*) > 1) d) as duplicates,
        (select count(*)::int from telemetry t
          join skirmish_matches m on m.id::text = t.props->>'matchId'
          where t.world_id = ${worldId} and t.type = 'terra_skirmish' and m.status = 'aborted')
          as aborted_paid`),
  );

  const lastSeen = { today: 0, days1to3: 0, days3to7: 0, moreThan7: 0, never: 0 };
  for (const p of players) {
    if (!p.last_seen) {
      lastSeen.never++;
      continue;
    }
    const ago = (now - Number(p.last_seen)) / DAY;
    if (ago < 1) lastSeen.today++;
    else if (ago < 3) lastSeen.days1to3++;
    else if (ago < 7) lastSeen.days3to7++;
    else lastSeen.moreThan7++;
  }

  return {
    players: players.length,
    retention: [1, 3, 7, 14, 30].map(retained),
    sessions,
    skirmishes,
    skirmishCalls,
    skirmishMatches: {
      weeks: skirmishWeeks,
      duplicates: checks?.duplicates ?? 0,
      abortedPaid: checks?.aborted_paid ?? 0,
    },
    tutorial: TUTORIAL_STEPS.map((step) => ({
      step,
      players: players.filter((p) => (p.steps ?? []).includes(step)).length,
    })),
    lastSeen,
  };
}

/**
 * Accounts of before that share their mailbox with an older one (left without a canonical address
 * by the migration of 24 October 2026), each with the address of the account that holds the
 * mailbox: for the owner to decide, never merged by the code.
 */
export async function sharedMailboxes(db: Db) {
  const rows = await db
    .select({ email: accounts.email, canonical: accounts.emailCanonical })
    .from(accounts)
    .where(eq(accounts.isBot, false));
  const holder = new Map(rows.filter((r) => r.canonical).map((r) => [r.canonical, r.email]));
  return rows
    .filter((r) => !r.canonical)
    .map((r) => ({ email: r.email, holder: holder.get(canonicalEmail(r.email)) ?? null }));
}

/**
 * Pairs of merchants who trade a lot with each other, away from the reference price: the trace of
 * a second account feeding a first one. People only; the market maker is left out.
 */
export async function suspiciousPairs(db: Db, worldId: string, references: Record<string, bigint>) {
  const rows = rowsOf<{
    buyer: string;
    seller: string;
    resource: string;
    price: string;
    quantity: number;
  }>(
    await db.execute(sql`
      select t.buyer_id as buyer, t.seller_id as seller, t.resource, t.price::text as price,
        t.quantity
      from trades t
      join accounts b on b.id::text = t.buyer_id and b.is_bot = false
      join accounts s on s.id::text = t.seller_id and s.is_bot = false
      where t.world_id = ${worldId}`),
  );
  const pairs = new Map<
    string,
    { a: string; b: string; trades: number; value: bigint; gap: bigint; transfer: bigint }
  >();
  for (const r of rows) {
    const [a, b] = [r.buyer, r.seller].sort() as [string, string];
    const key = `${a}|${b}`;
    const p = pairs.get(key) ?? { a, b, trades: 0, value: 0n, gap: 0n, transfer: 0n };
    const price = BigInt(r.price);
    const ref = references[r.resource] ?? price;
    const qty = BigInt(r.quantity);
    p.trades += 1;
    p.value += price * qty;
    // What the buyer paid above (or the seller gave below) the reference: value moved over.
    const moved = (price - ref) * qty;
    p.gap += moved < 0n ? -moved : moved;
    p.transfer += r.buyer === a ? moved : -moved;
    pairs.set(key, p);
  }
  const names = new Map(
    rowsOf<{ id: string; pseudo: string | null }>(
      await db.execute(sql`select id::text as id, pseudo from accounts where is_bot = false`),
    ).map((r) => [r.id, r.pseudo]),
  );
  return [...pairs.values()]
    .filter((p) => p.trades >= 3)
    .sort((x, y) => (y.gap > x.gap ? 1 : y.gap < x.gap ? -1 : 0))
    .slice(0, 20)
    .map((p) => ({
      a: names.get(p.a) ?? p.a,
      b: names.get(p.b) ?? p.b,
      trades: p.trades,
      value: p.value.toString(),
      /** Total distance from the reference price, both ways. */
      gap: p.gap.toString(),
      /** Net value moved from a to b, in deniers (negative: from b to a). */
      transfer: p.transfer.toString(),
    }));
}
