import type { StockReason } from "../effects.js";
import type { EmpireHouse, EmpireWorkshop, PlayerId } from "../state.js";
import { type Tx, addStock, fail, inventoryLine, removeStock } from "../tx.js";
import { citySpot, reachOf, standingPosts } from "./map.js";
import type { EmpireSettings } from "./settings.js";

/**
 * Each counter's own stock (the map that grows, 31 October 2026): the goods are where they were
 * made, bought or carried, and a counter delivers only from its own. The counters beyond Venice
 * keep their stock in `h.stores`; Venice holds the rest of the house's inventory, so that their
 * sum is the inventory always, and a house of before has all its goods in Venice.
 */

export const HOME_POST = "home";
const HOME = "veneto";

/**
 * The counters holding a region's goods: Venice first for Venetia, then those put down there; a
 * region opened without a counter on the map (a world without one) holds them under its name.
 */
export function postsIn(h: EmpireHouse, s: EmpireSettings, region: string): string[] {
  const ids = standingPosts(h, s)
    .filter((p) => p.region === region)
    .map((p) => p.id);
  if (ids.length > 0) return ids;
  return region === HOME ? [HOME_POST] : [`@${region}`];
}

/** The counters that have a city in reach, Venice's first. */
export function postsServing(h: EmpireHouse, s: EmpireSettings, city: string): string[] {
  const c = s.map.cities.find((x) => x.code === city);
  if (!c) return [];
  const [cx, cy] = citySpot(c, s);
  return standingPosts(h, s)
    .filter((p) => {
      const r = reachOf(p.level, s);
      return (p.x - cx) ** 2 + (p.y - cy) ** 2 <= r * r;
    })
    .map((p) => p.id);
}

/** Where what is made, found or carried into a region goes: its first counter there. */
export function wherePut(h: EmpireHouse, s: EmpireSettings, region: string): string {
  return postsIn(h, s, region)[0] ?? HOME_POST;
}

/** A workshop's counter: the one it was built at, else its region's first. */
export function workshopPost(h: EmpireHouse, s: EmpireSettings, ws: EmpireWorkshop): string {
  return ws.post ?? wherePut(h, s, ws.region ?? HOME);
}

const awayOf = (h: EmpireHouse, good: string) =>
  Object.values(h.stores ?? {}).reduce((n, st) => n + (st[good] ?? 0), 0);

/** What a counter holds of a good. */
export function storeOf(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  post: string,
  good: string,
): number {
  if (post !== HOME_POST) return h.stores?.[post]?.[good] ?? 0;
  return Math.max(0, inventoryLine(tx, playerId, good).available - awayOf(h, good));
}

/** What a set of counters holds of a good together. */
export function heldAt(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  posts: string[],
  good: string,
): number {
  return [...new Set(posts)].reduce((n, p) => n + storeOf(tx, h, playerId, p, good), 0);
}

function shift(h: EmpireHouse, post: string, good: string, by: number) {
  if (post === HOME_POST || by === 0) return;
  const stores = h.stores ?? {};
  const st = { ...(stores[post] ?? {}) };
  const next = (st[good] ?? 0) + by;
  if (next > 0) st[good] = next;
  else delete st[good];
  h.stores = { ...stores, [post]: st };
}

/** Goods come into a counter's stock: the house's inventory, and the counter's share of it. */
export function putAt(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  post: string,
  good: string,
  qty: number,
  reason: StockReason,
  ref?: string,
): void {
  if (qty <= 0) return;
  addStock(tx, playerId, good, qty, reason, ref);
  shift(h, post, good, qty);
}

/** Goods leave a counter's stock, which must hold them. */
export function takeAt(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  post: string,
  good: string,
  qty: number,
  reason: StockReason,
  ref?: string,
): void {
  if (qty <= 0) return;
  if (storeOf(tx, h, playerId, post, good) < qty) fail("insufficient_stock");
  removeStock(tx, playerId, good, qty, reason, ref);
  shift(h, post, good, -qty);
}

/** Takes up to `qty` from counters in turn; returns what it took. */
export function takeFrom(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  posts: string[],
  good: string,
  qty: number,
  reason: StockReason,
  ref?: string,
): number {
  let left = qty;
  for (const post of [...new Set(posts)]) {
    if (left <= 0) break;
    const n = Math.min(left, storeOf(tx, h, playerId, post, good));
    takeAt(tx, h, playerId, post, good, n, reason, ref);
    left -= n;
  }
  return qty - left;
}

/** Each counter's stock, Venice's first: what it holds of each good (for the view). */
export function storesOf(
  inventory: Record<string, { available: number }> | undefined,
  h: EmpireHouse,
  s: EmpireSettings,
): { post: string; region: string; goods: Record<string, number> }[] {
  const home: Record<string, number> = {};
  for (const [good, line] of Object.entries(inventory ?? {})) {
    const n = Math.max(0, line.available - awayOf(h, good));
    if (n > 0) home[good] = n;
  }
  const others = standingPosts(h, s)
    .slice(1)
    .map((p) => ({ post: p.id, region: p.region, goods: { ...(h.stores?.[p.id] ?? {}) } }));
  return [{ post: HOME_POST, region: HOME, goods: home }, ...others];
}
