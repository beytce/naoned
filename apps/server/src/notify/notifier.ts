import {
  MARKET_MAKER,
  activeEvent,
  currentCriee,
  hasPass,
  hourIn,
  hourWithin,
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
  "galley",
  "raid",
  "corsairs",
  "event",
  "week",
  "season",
  "criee",
  "deal",
  "family",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

interface Notice {
  accountId: string;
  kind: NotificationKind;
  data: Record<string, unknown>;
}

/**
 * Watches the world once a minute and notifies people (never bots): harvest ready, galley back,
 * new event, weekly results. Every notice goes to the bell; it is also pushed to the player's
 * devices unless they turned that kind off, it is night in Paris (22 h – 8 h), or a notice of the
 * same kind was pushed to them less than an hour ago.
 */
export class Notifier {
  private last: number | undefined;
  private timer: NodeJS.Timeout | undefined;
  private readonly ports: Record<string, string>;

  constructor(
    private readonly db: Db,
    private readonly world: GameWorld,
    private readonly pusher: Pusher,
    private readonly quiet = { from: 22, to: 8 },
  ) {
    this.ports = Object.fromEntries((world.ctx.theme.ports ?? []).map((p) => [p.code, p.name]));
  }

  /**
   * Offers that found a taker, straight from what a command wrote: one notice per player,
   * resource and side, with the total traded.
   */
  async fromEffects(fx: Effects, now: number): Promise<void> {
    await this.familyWeek(fx, now);
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
   * The families' week has closed: each member (people only) learns where their family finished
   * and who holds power for the week starting.
   */
  private async familyWeek(fx: Effects, now: number): Promise<void> {
    const closed = fx.events.find((e) => e.type === "family_week_closed");
    if (!closed) return;
    const data = closed.data ?? {};
    const standings = (data.standings ?? []) as { family: string }[];
    const members = this.world.current.families?.members ?? {};
    const people = await this.people();
    const notices: Notice[] = [];
    for (const [accountId, family] of Object.entries(members)) {
      if (!people.has(accountId)) continue;
      notices.push({
        accountId,
        kind: "family",
        data: {
          week: data.week,
          family,
          winner: data.winner ?? null,
          rank: standings.findIndex((s) => s.family === family) + 1,
        },
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
    for (const e of Object.values(state.expeditions ?? {})) {
      if (e.outcome === "pending" && people.has(e.playerId) && within(e.returnAt)) {
        notices.push({
          accountId: e.playerId,
          kind: "galley",
          data: { expedition: e.id, destination: e.destination },
        });
      }
    }
    // Boardings resolved since the last scan: both sides hear about it.
    const boardings: {
      raid: string;
      raider: string;
      victim: string;
      route: string;
      success: boolean;
      taken: Record<string, number>;
    }[] = [];
    for (const r of Object.values(state.raids ?? {})) {
      for (const h of r.hits) {
        if (within(h.resolvedAt))
          boardings.push({
            raid: r.id,
            raider: r.playerId,
            victim: h.victimId,
            route: r.route,
            success: h.success,
            taken: h.taken,
          });
      }
      if (r.outcome === "cruising" && people.has(r.playerId) && within(r.endAt)) {
        notices.push({
          accountId: r.playerId,
          kind: "corsairs",
          data: { raid: r.id, route: r.route },
        });
      }
    }
    if (boardings.length > 0) {
      const ids = [...new Set(boardings.flatMap((b) => [b.raider, b.victim]))];
      const rows = await this.db
        .select({ id: accounts.id, pseudo: accounts.pseudo })
        .from(accounts)
        .where(inArray(accounts.id, ids));
      const name = new Map(rows.map((r) => [r.id, r.pseudo]));
      for (const b of boardings) {
        const data = {
          ...b,
          raiderName: name.get(b.raider) ?? null,
          victimName: name.get(b.victim) ?? null,
        };
        if (people.has(b.victim))
          notices.push({ accountId: b.victim, kind: "raid", data: { ...data, role: "victim" } });
        if (people.has(b.raider))
          notices.push({ accountId: b.raider, kind: "raid", data: { ...data, role: "corsair" } });
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
      const [recent] = await this.db
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
      const text = pushText(n.kind, n.data, this.ports);
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
