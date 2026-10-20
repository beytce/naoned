import { crieeRoom, currentCriee, dailyFor } from "./activity.js";
import { balesFor } from "./bales.js";
import { costForLevel, costPerOutput } from "./buildings.js";
import {
  MILAN,
  defenseBpsOf,
  garrisonAt,
  hireCost,
  hireLimit,
  hiredToday,
  landDef,
  landDistance,
  levyWaiting,
  mayTarget,
  reserveOf,
  seatFamily,
  worksAllowed,
  worksOf,
} from "./campaign.js";
import { quoteCitySale } from "./cities.js";
import type { Command } from "./commands.js";
import { contractsFor, rerollsOf } from "./contracts.js";
import { decreeTargetKind } from "./decrees.js";
import {
  deliveriesDoneToday,
  deliveriesOn,
  deliveryOrdersFor,
  travelMinutes,
  vehicleFree,
  vehiclesOf,
} from "./deliveries.js";
import { draw } from "./draw.js";
import { familiesOn, familiesOpenAt, familyCodes, membersOf, seatOf } from "./families.js";
import { houseMissionsFor } from "./house.js";
import { bestPrice, marketMakerQuotaLeft, maxOpenOrdersFor, openOrderCount } from "./market.js";
import { type MarketView, scale } from "./marketView.js";
import type { Deniers } from "./money.js";
import { isMudaGood } from "./muda.js";
import { freeBatches } from "./production.js";
import { openProjects } from "./projects.js";
import type { Rng } from "./rng.js";
import type { WorldSettings } from "./settings.js";
import { specialtyUnlocked } from "./specialties.js";
import {
  type Building,
  type DecreePick,
  MARKET_MAKER,
  type Vehicle,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  hasPass,
  seasonEnd,
} from "./state.js";
import { openTenders } from "./tenders.js";
import { terraOn } from "./terraWorld.js";
import {
  type TerraConfig,
  type TerraState,
  alliesOf,
  capOf,
  cellCost,
  cellsOf,
  hexNeighbors,
  isNation,
} from "./terraferma.js";
import { findRegion, recipesFor } from "./theme.js";
import { turnoverOf } from "./turnover.js";
import { isUnlocked } from "./unlocks.js";

/**
 * Computer-run merchants. They play through the same commands as people, with the same limits,
 * so they move no money or goods outside the journals. The simulator calibrates the economy with
 * them; the server lets a few liven up a world while it has few players.
 */

/** Bots needed to bring the world to its target population, given the active human players. */
export function botsWanted(settings: WorldSettings, activeHumans: number): number {
  return Math.max(0, settings.bots.population - activeHumans);
}

export type ProfileName = "producer" | "artisan" | "builder" | "speculator" | "casual";

export interface Profile {
  name: ProfileName;
  sessionsPerDay: [number, number];
  churnPerDay: number;
  /** Building types the bot invests in. `$raw` and `$craft` are the region's own chain. */
  focus: string[];
  /** Inputs the bot buys on the market to keep its buildings busy. */
  buysInputs: boolean;
  speculates: boolean;
  /** Vehicles the bot is willing to own. */
  vehicles: number;
  /** Share of the day's lances the bot engages for ducats, when its cash allows (0 to 1). */
  warlike: number;
}

export const PROFILES: Record<ProfileName, Profile> = {
  producer: {
    name: "producer",
    warlike: 0.25,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$raw", "$craft"],
    buysInputs: true,
    speculates: false,
  },
  artisan: {
    name: "artisan",
    warlike: 0.25,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["bakery", "mill", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  builder: {
    name: "builder",
    warlike: 0.5,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$craft", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  speculator: {
    name: "speculator",
    warlike: 0.75,
    vehicles: 2,
    sessionsPerDay: [3, 5],
    churnPerDay: 0.01,
    focus: ["$raw"],
    buysInputs: false,
    speculates: true,
  },
  casual: {
    name: "casual",
    warlike: 0,
    vehicles: 1,
    sessionsPerDay: [1, 1],
    churnPerDay: 0.04,
    focus: ["$craft", "$raw"],
    buysInputs: true,
    speculates: false,
  },
};

const RAW_BUILDING: Record<string, string> = {
  wheat: "farm",
  clay: "clay_pit",
  wood: "lumber_camp",
};
const CRAFT_BUILDING: Record<string, string> = {
  wheat: "mill",
  clay: "brickworks",
  wood: "sawmill",
};
const MAX_PER_TYPE = 3;
const CITY_GOODS = ["bread", "bricks", "planks", "spices", "silk", "salt", "wine", "furs", "cloth"];
const MATERIALS = ["bread", "bricks", "planks"];
const HOUR = 3_600_000;
/** How long a merchant stays at the screen after a session starts. */
const ONLINE_MS = 30 * 60_000;
const DAY = 24 * HOUR;

export interface Session {
  ctx: WorldContext;
  state(): WorldState;
  now: number;
  market: MarketView;
  rng: Rng;
  /** Applies a command; returns false if the engine refused it. */
  act(cmd: Command): boolean;
}

/** How a bot behaves in a live world, next to people. */
export interface BotOptions {
  /**
   * Buy from players before the market maker, and never sell to it: surplus waits on the book
   * for people. (Each merchant's own quota keeps it from emptying the market maker.)
   */
  spareMarketMaker?: boolean;
  /** Keep only half of the materials saved for its next construction; the rest goes on sale. */
  generous?: boolean;
  /** Whether a merchant is a person: bots join the family with the fewest people. */
  isHuman?: (playerId: string) => boolean;
}

export class Bot {
  churned = false;
  sessions = 0;
  /** A session keeps the merchant at the screen for a while: they can fight back meanwhile. */
  onlineUntil = 0;
  /** Last limit price used per side and resource, to walk prices when orders do not fill. */
  private lastPrice = new Map<string, Deniers>();
  /** Offers withdrawn after a day without (full) taker, by "side:resource": the price must move. */
  private unsold = new Set<string>();
  /** Last week it voted its family's programme. */
  private votedWeek = -1;

  constructor(
    readonly id: string,
    readonly profile: Profile,
    readonly region: string,
    readonly joinAt: number,
    readonly options: BotOptions = {},
  ) {}

  /** Session start times for one day, between 07:00 and 23:00. */
  planDay(rng: Rng, dayStart: number): number[] {
    const [min, max] = this.profile.sessionsPerDay;
    const n = rng.int(min, max);
    const times: number[] = [];
    for (let i = 0; i < n; i++)
      times.push(dayStart + 7 * HOUR + Math.floor(rng.next() * 16 * HOUR));
    return times.sort((a, b) => a - b);
  }

  private resolve(type: string): string {
    const raw = findRegion(this.ctxTheme, this.region)?.bonusResource ?? "wheat";
    return type
      .replace("$raw", RAW_BUILDING[raw] ?? "farm")
      .replace("$craft", CRAFT_BUILDING[raw] ?? "mill");
  }

  private ctxTheme!: WorldContext["theme"];

  /**
   * The mastery of the season, once the house has grown enough: by play style, and one house in
   * four trades with the Levant.
   */
  private chooseMastery(s: Session): void {
    const state = s.state();
    if (state.players[this.id]?.specialty || !specialtyUnlocked(s.ctx, state, this.id)) return;
    const options = Object.keys(s.ctx.settings.specialties.options);
    let hash = 0;
    for (const c of this.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const byProfile: Record<string, string> = {
      producer: "master",
      artisan: "master",
      builder: "carter",
      speculator: "trader",
      casual: "master",
    };
    const wanted = hash % 4 === 0 ? "levant" : (byProfile[this.profile.name] ?? "master");
    const specialty = options.includes(wanted) ? wanted : options[0];
    if (specialty) s.act({ type: "chooseSpecialty", playerId: this.id, specialty });
  }

  play(s: Session): void {
    this.ctxTheme = s.ctx.theme;
    this.sessions++;
    this.onlineUntil = s.now + ONLINE_MS;
    this.openBales(s);
    this.refreshOrders(s);
    for (const b of this.buildings(s)) {
      if (b.job) s.act({ type: "collect", playerId: this.id, buildingId: b.id });
    }
    this.feed(s);
    this.doContracts(s);
    this.serveFamily(s);
    this.deliverProjects(s);
    this.tenders(s);
    this.partners(s);
    if (deliveriesOn(s.ctx)) this.garage(s, this.deliver(s));
    else {
      this.sellToCriee(s);
      this.sellToCities(s);
    }
    this.invest(s);
    this.chooseMastery(s);
    this.runProduction(s);
    if (this.profile.speculates) this.speculate(s);
    this.sellSurplus(s);
    this.claimDaily(s);
    this.claimHouseMissions(s);
    this.playTerra(s);
  }

  /**
   * The Terraferma, when it is live: set down, keep an ally, spend spare ducats on a rocca, a
   * borgo or the cap, then fronts at free land, else at the thinnest neighbour, else at Milan,
   * as many as the troops allow (all in the session that sets it down).
   */
  private playTerra(s: Session): void {
    const cfg = terraOn(s.ctx);
    const map = s.state().terra?.map;
    if (!cfg || !map || map.closed) return;
    const id = this.id;
    const act = (cmd: Record<string, unknown>) =>
      s.act({ playerId: id, ...cmd } as unknown as Command);
    const me = map.players[id];
    if (me?.eliminatedAt !== undefined) return;
    if (!me && !this.setDown(s, cfg, map, act)) return;
    this.terraPlay(s, cfg, act);
  }

  /** Sets down on a free inner cell, else on the edge of Milan's land; whether it did. */
  private setDown(
    s: Session,
    cfg: TerraConfig,
    map: TerraState,
    act: (cmd: Record<string, unknown>) => boolean,
  ): boolean {
    // Too late: the week's game has begun without it.
    const end = map.startAt + cfg.start.placementHours * 3_600_000;
    if (cfg.start.placementHours > 0 && s.now >= end) return false;
    const inner = (i: number) =>
      hexNeighbors(map.map, i).filter((n) => map.map.land[n]).length === 6;
    const free = map.owner
      .map((o, i) => (o === null && map.map.land[i] && inner(i) ? i : -1))
      .filter((i) => i >= 0);
    const start = free.length > 0 ? Math.floor(s.rng.next() * free.length) : 0;
    for (let k = 0; k < Math.min(40, free.length); k++) {
      if (act({ type: "terraPlace", cell: free[(start + k) % free.length] })) return true;
    }
    // No free land: the edge of Milan's.
    const edge = map.owner.findIndex(
      (o, i) =>
        o === MILAN &&
        hexNeighbors(map.map, i).some((n) => map.map.land[n] && map.owner[n] !== MILAN),
    );
    return edge >= 0 && act({ type: "terraPlace", cell: edge });
  }

  /** The decree, an ally, spare ducats spent, then the fronts. */
  private terraPlay(
    s: Session,
    cfg: TerraConfig,
    act: (cmd: Record<string, unknown>) => boolean,
  ): void {
    const id = this.id;
    const map = s.state().terra?.map;
    if (!map) return;
    if (!map.programme?.[id]) {
      const decrees = cfg.close.decrees;
      const code = decrees[Math.floor(s.rng.next() * decrees.length)];
      if (code) act({ type: "terraDecree", code });
    }
    for (const r of (map.requests ?? []).filter((x) => x.to === id))
      act({ type: "terraAccept", from: r.from });
    const mine = cellsOf(map, id);
    const allies = alliesOf(map, id);
    if (allies.length === 0 && !(map.requests ?? []).some((r) => r.from === id)) {
      const next = new Set<string>();
      for (const c of mine) {
        for (const n of hexNeighbors(map.map, c)) {
          const o = map.owner[n];
          if (o && o !== id && !isNation(o)) next.add(o);
        }
      }
      const pick = [...next].sort()[0];
      if (pick) act({ type: "terraAlly", other: pick });
    }
    // Spare ducats only: four times the price in hand.
    const spare = (price: bigint) => this.cash(s) >= price * 4n;
    const border = mine.find((c) =>
      hexNeighbors(map.map, c).some((n) => {
        const o = map.owner[n];
        return !!o && o !== id && !isNation(o) && !allies.includes(o);
      }),
    );
    if (border !== undefined && spare(cfg.buildings.rocca.price))
      act({ type: "terraBuild", cell: border, kind: "rocca" });
    const inner = mine.find((c) => !map.buildings?.[c]);
    const borgo = cfg.buildings.borgo;
    if (inner !== undefined && borgo && spare(borgo.price))
      act({ type: "terraBuild", cell: inner, kind: "borgo" });
    if (spare(cfg.capRaise.price)) act({ type: "terraRaise" });
    // Fronts, one after another while the troops are worth it.
    for (let k = 0; k < cfg.fronts.max; k++) {
      if (!this.launchFront(s, cfg, allies, act)) return;
    }
  }

  /**
   * A front at free land, else at the thinnest neighbour, else at Milan; with a front already on
   * free land, the thinnest neighbour first. Whether it left.
   */
  private launchFront(
    s: Session,
    cfg: TerraConfig,
    allies: string[],
    act: (cmd: Record<string, unknown>) => boolean,
  ): boolean {
    const id = this.id;
    const after = s.state().terra?.map;
    const self = after?.players[id];
    if (!after || !self || self.troops * 10 < capOf(after, cfg, id) * 3) return false;
    const mine = after.fronts.filter((f) => f.owner === id);
    if (mine.length >= cfg.fronts.max) return false;
    // A cell already aimed at is left to the front on its way.
    const aimed = new Set(mine.map((f) => f.aim));
    const targets = new Map<string | null, number[]>();
    for (let i = 0; i < after.owner.length; i++) {
      const o = after.owner[i] ?? null;
      if (o === id || !after.map.land[i] || aimed.has(i)) continue;
      if (!hexNeighbors(after.map, i).some((n) => after.owner[n] === id)) continue;
      targets.set(o, [...(targets.get(o) ?? []), i]);
    }
    // Free land takes several fronts; a merchant or Milan one at a time. Once a front holds the
    // free land, the next goes at a rival first: the war starts on the first day, not the fourth.
    const attacked = new Set<string | null>(mine.map((f) => f.against).filter((o) => o !== null));
    const density = (o: string) =>
      (after.players[o]?.troops ?? 0) / Math.max(1, cellsOf(after, o).length);
    const onFree = mine.some((f) => f.against === null);
    const rank = (o: string | null) => (o === null ? (onFree ? 1.5 : 0) : isNation(o) ? 2 : 1);
    const order = [...targets.keys()]
      .filter((o) => !attacked.has(o) && (o === null || isNation(o) || !allies.includes(o)))
      .filter(
        (o) =>
          o === null ||
          isNation(o) ||
          (self.protectedUntil <= s.now && (after.players[o]?.protectedUntil ?? 0) <= s.now),
      )
      .sort((a, b) => rank(a) - rank(b) || (a && b ? density(a) - density(b) : 0));
    const share = this.profile.name === "casual" ? 7_000 : 5_000;
    // A rival too strong for the share sent: the next one in the order.
    for (const against of order) {
      const aim = (targets.get(against) ?? []).sort(
        (a, b) => cellCost(after, cfg, a) - cellCost(after, cfg, b) || a - b,
      )[0];
      if (aim !== undefined && act({ type: "terraFront", aim, shareBps: share })) return true;
    }
    return false;
  }

  /**
   * Another vehicle when the board holds more orders the bot could load than it has vehicles
   * free (called after the deliveries of the session).
   */
  private garage(s: Session, waiting: number): void {
    const { deliveries } = s.ctx.settings;
    const mine = vehiclesOf(s.state(), this.id);
    // Enough vehicles: the purse goes into a bigger, faster one.
    if (waiting === 0 || mine.length >= Math.min(this.profile.vehicles, deliveries.maxVehicles)) {
      this.upgradeOne(s, mine);
      return;
    }
    const forSale = deliveries.forSale ?? Object.keys(deliveries.vehicles);
    const type = forSale.includes("cart") ? "cart" : forSale[0];
    const def = type ? deliveries.vehicles[type] : undefined;
    if (!type || !def || this.cash(s) < def.costDucats * 3n) return;
    for (const [res, qty] of Object.entries(def.costMaterials)) {
      const missing = qty - this.available(s, res);
      if (missing > 0) this.buy(s, res, missing, 1.15);
    }
    if (s.act({ type: "buyVehicle", playerId: this.id, vehicleType: type })) this.deliver(s);
  }

  /** The smallest vehicle at home goes up a step, if the purse allows (three times its cost). */
  private upgradeOne(s: Session, mine: Vehicle[]): void {
    const types = s.ctx.settings.deliveries.vehicles;
    const candidate = mine
      .filter((v) => vehicleFree(v, s.now) && types[v.type]?.upgrade)
      .sort((a, b) => (types[a.type]?.capacity ?? 0) - (types[b.type]?.capacity ?? 0))[0];
    const step = candidate ? types[candidate.type]?.upgrade : undefined;
    if (!candidate || !step || this.cash(s) < step.costDucats * 3n) return;
    s.act({ type: "upgradeVehicle", playerId: this.id, vehicleId: candidate.id });
  }

  /**
   * The board: the best-paid orders the bot can load first, each on the free vehicle that fits
   * it best. Doge's and family orders are bought for if goods are missing.
   */
  /** Returns how many orders the bot could have loaded but had no vehicle for. */
  private deliver(s: Session): number {
    const state = s.state();
    const player = state.players[this.id];
    if (!player) return 0;
    let waiting = 0;
    const day = dayIndex(s.ctx, s.now);
    const done = deliveriesDoneToday(state, this.id, day);
    const orders = deliveryOrdersFor(s.ctx, state, this.id, day)
      .filter(
        (o) => !o.takenBy && !done.includes(o.id) && o.opensAt <= s.now && s.now < o.expiresAt,
      )
      .sort((a, b) => {
        const va = a.unitPrice * BigInt(a.quantity);
        const vb = b.unitPrice * BigInt(b.quantity);
        return va === vb ? a.id.localeCompare(b.id) : va > vb ? -1 : 1;
      });
    const types = s.ctx.settings.deliveries.vehicles;
    // What the bot keeps aside per resource (costly to work out): once per session.
    const reserved = new Map<string, number>();
    const reserveOf = (r: string) => {
      if (!reserved.has(r)) reserved.set(r, this.reserve(s, r));
      return reserved.get(r) ?? 0;
    };
    const perLoad = s.ctx.settings.deliveries.maxOrdersPerLoad;
    const used = new Set<string>();
    for (const o of orders) {
      if (used.has(o.id)) continue;
      const vehicles = vehiclesOf(s.state(), this.id).filter((v) => vehicleFree(v, s.now));
      // No vehicle free and one order already waiting: enough to decide on another vehicle.
      if (vehicles.length === 0 && waiting > 0) break;
      // One order a trip: the smallest vehicle that holds it; several: the largest, to fill it.
      const free = vehicles
        .filter((v) => (types[v.type]?.capacity ?? 0) >= o.quantity)
        .sort((a, b) =>
          perLoad > 1
            ? (types[b.type]?.capacity ?? 0) - (types[a.type]?.capacity ?? 0)
            : (types[a.type]?.capacity ?? 0) - (types[b.type]?.capacity ?? 0),
        );
      const vehicle = free[0];
      if (!vehicle) {
        const spareNow = this.available(s, o.resource) - reserveOf(o.resource);
        if (spareNow >= o.quantity && o.unitPrice >= (this.bestBid(s, o.resource) ?? 0n)) waiting++;
        continue;
      }
      const home = travelMinutes(s.ctx, player.region, o.city, vehicle.type);
      if (home === undefined) continue;
      // The order must beat what the market pays.
      const bid = this.bestBid(s, o.resource) ?? 0n;
      if (o.unitPrice < bid) continue;
      const spare = () => this.available(s, o.resource) - reserveOf(o.resource);
      if (o.kind === "doge" || o.kind === "family") {
        const missing = o.quantity - spare();
        if (missing > 0) this.buy(s, o.resource, missing, 1.15);
      } else if (isMudaGood(s.ctx, o.resource) && spare() < o.quantity) {
        // Goods from overseas: bought at the Muda when the order pays a tenth more.
        const ask = this.bestAsk(s, o.resource);
        if (ask !== undefined && scale(ask, 1.1) <= o.unitPrice) {
          this.buy(s, o.resource, o.quantity - spare(), 1.6);
        }
      }
      if (spare() < o.quantity) continue;
      // Fill the vehicle with the best other orders for the same city the stock covers.
      const load = [o];
      const room = () =>
        (types[vehicle.type]?.capacity ?? 0) - load.reduce((n, x) => n + x.quantity, 0);
      const loadedOf = (r: string) =>
        load.filter((x) => x.resource === r).reduce((n, x) => n + x.quantity, 0);
      for (const x of orders) {
        if (load.length >= perLoad) break;
        if (used.has(x.id) || x.id === o.id || x.city !== o.city || x.quantity > room()) continue;
        if (x.unitPrice < (this.bestBid(s, x.resource) ?? 0n)) continue;
        if (
          this.available(s, x.resource) - reserveOf(x.resource) - loadedOf(x.resource) <
          x.quantity
        )
          continue;
        load.push(x);
      }
      const sent = s.act({
        type: "dispatchDelivery",
        playerId: this.id,
        orderId: o.id,
        ...(load.length > 1 ? { orderIds: load.map((x) => x.id) } : {}),
        vehicleId: vehicle.id,
      });
      if (sent) for (const x of load) used.add(x.id);
    }
    return waiting;
  }

  /** A Criée under way: sell what is spare (rations and construction stock are kept). */
  private sellToCriee(s: Session): void {
    const criee = currentCriee(s.ctx, s.now);
    if (!criee) return;
    const room = crieeRoom(s.ctx, s.state(), criee, this.id, s.now);
    const spare = this.available(s, criee.resource) - this.reserve(s, criee.resource);
    const qty = Math.min(spare, room.mine, room.total);
    if (qty > 0) s.act({ type: "sellToCriee", playerId: this.id, quantity: qty });
  }

  /** Tasks of the day already done along the way: collect their reward. */
  private claimDaily(s: Session): void {
    for (const t of dailyFor(s.ctx, s.state(), this.id, s.now).tasks) {
      if (t.done && !t.claimed) s.act({ type: "claimDaily", playerId: this.id, taskId: t.id });
    }
  }

  /** The house's missions done: their Influence, as a merchant would claim it. */
  private claimHouseMissions(s: Session): void {
    for (const m of houseMissionsFor(s.ctx, s.state(), this.id, s.now).missions) {
      if (m.done && !m.claimed) {
        s.act({ type: "claimHouseMission", playerId: this.id, missionId: m.id });
      }
    }
  }

  /** Faraj's bales waiting: opened first, so their goods serve in this session. */
  private openBales(s: Session): void {
    const waiting = balesFor(s.ctx, s.state(), this.id, s.now)?.available ?? 0;
    for (let i = 0; i < waiting; i++) {
      if (!s.act({ type: "openBale", playerId: this.id })) break;
    }
  }

  private buildings(s: Session): Building[] {
    // Raw producers first, so their output can feed the next buildings in the same session.
    const order = (b: Building) =>
      Object.keys(recipesFor(s.ctx.theme, b.type)[0]?.inputs ?? {}).length;
    return Object.values(s.state().buildings)
      .filter((b) => b.playerId === this.id)
      .sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
  }

  private cash(s: Session): Deniers {
    return s.state().accounts[cashAccount(this.id)] ?? 0n;
  }

  private available(s: Session, resource: string): number {
    return s.state().inventories[this.id]?.[resource]?.available ?? 0;
  }

  private myOrders(s: Session) {
    return Object.values(s.state().orders).filter((o) => o.playerId === this.id);
  }

  /** Cancels orders older than a day; the next placement walks the price. */
  private refreshOrders(s: Session): void {
    for (const o of this.myOrders(s)) {
      if (s.now - o.createdAt >= DAY) {
        s.act({ type: "cancelOrder", playerId: this.id, orderId: o.id });
        this.unsold.add(`${o.side}:${o.resource}`);
      }
    }
  }

  /** Resources this bot consumes as inputs, with the quantity needed to fill its queues. */
  private inputNeeds(s: Session): Map<string, number> {
    const needs = new Map<string, number>();
    for (const b of this.buildings(s)) {
      const recipe = recipesFor(s.ctx.theme, b.type)[0];
      if (!recipe) continue;
      const batches = Math.floor(
        (s.ctx.settings.productionQueueMaxHours * 60) / recipe.durationMinutes,
      );
      for (const [res, qty] of Object.entries(recipe.inputs)) {
        needs.set(res, (needs.get(res) ?? 0) + (qty ?? 0) * b.level * batches);
      }
    }
    return needs;
  }

  private runProduction(s: Session): void {
    for (const b of this.buildings(s)) {
      const recipe = recipesFor(s.ctx.theme, b.type)[0];
      if (!recipe) continue;
      const room = freeBatches(s.ctx, b, recipe.code, s.now);
      if (room <= 0) continue;
      // A glut: the goods sell under 90 % of their reference and the stock already holds a few
      // batches beyond what is kept aside. The workshop rests until prices recover.
      const glut = Object.entries(recipe.outputs).some(
        ([res, perBatch]) =>
          s.market.fair(res) < scale(s.market.reference(res), 0.9) &&
          this.available(s, res) - this.reserve(s, res) > (perBatch ?? 0) * b.level * 4,
      );
      if (glut) continue;
      let batches = room;
      for (const [res, perBatch] of Object.entries(recipe.inputs)) {
        const need = (perBatch ?? 0) * b.level;
        if (need === 0) continue;
        if (this.profile.buysInputs && this.available(s, res) < need * room) {
          this.buy(s, res, need * room - this.available(s, res), 1.1);
        }
        batches = Math.min(batches, Math.floor(this.available(s, res) / need));
      }
      if (batches > 0) {
        s.act({
          type: "startProduction",
          playerId: this.id,
          buildingId: b.id,
          recipe: recipe.code,
          batches,
        });
      }
    }
  }

  /**
   * Company orders: its own share of each (the order's need per merchant), once per order, so
   * that people find room in it too.
   */
  private deliverProjects(s: Session): void {
    const share = s.ctx.settings.projects.needsPerPlayer;
    for (const p of openProjects(s.state().projects, s.now)) {
      if (p.by?.[this.id] !== undefined) continue;
      for (const res of MATERIALS) {
        const room = Math.min(share[res] ?? 0, (p.needs[res] ?? 0) - (p.delivered[res] ?? 0));
        const have = this.available(s, res) - this.reserve(s, res);
        const price = p.unitPrice[res] ?? 0n;
        const bid = this.bestBid(s, res) ?? 0n;
        if (room > 0 && have > 0 && price >= bid) {
          s.act({
            type: "deliverToProject",
            playerId: this.id,
            projectId: p.id,
            resource: res,
            quantity: Math.min(room, have),
          });
        }
      }
    }
  }

  /**
   * Deals between merchants: fills a commission its spare stock covers at 90 % of the reference or
   * more, and takes a colleganza on offer (the capital works for it until the term).
   */
  private partners(s: Session): void {
    const state = s.state();
    for (const c of Object.values(state.commissions ?? {})) {
      if (c.filledBy || c.closed || s.now >= c.expiresAt || c.buyer === this.id) continue;
      if (c.to && c.to !== this.id) continue;
      const spare = this.available(s, c.resource) - this.reserve(s, c.resource);
      const ref = s.ctx.settings.referencePrices[c.resource] ?? 0n;
      if (spare >= c.quantity && c.unitPrice * 10n >= ref * 9n)
        s.act({ type: "fillCommission", playerId: this.id, commissionId: c.id });
    }
    for (const g of Object.values(state.colleganze ?? {})) {
      if (g.merchant || g.settled || g.investor === this.id) continue;
      if (g.to && g.to !== this.id) continue;
      s.act({ type: "acceptColleganza", playerId: this.id, colleganzaId: g.id });
      break;
    }
  }

  /**
   * The Doge's tenders: a bid on a good it has spare, at 95 to 125 % of the reference (drawn per
   * merchant and tender), for half its spare stock at most; then delivers what it won.
   */
  private tenders(s: Session): void {
    const state = s.state();
    for (const t of Object.values(state.tenders ?? {})) {
      const won = t.awarded?.[this.id];
      if (won && !won.delivered && !t.settled && this.available(s, t.resource) >= won.quantity)
        s.act({ type: "tenderDeliver", playerId: this.id, tenderId: t.id });
    }
    for (const t of openTenders(state, s.now)) {
      if (t.bids[this.id]) continue;
      const spare = this.available(s, t.resource) - this.reserve(s, t.resource);
      const quantity = Math.min(t.quantity, Math.floor(spare / 2));
      if (quantity <= 0) continue;
      const bps = 9_500 + (draw(s.ctx, `bid:${this.id}:${t.id}`) % 3_001);
      const ref = s.ctx.settings.referencePrices[t.resource] ?? 0n;
      const price = (ref * BigInt(bps)) / 10_000n;
      if (price <= 0n) continue;
      s.act({
        type: "tenderBid",
        playerId: this.id,
        tenderId: t.id,
        price: price > t.ceiling ? t.ceiling : price,
        quantity,
      });
    }
  }

  /** Sells finished goods to the city paying best, while it beats the market and 70 % of reference. */
  private sellToCities(s: Session): void {
    for (const resource of CITY_GOODS) {
      const floor = scale(s.market.reference(resource), 0.7);
      for (let guard = 0; guard < 50; guard++) {
        const qty = Math.min(20, this.available(s, resource) - this.reserve(s, resource));
        if (qty <= 0) break;
        let best: { city: string; total: Deniers } | undefined;
        for (const city of Object.keys(s.ctx.settings.cities)) {
          const total = quoteCitySale(s.ctx, s.state(), city, resource, qty, s.now);
          if (total !== undefined && (!best || total > best.total)) best = { city, total };
        }
        const bid = this.bestBid(s, resource) ?? 0n;
        if (!best || best.total < floor * BigInt(qty) || best.total < bid * BigInt(qty)) break;
        const sold = s.act({
          type: "sellToCity",
          playerId: this.id,
          city: best.city,
          resource,
          quantity: qty,
        });
        if (!sold) break;
      }
    }
  }

  /** Bread eaten per day by this bot's workers. */
  private rationsPerDay(s: Session): number {
    const levels = this.buildings(s)
      .filter((b) => b.type !== "palazzo")
      .reduce((n, b) => n + b.level, 0);
    return levels * s.ctx.settings.rations.perLevelPerDay;
  }

  /** Stock kept back: next construction, three days of rations. */
  private reserve(s: Session, resource: string): number {
    const food = resource === s.ctx.settings.rations.resource ? this.rationsPerDay(s) * 3 : 0;
    const materials = this.materialsReserve(s, resource);
    return (this.options.generous ? 0 : materials) + food;
  }

  /** Workers must eat: keep two to three days of bread, buying it if needed. */
  private feed(s: Session): void {
    const food = s.ctx.settings.rations.resource;
    const target = this.rationsPerDay(s) * 3;
    const missing = target - this.available(s, food);
    if (missing > 0) this.buy(s, food, missing, 1.3);
  }

  /** The Doge's orders: fulfil those the bot can cover from its spare stock. */
  private doContracts(s: Session): void {
    const day = dayIndex(s.ctx, s.now);
    const done = s.state().contractsDone?.[this.id];
    const doneIds = done && done.day === day ? done.ids : [];
    // With the Pass: an order the bot cannot cover is swapped for another, once a day.
    if (hasPass(s.ctx, s.state(), this.id, s.now) && !deliveriesOn(s.ctx)) {
      const today = contractsFor(s.ctx, this.id, day, rerollsOf(s.state(), this.id, day));
      const stuck = today.find(
        (c) =>
          !doneIds.includes(c.id) &&
          this.available(s, c.resource) - this.reserve(s, c.resource) < c.quantity,
      );
      if (stuck) s.act({ type: "rerollContract", playerId: this.id, contractId: stuck.id });
    }
    const byRoad = deliveriesOn(s.ctx);
    for (const c of contractsFor(s.ctx, this.id, day, rerollsOf(s.state(), this.id, day))) {
      if (doneIds.includes(c.id)) continue;
      if (byRoad) continue;
      if (this.available(s, c.resource) - this.reserve(s, c.resource) >= c.quantity) {
        s.act({ type: "fulfillContract", playerId: this.id, contractId: c.id });
      }
    }
  }

  /**
   * The family and the week's campaign: swear allegiance to the family with the fewest people (then
   * the fewest merchants), collect the levy, engage lances by temperament when the cash allows,
   * defend the lands under threat, attack the cheapest land worth taking, and vote a programme.
   */
  private serveFamily(s: Session): void {
    if (!familiesOn(s.ctx)) return;
    let state = s.state();
    let family = state.families?.memberOf[this.id];
    if (!family) {
      if (s.now < familiesOpenAt(s.ctx, state, this.id)) return;
      const isHuman = this.options.isHuman;
      const rank = familyCodes(s.ctx).map((f) => {
        const members = membersOf(state, f);
        return { f, people: isHuman ? members.filter(isHuman).length : 0, all: members.length };
      });
      rank.sort((a, b) => a.people - b.people || a.all - b.all || (a.f < b.f ? -1 : 1));
      const chosen = rank[0]?.f;
      if (!chosen || !s.act({ type: "joinFamily", playerId: this.id, family: chosen })) return;
      family = chosen;
    }
    if (levyWaiting(s.ctx, s.state(), this.id, s.now) > 0)
      s.act({ type: "collectLevy", playerId: this.id });
    this.hireLances(s);
    this.campaign(s, family);
    this.fortify(s, family);
    state = s.state();
    const week = state.campaign?.week ?? -1;
    if (this.votedWeek !== week && this.profile.name !== "casual") {
      this.votedWeek = week;
      const picks = this.programme(s);
      if (picks.length > 0) s.act({ type: "voteProgramme", playerId: this.id, picks });
    }
  }

  /** Lances for ducats: a share of the day's limit by temperament, keeping a third of the start. */
  private hireLances(s: Session): void {
    if (this.profile.warlike <= 0) return;
    const already = hiredToday(s.ctx, s.state(), this.id, s.now);
    const wanted = Math.floor(hireLimit(s.ctx) * this.profile.warlike) - already;
    if (wanted <= 0) return;
    const cost = hireCost(s.ctx, already, wanted);
    if (cost === undefined) return;
    if (this.cash(s) - cost < s.ctx.settings.startingCapital / 3n) return;
    s.act({ type: "hireLances", playerId: this.id, count: wanted });
  }

  /** Defends what is threatened, then attacks the cheapest land worth taking. */
  private campaign(s: Session, family: string): void {
    const kinds = s.ctx.settings.campaign?.kinds ?? {};
    const defense = (code: string) => defenseBpsOf(s.ctx, s.state(), code, s.now);
    const glory = (code: string) => kinds[landDef(s.ctx, code)?.kind ?? ""]?.glory ?? 0;
    for (let round = 0; round < 4; round++) {
      const state = s.state();
      const c = state.campaign;
      const reserve = reserveOf(state, this.id, s.now);
      if (!c || reserve <= 0) return;
      const marches = Object.values(c.marches);
      const incoming = (code: string, own: boolean) =>
        marches
          .filter((m) => m.target === code && (m.family === family) === own)
          .reduce((n, m) => n + m.npc + m.stacks.reduce((a, x) => a + x.count, 0), 0);
      // 1. A land of the family under attack, not held well enough: reinforce it.
      const threatened = Object.entries(c.lands)
        .filter(([code, l]) => l.holder === family && incoming(code, false) > 0)
        .map(([code, l]) => {
          const held = Math.floor(
            ((garrisonAt(l, s.now) + incoming(code, true)) * defense(code)) / 10_000,
          );
          return { code, missing: incoming(code, false) - held + 1 };
        })
        .filter((t) => t.missing > 0)
        .sort((a, b) => b.missing - a.missing);
      const threat = threatened[0];
      if (threat) {
        const n = Math.min(reserve, threat.missing);
        if (!s.act({ type: "sendMarch", playerId: this.id, land: threat.code, lances: n })) return;
        continue;
      }
      // 2. A land next to the family's, worth its cost: attack it, or join the assault under way.
      const targets = Object.entries(c.lands)
        .filter(([code, l]) => l.holder !== family && mayTarget(s.ctx, state, family, code))
        .map(([code, l]) => {
          const needed =
            Math.ceil((garrisonAt(l, s.now) * defense(code)) / 10_000) + 1 - incoming(code, true);
          return {
            code,
            needed,
            worth: (glory(code) * 1_000) / Math.max(1, needed),
            milan: l.holder === MILAN,
          };
        })
        .filter((t) => t.needed > 0)
        .sort((a, b) => b.worth - a.worth || (a.code < b.code ? -1 : 1));
      const target = targets.find((t) => t.needed <= reserve);
      if (target) {
        const n = Math.min(reserve, Math.ceil(target.needed * 1.1));
        if (!s.act({ type: "sendMarch", playerId: this.id, land: target.code, lances: n })) return;
        continue;
      }
      // 3. Too strong alone: join an assault of the family, or open one for the others to join.
      const assault = marches
        .filter((m) => m.family === family && c.lands[m.target]?.holder !== family)
        .sort((a, b) => a.arriveAt - b.arriveAt)[0];
      if (assault) {
        s.act({ type: "joinMarch", playerId: this.id, marchId: assault.id, lances: reserve });
        return;
      }
      const best = targets[0];
      if (best && reserve >= best.needed / 3) {
        s.act({ type: "sendMarch", playerId: this.id, land: best.code, lances: reserve });
        return;
      }
      // 4. Nothing to take: hold the family's weakest land on the border.
      const border = Object.entries(c.lands)
        .filter(
          ([code, l]) =>
            l.holder === family &&
            !landDef(s.ctx, code)?.neighbors.every((n) => c.lands[n]?.holder === family) &&
            mayTarget(s.ctx, state, family, code),
        )
        .sort((a, b) => garrisonAt(a[1], s.now) - garrisonAt(b[1], s.now))[0];
      if (border) s.act({ type: "sendMarch", playerId: this.id, land: border[0], lances: reserve });
      return;
    }
  }

  /**
   * A work where it serves the family best, if the family may build one more and the bot can
   * spare its price: a tower on a land bordering an enemy, a camp far from the seat, a toll on
   * the richest land.
   */
  private fortify(s: Session, family: string): void {
    const works = s.ctx.settings.campaign?.works;
    if (!works || this.profile.warlike <= 0) return;
    const state = s.state();
    const c = state.campaign;
    if (!c || c.closed) return;
    if (worksOf(state, family) >= worksAllowed(s.ctx, state, family, s.now)) return;
    const kinds = s.ctx.settings.campaign?.kinds ?? {};
    const glory = (code: string) => kinds[landDef(s.ctx, code)?.kind ?? ""]?.glory ?? 0;
    const seat = seatOf(s.ctx, family);
    const held = Object.entries(c.lands)
      .filter(([code, l]) => l.holder === family && !l.work && !seatFamily(s.ctx, code))
      .sort((a, b) => glory(b[0]) - glory(a[0]) || (a[0] < b[0] ? -1 : 1));
    const pick = held[0];
    if (!pick) return;
    const [code] = pick;
    const exposed = landDef(s.ctx, code)?.neighbors.some((n) => {
      const h = c.lands[n]?.holder;
      return h !== undefined && h !== null && h !== family;
    });
    const hasCamp = Object.values(c.lands).some(
      (l) => l.work?.family === family && works.kinds[l.work.kind]?.staging,
    );
    const far = seat ? landDistance(s.ctx, seat, code) >= 3 : false;
    const workKinds = works.kinds;
    type Kind = (typeof workKinds)[string];
    const want = (test: (k: Kind) => boolean) =>
      Object.entries(workKinds).find(([, k]) => test(k))?.[0];
    const kind = exposed
      ? want((k) => k.defenseBonusBps > 0)
      : far && !hasCamp
        ? want((k) => k.staging)
        : want((k) => k.gloryBonusBps > 0);
    const def = kind ? works.kinds[kind] : undefined;
    if (!kind || !def) return;
    if (this.cash(s) - def.price < s.ctx.settings.startingCapital / 2n) return;
    s.act({ type: "buildWork", playerId: this.id, land: code, kind });
  }

  /** The bot's programme: by temperament, among the decrees the world allows. */
  private programme(s: Session): DecreePick[] {
    const { catalog, perWinner } = s.ctx.settings.decrees;
    const chain = [...this.chainGoods(s)];
    const good = chain.find((r) => CITY_GOODS.includes(r)) ?? chain[0] ?? "bread";
    const wished: Record<ProfileName, string[]> = {
      producer: ["franchise", "faveur", "gabelle"],
      artisan: ["gabelle", "franchise", "fondaco"],
      builder: ["peage", "faveur", "franchise"],
      speculator: ["fondaco", "levant", "calmiere"],
      casual: [],
    };
    const out: DecreePick[] = [];
    for (const code of wished[this.profile.name]) {
      if (out.length >= perWinner || !catalog.includes(code)) continue;
      const kind = decreeTargetKind(code);
      if (kind === "city")
        out.push({
          code,
          target:
            "venezia" in s.ctx.settings.cities
              ? "venezia"
              : (Object.keys(s.ctx.settings.cities)[0] ?? ""),
        });
      else if (kind === "resource")
        out.push({ code, target: code === "calmiere" ? "bread" : good });
      else out.push({ code });
    }
    return out;
  }

  /** What the bot's region makes along its chain (raw good, craft, bread for the plain). */
  private chainGoods(s: Session): Set<string> {
    const out = new Set<string>();
    for (const b of this.buildings(s)) {
      const recipe = s.ctx.theme.recipes.find((r) => r.building === b.type);
      for (const r of Object.keys(recipe?.outputs ?? {})) out.add(r);
    }
    return out;
  }

  /** Stock kept for the next construction. */
  private materialsReserve(s: Session, resource: string): number {
    const next = this.nextInvestment(s);
    return next ? (next.cost.materials[resource] ?? 0) : 0;
  }

  /**
   * Investment among the profile's focus: upgrading the lowest-level building of a type, or adding
   * one. The output selling best relative to its reference wins, then the cheapest option.
   * A building whose output sells below 80 % of its reference is skipped.
   */
  private nextInvestment(s: Session) {
    const { settings } = s.ctx;
    const mine = Object.values(s.state().buildings).filter((b) => b.playerId === this.id);
    const options: {
      kind: "build" | "upgrade";
      type: string;
      building?: Building;
      cost: ReturnType<typeof costForLevel>;
      /** What a unit of added output costs: upgrades and new workshops compared fairly. */
      perOutput: Deniers;
      demand: number;
    }[] = [];
    // The builder takes up the luxury chains its title opens, the earliest first.
    const luxury =
      this.profile.name === "builder"
        ? Object.entries(settings.unlocks)
            .sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([type]) => type)
            .filter(
              (type) =>
                isUnlocked(s.ctx, s.state(), this.id, type) &&
                s.ctx.theme.buildings.some((b) => b.type === type),
            )
            .slice(0, 3)
        : [];
    for (const entry of [...this.profile.focus, ...luxury]) {
      const type = this.resolve(entry);
      const output = Object.keys(recipesFor(s.ctx.theme, type)[0]?.outputs ?? {})[0];
      const reference = output ? Number(s.market.reference(output)) : 0;
      const demand = output && reference > 0 ? Number(s.market.fair(output)) / reference : 1;
      if (demand < 0.8) continue;
      const ofType = mine.filter((b) => b.type === type).sort((a, b) => a.level - b.level);
      const lowest = ofType[0];
      // Past the last ordinary level, a manufacture once its path may be chosen.
      const m = settings.manufacture;
      const pathOpen =
        !!m && turnoverOf(s.state(), this.id) >= m.unlock && lowest?.type !== "palazzo";
      const top = lowest?.path || pathOpen ? (m?.maxLevel ?? 0) : settings.maxBuildingLevel;
      if (lowest && lowest.level < Math.max(top, settings.maxBuildingLevel)) {
        options.push({
          kind: "upgrade",
          type,
          building: lowest,
          cost: costForLevel(s.ctx, type, lowest.level + 1),
          perOutput: costPerOutput(s.ctx, type, lowest.level),
          demand,
        });
      }
      if (ofType.length < MAX_PER_TYPE && mine.length < settings.maxBuildings) {
        options.push({
          kind: "build",
          type,
          cost: costForLevel(s.ctx, type, 1),
          perOutput: costPerOutput(s.ctx, type, 0),
          demand,
        });
      }
    }
    const bucket = (d: number) => Math.round(d * 20);
    options.sort(
      (a, b) =>
        bucket(b.demand) - bucket(a.demand) ||
        (a.perOutput < b.perOutput ? -1 : a.perOutput > b.perOutput ? 1 : 0) ||
        (a.kind === b.kind ? 0 : a.kind === "upgrade" ? -1 : 1),
    );
    return options[0];
  }

  /** With nothing productive left to fund, idle cash goes into the palazzo (counts at cost). */
  private prestigeInvestment(s: Session) {
    const { settings } = s.ctx;
    const mine = Object.values(s.state().buildings).filter((b) => b.playerId === this.id);
    const palace = mine.find((b) => b.type === "palazzo");
    const cost = costForLevel(s.ctx, "palazzo", palace ? palace.level + 1 : 1);
    if (this.cash(s) < (cost.ducats * 5n) / 4n) return undefined;
    if (palace) {
      if (palace.level >= settings.maxBuildingLevel) return undefined;
      return { kind: "upgrade" as const, type: "palazzo", building: palace, cost, demand: 0 };
    }
    if (mine.length >= settings.maxBuildings) return undefined;
    return { kind: "build" as const, type: "palazzo", building: undefined, cost, demand: 0 };
  }

  /** Builds or upgrades if affordable, buying the materials if needed. */
  private invest(s: Session): void {
    const daysLeft = (seasonEnd(s.ctx) - s.now) / DAY;
    if (daysLeft < 1) return;
    const next = this.nextInvestment(s) ?? this.prestigeInvestment(s);
    if (!next) return;

    // Ducats kept back for the workers' bread.
    const reserve = 200_00n;
    if (this.cash(s) < next.cost.ducats + reserve) return;
    let ready = true;
    for (const [res, qty] of Object.entries(next.cost.materials)) {
      const missing = qty - this.available(s, res);
      if (missing > 0) {
        this.buy(s, res, missing, 1.15);
        if (this.available(s, res) < qty) ready = false;
      }
    }
    if (!ready || this.cash(s) < next.cost.ducats + reserve / 2n) return;
    if (next.kind === "build") s.act({ type: "build", playerId: this.id, buildingType: next.type });
    else if (next.building) {
      // The artisan seeks quality, the others volume.
      if (next.building.level >= s.ctx.settings.maxBuildingLevel && !next.building.path)
        s.act({
          type: "choosePath",
          playerId: this.id,
          buildingId: next.building.id,
          path: this.profile.name === "artisan" ? "quality" : "volume",
        });
      s.act({ type: "upgrade", playerId: this.id, buildingId: next.building.id });
    }
  }

  /** Best ask this bot can actually take: the market maker's only within today's quota. */
  private bestAsk(s: Session, resource: string): Deniers | undefined {
    const left = marketMakerQuotaLeft(s.ctx, s.state(), this.id, resource, s.now).buy;
    if (left === 0) {
      return bestPrice(s.state(), resource, "sell", { excludePlayer: this.id, playersOnly: true });
    }
    return s.market.bestAsk(resource, this.id);
  }

  private bestBid(s: Session, resource: string): Deniers | undefined {
    const left = marketMakerQuotaLeft(s.ctx, s.state(), this.id, resource, s.now).sell;
    if (left === 0) {
      return bestPrice(s.state(), resource, "buy", { excludePlayer: this.id, playersOnly: true });
    }
    return s.market.bestBid(resource, this.id);
  }

  /** Buys `qty`: instantly if the ask is reasonable, otherwise with a bid that walks up daily. */
  private buy(s: Session, resource: string, qty: number, maxFactor: number): void {
    if (qty <= 0) return;
    const fair = s.market.fair(resource);
    const cap = scale(fair, maxFactor);
    const budget = this.cash(s) / 2n;
    if (this.options.spareMarketMaker) {
      // Players first: a seller cheaper than the market maker gets the order.
      const mm = Object.values(s.state().orders).find(
        (o) => o.playerId === MARKET_MAKER && o.resource === resource && o.side === "sell",
      );
      const theirs = bestPrice(s.state(), resource, "sell", {
        excludePlayer: this.id,
        playersOnly: true,
      });
      if (theirs !== undefined && theirs <= cap && (!mm || theirs < mm.price)) {
        const q = Math.min(qty, Number(budget / theirs));
        if (
          q > 0 &&
          openOrderCount(s.state(), this.id) < maxOpenOrdersFor(s.ctx, s.state(), this.id, s.now)
        ) {
          s.act({
            type: "placeOrder",
            playerId: this.id,
            resource,
            side: "buy",
            kind: "limit",
            price: theirs,
            quantity: q,
            expiresInHours: 24,
          });
        }
        return;
      }
    }
    const ask = this.bestAsk(s, resource);
    if (ask !== undefined && ask <= cap) {
      const affordable = Number(budget / scale(ask, 1.1));
      const q = Math.min(qty, affordable);
      if (q > 0) {
        s.act({
          type: "placeOrder",
          playerId: this.id,
          resource,
          side: "buy",
          kind: "instant",
          quantity: q,
        });
      }
      return;
    }
    if (this.myOrders(s).some((o) => o.resource === resource && o.side === "buy")) return;
    if (openOrderCount(s.state(), this.id) >= maxOpenOrdersFor(s.ctx, s.state(), this.id, s.now))
      return;
    const key = `buy:${resource}`;
    const previous = this.lastPrice.get(key);
    // A bid that found no seller goes up; one that was filled tries a little lower next time.
    const stale = this.unsold.delete(key);
    const next = previous ? scale(previous, stale ? 1.03 : 0.99) : scale(fair, 0.97);
    const price = next > cap ? cap : next;
    const q = Math.min(qty, Number(budget / (price > 0n ? price : 1n)));
    if (q <= 0) return;
    if (
      s.act({
        type: "placeOrder",
        playerId: this.id,
        resource,
        side: "buy",
        kind: "limit",
        price,
        quantity: q,
      })
    ) {
      this.lastPrice.set(key, price);
    }
  }

  /** Sells what is not needed: instantly near the fair price, otherwise an ask that walks down. */
  private sellSurplus(s: Session): void {
    const needs = this.inputNeeds(s);
    for (const res of s.ctx.theme.resources.map((r) => r.code)) {
      if (s.ctx.theme.resources.find((r) => r.code === res)?.tier === "luxury") continue;
      const keep = (needs.get(res) ?? 0) + this.reserve(s, res);
      const surplus = this.available(s, res) - keep;
      if (surplus <= 0) continue;
      if (res === "bread" && this.available(s, res) < 20) continue;
      const fair = s.market.fair(res);
      // In a live world, goods go on the book for people rather than to the market maker.
      const bid = this.options.spareMarketMaker ? undefined : this.bestBid(s, res);
      if (bid !== undefined && bid >= scale(fair, 0.95)) {
        s.act({
          type: "placeOrder",
          playerId: this.id,
          resource: res,
          side: "sell",
          kind: "instant",
          quantity: surplus,
        });
      }
      const left = this.available(s, res) - keep;
      if (left <= 0) continue;
      if (this.myOrders(s).some((o) => o.resource === res && o.side === "sell")) continue;
      if (openOrderCount(s.state(), this.id) >= maxOpenOrdersFor(s.ctx, s.state(), this.id, s.now))
        continue;
      const key = `sell:${res}`;
      const previous = this.lastPrice.get(key);
      let floorPrice = scale(s.market.reference(res), 0.5);
      if (this.options.spareMarketMaker) {
        // Stay above the market maker's bid, so the goods wait on the book for a buyer.
        const mmBid = Object.values(s.state().orders).find(
          (o) => o.playerId === MARKET_MAKER && o.resource === res && o.side === "buy",
        )?.price;
        if (mmBid !== undefined && mmBid + 1n > floorPrice) floorPrice = mmBid + 1n;
      }
      // An offer that found no taker comes down; one that sold out asks a little more next time.
      const stale = this.unsold.delete(key);
      let price = previous ? scale(previous, stale ? 0.97 : 1.03) : scale(fair, 1.02);
      if (price < floorPrice) price = floorPrice;
      if (
        s.act({
          type: "placeOrder",
          playerId: this.id,
          resource: res,
          side: "sell",
          kind: "limit",
          price,
          quantity: left,
        })
      ) {
        this.lastPrice.set(key, price);
      }
    }
  }

  /** Market making by a player: buys below the fair price, resells above. */
  private speculate(s: Session): void {
    const resources = ["wheat", "flour", "bricks", "planks"];
    for (const res of resources) {
      if (
        openOrderCount(s.state(), this.id) >=
        maxOpenOrdersFor(s.ctx, s.state(), this.id, s.now) - 2
      )
        return;
      const fair = s.market.fair(res, 7);
      const held = this.available(s, res);
      if (held > 0 && !this.myOrders(s).some((o) => o.resource === res && o.side === "sell")) {
        s.act({
          type: "placeOrder",
          playerId: this.id,
          resource: res,
          side: "sell",
          kind: "limit",
          price: scale(fair, 1.05),
          quantity: held,
        });
      }
      if (!this.myOrders(s).some((o) => o.resource === res && o.side === "buy")) {
        const price = scale(fair, 0.95);
        const q = Number(this.cash(s) / 8n / (price > 0n ? price : 1n));
        if (q > 0) {
          s.act({
            type: "placeOrder",
            playerId: this.id,
            resource: res,
            side: "buy",
            kind: "limit",
            price,
            quantity: q,
          });
        }
      }
    }
  }
}
