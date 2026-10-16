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
    endsAt: number;
    seasonDays: number;
    registrationClosesDay: number;
  };
  /** The Doge of the season before, honoured on the Dogana's façade. */
  previousDoge?: { pseudo: string | null; crest: CrestData | null; season: string } | null;
  ports: { code: string; name: string }[];
  destinations: Record<string, Destination>;
  maxGalleys: number;
  ships: ShipType[];
  fleet: { maxPerPlayer: number; portDuesBps: number };
  privateers: PrivateerRules;
  /** Deliveries by road and bandits (null when the world has none). */
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
        marketMakerQuotaBps: number;
        taxDiscountBps: number;
        extraOpenOrders: number;
        portDuesDiscountBps: number;
        holdBps: number;
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
    upkeepPerDay: Money;
    /** Regions where it may be built (null: anywhere). */
    regions: string[] | null;
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
  };
}

export interface VehicleType {
  type: string;
  costDucats: Money;
  costMaterials: Record<string, number>;
  capacity: number;
  speedBps: number;
  upkeepPerDay: Money;
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
  escorts: Record<string, { costBps: number; defense: number }>;
  bandits: {
    hoursOptions: number[];
    feePerHour: Money;
    provisionsPerHour: Record<string, number>;
    maxAttacksPerBand: number;
    maxBandsPerRoute: number;
    reactionMinutes: number;
    takeBps: number;
    keepBps: number;
    quietHours: { from: number; to: number };
    openDay: number;
  };
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
  /** Cost of each escort for this order. */
  escorts: Record<string, Money>;
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
  escort: string;
  departAt: number;
  arriveAt: number;
  backAt: number;
  midAt: number;
  outcome: "en_route" | "delivered" | "robbed_delivered";
  attack: {
    at: number;
    reactBy: number;
    reacted: boolean;
    pending: boolean;
    success: boolean | null;
    taken: Record<string, number>;
    /** Told once settled; null for a band of the computer. */
    bandit: string | null;
  } | null;
}

export interface BandView {
  id: string;
  route: string;
  startAt: number;
  endAt: number;
  attacks: number;
  dispersed: boolean;
  booty: Record<string, number>;
  collected: boolean;
  active: boolean;
  collectable: boolean;
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
  bands: BandView[];
  /** Roads where bandits lie in wait (who they are stays hidden). */
  watchedRoutes: string[];
  banditsOpenAt: number;
  /** Successful ambushes of the merchant this season, and the bounty on their head. */
  infamy: number;
  bountyOnHead: Money;
  /** Bounties received this season. */
  bounties: Money;
  /** Chance of an ambush succeeding, by escort ("none" included), in bps. */
  ambushChance: Record<string, number>;
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
  levant: { memberDiscountBps: number; othersSurchargeBps: number };
  calmiere: { capBps: number };
  franchise: { upkeepDiscountBps: number };
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
    /** Collecting before this time earns the fresh produce bonus. */
    freshUntil: number | null;
  } | null;
  canStart: number;
  /** Seconds of the next single batch when it is a tutorial one, otherwise null. */
  fastSeconds: number | null;
  upgradeCost: Cost | null;
  upkeepPerDay: Money;
  /** Extractor built outside its region before the rule: produces, cannot be upgraded. */
  outOfRegion: boolean;
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
  market: MarketLine[];
  cityQuotes: { city: string; resource: string; unitPrice: Money }[];
  projects: Project[];
  contracts: ContractView[];
  families: FamiliesView | null;
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
  /** Deliveries by road (null when the world has none). */
  road: RoadView | null;
  /** The latest successful ambushes on the roads (no names). */
  roadNews: { route: string; at: number; resource: string }[];
  rations: { resource: string; perDay: number; hungryUntil: number; nextMealAt: number };
  tutorial: string[];
  missions: MissionView[];
  daily: DailyView | null;
  bales: BalesView | null;
  pass: PassView;
  fresh: { minutes: number; bonusBps: number };
  criee: CrieeView | null;
}

export interface PassView {
  active: boolean;
  until: number;
  perks: {
    marketMakerQuotaBps: number;
    extraOpenOrders: number;
    freshBonusBps: number;
    contractRerollsPerDay: number;
  };
  maxOpenOrders: number;
  rerollsLeft: number;
  /** Corsairs on each route (Pass only). */
  lookout: Record<string, { corsairs: number; until: number }> | null;
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
  upkeep: Money;
  readyBatches: number;
  notices: Record<string, number>;
  slept: boolean;
  /** The road while away: deliveries arrived, ambushes suffered and beaten off, booty to collect. */
  road?: { arrived: number; robbed: number; repelled: number; booty: Record<string, number> };
}

export interface GameResponse {
  serverTime: number;
  view: PlayerView | null;
  error?: string;
  /** Unread notifications (the bell). */
  unread?: number;
  /** Newest message of the family's thread (null: no family or no message). */
  familyLatestAt?: number | null;
  welcome?: Welcome;
  /** Pseudos of merchants met at sea or in the order book. */
  names?: Record<string, string | null>;
  /** Which of them are computer-run houses. */
  bots?: string[];
  /** A Pass won that starts later (the next season). */
  upcomingPass?: { startsAt: number; endsAt: number; source: string } | null;
  /** Prices shown for the Pass, in euro cents. */
  passPrices?: { season: number; week: number };
  /** The closing ceremony of the last season, until watched. */
  ceremony?: Ceremony;
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

export type NotificationKind =
  | "harvest"
  | "order"
  | "galley"
  | "raid"
  | "corsairs"
  | "event"
  | "act"
  | "week"
  | "season"
  | "criee"
  | "deal"
  | "family"
  | "siege"
  | "ambush"
  | "delivery"
  | "robbed"
  | "defended"
  | "band_over";

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
  crest: CrestData | null;
  me: boolean;
  /** Computer-run merchant. */
  bot: boolean;
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
  | { type: "rerollContract"; contractId: string }
  | { type: "collectAll" }
  | { type: "build"; buildingType: string }
  | { type: "upgrade"; buildingId: string }
  | { type: "instantOrder"; resource: string; side: "buy" | "sell"; quantity: number }
  | { type: "sellToCity"; city: string; resource: string; quantity: number }
  | { type: "deliverToProject"; projectId: string; resource: string; quantity: number }
  | { type: "fulfillContract"; contractId: string }
  | { type: "joinFamily"; family: string }
  | { type: "collectLevy" }
  | { type: "hireLances"; count: number }
  | { type: "buildWork"; land: string; kind: string }
  | { type: "sendMarch"; land: string; lances: number }
  | { type: "joinMarch"; marchId: string; lances: number }
  | { type: "voteProgramme"; picks: DecreePick[] }
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
  | { type: "collectRaid"; raidId: string }
  | { type: "buyVehicle"; vehicleType: string }
  | { type: "upgradeVehicle"; vehicleId: string }
  | {
      type: "dispatchDelivery";
      orderId: string;
      orderIds?: string[];
      vehicleId: string;
      escort: string;
    }
  | { type: "reactToAmbush"; deliveryId: string }
  | { type: "postBand"; route: string; hours: number }
  | { type: "collectBooty"; bandId: string };

/** A message of the family's thread. */
export interface FamilyMessage {
  id: string;
  pseudo: string | null;
  body: string;
  at: number;
  mine: boolean;
}
