import type { Deniers } from "./money.js";
import type { WorldSettings } from "./settings.js";
import type { TerraConfig, TerraState } from "./terraferma.js";
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
  /** While now < hungryUntil, workers lack rations and new batches take longer. */
  hungryUntil?: number;
  /** Pass Négociant held until this time (bought, or won in the rankings). */
  passUntil?: number;
  /** Mastery chosen for the season (see `specialties.ts`). */
  specialty?: string;
  /** Privileges the house holds, kept from season to season by the server (see `house.ts`). */
  patents?: string[];
  /** The Atouts taken this season, in order (R3, `atouts.ts`). */
  atouts?: string[];
  /** The last week an Atout was taken. */
  atoutWeek?: number;
  /** The Atouts the account unlocked, kept from season to season by the server. */
  atoutPool?: string[];
  /** The trait the heir took from the generation before (R4, `dynasty.ts`). */
  trait?: string;
  /** Free changes of mastery the trait gave, used this season. */
  freeRespecs?: number;
  /** A house run by the computer, marked by the server: it never takes the Terraferma's tiers. */
  npc?: true;
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
  /** Quarters of a loaf its batches have eaten and not yet taken (the rounding's rest, E1-4). */
  rationDebt?: number;
  /** A manufacture's path past the last ordinary level (absent: not chosen). */
  path?: "volume" | "quality";
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

/** A tender of the Doge (tenders.ts): sealed bids, then the winners' deliveries. */
export interface Tender {
  id: string;
  resource: ResourceCode;
  quantity: number;
  /** The highest unit price the Doge accepts. */
  ceiling: Deniers;
  openedAt: number;
  /** Bids close. */
  closeAt: number;
  /** Winners deliver before. */
  deadline: number;
  bids: Record<PlayerId, { price: Deniers; quantity: number; caution: Deniers; at: number }>;
  /** Set at the close. */
  awarded?: Record<
    PlayerId,
    { quantity: number; price: Deniers; caution: Deniers; delivered: boolean }
  >;
  /** Every caution returned or forfeited. */
  settled?: boolean;
}

export interface Project {
  id: ProjectId;
  city: string;
  openedAt: number;
  deadline: number;
  needs: Record<ResourceCode, number>;
  delivered: Record<ResourceCode, number>;
  unitPrice: Record<ResourceCode, Deniers>;
  /** What each merchant was paid for its deliveries: its share of the bonus. */
  by?: Record<PlayerId, Deniers>;
  /** When the last unit came in (the bonus paid then). */
  completedAt?: number;
  /** The Arsenal's tier reached (E2-6): 1 Bronze, 2 Silver, 3 Gold; absent before the Bronze. */
  tier?: number;
  /** Units each merchant delivered in all, and past the Bronze. */
  units?: Record<PlayerId, number>;
  above?: Record<PlayerId, number>;
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
  /** The newcomer's welcome order (express during the tutorial). */
  welcome?: boolean;
  /** An order of the merchant's fondaco in the city (E1-3). */
  fondaco?: boolean;
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
  /** Sent by the fattore: its commission is taken on arrival. */
  fattore?: boolean;
  /** The welcome order on its express trip of the tutorial. */
  welcome?: boolean;
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

/** A workshop of the empire (CADRAGE-v3 § 3.2): a building of the theme, its recipe, its level. */
export interface EmpireWorkshop {
  id: string;
  /** Its region: Venetia when absent. */
  region?: string;
  /** Its counter (the map that grows): its region's first when absent. */
  post?: string;
  type: BuildingType;
  recipe: string;
  level: number;
  /** The workshop modules fitted in its places, by place. */
  fitted?: string[];
  /** The night queue: lots queued from `startedAt`, their inputs already taken. */
  job: ProductionJob | null;
}

/** A building site: it ends at `endsAt`, settled at the next read. */
export interface EmpireBuild {
  kind:
    | "casa"
    | "newWorkshop"
    | "upgrade"
    | "counter"
    | "ship"
    | "post"
    | "arsenal"
    | "camp"
    | "depot"
    | "porta";
  /** A counter put down on the map, or the Arsenal: its cell (« q,r »). */
  cell?: string;
  /** The cells a counter put down reveals when it stands. */
  reveal?: string[];
  /** A counter put down: its point on the chart, and the name it will bear. */
  x?: number;
  y?: number;
  post?: string;
  /** A ship of the Arsenal: its type and the id it will bear. */
  vehicleType?: string;
  vehicleId?: string;
  /** A counter's region (its first level: the charter's opening voyage and its building). */
  region?: string;
  /** The level it builds. */
  level: number;
  /** The workshop it raises, or the new workshop's building and recipe. */
  workshopId?: string;
  workshopType?: BuildingType;
  recipe?: string;
  startedAt: number;
  endsAt: number;
}

/** Goods carried from a counter to another (the map that grows): in the stock again at arrival. */
export interface EmpireTransfer {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  good: string;
  qty: number;
  leftAt: number;
  arrivesAt: number;
}

/** A vehicle's round from its counter to the cities' orders, and back (after Hades' Star). */
export interface EmpireTour {
  id: string;
  vehicleId: string;
  post: string;
  period: number;
  leftAt: number;
  stops: {
    city: string;
    order: number;
    good: string;
    qty: number;
    at: number;
    done?: boolean;
  }[];
  backAt: number;
}

/** A house of the persistent empire: what it has built, never reset. */
export interface EmpireHouse {
  casa: number;
  joinedAt: number;
  lastActionAt: number;
  workshops: EmpireWorkshop[];
  builds: EmpireBuild[];
  /** Its counters beyond Venetia, by region: their level (CADRAGE-v3 § 3.4). */
  counters?: Record<string, number>;
  /** The map's cells the house sees (« q,r »): Venetia's, and what its counters revealed. */
  revealed?: string[];
  /** The sectors it owns, bought one next to another (Venice's at the founding). */
  unlocked?: string[];
  /** The drawing of the grid those cells are of. */
  mapVersion?: number;
  /**
   * The counters put down on the map, each on its cell, in its region, at its point of the chart
   * (its units) with its level: its reach grows with it (the map that grows, 31 October 2026).
   */
  posts?: { id?: string; cell: string; region: string; x?: number; y?: number; level?: number }[];
  /** Venice's own counter's level: its reach on the map (1 when unset). */
  homeLevel?: number;
  /**
   * The stock of each counter beyond Venice, by counter, by good (the map that grows): Venice
   * holds the rest of the house's inventory.
   */
  stores?: Record<string, Record<string, number>>;
  /** The Arsenal's cell, on a coast. */
  arsenal?: string;
  /** The Campo's cell: the door of the Terraferma. */
  camp?: string;
  /** The Remise's cell: where the land vehicles are bought and raised. */
  depot?: string;
  /** Each model's level, by vehicle type (1 when unset). */
  vehicleLevels?: Record<string, number>;
  favour: number;
  seals: number;
  /** Its vehicles: free again at `busyUntil` (a voyage's way there and back). */
  vehicles?: {
    id: string;
    type: string;
    busyUntil: number;
    fitted?: string[];
    /** A land vehicle at the Porta (`busyUntil` then holds it there). */
    porta?: PortaPlace;
    /** The counter it stands at (the map that grows): Venice's when absent. */
    at?: string;
  }[];
  /** The Porta's arms (docs/plan-porta.md): its combat vehicles, its components, their models. */
  arms?: EmpireArms;
  porta?: EmpirePorta;
  /** Goods on the road between two counters, carried by a land vehicle. */
  transfers?: EmpireTransfer[];
  /** What it brought of each city's orders in the period (by order, in their order). */
  filled?: { period: number; cities: Record<string, number[]> };
  /** Its vehicles' rounds to the cities, stop by stop. */
  tours?: EmpireTour[];
  /** The deposits its teams work, by id. */
  teams?: string[];
  /** Where it found each good it extracted: those regions hold it, as its workshops' do. */
  found?: Record<string, string[]>;
  /** Its generation, by the calendar quarter it began in, and the Heritage it earned. */
  generation?: { quarter: number; number: number };
  heritage?: number;
  /** The lineage's traits, one opened by each point of Heritage. */
  lineage?: string[];
  /** Its staff (CADRAGE-v3 § 3 quinquies). */
  staff?: EmpireStaff[];
  /** How many it hired: the next one costs more. */
  hired?: number;
  /** Its knowledges learnt, and those being learnt (settled at the next read). */
  knowledge?: string[];
  learning?: { code: string; startedAt: number; endsAt: number }[];
  /** Its company, as the server knows it, and since when it is in it (CADRAGE-v3 § 7). */
  company?: string;
  companySince?: number;
  /** The Terraferma: the Seals of this week, its best tier ever (its honorary grade). */
  terraSeals?: { week: number; seals: number };
  terraBest?: string;
  /** Places won at the Muda: its galley may leave until `until`, sailing at the departure's hour. */
  mudaPasses?: { vehicleId: string; departure: number; until: number }[];
  /** Its record as a traveller of colleganze: voyages returned, their summed return (bps). */
  colleganzaRecord?: { voyages: number; returnBps: number };
  /** The day of its last won Condotta paid in Seals. */
  condottaDay?: number;
  /** The Merit its entraide earned, the last lot it asked, what it supplied today (deniers). */
  merit?: number;
  askedAt?: number;
  supplied?: { day: number; value: Deniers };
  /** Its Arte, and its minor Arte (CADRAGE-v3 § 3.5). */
  arte?: string;
  minorArte?: string;
  /** Its modules researched, by code: their level (profondeur.md § B). */
  modules?: Record<string, number>;
  /** Its researches under way at the Scuola: settled at the next read, as the sites. */
  research?: { code: string; level: number; startedAt: number; endsAt: number }[];
  /** What is left today of the court's book for its fine and exquisite goods. */
  court?: { day: number; left: number };
  /** What its land vehicles carried to the cities today. */
  hauled?: { day: number; units: number; at?: Record<string, number> };
  /** What is left today of its private book of orders, by region. */
  books?: Record<string, { day: number; left: number }>;
  carnet?: EmpireCarnet;
  /** Receipts of the last days, today last: to read the next step in days of income. */
  income?: { day: number; days: Deniers[] };
  /** A following wind after a long absence: the Carnet's Favour doubled until then. */
  windUntil?: number;
}

/** A member of the staff: a master, a factor, a captain… */
export interface EmpireStaff {
  id: string;
  role: string;
  rarity: string;
  level: number;
  xp: number;
  /** The path chosen at each tier, by tier. */
  skills: number[];
  /** Where it works: a workshop's id, a region's code, a vehicle's id. */
  placedAt?: string;
  /** Since when it is placed (a factor's days). */
  placedSince?: number;
  /** A member of the family, with its name. */
  family?: string;
}

export type CarnetKind = "relaunch" | "deliver" | "sell" | "sites" | "levels" | "casa" | "earn";

export interface CarnetObjective {
  kind: CarnetKind;
  target: number;
  progress: number;
  claimed: boolean;
}

/** The Carnet of the week (CADRAGE-v3 § 4.2). */
export interface EmpireCarnet {
  /** Weeks since Monday 5 January 1970, UTC. */
  week: number;
  objectives: CarnetObjective[];
  /** Last week's objectives still to catch up. */
  carried: CarnetObjective[];
  /** The Seal of the full carnet, given. */
  full: boolean;
}

/** A market of the empire: its pressure (bps of the reference) and what the Dogana took today. */
export interface EmpireMarket {
  pressureBps: number;
  at: number;
  day: number;
  soldToday: number;
  /** Its pressure after each trade of the last fortnight: the news a house learns late. */
  history?: { at: number; pressureBps: number }[];
}

/** The persistent empire's part of a world (absent from the worlds of the monthly seasons). */
/** A deposit (profondeur.md § A): it appears, the teams sent there share it, it runs out. */
export interface EmpireDeposit {
  id: string;
  region: string;
  good: string;
  stock: number;
  /** When its extraction was last settled. */
  at: number;
  /** The houses with a team on it. */
  teams: PlayerId[];
}

/** A cargo on its way: sold at its arrival, settled at the next read. */
export interface EmpireVoyage {
  id: string;
  house: PlayerId;
  vehicleId: string;
  good: string;
  qty: number;
  from: string;
  to: string;
  arrivesAt: number;
  /** What the cargo cost, bought or own at its port's price: to read the voyage's margin. */
  cost: Deniers;
  /** Insured at its departure: the units the corsairs take are paid back at the reference. */
  insured?: boolean;
  /** The colleganza that financed it: its return is shared at the arrival. */
  colleganza?: string;
}

/**
 * A colleganza (CADRAGE-v3 § 3 quater): a traveller's voyage, its investors' stakes in escrow; at
 * the departure, the capital the cargo used; at the return, the share.
 */
export interface EmpireColleganza {
  id: string;
  traveller: PlayerId;
  vehicleId: string;
  from: string;
  to: string;
  good: string;
  qty: number;
  /** The capital sought, and what each investor put in (what the cargo used, once sailed). */
  target: Deniers;
  stakes: { house: PlayerId; amount: Deniers }[];
  status: "open" | "sailing";
  /** Once sailed: the capital used, and what the whole cargo cost. */
  capital?: Deniers;
  cargoCost?: Deniers;
}

/** A theatre of the empire's Terraferma (CADRAGE-v3 § 8): one map, its merchants, its rules. */
export interface EmpireTheatre {
  id: string;
  band: number;
  kind: "open" | "contesa";
  /** The week's rules, kept from its opening: a change waits for the next Monday. */
  cfg: TerraConfig;
  map: TerraState;
  members: PlayerId[];
  /** The Contesa's companies; the cote of each member (the open theatres keep like with like). */
  companies?: string[];
  ratings?: Record<PlayerId, number>;
  /** The Republic's bread given today, by merchant. */
  rations?: Record<PlayerId, { day: number; given: number }>;
}

/** The empire's Terraferma: this week's theatres, the Contesa's rosters, the companies' honours. */
export interface EmpireTerra {
  week: number;
  theatres: EmpireTheatre[];
  rosters?: { week: number; company: string; members: PlayerId[] }[];
  honours?: Record<
    string,
    { trophies: number; lustre: number; blazon?: { week: number; cities: string[] } }
  >;
}

/** The Muda's incanto (CADRAGE-v3 § 12 bis): the bids for its next departures, held in escrow. */
export interface EmpireMuda {
  bids: { house: PlayerId; vehicleId: string; amount: Deniers; departure: number }[];
  /** The last departure settled. */
  last?: number;
  /** The last departures' places and prices, for the view. */
  lastResult?: { departure: number; places: number; reserve: Deniers; prices: Deniers[] };
}

/** A lot a partner asks its company for (CADRAGE-v3 § 7). */
export interface EmpireAidRequest {
  id: string;
  house: PlayerId;
  company: string;
  good: string;
  qty: number;
  at: number;
}

export interface EmpireState {
  houses: Record<PlayerId, EmpireHouse>;
  /** The entraide's open requests. */
  aid?: EmpireAidRequest[];
  terra?: EmpireTerra;
  muda?: EmpireMuda;
  colleganze?: EmpireColleganza[];
  voyages?: EmpireVoyage[];
  deposits?: EmpireDeposit[];
  /** The last day the deposits were drawn for. */
  depositsDay?: number;
  /** By "region:good". */
  markets?: Record<string, EmpireMarket>;
  /** The cities' common board, by "region:good": what is left of it today. */
  boards?: Record<string, { day: number; left: number }>;
}

export interface WorldState {
  seq: number;
  /** The persistent empire (CADRAGE-v3), in a world whose settings carry it. */
  empire?: EmpireState;
  players: Record<PlayerId, Player>;
  buildings: Record<BuildingId, Building>;
  inventories: Record<PlayerId, Record<ResourceCode, InventoryLine>>;
  /** Ledger balances. Player accounts are never negative; the source account always is. */
  accounts: Record<AccountId, Deniers>;
  orders: Record<OrderId, Order>;
  marketMaker: MarketMakerUsage;
  /** The Muda's lot on the quay, from the first galleys on. */
  muda?: MudaState;
  /** The incanto of the galleys (R11, `incanto.ts`): its lots, open and lately settled. */
  incanto?: { lots: Record<string, import("./incanto.js").IncantoLot> };
  cities: Record<string, Record<ResourceCode, CityDemandState>>;
  projects: Record<ProjectId, Project>;
  nextProjectAt: number;
  projectCount: number;
  /** Per resource, per day index: traded volume and value (all trades). */
  priceStats: Record<ResourceCode, Record<number, DailyPriceStat>>;
  /** Last day index whose rations were served (named after the upkeep of earlier saves). */
  lastUpkeepDay: number;
  /** Contracts of the Doge fulfilled today, per player. */
  contractsDone?: Record<PlayerId, { day: number; ids: string[] }>;
  /** Doge's orders swapped today with the Pass: slot index → number of swaps. */
  contractRerolls?: Record<PlayerId, { day: number; slots: Record<number, number> }>;
  /** The house's missions of the current board, per merchant (see `house.ts`). */
  houseMissions?: Record<
    PlayerId,
    { board: number; progress: Record<string, number>; claimed: string[] }
  >;
  /** What each merchant bought with Influence today (rushed deliveries, troops). */
  houseSpent?: Record<PlayerId, { day: number; rushes: number; troops: number }>;
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
      /** Tasks of the day swapped for others (bought with Influence). */
      rerolled?: string[];
      /** Days missed that the weekly grace forgave (E3-10). */
      graceDays?: number[];
      /** Swaps of the day the trait gave for free, used today (R4). */
      freeRerolls?: number;
    }
  >;
  /**
   * The Letter of the day (R10, `letters.ts`), per merchant: its flags, the choice of each day
   * answered, the consequences still to come and the ducats given this season.
   */
  letters?: Record<
    PlayerId,
    {
      flags: string[];
      answered: Record<number, string>;
      pending: { episode: string; choice: string; at: number }[];
      minted: Deniers;
    }
  >;
  /** Faraj's bales, per player (absent: none opened yet, see `bales.ts`). */
  bales?: Record<PlayerId, BaleState>;
  /** Net sales of the season, per merchant: the ranking (see `turnover.ts`). */
  turnover?: Record<PlayerId, Deniers>;
  /** The highest net sales of the season, per merchant: the level counts them (`turnoverPeakOf`). */
  turnoverPeak?: Record<PlayerId, Deniers>;
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
  /** The fattore's runs of the day, per merchant. */
  fattore?: Record<PlayerId, { day: number; runs: number }>;
  /** Of the time of the bandits (settled with the sea). */
  npcBandsDay?: number;
  plunderedAt?: Record<PlayerId, number>;
  infamy?: Record<PlayerId, number>;
  bounties?: Record<PlayerId, Deniers>;
  /** Resets used per player this season (absent in states saved before resets existed). */
  resets?: Record<PlayerId, number>;
  /** Weekly ranking: current week and each player's net worth when it started (or on joining). */
  weekly?: { week: number; start: Record<PlayerId, Deniers> };
  /**
   * The official suppliers: units delivered this week by `${city}|${resource}` and merchant, and
   * the holders named at the last close.
   */
  suppliers?: {
    units: Record<string, Record<PlayerId, number>>;
    holders: Record<string, PlayerId>;
  };
  /**
   * The Signoria of the cities (R2, `signoria.ts`): the points on each city's gauge by merchant,
   * each city's Podestà, and the day last closed.
   */
  signoria?: {
    day: number;
    points: Record<string, Record<PlayerId, number>>;
    podesta: Record<string, { playerId: PlayerId; since: number }>;
  };
  /**
   * The warehouses in the cities: this week's holders by city, the bids for next week, and the
   * units each merchant delivered from them on its last day.
   */
  /** The merchants' fondaci, per city (E1-3, see `fondaci.ts`). */
  fondaci?: Record<PlayerId, Record<string, import("./fondaci.js").Fondaco>>;
  warehouses?: {
    holders: Record<string, PlayerId[]>;
    bids: Record<string, Record<PlayerId, Deniers>>;
    used?: Record<PlayerId, { day: number; units: number }>;
  };
  /** The Bank's loans (loans.ts), by merchant: one at a time. */
  loans?: Record<
    PlayerId,
    {
      /** Principal not repaid yet. */
      amount: Deniers;
      /** All that is owed: the principal and the interest of the term (a penalty once late). */
      owed: Deniers;
      takenAt: number;
      dueAt: number;
      late?: boolean;
    }
  >;
  /** Commissions between merchants (partners.ts), by id. */
  commissions?: Record<
    string,
    {
      id: string;
      buyer: PlayerId;
      resource: ResourceCode;
      quantity: number;
      unitPrice: Deniers;
      /** Addressed to one merchant only. */
      to?: PlayerId;
      postedAt: number;
      expiresAt: number;
      filledBy?: PlayerId;
      /** Cancelled or expired, the ducats given back. */
      closed?: boolean;
    }
  >;
  /** Colleganze (partners.ts), by id. */
  colleganze?: Record<
    string,
    {
      id: string;
      investor: PlayerId;
      amount: Deniers;
      days: number;
      shareBps: number;
      to?: PlayerId;
      offeredAt: number;
      merchant?: PlayerId;
      startedAt?: number;
      /** Its term: `days` after it was taken, the season's end at the latest (absent: older saves). */
      endsAt?: number;
      /** The merchant's net sales when it took the ducats. */
      startTurnover?: Deniers;
      settled?: boolean;
      paid?: Deniers;
    }
  >;
  /** The Doge's tenders, by id, and when the next one opens (absent: at the season's start). */
  tenders?: Record<string, Tender>;
  nextTenderAt?: number;
  /** The four great families: who swore allegiance to which. */
  families?: FamiliesState;
  /** The week's campaign in the Terraferma, and the decrees in force. */
  campaign?: CampaignState;
  /** The Terraferma after OpenFront: the week's map (docs/plan-terraferme.md). */
  terra?: { week: number; map: TerraState };
  /** The glory of the last Terraferma week closed: the weekly ranking of that week. */
  terraLast?: { week: number; glory: Record<PlayerId, number> };
  /** The battle hour the merchants were last warned of (its start). */
  terraBattleWarned?: number;
  /** The Signore's decree, in force for its week, for him and his allies at the close. */
  terraDecree?: { week: number; code: string; target?: string; members: PlayerId[] };
  /**
   * The merchants' guilds of states saved before the families came back: their treasuries are
   * paid back by carats at the next tick, then they are gone (with concessions and wars).
   */
  guilds?: LegacyGuildsState;
  concessions?: unknown;
  wars?: unknown;
  /** Set once the final ranking has been published (event `season_closed`). */
  seasonClosed?: boolean;
  /** The Broglio (R8, `broglio.ts`): rumours held, offered, forged, and the spies posted. */
  broglio?: import("./broglio.js").BroglioState;
  /** The parts of the houses listed (R9, `shares.ts`), and whether the month's settlement ran. */
  shares?: Record<PlayerId, import("./shares.js").HouseShares>;
  sharesSettled?: boolean;
  /**
   * The election of the Doge (R7, `doge.ts`): the candidates frozen at its opening, their
   * programmes and each merchant's voice.
   */
  election?: {
    candidates: PlayerId[];
    programmes: Record<
      PlayerId,
      { mutator: string | null; decree: { code: string; target?: string } }
    >;
    votes: Record<PlayerId, { candidate: PlayerId; weight: number; boost: number }>;
  };
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

/** A combat vehicle of the Remise: its model, its places (a component's id, or null). */
export interface CombatVehicle {
  id: string;
  model: string;
  slots: (string | null)[];
  /** Sent to the Porta (docked once `arrivesAt` is past), and in a battle there. */
  porta?: PortaPlace;
  /** On its way back to the Remise until then. */
  backAt?: number;
}

/** A vehicle sent to the Porta: there once `arrivesAt` is past, engaged in a battle or not. */
export interface PortaPlace {
  arrivesAt: number;
  battle?: string;
}

/** The house's Porta (docs/plan-porta.md §§ 3, 8, 9). */
export interface EmpirePorta {
  cell: string;
  level: number;
  /** The best tier won (0: none yet). */
  best: number;
  /** The relics kept, by rarity. */
  relics: Partial<Record<"common" | "rare" | "precious" | "legendary", number>>;
  /** The points of the week (the Carnet's week index), for the ranking. */
  week: { index: number; points: number };
  /** The battle the house is in: its tier, its vehicles, the victuals paid. */
  battle?: { id: string; tier: number; combatId: string; transportId: string; paid: number };
}

/** A component of the house, fitted on a combat vehicle or kept at the Remise. */
export interface ArmComponent {
  id: string;
  code: string;
  level: number;
}

/** The arms of a house (docs/plan-porta.md §§ 4–5). */
export interface EmpireArms {
  vehicles: CombatVehicle[];
  components: ArmComponent[];
  /** Each combat model's level (1 when unset). */
  levels?: Record<string, number>;
}
