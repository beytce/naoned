import { gte, sql } from "drizzle-orm";
import type { Db } from "./db/client.js";
import { funnelCounts } from "./db/schema.js";

/**
 * The way in, step by step (E3-2 of the experts, 25 October 2026): the landing seen, a link asked
 * for, the first sign-in (a new account), a region chosen, a first batch launched. Counted per day
 * and campaign source, never per person.
 */
export const FUNNEL_STEPS = [
  "landing_view",
  "link_requested",
  "signed_in",
  "region_chosen",
  "first_produce",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/** The day of Paris of an instant: "2026-11-01". */
export function funnelDay(at: Date): string {
  return parisDay.format(at);
}

/** A campaign source as counted: lower case, 32 characters at most, '' for none. */
export function funnelSource(source: string | null | undefined): string {
  return (source ?? "").trim().toLowerCase().slice(0, 32);
}

/** One more through `step` today. */
export async function countFunnel(
  db: Db,
  step: FunnelStep,
  source: string | null | undefined,
  at: Date,
): Promise<void> {
  await db
    .insert(funnelCounts)
    .values({ day: funnelDay(at), step, source: funnelSource(source), count: 1 })
    .onConflictDoUpdate({
      target: [funnelCounts.day, funnelCounts.step, funnelCounts.source],
      set: { count: sql`${funnelCounts.count} + 1` },
    });
}

/** The last `days` days: per day, each step's count; per source, each step's total. */
export async function funnelReport(db: Db, now: Date, days = 14) {
  const from = funnelDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const rows = await db.select().from(funnelCounts).where(gte(funnelCounts.day, from));
  const empty = () => Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<string, number>;
  const byDay = new Map<string, Record<string, number>>();
  const bySource = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const d = byDay.get(r.day) ?? empty();
    d[r.step] = (d[r.step] ?? 0) + r.count;
    byDay.set(r.day, d);
    const s = bySource.get(r.source) ?? empty();
    s[r.step] = (s[r.step] ?? 0) + r.count;
    bySource.set(r.source, s);
  }
  return {
    steps: [...FUNNEL_STEPS],
    days: [...byDay].sort(([a], [b]) => (a < b ? 1 : -1)).map(([day, steps]) => ({ day, steps })),
    sources: [...bySource]
      .sort(([, a], [, b]) => (b.landing_view ?? 0) - (a.landing_view ?? 0))
      .map(([source, steps]) => ({ source, steps })),
  };
}
