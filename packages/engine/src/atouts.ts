import { draw } from "./draw.js";
import { traitEffects } from "./dynasty.js";
import type { PlayerId, WorldContext, WorldState } from "./state.js";
import { type Tx, emit, fail } from "./tx.js";
import { weekIndex } from "./weekly.js";

/**
 * The Atouts (R3 of the audit of 27 October 2026, docs/plan-rupture.md): figures of Venice who
 * bend a rule for a merchant. Each week the merchant is offered a few of its pool (the starters
 * and those its account unlocked by a feat, kept from season to season by the server) and takes
 * one for the season. Each gives and takes; their effects add up with the mastery's
 * (`specialtyEffects`). The offer is drawn from the world's secret, the same all week. Off without
 * its settings.
 */

/** The Atouts a merchant may be offered: the starters, and those its account unlocked. */
export function atoutPool(ctx: WorldContext, state: WorldState, playerId: PlayerId): string[] {
  const catalog = ctx.settings.atouts?.catalog ?? {};
  const unlocked = new Set(state.players[playerId]?.atoutPool ?? []);
  return Object.entries(catalog)
    .filter(([code, a]) => a.starter || unlocked.has(code))
    .map(([code]) => code)
    .sort();
}

/** The Atouts offered to the merchant this week: drawn from its pool, those held left out. */
export function atoutOffer(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): string[] {
  const rules = ctx.settings.atouts;
  const player = state.players[playerId];
  if (!rules || !player) return [];
  const held = new Set(player.atouts ?? []);
  const week = weekIndex(ctx, now);
  const left = atoutPool(ctx, state, playerId).filter((c) => !held.has(c));
  // A shuffle by the world's secret: each card weighed by a draw of its own.
  return (
    left
      .map((code) => ({ code, w: draw(ctx, `atout:${playerId}:${week}:${code}`) }))
      .sort((a, b) => a.w - b.w || a.code.localeCompare(b.code))
      // The one raised at the Rialto sees one more card (R4).
      .slice(0, rules.choices + traitEffects(ctx, state, playerId).atoutChoices)
      .map((x) => x.code)
  );
}

/** Whether the merchant may still take an Atout this week. */
export function atoutOpen(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const player = state.players[playerId];
  if (!ctx.settings.atouts || !player) return false;
  return player.atoutWeek !== weekIndex(ctx, now);
}

/** The merchant takes one Atout of the week's offer, for the season. */
export function chooseAtout(tx: Tx, playerId: PlayerId, code: string): void {
  if (!tx.ctx.settings.atouts) fail("atouts_off");
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  const state = tx.s as WorldState;
  if (!atoutOpen(tx.ctx, state, playerId, tx.now)) fail("atout_taken");
  if (!atoutOffer(tx.ctx, state, playerId, tx.now).includes(code)) fail("atout_not_offered");
  player.atouts = [...(player.atouts ?? []), code];
  player.atoutWeek = weekIndex(tx.ctx, tx.now);
  emit(tx, "atout_chosen", playerId, { code });
}

/** From the server: an Atout the account unlocked joins the merchant's pool. */
export function unlockAtout(tx: Tx, playerId: PlayerId, code: string): void {
  const catalog = tx.ctx.settings.atouts?.catalog;
  if (!catalog) fail("atouts_off");
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (!catalog[code]) fail("unknown_atout");
  if (player.atoutPool?.includes(code)) return;
  player.atoutPool = [...(player.atoutPool ?? []), code];
}
