import {
  Bot,
  DAY_MS,
  HOUR_MS,
  MarketView,
  PROFILES,
  type ProfileName,
  Rng,
  botsWanted,
  isActive,
} from "@comptoirs/engine";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, players } from "../db/schema.js";
import { botBuysPatents } from "./house.js";
import type { GameWorld } from "./world.js";

/** The patrician families of earlier versions: no house is named after them. */
export const FAMILY_NAMES = ["Contarini", "Morosini", "Mocenigo", "Dandolo"];

/**
 * Great Venetian families: the bots' trading houses. The patrician families players swear
 * allegiance to (theme.families) are left out, so that a house is never taken for one of them.
 */
const HOUSES = [
  "Grimani",
  "Foscari",
  "Loredan",
  "Gritti",
  "Venier",
  "Barbarigo",
  "Corner",
  "Giustinian",
  "Querini",
  "Tiepolo",
  "Zeno",
  "Bembo",
  "Badoer",
  "Memmo",
  "Falier",
  "Priuli",
  "Trevisan",
  "Vendramin",
  "Pisani",
  "Sanudo",
  "Michiel",
  "Malipiero",
  "Soranzo",
  "Valier",
  "Cornaro",
  "Donà",
  "Erizzo",
  "Gradenigo",
  "Diedo",
  "Lando",
  "Marcello",
  "Mastropiero",
  "Molin",
  "Nani",
  "Pesaro",
  "Renier",
  "Ruzzini",
  "Sagredo",
  "Tron",
  "Dolfin",
  "Zane",
  "Zorzi",
  "Barbaro",
  "Bragadin",
  "Celsi",
  "Emo",
  "Flangini",
  "Minotto",
];

/** Play styles in the order bots are recruited, so that any small group covers every trade. */
const ROSTER: { profile: ProfileName; region: string }[] = [
  { profile: "producer", region: "terraferma" },
  { profile: "builder", region: "lagoon" },
  { profile: "builder", region: "dolomites" },
  { profile: "artisan", region: "terraferma" },
  { profile: "producer", region: "lagoon" },
  { profile: "producer", region: "dolomites" },
  { profile: "speculator", region: "terraferma" },
  { profile: "casual", region: "lagoon" },
  { profile: "artisan", region: "terraferma" },
  { profile: "casual", region: "dolomites" },
];

/** At most one bot steps aside per hour, so a passing visitor does not empty the world. */
const RETIRE_EVERY_MS = HOUR_MS;

interface Running {
  bot: Bot;
  sessions: number[];
}

/**
 * Keeps the world at its target population (settings.bots.population) with computer-run merchants
 * while few people play. Bots act through the engine like players (GameWorld.batch); they are
 * marked as bots in the database and retire as people arrive.
 */
export class BotRunner {
  private running = new Map<string, Running>();
  private retired = new Set<string>();
  private lastRetireAt = 0;
  private timer: NodeJS.Timeout | undefined;
  private readonly rng: Rng;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
    seed = Date.now(),
  ) {
    this.rng = new Rng(seed);
  }

  /** Bots of this world (active and retired), loaded from the database. */
  async load(): Promise<void> {
    const rows = await this.db
      .select({ id: players.accountId, profile: players.botProfile, retiredAt: players.retiredAt })
      .from(players)
      .where(and(eq(players.worldId, this.world.id), isNotNull(players.botProfile)));
    for (const row of rows) {
      const player = this.world.current.players[row.id];
      if (!player) continue;
      if (row.retiredAt) this.retired.add(row.id);
      else this.running.set(row.id, this.wrap(row.id, row.profile, player.region));
    }
    await this.renameFamilyHouses();
  }

  /** Houses named after a patrician family (older versions) take a free name instead. */
  private async renameFamilyHouses(): Promise<void> {
    const families = new Set(FAMILY_NAMES.map((f) => `casa ${f}`.toLowerCase()));
    const bots = await this.db
      .select({ id: accounts.id, pseudo: accounts.pseudo })
      .from(accounts)
      .where(eq(accounts.isBot, true));
    for (const bot of bots) {
      if (!families.has(bot.pseudo?.toLowerCase() ?? "")) continue;
      const name = await this.freeHouseName();
      if (!name) return;
      await this.db.update(accounts).set({ pseudo: name }).where(eq(accounts.id, bot.id));
    }
  }

  /** The first house name nobody has taken, never a patrician family's. */
  private async freeHouseName(): Promise<string | undefined> {
    const taken = new Set(
      (await this.db.select({ pseudo: accounts.pseudo }).from(accounts)).map((r) =>
        r.pseudo?.toLowerCase(),
      ),
    );
    const families = new Set(FAMILY_NAMES.map((f) => f.toLowerCase()));
    return HOUSES.filter((h) => !families.has(h.toLowerCase()))
      .map((h) => `Casa ${h}`)
      .find((name) => !taken.has(name.toLowerCase()));
  }

  /**
   * A new season has opened: the trading houses of the last one come back first, under the same
   * names, starting afresh like everyone else.
   */
  async newSeason(closedWorldId: string): Promise<void> {
    const rows = await this.db
      .select({ id: players.accountId, profile: players.botProfile, region: players.region })
      .from(players)
      .where(and(eq(players.worldId, closedWorldId), isNotNull(players.botProfile)));
    this.running.clear();
    this.retired.clear();
    this.veterans = rows.map((r) => ({
      id: r.id,
      profile: r.profile ?? "producer",
      region: r.region,
    }));
  }

  private veterans: { id: string; profile: string; region: string }[] = [];

  /** Accounts of every bot, retired ones included. */
  get ids(): Set<string> {
    return new Set([...this.running.keys(), ...this.retired]);
  }

  /** Bots still playing (shown in the rankings). */
  get active(): Set<string> {
    return new Set(this.running.keys());
  }

  private wrap(id: string, profile: string | null, region: string): Running {
    const p = PROFILES[(profile ?? "producer") as ProfileName] ?? PROFILES.producer;
    // Next to people, bots leave the market maker's stock to them and sell on the book.
    return {
      bot: new Bot(id, p, region, 0, { spareMarketMaker: true, generous: true }),
      sessions: [],
    };
  }

  start(intervalMs = 60_000, onError: (err: unknown) => void = console.error): void {
    this.stop();
    const step = () => this.step().catch(onError);
    void step();
    this.timer = setInterval(step, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** One pass: adjust the population, then play the sessions that are due. */
  async step(): Promise<void> {
    const now = this.world.now();
    const { ctx } = this.world;
    const state = this.world.current;
    let humans = 0;
    for (const p of Object.values(state.players)) {
      if (!this.running.has(p.id) && !this.retired.has(p.id) && isActive(ctx, p, now)) humans++;
    }
    const wanted = botsWanted(ctx.settings, humans);
    if (this.running.size < wanted) await this.recruit(now);
    else if (this.running.size > wanted && now - this.lastRetireAt >= RETIRE_EVERY_MS) {
      await this.retire(now);
    }

    for (const r of this.running.values()) {
      if (r.sessions.length === 0) r.sessions = this.plan(r.bot, now);
      if ((r.sessions[0] ?? Number.POSITIVE_INFINITY) > now) continue;
      while ((r.sessions[0] ?? Number.POSITIVE_INFINITY) <= now) r.sessions.shift();
      await this.play(r.bot);
    }
  }

  /** Today's remaining sessions, or tomorrow's. */
  private plan(bot: Bot, now: number): number[] {
    const today = Math.floor(now / DAY_MS) * DAY_MS;
    const left = bot.planDay(this.rng, today).filter((t) => t > now);
    return left.length > 0 ? left : bot.planDay(this.rng, today + DAY_MS);
  }

  private async play(bot: Bot): Promise<void> {
    await this.world.batch(({ act, state, now }) => {
      bot.play({
        ctx: this.world.ctx,
        state,
        now,
        market: new MarketView(this.world.ctx, state, () => now),
        rng: this.rng,
        act,
      });
    });
  }

  /** Brings back a retired bot, or creates a new trading house. */
  private async recruit(now: number): Promise<void> {
    const back = [...this.retired][0];
    if (back) {
      await this.db
        .update(players)
        .set({ retiredAt: null })
        .where(and(eq(players.worldId, this.world.id), eq(players.accountId, back)));
      this.retired.delete(back);
      const player = this.world.current.players[back];
      const [row] = await this.db
        .select({ profile: players.botProfile })
        .from(players)
        .where(and(eq(players.worldId, this.world.id), eq(players.accountId, back)));
      const r = this.wrap(back, row?.profile ?? null, player?.region ?? "terraferma");
      this.running.set(back, r);
      await this.play(r.bot);
      return;
    }

    const veteran = this.veterans.shift();
    if (veteran) {
      // Its Influence of the past seasons, spent as a merchant would before the new one.
      const patents = await botBuysPatents(
        this.db,
        this.world.ctx.settings,
        veteran.id,
        this.world.id,
        new Date(now),
      );
      const res = await this.world.execute({
        type: "join",
        playerId: veteran.id,
        region: veteran.region,
        ...(patents.length > 0 ? { patents } : {}),
      });
      if (!res.ok) return;
      await this.db
        .update(players)
        .set({ botProfile: veteran.profile })
        .where(and(eq(players.worldId, this.world.id), eq(players.accountId, veteran.id)));
      const r = this.wrap(veteran.id, veteran.profile, veteran.region);
      this.running.set(veteran.id, r);
      await this.play(r.bot);
      return;
    }

    const n = this.ids.size;
    const slot = ROSTER[n % ROSTER.length] ?? { profile: "producer", region: "terraferma" };
    const house = (await this.freeHouseName()) ?? `Casa ${n + 1}`;
    const [account] = await this.db
      .insert(accounts)
      .values({
        email: `bot-${this.world.id}-${n + 1}@bots.comptoirs.invalid`,
        pseudo: house,
        isBot: true,
        createdAt: new Date(now),
      })
      .returning({ id: accounts.id });
    if (!account) return;
    const res = await this.world.execute({
      type: "join",
      playerId: account.id,
      region: slot.region,
    });
    if (!res.ok) {
      // Registration closed: no new houses this season.
      await this.db.delete(accounts).where(eq(accounts.id, account.id));
      return;
    }
    await this.db
      .update(players)
      .set({ botProfile: slot.profile })
      .where(and(eq(players.worldId, this.world.id), eq(players.accountId, account.id)));
    const r = this.wrap(account.id, slot.profile, slot.region);
    this.running.set(account.id, r);
    await this.play(r.bot);
  }

  /** The newest bot steps aside: its orders are cancelled and it stops playing. */
  private async retire(now: number): Promise<void> {
    const id = [...this.running.keys()].pop();
    if (!id) return;
    this.running.delete(id);
    this.retired.add(id);
    this.lastRetireAt = now;
    await this.world.batch(({ act, state }) => {
      for (const o of Object.values(state().orders)) {
        if (o.playerId === id) act({ type: "cancelOrder", playerId: id, orderId: o.id });
      }
    });
    await this.db
      .update(players)
      .set({ retiredAt: new Date(now) })
      .where(and(eq(players.worldId, this.world.id), eq(players.accountId, id)));
  }
}
