import { randomUUID } from "node:crypto";
import {
  type Condotta,
  type SkirmishAction,
  type WorldContext,
  type WorldState,
  advanceCondotta,
  condottaAct,
  condottaLevelAfter,
  createCondotta,
  groupCondottaLevel,
} from "@comptoirs/engine";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, telemetry } from "../db/schema.js";
import { companyIdOf } from "./company.js";
import { realTimes } from "./skirmish.js";
import { type TerraName, terraView } from "./terra.js";
import type { GameWorld } from "./world.js";

/** How long a finished Condotta stays on show. */
const SHOWN_AFTER_MS = 3 * 60_000;

/**
 * The grade a merchant's best Condotta gives (cosmetic, on the profile): the only reward of the
 * mode with the `condotta_won` event of the missions (the owner's decision of 24 October 2026).
 */
export const CONDOTTA_GRADES = [
  { from: 10, code: "capitano_generale", name: "Capitano generale" },
  { from: 7, code: "capitano", name: "Capitano di ventura" },
  { from: 4, code: "condottiere", name: "Condottiere" },
  { from: 1, code: "ventura", name: "Condottiere di ventura" },
] as const;

export function condottaGrade(best: number) {
  return CONDOTTA_GRADES.find((g) => best >= g.from) ?? null;
}

export type CondottaRefusal = "condotta_off" | "already_in" | "no_company" | "lobby_full";

interface Lobby {
  id: string;
  company: string | null;
  host: string;
  members: string[];
  opensAt: number;
}

interface Match {
  id: string;
  c: Condotta;
  company: string | null;
  paid: boolean;
}

/**
 * The Condotta's matches (E2-5 of the experts): each group its own, played in memory like a
 * skirmish. Alone it starts at once; « with my company » it waits a minute for the company's
 * merchants to join. A win opens the next level to each member and tells the world, for the
 * missions; nothing is paid. A restart loses the matches under way, nothing to undo.
 */
export class CondottaHub {
  private lobbies = new Map<string, Lobby>();
  private matches = new Map<string, Match>();
  private timer: NodeJS.Timeout | undefined;
  private seq = 0;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
  ) {}

  private get cfg() {
    const cfg = this.world.ctx.settings.terraferma;
    return cfg?.live && cfg.condotta ? cfg : null;
  }

  start(intervalMs = 1_000): void {
    this.stop();
    this.timer = setInterval(
      () => void this.step(this.world.now()).catch(console.error),
      intervalMs,
    );
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private lobbyOf(accountId: string) {
    return [...this.lobbies.values()].find((l) => l.members.includes(accountId)) ?? null;
  }

  private matchOf(accountId: string) {
    return [...this.matches.values()].find((m) => m.c.humans.includes(accountId)) ?? null;
  }

  /** Alone, at once; with the merchant's company, a lobby its members may join for a minute. */
  async open(
    accountId: string,
    withCompany: boolean,
    now: number,
  ): Promise<true | CondottaRefusal> {
    const cfg = this.cfg;
    if (!cfg?.condotta) return "condotta_off";
    const live = this.matchOf(accountId);
    if (this.lobbyOf(accountId) || (live && !live.c.result)) return "already_in";
    const company = withCompany ? await companyIdOf(this.db, accountId) : null;
    if (withCompany && !company) return "no_company";
    const lobby: Lobby = {
      id: randomUUID(),
      company,
      host: accountId,
      members: [accountId],
      opensAt: company ? now + cfg.condotta.lobbySeconds * 1_000 : now,
    };
    this.lobbies.set(lobby.id, lobby);
    if (!company) await this.launch(lobby, now);
    return true;
  }

  /** A member of the company joins its lobby. */
  async join(accountId: string, lobbyId: string, now: number): Promise<true | CondottaRefusal> {
    const cfg = this.cfg;
    if (!cfg?.condotta) return "condotta_off";
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || !lobby.company || (await companyIdOf(this.db, accountId)) !== lobby.company)
      return "no_company";
    if (lobby.members.includes(accountId)) return true;
    const live = this.matchOf(accountId);
    if (this.lobbyOf(accountId) || (live && !live.c.result)) return "already_in";
    if (lobby.members.length >= cfg.condotta.maxPlayers) return "lobby_full";
    lobby.members.push(accountId);
    if (lobby.members.length >= cfg.condotta.maxPlayers) await this.launch(lobby, now);
    return true;
  }

  /** The lobby's match, at the highest level open to all its members. */
  private async launch(lobby: Lobby, now: number): Promise<void> {
    const cfg = this.cfg;
    this.lobbies.delete(lobby.id);
    if (!cfg) return;
    // A finished match of these merchants gives way to the new one.
    for (const id of lobby.members) {
      const old = this.matchOf(id);
      if (old) this.matches.delete(old.id);
    }
    const levels = await this.levels(lobby.members);
    const level = groupCondottaLevel(lobby.members.map((id) => levels.get(id)?.level ?? 1));
    const c = createCondotta(
      cfg,
      `${this.world.id}:condotta:${++this.seq}:${now}`,
      lobby.members,
      level,
      now,
    );
    this.matches.set(lobby.id, { id: lobby.id, c, company: lobby.company, paid: false });
  }

  private async levels(ids: string[]) {
    if (ids.length === 0) return new Map<string, { level: number; best: number }>();
    const rows = await this.db
      .select({ id: accounts.id, level: accounts.condottaLevel, best: accounts.condottaBest })
      .from(accounts)
      .where(inArray(accounts.id, ids));
    return new Map(rows.map((r) => [r.id, { level: r.level, best: r.best }]));
  }

  /** Lobbies whose minute is up start; matches are played; a win opens the next level. */
  async step(now: number): Promise<void> {
    for (const lobby of [...this.lobbies.values()])
      if (now >= lobby.opensAt) await this.launch(lobby, now);
    for (const m of [...this.matches.values()]) {
      advanceCondotta(m.c, now);
      if (m.c.result && !m.paid) {
        m.paid = true;
        await this.settle(m, now);
      }
      if (m.c.result && now > m.c.endsAt + SHOWN_AFTER_MS) this.matches.delete(m.id);
    }
  }

  private async settle(m: Match, now: number): Promise<void> {
    const result = m.c.result;
    if (!result) return;
    const max = this.cfg?.condotta?.levels ?? 12;
    const levels = await this.levels(m.c.humans);
    for (const id of m.c.humans) {
      const mine = levels.get(id) ?? { level: 1, best: 0 };
      const level = condottaLevelAfter(mine.level, m.c.level, result.won, max);
      const best = result.won ? Math.max(mine.best, m.c.level) : mine.best;
      if (level !== mine.level || best !== mine.best)
        await this.db
          .update(accounts)
          .set({ condottaLevel: level, condottaBest: best })
          .where(eq(accounts.id, id));
    }
    // The missions hear of it; nothing else (no ducats, no goods, no Glory).
    const merchants = m.c.humans.filter((id) => id in this.world.current.players);
    if (result.won && merchants.length > 0)
      await this.world.execute({ type: "condottaWon", playerIds: merchants, level: m.c.level });
    await this.db.insert(telemetry).values(
      m.c.humans.map((accountId) => ({
        accountId,
        worldId: this.world.id,
        type: "condotta_played",
        at: new Date(now),
        props: {
          level: m.c.level,
          won: result.won,
          shareBps: result.shareBps,
          holdsCity: result.holdsCity,
          players: m.c.humans.length,
          company: m.company !== null,
        },
      })),
    );
  }

  act(accountId: string, action: SkirmishAction, now: number): boolean {
    const m = this.matchOf(accountId);
    return !!m && condottaAct(m.c, accountId, action, now);
  }

  /** What a merchant sees: its level and grade, a lobby, or its match as a map in real times. */
  async status(accountId: string, now: number) {
    const cfg = this.cfg;
    if (!cfg?.condotta) return { phase: "off" as const };
    const mine = (await this.levels([accountId])).get(accountId) ?? { level: 1, best: 0 };
    const grade = condottaGrade(mine.best);
    const me = {
      level: mine.level,
      best: mine.best,
      levels: cfg.condotta.levels,
      grade: grade ? { code: grade.code, name: grade.name } : null,
      minutes: cfg.condotta.minutes,
      holdShareBps: cfg.condotta.holdShareBps,
      maxPlayers: cfg.condotta.maxPlayers,
    };
    const m = this.matchOf(accountId);
    if (m) {
      advanceCondotta(m.c, now);
      const names = await this.names(m.c);
      const ctx: WorldContext = {
        ...this.world.ctx,
        settings: { ...this.world.ctx.settings, terraferma: { ...m.c.cfg, live: true } },
      };
      const state = { terra: { week: 0, map: m.c.state } } as unknown as WorldState;
      const view = terraView(ctx, state, accountId, m.c.state.clock, names);
      return {
        phase: m.c.result ? ("done" as const) : ("playing" as const),
        endsAt: m.c.endsAt,
        playedLevel: m.c.level,
        holdCell: m.c.holdCell,
        players: m.c.humans.map((id) => names.get(id)?.pseudo ?? null),
        result: m.c.result ?? null,
        view: view ? realTimes(m.c, view, m.c.endsAt) : null,
        ...me,
      };
    }
    const lobby = this.lobbyOf(accountId);
    // The company's lobby open now, for its members to join.
    const company = await companyIdOf(this.db, accountId);
    const open =
      lobby ?? [...this.lobbies.values()].find((l) => l.company !== null && l.company === company);
    if (open) {
      const pseudos = await this.pseudos(open.members);
      return {
        phase: "lobby" as const,
        lobby: open.id,
        opensAt: open.opensAt,
        joined: open.members.includes(accountId),
        players: open.members.map((id) => pseudos.get(id) ?? null),
        ...me,
      };
    }
    return { phase: "none" as const, company: company !== null, ...me };
  }

  private async pseudos(ids: string[]) {
    if (ids.length === 0) return new Map<string, string | null>();
    const rows = await this.db
      .select({ id: accounts.id, pseudo: accounts.pseudo })
      .from(accounts)
      .where(inArray(accounts.id, ids));
    return new Map(rows.map((r) => [r.id, r.pseudo]));
  }

  /** The merchants' names, marked friends to each other (one company, or one team). */
  private async names(c: Condotta): Promise<Map<string, TerraName>> {
    const out = new Map<string, TerraName>();
    const rows =
      c.humans.length === 0
        ? []
        : await this.db
            .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
            .from(accounts)
            .where(inArray(accounts.id, c.humans));
    for (const r of rows) out.set(r.id, { pseudo: r.pseudo, crest: r.crest, bot: false });
    return out;
  }
}
