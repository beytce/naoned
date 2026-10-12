import { draw, pickWeighted } from "./draw.js";
import type { Deniers } from "./money.js";
import {
  type BaleCard,
  type BaleState,
  HOUR_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
  seasonEnd,
} from "./state.js";
import { findRegion } from "./theme.js";
import { type Tx, addStock, emit, fail } from "./tx.js";

/**
 * Faraj's bales. A merchant of Alexandria, whose cargo the player's grandfather once saved off
 * Candia, sends a sealed bale every few hours. They are counted lazily, like production: a saved
 * number of bales at a given time, then one more per interval, up to a cap.
 */

function balesOn(ctx: WorldContext): boolean {
  const cfg = ctx.settings.bales;
  return cfg.intervalHours > 0 && cfg.rarities.length > 0;
}

/** Saved state, or the one of a merchant who has not opened a bale yet. */
function baleState(ctx: WorldContext, state: WorldState, playerId: PlayerId): BaleState | null {
  const saved = state.bales?.[playerId];
  if (saved) return saved;
  const player = state.players[playerId];
  if (!player) return null;
  const cfg = ctx.settings.bales;
  return { stored: Math.min(cfg.maxStored, cfg.onJoin), since: player.joinedAt, opened: 0 };
}

/** Bales waiting at `now`, and the start of the interval under way (when not full). */
function accrue(ctx: WorldContext, b: BaleState, now: number) {
  const cfg = ctx.settings.bales;
  const interval = cfg.intervalHours * HOUR_MS;
  const until = Math.min(now, seasonEnd(ctx));
  const gained = until > b.since ? Math.floor((until - b.since) / interval) : 0;
  if (b.stored + gained >= cfg.maxStored) {
    return { available: cfg.maxStored, full: true, since: b.since };
  }
  return { available: b.stored + gained, full: false, since: b.since + gained * interval };
}

/** The welcome bale, on joining. */
export function grantStartingBales(tx: Tx, playerId: PlayerId): void {
  if (!balesOn(tx.ctx)) return;
  const cfg = tx.ctx.settings.bales;
  tx.s.bales ??= {};
  tx.s.bales[playerId] = { stored: Math.min(cfg.maxStored, cfg.onJoin), since: tx.now, opened: 0 };
}

/** Weights of the goods of a rarity: the merchant's own raw good weighs less. */
function goodsOf(ctx: WorldContext, resources: string[], region: string) {
  const own = findRegion(ctx.theme, region)?.bonusResource;
  return resources.map((resource) => ({
    resource,
    weight: resource === own ? ctx.settings.bales.ownRegionWeightBps : 10_000,
  }));
}

function quantitiesOf(weights: number[]) {
  return weights.map((weight, i) => ({ quantity: i + 1, weight }));
}

/**
 * The cards of a merchant's bale number `seq`, drawn from the world's secret: always the same
 * cards for the same bale, so neither reloading nor retrying changes it.
 */
export function drawBale(
  ctx: WorldContext,
  playerId: PlayerId,
  region: string,
  seq: number,
): BaleCard[] {
  const cfg = ctx.settings.bales;
  const cards: BaleCard[] = [];
  for (let k = 0; k < cfg.cardsPerBale; k++) {
    const key = `bale:${playerId}:${seq}:${k}`;
    const rarity = pickWeighted(cfg.rarities, draw(ctx, `${key}:rarity`)) ?? cfg.rarities[0];
    if (!rarity) break;
    const good =
      pickWeighted(goodsOf(ctx, rarity.resources, region), draw(ctx, `${key}:good`))?.resource ??
      rarity.resources[0] ??
      "";
    const quantity =
      pickWeighted(quantitiesOf(rarity.quantityWeights), draw(ctx, `${key}:qty`))?.quantity ?? 1;
    cards.push({ rarity: rarity.code, resource: good, quantity });
  }
  return cards;
}

/** Opens the oldest bale waiting: its goods go to the warehouse, through the stock journal. */
export function openBale(tx: Tx, playerId: PlayerId): void {
  if (!balesOn(tx.ctx)) fail("bales_off");
  const player = tx.s.players[playerId];
  const saved = baleState(tx.ctx, tx.s, playerId);
  if (!player || !saved) fail("unknown_player");
  const now = accrue(tx.ctx, saved, tx.now);
  if (now.available <= 0) fail("no_bale");
  const seq = saved.opened;
  const cards = drawBale(tx.ctx, playerId, player.region, seq);
  for (const c of cards) addStock(tx, playerId, c.resource, c.quantity, "bale_gift", `bale:${seq}`);
  tx.s.bales ??= {};
  tx.s.bales[playerId] = {
    stored: now.available - 1,
    // A full stack waited for nobody: the clock starts again from the opening.
    since: now.full ? tx.now : now.since,
    opened: seq + 1,
    last: { seq, at: tx.now, cards },
  };
  emit(tx, "bale_opened", playerId, {
    seq,
    cards: cards.map((c) => `${c.quantity} ${c.resource} (${c.rarity})`).join(", "),
  });
}

/** Chances in basis points, rounded down: what the "Probabilités" page shows. */
export function baleOdds(ctx: WorldContext, region: string) {
  const { rarities } = ctx.settings.bales;
  const total = rarities.reduce((n, r) => n + r.weight, 0);
  const bps = (w: number, of: number) => (of > 0 ? Math.floor((w * 10_000) / of) : 0);
  return rarities.map((r) => {
    const goods = goodsOf(ctx, r.resources, region);
    const goodsTotal = goods.reduce((n, g) => n + g.weight, 0);
    const qtyTotal = r.quantityWeights.reduce((n, w) => n + w, 0);
    return {
      rarity: r.code,
      chanceBps: bps(r.weight, total),
      goods: goods.map((g) => ({ resource: g.resource, chanceBps: bps(g.weight, goodsTotal) })),
      quantities: quantitiesOf(r.quantityWeights).map((q) => ({
        quantity: q.quantity,
        chanceBps: bps(q.weight, qtyTotal),
      })),
    };
  });
}

/** Average value of a bale at reference prices, for the simulator and the tests. */
export function expectedBaleValue(ctx: WorldContext, region: string): Deniers {
  const cfg = ctx.settings.bales;
  const total = BigInt(cfg.rarities.reduce((n, r) => n + r.weight, 0));
  if (total === 0n) return 0n;
  // Kept in thousandths of a denier until the end, so that rounding stays below one denier.
  let perCardMilli = 0n;
  for (const r of cfg.rarities) {
    const goods = goodsOf(ctx, r.resources, region);
    const goodsTotal = BigInt(goods.reduce((n, g) => n + g.weight, 0));
    const qtyTotal = BigInt(r.quantityWeights.reduce((n, w) => n + w, 0));
    if (goodsTotal === 0n || qtyTotal === 0n) continue;
    const price = goods.reduce(
      (n, g) => n + BigInt(g.weight) * (ctx.settings.referencePrices[g.resource] ?? 0n),
      0n,
    );
    const units = r.quantityWeights.reduce((n, w, i) => n + BigInt(w * (i + 1)), 0n);
    perCardMilli += (BigInt(r.weight) * price * units * 1_000n) / (goodsTotal * qtyTotal);
  }
  return (perCardMilli * BigInt(cfg.cardsPerBale)) / (total * 1_000n);
}

/** What the Comptoir shows: bales waiting, the next one, the last one opened and the odds. */
export function balesFor(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  if (!balesOn(ctx)) return null;
  const saved = baleState(ctx, state, playerId);
  const player = state.players[playerId];
  if (!saved || !player) return null;
  const cfg = ctx.settings.bales;
  const acc = accrue(ctx, saved, now);
  const next = acc.full ? null : acc.since + cfg.intervalHours * HOUR_MS;
  return {
    available: acc.available,
    max: cfg.maxStored,
    nextAt: next !== null && next < seasonEnd(ctx) ? next : null,
    intervalHours: cfg.intervalHours,
    opened: saved.opened,
    last: saved.last ?? null,
    odds: baleOdds(ctx, player.region),
  };
}
