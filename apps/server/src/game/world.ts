import {
  type Command,
  type Effects,
  type JournalTotals,
  type WorldContext,
  type WorldState,
  checkInvariants,
  createWorldState,
  decide,
  emptyEffects,
  emptyTotals,
  parseSettings,
  venice1450,
  venice1450Settings,
} from "@comptoirs/engine";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  ledgerEntries,
  players,
  stockMovements,
  telemetry,
  trades,
  worldStates,
  worlds,
} from "../db/schema.js";
import { decode, encode } from "./serialize.js";
import { TUTORIAL_STEPS, stepsReached } from "./tutorial.js";
import { recordWeek } from "./weekly.js";

const THEMES = { venice1450 } as const;
const DAY_MS = 86_400_000;

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * One running world. Commands are serialised in memory (one server instance), applied by the
 * pure engine, then saved in a single SQL transaction: new state, ledger entries, stock movements,
 * trades and telemetry. If saving fails, the in-memory state is left unchanged.
 */
export class GameWorld {
  private queue: Promise<unknown> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;

  private constructor(
    private readonly db: Db,
    readonly id: string,
    readonly name: string,
    readonly ctx: WorldContext,
    private state: WorldState,
    private version: number,
    private readonly clock: () => number,
  ) {}

  /** Loads the open world, creating the first one (Venice 1450, starting now) if there is none. */
  static async open(
    db: Db,
    clock: () => number = Date.now,
    options: { settingsFromTheme?: boolean } = {},
  ): Promise<GameWorld> {
    let [world] = await db.select().from(worlds).where(eq(worlds.status, "open")).limit(1);
    if (!world) {
      const start = new Date(clock());
      const settings = parseSettings(venice1450Settings);
      [world] = await db
        .insert(worlds)
        .values({
          name: "Venise 1450 — bêta",
          theme: "venice1450",
          startsAt: start,
          endsAt: new Date(start.getTime() + settings.seasonDays * DAY_MS),
          settings: venice1450Settings,
        })
        .returning();
    }
    if (!world) throw new Error("could not create a world");
    const theme = THEMES[world.theme as keyof typeof THEMES];
    if (!theme) throw new Error(`unknown theme ${world.theme}`);
    let stored: unknown = world.settings;
    if (options.settingsFromTheme) {
      // Beta: the world follows the theme's current balancing, new mechanics included.
      stored = venice1450Settings;
    } else {
      // New mechanics get their defaults; values already set in the world are kept.
      stored = mergeDefaults(venice1450Settings, world.settings);
    }
    if (JSON.stringify(stored) !== JSON.stringify(world.settings)) {
      await db.update(worlds).set({ settings: stored }).where(eq(worlds.id, world.id));
    }
    const ctx: WorldContext = {
      theme,
      // The world id is never sent to players: it seeds draws (events, contracts, pirates).
      seed: world.id,
      settings: parseSettings(stored),
      startAt: world.startsAt.getTime(),
    };

    const [saved] = await db.select().from(worldStates).where(eq(worldStates.worldId, world.id));
    let state: WorldState;
    let version: number;
    if (saved) {
      state = decode<WorldState>(saved.state);
      version = saved.version;
    } else {
      state = createWorldState(ctx);
      version = 0;
      await db.insert(worldStates).values({ worldId: world.id, version, state: encode(state) });
    }
    return new GameWorld(db, world.id, world.name, ctx, state, version, clock);
  }

  get current(): WorldState {
    return this.state;
  }

  now(): number {
    return this.clock();
  }

  /** Runs `fn` after every queued command: commands never interleave. */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  execute(command: Command): Promise<ActionResult> {
    return this.serial(async () => {
      const now = this.clock();
      const res = decide(this.ctx, this.state, command, now);
      if (!res.ok) return { ok: false, error: res.error };
      await this.persist(res.state, res.effects, now, command);
      this.state = res.state;
      this.version += 1;
      return { ok: true };
    });
  }

  /**
   * Several commands for one player, decided one after another on the live state and saved in a
   * single transaction (a bot's session). Refused commands are skipped, as for a person.
   * Returns the number of accepted commands.
   */
  batch(
    play: (session: {
      act: (command: Command) => boolean;
      state: () => WorldState;
      now: number;
    }) => void,
  ): Promise<number> {
    return this.serial(async () => {
      const now = this.clock();
      let state = this.state;
      const fx = emptyEffects();
      let accepted = 0;
      play({
        now,
        state: () => state,
        act: (command) => {
          const res = decide(this.ctx, state, command, now);
          if (!res.ok) return false;
          state = res.state;
          fx.ledger.push(...res.effects.ledger);
          fx.stock.push(...res.effects.stock);
          fx.trades.push(...res.effects.trades);
          fx.events.push(...res.effects.events);
          accepted++;
          return true;
        },
      });
      if (accepted === 0) return 0;
      await this.persist(state, fx, now, null);
      this.state = state;
      this.version += 1;
      return accepted;
    });
  }

  private async persist(next: WorldState, fx: Effects, now: number, command: Command | null) {
    const at = new Date(now);
    const worldId = this.id;
    await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(worldStates)
        .set({ state: encode(next), version: this.version + 1, updatedAt: at })
        .where(and(eq(worldStates.worldId, worldId), eq(worldStates.version, this.version)))
        .returning({ version: worldStates.version });
      if (updated.length !== 1) throw new Error("world state changed elsewhere (two servers?)");

      if (fx.ledger.length > 0) {
        await tx.insert(ledgerEntries).values(
          fx.ledger.map((e) => ({
            worldId,
            fromAccount: e.from,
            toAccount: e.to,
            amount: e.amount,
            reason: e.reason,
            ref: e.ref ?? null,
            at: new Date(e.at),
          })),
        );
      }
      if (fx.stock.length > 0) {
        await tx.insert(stockMovements).values(
          fx.stock.map((m) => ({
            worldId,
            playerId: m.playerId,
            resource: m.resource,
            quantity: m.quantity,
            reason: m.reason,
            ref: m.ref ?? null,
            at: new Date(m.at),
          })),
        );
      }
      if (fx.trades.length > 0) {
        await tx
          .insert(trades)
          .values(fx.trades.map((t) => ({ ...t, worldId, at: new Date(t.at) })));
      }

      const playerEvents = fx.events.filter((e) => e.playerId && e.playerId in next.players);
      // Bot sessions stay out of the telemetry (player KPIs).
      if (command && playerEvents.length > 0) {
        await tx.insert(telemetry).values(
          playerEvents.map((e) => ({
            accountId: e.playerId ?? null,
            worldId,
            type: e.type,
            at: new Date(e.at),
            props: (encode(e.data ?? {}) as Record<string, unknown>) ?? null,
          })),
        );
      }

      for (const e of fx.events) {
        if (e.type === "week_closed") await recordWeek(tx, worldId, e.data ?? {});
      }

      if (!command) {
        // A batch (bot session): journals only.
      } else if (command.type === "resetPlayer") {
        // The player row (region, tutorial) goes; the journals keep the history.
        await tx
          .delete(players)
          .where(and(eq(players.worldId, worldId), eq(players.accountId, command.playerId)));
        await tx.insert(telemetry).values({
          accountId: command.playerId,
          worldId,
          type: "player_reset",
          at,
          props: {},
        });
      } else if (command.type === "join") {
        const player = next.players[command.playerId];
        if (player) {
          await tx.insert(players).values({
            worldId,
            accountId: command.playerId,
            region: player.region,
            joinedAt: at,
            lastSeenAt: at,
          });
        }
      } else if (command.type !== "tick") {
        await this.recordTutorial(tx, command.playerId, fx, at);
      }
    });
  }

  private async recordTutorial(tx: Db, accountId: string, fx: Effects, at: Date) {
    const reached = stepsReached(this.ctx.theme, fx.events);
    if (reached.size === 0) return;
    const [row] = await tx
      .select({ steps: players.tutorialSteps })
      .from(players)
      .where(and(eq(players.worldId, this.id), eq(players.accountId, accountId)));
    if (!row) return;
    const done = new Set(row.steps);
    const fresh = TUTORIAL_STEPS.filter((s) => reached.has(s) && !done.has(s));
    if (fresh.length === 0) return;
    await tx
      .update(players)
      .set({ tutorialSteps: [...row.steps, ...fresh] })
      .where(and(eq(players.worldId, this.id), eq(players.accountId, accountId)));
    await tx.insert(telemetry).values(
      fresh.map((step) => ({
        accountId,
        worldId: this.id,
        type: "tutorial_step",
        at,
        props: { step, index: TUTORIAL_STEPS.indexOf(step) + 1 },
      })),
    );
  }

  /** Scheduled job: expirations, upkeep, projects, market maker. Every 60 s in production. */
  startTicking(intervalMs = 60_000, onError: (err: unknown) => void = console.error): void {
    this.stopTicking();
    const tick = () => this.execute({ type: "tick" }).catch(onError);
    void tick(); // quote the market maker right away after a restart
    this.timer = setInterval(tick, intervalMs);
  }

  stopTicking(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Journal totals rebuilt from the database: the reference for the invariant checks. */
  async journalTotals(): Promise<JournalTotals> {
    const totals = emptyTotals();
    const money = await this.db.execute(sql`
      select account, sum(delta)::text as balance from (
        select to_account as account, amount as delta from ledger_entries where world_id = ${this.id}
        union all
        select from_account, -amount from ledger_entries where world_id = ${this.id}
      ) t group by account`);
    for (const row of rowsOf<{ account: string; balance: string }>(money))
      totals.accounts.set(row.account, BigInt(row.balance));
    const stock = await this.db.execute(sql`
      select player_id, resource, sum(quantity)::text as qty from stock_movements
      where world_id = ${this.id} group by player_id, resource`);
    for (const row of rowsOf<{ player_id: string; resource: string; qty: string }>(stock)) {
      totals.stock.set(`${row.player_id}|${row.resource}`, Number(row.qty));
    }
    return totals;
  }

  /** The six invariants, checked between the saved state and the journals in the database. */
  async checkInvariants() {
    return this.serial(async () => checkInvariants(this.state, await this.journalTotals()));
  }
}

/** Deep merge for settings: `stored` wins, `defaults` fills what is missing. */
export function mergeDefaults(defaults: unknown, stored: unknown): unknown {
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  if (!isObject(defaults) || !isObject(stored)) return stored === undefined ? defaults : stored;
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(stored)) out[k] = mergeDefaults(defaults[k], v);
  return out;
}

/** node-postgres returns { rows }, PGlite returns { rows } too; keep the access in one place. */
function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
