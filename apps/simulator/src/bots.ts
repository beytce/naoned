import {
  type Building,
  type Command,
  type Deniers,
  type Rng,
  type WorldContext,
  type WorldState,
  cashAccount,
  contractsFor,
  costForLevel,
  dayIndex,
  findRegion,
  freeBatches,
  openOrderCount,
  openProjects,
  quoteCitySale,
  recipesFor,
} from "@comptoirs/engine";
import { type MarketView, scale } from "./market.js";

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
}

export const PROFILES: Record<ProfileName, Profile> = {
  producer: {
    name: "producer",
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$raw", "$craft"],
    buysInputs: true,
    speculates: false,
  },
  artisan: {
    name: "artisan",
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["bakery", "mill", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  builder: {
    name: "builder",
    sessionsPerDay: [2, 4],
    churnPerDay: 0.01,
    focus: ["$craft", "$raw"],
    buysInputs: true,
    speculates: false,
  },
  speculator: {
    name: "speculator",
    sessionsPerDay: [3, 5],
    churnPerDay: 0.01,
    focus: ["$raw"],
    buysInputs: false,
    speculates: true,
  },
  casual: {
    name: "casual",
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
const CITY_GOODS = ["bread", "bricks", "planks", "spices", "silk"];
const VOYAGERS = new Set<ProfileName>(["producer", "builder", "speculator"]);
const MATERIALS = ["bricks", "planks"];
const HOUR = 3_600_000;
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

export class Bot {
  churned = false;
  sessions = 0;
  /** Last limit price used per side and resource, to walk prices when orders do not fill. */
  private lastPrice = new Map<string, Deniers>();

  constructor(
    readonly id: string,
    readonly profile: Profile,
    readonly region: string,
    readonly joinAt: number,
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

  play(s: Session): void {
    this.ctxTheme = s.ctx.theme;
    this.sessions++;
    this.refreshOrders(s);
    for (const b of this.buildings(s)) {
      if (b.job) s.act({ type: "collect", playerId: this.id, buildingId: b.id });
    }
    this.collectGalleys(s);
    this.feed(s);
    this.doContracts(s);
    this.deliverProjects(s);
    this.sellToCities(s);
    this.invest(s);
    this.runProduction(s);
    if (this.profile.speculates) this.speculate(s);
    this.voyage(s);
    this.sellSurplus(s);
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
        const bid = s.market.bestBid(res, this.id) ?? 0n;
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
        const bid = s.market.bestBid(resource, this.id) ?? 0n;
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
    return this.materialsReserve(s, resource) + food;
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
    for (const c of contractsFor(s.ctx, this.id, day)) {
      if (doneIds.includes(c.id)) continue;
      if (this.available(s, c.resource) - this.reserve(s, c.resource) >= c.quantity) {
        s.act({ type: "fulfillContract", playerId: this.id, contractId: c.id });
      }
    }
  }

  private collectGalleys(s: Session): void {
    for (const e of Object.values(s.state().expeditions ?? {})) {
      if (e.playerId === this.id && e.outcome === "pending" && e.returnAt <= s.now) {
        s.act({ type: "collectExpedition", playerId: this.id, expeditionId: e.id });
      }
    }
  }

  /** Ships spare goods east when there is enough to make a voyage worth it. */
  private voyage(s: Session): void {
    if (!VOYAGERS.has(this.profile.name)) return;
    const { expeditions, referencePrices } = s.ctx.settings;
    const busy = Object.values(s.state().expeditions ?? {}).some(
      (e) => e.playerId === this.id && e.outcome === "pending",
    );
    if (busy || this.cash(s) < 60_000n) return;
    const needs = this.inputNeeds(s);
    const spare: [string, number, bigint][] = [];
    for (const r of s.ctx.theme.resources) {
      if (r.tier === "luxury") continue;
      const qty = this.available(s, r.code) - (needs.get(r.code) ?? 0) - this.reserve(s, r.code);
      if (qty > 0) spare.push([r.code, qty, referencePrices[r.code] ?? 0n]);
    }
    const total = spare.reduce((v, [, q, p]) => v + BigInt(q) * p, 0n);
    if (total < 30_000n) return;
    const destination = total >= 100_000n ? "alexandria" : "constantinople";
    const dest = expeditions.destinations[destination];
    if (!dest) return;
    const food = s.ctx.settings.rations.resource;
    if (this.available(s, food) - this.reserve(s, food) < (dest.provisions[food] ?? 0)) return;
    const cargo: Record<string, number> = {};
    let value = 0n;
    for (const [code, qty, price] of spare) {
      if (code === food) continue;
      const room = price > 0n ? Number((dest.maxCargoValue - value) / price) : 0;
      const q = Math.min(qty, room);
      if (q > 0) {
        cargo[code] = q;
        value += BigInt(q) * price;
      }
    }
    if (value < 30_000n) return;
    s.act({
      type: "launchExpedition",
      playerId: this.id,
      destination,
      cargo,
      escort: value >= 80_000n,
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
    const daysLeft = (s.ctx.startAt + s.ctx.settings.seasonDays * DAY - s.now) / DAY;
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

  /** Buys `qty`: instantly if the ask is reasonable, otherwise with a bid that walks up daily. */
  private buy(s: Session, resource: string, qty: number, maxFactor: number): void {
    if (qty <= 0) return;
    const fair = s.market.fair(resource);
    const cap = scale(fair, maxFactor);
    const ask = s.market.bestAsk(resource, this.id);
    const budget = this.cash(s) / 2n;
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
    if (openOrderCount(s.state(), this.id) >= s.ctx.settings.maxOpenOrders) return;
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
      const bid = s.market.bestBid(res, this.id);
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
      if (openOrderCount(s.state(), this.id) >= s.ctx.settings.maxOpenOrders) continue;
      const key = `sell:${res}`;
      const previous = this.lastPrice.get(key);
      const floorPrice = scale(s.market.reference(res), 0.5);
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
      if (openOrderCount(s.state(), this.id) >= s.ctx.settings.maxOpenOrders - 2) return;
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
