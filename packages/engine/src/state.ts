import type { Deniers } from "./money.js";
import type { WorldSettings } from "./settings.js";
import type { BuildingType, ResourceCode, Theme } from "./theme.js";

export type PlayerId = string;
export type BuildingId = string;
export type OrderId = string;
export type ProjectId = string;
export type AccountId = string;

/** The permanent market maker trades under this id. It has no cash or stock of its own. */
export const MARKET_MAKER: PlayerId = "market_maker";

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Immutable context of a world: its theme and its balancing settings. */
export interface WorldContext {
  theme: Theme;
  settings: WorldSettings;
  /** Start of the season, in ms since epoch (UTC). */
  startAt: number;
  /**
   * Secret of the world for its draws (events, contracts, pirates). Never sent to players, so
   * outcomes cannot be computed in advance. Defaults to the start time.
   */
  seed?: string;
}

export interface Player {
  id: PlayerId;
  region: string;
  joinedAt: number;
  lastActionAt: number;
  /** While now < upkeepDefaultUntil, the player cannot start production. */
  upkeepDefaultUntil: number;
  /** While now < hungryUntil, workers lack rations and new batches take longer. */
  hungryUntil?: number;
}

export interface ProductionJob {
  recipe: string;
  /** Start of the first batch still in the queue. */
  startedAt: number;
  /** Batches still in the queue; their inputs are already consumed. */
  batches: number;
  /** Building level when the batches were queued: an upgrade applies to the next batches. */
  level: number;
  /** Duration of one batch of this job (shorter for a tutorial batch). */
  batchMs: number;
}

export interface Building {
  id: BuildingId;
  playerId: PlayerId;
  type: BuildingType;
  level: number;
  job: ProductionJob | null;
  /** Cumulative construction cost (ducats + materials at reference price), for valuation. */
  investedValue: Deniers;
  /** Accelerated batches left for the first minutes of play (starting kit only). */
  fastBatchesLeft: number;
}

export interface InventoryLine {
  available: number;
  escrow: number;
}

export type OrderSide = "buy" | "sell";
export type OrderKind = "limit" | "instant";

export interface Order {
  id: OrderId;
  playerId: PlayerId;
  resource: ResourceCode;
  side: OrderSide;
  kind: OrderKind;
  /** Limit price per unit, in deniers. */
  price: Deniers;
  quantity: number;
  remaining: number;
  createdAt: number;
  expiresAt: number;
  /** Monotonic sequence number, for time priority. */
  seq: number;
}

export interface CityDemandState {
  /** Units sold recently, × 1000, decaying by the daily capacity over 24 h. */
  pressureMilli: number;
  updatedAt: number;
}

export interface Project {
  id: ProjectId;
  city: string;
  openedAt: number;
  deadline: number;
  needs: Record<ResourceCode, number>;
  delivered: Record<ResourceCode, number>;
  unitPrice: Record<ResourceCode, Deniers>;
}

export interface Expedition {
  id: string;
  playerId: PlayerId;
  destination: string;
  departAt: number;
  returnAt: number;
  cargo: Record<ResourceCode, number>;
  escort: boolean;
  /** Cargo at the port's prices of the week, fixed at departure. */
  cargoValue: Deniers;
  outcome: "pending" | "returned" | "lost";
  /** Own ships: the merchant ship first, then the escorts (none for a chartered galley). */
  ships?: string[];
  /** Strength against pirates and privateers (1 for a chartered galley, 3 escorted). */
  defense?: number;
  /** Exotic goods brought back (0 when lost or pending). */
  brought: number;
}

export interface Ship {
  id: string;
  playerId: PlayerId;
  type: string;
  /** Cost at reference prices, counted in net worth like a building. */
  investedValue: Deniers;
  /** Damaged by pirates or privateers: stays in port until repaired. */
  damaged: boolean;
  /** In the shipyard until then (repairs). */
  readyAt: number;
}

export interface DailyPriceStat {
  volume: number;
  value: Deniers;
}

export interface MarketMakerUsage {
  day: number;
  bought: Record<ResourceCode, number>;
  sold: Record<ResourceCode, number>;
}

export interface WorldState {
  seq: number;
  players: Record<PlayerId, Player>;
  buildings: Record<BuildingId, Building>;
  inventories: Record<PlayerId, Record<ResourceCode, InventoryLine>>;
  /** Ledger balances. Player accounts are never negative; the source account always is. */
  accounts: Record<AccountId, Deniers>;
  orders: Record<OrderId, Order>;
  marketMaker: MarketMakerUsage;
  cities: Record<string, Record<ResourceCode, CityDemandState>>;
  projects: Record<ProjectId, Project>;
  nextProjectAt: number;
  projectCount: number;
  /** Per resource, per day index: traded volume and value (all trades). */
  priceStats: Record<ResourceCode, Record<number, DailyPriceStat>>;
  /** Last day index for which upkeep was charged. */
  lastUpkeepDay: number;
  /** Contracts of the Doge fulfilled today, per player. */
  contractsDone?: Record<PlayerId, { day: number; ids: string[] }>;
  expeditions?: Record<string, Expedition>;
  ships?: Record<string, Ship>;
  /** Resets used per player this season (absent in states saved before resets existed). */
  resets?: Record<PlayerId, number>;
  /** Weekly ranking: current week and each player's net worth when it started (or on joining). */
  weekly?: { week: number; start: Record<PlayerId, Deniers> };
}

export const SOURCE_ACCOUNT: AccountId = "system:source";
export const SINK_ACCOUNT: AccountId = "system:sink";

export function cashAccount(playerId: PlayerId): AccountId {
  return `cash:${playerId}`;
}

export function escrowAccount(playerId: PlayerId): AccountId {
  return `escrow:${playerId}`;
}

export function dayIndex(ctx: WorldContext, at: number): number {
  return Math.floor((at - ctx.startAt) / DAY_MS);
}

export function createWorldState(ctx: WorldContext): WorldState {
  const cities: WorldState["cities"] = {};
  for (const [city, demands] of Object.entries(ctx.settings.cities)) {
    cities[city] = {};
    for (const resource of Object.keys(demands)) {
      cities[city][resource] = { pressureMilli: 0, updatedAt: ctx.startAt };
    }
  }
  return {
    seq: 0,
    players: {},
    buildings: {},
    inventories: {},
    accounts: { [SOURCE_ACCOUNT]: 0n, [SINK_ACCOUNT]: 0n },
    orders: {},
    marketMaker: { day: 0, bought: {}, sold: {} },
    cities,
    projects: {},
    nextProjectAt: ctx.startAt,
    projectCount: 0,
    priceStats: {},
    lastUpkeepDay: 0,
    resets: {},
    contractsDone: {},
    expeditions: {},
    ships: {},
    weekly: { week: 0, start: {} },
  };
}

export function isActive(ctx: WorldContext, player: Player, now: number): boolean {
  return now - player.lastActionAt <= ctx.settings.activeWindowHours * HOUR_MS;
}

export function activePlayerCount(ctx: WorldContext, state: WorldState, now: number): number {
  let n = 0;
  for (const p of Object.values(state.players)) if (isActive(ctx, p, now)) n++;
  return n;
}
