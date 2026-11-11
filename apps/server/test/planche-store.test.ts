import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
import { worldCommands, worlds } from "../src/db/schema.js";
import { plancheTheme } from "../src/game/planche.js";
import { PLANCHE_STATUS, PlancheLost, PlancheStore } from "../src/game/plancheStore.js";
import { encode } from "../src/game/serialize.js";
import { testDatabase } from "./db.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T06:00:00Z");

let dbUrl: string;
let dropDb: () => Promise<void>;
let database: Database;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});
beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate worlds cascade`);
});
afterEach(async () => {
  await database.close();
});

/** A board compared as the base holds it: amounts as strings, keys in order (jsonb reorders them). */
const sorted = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(sorted)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sorted((v as Record<string, unknown>)[k])]),
        )
      : v;
const same = (a: unknown) => JSON.stringify(sorted(encode(a)));

// The board kept in the base (docs/plan-compte.md C1): a restart loses nothing.
describe("the board kept in the base", () => {
  it("begins one board, kept apart from the game's worlds", async () => {
    const store = await PlancheStore.open(database.db, plancheTheme(), T0);
    const rows = await database.db.select().from(worlds);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe(PLANCHE_STATUS);
    expect(rows[0]?.id).toBe(store.worldId);
    // Opened again, it is the same board, not a second one.
    const again = await PlancheStore.open(database.db, plancheTheme(), T0 + HOUR);
    expect(again.worldId).toBe(store.worldId);
    expect(await database.db.select().from(worlds)).toHaveLength(1);
  });

  it("finds every gesture again after a restart, from the journal alone", async () => {
    const first = await PlancheStore.open(database.db, plancheTheme(), T0, {
      snapshotEveryMs: Number.POSITIVE_INFINITY,
      snapshotEveryVersions: 1_000,
    });
    const hub = first.hub;
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    await hub.view("ben", "Ben", T0 + HOUR);
    expect(await hub.thread("ana", "rialto", "sand", T0 + 2 * HOUR)).toBe("ok");
    expect(await hub.thread("ben", "rialto", "sand", T0 + 3 * HOUR)).toBe("ok");
    expect(await hub.unthread("ben", "rialto", "sand", T0 + 5 * HOUR)).toBe("ok");
    // Only the journal holds them: the snapshot is still the empty board.
    const journal = await database.db
      .select()
      .from(worldCommands)
      .where(eq(worldCommands.worldId, first.worldId));
    expect(journal.length).toBeGreaterThanOrEqual(5);
    const before = await hub.view("ana", "Ana", T0 + 30 * HOUR);

    const second = await PlancheStore.open(database.db, plancheTheme(), T0 + 30 * HOUR);
    const after = await second.hub.view("ana", "Ana", T0 + 30 * HOUR);
    expect(after.me).toBe(me);
    expect(same(after.state)).toBe(same(before.state));
    expect(after.names).toEqual(before.names);
    expect(after.ok).toBe(true);
  });

  it("finds the board again from a snapshot and the commands after it", async () => {
    const first = await PlancheStore.open(database.db, plancheTheme(), T0, {
      snapshotEveryVersions: 2,
    });
    const hub = first.hub;
    await hub.view("ana", "Ana", T0);
    await hub.thread("ana", "rialto", "sand", T0 + HOUR);
    await hub.view("ben", "Ben", T0 + 2 * HOUR);
    await hub.thread("ben", "rialto", "sand", T0 + 3 * HOUR);
    await hub.thread("ana", "padoue", "glass", T0 + 4 * HOUR);
    const before = await hub.view("ana", "Ana", T0 + 50 * HOUR);
    const second = await PlancheStore.open(database.db, plancheTheme(), T0 + 50 * HOUR);
    const after = await second.hub.view("ana", "Ana", T0 + 50 * HOUR);
    expect(same(after.state)).toBe(same(before.state));
  });

  it("writes a snapshot on shutdown: the next start replays nothing", async () => {
    const first = await PlancheStore.open(database.db, plancheTheme(), T0, {
      snapshotEveryMs: Number.POSITIVE_INFINITY,
      snapshotEveryVersions: 1_000,
    });
    await first.hub.view("ana", "Ana", T0);
    await first.hub.thread("ana", "rialto", "sand", T0 + HOUR);
    await first.hub.view("ana", "Ana", T0 + 10 * HOUR);
    await first.snapshot();
    const left = await database.db
      .select()
      .from(worldCommands)
      .where(eq(worldCommands.worldId, first.worldId));
    expect(left).toHaveLength(0);
    const second = await PlancheStore.open(database.db, plancheTheme(), T0 + 10 * HOUR);
    expect(second.hub.reached()).toBe(first.hub.reached());
  });

  it("lets a new instance take the board over: the old one can no longer write", async () => {
    const old = await PlancheStore.open(database.db, plancheTheme(), T0, { instance: "old" });
    await old.hub.view("ana", "Ana", T0);
    const fresh = await PlancheStore.open(database.db, plancheTheme(), T0 + HOUR, {
      instance: "new",
    });
    await expect(old.hub.thread("ana", "rialto", "sand", T0 + HOUR)).rejects.toBeInstanceOf(
      PlancheLost,
    );
    // The gesture the old instance could not write is not on the board.
    expect(await fresh.hub.thread("ana", "rialto", "sand", T0 + 2 * HOUR)).toBe("ok");
    const v = await fresh.hub.view("ana", "Ana", T0 + 2 * HOUR);
    expect(v.state.houses[v.me ?? ""]?.threads).toHaveLength(1);
  });
});
