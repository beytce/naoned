import {
  type Skirmish,
  type SkirmishAction,
  type WorldContext,
  type WorldState,
  advanceSkirmish,
  createSkirmish,
  skirmishAct,
  toReal,
} from "@comptoirs/engine";
import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { type TerraName, terraView } from "./terra.js";
import type { GameWorld } from "./world.js";

/** How long a finished match stays on show. */
const SHOWN_AFTER_MS = 3 * 60_000;

/**
 * The skirmishes of the world (recommendations of 20 October 2026): one lobby, one match at a
 * time, held in memory; the ranks of the merchants who played go to the week's Terraferma
 * through a command of the world (so they are in its journal). Lost on a restart, like a game
 * of OpenFront when its server falls.
 */
export class SkirmishHub {
  private lobby: { players: string[]; opensAt: number } | null = null;
  private match: Skirmish | null = null;
  private paid = false;
  private timer: NodeJS.Timeout | undefined;
  private seq = 0;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
  ) {}

  private get cfg() {
    const cfg = this.world.ctx.settings.terraferma;
    return cfg?.live && cfg.skirmish ? cfg : null;
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

  /** The lobby opens a match when its time comes; a match is played and its ranks paid. */
  async step(now: number): Promise<void> {
    const cfg = this.cfg;
    if (!cfg) return;
    if (this.lobby && now >= this.lobby.opensAt) {
      this.match = createSkirmish(
        cfg,
        `${this.world.id}:${++this.seq}:${now}`,
        this.lobby.players,
        now,
      );
      this.lobby = null;
      this.paid = false;
    }
    const m = this.match;
    if (!m) return;
    advanceSkirmish(m, now);
    if (m.result && !this.paid) {
      this.paid = true;
      for (const r of m.result.ranking) {
        if (!m.humans.includes(r.id) || r.glory <= 0) continue;
        await this.world.execute({ type: "terraSkirmishGlory", playerId: r.id, glory: r.glory });
      }
    }
    if (m.result && now > m.endsAt + SHOWN_AFTER_MS) this.match = null;
  }

  /** A merchant asks for the next match: the lobby opens, or it joins the one open. */
  join(accountId: string, now: number): boolean {
    const cfg = this.cfg;
    if (!cfg?.skirmish) return false;
    if (this.match && !this.match.result) return this.match.humans.includes(accountId);
    if (!this.lobby) this.lobby = { players: [], opensAt: now + cfg.skirmish.lobbySeconds * 1_000 };
    if (this.lobby.players.length >= cfg.skirmish.players) return false;
    if (!this.lobby.players.includes(accountId)) this.lobby.players.push(accountId);
    return true;
  }

  act(accountId: string, action: SkirmishAction, now: number): boolean {
    return !!this.match && skirmishAct(this.match, accountId, action, now);
  }

  /** What a merchant sees: the lobby, or the match as a map of the Terraferma in real times. */
  async status(accountId: string, now: number) {
    const cfg = this.cfg;
    if (!cfg?.skirmish) return { phase: "off" as const };
    const m = this.match;
    if (!m) {
      return this.lobby
        ? {
            phase: "lobby" as const,
            opensAt: this.lobby.opensAt,
            players: this.lobby.players.length,
            joined: this.lobby.players.includes(accountId),
            minutes: cfg.skirmish.minutes,
          }
        : { phase: "none" as const, minutes: cfg.skirmish.minutes };
    }
    advanceSkirmish(m, now);
    const names = await this.names(m);
    const ctx: WorldContext = {
      ...this.world.ctx,
      settings: { ...this.world.ctx.settings, terraferma: { ...m.cfg, live: true } },
    };
    const state = { terra: { week: 0, map: m.state } } as unknown as WorldState;
    const virtual = m.state.clock;
    const view = terraView(ctx, state, accountId, virtual, names);
    return {
      phase: m.result ? ("done" as const) : ("playing" as const),
      endsAt: m.endsAt,
      playing: m.humans.includes(accountId),
      view: view ? realTimes(m, view, m.endsAt) : null,
      result: m.result
        ? m.result.ranking.map((r) => ({
            pseudo: names.get(r.id)?.pseudo ?? null,
            me: r.id === accountId,
            cells: r.cells,
            glory: r.glory,
          }))
        : null,
    };
  }

  /** The merchants' names; the computer's houses as condottieri. */
  private async names(m: Skirmish): Promise<Map<string, TerraName>> {
    const out = new Map<string, TerraName>();
    const ids = Object.keys(m.state.players).filter((id) => /^[0-9a-f-]{36}$/.test(id));
    if (ids.length > 0) {
      const rows = await this.db
        .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
        .from(accounts)
        .where(inArray(accounts.id, ids));
      for (const r of rows) out.set(r.id, { pseudo: r.pseudo, crest: r.crest });
    }
    for (const id of Object.keys(m.state.players))
      if (id.startsWith("bot:")) out.set(id, { pseudo: `Condottiere ${id.slice(4)}`, crest: null });
    return out;
  }
}

/** The view's times, from the skirmish's own time to real time. */
function realTimes(
  m: Skirmish,
  v: NonNullable<ReturnType<typeof terraView>>,
  endsAt: number,
): NonNullable<ReturnType<typeof terraView>> {
  const r = (t: number) => toReal(m, t);
  const rn = (t: number | null) => (t === null ? null : r(t));
  return {
    ...v,
    closesAt: endsAt,
    placementEndsAt: null,
    truceEndsAt: null,
    battle: null,
    open: true,
    fronts: v.fronts.map((f) => ({
      ...f,
      takes: f.takes.map((x) => ({ ...x, at: r(x.at) })),
      endsAt: rn(f.endsAt),
    })),
    changes: v.changes.map((c) => ({ ...c, at: r(c.at) })),
    signals: v.signals.map((x) => ({ ...x, at: r(x.at) })),
    me: v.me
      ? {
          ...v.me,
          protectedUntil: r(v.me.protectedUntil),
          traitorUntil: r(v.me.traitorUntil),
          recruit: {
            ...v.me.recruit,
            nextAt: rn(v.me.recruit.nextAt),
            fullAt: rn(v.me.recruit.fullAt),
          },
          returns: v.me.returns.map((x) => ({ ...x, at: r(x.at) })),
        }
      : null,
  };
}
