import { activeEvent, weekIndex } from "@comptoirs/engine";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  accounts,
  notifications,
  players,
  pushSubscriptions,
  weeklyResults,
} from "../db/schema.js";
import type { GameWorld } from "../game/world.js";
import type { Pusher } from "./push.js";
import { pushText } from "./texts.js";

export const NOTIFICATION_KINDS = ["harvest", "galley", "event", "week"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const HOUR_MS = 3_600_000;

interface Notice {
  accountId: string;
  kind: NotificationKind;
  data: Record<string, unknown>;
}

/** Hour of the day in Paris, for the quiet hours. */
function parisHour(at: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 12);
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
    const hour = parisHour(now);
    const night =
      this.quiet.from > this.quiet.to
        ? hour >= this.quiet.from || hour < this.quiet.to
        : hour >= this.quiet.from && hour < this.quiet.to;
    if (night) return;

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
