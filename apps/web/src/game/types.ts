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
  /** The guilds' rules (maxMembers 0: guilds are off). */
  guildRules: {
    openDay: number;
    foundingCost: Money;
    minStake: Money;
    caratValue: Money;
    maxMembers: number;
    exitFeeBps: number;
    maxVoteBps: number;
    voteHours: number;
    maxTollBps: number;
    maxBountyPerUnit: Money;
  };
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
}

export interface RoadRules {
  /** Minutes one way at normal speed: region → city → minutes. */
  routes: Record<string, Record<string, number>>;
  vehicles: VehicleType[];
  maxVehicles: number;
  maxDeliveryMinutes: number;
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

export type ProposalKind = "toll" | "dividend" | "bounty" | "open" | "exclude" | "war";

export interface ProposalView {
  id: string;
  kind: ProposalKind;
  value: number;
  target: string | null;
  by: string;
  openedAt: number;
  closesAt: number;
  status: "open" | "passed" | "rejected";
  yes: number;
  no: number;
  /** The guild's whole voting weight (each member capped). */
  total: number;
  /** The merchant's own vote, if cast. */
  mine: boolean | null;
}

export interface MyGuildView {
  id: string;
  name: string;
  emblem: string;
  founder: string;
  open: boolean;
  tollBps: number;
  dividendBps: number;
  bountyPerUnit: Money;
  treasury: Money;
  caratsIssued: number;
  /** What a hundred carats are worth. */
  valueOf100: Money;
  carats: number;
  /** The merchant's carats at their value. */
  share: Money;
  members: { playerId: string; carats: number; weight: number; since: number; me: boolean }[];
  proposals: ProposalView[];
}

export interface GuildsView {
  opensAt: number;
  mine: MyGuildView | null;
  list: {
    id: string;
    name: string;
    emblem: string;
    members: number;
    open: boolean;
    treasury: Money;
    mine: boolean;
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
  /** A worksite of the guilds (the act it belongs to). */
  act?: number;
  /** Units delivered by each guild's members, by guild id. */
  byGuild?: Record<string, number>;
  winner?: string | null;
}

export interface PlayerView {
  serverTime: number;
  day: number;
  player: { id: string; region: string; joinedAt: number; upkeepDefaultUntil: number };
  cash: Money;
  escrow: Money;
  upkeepPerDay: Money;
  netWorth: { cash: Money; stock: Money; buildings: Money; guild?: Money; total: Money };
  standing: {
    rank: number | null;
    players: number;
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
    worksite: boolean;
  }[];
  /** The house's mastery: chosen, or how far it is (levels of all workshops). */
  mastery: { chosen: string | null; levels: number; unlocked: boolean };
  inventory: { resource: string; available: number; escrow: number }[];
  buildings: BuildingView[];
  market: MarketLine[];
  cityQuotes: { city: string; resource: string; unitPrice: Money }[];
  projects: Project[];
  /** Worksites of the acts already won: the winning guild's monument on the map. */
  monuments: { city: string; guild: string; act: number }[];
  contracts: ContractView[];
  guilds: GuildsView | null;
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
  /** Newest message of the guild's thread (null: no guild or no message). */
  guildLatestAt?: number | null;
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
  tier: string;
  award: string;
  /** Title held at the close and the renown it added (included in `renown`). */
  milestone: { name: string; renown: number };
  renown: number;
  passDays: number | "season";
  totalRenown: Renown;
  podium: { rank: number; pseudo: string | null; crest: CrestData | null; worth: Money }[];
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
  | "guild"
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
  netWorth: { cash: Money; stock: Money; buildings: Money; guild?: Money; total: Money };
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
  | { type: "foundGuild"; name: string; emblem: string; stake: number }
  | { type: "joinGuild"; guildId: string; stake: number }
  | { type: "investGuild"; amount: number }
  | { type: "leaveGuild" }
  | {
      type: "propose";
      proposal:
        | { kind: "toll" | "dividend" | "bounty" | "open"; value: number }
        | { kind: "exclude"; target: string };
    }
  | { type: "vote"; proposalId: string; yes: boolean }
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
  | { type: "dispatchDelivery"; orderId: string; vehicleId: string; escort: string }
  | { type: "reactToAmbush"; deliveryId: string }
  | { type: "postBand"; route: string; hours: number }
  | { type: "collectBooty"; bandId: string };

/** A message of the guild's thread. */
export interface GuildMessage {
  id: string;
  pseudo: string | null;
  body: string;
  at: number;
  mine: boolean;
}
