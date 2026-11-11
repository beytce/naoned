import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { worldCommands, worldStates, worlds } from "../db/schema.js";
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
  private snapshotVersion: number;
  private snapshotAt: number;
  private readonly clock: () => number;

  private constructor(
    private readonly db: Db,
    readonly worldId: string,
    private readonly instance: string,
    snapshotVersion: number,
    private readonly options: PlancheStoreOptions,
  ) {
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
    const instance = options.instance ?? randomUUID();
    const settings = encode({
      board: theme.board,
      visitHours: theme.visitHours,
      idleHours: theme.idleHours,
    });
    let [row] = await db
      .select()
      .from(worlds)
      .where(and(eq(worlds.status, PLANCHE_STATUS), eq(worlds.theme, PLANCHE_THEME)))
      .orderBy(asc(worlds.createdAt))
      .limit(1);
    if (!row) {
      [row] = await db
        .insert(worlds)
        .values({
          name: "La lagune",
          theme: PLANCHE_THEME,
          status: PLANCHE_STATUS,
          startsAt: new Date(now),
          // A board has no end: the tides follow one another (CADRAGE-v4 § 11).
          endsAt: new Date(now + 100 * 365 * 86_400_000),
          settings,
        })
        .returning();
    } else {
      // The board's settings are those the server plays, written where the rules say they live.
      await db.update(worlds).set({ settings }).where(eq(worlds.id, row.id));
    }
    if (!row) throw new Error("the board could not be created");
    const worldId = row.id;
    // Take over first, then read: an old instance can no longer write once we hold the board.
    await db.update(worldStates).set({ owner: instance }).where(eq(worldStates.worldId, worldId));
    const [saved] = await db.select().from(worldStates).where(eq(worldStates.worldId, worldId));
    let doc: PlancheDoc;
    let version: number;
    let snapshotVersion: number;
    if (saved) {
      doc = decode<PlancheDoc>(saved.state);
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
    } else {
      doc = plancheDocInit(theme, now);
      version = 0;
      snapshotVersion = 0;
      await db
        .insert(worldStates)
        .values({ worldId, version: 0, state: encode(doc), owner: instance });
    }
    const store = new PlancheStore(db, worldId, instance, snapshotVersion, options);
    store.hub = new PlancheHub(theme, now, { doc, version }, store);
    if (version > snapshotVersion) await store.snapshot();
    return store;
  }

  /** A command, written as the next version while this instance still owns the board. */
  async save(command: PlancheCommand, doc: PlancheDoc, version: number): Promise<void> {
    const due =
      this.clock() - this.snapshotAt >= (this.options.snapshotEveryMs ?? 60_000) ||
      version - this.snapshotVersion >= (this.options.snapshotEveryVersions ?? 200);
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
      if (due) await this.write(tx, doc, version);
    });
    if (due) {
      this.snapshotVersion = version;
      this.snapshotAt = this.clock();
    }
  }

  /** The whole board now (on shutdown, or when a snapshot is due): nothing left to replay. */
  async snapshot(): Promise<void> {
    const { doc, version } = this.hub.current();
    await this.db.transaction((tx) => this.write(tx, doc, version));
    this.snapshotVersion = version;
    this.snapshotAt = this.clock();
  }

  private async write(tx: Db, doc: PlancheDoc, version: number): Promise<void> {
    const written = await tx
      .update(worldStates)
      .set({ state: encode(doc), version, updatedAt: new Date() })
      .where(and(eq(worldStates.worldId, this.worldId), eq(worldStates.owner, this.instance)))
      .returning({ version: worldStates.version });
    if (written.length !== 1) throw new PlancheLost();
    await tx
      .delete(worldCommands)
      .where(and(eq(worldCommands.worldId, this.worldId), lte(worldCommands.version, version)));
  }
}

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
