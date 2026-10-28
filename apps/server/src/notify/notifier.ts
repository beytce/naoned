import {
  activeEvent,
  atoutOpen,
  dailyFor,
  dayStartIn,
  hourIn,
  hourWithin,
  incantoLots,
  letterOf,
  nextSkirmishCall,
  nextWaveAt,
  seasonActs,
  seasonEnd,
  waveOrdersCovered,
  weekIndex,
} from "@comptoirs/engine";
import type { Effects, WorldContext } from "@comptoirs/engine";
import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  accounts,
  notifications,
  players,
  pushSubscriptions,
  seasonResults,
  sfide,
  weeklyResults,
} from "../db/schema.js";
import { calledTo } from "../game/company.js";
import { seasonPlayers } from "../game/season.js";
import type { GameWorld } from "../game/world.js";
import type { Pusher } from "./push.js";
import { pushText } from "./texts.js";

export const NOTIFICATION_KINDS = [
  "harvest",
  "order",
  "event",
  "act",
  "week",
  "season",
  // Once the Pass's (live-2): no longer sent, kept for the preferences already saved.
  "criee",
  "deal",
  "family",
  "siege",
  "delivery",
  "muda",
  // The gazette of 8:05: what the night kept in the bell.
  "morning",
  // A call to skirmish, a quarter of an hour before (E2-2); asked for, off by default.
  "skirmish_call",
  // A wave of the board opens with orders the stock covers, to whoever is away (E3-1, lot 2).
  "wave",
  // A streak of chests of 3 days or more, today's still closed, at 19 h (E3-10).
  "streak",
  // The Lustre (R6): the week's Sfida paired, a challenge received.
  "sfida",
  // The Sera (R11): it begins, a bid at the incanto passed.
  "sera",
  // The Signoria of the cities (R2): named Podestà, a city lost, the lead taken by a rival.
  "signoria",
  // The Letter of the day (R10): a consequence of an answer, come or not.
  "letter",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const HOUR_MS = 3_600_000;
/** The Terraferma's events a merchant is told of (not its own commands). */
const TERRA_NEWS: ReadonlySet<string> = new Set([
  "terra_attacked",
  "terra_alliance_asked",
  "terra_alliance_made",
  "terra_alliance_broken",
  "terra_troops_received",
  "terra_result",
  "terra_battle_soon",
  "terra_bombarded",
  "terra_ducats_received",
  // The war eats the goods (R1): the troops' bread ran out.
  "terra_hungry",
]);
/**
 * Kinds sent only to whoever asked for them (off by default): their name in `push_off` turns
 * them on.
 */
export const OPT_IN: ReadonlySet<NotificationKind> = new Set(["skirmish_call"]);
/** A call to skirmish is told this long before its hour. */
const CALL_NOTICE_MS = 15 * 60_000;
/** A wave is told only to whoever has been away this long, with at least this many orders covered. */
const WAVE = { awayMs: 2 * 60 * 60_000, covered: 2 };

/** Pushed at once, never held back by the hourly limit per kind: the merchant has minutes. */
const URGENT: ReadonlySet<NotificationKind> = new Set(["siege"]);
const DAY_MS = 24 * HOUR_MS;
/**
 * Pushes a person gets in a day of Paris at most, all kinds together, the urgent ones aside
 * (E3-1 of the experts, 25 October 2026): every kind to come declares itself here, none keeps a
 * cap of its own.
 */
export const DAILY_PUSH_CAP = 3;
/** The gazette goes at 8:05 in Paris, and no later than 10 h (a server down at 8:05 catches up). */
const MORNING = { minutes: 8 * 60 + 5, until: 10 * 60 };
/** The Sera is told this many minutes before its hour. */
const SERA_NOTICE_MINUTES = 5;
/** The streak's reminder goes at 19 h in Paris, and no later than 21 h, for a streak this long. */
const STREAK = { minutes: 19 * 60, until: 21 * 60, from: 3 };
/** Where a push opens the game: one of the places the client knows (`deepLink`, web). */
const OPENS: Partial<Record<NotificationKind, string>> = {
  harvest: "workshops",
  delivery: "cargo",
  order: "rialto",
  muda: "rialto",
  week: "ranking",
  season: "ranking",
  siege: "terra",
  family: "terra",
  morning: "notices",
  skirmish_call: "terra",
  wave: "cargo",
  streak: "notices",
  signoria: "notices",
  sfida: "sfida",
  sera: "sera",
  letter: "letter",
};

/** Who wrote the letter a consequence answers (`followup` id of the month's script). */
function letterSender(ctx: WorldContext, followup: string): string | null {
  const episode = ctx.settings.letters?.episodes.find((e) =>
    e.choices.some((c) => c.later?.id === followup),
  );
  return episode?.sender ?? null;
}

/** The link a push opens: a place of the list, and where it comes from for the measures. */
export function pushUrl(kind: NotificationKind): string {
  const open = OPENS[kind];
  return open ? `/?open=${open}&src=push&kind=${kind}` : `/?src=push&kind=${kind}`;
}

interface Notice {
  accountId: string;
  kind: NotificationKind;
  data: Record<string, unknown>;
}

/**
 * Watches the world once a minute and notifies people (never bots): harvest ready, goods
 * delivered, new event, weekly results. Every notice goes to the bell; it is also pushed to the player's
 * devices unless they turned that kind off, it is night in Paris (22 h – 8 h), or a notice of the
 * same kind was pushed to them less than an hour ago.
 */
export class Notifier {
  private last: number | undefined;
  private timer: NodeJS.Timeout | undefined;
  private readonly cities: Record<string, string>;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
    private readonly pusher: Pusher,
    private readonly quiet = { from: 22, to: 8 },
  ) {
    this.cities = Object.fromEntries(world.ctx.theme.cities.map((c) => [c.code, c.name]));
  }

  /**
   * Offers that found a taker, straight from what a command wrote: one notice per player,
   * resource and side, with the total traded.
   */
  async fromEffects(fx: Effects, now: number): Promise<void> {
    await this.familyNews(fx, now);
    await this.mudaNews(fx, now);
    await this.signoriaNews(fx, now);
    await this.outbid(fx, now);
    await this.letterNews(fx, now);
    const fills = fx.events.filter((e) => e.type === "order_filled" && e.playerId);
    if (fills.length === 0) return;
    const people = await this.people();
    const grouped = new Map<string, Notice>();
    for (const e of fills) {
      const d = e.data ?? {};
      const accountId = e.playerId ?? "";
      if (!people.has(accountId)) continue;
      const key = `${accountId}|${d.resource}|${d.side}`;
      const n: Notice = grouped.get(key) ?? {
        accountId,
        kind: "order",
        data: {
          resource: d.resource,
          side: d.side,
          quantity: 0,
          price: d.price,
          counterparty: d.counterparty,
        },
      };
      n.data.quantity = Number(n.data.quantity) + Number(d.quantity);
      grouped.set(key, n);
    }
    if (grouped.size === 0) return;
    const ids = [...new Set([...grouped.values()].map((n) => String(n.data.counterparty)))].filter(
      (id) => /^[0-9a-f-]{36}$/.test(id),
    );
    const rows =
      ids.length === 0
        ? []
        : await this.db
            .select({ id: accounts.id, pseudo: accounts.pseudo })
            .from(accounts)
            .where(inArray(accounts.id, ids));
    const name = new Map(rows.map((r) => [r.id, r.pseudo]));
    for (const n of grouped.values()) {
      const who = String(n.data.counterparty);
      n.data.counterpartyName = who === "market_maker" ? null : (name.get(who) ?? null);
    }
    await this.send([...grouped.values()], now);
  }

  /**
   * The Signoria of the cities (R2), to people only, with the rival named: a city held, a city
   * lost, the lead of a city's gauge taken by another.
   */
  private async signoriaNews(fx: Effects, now: number): Promise<void> {
    const news = fx.events.filter(
      (e) =>
        e.playerId &&
        (e.type === "podesta_named" ||
          e.type === "podesta_lost" ||
          e.type === "signoria_overtaken"),
    );
    if (news.length === 0) return;
    const people = await this.people();
    const mine = news.filter((e) => people.has(e.playerId ?? ""));
    if (mine.length === 0) return;
    const ids = [...new Set(mine.map((e) => String(e.data?.by ?? "")))].filter((id) =>
      /^[0-9a-f-]{36}$/.test(id),
    );
    const rows =
      ids.length === 0
        ? []
        : await this.db
            .select({ id: accounts.id, pseudo: accounts.pseudo })
            .from(accounts)
            .where(inArray(accounts.id, ids));
    const name = new Map(rows.map((r) => [r.id, r.pseudo]));
    await this.send(
      mine.map((e) => ({
        accountId: e.playerId ?? "",
        kind: "signoria" as const,
        data: {
          event: e.type,
          city: e.data?.city ?? null,
          byName: e.data?.by ? (name.get(String(e.data.by)) ?? null) : null,
        },
      })),
      now,
    );
  }

  /** A maximum passed at the incanto (R11): its merchant may bid again before the close. */
  private async outbid(fx: Effects, now: number): Promise<void> {
    const news = fx.events.filter((e) => e.type === "incanto_outbid" && e.playerId);
    if (news.length === 0) return;
    const people = await this.people();
    await this.send(
      news
        .filter((e) => people.has(e.playerId ?? ""))
        .map((e) => ({
          accountId: e.playerId ?? "",
          kind: "sera" as const,
          data: { event: "outbid", lot: e.data?.lot ?? null },
        })),
      now,
    );
  }

  /** A consequence of the Letter (R10) came, or did not: told with its sender and its id. */
  private async letterNews(fx: Effects, now: number): Promise<void> {
    const news = fx.events.filter((e) => e.type === "letter_followup" && e.playerId);
    if (news.length === 0) return;
    const people = await this.people();
    await this.send(
      news
        .filter((e) => people.has(e.playerId ?? ""))
        .map((e) => ({
          accountId: e.playerId ?? "",
          kind: "letter" as const,
          data: {
            id: e.data?.id ?? null,
            came: e.data?.came === true,
            sender: letterSender(this.world.ctx, String(e.data?.id ?? "")),
          },
        })),
      now,
    );
  }

  /** The galleys of the Muda are in: everyone hears it, with what they brought. */
  private async mudaNews(fx: Effects, now: number): Promise<void> {
    const arrived = fx.events.find((e) => e.type === "muda_arrived");
    if (!arrived) return;
    const people = await this.people();
    const stock = (arrived.data?.stock ?? {}) as Record<string, number>;
    await this.send(
      [...people].map((accountId) => ({ accountId, kind: "muda" as const, data: { stock } })),
      now,
    );
  }

  /**
   * The family's news, to people only: a land of theirs under attack (urgent, with the hour of
   * arrival), a land lost, the week's result to every member, their share of the decrees.
   */
  private async familyNews(fx: Effects, now: number): Promise<void> {
    const news = fx.events.filter(
      (e) =>
        e.type === "land_threatened" ||
        e.type === "land_lost" ||
        e.type === "work_razed" ||
        e.type === "campaign_closed" ||
        e.type === "decree_share" ||
        // The Terraferma: an attack is urgent, the rest is the family's kind of news.
        TERRA_NEWS.has(e.type),
    );
    if (news.length === 0) return;
    const people = await this.people();
    const memberOf = this.world.current.families?.memberOf ?? {};
    const notices: Notice[] = [];
    for (const e of news) {
      const d = e.data ?? {};
      if (e.type === "campaign_closed") {
        for (const [accountId, family] of Object.entries(memberOf)) {
          if (!people.has(accountId)) continue;
          notices.push({
            accountId,
            kind: "family",
            data: {
              event: e.type,
              family,
              winner: d.winner ?? null,
              won: d.winner === family,
              decrees: d.decrees ?? [],
              final: d.final ?? false,
            },
          });
        }
        continue;
      }
      const accountId = e.playerId ?? "";
      if (!people.has(accountId)) continue;
      notices.push({
        accountId,
        kind:
          e.type === "land_threatened" ||
          e.type === "terra_attacked" ||
          e.type === "terra_bombarded"
            ? "siege"
            : "family",
        data: { event: e.type, ...d },
      });
    }
    await this.send(notices, now);
  }

  get publicKey(): string | null {
    return this.pusher.publicKey;
  }

  start(intervalMs = 60_000, onError: (err: unknown) => void = console.error): void {
    this.stop();
    const run = () => this.scan().catch(onError);
    void run();
    this.timer = setInterval(run, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** People playing in this world (bots and retired bots excluded). */
  private async people(): Promise<Set<string>> {
    const rows = await this.db
      .select({ id: players.accountId })
      .from(players)
      .innerJoin(accounts, eq(accounts.id, players.accountId))
      .where(and(eq(players.worldId, this.world.id), eq(accounts.isBot, false)));
    return new Set(rows.map((r) => r.id).filter((id) => id in this.world.current.players));
  }

  /** What happened since the last scan. The first scan only sets the starting point. */
  async scan(): Promise<void> {
    const now = this.world.now();
    const since = this.last;
    this.last = now;
    if (since === undefined) {
      await this.weekResults(now);
      return;
    }
    const people = await this.people();
    const state = this.world.current;
    const notices: Notice[] = [];
    const within = (t: number) => t > since && t <= now;

    const harvested = new Set<string>();
    for (const b of Object.values(state.buildings)) {
      if (!b.job || !people.has(b.playerId) || harvested.has(b.playerId)) continue;
      if (within(b.job.startedAt + b.job.batches * b.job.batchMs)) {
        harvested.add(b.playerId);
        notices.push({ accountId: b.playerId, kind: "harvest", data: {} });
      }
    }
    // The road: goods arrived.
    for (const d of Object.values(state.deliveries ?? {})) {
      const mine = people.has(d.playerId);
      if (mine && within(d.arriveAt)) {
        const left = d.cargo[d.resource] ?? 0;
        const paid = d.paid ?? (d.loaded > 0 ? (d.payment * BigInt(left)) / BigInt(d.loaded) : 0n);
        notices.push({
          accountId: d.playerId,
          kind: "delivery",
          data: {
            delivery: d.id,
            route: d.route,
            resource: d.resource,
            quantity: left,
            amount: paid.toString(),
          },
        });
      }
    }
    // Last sprint: three days before the end of the season, everyone hears about it once.
    if (within(seasonEnd(this.world.ctx) - 3 * DAY_MS)) {
      for (const id of people) {
        notices.push({ accountId: id, kind: "season", data: { phase: "ending", days: 3 } });
      }
    }

    const event = activeEvent(this.world.ctx, now);
    if (event && within(event.startsAt)) {
      for (const id of people) {
        notices.push({
          accountId: id,
          kind: "event",
          data: { code: event.code, city: event.city ?? null },
        });
      }
    }
    // A new act of the season (the first one opens with the season itself).
    for (const act of seasonActs(this.world.ctx)) {
      if (act.index === 0 || !within(act.startsAt)) continue;
      for (const id of people) {
        notices.push({
          accountId: id,
          kind: "act",
          data: { code: act.code, variant: act.variant?.code ?? null, index: act.index },
        });
      }
    }
    await this.send(notices, now);
    await this.weekResults(now);
    await this.morning(now);
    await this.skirmishCall(since, now);
    await this.wave(since, now);
    await this.streak(now);
    await this.sfidaNews(since, now);
    await this.sera(now);
  }

  /**
   * The Sera (R11), five minutes before 20 h on a day with lots at the incanto: to everyone in
   * the world, once a day (its lots and the battle).
   */
  private async sera(now: number): Promise<void> {
    const ctx = this.world.ctx;
    const rules = ctx.settings.incanto;
    if (!rules) return;
    const day = dayStartIn(now).start;
    const minutes = (now - day) / 60_000;
    const at = rules.hour * 60 - SERA_NOTICE_MINUTES;
    if (minutes < at || minutes >= rules.hour * 60 + rules.firstMinute) return;
    const lots = incantoLots(this.world.current).filter((l) => !l.done && l.sera === day);
    if (lots.length === 0) return;
    const key = new Date(day).toISOString().slice(0, 10);
    const [done] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          eq(notifications.kind, "sera"),
          sql`${notifications.data}->>'day' = ${key}`,
        ),
      )
      .limit(1);
    if (done) return;
    await this.send(
      [...(await this.people())].map((accountId) => ({
        accountId,
        kind: "sera" as const,
        data: { event: "soon", day: key, lots: lots.length },
      })),
      now,
    );
  }

  /**
   * The Lustre (R6): the week's Sfida paired (to each person, the opponent named, or a ghost), a
   * challenge received.
   */
  private async sfidaNews(since: number, now: number): Promise<void> {
    if (!this.world.ctx.settings.lustre) return;
    const rows = await this.db
      .select()
      .from(sfide)
      .where(
        and(
          eq(sfide.worldId, this.world.id),
          gt(sfide.createdAt, new Date(since)),
          lte(sfide.createdAt, new Date(now)),
        ),
      );
    if (rows.length === 0) return;
    const people = await this.people();
    const ids = [
      ...new Set(rows.flatMap((r) => [r.a, r.b, r.ghostAccount]).filter((x): x is string => !!x)),
    ];
    const names = new Map(
      (
        await this.db
          .select({ id: accounts.id, pseudo: accounts.pseudo })
          .from(accounts)
          .where(inArray(accounts.id, ids))
      ).map((r) => [r.id, r.pseudo]),
    );
    const notices: Notice[] = [];
    for (const r of rows) {
      if (r.kind === "challenge") {
        if (r.b && people.has(r.b) && !r.acceptedAt)
          notices.push({
            accountId: r.b,
            kind: "sfida",
            data: { event: "challenged", byName: names.get(r.a) ?? null, stake: r.stake },
          });
        continue;
      }
      const sides: [string, string | null][] = [[r.a, r.b ?? r.ghostAccount]];
      if (r.b) sides.push([r.b, r.a]);
      for (const [me, other] of sides) {
        if (!people.has(me)) continue;
        notices.push({
          accountId: me,
          kind: "sfida",
          data: {
            event: "paired",
            ghost: !r.b,
            byName: other ? (names.get(other) ?? null) : null,
          },
        });
      }
    }
    await this.send(notices, now);
  }

  /**
   * One reminder at 19 h in Paris to whoever holds a streak of 3 days or more and has not opened
   * today's chest (E3-10 of the experts): it comes with the weekly grace, and counts in the cap.
   */
  private async streak(now: number): Promise<void> {
    const ctx = this.world.ctx;
    if (ctx.settings.daily.perDay === 0 || ctx.settings.daily.chest.graceDaysPerWeek === 0) return;
    const day = dayStartIn(now).start;
    const minutes = (now - day) / 60_000;
    if (minutes < STREAK.minutes || minutes >= STREAK.until) return;
    const key = new Date(day).toISOString().slice(0, 10);
    const [done] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          eq(notifications.kind, "streak"),
          sql`${notifications.data}->>'day' = ${key}`,
        ),
      )
      .limit(1);
    if (done) return;
    const state = this.world.current;
    const notices: Notice[] = [];
    for (const accountId of await this.people()) {
      const daily = dailyFor(ctx, state, accountId, now);
      if (daily.chestClaimed || daily.streak < STREAK.from) continue;
      notices.push({ accountId, kind: "streak", data: { day: key, streak: daily.streak } });
    }
    await this.send(notices, now);
  }

  /**
   * A wave of the board has just opened (its hours read in the settings): told to whoever has
   * been away for two hours and could fill at least two of its orders from their stock.
   */
  private async wave(since: number, now: number): Promise<void> {
    const at = nextWaveAt(this.world.ctx, since);
    if (at === null || at > now) return;
    const people = await this.people();
    if (people.size === 0) return;
    const state = this.world.current;
    const seen = await this.db
      .select({ id: players.accountId, at: players.lastSeenAt })
      .from(players)
      .where(and(eq(players.worldId, this.world.id), inArray(players.accountId, [...people])));
    const notices: Notice[] = [];
    for (const p of seen) {
      if (p.at && now - p.at.getTime() < WAVE.awayMs) continue;
      const covered = waveOrdersCovered(this.world.ctx, state, p.id, at, now);
      if (covered < WAVE.covered) continue;
      notices.push({ accountId: p.id, kind: "wave", data: { at, covered } });
    }
    await this.send(notices, now);
  }

  /** A quarter of an hour before a call to skirmish, to whoever asked to be told (E2-2). */
  private async skirmishCall(since: number, now: number): Promise<void> {
    const call = nextSkirmishCall(this.world.ctx.settings.terraferma, since);
    if (call === null || !(call - CALL_NOTICE_MS > since && call - CALL_NOTICE_MS <= now)) return;
    const people = await this.people();
    if (people.size === 0) return;
    const asked = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(inArray(accounts.id, [...people]), sql`${accounts.pushOff} ? 'skirmish_call'`));
    // A company called to this hour by one of its members: all of them told, asked or not.
    const company = new Map(
      (await calledTo(this.db, call))
        .filter((r) => people.has(r.accountId))
        .map((r) => [r.accountId, r.company]),
    );
    const told = new Set([...asked.map((r) => r.id), ...company.keys()]);
    await this.send(
      [...told].map((accountId) => ({
        accountId,
        kind: "skirmish_call" as const,
        data: company.has(accountId) ? { at: call, company: company.get(accountId) } : { at: call },
      })),
      now,
    );
  }

  /**
   * A new season has opened: everyone who played the last one is invited back, with their
   * place in the final ranking (the closing ceremony waits for them in the game).
   */
  async seasonOpened(closedWorldId: string): Promise<void> {
    const people = await seasonPlayers(this.db, closedWorldId);
    const ranks = new Map(
      (
        await this.db
          .select({ id: seasonResults.accountId, rank: seasonResults.rank })
          .from(seasonResults)
          .where(eq(seasonResults.worldId, closedWorldId))
      ).map((r) => [r.id, r.rank]),
    );
    await this.send(
      people.map((accountId) => ({
        accountId,
        kind: "season" as const,
        data: { phase: "opened", name: this.world.name, rank: ranks.get(accountId) ?? null },
      })),
      this.world.now(),
    );
  }

  /** Results of the last closed week, once (they are saved by the tick that closed it). */
  private async weekResults(now: number): Promise<void> {
    const week = weekIndex(this.world.ctx, now) - 1;
    if (week < 0) return;
    const [done] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          eq(notifications.kind, "week"),
          sql`${notifications.data}->>'week' = ${String(week)}`,
        ),
      )
      .limit(1);
    if (done) return;
    const rows = await this.db
      .select({
        accountId: weeklyResults.accountId,
        rank: weeklyResults.rank,
        gain: weeklyResults.gain,
        award: weeklyResults.award,
      })
      .from(weeklyResults)
      .innerJoin(accounts, eq(accounts.id, weeklyResults.accountId))
      .where(
        and(
          eq(weeklyResults.worldId, this.world.id),
          eq(weeklyResults.week, week),
          eq(accounts.isBot, false),
        ),
      );
    // The week's Sfida (R6), told in the same notice: what the Lustre moved, won or lost.
    const duels = await this.db
      .select()
      .from(sfide)
      .where(
        and(eq(sfide.worldId, this.world.id), eq(sfide.week, week), isNotNull(sfide.settledAt)),
      );
    const lustre = new Map<string, number>();
    for (const d of duels) {
      lustre.set(d.a, d.deltaA ?? 0);
      if (d.b) lustre.set(d.b, d.deltaB ?? 0);
    }
    await this.send(
      rows.map((r) => ({
        accountId: r.accountId,
        kind: "week" as const,
        data: {
          week,
          rank: r.rank,
          gain: r.gain.toString(),
          award: r.award,
          ...(lustre.has(r.accountId) ? { lustre: lustre.get(r.accountId) } : {}),
        },
      })),
      now,
    );
  }

  async send(notices: Notice[], now: number): Promise<void> {
    if (notices.length === 0) return;
    const at = new Date(now);
    const saved = await this.db
      .insert(notifications)
      .values(notices.map((n) => ({ ...n, worldId: this.world.id, createdAt: at })))
      .returning({
        id: notifications.id,
        accountId: notifications.accountId,
        kind: notifications.kind,
        data: notifications.data,
      });

    if (!this.pusher.publicKey) return;
    if (hourWithin(hourIn(now), this.quiet)) return;

    const ids = [...new Set(saved.map((n) => n.accountId))];
    const subs = await this.db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.accountId, ids));
    if (subs.length === 0) return;
    const rows = await this.db
      .select({ id: accounts.id, off: accounts.pushOff, lang: accounts.lang })
      .from(accounts)
      .where(inArray(accounts.id, ids));
    const prefs = new Map(rows.map((r) => [r.id, new Set(r.off)]));
    const langs = new Map(rows.map((r) => [r.id, r.lang]));
    for (const n of saved) {
      const mine = subs.filter((s) => s.accountId === n.accountId);
      // Off when listed; a kind asked for (opt-in) is on only when listed.
      const listed = prefs.get(n.accountId)?.has(n.kind) ?? false;
      // A call of the person's company is theirs even unasked for (E2-8), still within the cap.
      const asked =
        listed || (n.kind === "skirmish_call" && !!(n.data as { company?: string }).company);
      if (mine.length === 0 || (OPT_IN.has(n.kind as NotificationKind) ? !asked : listed)) continue;
      const [recent] = URGENT.has(n.kind as NotificationKind)
        ? []
        : await this.db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.accountId, n.accountId),
                eq(notifications.kind, n.kind),
                isNotNull(notifications.pushedAt),
                gt(notifications.pushedAt, new Date(now - HOUR_MS)),
              ),
            )
            .limit(1);
      if (recent) continue;
      if (!URGENT.has(n.kind as NotificationKind) && !(await this.underDailyCap(n.accountId, now)))
        continue;
      const text = pushText(n.kind, n.data, this.cities, now, langs.get(n.accountId));
      const payload = JSON.stringify({
        ...text,
        kind: n.kind,
        url: pushUrl(n.kind as NotificationKind),
      });
      let delivered = false;
      for (const s of mine) {
        const res = await this.pusher.send(s, payload);
        if (res === "ok") delivered = true;
        if (res === "gone") {
          await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
        }
      }
      if (delivered) {
        await this.db.update(notifications).set({ pushedAt: at }).where(eq(notifications.id, n.id));
      }
    }
  }

  /** Whether a person may get one more push today (Paris), the urgent ones not counted. */
  private async underDailyCap(accountId: string, now: number): Promise<boolean> {
    const since = new Date(dayStartIn(now).start);
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.accountId, accountId),
          isNotNull(notifications.pushedAt),
          gte(notifications.pushedAt, since),
          notInArray(notifications.kind, [...URGENT]),
        ),
      );
    return Number(row?.n ?? 0) < DAILY_PUSH_CAP;
  }

  /**
   * The gazette of the morning: at 8:05 in Paris, to whoever had news kept in the bell during the
   * night (batches ready, goods delivered, offers taken), what they come to. Once a day.
   */
  private async morning(now: number): Promise<void> {
    const day = dayStartIn(now).start;
    const minutes = (now - day) / 60_000;
    if (minutes < MORNING.minutes || minutes >= MORNING.until) return;
    const key = new Date(day).toISOString().slice(0, 10);
    const [done] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          eq(notifications.kind, "morning"),
          sql`${notifications.data}->>'day' = ${key}`,
        ),
      )
      .limit(1);
    if (done) return;
    const night = await this.db
      .select({
        accountId: notifications.accountId,
        kind: notifications.kind,
        data: notifications.data,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          inArray(notifications.kind, ["harvest", "delivery", "order"]),
          isNull(notifications.pushedAt),
          gte(notifications.createdAt, new Date(day - 2 * HOUR_MS)),
          lt(notifications.createdAt, new Date(day + 8 * HOUR_MS)),
        ),
      );
    const people = await this.people();
    const by = new Map<
      string,
      { harvests: number; deliveries: number; offers: number; paid: bigint }
    >();
    for (const n of night) {
      if (!people.has(n.accountId)) continue;
      const t = by.get(n.accountId) ?? { harvests: 0, deliveries: 0, offers: 0, paid: 0n };
      if (n.kind === "harvest") t.harvests += 1;
      if (n.kind === "order") t.offers += 1;
      if (n.kind === "delivery") {
        t.deliveries += 1;
        t.paid += BigInt(String((n.data as { amount?: string }).amount ?? "0"));
      }
      by.set(n.accountId, t);
    }
    // The Letter (R10): whoever has one waiting hears from whom, night news or not.
    const letters = new Map<string, string>();
    if (this.world.ctx.settings.letters)
      for (const id of people) {
        const letter = letterOf(this.world.ctx, this.world.current, id, now);
        if (!letter || letter.answered) continue;
        letters.set(id, letter.sender);
        if (!by.has(id)) by.set(id, { harvests: 0, deliveries: 0, offers: 0, paid: 0n });
      }
    // The Atouts (R3): whoever may take this week's says so in the gazette, night news or not.
    const atouts = new Set<string>();
    if (this.world.ctx.settings.atouts)
      for (const id of people)
        if (atoutOpen(this.world.ctx, this.world.current, id, now)) {
          atouts.add(id);
          if (!by.has(id)) by.set(id, { harvests: 0, deliveries: 0, offers: 0, paid: 0n });
        }
    await this.send(
      [...by].map(([accountId, t]) => ({
        accountId,
        kind: "morning" as const,
        data: {
          day: key,
          ...t,
          paid: t.paid.toString(),
          ...(atouts.has(accountId) ? { atouts: true } : {}),
          ...(letters.has(accountId) ? { letter: letters.get(accountId) } : {}),
        },
      })),
      now,
    );
  }

  /** The bell: latest notices and how many are unread. */
  async list(accountId: string, limit = 30) {
    const items = await this.db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        data: notifications.data,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(and(eq(notifications.worldId, this.world.id), eq(notifications.accountId, accountId)))
      .orderBy(desc(notifications.id))
      .limit(limit);
    return {
      items: items.map((i) => ({
        ...i,
        createdAt: i.createdAt.getTime(),
        read: i.readAt !== null,
      })),
      unread: await this.unread(accountId),
    };
  }

  async unread(accountId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.worldId, this.world.id),
          eq(notifications.accountId, accountId),
          isNull(notifications.readAt),
        ),
      );
    return Number(row?.n ?? 0);
  }

  async markRead(accountId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date(this.world.now()) })
      .where(and(eq(notifications.accountId, accountId), isNull(notifications.readAt)));
  }
}
