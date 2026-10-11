import { type Deniers, applyBpsFloor, bigMin } from "./money.js";
import {
  type PlayerId,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  escrowAccount,
} from "./state.js";

/** Volume-weighted average price over the last `days` full and current days, if volume suffices. */
export function vwap(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  now: number,
  days: number,
): Deniers | undefined {
  const today = dayIndex(ctx, now);
  let volume = 0;
  let value = 0n;
  for (let d = today - days + 1; d <= today; d++) {
    const stat = state.priceStats[resource]?.[d];
    if (stat) {
      volume += stat.volume;
      value += stat.value;
    }
  }
  if (volume < ctx.settings.valuation.minVolume || volume === 0) return undefined;
  return value / BigInt(volume);
}

/** Prudence principle: the lower of the reference price and the recent VWAP. */
export function stockUnitValue(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  now: number,
): Deniers {
  const reference = ctx.settings.referencePrices[resource] ?? 0n;
  const recent = vwap(ctx, state, resource, now, ctx.settings.valuation.vwapDays);
  return recent === undefined ? reference : bigMin(reference, recent);
}

export interface NetWorth {
  cash: Deniers;
  stock: Deniers;
  buildings: Deniers;
  total: Deniers;
}

export function netWorth(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
  unitValues?: Record<string, Deniers>,
): NetWorth {
  const cash =
    (state.accounts[cashAccount(playerId)] ?? 0n) + (state.accounts[escrowAccount(playerId)] ?? 0n);
  let stock = 0n;
  for (const [resource, line] of Object.entries(state.inventories[playerId] ?? {})) {
    const unit = unitValues?.[resource] ?? stockUnitValue(ctx, state, resource, now);
    stock += unit * BigInt(line.available + line.escrow);
  }
  // Goods on the road and booty not yet collected still belong to the merchant.
  const unit = (resource: string) =>
    unitValues?.[resource] ?? stockUnitValue(ctx, state, resource, now);
  for (const d of Object.values(state.deliveries ?? {})) {
    if (d.playerId !== playerId || d.outcome !== "en_route") continue;
    for (const [resource, qty] of Object.entries(d.cargo)) stock += unit(resource) * BigInt(qty);
  }
  for (const b of Object.values(state.bands ?? {})) {
    if (b.playerId !== playerId || b.collected) continue;
    for (const [resource, qty] of Object.entries(b.booty)) stock += unit(resource) * BigInt(qty);
  }
  let buildings = 0n;
  for (const b of Object.values(state.buildings)) {
    if (b.playerId === playerId) {
      buildings += applyBpsFloor(b.investedValue, ctx.settings.valuation.buildingValueBps);
    }
  }
  for (const ship of Object.values(state.ships ?? {})) {
    if (ship.playerId === playerId) {
      buildings += applyBpsFloor(ship.investedValue, ctx.settings.valuation.buildingValueBps);
    }
  }
  for (const v of Object.values(state.vehicles ?? {})) {
    if (v.playerId === playerId) {
      buildings += applyBpsFloor(v.investedValue, ctx.settings.valuation.buildingValueBps);
    }
  }
  return { cash, stock, buildings, total: cash + stock + buildings };
}
