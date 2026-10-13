import { levantDuesBps } from "./decrees.js";
import { applyBpsFloor } from "./money.js";
import type { Deniers } from "./money.js";
import type { WorldSettings } from "./settings.js";
import type { PlayerId, WorldContext, WorldState } from "./state.js";
import { type Tx, emit, fail } from "./tx.js";

export type SpecialtyEffects = WorldSettings["specialties"]["options"][string];

const NONE: SpecialtyEffects = {
  transformYieldBps: 0,
  vehicleSpeedBps: 0,
  extraVehicles: 0,
  marketMakerQuotaBps: 0,
  taxDiscountBps: 0,
  extraOpenOrders: 0,
  portDuesDiscountBps: 0,
  holdBps: 0,
};

/** What the merchant's mastery changes (nothing before one is chosen). */
export function specialtyEffects(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId | null | undefined,
): SpecialtyEffects {
  const code = playerId ? state.players[playerId]?.specialty : undefined;
  return (code && ctx.settings.specialties.options[code]) || NONE;
}

/** Levels of all the merchant's workshops: the house's growth. */
export function houseLevels(state: WorldState, playerId: PlayerId): number {
  let n = 0;
  for (const b of Object.values(state.buildings)) if (b.playerId === playerId) n += b.level;
  return n;
}

/** The house has grown enough to choose its mastery (and has not chosen yet). */
export function specialtyUnlocked(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
): boolean {
  const options = ctx.settings.specialties.options;
  if (Object.keys(options).length === 0) return false;
  return houseLevels(state, playerId) >= ctx.settings.specialties.unlockLevels;
}

/** Chooses the mastery of the season: once, for good. */
export function chooseSpecialty(tx: Tx, playerId: PlayerId, specialty: string): void {
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (player.specialty) fail("specialty_chosen");
  if (!tx.ctx.settings.specialties.options[specialty]) fail("unknown_specialty");
  if (!specialtyUnlocked(tx.ctx, tx.s as WorldState, playerId)) fail("specialty_locked");
  player.specialty = specialty;
  emit(tx, "specialty_chosen", playerId, { specialty });
}

/** Port dues of the merchant's own convoy: lighter for a shipowner. */
export function portDuesFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  charter: Deniers,
  at: number,
): Deniers {
  const base = applyBpsFloor(charter, ctx.settings.ships.portDuesBps);
  // The Levant's tariff: lighter for the family that imposed it, heavier for the others.
  const dues = applyBpsFloor(base, levantDuesBps(ctx, state, playerId, at));
  const discount = specialtyEffects(ctx, state, playerId).portDuesDiscountBps;
  return discount > 0 ? applyBpsFloor(dues, 10_000 - discount) : dues;
}

/** Vehicles the merchant may own. */
export function maxVehiclesFor(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  return ctx.settings.deliveries.maxVehicles + specialtyEffects(ctx, state, playerId).extraVehicles;
}
