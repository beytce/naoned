import { draw, pickWeighted } from "./draw.js";
import type { WorldSettings } from "./settings.js";
import { DAY_MS, HOUR_MS, type WorldContext, seasonEnd } from "./state.js";

export type EventDef = WorldSettings["events"]["catalog"][number];

export interface MarketEvent extends EventDef {
  index: number;
  startsAt: number;
  endsAt: number;
}

/** Events drawn so far, per world: read for every order priced. */
const EVENTS = new WeakMap<
  WorldContext,
  { end: number; byIndex: Map<number, MarketEvent | null> }
>();

/** The k-th event window: from day 1, every `everyDays` days, for `durationHours`. */
function eventAtIndex(ctx: WorldContext, k: number): MarketEvent | null {
  let cache = EVENTS.get(ctx);
  if (!cache || cache.end !== seasonEnd(ctx)) {
    cache = { end: seasonEnd(ctx), byIndex: new Map() };
    EVENTS.set(ctx, cache);
  }
  if (cache.byIndex.has(k)) return cache.byIndex.get(k) ?? null;
  const e = drawEventAtIndex(ctx, k);
  cache.byIndex.set(k, e);
  return e;
}

function drawEventAtIndex(ctx: WorldContext, k: number): MarketEvent | null {
  const { everyDays, durationHours, catalog } = ctx.settings.events;
  if (k < 0 || catalog.length === 0) return null;
  const startsAt = ctx.startAt + (k * everyDays + 1) * DAY_MS;
  if (startsAt >= seasonEnd(ctx)) return null;
  const def = pickWeighted(catalog, draw(ctx, `event:${k}`));
  if (!def) return null;
  return { ...def, index: k, startsAt, endsAt: startsAt + durationHours * HOUR_MS };
}

function indexAt(ctx: WorldContext, at: number): number {
  return Math.floor((at - ctx.startAt - DAY_MS) / (ctx.settings.events.everyDays * DAY_MS));
}

/** The event under way at `at`, if any. Pure: the schedule follows from the world alone. */
export function activeEvent(ctx: WorldContext, at: number): MarketEvent | null {
  const e = eventAtIndex(ctx, indexAt(ctx, at));
  return e && at >= e.startsAt && at < e.endsAt ? e : null;
}

/** The next event to start after `at` (announced in advance by the gazette). */
export function nextEvent(ctx: WorldContext, at: number): MarketEvent | null {
  for (let k = Math.max(0, indexAt(ctx, at)); k < Math.max(0, indexAt(ctx, at)) + 3; k++) {
    const e = eventAtIndex(ctx, k);
    if (e && e.startsAt > at) return e;
  }
  return null;
}

/** Multiplier in bps applied by the active event to a city's price or capacity for a resource. */
export function eventCityBps(
  ctx: WorldContext,
  at: number,
  city: string,
  resource: string,
  what: "price" | "capacity",
): number {
  const e = activeEvent(ctx, at);
  if (!e || (e.city && e.city !== city)) return 10_000;
  const table = what === "price" ? e.cityPriceBps : e.cityCapacityBps;
  return table[resource] ?? 10_000;
}

export function eventYieldBps(ctx: WorldContext, at: number, resource: string): number {
  return activeEvent(ctx, at)?.yieldBps[resource] ?? 0;
}
