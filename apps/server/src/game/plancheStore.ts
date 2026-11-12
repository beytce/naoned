import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  influenceEntries,
  ledgerEntries,
  maisonEvents,
  worldCommands,
  worldStates,
  worlds,
} from "../db/schema.js";
import {
  type PlancheCommand,
  type PlancheDoc,
  PlancheHub,
  type PlancheHubTheme,
  type PlancheJournal,
  plancheDocApply,
  plancheDocInit,
} from "./planche.js";
import { decode, encode } from "./serialize.js";

/** The theme a board of the planche is saved under; its status keeps it apart from the game's worlds. */
export const PLANCHE_THEME = "venice1450.planche";
export const PLANCHE_STATUS = "planche";

/** The saved board was written by another instance: this one must stop writing. */
export class PlancheLost extends Error {
  constructor() {
    super("another server instance took the board over");
  }
}

/** What the ledger already holds, house by house: the books as they were at the last write. */
interface Booked {
  houses: Record<string, { sold: bigint; tollPaid: bigint; tollIn: bigint; isle: bigint }>;
  burnt: bigint;
}

/**
 * The ledger's accounts of a board: each house, the towns that pay, the tolls on their way, what
 * tolls destroy, the islands' builders, and the mint of the starting purses.
 */
export const PLANCHE_ACCOUNTS = {
  towns: "planche:towns",
  tolls: "planche:tolls",
  burnt: "planche:burnt",
  isle: "planche:isle",
  mint: "planche:mint",
} as const;
const houseAccount = (id: string) => `house:${id}`;

type LedgerRow = { from: string; to: string; amount: bigint; reason: string };

/**
 * What moved since the ledger was last written (docs/plan-compte.md C2): sales, tolls, what tolls
 * destroyed, the islands' costs, and the starting purse of a house written for the first time.
 * Grouped by house and by write: the board counts by the ten minutes, the ledger by the gesture.
 */
function ledgerSince(
  doc: PlancheDoc,
  booked: Booked,
  startDucats: bigint,
): { rows: LedgerRow[]; next: Booked } {
  const rows: LedgerRow[] = [];
  const next: Booked = { houses: { ...booked.houses }, burnt: doc.state.burnt };
  const A = PLANCHE_ACCOUNTS;
  for (const [id, h] of Object.entries(doc.state.houses)) {
    const was = booked.houses[id];
    const me = houseAccount(id);
    if (!was && startDucats > 0n)
      rows.push({ from: A.mint, to: me, amount: startDucats, reason: "planche_start" });
    const b = was ?? { sold: 0n, tollPaid: 0n, tollIn: 0n, isle: 0n };
    const d = (k: keyof typeof b) => h.book[k] - b[k];
    if (d("sold") > 0n)
      rows.push({ from: A.towns, to: me, amount: d("sold"), reason: "planche_sale" });
    if (d("tollPaid") > 0n)
      rows.push({ from: me, to: A.tolls, amount: d("tollPaid"), reason: "planche_toll" });
    if (d("tollIn") > 0n)
      rows.push({ from: A.tolls, to: me, amount: d("tollIn"), reason: "planche_toll" });
    if (d("isle") > 0n)
      rows.push({ from: me, to: A.isle, amount: d("isle"), reason: "planche_isle" });
    next.houses[id] = { ...h.book };
  }
  const burnt = doc.state.burnt - booked.burnt;
  if (burnt > 0n)
    rows.push({ from: A.tolls, to: A.burnt, amount: burnt, reason: "planche_toll_burnt" });
  return { rows, next };
}

const bookOf = (doc: PlancheDoc): Booked => ({
  houses: Object.fromEntries(
    Object.entries(doc.state.houses).map(([id, h]) => [id, { ...h.book }]),
  ),
  burnt: doc.state.burnt,
});

/** The names of the lagoons, in the order they open: a new one when the others are full. */
export const LAGOONS = [
  "Lagune de Murano",
  "Lagune de Burano",
  "Lagune de Torcello",
  "Lagune du Lido",
  "Lagune de Pellestrina",
  "Lagune de Mazzorbo",
  "Lagune de la Giudecca",
  "Lagune de Chioggia",
];
export const lagoonName = (n: number) =>
  LAGOONS[n] ?? `${LAGOONS[n % LAGOONS.length]} ${Math.floor(n / LAGOONS.length) + 1}`;

const settingsOf = (theme: PlancheHubTheme) =>
  encode({ board: theme.board, visitHours: theme.visitHours, idleHours: theme.idleHours });

export interface PlancheStoreOptions {
  /** This server instance, owner of the board while it runs. */
  instance?: string;
  /** How often the whole board is written, beside the journal of its commands. */
  snapshotEveryMs?: number;
  snapshotEveryVersions?: number;
  /** The real clock, for the snapshots' pace. */
  clock?: () => number;
}

/**
 * The shared board kept in the base (docs/plan-compte.md C1), as the game's world is: a snapshot
 * of the whole board in `world_states`, the commands since in `world_commands`, played again on
 * loading (the board is deterministic). A deploy starts the new instance before stopping the old
 * one: the new one takes the board over, and the old one stops at its next write.
 */
export class PlancheStore implements PlancheJournal {
  hub!: PlancheHub;
  /** The lagoon's name, as players read it. */
  name = "";
  private snapshotVersion: number;
  private snapshotAt: number;
  private readonly clock: () => number;
  /** What the ledger holds; changed only inside a write. */
  private booked: Booked;
  /** One write after the other: two at once would write the same movement twice. */
  private lock: Promise<unknown> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;
  /** The Prestige and the Livre already copied to the accounts (docs/plan-progression-maison.md). */
  private readonly mirrored = new Set<string>();

  private constructor(
    private readonly db: Db,
    readonly worldId: string,
    private readonly instance: string,
    snapshotVersion: number,
    private readonly options: PlancheStoreOptions,
    booked: Booked,
    private readonly startDucats: bigint,
  ) {
    this.booked = booked;
    this.snapshotVersion = snapshotVersion;
    this.clock = options.clock ?? Date.now;
    this.snapshotAt = this.clock();
  }

  /** Opens the board saved in the base, or begins one; this instance takes it over. */
  static async open(
    db: Db,
    theme: PlancheHubTheme,
    now: number,
    options: PlancheStoreOptions = {},
  ): Promise<PlancheStore> {
    const [row] = await db
      .select()
      .from(worlds)
      .where(and(eq(worlds.status, PLANCHE_STATUS), eq(worlds.theme, PLANCHE_THEME)))
      .orderBy(asc(worlds.createdAt))
      .limit(1);
    return row
      ? PlancheStore.load(db, theme, row.id, now, options)
      : PlancheStore.create(db, theme, now, LAGOONS[0] ?? "La lagune", options);
  }

  /** A new board, saved at once as a world of its own. */
  static async create(
    db: Db,
    theme: PlancheHubTheme,
    now: number,
    name: string,
    options: PlancheStoreOptions = {},
  ): Promise<PlancheStore> {
    const [row] = await db
      .insert(worlds)
      .values({
        name,
        theme: PLANCHE_THEME,
        status: PLANCHE_STATUS,
        startsAt: new Date(now),
        // A board has no end: the tides follow one another (CADRAGE-v4 § 11).
        endsAt: new Date(now + 100 * 365 * 86_400_000),
        settings: settingsOf(theme),
      })
      .returning();
    if (!row) throw new Error("the board could not be created");
    return PlancheStore.load(db, theme, row.id, now, options);
  }

  /** A board saved in the base: this instance takes it over, and plays its journal again. */
  static async load(
    db: Db,
    theme: PlancheHubTheme,
    worldId: string,
    now: number,
    options: PlancheStoreOptions = {},
  ): Promise<PlancheStore> {
    const instance = options.instance ?? randomUUID();
    // The board's settings are those the server plays, written where the rules say they live.
    await db
      .update(worlds)
      .set({ settings: settingsOf(theme) })
      .where(eq(worlds.id, worldId));
    // Take over first, then read: an old instance can no longer write once we hold the board.
    await db.update(worldStates).set({ owner: instance }).where(eq(worldStates.worldId, worldId));
    const [saved] = await db.select().from(worldStates).where(eq(worldStates.worldId, worldId));
    let doc: PlancheDoc;
    let version: number;
    let snapshotVersion: number;
    let booked: Booked = { houses: {}, burnt: 0n };
    if (saved) {
      const kept = decode<PlancheDoc & { booked?: Booked }>(saved.state);
      const { booked: was, ...rest } = kept;
      doc = rest;
      if (was) booked = was;
      version = saved.version;
      snapshotVersion = saved.version;
      const rows = await db
        .select()
        .from(worldCommands)
        .where(and(eq(worldCommands.worldId, worldId), gt(worldCommands.version, saved.version)))
        .orderBy(asc(worldCommands.version));
      for (const r of rows) {
        if (r.version !== version + 1) break;
        for (const c of decode<PlancheCommand[]>(r.commands)) {
          const res = plancheDocApply(theme, doc, c);
          if (res.answer === "ok") doc = res.doc;
          else console.warn(`planche: replay of ${c.type} at version ${r.version}: ${res.answer}`);
        }
        version = r.version;
      }
      // Each command saved wrote the ledger up to itself: it holds the books as they replay.
      if (version > saved.version) booked = bookOf(doc);
    } else {
      doc = plancheDocInit(theme, now);
      version = 0;
      snapshotVersion = 0;
      await db
        .insert(worldStates)
        .values({ worldId, version: 0, state: encode(doc), owner: instance });
    }
    const [named] = await db
      .select({ name: worlds.name })
      .from(worlds)
      .where(eq(worlds.id, worldId));
    const store = new PlancheStore(
      db,
      worldId,
      instance,
      snapshotVersion,
      options,
      booked,
      BigInt(theme.board.rules.startDucats),
    );
    store.hub = new PlancheHub(theme, now, { doc, version }, store);
    store.name = named?.name ?? "";
    if (version > snapshotVersion || !saved) await store.snapshot();
    return store;
  }

  private locked<T>(f: () => Promise<T>): Promise<T> {
    const next = this.lock.then(f, f);
    this.lock = next.catch(() => undefined);
    return next;
  }

  /** A command, written as the next version while this instance still owns the board. */
  save(command: PlancheCommand, doc: PlancheDoc, version: number): Promise<void> {
    return this.locked(async () => {
      const due =
        this.clock() - this.snapshotAt >= (this.options.snapshotEveryMs ?? 60_000) ||
        version - this.snapshotVersion >= (this.options.snapshotEveryVersions ?? 200);
      const { rows, next } = ledgerSince(doc, this.booked, this.startDucats);
      await this.db.transaction(async (tx) => {
        const inserted = rowsOf(
          await tx.execute(sql`
            insert into world_commands (world_id, version, at, commands)
            select ${this.worldId}, ${version}, ${command.t}, ${JSON.stringify(encode([command]))}::jsonb
            where exists (
              select 1 from world_states where world_id = ${this.worldId} and owner = ${this.instance}
            )
            on conflict do nothing
            returning version`),
        );
        if (inserted.length !== 1) throw new PlancheLost();
        await this.ledger(tx, rows, command.t);
        if (due) await this.write(tx, doc, version, next);
      });
      this.booked = next;
      if (due) {
        this.snapshotVersion = version;
        this.snapshotAt = this.clock();
      }
    });
  }

  /** The whole board now (on shutdown, or now and then): the ledger brought up to it too. */
  snapshot(): Promise<void> {
    return this.locked(async () => {
      const { doc, version } = this.hub.current();
      const { rows, next } = ledgerSince(doc, this.booked, this.startDucats);
      await this.db.transaction(async (tx) => {
        await this.ledger(tx, rows, doc.state.now);
        await this.write(tx, doc, version, next);
      });
      this.booked = next;
      this.snapshotVersion = version;
      this.snapshotAt = this.clock();
    });
  }

  /** A snapshot every `everyMs`: the ledger follows the board even when no one acts. */
  start(everyMs = 10 * 60_000): void {
    this.stop();
    this.timer = setInterval(() => void this.snapshot().catch(console.error), everyMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Each account's balance in the ledger of this board (what comes in, less what goes out). */
  async balances(): Promise<Record<string, bigint>> {
    const rows = await this.db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.worldId, this.worldId));
    const out: Record<string, bigint> = {};
    for (const r of rows) {
      out[r.toAccount] = (out[r.toAccount] ?? 0n) + r.amount;
      out[r.fromAccount] = (out[r.fromAccount] ?? 0n) - r.amount;
    }
    return out;
  }

  private async ledger(tx: Db, rows: LedgerRow[], at: number): Promise<void> {
    if (!rows.length) return;
    await tx.insert(ledgerEntries).values(
      rows.map((r) => ({
        worldId: this.worldId,
        fromAccount: r.from,
        toAccount: r.to,
        amount: r.amount,
        reason: r.reason,
        ref: null,
        at: new Date(at),
      })),
    );
  }

  /**
   * The growth of the people's houses, copied to their accounts: each week's Prestige into the
   * journal of points (`influence_entries`), each deed into the Livre (`maison_events`). Once each.
   */
  private async mirror(tx: Db, doc: PlancheDoc): Promise<void> {
    const points: (typeof influenceEntries.$inferInsert)[] = [];
    const events: (typeof maisonEvents.$inferInsert)[] = [];
    for (const [player, seat] of Object.entries(doc.seats)) {
      if (!ACCOUNT.test(player)) continue;
      const m = doc.state.houses[seat.house]?.maison;
      if (!m) continue;
      for (const c of m.credits) {
        const key = `planche:${this.worldId}:${c.week}`;
        if (this.mirrored.has(`${player}|${key}`)) continue;
        points.push({
          accountId: player,
          worldId: this.worldId,
          source: "prestige",
          week: c.week,
          amount: c.amount,
          key,
          at: new Date(doc.state.now),
        });
      }
      for (const e of m.log) {
        const key = `${this.worldId}:${e.at}:${e.kind}:${e.data ?? ""}`;
        if (this.mirrored.has(`${player}|${key}`)) continue;
        events.push({
          accountId: player,
          worldId: this.worldId,
          kind: e.kind,
          data: e.data === undefined ? null : String(e.data),
          key,
          at: new Date(e.at),
        });
      }
    }
    if (points.length) await tx.insert(influenceEntries).values(points).onConflictDoNothing();
    if (events.length) await tx.insert(maisonEvents).values(events).onConflictDoNothing();
    for (const r of points) this.mirrored.add(`${r.accountId}|${r.key}`);
    for (const r of events) this.mirrored.add(`${r.accountId}|${r.key}`);
  }

  private async write(tx: Db, doc: PlancheDoc, version: number, booked: Booked): Promise<void> {
    await this.mirror(tx, doc);
    const written = await tx
      .update(worldStates)
      .set({ state: encode({ ...doc, booked }), version, updatedAt: new Date() })
      .where(and(eq(worldStates.worldId, this.worldId), eq(worldStates.owner, this.instance)))
      .returning({ version: worldStates.version });
    if (written.length !== 1) throw new PlancheLost();
    await tx
      .delete(worldCommands)
      .where(and(eq(worldCommands.worldId, this.worldId), lte(worldCommands.version, version)));
  }
}

/** A player who is an account (the tests' boards seat plain names). */
const ACCOUNT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
