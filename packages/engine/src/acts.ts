import { draw, pickWeighted } from "./draw.js";
import { type EventDef, activeEvent, eventCityBps } from "./events.js";
import type { WorldSettings } from "./settings.js";
import { DAY_MS, type WorldContext, seasonEnd } from "./state.js";

const WEEK_MS = 7 * DAY_MS;

export type ActDef = WorldSettings["acts"][number];

/** One act of the season: its weeks, the variant drawn for it, and Milan's strength. */
export interface SeasonAct {
  code: string;
  index: number;
  startsAt: number;
  endsAt: number;
  /** The act's market modifier, drawn from the world's secret (none for a calm act). */
  variant: EventDef | null;
  /** Milan's strength in the campaign during the act (10 000 = as usual). */
  milanBps: number;
}

/**
 * The acts of the season, in order; the last one runs to the end of the month. A season shorter
 * than its acts' weeks (a world opened late in the month) keeps every act, each one shortened.
 */
export function seasonActs(ctx: WorldContext): SeasonAct[] {
  // Read for every order priced: computed once per world (and end of season).
  const cached = ACTS.get(ctx);
  if (cached && cached.end === seasonEnd(ctx)) return cached.acts;
  const acts = computeActs(ctx);
  ACTS.set(ctx, { end: seasonEnd(ctx), acts });
  return acts;
}

const ACTS = new WeakMap<WorldContext, { end: number; acts: SeasonAct[] }>();

function computeActs(ctx: WorldContext): SeasonAct[] {
  const end = seasonEnd(ctx);
  const defs = [...ctx.settings.acts].sort((a, b) => a.week - b.week);
  if (defs.length === 0) return [];
  const span = ((defs[defs.length - 1]?.week ?? 0) + 1) * WEEK_MS;
  const scale = Math.min(1, (end - ctx.startAt) / span);
  const startOf = (week: number) => ctx.startAt + Math.floor(week * WEEK_MS * scale);
  return defs.map((a, index) => {
    const next = defs[index + 1];
    return {
      code: a.code,
      index,
      startsAt: startOf(a.week),
      endsAt: next ? startOf(next.week) : end,
      variant:
        a.variants.length > 0
          ? (pickWeighted(a.variants, draw(ctx, `act:${index}:${a.code}`)) ?? null)
          : null,
      milanBps: a.milanBps,
    };
  });
}

/** The act under way at `at`, if the season has acts. */
export function actAt(ctx: WorldContext, at: number): SeasonAct | null {
  return seasonActs(ctx).find((a) => at >= a.startsAt && at < a.endsAt) ?? null;
}

function actCityBps(
  ctx: WorldContext,
  at: number,
  city: string,
  resource: string,
  what: "price" | "capacity",
): number {
  const v = actAt(ctx, at)?.variant;
  if (!v || (v.city && v.city !== city)) return 10_000;
  const table = what === "price" ? v.cityPriceBps : v.cityCapacityBps;
  return table[resource] ?? 10_000;
}

/**
 * What the market asks of a city at `at`: the day's event and the act together (multiplied), on
 * the price or the quantity of its orders, in bps.
 */
export function marketCityBps(
  ctx: WorldContext,
  at: number,
  city: string,
  resource: string,
  what: "price" | "capacity",
): number {
  const event = eventCityBps(ctx, at, city, resource, what);
  const act = actCityBps(ctx, at, city, resource, what);
  // The month's mutator, all month long (E2-9).
  const month = ctx.settings.monthBps[what][resource] ?? 10_000;
  return Math.floor((Math.floor((event * act) / 10_000) * month) / 10_000);
}

/** Added to a resource's yield by the act under way (and by the day's event). */
export function marketYieldBps(ctx: WorldContext, at: number, resource: string): number {
  const event = activeEvent(ctx, at)?.yieldBps[resource] ?? 0;
  const act = actAt(ctx, at)?.variant?.yieldBps[resource] ?? 0;
  return event + act;
}
