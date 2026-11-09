import { createHash, randomInt } from "node:crypto";
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
/** How long a private room waits for its host before it closes. */
const ROOM_OPEN_MS = 20 * 60_000;
/** A room's code: six letters a friend reads aloud without a doubt (no 0/O, 1/I). */
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A guest's id, from the token of its cookie (never shown: the id alone is). */
export const guestId = (token: string) =>
  `guest:${createHash("sha256").update(token).digest("hex").slice(0, 20)}`;
export const isGuest = (id: string) => id.startsWith("guest:");
/** An account's id (a uuid): its cote is written. */
const isAccount = (id: string) => /^[0-9a-f-]{36}$/.test(id);

const GUEST_FIRST = [
  "Pietro",
  "Marco",
  "Zuane",
  "Alvise",
  "Nicolò",
  "Bortolo",
  "Lucia",
  "Elena",
  "Caterina",
  "Isabetta",
  "Polo",
  "Bianca",
];
const GUEST_PLACE = [
  "da Chioggia",
  "da Murano",
  "da Burano",
  "da Mestre",
  "da Padova",
  "da Treviso",
  "da Rovigo",
  "da Bassano",
  "da Vicenza",
  "da Feltre",
  "da Torcello",
  "da Caorle",
];
/** A guest's name, drawn by lot from its id (the same each match). */
export function guestName(id: string): string {
  const h = Number.parseInt(id.slice(6, 14), 16) || 0;
  const first = GUEST_FIRST[h % GUEST_FIRST.length];
  const place = GUEST_PLACE[Math.floor(h / GUEST_FIRST.length) % GUEST_PLACE.length];
  return `${first} ${place}`;
}

/** A lobby: a band of cote (public, launched full or after its minute) or a private room. */
interface Lobby {
  players: string[];
  opensAt: number;
  /** A private room (B4): its code and host; launched by the host, unranked. */
  room?: { code: string; host: string };
}

/**
 * The Battle of the empire (docs/plan-terraferme-porcellana.md § 4 nonies, lot T6b): the live match
 * of the Terraferma, 12 minutes on the skirmishes' engine, its arms strictly equal (a war chest of
 * the match, nothing of the empire). A lobby always open: a match starts full (8) or a minute after
 * its first player came, the empty places taken by the computer; as many matches at once as people
 * come. Held in memory: a restart loses the matches under way, like a game of OpenFront whose
 * server falls; nothing in them is money or goods.
 */
export class BattleHub {
  /** The lobbies: `band:N`, one a band of cote (B3), and `room:CODE`, the private rooms (B4). */
  private readonly lobbies = new Map<string, Lobby>();
  /** The guests' cotes, in memory (B4): taken by the account they make, else lost. */
  private readonly guestRatings = new Map<string, { rating: number; matches: number }>();
  private readonly matches = new Map<
    string,
    {
      sk: Skirmish;
      shownUntil: number;
      /** A public match moves the cotes; a private room's does not (B4). */
      ranked: boolean;
      /** The cotes at its start, and after its end once written (B3). */
      before: Map<string, number>;
      after: Record<string, number> | null;
      /** The Glory it brought to each one's week (B5), once paid. */
      glory: Record<string, number> | null;
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
    if (!isAccount(playerId)) return this.guestRatings.get(playerId)?.rating ?? start;
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
    for (const [key, lobby] of this.lobbies) {
      if (lobby.players.length >= cfg.skirmish.players) void this.launch(cfg, key, now);
      else if (lobby.room) {
        if (now >= lobby.opensAt + ROOM_OPEN_MS) this.lobbies.delete(key);
      } else if (now >= lobby.opensAt + cfg.skirmish.lobbySeconds * 1_000)
        void this.launch(cfg, key, now);
    }
    for (const [id, m] of this.matches) {
      advanceSkirmish(m.sk, now);
      if (m.sk.result && m.shownUntil === 0) {
        m.shownUntil = now + SHOWN_AFTER_MS;
        if (m.ranked) {
          this.rate(cfg, m);
          this.payGlory(id, m);
        }
      }
      if (m.shownUntil > 0 && now >= m.shownUntil) {
        this.matches.delete(id);
        for (const p of m.sk.humans) if (this.playing.get(p) === id) this.playing.delete(p);
      }
    }
  }

  private async launch(cfg: TerraConfig, key: string, now: number): Promise<void> {
    const lobby = this.lobbies.get(key);
    this.lobbies.delete(key);
    if (!lobby || lobby.players.length === 0) return;
    const id = `${now}:${++this.seq}`;
    const sk = createSkirmish(cfg, `${this.world.id}:battle:${id}`, lobby.players, now);
    const before = new Map<string, number>();
    this.matches.set(id, {
      sk,
      shownUntil: 0,
      ranked: !lobby.room,
      before,
      after: null,
      glory: null,
    });
    for (const p of lobby.players) this.playing.set(p, id);
    for (const p of lobby.players) before.set(p, await this.ratingOf(p));
  }

  /**
   * Its end, a ranked match (B5): the ranks among the merchants bring their Glory to the week's
   * theatre of each, the first ranked Battle of its day; the engine decides who is paid.
   */
  private payGlory(id: string, m: { sk: Skirmish; glory: Record<string, number> | null }): void {
    const table = m.sk.cfg.skirmish?.glory ?? [];
    const merchants = (m.sk.result?.ranking ?? []).filter((r) => isAccount(r.id));
    const matchId = `battle:${id}`;
    this.writes = this.writes
      .then(async () => {
        const res = await this.world.execute({
          type: "battleGlory",
          matchId,
          ranks: merchants.map((r, k) => ({ playerId: r.id, glory: table[k] ?? 0 })),
        });
        m.glory = res.ok ? (this.world.current.empire?.terra?.battlePaid?.[matchId] ?? {}) : {};
      })
      .catch(console.error);
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
    // A guest's cote is kept in memory, for the account it may make (B4).
    for (const [id, value] of Object.entries(after))
      if (!isAccount(id))
        this.guestRatings.set(id, {
          rating: value,
          matches: (this.guestRatings.get(id)?.matches ?? 0) + 1,
        });
    this.writes = this.writes
      .then(async () => {
        for (const [accountId, value] of Object.entries(after)) {
          if (!isAccount(accountId)) continue;
          await this.db
            .insert(battleRatings)
            .values({ worldId: this.world.id, accountId, rating: value, matches: 1, updatedAt: at })
            .onConflictDoUpdate({
              target: [battleRatings.worldId, battleRatings.accountId],
              set: { rating: value, matches: sql`${battleRatings.matches} + 1`, updatedAt: at },
            });
        }
      })
      .catch(console.error);
  }

  /**
   * Joins the lobby of its band (opened by the first one), or the private room of a code (B4); a
   * player in a match may not.
   */
  async join(
    playerId: string,
    now: number,
    room?: string,
  ): Promise<"ok" | "battle_off" | "already_playing" | "no_battle_room"> {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return "battle_off";
    this.step(now);
    const m = this.matchOf(playerId);
    if (m && !m.sk.result) return "already_playing";
    let key: string;
    if (room !== undefined) {
      key = `room:${room.toUpperCase()}`;
      if (!this.lobbies.has(key)) return "no_battle_room";
    } else {
      const rating = cfg.skirmish.rating;
      key = `band:${rating ? battleBand(rating, await this.ratingOf(playerId)) : 0}`;
    }
    if (m) this.playing.delete(playerId);
    this.leaveLobbies(playerId);
    const lobby = this.lobbies.get(key) ?? { players: [], opensAt: now };
    this.lobbies.set(key, lobby);
    if (!lobby.players.includes(playerId)) lobby.players.push(playerId);
    if (lobby.players.length >= cfg.skirmish.players) await this.launch(cfg, key, now);
    return "ok";
  }

  /** Opens a private room (B4), the player its host; its code to share. */
  openRoom(playerId: string, now: number): "ok" | "battle_off" | "already_playing" {
    if (!this.cfg()?.skirmish) return "battle_off";
    this.step(now);
    const m = this.matchOf(playerId);
    if (m && !m.sk.result) return "already_playing";
    if (m) this.playing.delete(playerId);
    this.leaveLobbies(playerId);
    let code = "";
    do
      code = Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join("");
    while (this.lobbies.has(`room:${code}`));
    this.lobbies.set(`room:${code}`, {
      players: [playerId],
      opensAt: now,
      room: { code, host: playerId },
    });
    return "ok";
  }

  /** Its host launches a private room, the empty places taken by the computer. */
  async startRoom(playerId: string, now: number): Promise<"ok" | "battle_off" | "not_host"> {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return "battle_off";
    const entry = [...this.lobbies].find(([, l]) => l.room?.host === playerId);
    if (!entry) return "not_host";
    await this.launch(cfg, entry[0], now);
    return "ok";
  }

  private leaveLobbies(playerId: string): void {
    for (const [key, l] of this.lobbies) {
      l.players = l.players.filter((p) => p !== playerId);
      // A room its host leaves closes; an empty one too.
      if (l.room && (l.room.host === playerId || l.players.length === 0)) this.lobbies.delete(key);
    }
  }

  /** Leaves its lobby, or lets go of a finished match. */
  leave(playerId: string): void {
    this.leaveLobbies(playerId);
    const m = this.matchOf(playerId);
    if (m?.sk.result) this.playing.delete(playerId);
  }

  /**
   * The account made from a guest's browser takes its cote (B4), when it has none of its own;
   * whether there was one to take.
   */
  async adopt(guest: string, accountId: string): Promise<boolean> {
    const kept = this.guestRatings.get(guest);
    this.guestRatings.delete(guest);
    if (!kept) return false;
    await this.flush();
    const at = new Date(this.world.now());
    const done = await this.db
      .insert(battleRatings)
      .values({
        worldId: this.world.id,
        accountId,
        rating: kept.rating,
        matches: kept.matches,
        updatedAt: at,
      })
      .onConflictDoNothing()
      .returning({ id: battleRatings.accountId });
    return done.length > 0;
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
    const guest = !isAccount(playerId);
    if (!m) {
      const lobby = [...this.lobbies.values()].find((l) => l.players.includes(playerId));
      return {
        phase: lobby ? ("lobby" as const) : ("none" as const),
        minutes: sk.minutes,
        players: sk.players,
        waiting: lobby?.players.length ?? 0,
        // A private room waits for its host: no countdown.
        startsAt: lobby && !lobby.room ? lobby.opensAt + sk.lobbySeconds * 1_000 : null,
        rating: await this.ratingOf(playerId),
        guest,
        name: guest ? guestName(playerId) : null,
        room: lobby?.room?.code ?? null,
        host: lobby?.room ? lobby.room.host === playerId : false,
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
      guest,
      ranked: m.ranked,
      view: view ? realTimes(m.sk, view, m.sk.endsAt) : null,
      // The cote at its start, and after its end once moved (B3).
      rating: m.before.get(playerId) ?? null,
      // The Glory brought to the player's week (B5): null before it is paid, 0 if none.
      glory: m.glory ? (m.glory[playerId] ?? 0) : null,
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
      else if (isGuest(id)) out.set(id, { pseudo: guestName(id), crest: null, bot: false });
    return out;
  }
}
