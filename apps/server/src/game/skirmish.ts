import {
  type Skirmish,
  type SkirmishAction,
  type WorldContext,
  type WorldState,
  advanceSkirmish,
  createSkirmish,
  hourIn,
  hourWithin,
  skirmishAct,
  skirmishRanked,
  skirmishRankedLeft,
  toReal,
} from "@comptoirs/engine";
import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, telemetry } from "../db/schema.js";
import { type TerraName, terraView } from "./terra.js";
import type { GameWorld } from "./world.js";

/** How long a finished match stays on show. */
const SHOWN_AFTER_MS = 3 * 60_000;

/** Why a merchant may not join: the lobby is full, or it is night (no skirmish then). */
export type JoinRefusal = "skirmish_full" | "night";

/**
 * Why a match is friendly for a merchant: not set down on the week's map, its ranked match of
 * the day already played, a match that would end after the closing hour, or too few merchants.
 */
export type FriendlyWhy = "off_map" | "quota" | "late" | "few";

/**
 * The skirmishes of the world (recommendations of 20 October 2026): one lobby, one match at a
 * time, held in memory; the ranks of the merchants who played a ranked match go to the week's
 * Terraferma through a command of the world (so they are in its journal, and the day's quota is
 * spent only there). None open at night. Lost on a restart, like a game of OpenFront when its
 * server falls.
 */
export class SkirmishHub {
  private lobby: { players: string[]; opensAt: number } | null = null;
  private match: Skirmish | null = null;
  private paid = false;
  /** Glory credited to each merchant of the match (a friendly match, or past the quota: none). */
  private credited = new Map<string, number>();
  /** Why the match is friendly for each of its merchants, from its start (null: ranked). */
  private stakes = new Map<string, FriendlyWhy | null>();
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
      const humans = this.lobby.players;
      this.match = createSkirmish(cfg, `${this.world.id}:${++this.seq}:${now}`, humans, now);
      this.lobby = null;
      this.paid = false;
      this.credited = new Map();
      // The stake each merchant sees, kept from the start to the end of the match.
      this.stakes = new Map(humans.map((id) => [id, this.friendlyWhy(id, humans.length, now)]));
    }
    const m = this.match;
    if (!m) return;
    advanceSkirmish(m, now);
    if (m.result && !this.paid) {
      this.paid = true;
      if (m.ranked) {
        // Every merchant of a ranked match spends its quota of the day, whatever its rank; one
        // who already played its ranked match today, or is not on the week's map, gets nothing.
        for (const id of m.humans) {
          const glory = m.result.ranking.find((r) => r.id === id)?.glory ?? 0;
          const res = await this.world.execute({
            type: "terraSkirmishGlory",
            playerId: id,
            glory,
            humans: m.humans.length,
          });
          if (res.ok) this.credited.set(id, glory);
        }
      }
      // Each merchant's match, ranked (paid) or friendly, for the beta's dashboard.
      await this.db.insert(telemetry).values(
        m.humans.map((id) => ({
          accountId: id,
          worldId: this.world.id,
          type: "skirmish_played",
          at: new Date(now),
          props: { ranked: this.credited.has(id), glory: this.credited.get(id) ?? 0 },
        })),
      );
    }
    if (m.result && now > m.endsAt + SHOWN_AFTER_MS) this.match = null;
  }

  /** A merchant asks for the next match: the lobby opens, or it joins the one open. */
  join(accountId: string, now: number): true | JoinRefusal {
    const cfg = this.cfg;
    if (!cfg?.skirmish) return "skirmish_full";
    if (this.match && !this.match.result)
      return this.match.humans.includes(accountId) || "skirmish_full";
    if (!this.lobby && !hourWithin(hourIn(now), cfg.openHours)) return "night";
    if (!this.lobby) this.lobby = { players: [], opensAt: now + cfg.skirmish.lobbySeconds * 1_000 };
    if (this.lobby.players.length >= cfg.skirmish.players) return "skirmish_full";
    if (!this.lobby.players.includes(accountId)) this.lobby.players.push(accountId);
    return true;
  }

  act(accountId: string, action: SkirmishAction, now: number): boolean {
    return !!this.match && skirmishAct(this.match, accountId, action, now);
  }

  /**
   * Why a match of so many merchants starting at `startAt` would be friendly for this one, or
   * null if ranked for it.
   */
  private friendlyWhy(accountId: string, humans: number, startAt: number): FriendlyWhy | null {
    const cfg = this.cfg;
    if (!cfg?.skirmish) return "few";
    const me = this.world.current.terra?.map.players[accountId];
    if (!me || me.eliminatedAt !== undefined) return "off_map";
    if (skirmishRankedLeft(this.world.ctx, this.world.current, accountId, startAt) === 0)
      return "quota";
    if (!skirmishRanked(cfg, Math.max(humans, cfg.skirmish.minHumans), startAt)) return "late";
    return humans < cfg.skirmish.minHumans ? "few" : null;
  }

  /** What a merchant sees: the lobby, or the match as a map of the Terraferma in real times. */
  async status(accountId: string, now: number) {
    const cfg = this.cfg;
    if (!cfg?.skirmish) return { phase: "off" as const };
    // The ranked matches the merchant may still play today, and when the skirmishes open.
    const onMap = this.world.current.terra?.map.players[accountId];
    const day = {
      rankedLeft: skirmishRankedLeft(this.world.ctx, this.world.current, accountId, now),
      // Glory is paid only to a merchant set down on the week's map, and still on it.
      onMap: !!onMap && onMap.eliminatedAt === undefined,
      minHumans: cfg.skirmish.minHumans,
      opensAtHour: cfg.openHours.from,
      closesAtHour: cfg.openHours.to,
    };
    const m = this.match;
    if (!m) {
      if (this.lobby) {
        // Ranked for the merchant if it opened with these merchants (more may come).
        const why = this.friendlyWhy(accountId, this.lobby.players.length, this.lobby.opensAt);
        return {
          phase: "lobby" as const,
          opensAt: this.lobby.opensAt,
          players: this.lobby.players.length,
          joined: this.lobby.players.includes(accountId),
          minutes: cfg.skirmish.minutes,
          ranked: why === null,
          why,
          ...day,
        };
      }
      if (!hourWithin(hourIn(now), cfg.openHours)) return { phase: "night" as const, ...day };
      // A match launched now, with merchants enough: past the closing hour by its end, friendly.
      const why = this.friendlyWhy(
        accountId,
        cfg.skirmish.minHumans,
        now + cfg.skirmish.lobbySeconds * 1_000,
      );
      return {
        phase: "none" as const,
        minutes: cfg.skirmish.minutes,
        ranked: why === null,
        why,
        ...day,
      };
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
    // Ranked for this merchant (one who watches plays none): as announced at the start, then as
    // paid; a merchant put off the week's map meanwhile is not paid.
    const playing = m.humans.includes(accountId);
    const announced = this.stakes.get(accountId) ?? null;
    const why: FriendlyWhy | null = !playing
      ? null
      : !this.paid
        ? announced
        : this.credited.has(accountId)
          ? null
          : (announced ?? "off_map");
    return {
      phase: m.result ? ("done" as const) : ("playing" as const),
      endsAt: m.endsAt,
      playing,
      ranked: playing && why === null,
      why,
      ...day,
      view: view ? realTimes(m, view, m.endsAt) : null,
      // The glory each merchant was paid: none to the computer's houses, nor in a friendly match.
      result: m.result
        ? m.result.ranking.map((r) => ({
            pseudo: names.get(r.id)?.pseudo ?? null,
            me: r.id === accountId,
            cells: r.cells,
            glory: this.credited.get(r.id) ?? 0,
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
): NonNullable<ReturnType<typeof terraView>> & { skirmish: true } {
  const r = (t: number) => toReal(m, t);
  const rn = (t: number | null) => (t === null ? null : r(t));
  return {
    ...v,
    skirmish: true,
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
