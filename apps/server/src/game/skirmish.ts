import { randomUUID } from "node:crypto";
import {
  type Skirmish,
  type SkirmishAction,
  type WorldContext,
  type WorldState,
  advanceSkirmish,
  createSkirmish,
  dayStartIn,
  hourIn,
  hourWithin,
  nextSkirmishCall,
  skirmishAct,
  skirmishCallAt,
  skirmishRanked,
  skirmishRankedLeft,
  toReal,
} from "@comptoirs/engine";
import { and, eq, gt, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accounts, skirmishMatches, telemetry } from "../db/schema.js";
import type { Notifier } from "../notify/notifier.js";
import { type TerraName, terraView } from "./terra.js";
import type { GameWorld } from "./world.js";

/** How long a finished match stays on show. */
const SHOWN_AFTER_MS = 3 * 60_000;
/** The day of Paris after the one `at` falls on: a match lost to a restart is told until then. */
function nextDayStart(at: number): number {
  // 36 hours past midnight: within the next day, whatever its length (changes of time).
  return dayStartIn(dayStartIn(at).start + 36 * 3_600_000).start;
}

/** Why a merchant may not join: the lobby is full, or it is night (no skirmish then). */
export type JoinRefusal = "skirmish_full" | "night";

/**
 * Why a match is friendly for a merchant: not set down on the week's map, its ranked match of
 * the day already played, a match that would end after the closing hour, or too few merchants.
 */
export type FriendlyWhy = "off_map" | "quota" | "late" | "few";

/**
 * The skirmishes of the world (recommendations of 20 October 2026): one lobby, one match at a
 * time, played in memory, each with its row in `skirmish_matches`. A ranked match is paid to all
 * its merchants by one command of the world, `terraSkirmishPay`, once per match (so it is in the
 * journal, and the day's quota is spent only there); its row turns `paid` in the same
 * transaction (`done` if no merchant was credited). None open at night. A match under way is
 * lost on a restart, like a game of OpenFront when its server falls: `recover` marks it aborted,
 * nothing paid nor spent, and its merchants are told so.
 */
export class SkirmishHub {
  /** The lobby; `call` when it is one of the day's calls (its start, « 12:30 »). */
  private lobby: { id: string; players: string[]; opensAt: number; call: string | null } | null =
    null;
  /** The call of the match under way, for the measures. */
  private matchCall: string | null = null;
  private match: Skirmish | null = null;
  private matchId = "";
  private paid = false;
  /** Glory credited to each merchant of the match (a friendly match, or past the quota: none). */
  private credited = new Map<string, number>();
  /** Why the match is friendly for each of its merchants, from its start (null: ranked). */
  private stakes = new Map<string, FriendlyWhy | null>();
  /** Merchants of a match lost to a restart, and when it was lost. */
  private interrupted = new Map<string, number>();
  /** The rows' writes, one after the other (a join never overtakes the lobby's opening). */
  private writes: Promise<unknown> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;
  private seq = 0;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
    private readonly notifier?: Pick<Notifier, "send">,
  ) {}

  /** Queues a write of the matches' rows; a failed one is logged, never thrown at a player. */
  private write(fn: () => Promise<unknown>): Promise<void> {
    const next = this.writes.then(fn);
    this.writes = next.catch(console.error);
    return this.writes.then(() => undefined);
  }

  /**
   * At start-up, before the first step: the lobbies and matches the last run left open are lost,
   * nothing paid and no quota spent. Their merchants are notified, and told on the skirmish's bar
   * until the end of that day in Paris (those of an earlier restart that day too, unless they have
   * joined a match since: that one is told no more).
   */
  async recover(now: number): Promise<void> {
    const worldId = this.world.id;
    const lost = await this.db
      .update(skirmishMatches)
      .set({ status: "aborted", endedAt: new Date(now) })
      .where(
        and(
          eq(skirmishMatches.worldId, worldId),
          inArray(skirmishMatches.status, ["open", "playing"]),
        ),
      )
      .returning({ players: skirmishMatches.players, ranked: skirmishMatches.ranked });
    const dayStart = new Date(dayStartIn(now).start);
    const recent = await this.db
      .select({ players: skirmishMatches.players, endedAt: skirmishMatches.endedAt })
      .from(skirmishMatches)
      .where(
        and(
          eq(skirmishMatches.worldId, worldId),
          eq(skirmishMatches.status, "aborted"),
          gt(skirmishMatches.endedAt, dayStart),
        ),
      );
    for (const r of recent)
      for (const id of r.players)
        this.interrupted.set(
          id,
          Math.max(this.interrupted.get(id) ?? 0, r.endedAt?.getTime() ?? 0),
        );
    // A merchant who joined a match opened after its interruption has moved on: told no more.
    const since = await this.db
      .select({ players: skirmishMatches.players, openedAt: skirmishMatches.openedAt })
      .from(skirmishMatches)
      .where(and(eq(skirmishMatches.worldId, worldId), gt(skirmishMatches.openedAt, dayStart)));
    for (const r of since)
      for (const id of r.players) {
        const lostAt = this.interrupted.get(id);
        if (lostAt !== undefined && r.openedAt.getTime() > lostAt) this.interrupted.delete(id);
      }
    const ids = [...new Set(lost.flatMap((r) => r.players))];
    if (!this.notifier || ids.length === 0) return;
    const people = new Set(
      (
        await this.db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(inArray(accounts.id, ids), eq(accounts.isBot, false)))
      ).map((r) => r.id),
    );
    await this.notifier.send(
      lost.flatMap((r) =>
        r.players
          .filter((id) => people.has(id))
          .map((accountId) => ({
            accountId,
            kind: "family" as const,
            data: {
              event: "skirmish_aborted",
              ranked: r.ranked,
            },
          })),
      ),
      now,
    );
  }

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
    // A call's lobby opens by itself ten minutes before its hour, for merchants to find it.
    const call = skirmishCallAt(cfg, now);
    if (call !== null && !this.lobby && !(this.match && !this.match.result))
      this.openLobby(call, now);
    // Nobody came: no match.
    if (this.lobby && now >= this.lobby.opensAt && this.lobby.players.length === 0) {
      const { id } = this.lobby;
      this.lobby = null;
      void this.write(() =>
        this.db
          .update(skirmishMatches)
          .set({ status: "done", endedAt: new Date(now) })
          .where(and(eq(skirmishMatches.id, id), eq(skirmishMatches.status, "open"))),
      );
    }
    if (this.lobby && now >= this.lobby.opensAt) {
      const { id, players: humans, call: called } = this.lobby;
      this.matchCall = called;
      const m = createSkirmish(cfg, `${this.world.id}:${++this.seq}:${now}`, humans, now);
      this.match = m;
      this.matchId = id;
      this.lobby = null;
      this.paid = false;
      this.credited = new Map();
      // The stake each merchant sees, kept from the start to the end of the match.
      this.stakes = new Map(humans.map((p) => [p, this.friendlyWhy(p, humans.length, now)]));
      void this.write(() =>
        this.db
          .update(skirmishMatches)
          .set({
            status: "playing",
            players: [...humans],
            ranked: m.ranked,
            startedAt: new Date(now),
          })
          .where(eq(skirmishMatches.id, id)),
      );
    }
    const m = this.match;
    if (!m) return;
    advanceSkirmish(m, now);
    if (m.result && !this.paid) {
      this.paid = true;
      const id = this.matchId;
      const result = m.result;
      // Its row exists and plays before it is paid.
      await this.writes;
      let paid = false;
      if (m.ranked) {
        // One command for the whole match: every merchant on the week's map whose ranked match
        // of the day is still to play gets its rank's glory and spends its quota, whatever its
        // rank; the others get nothing. The row turns `paid` in the same transaction, or `done`
        // if no merchant was credited.
        const res = await this.world.execute({
          type: "terraSkirmishPay",
          matchId: id,
          ranks: m.humans.map((p) => ({
            playerId: p,
            glory: result.ranking.find((r) => r.id === p)?.glory ?? 0,
          })),
        });
        if (res.ok) {
          paid = true;
          const credited = this.world.current.terra?.map.skirmishPaid?.[id] ?? {};
          for (const [p, glory] of Object.entries(credited)) this.credited.set(p, glory);
        }
      }
      // A friendly match, or one the world refused to pay: over, nothing paid.
      if (!paid)
        await this.write(() =>
          this.db
            .update(skirmishMatches)
            .set({ status: "done", endedAt: new Date(now) })
            .where(
              and(eq(skirmishMatches.id, id), inArray(skirmishMatches.status, ["open", "playing"])),
            ),
        );
      // Each merchant's match, ranked (paid) or friendly, for the beta's dashboard.
      await this.db.insert(telemetry).values(
        m.humans.map((id) => ({
          accountId: id,
          worldId: this.world.id,
          type: "skirmish_played",
          at: new Date(now),
          props: {
            ranked: this.credited.has(id),
            glory: this.credited.get(id) ?? 0,
            call: this.matchCall,
            match: this.matchId,
            humans: m.humans.length,
          },
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
    // Within a call's ten minutes, the lobby waits for its hour; else it starts in a minute.
    if (!this.lobby) {
      const call = skirmishCallAt(cfg, now);
      this.openLobby(call ?? now + cfg.skirmish.lobbySeconds * 1_000, now, call !== null);
    }
    const lobby = this.lobby;
    if (!lobby) return "skirmish_full";
    if (lobby.players.length >= cfg.skirmish.players) return "skirmish_full";
    if (!lobby.players.includes(accountId)) {
      lobby.players.push(accountId);
      // A new match: the last one's interruption is told no more.
      this.interrupted.delete(accountId);
      const players = [...lobby.players];
      void this.write(() =>
        this.db
          .update(skirmishMatches)
          .set({ players })
          .where(and(eq(skirmishMatches.id, lobby.id), eq(skirmishMatches.status, "open"))),
      );
    }
    return true;
  }

  /** A lobby opening at `opensAt`; a call's when `called` (its start written « 12:30 »). */
  private openLobby(opensAt: number, now: number, called = true): void {
    const lobby = {
      id: randomUUID(),
      players: [] as string[],
      opensAt,
      call: called ? callLabel(opensAt) : null,
    };
    this.lobby = lobby;
    void this.write(() =>
      this.db.insert(skirmishMatches).values({
        id: lobby.id,
        worldId: this.world.id,
        players: [],
        status: "open",
        openedAt: new Date(now),
      }),
    );
  }

  /** Set down on the week's map, and still on it. */
  private onMap(accountId: string): boolean {
    const me = this.world.current.terra?.map.players[accountId];
    return !!me && me.eliminatedAt === undefined;
  }

  /** Waits for the rows' writes queued so far (tests, shutdown). */
  flush(): Promise<void> {
    return this.writes.then(() => undefined);
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
    if (!this.onMap(accountId)) return "off_map";
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
    const rankedLeft = skirmishRankedLeft(this.world.ctx, this.world.current, accountId, now);
    // The next match the merchant could launch: after the lobby's and the match's, if any.
    const lobbyMs = cfg.skirmish.lobbySeconds * 1_000;
    const m = this.match;
    const nextAt =
      (m && !m.result
        ? m.endsAt
        : this.lobby
          ? this.lobby.opensAt + cfg.skirmish.minutes * 60_000
          : now) + lobbyMs;
    const lostAt = this.interrupted.get(accountId);
    const day = {
      rankedLeft,
      // A match of the merchant's lost to a restart this day: no glory, its quota untouched.
      interrupted: lostAt !== undefined && now < nextDayStart(lostAt),
      // Whether a ranked match may still be played today, after the one under way if any.
      rankedLater: rankedLeft > 0 && skirmishRanked(cfg, cfg.skirmish.minHumans, nextAt),
      // Glory is paid only to a merchant set down on the week's map, and still on it.
      onMap: this.onMap(accountId),
      minHumans: cfg.skirmish.minHumans,
      opensAtHour: cfg.openHours.from,
      closesAtHour: cfg.openHours.to,
      // The next call of the day, when merchants meet (E2-2), or null.
      nextCall: nextSkirmishCall(cfg, now),
    };
    if (!m) {
      if (this.lobby) {
        // Ranked for the merchant if it opened with these merchants (more may come).
        const why = this.friendlyWhy(accountId, this.lobby.players.length, this.lobby.opensAt);
        // Who it opens with: the merchants in, the computer's houses among them and those that
        // will fill the field (as things stand: more merchants may come).
        const joined = this.lobby.players;
        const houses =
          joined.length === 0
            ? 0
            : (
                await this.db
                  .select({ id: accounts.id })
                  .from(accounts)
                  .where(and(inArray(accounts.id, joined), eq(accounts.isBot, true)))
              ).length;
        return {
          phase: "lobby" as const,
          opensAt: this.lobby.opensAt,
          call: this.lobby.call,
          players: joined.length,
          humans: joined.length - houses,
          bots: houses + Math.max(0, cfg.skirmish.players - joined.length),
          joined: this.lobby.players.includes(accountId),
          minutes: cfg.skirmish.minutes,
          ranked: why === null,
          why,
          ...day,
        };
      }
      if (!hourWithin(hourIn(now), cfg.openHours)) return { phase: "night" as const, ...day };
      // A match launched now, with merchants enough: past the closing hour by its end, friendly.
      const why = this.friendlyWhy(accountId, cfg.skirmish.minHumans, now + lobbyMs);
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
            bot: names.get(r.id)?.bot ?? false,
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
        .select({
          id: accounts.id,
          pseudo: accounts.pseudo,
          crest: accounts.crest,
          bot: accounts.isBot,
        })
        .from(accounts)
        .where(inArray(accounts.id, ids));
      for (const r of rows) out.set(r.id, { pseudo: r.pseudo, crest: r.crest, bot: r.bot });
    }
    for (const id of Object.keys(m.state.players))
      if (id.startsWith("bot:"))
        out.set(id, { pseudo: `Condottiere ${id.slice(4)}`, crest: null, bot: true });
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

/** A call's start as people read it: « 12:30 » in Paris. */
function callLabel(at: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).format(at);
}
