import {
  type Skirmish,
  type SkirmishAction,
  type TerraConfig,
  type WorldContext,
  type WorldState,
  advanceSkirmish,
  battleBand,
  createSkirmish,
  battleRatings as moveRatings,
  skirmishAct,
  terraOn,
} from "@comptoirs/engine";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, battleRatings } from "../db/schema.js";
import { realTimes } from "./skirmish.js";
import { type TerraName, terraView } from "./terra.js";
import type { GameWorld } from "./world.js";

/** How long a finished Battle stays on show for its players. */
const SHOWN_AFTER_MS = 3 * 60_000;

/**
 * The Battle of the empire (docs/plan-terraferme-porcellana.md § 4 nonies, lot T6b): the live match
 * of the Terraferma, 12 minutes on the skirmishes' engine, its arms strictly equal (a war chest of
 * the match, nothing of the empire). A lobby always open: a match starts full (8) or a minute after
 * its first player came, the empty places taken by the computer; as many matches at once as people
 * come. Held in memory: a restart loses the matches under way, like a game of OpenFront whose
 * server falls; nothing in them is money or goods.
 */
export class BattleHub {
  /** The lobbies, one a band of cote (B3): players meet those of their level. */
  private readonly lobbies = new Map<number, { players: string[]; opensAt: number }>();
  private readonly matches = new Map<
    string,
    {
      sk: Skirmish;
      shownUntil: number;
      /** The cotes at its start, and after its end once written (B3). */
      before: Map<string, number>;
      after: Record<string, number> | null;
    }
  >();
  /** The match each player is in (until its showing ends). */
  private readonly playing = new Map<string, string>();
  private seq = 0;
  private timer: NodeJS.Timeout | undefined;
  /** The cotes' writes, one after the other. */
  private writes: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
  ) {}

  start(): void {
    this.timer = setInterval(() => this.step(this.world.now()), 1_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** The cotes written so far (the tests wait on them). */
  flush(): Promise<void> {
    return this.writes.then(() => undefined);
  }

  /** The Terraferma's settings with a skirmish: the Battle's; null when it is off. */
  private cfg(): TerraConfig | null {
    const cfg = terraOn(this.world.ctx);
    return cfg?.skirmish ? cfg : null;
  }

  /** A player's cote (the newcomer's start without one). */
  async ratingOf(playerId: string): Promise<number> {
    const start = this.cfg()?.skirmish?.rating?.start ?? 1_000;
    const [row] = await this.db
      .select({ rating: battleRatings.rating })
      .from(battleRatings)
      .where(and(eq(battleRatings.worldId, this.world.id), eq(battleRatings.accountId, playerId)));
    return row?.rating ?? start;
  }

  /** The lobbies launched when full or past their minute; the matches played; the shown let go. */
  step(now: number): void {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return;
    for (const [band, lobby] of this.lobbies)
      if (
        lobby.players.length >= cfg.skirmish.players ||
        now >= lobby.opensAt + cfg.skirmish.lobbySeconds * 1_000
      )
        void this.launch(cfg, band, now);
    for (const [id, m] of this.matches) {
      advanceSkirmish(m.sk, now);
      if (m.sk.result && m.shownUntil === 0) {
        m.shownUntil = now + SHOWN_AFTER_MS;
        this.rate(cfg, m);
      }
      if (m.shownUntil > 0 && now >= m.shownUntil) {
        this.matches.delete(id);
        for (const p of m.sk.humans) if (this.playing.get(p) === id) this.playing.delete(p);
      }
    }
  }

  private async launch(cfg: TerraConfig, band: number, now: number): Promise<void> {
    const lobby = this.lobbies.get(band);
    this.lobbies.delete(band);
    if (!lobby || lobby.players.length === 0) return;
    const id = `${now}:${++this.seq}`;
    const sk = createSkirmish(cfg, `${this.world.id}:battle:${id}`, lobby.players, now);
    const before = new Map<string, number>();
    this.matches.set(id, { sk, shownUntil: 0, before, after: null });
    for (const p of lobby.players) this.playing.set(p, id);
    for (const p of lobby.players) before.set(p, await this.ratingOf(p));
  }

  /** Its end: the cotes moved by the ranks, written (the computer's houses fixed). */
  private rate(
    cfg: TerraConfig,
    m: { sk: Skirmish; before: Map<string, number> } & { after: Record<string, number> | null },
  ): void {
    const rating = cfg.skirmish?.rating;
    if (!rating || !m.sk.result) return;
    const ranked = m.sk.result.ranking.map((r) => ({
      id: r.id,
      rating: r.id.startsWith("bot:") ? rating.botRating : (m.before.get(r.id) ?? rating.start),
    }));
    const after = moveRatings(ranked, rating);
    m.after = after;
    const at = new Date(this.world.now());
    this.writes = this.writes
      .then(async () => {
        for (const [accountId, value] of Object.entries(after))
          await this.db
            .insert(battleRatings)
            .values({ worldId: this.world.id, accountId, rating: value, matches: 1, updatedAt: at })
            .onConflictDoUpdate({
              target: [battleRatings.worldId, battleRatings.accountId],
              set: { rating: value, matches: sql`${battleRatings.matches} + 1`, updatedAt: at },
            });
      })
      .catch(console.error);
  }

  /** Joins the lobby of its band (opened by the first one); a player in a match may not. */
  async join(playerId: string, now: number): Promise<"ok" | "battle_off" | "already_playing"> {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return "battle_off";
    this.step(now);
    const m = this.matchOf(playerId);
    if (m && !m.sk.result) return "already_playing";
    if (m) this.playing.delete(playerId);
    const rating = cfg.skirmish.rating;
    const band = rating ? battleBand(rating, await this.ratingOf(playerId)) : 0;
    for (const l of this.lobbies.values()) l.players = l.players.filter((p) => p !== playerId);
    const lobby = this.lobbies.get(band) ?? { players: [], opensAt: now };
    this.lobbies.set(band, lobby);
    lobby.players.push(playerId);
    if (lobby.players.length >= cfg.skirmish.players) await this.launch(cfg, band, now);
    return "ok";
  }

  /** Leaves its lobby, or lets go of a finished match. */
  leave(playerId: string): void {
    for (const l of this.lobbies.values()) l.players = l.players.filter((p) => p !== playerId);
    const m = this.matchOf(playerId);
    if (m?.sk.result) this.playing.delete(playerId);
  }

  /** An order on the player's match; whether it went through. */
  act(playerId: string, action: SkirmishAction, now: number): boolean {
    const m = this.matchOf(playerId);
    if (!m) return false;
    return skirmishAct(m.sk, playerId, action, now);
  }

  private matchOf(playerId: string) {
    const id = this.playing.get(playerId);
    return id ? this.matches.get(id) : undefined;
  }

  /** The public ranking of the cotes (B3): the first ones, and the player's place. */
  async ranking(playerId: string | null, limit = 20) {
    const rows = await this.db
      .select({
        id: battleRatings.accountId,
        rating: battleRatings.rating,
        matches: battleRatings.matches,
        pseudo: accounts.pseudo,
      })
      .from(battleRatings)
      .innerJoin(accounts, eq(accounts.id, battleRatings.accountId))
      .where(eq(battleRatings.worldId, this.world.id))
      .orderBy(desc(battleRatings.rating), desc(battleRatings.matches))
      .limit(limit);
    return rows.map((r, k) => ({
      rank: k + 1,
      pseudo: r.pseudo,
      rating: r.rating,
      matches: r.matches,
      me: r.id === playerId,
    }));
  }

  /** What the player sees: nothing, the lobby, its match live or ended. */
  async state(playerId: string, now: number) {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return { phase: "off" as const };
    this.step(now);
    const sk = cfg.skirmish;
    const m = this.matchOf(playerId);
    if (!m) {
      const lobby = [...this.lobbies.values()].find((l) => l.players.includes(playerId));
      return {
        phase: lobby ? ("lobby" as const) : ("none" as const),
        minutes: sk.minutes,
        players: sk.players,
        waiting: lobby?.players.length ?? 0,
        startsAt: lobby ? lobby.opensAt + sk.lobbySeconds * 1_000 : null,
        rating: await this.ratingOf(playerId),
      };
    }
    const names = await this.names(m.sk);
    const ctx: WorldContext = {
      ...this.world.ctx,
      settings: { ...this.world.ctx.settings, terraferma: { ...m.sk.cfg, live: true } },
    };
    const state = { terra: { week: 0, map: m.sk.state } } as unknown as WorldState;
    const view = terraView(ctx, state, playerId, m.sk.state.clock, names);
    // The chest fills every few minutes of real time, not each morning (the match's own time).
    const every = m.sk.cfg.chest?.everyMinutes;
    if (view?.me?.chest && every)
      view.me.chest = {
        ...view.me.chest,
        everyMinutes: Math.max(1, Math.round(every / m.sk.speed)),
      };
    return {
      phase: m.sk.result ? ("done" as const) : ("playing" as const),
      minutes: sk.minutes,
      players: sk.players,
      endsAt: m.sk.endsAt,
      view: view ? realTimes(m.sk, view, m.sk.endsAt) : null,
      // The cote at its start, and after its end once moved (B3).
      rating: m.before.get(playerId) ?? null,
      ratingAfter: m.after?.[playerId] ?? null,
      result: m.sk.result
        ? m.sk.result.ranking.map((r) => ({
            pseudo: names.get(r.id)?.pseudo ?? null,
            bot: names.get(r.id)?.bot ?? false,
            me: r.id === playerId,
            cells: r.cells,
          }))
        : null,
    };
  }

  /** The players' names; the computer's houses as condottieri. */
  private async names(sk: Skirmish): Promise<Map<string, TerraName>> {
    const out = new Map<string, TerraName>();
    const ids = Object.keys(sk.state.players).filter((id) => /^[0-9a-f-]{36}$/.test(id));
    if (ids.length > 0) {
      const rows = await this.db
        .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
        .from(accounts)
        .where(inArray(accounts.id, ids));
      for (const r of rows) out.set(r.id, { pseudo: r.pseudo, crest: r.crest, bot: false });
    }
    for (const id of Object.keys(sk.state.players))
      if (id.startsWith("bot:"))
        out.set(id, { pseudo: `Condottiere ${id.slice(4)}`, crest: null, bot: true });
    return out;
  }
}
