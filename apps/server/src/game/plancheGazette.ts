import { type PlancheGazette, plancheGazette } from "@comptoirs/engine";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { gazettes } from "../db/schema.js";
import type { GuerreHub } from "./guerre.js";
import { mondayOf, plancheDocAdvance } from "./planche.js";
import type { PlancheStore } from "./plancheStore.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Past issues a player may open again. */
const KEPT = 12;

/** When the issue of a week is written: on Sunday, when the Muda comes back (8 h by default). */
function writtenAt(store: PlancheStore, monday: number): number {
  const M = store.hub.theme.board.muda;
  return monday + (M?.returnDay ?? 6) * DAY + (M?.returnHour ?? 8) * HOUR;
}

/**
 * The Gazette of a lagoon (docs/plan-muda.md N4): this week's issue once Sunday's is written (the
 * first to ask writes it), else the last one kept; and the weeks of its past issues.
 */
export async function gazetteOf(
  db: Db,
  store: PlancheStore,
  guerre: GuerreHub,
  now: number,
): Promise<{ issue: PlancheGazette | null; weeks: number[] }> {
  const monday = mondayOf(now);
  if (now >= writtenAt(store, monday)) {
    const [had] = await db
      .select({ week: gazettes.week })
      .from(gazettes)
      .where(and(eq(gazettes.worldId, store.worldId), eq(gazettes.week, new Date(monday))));
    if (!had) {
      const { doc } = store.hub.current();
      const state = plancheDocAdvance(store.hub.theme, doc, now).state;
      const names: Record<string, string> = {};
      for (const seat of Object.values(doc.seats)) names[seat.house] = seat.name;
      const issue = plancheGazette(
        store.hub.theme.board,
        state,
        now,
        names,
        await guerre.gazette(store, now),
      );
      await db
        .insert(gazettes)
        .values({ worldId: store.worldId, week: new Date(monday), issue, createdAt: new Date(now) })
        .onConflictDoNothing();
    }
  }
  const rows = await db
    .select()
    .from(gazettes)
    .where(eq(gazettes.worldId, store.worldId))
    .orderBy(desc(gazettes.week))
    .limit(KEPT);
  return {
    issue: (rows[0]?.issue as PlancheGazette | undefined) ?? null,
    weeks: rows.map((r) => r.week.getTime()),
  };
}

/** A past issue of a lagoon, by the Monday of its week. */
export async function gazetteAt(
  db: Db,
  store: PlancheStore,
  week: number,
): Promise<PlancheGazette | null> {
  const [row] = await db
    .select()
    .from(gazettes)
    .where(and(eq(gazettes.worldId, store.worldId), eq(gazettes.week, new Date(week))));
  return (row?.issue as PlancheGazette | undefined) ?? null;
}
