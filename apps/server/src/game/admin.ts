import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
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
    tutorial: TUTORIAL_STEPS.map((step) => ({
      step,
      players: players.filter((p) => (p.steps ?? []).includes(step)).length,
    })),
    lastSeen,
  };
}
