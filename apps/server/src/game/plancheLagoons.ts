import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { plancheSeats, worlds } from "../db/schema.js";
import type { PlancheHubTheme } from "./planche.js";
import {
  PLANCHE_STATUS,
  PLANCHE_THEME,
  PlancheStore,
  type PlancheStoreOptions,
  lagoonName,
} from "./plancheStore.js";

/**
 * Every board of the server (docs/plan-compte.md C3): an account holds one house for good, on
 * one board; a newcomer takes a free house of the first board that has one, and a new board
 * opens when all are full. Each board is kept in the base by its own store.
 */
export class PlancheLagoons {
  private lock: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly db: Db,
    private readonly theme: PlancheHubTheme,
    private readonly stores: PlancheStore[],
    private readonly options: PlancheStoreOptions,
  ) {}

  /** Every board saved in the base, taken over by this instance; the first one begun if none. */
  static async open(
    db: Db,
    theme: PlancheHubTheme,
    now: number,
    options: PlancheStoreOptions = {},
  ): Promise<PlancheLagoons> {
    const rows = await db
      .select({ id: worlds.id, name: worlds.name })
      .from(worlds)
      .where(and(eq(worlds.status, PLANCHE_STATUS), eq(worlds.theme, PLANCHE_THEME)))
      .orderBy(asc(worlds.createdAt));
    const stores: PlancheStore[] = [];
    for (const r of rows) stores.push(await PlancheStore.load(db, theme, r.id, now, options));
    if (!stores.length)
      stores.push(await PlancheStore.create(db, theme, now, lagoonName(0), options));
    return new PlancheLagoons(db, theme, stores, options);
  }

  /** The boards, in the order they opened. */
  all(): readonly PlancheStore[] {
    return this.stores;
  }

  /** The game time the furthest board has reached. */
  reached(): number {
    return Math.max(0, ...this.stores.map((s) => s.hub.reached()));
  }

  private serial<T>(f: () => Promise<T>): Promise<T> {
    const next = this.lock.then(f, f);
    this.lock = next.catch(() => undefined);
    return next;
  }

  /**
   * The board and the house of an account, given one if it has none: a free house of the first
   * board that has one, or of a new board. One at a time, so that two newcomers never share one.
   */
  seatOf(
    accountId: string,
    name: string,
    now: number,
  ): Promise<{ store: PlancheStore; house: string }> {
    return this.serial(async () => {
      const [row] = await this.db
        .select()
        .from(plancheSeats)
        .where(eq(plancheSeats.accountId, accountId));
      const known = row && this.stores.find((s) => s.worldId === row.worldId);
      if (row && known) return { store: known, house: row.house };
      // Seated on a board whose seat was not written (a write cut short): written now.
      for (const store of this.stores) {
        const house = store.hub.houseOf(accountId);
        if (house) {
          await this.record(store, house, accountId, now);
          return { store, house };
        }
      }
      let store = this.stores.find((s) => s.hub.free() > 0);
      if (!store) {
        store = await PlancheStore.create(
          this.db,
          this.theme,
          now,
          lagoonName(this.stores.length),
          this.options,
        );
        this.stores.push(store);
        if (this.timerMs) store.start(this.timerMs);
        for (const l of this.listeners) store.hub.onChange(l);
      }
      await store.hub.view(accountId, name, now);
      const house = store.hub.houseOf(accountId);
      if (!house) throw new Error("planche_full");
      await this.record(store, house, accountId, now);
      return { store, house };
    });
  }

  private async record(store: PlancheStore, house: string, accountId: string, now: number) {
    await this.db
      .insert(plancheSeats)
      .values({ worldId: store.worldId, house, accountId, joinedAt: new Date(now) })
      .onConflictDoNothing();
  }

  private timerMs = 0;
  private readonly listeners: ((players: string[]) => void)[] = [];

  /** Called after each change saved on any board, with that board's players. */
  onChange(listener: (players: string[]) => void): void {
    this.listeners.push(listener);
    for (const s of this.stores) s.hub.onChange(listener);
  }

  /** Every board's ledger follows it, even when no one plays. */
  start(everyMs = 10 * 60_000): void {
    this.timerMs = everyMs;
    for (const s of this.stores) s.start(everyMs);
  }

  stop(): void {
    this.timerMs = 0;
    for (const s of this.stores) s.stop();
  }

  /** Every board written whole (on shutdown). */
  async snapshot(): Promise<void> {
    for (const s of this.stores) await s.snapshot();
  }
}
