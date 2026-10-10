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
    id: string;
    name: string;
    startsAt: number;
    seasonDays: number;
    registrationClosesDay: number;
  };
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
  inventory: { resource: string; available: number; escrow: number }[];
  buildings: BuildingView[];
  market: MarketLine[];
  cityQuotes: { city: string; resource: string; unitPrice: Money }[];
  projects: Project[];
  tutorial: string[];
}

export interface GameResponse {
  serverTime: number;
  view: PlayerView | null;
  error?: string;
}

export interface RankingRow {
  rank: number;
  pseudo: string | null;
  region: string;
  netWorth: Money;
  me: boolean;
}

export type Action =
  | { type: "startProduction"; buildingId: string; batches: number }
  | { type: "collect"; buildingId: string }
  | { type: "collectAll" }
  | { type: "build"; buildingType: string }
  | { type: "upgrade"; buildingId: string }
  | { type: "instantOrder"; resource: string; side: "buy" | "sell"; quantity: number }
  | { type: "sellToCity"; city: string; resource: string; quantity: number }
  | { type: "deliverToProject"; projectId: string; resource: string; quantity: number };
