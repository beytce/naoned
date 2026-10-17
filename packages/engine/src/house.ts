import type { Deniers } from "./money.js";
import type { DeliveryOrder, PlayerId, WorldContext, WorldState } from "./state.js";
import { findRegion } from "./theme.js";
import { type Tx, emit, fail } from "./tx.js";

/**
 * The house between seasons (see docs/plan-progression.md): its fortune starts afresh every
 * month, but it keeps the patents it bought with Influence, which only ever add something new
 * (a second counter, the Levant, Lombardy…), never more yield. Influence is earned each week by
 * net sales and by the families' campaign, each capped; the server keeps it from season to season.
 */

/** Whether the house holds this patent and the world knows it. */
export function hasPatent(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  code: string,
): boolean {
  if (!ctx.settings.house?.patents[code]) return false;
  return state.players[playerId]?.patents?.includes(code) ?? false;
}

/** The second counter's region for the season: once, in another region than the house's. */
export function chooseSecondCounter(tx: Tx, playerId: PlayerId, region: string): void {
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (!hasPatent(tx.ctx, tx.s as WorldState, playerId, "second_counter")) fail("no_patent");
  if (player.secondRegion) fail("second_counter_set");
  if (region === player.region) fail("same_region");
  if (!findRegion(tx.ctx.theme, region)) fail("unknown_region");
  player.secondRegion = region;
  emit(tx, "second_counter", playerId, { region });
}

/** Share of the reference an order pays for its road: the base, plus a bonus per hour. */
function roadBps(ctx: WorldContext, region: string, city: string): bigint {
  const { cityPriceBps, distanceBonusBpsPerHour, routes } = ctx.settings.deliveries;
  const minutes = routes[region]?.[city] ?? 0;
  return BigInt(cityPriceBps + Math.floor((distanceBonusBpsPerHour * minutes) / 60));
}

/**
 * An order's price per unit when it leaves from a counter in `region` rather than from home: the
 * same pay per hour of road, so a shorter road pays less (whatever premium the order carries).
 */
export function counterPrice(
  ctx: WorldContext,
  order: Pick<DeliveryOrder, "unitPrice" | "city">,
  home: string,
  region: string,
): Deniers {
  if (region === home) return order.unitPrice;
  return (order.unitPrice * roadBps(ctx, region, order.city)) / roadBps(ctx, home, order.city);
}

/** At the close of the week: Influence for the net sales of the week (`gain`, in deniers). */
export function commerceInfluence(
  tx: Tx,
  week: number,
  gains: { playerId: PlayerId; gain: Deniers }[],
): void {
  const cfg = tx.ctx.settings.house?.influence.commerce;
  if (!cfg) return;
  const per = BigInt(cfg.ducatsPerPoint) * 100n;
  for (const { playerId, gain } of [...gains].sort((a, b) => (a.playerId < b.playerId ? -1 : 1))) {
    const amount = gain > 0n ? Math.min(cfg.weeklyCap, Number(gain / per)) : 0;
    if (amount > 0) emit(tx, "influence_earned", playerId, { source: "commerce", week, amount });
  }
}

/**
 * At the close of the campaign's week: Influence for each member's merit, and a bonus to those
 * of the winning family who earned some.
 */
export function campaignInfluence(
  tx: Tx,
  week: number,
  winner: string | null,
  members: { playerId: PlayerId; family: string; merit: number }[],
): void {
  const cfg = tx.ctx.settings.house?.influence.campaign;
  if (!cfg) return;
  for (const m of [...members].sort((a, b) => (a.playerId < b.playerId ? -1 : 1))) {
    if (m.merit <= 0) continue;
    const bonus = m.family === winner ? cfg.winBonus : 0;
    const amount = Math.min(cfg.weeklyCap, Math.floor(m.merit / cfg.meritPerPoint) + bonus);
    if (amount > 0) {
      emit(tx, "influence_earned", m.playerId, {
        source: "campaign",
        week,
        amount,
        merit: m.merit,
      });
    }
  }
}
