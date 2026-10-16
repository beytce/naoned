import {
  MARKET_MAKER,
  activeEvent,
  currentCriee,
  hasPass,
  hourIn,
  hourWithin,
  seasonActs,
  seasonEnd,
  weekIndex,
} from "@comptoirs/engine";
import type { Effects } from "@comptoirs/engine";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  accounts,
  notifications,
  players,
  pushSubscriptions,
  seasonResults,
  weeklyResults,
} from "../db/schema.js";
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
  "criee",
  "deal",
  "family",
  "siege",
  "delivery",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const HOUR_MS = 3_600_000;
/** Pushed at once, never held back by the hourly limit per kind: the merchant has minutes. */
const URGENT: ReadonlySet<NotificationKind> = new Set(["siege"]);
const DAY_MS = 24 * HOUR_MS;

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
        e.type === "decree_share",
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
        kind: e.type === "land_threatened" ? "siege" : "family",
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
    // Pass Négociant: a Criée has just opened, and offers well below the reference price.
    const holders = [...people].filter((id) => hasPass(state, id, now));
    const criee = currentCriee(this.world.ctx, now);
    if (criee && within(criee.startsAt)) {
      for (const id of holders) {
        notices.push({
          accountId: id,
          kind: "criee",
          data: {
            city: criee.city,
            resource: criee.resource,
            premiumBps: criee.premiumBps,
            endsAt: criee.endsAt,
          },
        });
      }
    }
    if (holders.length > 0) {
      const refs = this.world.ctx.settings.referencePrices;
      const deals = new Map<string, bigint>();
      for (const o of Object.values(state.orders)) {
        if (o.side !== "sell" || o.kind !== "limit" || o.playerId === MARKET_MAKER) continue;
        if (!within(o.createdAt)) continue;
        const ref = refs[o.resource] ?? 0n;
        // An offer at least 10 % below the reference price.
        if (ref > 0n && o.price * 10n <= ref * 9n) {
          const best = deals.get(o.resource);
          if (best === undefined || o.price < best) deals.set(o.resource, o.price);
        }
      }
      for (const [resource, price] of deals) {
        for (const id of holders) {
          notices.push({
            accountId: id,
            kind: "deal",
            data: { resource, price: price.toString() },
          });
        }
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
    await this.send(
      rows.map((r) => ({
        accountId: r.accountId,
        kind: "week" as const,
        data: { week, rank: r.rank, gain: r.gain.toString(), award: r.award },
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
    const prefs = new Map(
      (
        await this.db
          .select({ id: accounts.id, off: accounts.pushOff })
          .from(accounts)
          .where(inArray(accounts.id, ids))
      ).map((r) => [r.id, new Set(r.off)]),
    );
    for (const n of saved) {
      const mine = subs.filter((s) => s.accountId === n.accountId);
      if (mine.length === 0 || prefs.get(n.accountId)?.has(n.kind)) continue;
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
      const text = pushText(n.kind, n.data, this.cities, now);
      const payload = JSON.stringify({ ...text, kind: n.kind, url: "/" });
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
