import type { WorldSettings } from "./settings.js";
import type { PlayerId, WorldContext, WorldState } from "./state.js";
import { type Tx, emit, fail } from "./tx.js";

export type SpecialtyEffects = WorldSettings["specialties"]["options"][string];

const NONE: SpecialtyEffects = {
  transformYieldBps: 0,
  vehicleSpeedBps: 0,
  extraVehicles: 0,
  mudaQuotaBps: 0,
  marketMakerQuotaBps: 0,
  taxDiscountBps: 0,
  extraOpenOrders: 0,
  marketMakerFloorBps: 0,
  urgentPreviewMinutes: 0,
  rawYieldBps: 0,
  cityPayBps: 0,
  signoriaBps: 0,
};

/**
 * What the merchant's mastery and its Atouts change (R3), added up: an Atout's effects are signed
 * (it gives and takes), so a sum may be negative; each use bounds it.
 */
export function specialtyEffects(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId | null | undefined,
): SpecialtyEffects {
  const player = playerId ? state.players[playerId] : undefined;
  const code = player?.specialty;
  const mastery = (code && ctx.settings.specialties.options[code]) || NONE;
  const held = player?.atouts ?? [];
  const catalog = ctx.settings.atouts?.catalog;
  if (held.length === 0 || !catalog) return mastery;
  const sum = { ...NONE, ...mastery };
  for (const a of held) {
    const fx = catalog[a]?.effects;
    if (!fx) continue;
    for (const key of Object.keys(sum) as (keyof SpecialtyEffects)[])
      sum[key] = (sum[key] ?? 0) + (fx[key] ?? 0);
  }
  return sum;
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

/** Vehicles the merchant may own. */
export function maxVehiclesFor(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  // An Atout may take a vehicle: never the last.
  return Math.max(
    1,
    ctx.settings.deliveries.maxVehicles + specialtyEffects(ctx, state, playerId).extraVehicles,
  );
}
