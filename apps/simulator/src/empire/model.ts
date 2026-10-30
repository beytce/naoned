import type { Deniers, EmpireHouse, EmpireSettings } from "@comptoirs/engine";

/**
 * The 24-month model simulator (CADRAGE-v3 § 13): houses aggregated hour by hour, living the
 * empire's formulas of `packages/engine/src/empire`. Not the game itself: a calibration model.
 * Its own parameters (the goods' rates, the bots' habits) are in `SimModel`, overridable by a
 * scenario; the game's are in the empire's settings.
 */

export const HOUR = 1;
export const DAY = 24;
export const MONTH = 30 * DAY;

/** How often a bot plays, and how it lives its absences. */
export type Activity = "assidu" | "median" | "occasional" | "absent";
/** What a bot leans to (profondeur.md § A): one trade, or all of them. */
export type Bent = "trader" | "miner" | "armourer" | "mixed";
/** Where a house's money comes from, to see which trades live. */
export type Trade = "orders" | "market" | "voyages" | "extraction" | "expeditions" | "terra";

export interface Workshop {
  region: string;
  good: string;
  level: number;
}

export interface Vehicle {
  type: string;
  /** Free again at this hour. */
  busyUntil: number;
}

export interface Voyage {
  house: number;
  vehicle: number;
  good: string;
  qty: number;
  to: string;
  arrivesAt: number;
  /** What the cargo cost, to read the voyage's margin. */
  cost: Deniers;
  /** The colleganza's investors: house index and stake (escrowed until the return). */
  stakes: { house: number; amount: Deniers }[];
  escort: number;
  /** A Muda convoy: it sells at the port's fair, whatever the market's depth. */
  muda?: boolean;
}

export interface Build {
  kind: "casa" | "workshop" | "newWorkshop" | "counter" | "vehicle" | "galley";
  /** The workshop's index, the counter's region, the vehicle's type… */
  target: string;
  endsAt: number;
}

export interface Research {
  code: string;
  level: number;
  endsAt: number;
}

export interface House {
  id: number;
  /** The month its cohort arrived. */
  cohort: number;
  joinedAt: number;
  activity: Activity;
  bent: Bent;
  cash: Deniers;
  favour: number;
  seals: number;
  plans: number;
  casa: number;
  /** The hour each Casa level was reached (index level − 1). */
  casaAt: number[];
  /** The first day its Power reached the median of its band (all its houses, whatever their age). */
  bandCaughtAt?: number;
  workshops: Workshop[];
  counters: Map<string, number>;
  vehicles: Vehicle[];
  galleys: number;
  modules: Record<string, number>;
  stock: Map<string, number>;
  builds: Build[];
  research: Research[];
  /** The last time its workshops were relaunched: they work 12 h past it, no more. */
  relaunchedAt: number;
  lastSession: number;
  /** Away until this hour (the absent profile). */
  awayUntil: number;
  /** Units of city orders it may still deliver today, by region (its private book). */
  bookLeft: Map<string, number>;
  income: Record<Trade, Deniers>;
  /** Paid out (constructions, research, wages, taxes, rations…), to read its net. */
  spent: Deniers;
  /** All the money made for it (sales, booty, its start), to read sinks against sources. */
  earned: Deniers;
  /** Its earned and spent at the last monthly sample. */
  sampled: { earned: Deniers; spent: Deniers };
  /** Receipts per day over the last `incomeDays`, for the « days of income » of a step. */
  recent: Deniers[];
  /** Sessions where something finishes within 24 h (an objective in sight). */
  sessions: number;
  sessionsInSight: number;
  /** Raw goods bought on the market, and how many of them a young house had made. */
  rawBought: number;
  rawBoughtFromYoung: number;
  /** Places won at the last incanto of the Muda, for its next departure. */
  mudaPasses: number;
  /** What the place cost, and the stakes that paid for it, carried into the convoy. */
  mudaPrice: Deniers;
  mudaStakes: { house: number; amount: Deniers }[];
  /** While young (Casa ≤ youngCasa): its receipts, and those of its raw goods sold in Venice. */
  youngEarned: Deniers;
  youngRawSold: Deniers;
  voyagesDone: number;
  /** What the cities paid it for orders, by mules or by voyages. */
  ordersValue: Deniers;
  voyageMargin: Deniers;
  expeditionsWon: number;
  expeditionsTried: number;
  terraValue: Deniers;
  /** The day of its last expedition: one a day. */
  expeditionDay: number;
  /** Its identity as the engine reads it: Arte, knowledge, staff, lineage (step 5). */
  ident: EmpireHouse;
  /** Its fine and exquisite goods, for the court, and the court's book of the day. */
  fine: Map<string, number>;
  courtDay: number;
  courtLeft: number;
}

export interface Deposit {
  id: number;
  region: string;
  good: string;
  stock: number;
}

/** One market of a region for one good: its pressure and the Dogana's stock, by who sold it. */
export interface Market {
  region: string;
  good: string;
  ref: Deniers;
  pressure: number;
  /** Units in the Dogana's hands, oldest first, with the seller's « young » mark. */
  lots: { qty: number; young: boolean }[];
  /** Units the Dogana bought today: it takes no more than the market's depth a day. */
  soldToday: number;
}

export interface World {
  s: EmpireSettings;
  m: SimModel;
  now: number;
  houses: House[];
  markets: Map<string, Market>;
  deposits: Deposit[];
  voyages: Voyage[];
  /** Units of the cities' common board left today, by « region:good ». */
  board: Map<string, number>;
  /** Plans for sale (from relics), at the model's price. */
  planPool: { house: number; qty: number }[];
  created: Deniers;
  destroyed: Deniers;
  createdBy: Record<string, Deniers>;
  destroyedBy: Record<string, Deniers>;
  /** Daily prices of each market, to read the news a house learns late. */
  history: Map<string, Deniers[]>;
  nextId: number;
  /** Each region's market depth today (units a day). */
  depth: Map<string, number>;
  /** For each Casa level, the share of active houses that reached it (bps): « le savoir circule ». */
  casaShare: number[];
  /** For each workshop level, the share of active houses with a workshop at it or above (bps). */
  workshopShare: number[];
  /** Colleganza stakes: all of them, and those of a large house in a young one's voyage. */
  colleganza: { total: Deniers; toYoung: Deniers };
  /**
   * The Muda: places sold and their price, convoys sailed, those with a colleganza, and the
   * stakes put in them (all, and those of a larger house than the traveller).
   */
  muda: {
    places: number;
    paid: Deniers;
    voyages: number;
    withColleganza: number;
    stakes: Deniers;
    fromLarger: Deniers;
  };
}

/** The model's own parameters (not the game's): goods' rates, bots' habits, the vehicles. */
export interface SimModel {
  startCapitalDucats: number;
  startWorkshops: { region: string; good: string }[];
  startVehicles: string[];
  /** Units an hour a level-1 workshop makes, raw then crafted. */
  rawPerHour: number;
  craftedPerHour: number;
  /** A good's own rate, units an hour at level 1 (the theme's recipes), over the two above. */
  rates: Record<string, number>;
  /** Crafted goods and their inputs, a unit each (a share of a unit when the theme says so). */
  recipes: Record<string, Record<string, number>>;
  /** The workshops' queue (CADRAGE-v3 § 4.1): they work this long past a relaunch. */
  queueHours: number;
  /** Units of the cities' common board a day, per active house with access. */
  boardPerActive: number;
  /** Share of the board kept for small houses (Casa ≤ smallCasa). */
  smallShareBps: number;
  smallCasa: number;
  /** Cities pay this much over the market for an order. */
  orderPremiumBps: number;
  /** Favour a city order of 100 ducats brings. */
  favourPer100Ducats: number;
  /** A market's depth a day: base, plus per active house with a counter in its region. */
  depthBase: number;
  depthPerActive: number;
  /** Units a day a foreign region's market takes of each good, whoever comes. */
  foreignDepth: number;
  /** …and this much more per active house of the world: all Venice trades there. */
  foreignDepthPerActive: number;
  /** Booty of a won expedition: this many ducats × its tier². */
  bootyPerTierDucats: number;
  /** A miner's teams, against another house's. */
  minerTeams: number;
  /** Rialto's tax on market sales and purchases. */
  marketTaxBps: number;
  vehicles: Record<
    string,
    { casa: number; capacity: number; costDucats: number; regions: string[]; speedBps: number }
  >;
  galleyCostDucats: number;
  galleyStrength: number;
  /** A house's raw goods count as young while its Casa is at most this. */
  youngCasa: number;
  /** What a plan sells for between houses, in ducats. */
  planPriceDucats: number;
  plansPerRelic: number;
  /** An expedition's victuals, in ducats a tier (destroyed). */
  victualsPerTierDucats: number;
  /** The Terraferma (CADRAGE-v3 § 8): who plays a week, its ration and its rewards. */
  terra: {
    playBps: Record<Activity, number>;
    rationDucats: number;
    favour: [number, number];
    seals: [number, number];
    favourValueDucats: number;
    sealValueDucats: number;
  };
  sessionsPerDay: Record<Activity, number[]>;
  /** The absent profile: a chance a week to leave, for 3 to 14 days. */
  leaveBpsPerWeek: number;
  /** Research order by bent. */
  researchOrder: Record<Bent, string[]>;
  /** Save for the next Casa first. */
  casaFirst: boolean;
  /** It saves the whole next Casa once it costs no more than this many days of income. */
  saveDays: number;
  /** Past this many days of income in its treasury, it gives to the Grandes Œuvres. */
  worksDays: number;
  /** Days over which a house reads its income (voyages pay in lumps: a month smooths them). */
  incomeDays: number;
  /** An investment that pays back within this many days comes before saving for the Casa. */
  paybackDays: number;
  /** A voyage carries at most this share of the port's depth a day. */
  voyageDepthShare: number;
  /** The share of a convoy's expected margin a house bids for a Muda place. */
  mudaBidBps: number;
}
