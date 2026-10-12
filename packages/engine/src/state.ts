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
   * End of the season (exclusive), in ms since epoch. Seasons follow calendar months, so the
   * world says when it ends; without it, the season lasts `settings.seasonDays`.
   */
  endAt?: number;
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
  /** Pass Négociant held until this time (bought, or won in the rankings). */
  passUntil?: number;
  /** Mastery chosen for the season (see `specialties.ts`). */
  specialty?: string;
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
  /** The act whose worksite this is (a worksite of the guilds). */
  act?: number;
  /** Units delivered by the members of each guild. */
  byGuild?: Record<string, number>;
  /** The guild that delivered most, once the act is over. */
  winner?: string | null;
  /** Its name, kept for the monument (the guild may be dissolved since). */
  winnerName?: string;
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
  /** Mid-voyage passed and privateers on the route resolved. */
  crossed?: boolean;
  /** Exotic goods brought back (0 when lost or pending). */
  brought: number;
}

export interface RaidHit {
  expeditionId: string;
  victimId: PlayerId;
  /** When the convoy crossed the corsairs (mid-voyage). */
  at: number;
  /** When the engine resolved it (the next tick or unloading). */
  resolvedAt: number;
  chanceBps: number;
  success: boolean;
  taken: Record<ResourceCode, number>;
}

/** Privateers cruising a route under a letter of marque. */
export interface Raid {
  id: string;
  playerId: PlayerId;
  route: string;
  ships: string[];
  attack: number;
  /** Booty the corsairs can carry, at reference prices. */
  hold: Deniers;
  startAt: number;
  endAt: number;
  outcome: "cruising" | "returned";
  /** Repelled once: the corsairs limp home and hunt no more. */
  beaten: boolean;
  booty: Record<ResourceCode, number>;
  hits: RaidHit[];
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

/** A cart, mule or wagon: carries one delivery at a time, there and back. */
export interface Vehicle {
  id: string;
  playerId: PlayerId;
  type: string;
  /** Cost at reference prices, counted in net worth like a ship. */
  investedValue: Deniers;
  /** End of the way back of its last delivery (0 when free). */
  busyUntil: number;
  /** When it was bought (or given). */
  since?: number;
}

/** "family": orders of the former patrician families, kept for deliveries saved then. */
export type DeliveryKind = "city" | "doge" | "family" | "urgent";
export type EscortKind = "none" | string;

/** An order on a merchant's board (computed, never stored, like a Contract). */
export interface DeliveryOrder {
  /** `${day}:${index}` */
  id: string;
  day: number;
  kind: DeliveryKind;
  city: string;
  resource: ResourceCode;
  quantity: number;
  unitPrice: Deniers;
  opensAt: number;
  expiresAt: number;
  /** The Doge's contract or the family order it stands for. */
  ref?: string;
  /** An order of the world's board, open to every merchant who may serve it. */
  shared?: boolean;
  /** Who took it (a shared order goes to the first who sends a vehicle). */
  takenBy?: PlayerId | null;
}

/** An order of the world's board, before it is priced for a merchant's region. */
export interface BoardOrder {
  id: string;
  kind: "city" | "urgent";
  city: string;
  resource: ResourceCode;
  quantity: number;
  opensAt: number;
  expiresAt: number;
}

export interface DeliveryAttack {
  bandId: string;
  /** Null for a band of the computer. */
  banditId: PlayerId | null;
  /** When the band struck (mid-way). */
  at: number;
  chanceBps: number;
  /** Without escort: the merchant may fight back until then. */
  reactBy: number;
  reacted: boolean;
  resolvedAt?: number;
  success?: boolean;
  taken: Record<ResourceCode, number>;
  /** The Doge's bounty paid to the merchant for beating the band off. */
  bounty?: Deniers;
}

export interface Delivery {
  id: string;
  playerId: PlayerId;
  orderId: string;
  kind: DeliveryKind;
  /** The Doge's contract or the family order it stands for. */
  ref?: string;
  vehicleId: string;
  /** `${region}:${city}` */
  route: string;
  resource: ResourceCode;
  /** Units loaded at departure. */
  loaded: number;
  /** One resource, kept as a table like a convoy's cargo. */
  cargo: Record<ResourceCode, number>;
  /** Price of the whole load, fixed at departure; paid on arrival, pro rata of what arrives. */
  payment: Deniers;
  escort: EscortKind;
  departAt: number;
  arriveAt: number;
  backAt: number;
  /** When a band on the route may strike. */
  midAt: number;
  /** Mid-way passed and bands on the route considered. */
  crossed?: boolean;
  attack?: DeliveryAttack;
  outcome: "en_route" | "delivered" | "robbed_delivered";
  /** Paid on arrival. */
  paid?: Deniers;
}

/** Bandits posted on a road for a few hours. */
export interface BanditBand {
  id: string;
  /** Null for a band of the computer. */
  playerId: PlayerId | null;
  route: string;
  startAt: number;
  endAt: number;
  /** Ambushes attempted (at most `maxAttacksPerBand`). */
  attacks: number;
  /** Beaten off by a merchant who fought back: the band stops. */
  dispersed: boolean;
  /** To be collected by the bandit. */
  booty: Record<ResourceCode, number>;
  collected: boolean;
}

export interface DailyPriceStat {
  volume: number;
  value: Deniers;
}

export interface MarketMakerUsage {
  day: number;
  bought: Record<ResourceCode, number>;
  sold: Record<ResourceCode, number>;
  /** Today, per player: units bought from and sold to the market maker (quota per player). */
  byPlayer?: Record<
    PlayerId,
    { bought: Record<ResourceCode, number>; sold: Record<ResourceCode, number> }
  >;
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
  /** Doge's orders swapped today with the Pass: slot index → number of swaps. */
  contractRerolls?: Record<PlayerId, { day: number; slots: Record<number, number> }>;
  expeditions?: Record<string, Expedition>;
  ships?: Record<string, Ship>;
  raids?: Record<string, Raid>;
  /** The merchant's ledger, per player: progress per mission and missions already rewarded. */
  missions?: Record<PlayerId, { progress: Record<string, number>; claimed: string[] }>;
  /** Units sold at each Criée (by its index), in all and per merchant. */
  criees?: Record<number, { sold: number; byPlayer: Record<PlayerId, number> }>;
  /** Tasks of the day: progress of the current day, and the streak of chests opened. */
  daily?: Record<
    PlayerId,
    {
      day: number;
      progress: Record<string, number>;
      claimed: string[];
      chest: boolean;
      streak: number;
      /** Last day a chest was opened. */
      lastChestDay: number;
      best: number;
    }
  >;
  /** Faraj's bales, per player (absent: none opened yet, see `bales.ts`). */
  bales?: Record<PlayerId, BaleState>;
  vehicles?: Record<string, Vehicle>;
  deliveries?: Record<string, Delivery>;
  bands?: Record<string, BanditBand>;
  /** The world's board of the day (shared demand): its orders, and who took each. */
  board?: {
    day: number;
    /** Active merchants the board was drawn for. */
    active?: number;
    orders: BoardOrder[];
    takenBy: Record<string, PlayerId>;
  };
  /** Orders of the board dispatched today, per player. */
  deliveriesDone?: Record<PlayerId, { day: number; ids: string[] }>;
  /** Last day the computer's bands were posted. */
  npcBandsDay?: number;
  /** Last successful boarding or ambush suffered, per player (cooldown). */
  plunderedAt?: Record<PlayerId, number>;
  /** Successful ambushes of each bandit this season: their infamy. */
  infamy?: Record<PlayerId, number>;
  /** Bounties received this season, per merchant. */
  bounties?: Record<PlayerId, Deniers>;
  /** Resets used per player this season (absent in states saved before resets existed). */
  resets?: Record<PlayerId, number>;
  /** Weekly ranking: current week and each player's net worth when it started (or on joining). */
  weekly?: { week: number; start: Record<PlayerId, Deniers> };
  /** The merchants' guilds, their members and their votes. */
  guilds?: GuildsState;
  /** Set once the final ranking has been published (event `season_closed`). */
  seasonClosed?: boolean;
}

/** One card of a bale: a few units of a good, of a given rarity. */
export interface BaleCard {
  rarity: string;
  resource: ResourceCode;
  quantity: number;
}

export interface BaleState {
  /** Bales already waiting at `since` (at most the settings' `maxStored`). */
  stored: number;
  /** From then on, one more bale every `intervalHours`. */
  since: number;
  /** Bales opened this season: the number of the next one, for its draw. */
  opened: number;
  /** The last bale opened, shown again until the next one. */
  last?: { seq: number; at: number; cards: BaleCard[] };
}

export interface GuildMember {
  carats: number;
  since: number;
}

export interface Guild {
  id: string;
  name: string;
  emblem: string;
  founder: PlayerId;
  foundedAt: number;
  members: Record<PlayerId, GuildMember>;
  /** All the carats held by the members. */
  caratsIssued: number;
  /** Newcomers may join without a vote. */
  open: boolean;
  /** Toll on others' deliveries to the guild's concessions (voted). */
  tollBps: number;
  /** Share of each income paid out at once to the members (voted). */
  dividendBps: number;
  /** Paid per unit to the merchants who supply the guild in a war (voted). */
  bountyPerUnit: bigint;
}

export interface GuildProposal {
  id: string;
  guildId: string;
  by: PlayerId;
  kind: "toll" | "dividend" | "bounty" | "open" | "exclude" | "war";
  value: number;
  /** The member to exclude, or the concession to make war on. */
  target?: string;
  openedAt: number;
  closesAt: number;
  closedAt?: number;
  votes: Record<PlayerId, boolean>;
  status: "open" | "passed" | "rejected";
}

export interface GuildsState {
  guilds: Record<string, Guild>;
  /** The guild of each member. */
  memberOf: Record<PlayerId, string>;
  proposals: Record<string, GuildProposal>;
  /** The treasuries were shared out at the end of the season. */
  paidOut?: boolean;
}

export const SOURCE_ACCOUNT: AccountId = "system:source";
export const SINK_ACCOUNT: AccountId = "system:sink";

export function cashAccount(playerId: PlayerId): AccountId {
  return `cash:${playerId}`;
}

export function escrowAccount(playerId: PlayerId): AccountId {
  return `escrow:${playerId}`;
}

/** Whether a merchant holds the Pass Négociant at `at`. */
export function hasPass(state: WorldState, playerId: PlayerId, at: number): boolean {
  return (state.players[playerId]?.passUntil ?? 0) > at;
}

/** When play stops: the end of the calendar month, or the nominal length of a season. */
export function seasonEnd(ctx: WorldContext): number {
  return ctx.endAt ?? ctx.startAt + ctx.settings.seasonDays * DAY_MS;
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
    raids: {},
    plunderedAt: {},
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
