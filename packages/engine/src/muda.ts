import { levantQuotaBps } from "./decrees.js";
import { openIncanto } from "./incanto.js";
import type { Deniers } from "./money.js";
import { arsenalMudaBps } from "./projects.js";
import { specialtyEffects } from "./specialties.js";
import {
  DAY_MS,
  HOUR_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
  activePlayerCount,
} from "./state.js";
import { type Tx, emit } from "./tx.js";

/**
 * The galleys of the Muda: every few days the state galleys bring the goods from overseas to
 * Venice. The Dogana sells the lot at the Rialto, dearer as it runs out, a few units per merchant
 * and per arrival; what is left waits for the next galleys, up to a few lots.
 */
/** Goods the galleys bring (none without the Muda). */
export function mudaGoods(ctx: WorldContext): string[] {
  return Object.keys(ctx.settings.muda?.lotPerActivePlayer ?? {});
}

export function isMudaGood(ctx: WorldContext, resource: string): boolean {
  return ctx.settings.muda?.lotPerActivePlayer[resource] !== undefined;
}

/** Index of the last arrival at `now`, or -1 before the first one (or without the Muda). */
function arrivalIndex(ctx: WorldContext, now: number): number {
  const m = ctx.settings.muda;
  if (!m) return -1;
  const since = now - ctx.startAt - m.hour * HOUR_MS;
  return since < 0 ? -1 : Math.floor(since / (m.everyDays * DAY_MS));
}

function arrivalAt(ctx: WorldContext, index: number): number {
  const m = ctx.settings.muda;
  return ctx.startAt + (m ? index * m.everyDays * DAY_MS + m.hour * HOUR_MS : 0);
}

/** When the next galleys arrive (after `now`); null without the Muda. */
export function nextMudaAt(ctx: WorldContext, now: number): number | null {
  if (!ctx.settings.muda) return null;
  return arrivalAt(ctx, arrivalIndex(ctx, now) + 1);
}

/** The galleys due since the last tick unload: each arrival adds a lot and opens new quotas. */
export function arriveMuda(tx: Tx): void {
  const { ctx } = tx;
  const m = ctx.settings.muda;
  if (!m) return;
  const index = arrivalIndex(ctx, tx.now);
  if (index < 0 || (tx.s.muda && tx.s.muda.arrival >= index)) return;
  tx.s.muda ??= { arrival: -1, stock: {}, lot: {}, bought: {} };
  const muda = tx.s.muda;
  const players = Math.max(1, activePlayerCount(ctx, tx.s as WorldState, tx.now));
  // Galleys missed between two ticks still came, but the quay holds only a few lots.
  const arrivals = Math.min(index - muda.arrival, m.maxStockLots);
  // The week after an Arsenal at the Silver, the galleys bring more (E2-6).
  const boost = arsenalMudaBps(ctx, tx.s as WorldState, tx.now);
  for (const [resource, perPlayer] of Object.entries(m.lotPerActivePlayer)) {
    const lot = Math.floor((perPlayer * players * (10_000 + boost)) / 10_000);
    const left = muda.stock[resource] ?? 0;
    muda.lot[resource] = lot;
    muda.stock[resource] = Math.min(left + arrivals * lot, m.maxStockLots * lot);
  }
  muda.arrival = index;
  muda.bought = {};
  // The incanto of the Sera takes its share of the lot (R11).
  openIncanto(tx, index, arrivalAt(ctx, index));
  emit(tx, "muda_arrived", undefined, { arrival: index, stock: { ...muda.stock } });
}

/** The Dogana's price for a good of the Muda: the reference, plus a share of the rise per unit gone. */
export function mudaPrice(ctx: WorldContext, state: WorldState, resource: string): Deniers {
  const reference = ctx.settings.referencePrices[resource] ?? 0n;
  const m = ctx.settings.muda;
  const lot = state.muda?.lot[resource] ?? 0;
  if (!m || lot <= 0) return reference;
  const gone = Math.max(0, lot - (state.muda?.stock[resource] ?? 0));
  return reference + (reference * BigInt(m.priceRiseBps) * BigInt(gone)) / (BigInt(lot) * 10_000n);
}

/** Bonus (or cut) on a merchant's quota at the Muda: the Levant mastery and the Levant's decree. */
function quotaBps(ctx: WorldContext, state: WorldState, playerId: PlayerId, at: number): number {
  return (
    specialtyEffects(ctx, state, playerId).mudaQuotaBps + levantQuotaBps(ctx, state, playerId, at)
  );
}

/** Units of a good a merchant may buy at each arrival. */
export function mudaQuota(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  resource: string,
  at: number,
): number {
  const base = ctx.settings.muda?.quotaPerPlayer[resource] ?? 0;
  const bps = Math.max(0, 10_000 + quotaBps(ctx, state, playerId, at));
  return Math.floor((base * bps) / 10_000);
}

/** Units a merchant may still buy until the next galleys. */
export function mudaRoom(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  resource: string,
  at: number,
): number {
  if (!state.muda) return 0;
  const used = state.muda.bought[playerId]?.[resource] ?? 0;
  return Math.max(0, mudaQuota(ctx, state, playerId, resource, at) - used);
}

/** A sale of the Dogana from the lot: less on the quay, less left to the merchant. */
export function useMuda(tx: Tx, playerId: PlayerId, resource: string, qty: number): void {
  const muda = tx.s.muda;
  if (!muda) return;
  muda.stock[resource] = Math.max(0, (muda.stock[resource] ?? 0) - qty);
  muda.bought[playerId] ??= {};
  const mine = muda.bought[playerId];
  mine[resource] = (mine[resource] ?? 0) + qty;
}

export interface MudaView {
  nextAt: number | null;
  /** When the last galleys came; null before the first ones. */
  arrivedAt: number | null;
  goods: string[];
  stock: Record<string, number>;
  price: Record<string, Deniers>;
  /** What the merchant may still buy until the next galleys. */
  left: Record<string, number>;
  quota: Record<string, number>;
}

export function mudaView(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): MudaView {
  const goods = mudaGoods(ctx);
  const view: MudaView = {
    nextAt: nextMudaAt(ctx, now),
    arrivedAt: state.muda ? arrivalAt(ctx, state.muda.arrival) : null,
    goods,
    stock: {},
    price: {},
    left: {},
    quota: {},
  };
  for (const r of goods) {
    view.stock[r] = state.muda?.stock[r] ?? 0;
    view.price[r] = mudaPrice(ctx, state, r);
    view.quota[r] = mudaQuota(ctx, state, playerId, r, now);
    view.left[r] = mudaRoom(ctx, state, playerId, r, now);
  }
  return view;
}
