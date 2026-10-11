/** API payloads. Amounts are strings of deniers (1 ducat = 100 deniers). */
export type Money = string;

export interface Cost {
  ducats: Money;
  materials: Record<string, number>;
}

export interface Recipe {
  code: string;
  building: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  durationMinutes: number;
}

export interface Catalog {
  world: {
    name: string;
    startsAt: number;
    seasonDays: number;
    registrationClosesDay: number;
  };
  ports: { code: string; name: string }[];
  destinations: Record<string, Destination>;
  maxGalleys: number;
  ships: ShipType[];
  fleet: { maxPerPlayer: number; portDuesBps: number };
  privateers: PrivateerRules;
  rations: { resource: string; perLevelPerDay: number; slowdownBps: number };
  resources: { code: string; name: string; chain: string; tier: string }[];
  regions: { code: string; name: string; bonusResource: string; startingBuildings: string[] }[];
  cities: { code: string; name: string; buys: string[] }[];
  buildings: {
    type: string;
    name: string;
    recipe: Recipe | null;
    cost: Cost;
    upkeepPerDay: Money;
  }[];
  referencePrices: Record<string, Money>;
  rules: {
    maxBuildings: number;
    maxBuildingLevel: number;
    productionQueueMaxHours: number;
    marketTaxBps: number;
    instantOrderSlippageBps: number;
    regionBonusBps: number;
  };
}

export interface Destination {
  hours: number;
  charter: Money;
  escort: Money;
  provisions: Record<string, number>;
  riskBps: number;
  escortRiskBps: number;
  returns: string;
  gainBps: number;
  maxCargoValue: Money;
  /** Standing premium (bps) the port pays for some of our goods. */
  wants: Record<string, number>;
}

export interface BookLine {
  price: Money;
  quantity: number;
  /** Player id, or "market_maker" for the Fondaco. */
  by: string;
  mine: boolean;
}

export interface BookView {
  asks: BookLine[];
  bids: BookLine[];
  /** Units still allowed with the Fondaco today (null: no quota). */
  quota: { buy: number | null; sell: number | null };
}

export interface OrderView {
  id: string;
  resource: string;
  side: "buy" | "sell";
  kind: "limit" | "instant";
  price: Money;
  quantity: number;
  remaining: number;
  expiresAt: number;
}

export interface ShipType {
  type: string;
  name: string;
  costDucats: Money;
  costMaterials: Record<string, number>;
  holdValue: Money;
  speedBps: number;
  defense: number;
  upkeepPerDay: Money;
  repairCost: Money;
  repairHours: number;
}

export interface PrivateerRules {
  maxActive: number;
  letterFee: Money;
  hours: number;
  provisions: Record<string, number>;
  shareBps: number;
  minChanceBps: number;
  maxChanceBps: number;
  newcomerDays: number;
  minTargetWorthBps: number;
  cooldownHours: number;
}

export interface ShipView {
  id: string;
  type: string;
  damaged: boolean;
  readyAt: number;
  status: "ready" | "at_sea" | "damaged" | "repairing";
}

export interface RaidView {
  id: string;
  route: string;
  ships: string[];
  attack: number;
  startAt: number;
  endAt: number;
  outcome: "cruising" | "returned";
  beaten: boolean;
  booty: Record<string, number>;
  hits: {
    expeditionId: string;
    victimId: string;
    at: number;
    chanceBps: number;
    success: boolean;
    taken: Record<string, number>;
  }[];
}

export interface SeaNews {
  raider: string;
  victim: string;
  route: string;
  at: number;
  taken: Record<string, number>;
}

export interface ContractView {
  id: string;
  day: number;
  resource: string;
  quantity: number;
  city: string;
  unitPrice: Money;
  expiresAt: number;
  done: boolean;
}

export interface GazetteEvent {
  code: string;
  city: string | null;
  startsAt: number;
  endsAt: number;
}

export interface ExpeditionView {
  id: string;
  destination: string;
  departAt: number;
  returnAt: number;
  cargo: Record<string, number>;
  escort: boolean;
  cargoValue: Money;
  outcome: "pending" | "returned" | "lost";
  brought: number;
  ships?: string[];
  defense?: number;
  boarding: { raider: string; success: boolean; taken: Record<string, number> } | null;
}

export interface BuildingView {
  id: string;
  type: string;
  level: number;
  recipe: string | null;
  job: {
    recipe: string;
    startedAt: number;
    batches: number;
    batchMs: number;
    level: number;
    ready: number;
    endsAt: number;
  } | null;
  canStart: number;
  upgradeCost: Cost | null;
  upkeepPerDay: Money;
}

export interface MarketLine {
  resource: string;
  reference: Money;
  recentPrice: Money | null;
  bestBid: Money | null;
  bestAsk: Money | null;
  unitValue: Money;
}

export interface Project {
  id: string;
  city: string;
  openedAt: number;
  deadline: number;
  needs: Record<string, number>;
  delivered: Record<string, number>;
  unitPrice: Record<string, Money>;
}

export interface PlayerView {
  serverTime: number;
  day: number;
  player: { id: string; region: string; joinedAt: number; upkeepDefaultUntil: number };
  cash: Money;
  escrow: Money;
  upkeepPerDay: Money;
  netWorth: { cash: Money; stock: Money; buildings: Money; total: Money };
  standing: {
    rank: number | null;
    players: number;
    title: { index: number; current: Title; next: Title | null; progress: number };
    seasonEndsAt: number;
  };
  inventory: { resource: string; available: number; escrow: number }[];
  buildings: BuildingView[];
  market: MarketLine[];
  cityQuotes: { city: string; resource: string; unitPrice: Money }[];
  projects: Project[];
  contracts: ContractView[];
  gazette: { current: GazetteEvent | null; next: GazetteEvent | null };
  expeditions: ExpeditionView[];
  book: Record<string, BookView>;
  openOrders: OrderView[];
  ships: ShipView[];
  raids: RaidView[];
  /** This week's port prices (bps of reference), per port and resource. */
  ports: Record<string, Record<string, number>>;
  watchedRoutes: string[];
  seaNews: SeaNews[];
  rations: { resource: string; perDay: number; hungryUntil: number };
  tutorial: string[];
}

export interface GameResponse {
  serverTime: number;
  view: PlayerView | null;
  error?: string;
  /** Unread notifications (the bell). */
  unread?: number;
  /** Pseudos of merchants met at sea or in the order book. */
  names?: Record<string, string | null>;
  /** Which of them are computer-run houses. */
  bots?: string[];
}

export type NotificationKind =
  | "harvest"
  | "order"
  | "galley"
  | "raid"
  | "corsairs"
  | "event"
  | "week";

export interface Notice {
  id: number;
  kind: NotificationKind;
  data: Record<string, unknown>;
  createdAt: number;
  read: boolean;
}

export interface PushSettings {
  publicKey: string | null;
  kinds: NotificationKind[];
  off: NotificationKind[];
}

export interface CrestData {
  shape: string;
  color: string;
  symbol: string;
}

export interface RankingRow {
  rank: number;
  pseudo: string | null;
  region: string;
  netWorth: Money;
  crest: CrestData | null;
  me: boolean;
  /** Computer-run merchant. */
  bot: boolean;
}

export interface WeekRow {
  rank: number;
  pseudo: string | null;
  region: string;
  crest: CrestData | null;
  bot: boolean;
  me: boolean;
  /** Net worth gained this week, in deniers (may be negative). */
  gain: Money;
}

export interface PodiumRow {
  rank: number;
  pseudo: string | null;
  crest: CrestData | null;
  bot: boolean;
  gain: Money;
  award: "doge" | "procurator" | "senator" | null;
}

export interface WeekRanking {
  week: number;
  endsAt: number;
  rows: WeekRow[];
  me: WeekRow | null;
  total: number;
  lastWeek: PodiumRow[];
}

export interface Title {
  code: string;
  name: string;
  from: number;
}

export interface Profile {
  region: string;
  joinedAt: number;
  title: { index: number; current: Title; next: Title | null; progress: number };
  titles: Title[];
  netWorth: { cash: Money; stock: Money; buildings: Money; total: Money };
  rank: number | null;
  players: number;
  buildings: number;
  totalLevels: number;
  stats: { trades: number; citySold: number; delivered: number; days: number; builds: number };
  badges: { code: string; name: string; value: number; goal: number; earned: boolean }[];
  weekly: { week: number; rank: number; gain: Money; award: PodiumRow["award"] }[];
}

export type PriceSeries = Record<string, { t: number; price: string; volume: number }[]>;

export type Action =
  | { type: "startProduction"; buildingId: string; batches: number }
  | { type: "collect"; buildingId: string }
  | { type: "collectAll" }
  | { type: "build"; buildingType: string }
  | { type: "upgrade"; buildingId: string }
  | { type: "instantOrder"; resource: string; side: "buy" | "sell"; quantity: number }
  | { type: "sellToCity"; city: string; resource: string; quantity: number }
  | { type: "deliverToProject"; projectId: string; resource: string; quantity: number }
  | { type: "fulfillContract"; contractId: string }
  | {
      type: "launchExpedition";
      destination: string;
      cargo: Record<string, number>;
      escort: boolean;
      ships?: string[];
    }
  | { type: "collectExpedition"; expeditionId: string }
  | { type: "limitOrder"; resource: string; side: "buy" | "sell"; price: string; quantity: number }
  | { type: "cancelOrder"; orderId: string }
  | { type: "buildShip"; shipType: string }
  | { type: "repairShip"; shipId: string }
  | { type: "commissionPrivateers"; route: string; ships: string[] }
  | { type: "collectRaid"; raidId: string };
