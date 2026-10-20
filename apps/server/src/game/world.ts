import { randomUUID } from "node:crypto";
import {
  type Command,
  type Effects,
  type GameEvent,
  type JournalTotals,
  type LedgerEntry,
  type LedgerReason,
  type WorldContext,
  type WorldState,
  adoptTurnover,
  checkInvariants,
  createWorldState,
  decide,
  emptyEffects,
  emptyTotals,
  parseSettings,
  seasonEnd,
  upgradeLegacyState,
  venice1450,
  venice1450Settings,
} from "@comptoirs/engine";
import { and, asc, eq, gt, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  ledgerEntries,
  players,
  stockMovements,
  telemetry,
  trades,
  worldCommands,
  worldStates,
  worlds,
} from "../db/schema.js";
import { nextSeasonBounds, seasonBounds, seasonMonthName } from "./calendar.js";
import { recordInfluence, recordSeasonInfluence } from "./house.js";
import { recordSeason } from "./season.js";
import { decode, encode } from "./serialize.js";
import { recordTerra } from "./terraRecord.js";
import { TUTORIAL_STEPS, stepsReached } from "./tutorial.js";
import { recordWeek } from "./weekly.js";

const THEMES = { venice1450 } as const;

export type ActionResult = { ok: true } | { ok: false; error: string };

/** After a saved command or batch: its effects, its time, the version it made, and if a tick. */
export type EffectsListener = (
  fx: Effects,
  now: number,
  saved: { version: number; tick: boolean },
) => void;

export interface WorldOptions {
  settingsFromTheme?: boolean;
  /** A snapshot of the state at least this often (ms) … */
  snapshotEveryMs?: number;
  /** … or after this many saved versions, whichever comes first. */
  snapshotEveryVersions?: number;
  /** Settings forced on every world opened (tests: the Pass switched on). */
  settingsOverride?: Record<string, unknown>;
}

/**
 * One running world. Commands are serialised in memory (one server instance), applied by the
 * pure engine, then saved in a single SQL transaction: the commands themselves (`world_commands`),
 * ledger entries, stock movements, trades and telemetry; the whole state only now and then (a
 * snapshot), the commands since being replayed on loading. If saving fails, the in-memory state
 * is left unchanged.
 */
export class GameWorld {
  private queue: Promise<unknown> = Promise.resolve();
  private listeners: EffectsListener[] = [];

  /** Called after every saved command or batch, with what it wrote (notifications, push). */
  onEffects(listener: EffectsListener): void {
    this.listeners.push(listener);
  }

  private notify(fx: Effects, now: number, tick = false): void {
    const saved = { version: this.version, tick };
    for (const l of this.listeners) {
      try {
        l(fx, now, saved);
      } catch {
        // A listener never breaks the game.
      }
    }
  }
  private timer: NodeJS.Timeout | undefined;

  private constructor(
    /** This server instance, owner of the world while it runs. */
    private readonly instance: string,
    private readonly db: Db,
    public id: string,
    public name: string,
    public ctx: WorldContext,
    private state: WorldState,
    private version: number,
    private readonly clock: () => number,
    private readonly options: WorldOptions,
  ) {
    this.snapshotVersion = version;
    this.snapshotAt = clock();
  }

  /** Version and time of the last snapshot written. */
  private snapshotVersion: number;
  private snapshotAt: number;

  /** Loads the open world, creating the first one (Venice 1450, until the end of the month). */
  static async open(
    db: Db,
    clock: () => number = Date.now,
    options: WorldOptions = {},
  ): Promise<GameWorld> {
    let [world] = await db.select().from(worlds).where(eq(worlds.status, "open")).limit(1);
    if (!world) {
      // Seasons follow calendar months: the first one runs to the end of this month.
      world = await createWorld(db, seasonBounds(clock()));
    }
    const instance = randomUUID();
    const loaded = await loadWorld(db, world, options, instance);
    return new GameWorld(
      instance,
      db,
      world.id,
      world.name,
      loaded.ctx,
      loaded.state,
      loaded.version,
      clock,
      options,
    );
  }

  private seasonListeners: ((closedWorldId: string) => void)[] = [];

  /** Called once a new season has opened (the closed world's id is passed). */
  onSeasonOpened(listener: (closedWorldId: string) => void): void {
    this.seasonListeners.push(listener);
  }

  /**
   * After the final ranking: closes this world and opens the next calendar month in its place.
   * Players join the new season from scratch (region, capital, workshops).
   */
  private async rollover(now: number): Promise<void> {
    const closedId = this.id;
    let bounds = nextSeasonBounds(seasonEnd(this.ctx));
    // A server stopped for a long time skips the months nobody could play.
    while (bounds.endsAt <= now) bounds = nextSeasonBounds(bounds.endsAt);
    const next = await this.db.transaction(async (tx) => {
      await tx.update(worlds).set({ status: "closed" }).where(eq(worlds.id, closedId));
      return createWorld(tx, bounds);
    });
    const loaded = await loadWorld(this.db, next, this.options, this.instance);
    this.id = next.id;
    this.name = next.name;
    this.ctx = loaded.ctx;
    this.state = loaded.state;
    this.version = loaded.version;
    this.snapshotVersion = loaded.version;
    this.snapshotAt = now;
    for (const l of this.seasonListeners) {
      try {
        l(closedId);
      } catch {
        // A listener never breaks the game.
      }
    }
  }

  /**
   * Moves the end of the season (admin: to rehearse the closing on a test world, or to fix a
   * calendar). Never into the past: the next tick would close the season at once.
   */
  reschedule(endsAt: number): Promise<void> {
    return this.serial(async () => {
      if (endsAt <= this.clock()) throw new Error("the end of a season must be in the future");
      await this.db
        .update(worlds)
        .set({ endsAt: new Date(endsAt) })
        .where(eq(worlds.id, this.id));
      this.ctx = { ...this.ctx, endAt: endsAt };
    });
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

  private lost = false;
  private lostListeners: (() => void)[] = [];

  /** Called once if another instance takes the world over (this one must stop). */
  onLostOwnership(listener: () => void): void {
    this.lostListeners.push(listener);
  }

  /**
   * Saves through `persist`; if the saved state changed behind this instance's back, reloads it
   * and lets the caller decide again (once). If another instance took over, stops for good.
   */
  private async guarded(attempt: () => Promise<void>, retry = true): Promise<boolean> {
    for (let tries = 0; tries < (retry ? 2 : 1); tries++) {
      try {
        await attempt();
        return true;
      } catch (err) {
        if (!(err instanceof StaleState)) throw err;
        if (err.lost) {
          this.loseOwnership();
          return false;
        }
        await this.reload();
      }
    }
    return false;
  }

  private loseOwnership(): void {
    if (this.lost) return;
    this.lost = true;
    this.stopTicking();
    for (const l of this.lostListeners) {
      try {
        l();
      } catch {
        // Stopping anyway.
      }
    }
  }

  private async reload(): Promise<void> {
    const [saved] = await this.db
      .select()
      .from(worldStates)
      .where(eq(worldStates.worldId, this.id));
    if (!saved) return;
    if (saved.owner !== this.instance) throw new StaleState(true);
    const replayed = await replayJournal(
      this.db,
      this.ctx,
      this.id,
      decode<WorldState>(saved.state),
      saved.version,
    );
    this.state = replayed.state;
    this.version = replayed.version;
    this.snapshotVersion = saved.version;
  }

  /** Writes a snapshot now (on shutdown): the next start replays nothing. */
  snapshot(): Promise<void> {
    return this.serial(async () => {
      if (this.lost || this.version === this.snapshotVersion) return;
      const version = this.version;
      const state = this.state;
      await this.db.transaction((tx) => writeSnapshot(tx, this.id, this.instance, state, version));
      this.snapshotVersion = version;
      this.snapshotAt = this.clock();
    });
  }

  execute(command: Command): Promise<ActionResult> {
    return this.serial(async () => {
      if (this.lost) return { ok: false, error: "lost_ownership" };
      let res: ReturnType<typeof decide> | undefined;
      let now = this.clock();
      const saved = await this.guarded(async () => {
        now = this.clock();
        res = decide(this.ctx, this.state, command, now);
        if (res.ok) await this.persist(res.state, res.effects, now, command, [command]);
      }).catch((err) => {
        if (err instanceof StaleState && err.lost) {
          this.loseOwnership();
          return false;
        }
        throw err;
      });
      if (this.lost) return { ok: false, error: "lost_ownership" };
      if (!res) return { ok: false, error: "stale_state" };
      if (!res.ok) return { ok: false, error: res.error };
      if (!saved) return { ok: false, error: "stale_state" };
      this.state = res.state;
      this.version += 1;
      this.notify(res.effects, now, command.type === "tick");
      if (command.type === "tick" && this.state.seasonClosed) await this.rollover(now);
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
    /** The person acting, if any: their tutorial and telemetry are recorded as for a command. */
    playerId?: string,
  ): Promise<number> {
    return this.serial(async () => {
      const now = this.clock();
      let state = this.state;
      const fx = emptyEffects();
      let accepted = 0;
      const journal: Command[] = [];
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
          journal.push(command);
          accepted++;
          return true;
        },
      });
      if (accepted === 0 || this.lost) return 0;
      // A bot session is not replayed on a conflict: it simply plays at its next turn.
      const saved = await this.guarded(
        () =>
          this.persist(
            state,
            fx,
            now,
            playerId ? { type: "collect", playerId, buildingId: "" } : null,
            journal,
          ),
        false,
      ).catch(() => false);
      if (!saved) return 0;
      this.state = state;
      this.version += 1;
      this.notify(fx, now);
      return accepted;
    });
  }

  private async persist(
    next: WorldState,
    fx: Effects,
    now: number,
    command: Command | null,
    /** The commands that made `next`, replayed on loading. */
    journal: Command[],
  ) {
    const at = new Date(now);
    const worldId = this.id;
    const version = this.version + 1;
    const snapshot =
      now - this.snapshotAt >= (this.options.snapshotEveryMs ?? 60_000) ||
      version - this.snapshotVersion >= (this.options.snapshotEveryVersions ?? 200);
    await this.db.transaction(async (tx) => {
      // The commands, as the next version, while this instance still owns the world: another
      // writer (a version taken, an instance that took over) stops it here.
      const inserted = rowsOf(
        await tx.execute(sql`
          insert into world_commands (world_id, version, at, commands)
          select ${worldId}, ${version}, ${now}, ${JSON.stringify(encode(journal))}::jsonb
          where exists (
            select 1 from world_states where world_id = ${worldId} and owner = ${this.instance}
          )
          on conflict do nothing
          returning version`),
      );
      if (inserted.length !== 1) {
        const [row] = await tx
          .select({ owner: worldStates.owner })
          .from(worldStates)
          .where(eq(worldStates.worldId, worldId));
        throw new StaleState(row?.owner !== this.instance);
      }
      if (snapshot) await writeSnapshot(tx, worldId, this.instance, next, version);

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
        // The Pass is won only while it is on.
        const passOn = this.ctx.settings.pass.enabled;
        if (e.type === "week_closed") {
          await recordWeek(tx, worldId, e.data ?? {}, passOn ? now : undefined);
        }
        if (e.type === "season_closed") {
          const ranked = await recordSeason(
            tx,
            worldId,
            e.data ?? {},
            passOn ? seasonEnd(this.ctx) : undefined,
          );
          await recordSeasonInfluence(tx, worldId, this.ctx.settings, ranked, at);
        }
      }
      // The house's Influence, kept from season to season.
      await recordInfluence(tx, worldId, fx.events, at);
      // The Terraferma's weeks: results and ratings.
      await recordTerra(tx, worldId, fx.events, new Date(now));

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
        await this.recordTutorial(tx, command.playerId, fx.events, at);
      } else {
        // The tick settles deliveries on arrival: a first delivery is a step of the tutorial.
        const arrived = new Set(
          fx.events.filter((e) => e.type === "delivery_arrived").map((e) => e.playerId ?? ""),
        );
        for (const id of arrived) {
          const mine = fx.events.filter((e) => e.playerId === id);
          await this.recordTutorial(tx, id, mine, at);
        }
      }
    });
    if (snapshot) {
      this.snapshotVersion = version;
      this.snapshotAt = now;
    }
  }

  private async recordTutorial(tx: Db, accountId: string, events: GameEvent[], at: Date) {
    const reached = stepsReached(this.ctx.theme, events);
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
  /** Time of the last tick saved (undefined until the scheduler runs). */
  lastTickAt: number | undefined;
  private tickInterval = 60_000;

  /** True when the scheduler runs but no tick has been saved for five intervals. */
  stalled(now: number = this.clock()): boolean {
    if (!this.timer || this.lastTickAt === undefined) return false;
    return now - this.lastTickAt > 5 * this.tickInterval;
  }

  startTicking(intervalMs = 60_000, onError: (err: unknown) => void = console.error): void {
    this.stopTicking();
    this.tickInterval = intervalMs;
    this.lastTickAt = this.clock();
    const tick = () =>
      this.execute({ type: "tick" })
        .then((res) => {
          if (res.ok) this.lastTickAt = this.clock();
        })
        .catch(onError);
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

  /** The version saved last (one per command or batch): what a view was built from. */
  get savedVersion(): number {
    return this.version;
  }

  /** The six invariants, checked between the saved state and the journals in the database. */
  async checkInvariants() {
    return this.serial(async () => checkInvariants(this.state, await this.journalTotals()));
  }
}

type WorldRow = typeof worlds.$inferSelect;

/** The whole state as `version`, and the commands it already holds forgotten. */
async function writeSnapshot(
  tx: Db,
  worldId: string,
  owner: string,
  state: WorldState,
  version: number,
): Promise<void> {
  const written = await tx
    .update(worldStates)
    .set({ state: encode(state), version, updatedAt: new Date() })
    .where(and(eq(worldStates.worldId, worldId), eq(worldStates.owner, owner)))
    .returning({ version: worldStates.version });
  if (written.length !== 1) throw new StaleState(true);
  await tx
    .delete(worldCommands)
    .where(and(eq(worldCommands.worldId, worldId), lte(worldCommands.version, version)));
}

/**
 * The commands saved after a snapshot, applied to it again: the engine is deterministic, so this
 * is the state they made. Stops at a gap in the versions (never written).
 */
async function replayJournal(
  db: Db,
  ctx: WorldContext,
  worldId: string,
  snapshot: WorldState,
  snapshotVersion: number,
): Promise<{ state: WorldState; version: number; replayed: number }> {
  const rows = await db
    .select()
    .from(worldCommands)
    .where(and(eq(worldCommands.worldId, worldId), gt(worldCommands.version, snapshotVersion)))
    .orderBy(asc(worldCommands.version));
  let state = snapshot;
  let version = snapshotVersion;
  for (const row of rows) {
    if (row.version !== version + 1) break;
    for (const command of decode<Command[]>(row.commands)) {
      const res = decide(ctx, state, command, row.at);
      if (res.ok) state = res.state;
      else console.warn(`replay of ${command.type} at version ${row.version}: ${res.error}`);
    }
    version = row.version;
  }
  return { state, version, replayed: version - snapshotVersion };
}

async function createWorld(db: Db, bounds: { startsAt: number; endsAt: number }) {
  const [world] = await db
    .insert(worlds)
    .values({
      name: `Venise 1450 · ${seasonMonthName(bounds.endsAt)}`,
      theme: "venice1450",
      startsAt: new Date(bounds.startsAt),
      endsAt: new Date(bounds.endsAt),
      settings: venice1450Settings,
    })
    .returning();
  if (!world) throw new Error("could not create a world");
  return world;
}

/** Engine context and saved state of a world (a fresh state for a new one). */
async function loadWorld(db: Db, world: WorldRow, options: WorldOptions, owner: string) {
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
  if (options.settingsOverride) stored = mergeDefaults(stored, options.settingsOverride);
  if (JSON.stringify(stored) !== JSON.stringify(world.settings)) {
    await db.update(worlds).set({ settings: stored }).where(eq(worlds.id, world.id));
  }
  const ctx: WorldContext = {
    theme,
    // The world id is never sent to players: it seeds draws (events, contracts, pirates).
    seed: world.id,
    settings: parseSettings(stored),
    startAt: world.startsAt.getTime(),
    endAt: world.endsAt.getTime(),
  };
  // Take over first, then read: an old instance can no longer write once we hold the state.
  await db.update(worldStates).set({ owner }).where(eq(worldStates.worldId, world.id));
  const [saved] = await db.select().from(worldStates).where(eq(worldStates.worldId, world.id));
  if (saved) {
    // Saves from earlier versions are brought up to date before anything reads them.
    const legacy = upgradeLegacyState(decode<WorldState>(saved.state));
    const snapshot = legacy.turnover ? legacy : await withTurnover(db, ctx, world.id, legacy);
    // The commands since the snapshot, under the settings they were decided with.
    const before: WorldContext = {
      ...ctx,
      settings: parseSettings(mergeDefaults(venice1450Settings, world.settings)),
    };
    const replay = await replayJournal(db, before, world.id, snapshot, saved.version);
    if (replay.replayed > 0) {
      await db.transaction((tx) =>
        writeSnapshot(tx, world.id, owner, replay.state, replay.version),
      );
    }
    return { ctx, state: replay.state, version: replay.version };
  }
  const state = createWorldState(ctx);
  await db
    .insert(worldStates)
    .values({ worldId: world.id, version: 0, state: encode(state), owner });
  return { ctx, state, version: 0 };
}

/**
 * A save from before the ranking by net sales: they are rebuilt from the season's ledger, summed
 * per accounts and reason, before and after the start of the current week.
 */
async function withTurnover(
  db: Db,
  ctx: WorldContext,
  worldId: string,
  state: WorldState,
): Promise<WorldState> {
  const weekStartAt = ctx.startAt + (state.weekly?.week ?? 0) * 7 * 86_400_000;
  const result = await db.execute(sql`
    select from_account as "from", to_account as "to", reason,
      at < ${new Date(weekStartAt)} as before, sum(amount)::text as amount
    from ledger_entries where world_id = ${worldId}
    group by 1, 2, 3, 4`);
  const rows = (
    result as unknown as {
      rows: { from: string; to: string; reason: string; before: boolean; amount: string }[];
    }
  ).rows;
  const entries: LedgerEntry[] = rows.map((r) => ({
    from: r.from,
    to: r.to,
    reason: r.reason as LedgerReason,
    amount: BigInt(r.amount),
    at: r.before ? weekStartAt - 1 : weekStartAt,
  }));
  return adoptTurnover(state, entries, weekStartAt);
}

/** The saved state was written by another instance, or changed behind this one's back. */
class StaleState extends Error {
  constructor(readonly lost: boolean) {
    super(lost ? "another server instance took over the world" : "world state changed elsewhere");
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
