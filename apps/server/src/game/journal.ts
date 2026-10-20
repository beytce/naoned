import { MILAN, type WorldState } from "@comptoirs/engine";
import { inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";

const DAY = 86_400_000;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

export type JournalEntry =
  | {
      kind: "trade";
      at: number;
      buyer: string | null;
      seller: string | null;
      resource: string;
      quantity: number;
      value: bigint;
    }
  | { kind: "company"; at: number; city: string; merchants: number }
  | { kind: "conquest"; at: number; who: string | null; milan: boolean; cells: number }
  | { kind: "terra_week"; at: number; signore: string | null; conquest: boolean };

/**
 * The Journal du Rialto (recommendations of 20 October 2026): what the world did in the last day,
 * for everyone: the largest trades, the company orders filled, who took the most land on the
 * Terraferma. Newest first.
 */
export async function journal(db: Db, worldId: string, state: WorldState, now: number) {
  const since = now - DAY;
  const trades = rowsOf<{
    at: string;
    buyer_id: string;
    seller_id: string;
    resource: string;
    quantity: number;
    value: string;
  }>(
    await db.execute(sql`
      select extract(epoch from at)::bigint * 1000 as at, buyer_id, seller_id, resource, quantity,
        (price * quantity)::text as value
      from trades where world_id = ${worldId} and at >= ${new Date(since).toISOString()}::timestamptz
      order by price * quantity desc limit 5`),
  );
  // Land taken in the day, by its new holder.
  const taken = new Map<string, { cells: number; at: number }>();
  for (const [cell, change] of Object.entries(state.terra?.map.taken ?? {})) {
    if (change.at < since) continue;
    const owner = state.terra?.map.owner[Number(cell)];
    if (!owner) continue;
    const t = taken.get(owner) ?? { cells: 0, at: 0 };
    taken.set(owner, { cells: t.cells + 1, at: Math.max(t.at, change.at) });
  }
  const conquerors = [...taken.entries()].sort((a, b) => b[1].cells - a[1].cells).slice(0, 3);
  const ids = new Set<string>();
  for (const t of trades) {
    ids.add(t.buyer_id);
    ids.add(t.seller_id);
  }
  for (const [id] of conquerors) if (id !== MILAN) ids.add(id);
  const signore = state.terra?.map.closed?.signore ?? null;
  if (signore) ids.add(signore);
  const names = new Map<string, string | null>();
  // Only merchants are named (the market maker and the cities are not accounts).
  const known = [...ids].filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (known.length > 0) {
    const rows = await db
      .select({ id: accounts.id, pseudo: accounts.pseudo })
      .from(accounts)
      .where(inArray(accounts.id, known));
    for (const r of rows) names.set(r.id, r.pseudo);
  }
  const entries: JournalEntry[] = [
    ...trades.map((t) => ({
      kind: "trade" as const,
      at: Number(t.at),
      buyer: names.get(t.buyer_id) ?? null,
      seller: names.get(t.seller_id) ?? null,
      resource: t.resource,
      quantity: t.quantity,
      value: BigInt(t.value),
    })),
    ...Object.values(state.projects)
      .filter((p) => p.completedAt !== undefined && p.completedAt >= since)
      .map((p) => ({
        kind: "company" as const,
        at: p.completedAt as number,
        city: p.city,
        merchants: Object.keys(p.by ?? {}).length,
      })),
    ...conquerors.map(([id, t]) => ({
      kind: "conquest" as const,
      at: t.at,
      who: id === MILAN ? null : (names.get(id) ?? null),
      milan: id === MILAN,
      cells: t.cells,
    })),
  ];
  const closed = state.terra?.map.closed;
  if (closed && closed.at >= since)
    entries.push({
      kind: "terra_week",
      at: closed.at,
      signore: signore ? (names.get(signore) ?? null) : null,
      conquest: closed.conquest,
    });
  return { entries: entries.sort((a, b) => b.at - a.at) };
}
