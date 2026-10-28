import { draw } from "./draw.js";
import type { WorldSettings } from "./settings.js";
import { type PlayerId, type WorldContext, type WorldState, dayIndex } from "./state.js";
import { type Tx, fail } from "./tx.js";

/**
 * The Dynastie (R4 of the audit of 27 October 2026, docs/plan-rupture.md): each month the
 * merchant plays a member of its house, and names an heir at the month's close with one trait
 * earned in the month (the server keeps the line, `generations`, and gives the trait at joining).
 * A trait is an option or a piece of information, never yield: the settings parse no other
 * effect. Off without its settings.
 */

export type TraitEffects = NonNullable<WorldSettings["dynasty"]>["traits"][string]["effects"];

const NONE: TraitEffects = {
  urgentPreviewMinutes: 0,
  atoutChoices: 0,
  freeDailyRerolls: 0,
  freeRespecs: 0,
  letterPreview: 0,
  signoriaRivals: 0,
};

/** What the merchant's trait gives (nothing without one). */
export function traitEffects(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId | null | undefined,
): TraitEffects {
  const code = playerId ? state.players[playerId]?.trait : undefined;
  const fx = code ? ctx.settings.dynasty?.traits[code]?.effects : undefined;
  return fx ?? NONE;
}

/** The trait an heir may take at joining: one of the catalog's, else none. */
export function knownTrait(ctx: WorldContext, code: string | undefined): string | undefined {
  return code && ctx.settings.dynasty?.traits[code] ? code : undefined;
}

/** Three names offered to the month's member of the house: drawn from the world's secret. */
export function heirNames(ctx: WorldContext, playerId: PlayerId): string[] {
  const names = ctx.settings.dynasty?.names ?? [];
  return names
    .map((name) => ({ name, w: draw(ctx, `heir:${playerId}:${name}`) }))
    .sort((a, b) => a.w - b.w || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((x) => x.name);
}

/** What the trait still gives for free: swaps of a task today, changes of mastery this season. */
export function freeLeft(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const fx = traitEffects(ctx, state, playerId);
  const saved = state.daily?.[playerId];
  const today = saved && saved.day === dayIndex(ctx, now) ? (saved.freeRerolls ?? 0) : 0;
  return {
    dailyRerolls: Math.max(0, fx.freeDailyRerolls - today),
    respecs: Math.max(0, fx.freeRespecs - (state.players[playerId]?.freeRespecs ?? 0)),
  };
}

/** A free change of mastery, counted (fails when the trait gives none left). */
export function takeFreeRespec(tx: Tx, playerId: PlayerId): void {
  if (freeLeft(tx.ctx, tx.s as WorldState, playerId, tx.now).respecs <= 0) fail("no_free_left");
  const player = tx.s.players[playerId];
  if (player) player.freeRespecs = (player.freeRespecs ?? 0) + 1;
}
