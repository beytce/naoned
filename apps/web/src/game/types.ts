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
  rations: { resource: string; perDay: number; hungryUntil: number };
  tutorial: string[];
}

export interface GameResponse {
  serverTime: number;
  view: PlayerView | null;
  error?: string;
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
    }
  | { type: "collectExpedition"; expeditionId: string };
