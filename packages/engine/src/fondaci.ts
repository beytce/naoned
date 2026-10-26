import { costValue } from "./buildings.js";
import type { Deniers } from "./money.js";
import {
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, emit, fail, removeStock, transfer } from "./tx.js";

/**
 * The fondaci (E1-3 of the experts, the owner's decision of 24 October 2026): a merchant's counter
 * in a city, levels 1 to 3 in at most `maxCities` cities and `maxLevels` levels in all. Each level
 * brings `ordersPerLevel` personal orders of the city a day (see `deliveryOrdersFor`), at
 * `priceBps` of the board's price: the demand grows with what one invests. Its ducats leave the
 * game, its materials too; it counts at its cost like a building. Off without settings.
 */

export interface Fondaco {
  level: number;
  /** What its levels cost, ducats and materials at their reference: its worth. */
  investedValue: Deniers;
}

export function fondaciOf(state: WorldState, playerId: PlayerId): Record<string, Fondaco> {
  return state.fondaci?.[playerId] ?? {};
}

/** Levels of all the merchant's fondaci together. */
export function fondaciLevels(state: WorldState, playerId: PlayerId): number {
  return Object.values(fondaciOf(state, playerId)).reduce((n, f) => n + f.level, 0);
}

/** What the next level costs in a city (undefined past the top), and whether it may be built. */
export function nextFondaco(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
): { level: number; ducats: Deniers; materials: Record<string, number> } | undefined {
  const rules = ctx.settings.fondaci;
  if (!rules) return undefined;
  const mine = fondaciOf(state, playerId);
  const level = (mine[city]?.level ?? 0) + 1;
  const step = rules.levels[level - 1];
  return step ? { level, ducats: step.ducats, materials: step.materials } : undefined;
}

/** Opens a fondaco in a city, or raises it a level. */
export function buildFondaco(tx: Tx, playerId: PlayerId, city: string): void {
  const rules = tx.ctx.settings.fondaci;
  if (!rules) fail("fondaci_off");
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  const routes = tx.ctx.settings.deliveries.routes[player.region] ?? {};
  if (!tx.ctx.theme.cities.some((c) => c.code === city) || routes[city] === undefined)
    fail("unknown_city");
  const state = tx.s as WorldState;
  const mine = fondaciOf(state, playerId);
  const next = nextFondaco(tx.ctx, state, playerId, city);
  if (!next) fail("fondaco_top_level");
  const cities = Object.keys(mine).length;
  if (
    fondaciLevels(state, playerId) >= rules.maxLevels ||
    (!mine[city] && cities >= rules.maxCities)
  )
    fail("fondaci_full");
  const ref = `${playerId}:${city}:${next.level}`;
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, next.ducats, "fondaco_build", ref);
  for (const [resource, qty] of Object.entries(next.materials)) {
    if (qty > 0) removeStock(tx, playerId, resource, qty, "fondaco_build", ref);
  }
  tx.s.fondaci ??= {};
  const all = { ...(tx.s.fondaci[playerId] ?? {}) };
  all[city] = {
    level: next.level,
    investedValue: (mine[city]?.investedValue ?? 0n) + costValue(tx.ctx, next),
  };
  tx.s.fondaci[playerId] = all;
  emit(tx, "fondaco_built", playerId, { city, level: next.level });
}
