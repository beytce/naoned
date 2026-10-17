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
  /** Patents the house holds, kept from season to season by the server (see `house.ts`). */
  patents?: string[];
  /** Region of the house's second counter this season, once chosen. */
  secondRegion?: string;
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

/**
 * The sea and the bandits of states saved before they were removed (October 2026): settled at the
 * next tick (`retireSeaAndBandits`) and gone. Only what the settling reads is kept.
 */
export interface LegacySeaState {
  expeditions?: Record<
    string,
    { playerId: PlayerId; cargo: Record<ResourceCode, number>; outcome: string }
  >;
  ships?: Record<string, { playerId: PlayerId; investedValue: Deniers }>;
  raids?: Record<
    string,
    { playerId: PlayerId; booty: Record<ResourceCode, number>; outcome: string }
  >;
  bands?: Record<
    string,
    { playerId: PlayerId | null; booty: Record<ResourceCode, number>; collected: boolean }
  >;
}

/** A cart, mule or wagon: carries one delivery at a time, there and back. */
export interface Vehicle {
  id: string;
  playerId: PlayerId;
  type: string;
  /** Cost at reference prices, counted in net worth like a building. */
  investedValue: Deniers;
  /** End of the way back of its last delivery (0 when free). */
  busyUntil: number;
  /** When it was bought (or given). */
  since?: number;
}

/** "family": orders of the former patrician families, kept for deliveries saved then. */
export type DeliveryKind = "city" | "doge" | "family" | "urgent";

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

/** One order of a load (a vehicle may carry several orders for the same city). */
export interface DeliveryLine {
  id: string;
  kind: DeliveryKind;
  ref?: string;
  resource: ResourceCode;
  quantity: number;
  /** Its price, fixed at departure. */
  payment: Deniers;
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
  /** The goods aboard, by resource. */
  cargo: Record<ResourceCode, number>;
  /** Price of the whole load, fixed at departure; paid on arrival, pro rata of what arrives. */
  payment: Deniers;
  /** The orders carried, when there are several (the first one is `orderId`). */
  orders?: DeliveryLine[];
  departAt: number;
  arriveAt: number;
  backAt: number;
  outcome: "en_route" | "delivered";
  /** Paid on arrival. */
  paid?: Deniers;
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
  /** The Dogana's price per resource, in bps of the reference (10 000 when absent). */
  anchorBps?: Record<ResourceCode, number>;
}

/** The galleys of the Muda at the quay (see muda.ts). */
export interface MudaState {
  /** Index of the last arrival (0 = the first, on the first day). */
  arrival: number;
  stock: Record<string, number>;
  /** The last arrival's lot: the price rises with the share of it that is gone. */
  lot: Record<string, number>;
  /** Units bought by each merchant since the last arrival. */
  bought: Record<PlayerId, Record<string, number>>;
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
  /** The Muda's lot on the quay, from the first galleys on. */
  muda?: MudaState;
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
  /** The sea of states saved before it was removed (see `LegacySeaState`). */
  expeditions?: LegacySeaState["expeditions"];
  ships?: LegacySeaState["ships"];
  raids?: LegacySeaState["raids"];
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
  /** Net sales of the season, per merchant: the ranking (see `turnover.ts`). */
  turnover?: Record<PlayerId, Deniers>;
  vehicles?: Record<string, Vehicle>;
  deliveries?: Record<string, Delivery>;
  bands?: LegacySeaState["bands"];
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
  /** Of the time of the bandits (settled with the sea). */
  npcBandsDay?: number;
  plunderedAt?: Record<PlayerId, number>;
  infamy?: Record<PlayerId, number>;
  bounties?: Record<PlayerId, Deniers>;
  /** Resets used per player this season (absent in states saved before resets existed). */
  resets?: Record<PlayerId, number>;
  /** Weekly ranking: current week and each player's net worth when it started (or on joining). */
  weekly?: { week: number; start: Record<PlayerId, Deniers> };
  /** The four great families: who swore allegiance to which. */
  families?: FamiliesState;
  /** The week's campaign in the Terraferma, and the decrees in force. */
  campaign?: CampaignState;
  /**
   * The merchants' guilds of states saved before the families came back: their treasuries are
   * paid back by carats at the next tick, then they are gone (with concessions and wars).
   */
  guilds?: LegacyGuildsState;
  concessions?: unknown;
  wars?: unknown;
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

export interface LegacyGuildsState {
  guilds: Record<string, { members: Record<PlayerId, { carats: number }>; caratsIssued: number }>;
}

export interface FamiliesState {
  /** The family of each merchant who chose one (for the season). */
  memberOf: Record<PlayerId, string>;
  /** When they chose it (their levy runs from then). */
  since: Record<PlayerId, number>;
}

/** Lances of one merchant, all leaving at the same time. */
export interface LanceStack {
  playerId: PlayerId;
  count: number;
  expiresAt: number;
}

/** "milan", a family's code, or null for the militia. */
export type LandHolder = string | null;

export interface CampaignLand {
  holder: LandHolder;
  /** Lances of the militia or of Milan (no merchant behind them). */
  npc: number;
  /** Lances of the holding family's merchants, in garrison. */
  stacks: LanceStack[];
  /** Held since then. */
  since: number;
  /** The work standing on it, built by the family holding it. */
  work?: CampaignWork;
}

export interface CampaignWork {
  kind: string;
  family: string;
  by: PlayerId;
  /** It serves from then (open hours of works after it was paid). */
  readyAt: number;
}

/** Lances on their way to a land: to reinforce it if the family holds it, to attack it otherwise. */
export interface March {
  id: string;
  /** A family's code, or "milan". */
  family: string;
  /** Who opened it (null for Milan). */
  by: PlayerId | null;
  target: string;
  /** Where it left from: the family's seat, or one of its camps (none for Milan). */
  from?: string;
  startAt: number;
  arriveAt: number;
  stacks: LanceStack[];
  npc: number;
}

export interface DecreePick {
  code: string;
  /** A good (gabelle, calmiere) or a city (faveur). */
  target?: string;
}

/** The programme of the family that won a week, in force the next one. */
export interface DecreesInForce {
  week: number;
  family: string;
  items: DecreePick[];
  /** Each member's merit of the winning week: their share of the gabelle and the toll. */
  shares: Record<PlayerId, number>;
  /** Cities the family held at the end of the winning week (the toll's cities). */
  cities: string[];
}

export interface CampaignPlayer {
  /** Lances waiting at the seat. */
  reserve: LanceStack[];
  /** Free lances accrue from then (open hours only), on top of `levyStored`. */
  levySince: number;
  levyStored: number;
  /** Lances engaged for ducats on `hireDay`. */
  hireDay: number;
  hired: number;
}

export interface CampaignResult {
  week: number;
  /** Null when no family had any glory. */
  winner: string | null;
  /** Glory points of each family. */
  glory: Record<string, number>;
  /** The decrees it imposed for the next week (none for the last week of the season). */
  decrees: DecreePick[];
  /** Lands each family held at the end. */
  lands: Record<string, LandHolder>;
  /** The best merit of each family (its captain). */
  captains: Record<string, PlayerId>;
  final: boolean;
}

export interface CampaignState {
  week: number;
  /** Glory and merit counted up to then. */
  accruedAt: number;
  lands: Record<string, CampaignLand>;
  /** Glory of each family this week, in point-milliseconds (value × open time held). */
  glory: Record<string, number>;
  /** Merit this week: lances in battles won, and lance-milliseconds of garrison. */
  merit: Record<PlayerId, { battle: number; garrisonMs: number }>;
  marches: Record<string, March>;
  players: Record<PlayerId, CampaignPlayer>;
  /** Each member's vote for the programme of their family. */
  ballots: Record<PlayerId, DecreePick[]>;
  /** Milan's next ride. */
  nextMilanAt: number;
  /** Last day Milan's fortresses were filled up again. */
  regenDay: number;
  history: CampaignResult[];
  decrees?: DecreesInForce;
  /** The last week of the season is closed. */
  closed?: boolean;
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
export function hasPass(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  at: number,
): boolean {
  // Switched off (until it comes back): nobody holds it, whatever was granted.
  if (!ctx.settings.pass.enabled) return false;
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
