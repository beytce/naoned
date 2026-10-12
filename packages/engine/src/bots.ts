import { crieeRoom, currentCriee, dailyFor } from "./activity.js";
import { balesFor } from "./bales.js";
import { costForLevel } from "./buildings.js";
import { quoteCitySale } from "./cities.js";
import type { Command } from "./commands.js";
import { contractsFor, rerollsOf } from "./contracts.js";
import {
  allRoutes,
  banditsOn,
  deliveriesDoneToday,
  deliveriesOn,
  deliveryOrdersFor,
  escortCost,
  travelMinutes,
  vehicleFree,
  vehiclesOf,
  watchedRoads,
} from "./deliveries.js";
import { cargoValueAt } from "./expeditions.js";
import { guildOf, guildsOpenAt } from "./guilds.js";
import { bestPrice, marketMakerQuotaLeft, maxOpenOrdersFor, openOrderCount } from "./market.js";
import { type MarketView, scale } from "./marketView.js";
import type { Deniers } from "./money.js";
import { freeBatches } from "./production.js";
import { openProjects } from "./projects.js";
import type { Rng } from "./rng.js";
import type { WorldSettings } from "./settings.js";
import { portDues, shipStatus, shipsOf } from "./ships.js";
import { specialtyUnlocked } from "./specialties.js";
import {
  type Building,
  type Guild,
  MARKET_MAKER,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  hasPass,
  seasonEnd,
} from "./state.js";
import { findRegion, recipesFor } from "./theme.js";
import { activeWarOn, concessionHolder, sideOf, warForBand, warRefusal } from "./wars.js";

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
  /** Chance of hiring guards on a road where bandits lie in wait (0 to 1). */
  prudence: number;
  /** Vehicles the bot is willing to own. */
  vehicles: number;
  /** Chance per session of posting a band on a road (0 to 1). */
  banditry: number;
}

export const PROFILES: Record<ProfileName, Profile> = {
  producer: {
    name: "producer",
    banditry: 0,
    prudence: 0.5,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$raw", "$craft"],
    buysInputs: true,
    speculates: false,
  },
  artisan: {
    name: "artisan",
    banditry: 0,
    prudence: 0.5,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["bakery", "mill", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  builder: {
    name: "builder",
    banditry: 0,
    prudence: 0.6,
    vehicles: 2,
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$craft", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  speculator: {
    name: "speculator",
    banditry: 0.3,
    prudence: 0.2,
    vehicles: 2,
    sessionsPerDay: [3, 5],
    churnPerDay: 0.01,
    focus: ["$raw"],
    buysInputs: false,
    speculates: true,
  },
  casual: {
    name: "casual",
    banditry: 0.15,
    prudence: 1,
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
const VOYAGERS = new Set<ProfileName>(["producer", "builder", "speculator"]);
const MATERIALS = ["bricks", "planks"];
/** Names for the guilds bots found. */
const GUILD_NAMES = [
  "Leone d'Oro",
  "Stella Maris",
  "Arte della Lana",
  "Compagnia del Sale",
  "Fondaco dei Fabbri",
  "Scuola dei Mercanti",
  "Ca' d'Oro",
  "Torre dei Venti",
];
const GUILD_EMBLEMS = ["lion", "star", "ship", "tower", "key", "sun"];
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
}

export class Bot {
  churned = false;
  sessions = 0;
  /** A session keeps the merchant at the screen for a while: they can fight back meanwhile. */
  onlineUntil = 0;
  /** Last limit price used per side and resource, to walk prices when orders do not fill. */
  private lastPrice = new Map<string, Deniers>();
  /** Last day it put money in its guild. */
  private investedDay = -1;
  /** Last day it thought of war. */
  private warDay = -1;

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
   * four goes to sea.
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
    const wanted = hash % 4 === 0 ? "shipowner" : (byProfile[this.profile.name] ?? "master");
    const specialty = options.includes(wanted) ? wanted : options[0];
    if (specialty) s.act({ type: "chooseSpecialty", playerId: this.id, specialty });
  }

  play(s: Session): void {
    this.ctxTheme = s.ctx.theme;
    this.sessions++;
    this.onlineUntil = s.now + ONLINE_MS;
    this.respond(s);
    this.openBales(s);
    this.refreshOrders(s);
    for (const b of this.buildings(s)) {
      if (b.job) s.act({ type: "collect", playerId: this.id, buildingId: b.id });
    }
    this.collectGalleys(s);
    this.feed(s);
    this.doContracts(s);
    this.serveGuild(s);
    this.deliverProjects(s);
    if (deliveriesOn(s.ctx)) this.garage(s, this.deliver(s));
    else {
      this.sellToCriee(s);
      this.sellToCities(s);
    }
    this.invest(s);
    this.chooseMastery(s);
    this.runProduction(s);
    // Corsairs fit out before their cash goes into speculative orders.
    this.shipyard(s);
    this.privateer(s);
    this.highwayman(s);
    if (this.profile.speculates) this.speculate(s);
    this.voyage(s);
    this.sellSurplus(s);
    this.claimDaily(s);
  }

  /**
   * Fights back an ambush if at the screen: during a session, or coming back before the time
   * runs out (`comingBackAt`, the next planned session).
   */
  respond(s: Session, comingBackAt = Number.POSITIVE_INFINITY): void {
    for (const d of Object.values(s.state().deliveries ?? {})) {
      const a = d.attack;
      if (d.playerId !== this.id || !a || a.success !== undefined || a.reacted) continue;
      if (s.now > a.reactBy) continue;
      if (s.now <= this.onlineUntil || comingBackAt <= a.reactBy) {
        s.act({ type: "reactToAmbush", playerId: this.id, deliveryId: d.id });
      }
    }
  }

  /**
   * Another vehicle when the board holds more orders the bot could load than it has vehicles
   * free (called after the deliveries of the session).
   */
  private garage(s: Session, waiting: number): void {
    const { deliveries } = s.ctx.settings;
    const mine = vehiclesOf(s.state(), this.id);
    if (waiting === 0 || mine.length >= Math.min(this.profile.vehicles, deliveries.maxVehicles))
      return;
    const type = Object.keys(deliveries.vehicles).includes("cart")
      ? "cart"
      : Object.keys(deliveries.vehicles)[0];
    const def = type ? deliveries.vehicles[type] : undefined;
    if (!type || !def || this.cash(s) < def.costDucats * 3n) return;
    for (const [res, qty] of Object.entries(def.costMaterials)) {
      const missing = qty - this.available(s, res);
      if (missing > 0) this.buy(s, res, missing, 1.15);
    }
    if (s.act({ type: "buyVehicle", playerId: this.id, vehicleType: type })) this.deliver(s);
  }

  /**
   * The board: the best-paid orders the bot can load first, each on the free vehicle that fits
   * it best. Doge's and family orders are bought for if goods are missing; guards are hired on a
   * road where bandits lie in wait, by prudence.
   */
  /** Returns how many orders the bot could have loaded but had no vehicle for. */
  private deliver(s: Session): number {
    const state = s.state();
    const player = state.players[this.id];
    if (!player) return 0;
    let waiting = 0;
    const day = dayIndex(s.ctx, s.now);
    const done = deliveriesDoneToday(state, this.id, day);
    const atWar = (o: { city: string; resource: string }) => {
      const w = activeWarOn(state, o.city, o.resource, s.now);
      return !!w && !!sideOf(state, w, this.id);
    };
    const orders = deliveryOrdersFor(s.ctx, state, this.id, day)
      .filter(
        (o) => !o.takenBy && !done.includes(o.id) && o.opensAt <= s.now && s.now < o.expiresAt,
      )
      .sort((a, b) => {
        // The orders of a war it fights come first: they win the concession.
        const wa = atWar(a) ? 1 : 0;
        const wb = atWar(b) ? 1 : 0;
        if (wa !== wb) return wb - wa;
        const va = a.unitPrice * BigInt(a.quantity);
        const vb = b.unitPrice * BigInt(b.quantity);
        return va === vb ? a.id.localeCompare(b.id) : va > vb ? -1 : 1;
      });
    const types = s.ctx.settings.deliveries.vehicles;
    const watched = new Set(watchedRoads(s.ctx, s.state(), s.now));
    // What the bot keeps aside per resource (costly to work out): once per session.
    const reserved = new Map<string, number>();
    const reserveOf = (r: string) => {
      if (!reserved.has(r)) reserved.set(r, this.reserve(s, r));
      return reserved.get(r) ?? 0;
    };
    for (const o of orders) {
      const vehicles = vehiclesOf(s.state(), this.id).filter((v) => vehicleFree(v, s.now));
      // No vehicle free and one order already waiting: enough to decide on another vehicle.
      if (vehicles.length === 0 && waiting > 0) break;
      const free = vehicles
        .filter((v) => (types[v.type]?.capacity ?? 0) >= o.quantity)
        .sort((a, b) => (types[a.type]?.capacity ?? 0) - (types[b.type]?.capacity ?? 0));
      const vehicle = free[0];
      if (!vehicle) {
        const spareNow = this.available(s, o.resource) - reserveOf(o.resource);
        if (spareNow >= o.quantity && o.unitPrice >= (this.bestBid(s, o.resource) ?? 0n)) waiting++;
        continue;
      }
      if (travelMinutes(s.ctx, player.region, o.city, vehicle.type) === undefined) continue;
      // The order must beat what the market pays.
      const bid = this.bestBid(s, o.resource) ?? 0n;
      if (o.unitPrice < bid) continue;
      const spare = () => this.available(s, o.resource) - reserveOf(o.resource);
      if (o.kind === "doge" || o.kind === "family" || atWar(o)) {
        const missing = o.quantity - spare();
        if (missing > 0) this.buy(s, o.resource, missing, 1.15);
      }
      if (spare() < o.quantity) continue;
      const route = `${player.region}:${o.city}`;
      let escort = "none";
      if (watched.has(route) && s.rng.chance(this.profile.prudence)) {
        const guards = Object.entries(s.ctx.settings.deliveries.escorts).sort(
          ([, a], [, b]) => a.costBps - b.costBps,
        )[0]?.[0];
        if (guards && this.cash(s) > escortCost(s.ctx, o, guards) * 4n) escort = guards;
      }
      s.act({
        type: "dispatchDelivery",
        playerId: this.id,
        orderId: o.id,
        vehicleId: vehicle.id,
        escort,
      });
    }
    return waiting;
  }

  /** Speculators (and a few casual merchants) post a band on a road; any bot collects booty. */
  private highwayman(s: Session): void {
    if (!banditsOn(s.ctx)) return;
    for (const b of Object.values(s.state().bands ?? {})) {
      if (b.playerId !== this.id || b.collected) continue;
      if (b.dispersed || b.endAt <= s.now)
        s.act({ type: "collectBooty", playerId: this.id, bandId: b.id });
    }
    if (this.profile.banditry === 0 || !s.rng.chance(this.profile.banditry)) return;
    const cfg = s.ctx.settings.bandits;
    const hours = cfg.hoursOptions[Math.floor(cfg.hoursOptions.length / 2)] ?? 0;
    if (this.cash(s) < cfg.feePerHour * BigInt(hours) * 3n) return;
    for (const [res, perHour] of Object.entries(cfg.provisionsPerHour)) {
      const missing = perHour * hours - (this.available(s, res) - this.reserve(s, res));
      if (missing > 0) this.buy(s, res, missing, 1.3);
      if (this.available(s, res) - this.reserve(s, res) < perHour * hours) return;
    }
    // A seasoned bandit knows the busy roads (the last day's traffic); an occasional one guesses.
    // In wartime only, the roads to a city at war where the bot fights.
    const routes = allRoutes(s.ctx).filter(
      (r) => !cfg.warOnly || !!warForBand(s.state(), r.split(":")[1] ?? "", this.id, s.now),
    );
    if (routes.length === 0) return;
    let route = s.rng.pick(routes);
    if (this.profile.name !== "casual") {
      const traffic = new Map<string, number>();
      for (const d of Object.values(s.state().deliveries ?? {})) {
        if (d.playerId !== this.id && d.departAt > s.now - DAY)
          traffic.set(d.route, (traffic.get(d.route) ?? 0) + 1);
      }
      const watched = new Set(watchedRoads(s.ctx, s.state(), s.now));
      const best = routes
        .filter((r) => !watched.has(r))
        .sort((a, b) => (traffic.get(b) ?? 0) - (traffic.get(a) ?? 0))
        .slice(0, 3);
      route = s.rng.pick(best) ?? route;
    }
    if (route) s.act({ type: "postBand", playerId: this.id, route, hours });
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
      if (s.now - o.createdAt >= DAY)
        s.act({ type: "cancelOrder", playerId: this.id, orderId: o.id });
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

  private deliverProjects(s: Session): void {
    for (const p of openProjects(s.state().projects, s.now)) {
      for (const res of MATERIALS) {
        const room = (p.needs[res] ?? 0) - (p.delivered[res] ?? 0);
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
    if (hasPass(s.state(), this.id, s.now) && !deliveriesOn(s.ctx)) {
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
   * The guilds: once they open, join the smallest open guild, or found one when the guilds are
   * well filled; then put a tenth of the cash above one and a half times the starting capital into
   * the treasury (once a day), and vote on what is proposed.
   */
  private serveGuild(s: Session): void {
    const rules = s.ctx.settings.guilds;
    if (rules.maxMembers <= 0 || this.profile.name === "casual") return;
    const state = s.state();
    let guild = guildOf(state, this.id);
    if (!guild) this.enlist(s);
    if (!guild) {
      if (s.now < guildsOpenAt(s.ctx, state, this.id)) return;
      const all = Object.values(state.guilds?.guilds ?? {});
      const open = all
        .filter((g) => g.open && Object.keys(g.members).length < rules.maxMembers)
        .sort((a, b) => Object.keys(a.members).length - Object.keys(b.members).length);
      const members = all.reduce((n, g) => n + Object.keys(g.members).length, 0);
      const stake = Number(rules.minStake);
      const smallest = open[0];
      if (smallest && members < all.length * 6) {
        s.act({ type: "joinGuild", playerId: this.id, guildId: smallest.id, stake });
      } else if (this.cash(s) > rules.foundingCost + rules.minStake * 3n) {
        const used = new Set(all.map((g) => g.name));
        const name = GUILD_NAMES.find((n) => !used.has(n)) ?? `Compagnia ${all.length + 1}`;
        s.act({
          type: "foundGuild",
          playerId: this.id,
          name,
          emblem: GUILD_EMBLEMS[all.length % GUILD_EMBLEMS.length] ?? "lion",
          stake,
        });
      }
      guild = guildOf(s.state(), this.id);
      if (!guild) return;
    }
    // Investing: a tenth of the spare cash, once a day.
    const day = dayIndex(s.ctx, s.now);
    if (this.investedDay !== day) {
      this.investedDay = day;
      const spare = this.cash(s) - (s.ctx.settings.startingCapital * 3n) / 2n;
      if (spare > 1_000n)
        s.act({ type: "investGuild", playerId: this.id, amount: Number(spare / 10n) });
    }
    // Voting: yes to the guild's settings, no to excluding a fellow merchant.
    for (const p of Object.values(s.state().guilds?.proposals ?? {})) {
      if (p.guildId !== guild.id || p.status !== "open" || p.votes[this.id] !== undefined) continue;
      s.act({ type: "vote", playerId: this.id, proposalId: p.id, yes: p.kind !== "exclude" });
    }
    this.wageWar(s, guild);
    // The founder sets the guild going: a share of each income paid out as dividends.
    if (guild.founder === this.id && guild.dividendBps === 0) {
      const pending = Object.values(s.state().guilds?.proposals ?? {}).some(
        (p) => p.guildId === guild?.id && p.kind === "dividend" && p.status === "open",
      );
      if (!pending)
        s.act({
          type: "propose",
          playerId: this.id,
          proposal: { kind: "dividend", value: 3_000 },
        });
    }
  }

  /**
   * Wars: once a day, the founder of a guild with the chest to spare proposes a war on a concession
   * of a good its members make (the Seigneurie's first), then asks a toll on what it holds and a
   * bounty for suppliers. Members vote yes (see the votes above).
   */
  private wageWar(s: Session, guild: Guild): void {
    const cfg = s.ctx.settings.wars;
    if (s.ctx.settings.concessions.length === 0 || guild.founder !== this.id) return;
    const day = dayIndex(s.ctx, s.now);
    if (this.warDay === day) return;
    this.warDay = day;
    const state = s.state();
    const open = Object.values(state.guilds?.proposals ?? {}).filter(
      (p) => p.guildId === guild.id && p.status === "open",
    );
    const asked = (kind: string) => open.some((p) => p.kind === kind);
    const held = s.ctx.settings.concessions.filter(
      (c) => concessionHolder(state, c.code) === guild.id,
    );
    if (held.length > 0 && guild.tollBps === 0 && !asked("toll"))
      s.act({ type: "propose", playerId: this.id, proposal: { kind: "toll", value: 400 } });
    if (guild.bountyPerUnit === 0n && !asked("bounty"))
      s.act({ type: "propose", playerId: this.id, proposal: { kind: "bounty", value: 10 } });
    if (asked("war")) return;
    const treasury = state.accounts[`guild:${guild.id}`] ?? 0n;
    if (treasury < cfg.stake * 2n) return;
    const chain = this.chainGoods(s);
    const targets = s.ctx.settings.concessions
      .filter((c) => chain.has(c.resource))
      .filter((c) => !warRefusal(s.ctx, state, guild.id, c.code, s.now))
      .sort(
        (a, b) =>
          Number(concessionHolder(state, a.code) !== null) -
          Number(concessionHolder(state, b.code) !== null),
      );
    const others = s.ctx.settings.concessions.filter(
      (c) => !warRefusal(s.ctx, state, guild.id, c.code, s.now),
    );
    const target = targets[0] ?? (others.length > 0 ? s.rng.pick(others) : undefined);
    if (target)
      s.act({ type: "propose", playerId: this.id, proposal: { kind: "war", target: target.code } });
  }

  /** A merchant of no guild supplies the attacker of a war on a good it makes, for the bounty. */
  private enlist(s: Session): void {
    const chain = this.chainGoods(s);
    for (const w of Object.values(s.state().wars ?? {})) {
      if (w.outcome || s.now >= w.endAt || w.enlisted[this.id] || !chain.has(w.resource)) continue;
      s.act({ type: "enlist", playerId: this.id, warId: w.id, side: "attacker" });
      return;
    }
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

  private collectGalleys(s: Session): void {
    for (const e of Object.values(s.state().expeditions ?? {})) {
      if (e.playerId === this.id && e.outcome === "pending" && e.returnAt <= s.now) {
        s.act({ type: "collectExpedition", playerId: this.id, expeditionId: e.id });
      }
    }
  }

  /** Ready ships of this bot, the largest hold first. */
  private readyShips(s: Session) {
    const types = s.ctx.settings.ships.types;
    return shipsOf(s.state(), this.id)
      .filter((ship) => shipStatus(s.state(), ship, s.now) === "ready")
      .sort((a, b) => {
        const ha = types[a.type]?.holdValue ?? 0n;
        const hb = types[b.type]?.holdValue ?? 0n;
        return ha === hb ? a.id.localeCompare(b.id) : ha > hb ? -1 : 1;
      });
  }

  /** Keeps the fleet afloat: repairs damaged ships, builds one when trade makes it worth it. */
  private shipyard(s: Session): void {
    if (!VOYAGERS.has(this.profile.name)) return;
    const { ships } = s.ctx.settings;
    for (const ship of shipsOf(s.state(), this.id)) {
      if (shipStatus(s.state(), ship, s.now) !== "damaged") continue;
      const cost = ships.types[ship.type]?.repairCost ?? 0n;
      if (this.cash(s) > cost * 4n)
        s.act({ type: "repairShip", playerId: this.id, shipId: ship.id });
    }
    const fleet = shipsOf(s.state(), this.id).length;
    const wanted = this.profile.speculates ? 3 : 2;
    if (fleet >= Math.min(wanted, ships.maxPerPlayer)) return;
    const type = fleet === 0 ? "cog" : this.profile.speculates ? "galley" : "cog";
    const def = ships.types[type];
    if (!def || this.cash(s) < def.costDucats * (this.profile.speculates ? 2n : 3n)) return;
    for (const [res, qty] of Object.entries(def.costMaterials)) {
      const missing = qty - this.available(s, res);
      if (missing > 0) this.buy(s, res, missing, 1.15);
    }
    s.act({ type: "buildShip", playerId: this.id, shipType: type });
  }

  /** Expected deniers gained by sending this cargo to a port. */
  private voyageProfit(s: Session, port: string, cargo: Record<string, number>, fee: bigint) {
    const dest = s.ctx.settings.expeditions.destinations[port];
    if (!dest) return Number.NEGATIVE_INFINITY;
    let cost = fee;
    for (const [r, q] of Object.entries(cargo))
      cost += (s.ctx.settings.referencePrices[r] ?? 0n) * BigInt(q);
    const back =
      (cargoValueAt(s.ctx, port, cargo, s.now) * BigInt(10_000 + dest.gainBps)) / 10_000n;
    const kept = (Number(back) * (10_000 - dest.riskBps / 2)) / 10_000;
    // Long voyages tie the ships up: compare per day at sea.
    return (kept - Number(cost)) / Math.max(0.5, dest.hours / 24);
  }

  /** Ships spare goods overseas, on its own ships when it has some, to the best port this week. */
  private voyage(s: Session): void {
    if (!VOYAGERS.has(this.profile.name)) return;
    const { expeditions, referencePrices } = s.ctx.settings;
    const busy = Object.values(s.state().expeditions ?? {}).some(
      (e) => e.playerId === this.id && e.outcome === "pending",
    );
    const owned = shipsOf(s.state(), this.id).length > 0;
    if (busy || this.cash(s) < (owned ? 30_000n : 60_000n)) return;
    const needs = this.inputNeeds(s);
    const food = s.ctx.settings.rations.resource;
    const spare: [string, number, bigint][] = [];
    for (const r of s.ctx.theme.resources) {
      if (r.tier === "luxury" || r.code === food) continue;
      const qty = this.available(s, r.code) - (needs.get(r.code) ?? 0) - this.reserve(s, r.code);
      if (qty > 0) spare.push([r.code, qty, referencePrices[r.code] ?? 0n]);
    }
    const total = spare.reduce((v, [, q, p]) => v + BigInt(q) * p, 0n);
    if (total < 20_000n) return;

    const ready = this.readyShips(s);
    // Keep a ship back for privateering if the bot hunts.
    const sailing = this.profile.speculates ? ready.slice(0, 1) : ready;
    const fleet = sailing.map((x) => x.id);
    const hold =
      fleet.length > 0
        ? (s.ctx.settings.ships.types[sailing[0]?.type ?? ""]?.holdValue ?? 0n)
        : undefined;

    let best: { port: string; cargo: Record<string, number>; profit: number } | undefined;
    for (const [port, dest] of Object.entries(expeditions.destinations)) {
      const room0 = hold ?? dest.maxCargoValue;
      const cargo: Record<string, number> = {};
      let value = 0n;
      for (const [code, qty, price] of spare) {
        const q = Math.min(qty, price > 0n ? Number((room0 - value) / price) : 0);
        if (q > 0) {
          cargo[code] = q;
          value += BigInt(q) * price;
        }
      }
      if (value < 20_000n) continue;
      const crews = fleet.length > 0 ? fleet.length : 1;
      if (this.available(s, food) - this.reserve(s, food) < (dest.provisions[food] ?? 0) * crews)
        continue;
      const fee = fleet.length > 0 ? portDues(s.ctx, dest.charter) : dest.charter;
      const profit = this.voyageProfit(s, port, cargo, fee);
      if (profit > 0 && (!best || profit > best.profit)) best = { port, cargo, profit };
    }
    if (!best) return;
    s.act({
      type: "launchExpedition",
      playerId: this.id,
      destination: best.port,
      cargo: best.cargo,
      escort: fleet.length === 0 && total >= 80_000n,
      ships: fleet,
    });
  }

  /** Speculators sometimes send a spare ship privateering on a busy route. */
  private privateer(s: Session): void {
    if (!this.profile.speculates) return;
    const cfg = s.ctx.settings.privateers;
    if (cfg.maxActive === 0) return;
    for (const r of Object.values(s.state().raids ?? {})) {
      if (r.playerId === this.id && r.outcome === "cruising" && r.endAt <= s.now)
        s.act({ type: "collectRaid", playerId: this.id, raidId: r.id });
    }
    if (!s.rng.chance(0.35) || this.cash(s) < cfg.letterFee * 3n) return;
    const ready = this.readyShips(s);
    if (ready.length === 0) return;
    // Short, busy routes see the most convoys.
    const routes = Object.entries(s.ctx.settings.expeditions.destinations)
      .sort(([, a], [, b]) => a.hours - b.hours)
      .slice(0, 5)
      .map(([code]) => code);
    const route = s.rng.pick(routes);
    if (!route) return;
    s.act({
      type: "commissionPrivateers",
      playerId: this.id,
      route,
      ships: ready.slice(0, 2).map((x) => x.id),
    });
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
      demand: number;
    }[] = [];
    for (const entry of this.profile.focus) {
      const type = this.resolve(entry);
      const output = Object.keys(recipesFor(s.ctx.theme, type)[0]?.outputs ?? {})[0];
      const reference = output ? Number(s.market.reference(output)) : 0;
      const demand = output && reference > 0 ? Number(s.market.fair(output)) / reference : 1;
      if (demand < 0.8) continue;
      const ofType = mine.filter((b) => b.type === type).sort((a, b) => a.level - b.level);
      const lowest = ofType[0];
      if (lowest && lowest.level < settings.maxBuildingLevel) {
        options.push({
          kind: "upgrade",
          type,
          building: lowest,
          cost: costForLevel(s.ctx, type, lowest.level + 1),
          demand,
        });
      }
      if (ofType.length < MAX_PER_TYPE && mine.length < settings.maxBuildings) {
        options.push({ kind: "build", type, cost: costForLevel(s.ctx, type, 1), demand });
      }
    }
    const bucket = (d: number) => Math.round(d * 20);
    options.sort(
      (a, b) =>
        bucket(b.demand) - bucket(a.demand) ||
        (a.cost.ducats < b.cost.ducats ? -1 : a.cost.ducats > b.cost.ducats ? 1 : 0),
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

    const upkeepReserve = 200_00n;
    if (this.cash(s) < next.cost.ducats + upkeepReserve) return;
    let ready = true;
    for (const [res, qty] of Object.entries(next.cost.materials)) {
      const missing = qty - this.available(s, res);
      if (missing > 0) {
        this.buy(s, res, missing, 1.15);
        if (this.available(s, res) < qty) ready = false;
      }
    }
    if (!ready || this.cash(s) < next.cost.ducats + upkeepReserve / 2n) return;
    if (next.kind === "build") s.act({ type: "build", playerId: this.id, buildingType: next.type });
    else if (next.building)
      s.act({ type: "upgrade", playerId: this.id, buildingId: next.building.id });
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
    const price = previous
      ? scale(previous, 1.03) > cap
        ? cap
        : scale(previous, 1.03)
      : scale(fair, 0.97);
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
      let price = previous ? scale(previous, 0.97) : scale(fair, 1.02);
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
