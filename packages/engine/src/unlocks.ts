import type { PlayerId, WorldContext, WorldState } from "./state.js";
import { turnoverOf } from "./turnover.js";

/**
 * The luxury chains (recommendations of 20 October 2026): some workshops open only once the
 * merchant's net sales of the season reach a threshold, the same as a merchant title's.
 */

/** Whether the merchant may build (and upgrade) a workshop of this type. */
export function isUnlocked(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  type: string,
): boolean {
  const at = ctx.settings.unlocks[type];
  return at === undefined || turnoverOf(state, playerId) >= at;
}

/** A good made only in workshops that must be unlocked. */
export function lockedGood(ctx: WorldContext, resource: string): boolean {
  const makers = ctx.theme.recipes.filter((r) => (r.outputs[resource] ?? 0) > 0);
  return makers.length > 0 && makers.every((r) => ctx.settings.unlocks[r.building] !== undefined);
}

/** Whether the merchant owns a workshop that makes this good. */
export function makesGood(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  resource: string,
): boolean {
  const types = new Set(
    ctx.theme.recipes.filter((r) => (r.outputs[resource] ?? 0) > 0).map((r) => r.building),
  );
  return Object.values(state.buildings).some((b) => b.playerId === playerId && types.has(b.type));
}
