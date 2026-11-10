import { draw } from "../draw.js";
import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  type EmpireCityOrders,
  type EmpireHouse,
  type EmpireOrder,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
} from "../state.js";
import { citiesCovered, citySpot, standingPosts } from "./map.js";
import type { EmpireSettings } from "./settings.js";
import { postsServing } from "./stores.js";

/**
 * The cities' orders (decision of the owner, 1 November 2026, after Hades' Star's shipments): each
 * city a counter of the house serves fills with orders, one every interval of its size, up to a
 * cap of its size; a full city asks nothing new until an order leaves it, and the next comes an
 * interval later (nothing is lost by the absence). An order is a fixed lot of a good a workshop of
 * the house makes, worth its reference with a premium; it takes a place of a vehicle's hold, is
 * loaded at a counter serving its city (moves.ts) and paid when brought there.
 */

/** A city's orders as the house sees them: the view's. */
export interface CityOrders {
  city: string;
  region: string;
  size: number;
  orders: EmpireOrder[];
  cap: number;
  /** How full the city is (the ring around it), in bps of its cap. */
  fillBps: number;
  /** When the next order comes; null while the city is full. */
  nextAt: number | null;
  /** The house's counters that serve it (a vehicle docked there may bring its orders). */
  posts: string[];
  /**
   * How well it knows the house (lot 5 of the living map): its tier, the deliveries it received,
   * the premium its orders pay now, and what the next tier asks and gives (null at the last).
   * Absent without the loyalty.
   */
  loyalty?: {
    tier: number;
    served: number;
    premiumBps: number;
    next: { at: number; premiumBps: number } | null;
  };
}

/** A town's tier of loyalty for so many deliveries received: 0 before the first threshold. */
export function loyaltyTier(s: EmpireSettings, served: number): number {
  const at = s.orders?.loyalty?.at ?? [];
  let tier = 0;
  while (tier < at.length && served >= (at[tier] ?? Number.POSITIVE_INFINITY)) tier++;
  return tier;
}

/** The premium a town's orders pay for so many deliveries received, in bps. */
export function loyaltyBps(s: EmpireSettings, served: number): number {
  const tier = loyaltyTier(s, served);
  return tier > 0 ? (s.orders?.loyalty?.premiumBps[tier - 1] ?? 0) : 0;
}

/** A town's loyalty as the view tells it; undefined without the loyalty. */
export function loyaltyOf(s: EmpireSettings, served: number): CityOrders["loyalty"] {
  const l = s.orders?.loyalty;
  if (!l) return undefined;
  const tier = loyaltyTier(s, served);
  const at = l.at[tier];
  return {
    tier,
    served,
    premiumBps: loyaltyBps(s, served),
    next: at !== undefined ? { at, premiumBps: l.premiumBps[tier] ?? 0 } : null,
  };
}

const sizeOf = (size: number) => Math.min(5, Math.max(1, size));
const capOf = (s: EmpireSettings, size: number) => s.orders?.cap[sizeOf(size) - 1] ?? 0;
const everyMs = (s: EmpireSettings, size: number) =>
  (s.orders?.everyMinutes[sizeOf(size) - 1] ?? 120) * MINUTE_MS;

/**
 * A good's reference price for a city's order: its region's, made or wanted there; else the
 * lowest of the regions that trade it; null when none does.
 */
export function orderRefOf(s: EmpireSettings, region: string, good: string): Deniers | null {
  const r = s.regions.find((x) => x.code === region);
  const here = r?.produces[good] ?? r?.demands[good];
  if (here !== undefined) return here;
  let low: Deniers | null = null;
  for (const x of s.regions) {
    const p = x.produces[good] ?? x.demands[good];
    if (p !== undefined && (low === null || p < low)) low = p;
  }
  return low;
}

/**
 * A good's lot: as set, else what is worth `lotDucats` at its reference, times its tier's (a
 * finished good's lot worth more than a raw one's, as a greater planet's shipments); one at least.
 */
export function lotOf(s: EmpireSettings, good: string, ref: Deniers, tier?: string): number {
  const set = s.orders?.lots[good];
  if (set !== undefined) return set;
  const times = (tier !== undefined ? s.orders?.tierTimes[tier] : undefined) ?? 1;
  const worth = BigInt((s.orders?.lotDucats ?? 0) * times) * DENIERS_PER_DUCAT;
  if (ref <= 0n) return 1;
  return Math.max(1, Number((worth + ref / 2n) / ref));
}

/** The goods the house's workshops can make, wherever they stand, sorted: the orders' goods. */
export function orderGoodsOf(ctx: WorldContext, h: EmpireHouse): string[] {
  const types = new Set(h.workshops.map((w) => w.type));
  const goods = new Set<string>();
  for (const r of ctx.theme.recipes)
    if (types.has(r.building)) for (const g of Object.keys(r.outputs)) goods.add(g);
  return [...goods].sort();
}

/** The goods to draw from, those the house makes now repeated `weight` times (each once else). */
export function weightedGoods(goods: string[], made: Set<string>, weight: number): string[] {
  return goods.flatMap((g) => Array.from({ length: made.has(g) ? weight : 1 }, () => g));
}

/** The premium of a long road: `distanceBps` a ten units of it, up to `distanceMaxBps`. */
export function distanceBonusBps(s: EmpireSettings, distance: number): number {
  const o = s.orders;
  if (!o || o.distanceBps <= 0) return 0;
  return Math.min(o.distanceMaxBps, Math.floor((distance * o.distanceBps) / 10));
}

/** A city's order's lot: a share of the good's lot for its first (`firstLotBps`), one at least. */
export function orderLot(lot: number, s: EmpireSettings, first: boolean): number {
  const share = first ? (s.orders?.firstLotBps ?? 10_000) : 10_000;
  return share >= 10_000 ? lot : Math.max(1, Math.round((lot * share) / 10_000));
}

/** The goods the house's workshops make now (their recipes' outputs). */
export function madeGoodsOf(ctx: WorldContext, h: EmpireHouse): Set<string> {
  const out = new Set<string>();
  for (const w of h.workshops) {
    const r = ctx.theme.recipes.find((x) => x.code === w.recipe);
    for (const g of Object.keys(r?.outputs ?? {})) out.add(g);
  }
  return out;
}

/** The order number `seq` of a city for a house: its good among those given, lot and pay. */
function drawOrder(
  ctx: WorldContext,
  s: EmpireSettings,
  playerId: PlayerId,
  code: string,
  region: string,
  seq: number,
  goods: string[],
  distance: number,
  served: number,
): EmpireOrder | null {
  if (goods.length === 0) return null;
  const good = goods[draw(ctx, `order|${playerId}|${code}|${seq}`) % goods.length] ?? "";
  const ref = orderRefOf(s, region, good);
  if (ref === null) return null;
  const tier = ctx.theme.resources.find((r) => r.code === good)?.tier;
  const qty = orderLot(lotOf(s, good, ref, tier), s, seq === 0);
  // What the town pays over the reference: its premium, the long road's, its loyalty's.
  const premium =
    (s.orders?.premiumBps ?? 0) + distanceBonusBps(s, distance) + loyaltyBps(s, served);
  const pay = applyBpsFloor(ref * BigInt(qty), 10_000 + premium);
  return { id: `${code}#${seq}`, city: code, good, qty, pay };
}

/**
 * A city's orders at a time, from what the house keeps of them: an order every interval since
 * the last kept, while fewer than the cap wait (a good the house makes, those it can trade); at
 * the cap, the time passes without any (the next one an interval after a place is freed).
 */
export function cityOrdersAt(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  now: number,
): EmpireCityOrders {
  const c = s.map.cities.find((x) => x.code === code);
  const kept = h.orders?.[code];
  if (!c || !s.orders) return { next: now, seq: kept?.seq ?? 0, list: [...(kept?.list ?? [])] };
  // The order of welcome waits apart, out of the city's cap (the first steps, lot 2).
  const welcome = (kept?.list ?? []).filter((o) => isWelcomeOrder(o.id));
  const list = (kept?.list ?? []).filter((o) => !isWelcomeOrder(o.id));
  const cap = capOf(s, c.size);
  const every = everyMs(s, c.size);
  const goods = weightedGoods(
    orderGoodsOf(ctx, h).filter((g) => orderRefOf(s, c.region, g) !== null),
    madeGoodsOf(ctx, h),
    s.orders.madeWeight,
  );
  // The road from the nearest fondaco (its premium, when set).
  const [cx, cy] = citySpot(c, s);
  const distance = Math.min(
    Number.POSITIVE_INFINITY,
    ...standingPosts(h, s).map((p) => Math.hypot(p.x - cx, p.y - cy)),
  );
  // A house that learns is asked more often for its first hours (lot 2 of the publication plan).
  const learning = s.orders.learning;
  const learnsUntil = learning ? h.joinedAt + learning.hours * HOUR_MS : 0;
  const everyAt = (at: number) =>
    learning && at < learnsUntil ? Math.min(every, learning.everyMinutes * MINUTE_MS) : every;
  // How well the town knows the house: its orders to come pay its tier's premium.
  const served = h.served?.[code] ?? 0;
  let next = kept?.next ?? now;
  let seq = kept?.seq ?? 0;
  while (next <= now && list.length < cap) {
    const o = drawOrder(ctx, s, playerId, code, c.region, seq, goods, distance, served);
    // Nothing the house could be asked for yet: the town keeps its turn for when there is
    // (the players' audit of 7 November 2026, P0-05: the turn was burnt, two hours of nothing).
    if (!o) {
      next = now;
      break;
    }
    list.push(o);
    seq++;
    next += everyAt(next);
  }
  // Full: the next comes an interval after a place is freed, none owed for the time passed.
  if (list.length >= cap && next <= now) next = now + every;
  // Never beyond the cap (5 November 2026: a cap lowered left a town at « 10/3 »; an order given
  // back to a full town): the best paid stay, in their order; the rest go, at no cost.
  if (list.length > cap) {
    const keep = new Set(
      [...list]
        .sort((a, b) =>
          BigInt(b.pay) > BigInt(a.pay) ? 1 : BigInt(b.pay) < BigInt(a.pay) ? -1 : 0,
        )
        .slice(0, cap),
    );
    return { next, seq, list: [...welcome, ...list.filter((o) => keep.has(o))] };
  }
  return { next, seq, list: [...welcome, ...list] };
}

/** The orders of every city the house's counters serve, at a time. */
export function ordersOf(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  now: number,
): CityOrders[] {
  if (!s.orders) return [];
  const covered = citiesCovered(h, s);
  return s.map.cities
    .filter((c) => covered.has(c.code))
    .map((c) => {
      const rec = cityOrdersAt(ctx, h, playerId, s, c.code, now);
      const cap = capOf(s, c.size);
      const full = rec.list.length >= cap;
      return {
        city: c.code,
        region: c.region,
        size: c.size,
        orders: rec.list,
        cap,
        fillBps: Math.min(10_000, Math.floor((rec.list.length * 10_000) / Math.max(1, cap))),
        // Full, the next one waits for a place: it comes an interval after one is freed.
        nextAt: full ? null : rec.next,
        posts: postsServing(h, s, c.code),
        ...(s.orders?.loyalty ? { loyalty: loyaltyOf(s, h.served?.[c.code] ?? 0) } : {}),
      };
    });
}

/** Takes an order out of its city at a time (loaded aboard): null when it is not there. */
export function takeOrder(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  code: string,
  id: string,
  now: number,
): EmpireOrder | null {
  const rec = cityOrdersAt(ctx, h, playerId, s, code, now);
  const o = rec.list.find((x) => x.id === id);
  if (!o) return null;
  const c = s.map.cities.find((x) => x.code === code);
  // Full until now: the next one an interval after this place is freed.
  const held = rec.list.filter((x) => !isWelcomeOrder(x.id)).length;
  const full = c && !isWelcomeOrder(o.id) && held >= capOf(s, c.size);
  const next = full && c ? now + everyMs(s, c.size) : rec.next;
  h.orders = {
    ...(h.orders ?? {}),
    [code]: { next, seq: rec.seq, list: rec.list.filter((x) => x !== o) },
  };
  return o;
}

/** Gives an order back to its city (unloaded at a counter), at a time. */
export function returnOrder(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  o: EmpireOrder,
  now: number,
): void {
  const rec = cityOrdersAt(ctx, h, playerId, s, o.city, now);
  const { id, city, good, qty, pay } = o;
  h.orders = {
    ...(h.orders ?? {}),
    [o.city]: { ...rec, list: [...rec.list, { id, city, good, qty, pay }] },
  };
}

/**
 * The cities newly served by the house's counters begin their orders now (the first one at once,
 * none for the time before); the waves of before are dropped once.
 */
export function trackOrders(h: EmpireHouse, s: EmpireSettings, now: number): void {
  if (!s.orders) return;
  const kept = Object.fromEntries(
    Object.entries(h.orders ?? {}).filter(([, r]) => r && !("waves" in r) && Array.isArray(r.list)),
  );
  const missing = [...citiesCovered(h, s)].filter((c) => !kept[c]);
  if (missing.length === 0 && Object.keys(kept).length === Object.keys(h.orders ?? {}).length)
    return;
  h.orders = {
    ...kept,
    ...Object.fromEntries(missing.map((c) => [c, { next: now, seq: 0, list: [] }])),
  };
}

/**
 * Keeps the orders come by now of every city the house serves: once kept, an order stays as it
 * was drawn, whatever the house builds after.
 */
export function settleOrders(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  now: number,
): void {
  if (!s.orders) return;
  trackOrders(h, s, now);
  const next = { ...(h.orders ?? {}) };
  for (const code of citiesCovered(h, s)) next[code] = cityOrdersAt(ctx, h, playerId, s, code, now);
  h.orders = next;
}

/** The id of the order of welcome in its city (docs/plan-premiers-pas.md lot 2). */
export const welcomeOrderId = (city: string) => `${city}#welcome`;
export const isWelcomeOrder = (id: string) => id.endsWith("#welcome");

/**
 * The order of welcome (the first steps, lot 2): in the town the house serves nearest its first
 * fondaco that trades the good, of its own region first, exactly the first lot, paid the welcome's sum. It waits there, its
 * city's cap notwithstanding, until it is brought. Returns its city, or null when no town serves.
 */
export function giveWelcomeOrder(
  ctx: WorldContext,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  good: string,
  qty: number,
  now: number,
): string | null {
  if (!s.orders || !s.welcome || qty <= 0) return null;
  const home = standingPosts(h, s)[0];
  if (!home) return null;
  const covered = citiesCovered(h, s);
  const city = s.map.cities
    .filter(
      (c) =>
        covered.has(c.code) &&
        orderRefOf(s, c.region, good) !== null &&
        // A town the house's own tiles link to a counter (7 November 2026).
        postsServing(h, s, c.code).length > 0,
    )
    .map((c) => {
      const [x, y] = citySpot(c, s);
      return { c, d: Math.hypot(x - home.x, y - home.y) };
    })
    // Venetia's towns first (the house's own region), then the nearest.
    .sort(
      (a, b) =>
        Number(a.c.region !== home.region) - Number(b.c.region !== home.region) ||
        a.d - b.d ||
        a.c.code.localeCompare(b.c.code),
    )[0]?.c;
  if (!city) return null;
  trackOrders(h, s, now);
  const rec = cityOrdersAt(ctx, h, playerId, s, city.code, now);
  const order: EmpireOrder = {
    id: welcomeOrderId(city.code),
    city: city.code,
    good,
    qty,
    pay: BigInt(s.welcome.payDucats) * DENIERS_PER_DUCAT,
  };
  h.orders = { ...(h.orders ?? {}), [city.code]: { ...rec, list: [order, ...rec.list] } };
  return city.code;
}
