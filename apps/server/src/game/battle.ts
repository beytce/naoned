import {
  type Skirmish,
  type SkirmishAction,
  type TerraConfig,
  type WorldContext,
  type WorldState,
  advanceSkirmish,
  createSkirmish,
  skirmishAct,
  terraOn,
} from "@comptoirs/engine";
import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
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
  private lobby: { players: string[]; opensAt: number } | null = null;
  private readonly matches = new Map<string, { sk: Skirmish; shownUntil: number }>();
  /** The match each player is in (until its showing ends). */
  private readonly playing = new Map<string, string>();
  private seq = 0;
  private timer: NodeJS.Timeout | undefined;

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

  /** The Terraferma's settings with a skirmish: the Battle's; null when it is off. */
  private cfg(): TerraConfig | null {
    const cfg = terraOn(this.world.ctx);
    return cfg?.skirmish ? cfg : null;
  }

  /** The lobby launched when full or past its minute; the matches played; the shown ones let go. */
  step(now: number): void {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return;
    const lobby = this.lobby;
    if (
      lobby &&
      (lobby.players.length >= cfg.skirmish.players ||
        now >= lobby.opensAt + cfg.skirmish.lobbySeconds * 1_000)
    )
      this.launch(cfg, now);
    for (const [id, m] of this.matches) {
      advanceSkirmish(m.sk, now);
      if (m.sk.result && m.shownUntil === 0) m.shownUntil = now + SHOWN_AFTER_MS;
      if (m.shownUntil > 0 && now >= m.shownUntil) {
        this.matches.delete(id);
        for (const p of m.sk.humans) if (this.playing.get(p) === id) this.playing.delete(p);
      }
    }
  }

  private launch(cfg: TerraConfig, now: number): void {
    const lobby = this.lobby;
    this.lobby = null;
    if (!lobby || lobby.players.length === 0) return;
    const id = `${now}:${++this.seq}`;
    const sk = createSkirmish(cfg, `${this.world.id}:battle:${id}`, lobby.players, now);
    this.matches.set(id, { sk, shownUntil: 0 });
    for (const p of lobby.players) this.playing.set(p, id);
  }

  /** Joins the lobby (opened by the first one); a player in a match under way may not. */
  join(playerId: string, now: number): "ok" | "battle_off" | "already_playing" {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return "battle_off";
    this.step(now);
    const m = this.matchOf(playerId);
    if (m && !m.sk.result) return "already_playing";
    if (m) this.playing.delete(playerId);
    this.lobby ??= { players: [], opensAt: now };
    if (!this.lobby.players.includes(playerId)) this.lobby.players.push(playerId);
    if (this.lobby.players.length >= cfg.skirmish.players) this.launch(cfg, now);
    return "ok";
  }

  /** Leaves the lobby, or lets go of a finished match. */
  leave(playerId: string): void {
    if (this.lobby) this.lobby.players = this.lobby.players.filter((p) => p !== playerId);
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

  /** What the player sees: nothing, the lobby, its match live or ended. */
  async state(playerId: string, now: number) {
    const cfg = this.cfg();
    if (!cfg?.skirmish) return { phase: "off" as const };
    this.step(now);
    const sk = cfg.skirmish;
    const m = this.matchOf(playerId);
    if (!m) {
      const lobby = this.lobby;
      return {
        phase: lobby?.players.includes(playerId) ? ("lobby" as const) : ("none" as const),
        minutes: sk.minutes,
        players: sk.players,
        waiting: lobby?.players.length ?? 0,
        startsAt: lobby ? lobby.opensAt + sk.lobbySeconds * 1_000 : null,
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
