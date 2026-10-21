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

/** The Journal du Rialto: the world's last day. */
export type JournalEntry =
  | {
      kind: "trade";
      at: number;
      buyer: string | null;
      seller: string | null;
      resource: string;
      quantity: number;
      value: Money;
    }
  | { kind: "company"; at: number; city: string; merchants: number }
  | {
      kind: "conquest";
      at: number;
      who: string | null;
      milan: boolean;
      nation: string | null;
      cells: number;
    }
  | { kind: "terra_week"; at: number; signore: string | null; conquest: boolean };

export interface Catalog {
  world: {
    name: string;
    startsAt: number;
    endsAt: number;
    seasonDays: number;
    registrationClosesDay: number;
  };
  /** The Doge of the season before, honoured on the Dogana's façade. */
  previousDoge?: { pseudo: string | null; crest: CrestData | null; season: string } | null;
  /** The players' community (a Discord invite, a forum), null when none. */
  community?: string | null;
  /** Deliveries by road (null when the world has none). */
  road: RoadRules | null;
  /** The four families, their campaign and their decrees (null: off in this world). */
  families: FamilyRules | null;
  rations: { resource: string; perLevelPerDay: number; slowdownBps: number };
  /** Masteries: the house's levels needed, and what each one changes. */
  specialties: {
    unlockLevels: number;
    options: Record<
      string,
      {
        transformYieldBps: number;
        vehicleSpeedBps: number;
        extraVehicles: number;
        mudaQuotaBps: number;
        marketMakerQuotaBps: number;
        taxDiscountBps: number;
        extraOpenOrders: number;
      }
    >;
  };
  resources: { code: string; name: string; chain: string; tier: string }[];
  regions: { code: string; name: string; bonusResource: string; startingBuildings: string[] }[];
  cities: { code: string; name: string; buys: string[] }[];
  buildings: {
    type: string;
    name: string;
    recipe: Recipe | null;
    cost: Cost;
    /** Regions where it may be built (null: anywhere). */
    regions: string[] | null;
    /** The luxury chains: the net sales, and the title, that open it (null: open). */
    unlock: { turnover: Money; title: string } | null;
  }[];
  referencePrices: Record<string, Money>;
  rules: {
    maxBuildings: number;
    maxBuildingLevel: number;
    productionQueueMaxHours: number;
    marketTaxBps: number;
    instantOrderSlippageBps: number;
    regionBonusBps: number;
    levelYieldBonusBps: number;
    /** The caution of a tender's bid, in percent of what it is worth. */
    tenderCautionPct?: number;
    /** The manufactures past the last ordinary level (null: none). */
    manufacture?: { maxLevel: number; qualityPct: number; title: string } | null;
  };
}

export interface VehicleType {
  type: string;
  costDucats: Money;
  costMaterials: Record<string, number>;
  capacity: number;
  speedBps: number;
  /** The next step, for ducats, made at home. */
  upgrade?: { to: string; costDucats: Money };
}

export interface RoadRules {
  /** Minutes one way at normal speed: region → city → minutes. */
  routes: Record<string, Record<string, number>>;
  vehicles: VehicleType[];
  maxVehicles: number;
  /** Types that may be bought (a mule); the others are reached by upgrading. */
  forSale: string[];
  maxDeliveryMinutes: number;
  /** Orders a vehicle may carry together, all for the same city. */
  maxOrdersPerLoad: number;
}

export type DeliveryKind = "city" | "doge" | "family" | "urgent";

export interface DeliveryOrderView {
  id: string;
  day: number;
  kind: DeliveryKind;
  city: string;
  resource: string;
  quantity: number;
  unitPrice: Money;
  opensAt: number;
  expiresAt: number;
  status: "open" | "done" | "upcoming" | "expired" | "taken";
  /** An order of the world's board, open to all; who took it. */
  shared?: boolean;
  takenBy?: string | null;
  /** Other active merchants who may take it (shared orders). */
  rivals?: number;
  /** Minutes one way, per vehicle type (null: no road). */
  minutes: Record<string, number | null>;
}

export interface VehicleView {
  id: string;
  type: string;
  investedValue: Money;
  busyUntil: number;
  status: "free" | "busy";
}

export interface DeliveryView {
  id: string;
  orderId: string;
  kind: DeliveryKind;
  vehicleId: string;
  /** "region:city" */
  route: string;
  resource: string;
  loaded: number;
  cargo: Record<string, number>;
  payment: Money;
  /** The orders carried, when there are several. */
  orders?: { id: string; kind: string; resource: string; quantity: number; payment: Money }[];
  paid?: Money;
  departAt: number;
  arriveAt: number;
  backAt: number;
  outcome: "en_route" | "delivered";
  /** Sent by the fattore while the merchant was away. */
  fattore?: boolean;
}

export interface RoadView {
  orders: DeliveryOrderView[];
  /** The day's biggest takes on the world's board. */
  boardNews?: {
    playerId: string;
    city: string;
    resource: string;
    quantity: number;
    payment: Money;
  }[];
  vehicles: VehicleView[];
  deliveries: DeliveryView[];
}

export interface BookLine {
  price: Money;
  quantity: number;
  /** Player id, or "market_maker" for the Dogana. */
  by: string;
  mine: boolean;
}

export interface BookView {
  asks: BookLine[];
  bids: BookLine[];
  /** Units still allowed with the Dogana today (null: no quota). */
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

export interface DecreePick {
  code: string;
  /** A good (gabelle, calmiere) or a city (faveur). */
  target?: string;
}

export interface DecreeRules {
  catalog: string[];
  perWinner: number;
  maxVoteBps: number;
  defaults: DecreePick[];
  fondaco: { taxBps: number; quotaBps: number };
  gabelle: { extraTaxBps: number };
  faveur: { premiumBps: number; reservedMinutes: number };
  peage: { tollBps: number };
  levant: { memberQuotaBps: number; othersCutBps: number };
  calmiere: { capBps: number };
}

export interface WorkRules {
  kinds: Record<
    string,
    { price: Money; defenseBonusBps: number; gloryBonusBps: number; staging: boolean }
  >;
  buildMinutes: number;
  perFamily: number;
  perMembers: number;
  razeMerit: number;
}

/** A work standing on a land (finished once `ready`). */
export interface WorkView {
  kind: string;
  family: string;
  by: string;
  readyAt: number;
  ready: boolean;
}

export interface FamilyRules {
  openDay: number;
  list: { code: string; seat: string }[];
  campaign: {
    kinds: Record<
      string,
      { glory: number; defenseBps: number; militia: number; militiaPerActive: number }
    >;
    openHours: { from: number; to: number };
    levy: { perHour: number; max: number };
    hire: { count: number; price: Money }[];
    lanceHours: number;
    march: { baseMinutes: number; perHopMinutes: number };
    milan: {
      everyHours: number;
      warningMinutes: number;
      base: number;
      perActive: number;
      leadBonusBps: number;
    };
    garrisonLancesPerPoint: number;
    works: WorkRules | null;
  } | null;
  decrees: DecreeRules;
}

export interface LandView {
  code: string;
  kind: string;
  city: string | null;
  x: number;
  y: number;
  neighbors: string[];
  /** A family's code, "milan", or null for the militia. */
  holder: string | null;
  garrison: number;
  /** The merchant's own lances in its garrison. */
  mine: number;
  /** What the garrison counts for, its work's share included once finished. */
  defenseBps: number;
  /** Lances an assault must outnumber now. */
  defense: number;
  glory: number;
  work: WorkView | null;
  /** The family whose seat it is. */
  seat: string | null;
  since: number;
  /** The merchant may send lances there now. */
  open: boolean;
  minutes: number | null;
  /** Where the merchant's march would leave from: the seat or a camp of the family. */
  from: string | null;
}

export interface MarchView {
  id: string;
  family: string;
  by: string | null;
  target: string;
  /** Where it left from (null for Milan). */
  from: string | null;
  startAt: number;
  arriveAt: number;
  lances: number;
  /** The merchant's own lances in it. */
  mine: number;
}

export interface FamiliesView {
  opensAt: number;
  mine: string | null;
  families: {
    code: string;
    seat: string;
    members: number;
    active: number;
    levyBps: number;
    glory: number;
    programme: DecreePick[];
    lands: number;
    works: number;
  }[];
  members: { playerId: string; merit: number; me: boolean }[];
  week: number;
  weekEndsAt: number;
  closed: boolean;
  /** Marches arrive and glory counts now (outside the night's truce). */
  open: boolean;
  nextOpenAt: number;
  nextMilanAt: number | null;
  lands: LandView[];
  marches: MarchView[];
  me: {
    reserve: number;
    levy: number;
    levyMax: number;
    hired: number;
    hireLimit: number;
    nextPrice: Money | null;
    merit: number;
    works: number;
    worksAllowed: number;
    ballot: DecreePick[];
    leaving: { count: number; expiresAt: number }[];
  } | null;
  decrees: { family: string; items: DecreePick[]; cities: string[]; week: number } | null;
  history: {
    week: number;
    winner: string | null;
    glory: Record<string, number>;
    decrees: DecreePick[];
    captains: Record<string, string>;
    final: boolean;
  }[];
}

export interface GazetteEvent {
  code: string;
  city: string | null;
  startsAt: number;
  endsAt: number;
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
    /** Collecting before this time earns the fresh produce bonus. */
    freshUntil: number | null;
  } | null;
  canStart: number;
  /** Seconds of the next single batch when it is a tutorial one, otherwise null. */
  fastSeconds: number | null;
  upgradeCost: Cost | null;
  /** Extractor built outside its region before the rule: produces, cannot be upgraded. */
  outOfRegion: boolean;
  /** In figures: units and margin an hour, the next level's gain and payback. */
  /** The manufacture's path (null: not chosen), the level its batches work at. */
  path: "volume" | "quality" | null;
  workLevel: number;
  /** At the last ordinary level: the path may be chosen ("open") or awaits a title. */
  pathChoice: "open" | "locked" | null;
  economics: {
    unitsPerHour: number;
    marginPerHour: Money;
    next: { cost: Money; addedPerHour: Money; paybackMinutes: number } | null;
  };
}

export interface MarketLine {
  resource: string;
  reference: Money;
  recentPrice: Money | null;
  bestBid: Money | null;
  bestAsk: Money | null;
  unitValue: Money;
  /** The Dogana's price, in bps of the reference (it follows supply and demand). */
  doganaBps: number;
}

export interface Project {
  id: string;
  city: string;
  openedAt: number;
  deadline: number;
  needs: Record<string, number>;
  delivered: Record<string, number>;
  unitPrice: Record<string, Money>;
  /** What the merchant was paid for his deliveries to it. */
  mine: Money;
  /** Merchants who delivered to it. */
  merchants: number;
  /** When it was filled (the bonus paid then). */
  completedAt?: number;
}

export interface PlayerView {
  serverTime: number;
  day: number;
  player: {
    id: string;
    region: string;
    joinedAt: number;
    /** The house's privileges in this world (absent: none, or no house in this world). */
    patents?: string[];
  };
  cash: Money;
  escrow: Money;
  netWorth: { cash: Money; stock: Money; buildings: Money; total: Money };
  standing: {
    rank: number | null;
    players: number;
    /** Net sales of the season (sales less purchases): what the ranking counts. */
    turnover: Money;
    title: { index: number; current: Title; next: Title | null; progress: number };
    seasonEndsAt: number;
  };
  /** The season's acts (the variant of each one is told once it has begun). */
  acts: {
    code: string;
    index: number;
    startsAt: number;
    endsAt: number;
    variant: string | null;
    /** Milan's strength in the campaign during the act (10 000 = as usual). */
    milanBps: number;
  }[];
  /** The house's mastery: chosen, or how far it is (levels of all workshops). */
  mastery: { chosen: string | null; levels: number; unlocked: boolean };
  inventory: { resource: string; available: number; escrow: number }[];
  buildings: BuildingView[];
  /** The upgrade that pays back first (null: none left). */
  bestUpgrade: string | null;
  /** The guide's next best actions, the most urgent first. */
  next: NextAction[];
  /** The Doge's tenders open to bids, and those won and not yet delivered. */
  tenders: TenderView[];
  /** Deals between merchants: commissions and colleganze (null: none in this world). */
  deals: DealsView | null;
  /** The warehouses in the cities (null: none in this world). */
  warehouses: WarehousesView | null;
  /** The goods the merchant is the official supplier of this week, by city. */
  supplies: { city: string; resource: string }[];
  market: MarketLine[];
  cityQuotes: { city: string; resource: string; unitPrice: Money }[];
  projects: Project[];
  contracts: ContractView[];
  families: FamiliesView | null;
  gazette: { current: GazetteEvent | null; next: GazetteEvent | null };
  book: Record<string, BookView>;
  openOrders: OrderView[];
  /** Deliveries by road (null when the world has none). */
  road: RoadView | null;
  /** The galleys of the Muda (null when the world has none). */
  muda: MudaView | null;
  rations: {
    resource: string;
    perDay: number;
    /** Loaves per workshop level. */
    perLevel: number;
    hungryUntil: number;
    nextMealAt: number;
  };
  tutorial: string[];
  missions: MissionView[];
  daily: DailyView | null;
  /** The house's missions (null in a world without them). */
  houseMissions: HouseMissionsView | null;
  /** Prices in Influence, and what is left of today's limits (null in a world without them). */
  houseSpend: HouseSpendView | null;
  bales: BalesView | null;
  pass: PassView;
  fresh: { minutes: number; bonusBps: number };
  criee: CrieeView | null;
}

export interface PassView {
  /** Off until it comes back: the profile only announces it. */
  enabled: boolean;
  active: boolean;
  until: number;
  /** Exactly what the Pass gives, from the settings: information to read and cosmetics. */
  perks: {
    history30Days: boolean;
    dashboardDetail: boolean;
    deepBook: boolean;
    cosmetics: boolean;
  };
  maxOpenOrders: number;
}

export interface DailyView {
  day: number;
  tasks: {
    id: string;
    event: string;
    count: number;
    progress: number;
    done: boolean;
    claimed: boolean;
    reward: { goods: Record<string, number>; ducats: Money };
  }[];
  chestClaimed: boolean;
  chest: Money;
  streak: number;
  best: number;
  resetsAt: number;
}

export interface BaleCard {
  rarity: string;
  resource: string;
  quantity: number;
}

/** Faraj's bales: waiting, the next one, the last one opened and the odds. */
export interface BalesView {
  available: number;
  max: number;
  /** Null when the stack is full (or the season ends first). */
  nextAt: number | null;
  intervalHours: number;
  cardsPerBale: number;
  opened: number;
  last: { seq: number; at: number; cards: BaleCard[] } | null;
  odds: {
    rarity: string;
    chanceBps: number;
    goods: { resource: string; chanceBps: number }[];
    quantities: { quantity: number; chanceBps: number }[];
  }[];
}

export interface CrieeView {
  index: number;
  city: string;
  resource: string;
  premiumBps: number;
  startsAt: number;
  endsAt: number;
  price: Money;
  room: { mine: number; total: number };
}

export interface MissionView {
  id: string;
  day: number;
  count: number;
  progress: number;
  unlocked: boolean;
  opensAt: number;
  done: boolean;
  claimed: boolean;
  reward: { goods: Record<string, number>; ducats: Money; vehicles: string[] };
}

/** "While you were away", after 4 hours or more. */
export interface Welcome {
  since: number;
  income: Record<string, Money>;
  readyBatches: number;
  notices: Record<string, number>;
  slept: boolean;
  /** The road while away: deliveries arrived. */
  road?: { arrived: number };
  /** The Terraferma while away, and where the merchant stands now (null: not on the map). */
  terra?: {
    gained: number;
    lost: number;
    fronts: number;
    spent: number;
    cells: number;
    troops: number;
    cap: number;
    perHour: number;
    glory: number;
    rank: number;
    eliminated: boolean;
  } | null;
}

export interface GameResponse {
  serverTime: number;
  /** The world's saved version the view was built from. */
  version?: number;
  view: PlayerView | null;
  error?: string;
  /** Unread notifications (the bell). */
  unread?: number;
  /** Newest message of the family's thread (null: no family or no message). */
  familyLatestAt?: number | null;
  /** The house's Influence, kept from season to season (worlds with the house only). */
  influence?: number;
  welcome?: Welcome;
  /** The rival of the week: the merchant just ahead (just behind for the leader). */
  rival?: {
    pseudo: string | null;
    bot: boolean;
    character: string | null;
    gain: string;
    mine: string;
    ahead: boolean;
  } | null;
  /** Pseudos of merchants met in the family or the order book. */
  names?: Record<string, string | null>;
  /** Which of them are computer-run houses. */
  bots?: string[];
  /** A Pass won that starts later (the next season). */
  upcomingPass?: { startsAt: number; endsAt: number; source: string } | null;
  /** Prices shown for the Pass, in euro cents. */
  passPrices?: { season: number; week: number };
  /** The closing ceremony of the last season, until watched. */
  ceremony?: Ceremony;
  /** The merchant's permanent level (honorary). */
  level?: Level;
}

/** Permanent level: one point per ducat of net sales, every season; it never goes back. */
export interface Level {
  level: number;
  xp: number;
  from: number;
  to: number;
  progress: number;
}

export interface Ceremony {
  worldId: string;
  season: string;
  rank: number;
  players: number;
  worth: Money;
  /** Net sales of the season, which ranked it (absent for seasons ranked by net worth). */
  turnover: Money | null;
  tier: string;
  award: string;
  /** Title held at the close and the renown it added (included in `renown`). */
  milestone: { name: string; renown: number };
  renown: number;
  passDays: number | "season";
  totalRenown: Renown;
  podium: {
    rank: number;
    pseudo: string | null;
    crest: CrestData | null;
    worth: Money;
    turnover: Money | null;
  }[];
}

export interface Renown {
  points: number;
  current: { from: number; name: string };
  next: { from: number; name: string } | null;
}

export interface Palmares {
  renown: Renown;
  seasons: {
    season: string;
    endsAt: number;
    rank: number;
    players: number;
    worth: Money;
    turnover: Money | null;
    tier: string;
    award: string;
    milestone: { name: string; renown: number };
    renown: number;
  }[];
  weekly: {
    weeks: number;
    podiums: number;
    wins: number;
    top10: number;
    best: number | null;
    latest: { season: string; week: number; rank: number; gain: Money; award: string | null }[];
  };
}

/** The galleys of the Muda: the lot on the quay, its price, and what the merchant may still buy. */
export interface MudaView {
  nextAt: number | null;
  arrivedAt: number | null;
  goods: string[];
  stock: Record<string, number>;
  price: Record<string, Money>;
  left: Record<string, number>;
  quota: Record<string, number>;
}

export type NotificationKind =
  | "harvest"
  | "order"
  | "event"
  | "act"
  | "week"
  | "season"
  | "criee"
  | "deal"
  | "family"
  | "siege"
  | "delivery"
  | "muda";

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
  /** Account id, to open the merchant's palmarès. */
  id: string;
  /** Holds the Pass Négociant (a seal next to the name). */
  pass?: boolean;
  rank: number;
  pseudo: string | null;
  region: string;
  /** Mastery of the season, if chosen. */
  specialty?: string | null;
  netWorth: Money;
  /** Net sales of the season (sales less purchases): what ranks it. */
  turnover: Money;
  /** Permanent level (honorary). */
  level: number;
  crest: CrestData | null;
  me: boolean;
  /** Computer-run merchant. */
  bot: boolean;
  /** Bought the gilded name with Influence. */
  gilded?: boolean;
}

export interface WeekRow {
  id: string;
  pass?: boolean;
  rank: number;
  pseudo: string | null;
  region: string;
  crest: CrestData | null;
  bot: boolean;
  me: boolean;
  /** Permanent level (honorary). */
  level?: number;
  /** Net sales this week (sales less purchases), in deniers (may be negative). */
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
  /** Renown this title adds when the season closes (its milestone). */
  renown: number;
}

export interface Profile {
  region: string;
  joinedAt: number;
  title: { index: number; current: Title; next: Title | null; progress: number };
  titles: Title[];
  netWorth: { cash: Money; stock: Money; buildings: Money; total: Money };
  /** Net sales of the season: the ranking and the titles. */
  turnover: Money;
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
  | { type: "collectAndRestart" }
  | { type: "claimMission"; missionId: string }
  | { type: "chooseSpecialty"; specialty: string }
  | { type: "claimDaily"; taskId: string }
  | { type: "openBale" }
  | { type: "sellToCriee"; quantity: number }
  | { type: "collectAll" }
  | { type: "build"; buildingType: string }
  | { type: "upgrade"; buildingId: string }
  | { type: "instantOrder"; resource: string; side: "buy" | "sell"; quantity: number }
  | { type: "sellToCity"; city: string; resource: string; quantity: number }
  | { type: "deliverToProject"; projectId: string; resource: string; quantity: number }
  | { type: "tenderBid"; tenderId: string; price: string; quantity: number }
  | { type: "tenderDeliver"; tenderId: string }
  | { type: "warehouseBid"; city: string; amount: string }
  | { type: "choosePath"; buildingId: string; path: "volume" | "quality" }
  | {
      type: "postCommission";
      resource: string;
      quantity: number;
      unitPrice: string;
      days: number;
      to?: string;
    }
  | { type: "fillCommission"; commissionId: string }
  | { type: "cancelCommission"; commissionId: string }
  | { type: "offerColleganza"; amount: string; days: number; shareBps: number; to?: string }
  | { type: "acceptColleganza"; colleganzaId: string }
  | { type: "borrow"; amount: string; days: number }
  | { type: "repayLoan" }
  | { type: "cancelColleganza"; colleganzaId: string }
  | { type: "fulfillContract"; contractId: string }
  | { type: "joinFamily"; family: string }
  | { type: "collectLevy" }
  | { type: "hireLances"; count: number }
  | { type: "buildWork"; land: string; kind: string }
  | { type: "sendMarch"; land: string; lances: number }
  | { type: "joinMarch"; marchId: string; lances: number }
  | { type: "voteProgramme"; picks: DecreePick[] }
  | { type: "limitOrder"; resource: string; side: "buy" | "sell"; price: string; quantity: number }
  | { type: "cancelOrder"; orderId: string }
  | { type: "buyVehicle"; vehicleType: string }
  | { type: "upgradeVehicle"; vehicleId: string }
  | {
      type: "dispatchDelivery";
      orderId: string;
      orderIds?: string[];
      vehicleId: string;
    }
  | { type: "claimHouseMission"; missionId: string }
  | TerraAction;

/** The Terraferma's commands (docs/plan-terraferme.md). */
export type TerraAction =
  | { type: "terraPlace"; cell: number }
  | { type: "terraFront"; aim: number; shareBps: number }
  | { type: "terraRecall"; frontId: string }
  | { type: "terraAlly"; other: string }
  | { type: "terraAccept"; from: string }
  | { type: "terraBreak"; other: string }
  | { type: "terraSend"; to: string; count: number }
  | { type: "terraBuild"; cell: number; kind: "rocca" | "borgo" | "porto" | "bombarda" | "mura" }
  | { type: "terraSail"; aim: number; shareBps: number }
  | { type: "terraFire"; cell: number }
  | { type: "terraSignal"; kind: "help" | "attack" | "thanks" | "peace"; cell?: number }
  | { type: "terraGift"; to: string; amount: string }
  | { type: "terraEmbargo"; target: string | null }
  | { type: "terraRaise" }
  | { type: "terraDecree"; code: string; target?: string }
  | { type: "terraPeasants"; shareBps: number };

/**
 * The Terraferma's week as the merchant sees it (GET /api/game/terra). Holders are named by
 * their index in `holders`; -1 is neutral land.
 */
export interface TerraView {
  /** A skirmish's map (no building, no alliance, no placement). */
  skirmish?: boolean;
  week: number;
  closesAt: number;
  /** Until when merchants may set down (null: any time); nobody comes in after it. */
  placementEndsAt: number | null;
  /** Until when nobody may attack another merchant (null: no truce). */
  truceEndsAt: number | null;
  openHours: { from: number; to: number };
  /** The battle hour (null: none): the fronts march ten times as fast. */
  battle: { from: number; to: number; on: boolean } | null;
  /** Whether the fronts march now (they rest at night). */
  open: boolean;
  map: {
    width: number;
    height: number;
    origin: [number, number];
    size: number;
    /** One letter a cell: p plain, h hill, m marsh, M mountain, w water. */
    terrain: string;
    cities: { cell: number; code: string }[];
  };
  holders: {
    id: string | null;
    pseudo: string | null;
    crest: CrestData | null;
    me: boolean;
    ally: boolean;
    milan: boolean;
    /** The nation it is (milan, mantova…), null for a merchant. */
    nation: string | null;
    capital: number | null;
    troops: number;
    cells: number;
  }[];
  owner: number[];
  fronts: {
    id: string;
    owner: number;
    against: number;
    aim: number;
    troops: number;
    mine: boolean;
    threat: boolean;
    /** The cells it will take next and when, if nobody acts (the merchant's fronts and threats). */
    takes: { cell: number; at: number }[];
    /** When it will stop and come home (null: not known). */
    endsAt: number | null;
  }[];
  /** What a front pays for each cell along the merchant's border. */
  /** Quick signals of the last two hours (a target only from oneself or one's allies). */
  signals: {
    from: number;
    kind: "help" | "attack" | "thanks" | "peace";
    cell: number | null;
    at: number;
  }[];
  costs: Record<string, number>;
  /** The last day's cells that changed hands, oldest first (`from`: who held it before). */
  changes: { cell: number; at: number; from: number }[];
  buildings: {
    cell: number;
    kind: "rocca" | "borgo" | "porto" | "bombarda" | "mura";
    owner: number;
  }[];
  me: {
    troops: number;
    cap: number;
    cells: number;
    glory: number;
    rank: number;
    capital: number | null;
    protectedUntil: number;
    /** Attacked a merchant this week: its capital may fall. */
    aggressor: boolean;
    /** The shores its boats may reach: minutes at sea and the shore's cost. */
    sea: Record<string, { minutes: number; cost: number }>;
    /** The holder its cities embargo (-1: none), the ducats it may still give today. */
    embargo: number;
    ducatsLeft: Money;
    holdsCity: boolean;
    /** The cells its bombards may hit now, and the shots left today. */
    bombard: { cells: number[]; shots: number };
    /** Share of its people working the land (bps). */
    peasantsBps: number;
    /** What its land yields an open hour: goods in hundredths of a unit, routes in deniers. */
    yields: { goods: Record<string, number>; route: Money };
    traitorUntil: number;
    /** When it lost its last cell: out of the week. */
    eliminatedAt: number | null;
    /** Troops recruited an open hour, when the next come in, when the maximum is reached. */
    recruit: { perHour: number; nextAt: number | null; fullAt: number | null };
    /** Its fronts come home in the last day: what each took, spent and brought back. */
    returns: {
      front: string;
      against: number;
      cells: number;
      spent: number;
      back: number;
      at: number;
    }[];
    allies: number[];
    requestsIn: number[];
    requestsOut: number[];
    raisesLeft: number;
    giftsLeft: number;
    programme: { code: string; target?: string } | null;
  } | null;
  ranking: { holder: number; glory: number; cells: number }[];
  players: number;
  decree: {
    week: number;
    code: string;
    target: string | null;
    members: (string | null)[];
    mine: boolean;
  } | null;
  closed: {
    signore: number;
    conquest: boolean;
    /** A week in teams: the teams by their summed glory. */
    teams: { team: string; glory: number; cells: number }[] | null;
  } | null;
  rules: {
    frontsMax: number;
    minShareBps: number;
    alliesMax: number;
    decrees: string[];
    prices: {
      rocca: string;
      borgo: string | null;
      porto: string | null;
      bombarda: string | null;
      mura: string | null;
      cap: string;
    };
    capRaise: number;
    /** The capital of a merchant who attacked no merchant this week is never taken. */
    peacefulSafe: boolean;
    /** Soldiers and peasants: the slider is played. */
    peasants: boolean;
    /** A week in teams: the merchant's team (its region), null otherwise. */
    team: string | null;
    /** Diplomacy: ducats to allies a day, the embargo's cut (null: off). */
    diplomacy: { ducatGiftPerDay: Money; embargoBps: number } | null;
    /** Hours a merchant who sets down is safe from the others (0: none). */
    protectionHours: number;
    /** Minutes a front takes for a cell of free land, and of a rival's. */
    neutralMinutes: number;
    cellMinutes: number;
  };
}

/** What Influence buys in the world (POST /api/house/spend). */
export type Spend =
  | { use: "rush"; deliveryId: string }
  | { use: "troops"; count: number }
  | { use: "work"; land: string }
  | { use: "respec" }
  | { use: "daily"; taskId: string };

export interface HouseSpendView {
  rushMinutesPerPoint: number;
  rushPerDay: number;
  troopsPerPoint: number;
  troopsPerDay: number;
  dailyReroll: number;
  respec: number;
  rushWork: number;
  rushesLeft: number;
  troopsLeft: number;
}

/** The house's missions: a board of ten every three and a half days, paid in Influence. */
export interface HouseMissionsView {
  board: number;
  endsAt: number;
  missions: {
    id: string;
    event: string;
    filter: Record<string, string>;
    count: number;
    influence: number;
    progress: number;
    done: boolean;
    claimed: boolean;
  }[];
}

/** The Livre de la Maison: Influence kept from season to season, and the patents it buys. */
export type HouseView =
  | { enabled: false }
  | {
      enabled: true;
      influence: number;
      patents: string[];
      entries: {
        source: "commerce" | "campaign" | "season" | "patent" | "mission" | "spend";
        week: number | null;
        amount: number;
        patent: string | null;
        at: string;
      }[];
      catalog: { code: string; cost: number; requires: string[]; owned: boolean }[];
    };

/** A message of the family's thread. */
export interface FamilyMessage {
  id: string;
  pseudo: string | null;
  body: string;
  at: number;
  mine: boolean;
}

/** A skirmish as the merchant sees it (GET /api/game/skirmish). */
export type SkirmishStatus =
  | { phase: "off" }
  | { phase: "none"; minutes: number }
  | { phase: "lobby"; opensAt: number; players: number; joined: boolean; minutes: number }
  | {
      phase: "playing" | "done";
      endsAt: number;
      playing: boolean;
      view: TerraView | null;
      result: { pseudo: string | null; me: boolean; cells: number; glory: number }[] | null;
    };

/** The counter's dashboard (GET /api/game/dashboard). */
export interface DashboardView {
  perHour: string;
  today: string;
  week: string;
  /** Seven Paris days, YYYY-MM-DD, the last one today. */
  days: string[];
  lines: { who: "me" | "rival" | "leader"; pseudo: string | null; daily: string[] }[];
}

export type NextAction =
  | { kind: "harvest"; count: number }
  | { kind: "produce"; buildingId: string }
  | { kind: "company"; projectId: string; resource: string; quantity: number }
  | { kind: "upgrade"; buildingId: string; paybackMinutes: number; addedPerHour: Money };

/** The official suppliers of the cities (GET /api/game/suppliers). */
export interface SuppliersView {
  bonusBps: number;
  minUnits?: number;
  lines: {
    city: string;
    resource: string;
    holder: SupplierPerson | null;
    top: (SupplierPerson & { units: number })[];
    mine: number;
  }[];
}

export interface SupplierPerson {
  id: string;
  me: boolean;
  pseudo: string | null;
  crest: CrestData | null;
}

export interface TenderView {
  id: string;
  resource: string;
  quantity: number;
  ceiling: Money;
  closeAt: number;
  deadline: number;
  /** Bids still taken. */
  open: boolean;
  bidders: number;
  mine: { price: Money; quantity: number; caution: Money; at: number } | null;
  won: { quantity: number; price: Money; caution: Money; delivered: boolean } | null;
}

export interface WarehousesView {
  perCity: number;
  minBid: Money;
  unitsPerDay: number;
  /** Units the merchant may still deliver from its warehouses today. */
  unitsLeft: number;
  cities: {
    city: string;
    held: boolean;
    holders: number;
    bidders: number;
    /** The bid that wins a place now. */
    toWin: Money;
    mine: Money | null;
  }[];
}

export interface DealsView {
  bank: {
    loan: { amount: Money; owed: Money; dueAt: number; late: boolean } | null;
    limit: Money;
    maxShareBps: number;
    interestBpsPerDay: number;
    maxDays: number;
    lateBps: number;
  } | null;
  commissionDays: number;
  colleganzaDays: number;
  maxShareBps: number;
  commissions: {
    id: string;
    buyer: string;
    mine: boolean;
    resource: string;
    quantity: number;
    unitPrice: Money;
    to: string | null;
    expiresAt: number;
    status: "open" | "filled" | "closed";
  }[];
  colleganze: {
    id: string;
    investor: string;
    merchant: string | null;
    role: "investor" | "merchant" | "offer";
    amount: Money;
    days: number;
    shareBps: number;
    endsAt: number | null;
    settled: boolean;
    paid: Money | null;
  }[];
}
