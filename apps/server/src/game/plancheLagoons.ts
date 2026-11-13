import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  plancheAccountLeagues,
  plancheLagoonLeagues,
  plancheSeats,
  plancheTides,
  worlds,
} from "../db/schema.js";
import type { PlancheHubTheme } from "./planche.js";
/** The status of a board retired for good (another map): kept for its ledger, never played. */
export const PLANCHE_RETIRED = "planche_retired";

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

  /** The league of each lagoon (docs/plan-maree.md T5), and the tides already settled. */
  private readonly leagues = new Map<string, number>();
  private readonly settled = new Set<string>();

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
      .select({ id: worlds.id, name: worlds.name, settings: worlds.settings })
      .from(worlds)
      .where(and(eq(worlds.status, PLANCHE_STATUS), eq(worlds.theme, PLANCHE_THEME)))
      .orderBy(asc(worlds.createdAt));
    const stores: PlancheStore[] = [];
    const map = theme.board.houses.map((h) => h.id).join(",");
    for (const r of rows) {
      // A board of another map (the board of 8 before the lagoons): retired, its seats freed, its
      // players seated anew (the owner's choice, 12 November 2026). Its ledger stays.
      const board = (r.settings as { board?: { houses?: { id: string }[]; maison?: unknown } })
        ?.board;
      // Another map, or a lagoon opened before the growth of the houses (docs/plan-progression-maison.md).
      const other = (board?.houses ?? []).map((h) => h.id).join(",") !== map;
      const older = !!theme.board.maison && !board?.maison;
      if (other || older) {
        await db.transaction(async (tx) => {
          await tx.delete(plancheSeats).where(eq(plancheSeats.worldId, r.id));
          await tx.update(worlds).set({ status: PLANCHE_RETIRED }).where(eq(worlds.id, r.id));
        });
        continue;
      }
      stores.push(await PlancheStore.load(db, theme, r.id, now, options));
    }
    if (!stores.length)
      stores.push(await PlancheStore.create(db, theme, now, lagoonName(0), options));
    const lagoons = new PlancheLagoons(db, theme, stores, options);
    for (const r of await db.select().from(plancheLagoonLeagues))
      lagoons.leagues.set(r.worldId, r.league);
    for (const r of await db.select().from(plancheTides))
      lagoons.settled.add(`${r.worldId}:${r.tide}`);
    return lagoons;
  }

  /** The league of a lagoon: 1 the first, the last the Sérénissime. */
  leagueOf(store: PlancheStore): number {
    return this.leagues.get(store.worldId) ?? 1;
  }

  /** How many leagues there are (the last one is the Sérénissime). */
  leagueCount(): number {
    return this.theme.board.ligues?.count ?? 1;
  }

  /** A new lagoon of a league, saved at once. */
  private async openLagoon(league: number, now: number): Promise<PlancheStore> {
    const store = await PlancheStore.create(
      this.db,
      this.theme,
      now,
      league >= this.leagueCount() && this.leagueCount() > 1
        ? "La Sérénissime"
        : lagoonName(this.stores.length),
      this.options,
    );
    this.stores.push(store);
    if (this.timerMs) store.start(this.timerMs);
    for (const l of this.listeners) store.hub.onChange(l);
    if (league !== 1) {
      await this.db.insert(plancheLagoonLeagues).values({ worldId: store.worldId, league });
      this.leagues.set(store.worldId, league);
    }
    return store;
  }

  /**
   * The leagues at the end of a tide (docs/plan-maree.md T5): in each lagoon whose tide has ended,
   * the top sixth of its players go up a league, the bottom sixth down one (never more than one
   * below the best they reached); each house moves whole. Once a tide and a lagoon.
   */
  turnLeagues(now: number): Promise<void> {
    const L = this.theme.board.ligues;
    if (!L || L.count < 2) return Promise.resolve();
    return this.serial(async () => {
      for (const store of [...this.stores]) {
        const final = store.hub.current().doc.state.rank.final;
        if (!final || this.settled.has(`${store.worldId}:${final.tide}`)) continue;
        const claimed = await this.db
          .insert(plancheTides)
          .values({ worldId: store.worldId, tide: final.tide, moves: {}, doneAt: new Date(now) })
          .onConflictDoNothing()
          .returning({ tide: plancheTides.tide });
        this.settled.add(`${store.worldId}:${final.tide}`);
        if (!claimed.length) continue;
        const league = this.leagueOf(store);
        const { doc } = store.hub.current();
        const players = final.order
          .map((house) => Object.entries(doc.seats).find(([, s]) => s.house === house)?.[0])
          .filter((p): p is string => !!p);
        if (!players.length) continue;
        const share = L.shareBps / 10_000;
        const up = league < L.count ? players.slice(0, Math.ceil(players.length * share)) : [];
        const bottom = players.slice(players.length - Math.floor(players.length * share));
        const down: string[] = [];
        for (const p of bottom) {
          if (up.includes(p) || league <= 1) continue;
          const [best] = await this.db
            .select()
            .from(plancheAccountLeagues)
            .where(eq(plancheAccountLeagues.accountId, p));
          if (league - 1 >= (best?.best ?? league) - 1) down.push(p);
        }
        const moved = { up: [] as string[], down: [] as string[] };
        for (const p of down) if (await this.move(p, store, league - 1, now)) moved.down.push(p);
        for (const p of up) if (await this.move(p, store, league + 1, now)) moved.up.push(p);
        await this.db
          .update(plancheTides)
          .set({ moves: moved })
          .where(and(eq(plancheTides.worldId, store.worldId), eq(plancheTides.tide, final.tide)));
      }
    });
  }

  /** A player's house carried, whole, to a lagoon of another league. False: no seat for it. */
  private async move(
    player: string,
    from: PlancheStore,
    league: number,
    now: number,
  ): Promise<boolean> {
    const top = league >= this.leagueCount();
    let to = this.stores.find((s) => s !== from && this.leagueOf(s) === league && s.hub.free() > 0);
    if (!to) {
      // The Sérénissime is one lagoon: when it is full, who would go up waits a tide.
      if (top && this.stores.some((s) => this.leagueOf(s) === league)) return false;
      to = await this.openLagoon(league, now);
    }
    const name = from.hub.current().doc.seats[player]?.name ?? "";
    const gone = await from.hub.leave(player, now);
    if (!gone) return false;
    if ((await to.hub.arrive(player, name, gone, now)) !== "ok") {
      // No room after all: the house goes back where it was.
      await from.hub.arrive(player, name, gone, now);
      return false;
    }
    const house = to.hub.houseOf(player) ?? "";
    await this.db.delete(plancheSeats).where(eq(plancheSeats.accountId, player));
    await this.record(to, house, player, now);
    await this.db
      .insert(plancheAccountLeagues)
      .values({ accountId: player, best: league })
      .onConflictDoUpdate({
        target: plancheAccountLeagues.accountId,
        set: { best: league },
        setWhere: sql`${plancheAccountLeagues.best} < ${league}`,
      });
    return true;
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
    /** The boards to seat a newcomer on first, if one has room (its company's, docs/plan-compagnie.md). */
    prefer: string[] = [],
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
      // A newcomer begins in the first league (docs/plan-maree.md T5), or in its company's lagoon.
      const store =
        this.stores.find((s) => prefer.includes(s.worldId) && s.hub.free() > 0) ??
        this.stores.find((s) => this.leagueOf(s) === 1 && s.hub.free() > 0) ??
        (await this.openLagoon(1, now));
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
