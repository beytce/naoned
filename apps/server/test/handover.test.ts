import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
const now = Date.parse("2026-10-05T08:00:00Z");

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});
beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate accounts, worlds, telemetry cascade`);
});
afterEach(async () => {
  await database.close();
});

describe("a deploy: the new server takes over from the old one", () => {
  it("lets the new instance play and stops the old one", async () => {
    const old = await GameWorld.open(database.db, () => now);
    await old.execute({ type: "tick" });
    let lost = 0;
    old.onLostOwnership(() => lost++);

    // Railway starts the new instance before stopping the old one.
    const fresh = await GameWorld.open(database.db, () => now + 60_000);
    // The old one still ticks once: it must not write any more.
    const late = await old.execute({ type: "tick" });
    expect(late).toEqual({ ok: false, error: "lost_ownership" });
    expect(lost).toBe(1);

    // The new one plays on, from the state saved before the handover.
    expect((await fresh.execute({ type: "tick" })).ok).toBe(true);
    expect(await fresh.checkInvariants()).toEqual([]);
  });

  it("reloads the saved state if it was changed behind its back", async () => {
    const a = await GameWorld.open(database.db, () => now);
    await a.execute({ type: "tick" });
    // Someone bumps the saved version (a manual fix, a stray write).
    await database.db.execute(sql`update world_states set version = version + 1`);
    const res = await a.execute({ type: "tick" });
    expect(res.ok).toBe(true);
  });
});

describe("a light save: the commands, and a snapshot now and then", () => {
  const count = async (table: "world_commands") =>
    Number(
      (
        (await database.db.execute(sql.raw(`select count(*)::int as n from ${table}`))) as {
          rows: { n: number }[];
        }
      ).rows[0]?.n,
    );
  const savedVersion = async () =>
    Number(
      (
        (await database.db.execute(sql`select version from world_states`)) as {
          rows: { version: number }[];
        }
      ).rows[0]?.version,
    );

  it("replays the commands saved since the last snapshot on loading", async () => {
    const old = await GameWorld.open(database.db, () => now, { snapshotEveryMs: 3_600_000 });
    const [ada] = await database.db
      .insert(accounts)
      .values({ email: "ada@example.org", pseudo: "Ada" })
      .returning({ id: accounts.id });
    const id = ada?.id ?? "";
    await old.execute({ type: "join", playerId: id, region: "terraferma" });
    await old.execute({ type: "tick" });
    await old.execute({
      type: "placeOrder",
      playerId: id,
      resource: "bread",
      side: "sell",
      kind: "instant",
      quantity: 10,
    });
    // Three commands, no snapshot yet.
    expect(await count("world_commands")).toBe(3);
    expect(await savedVersion()).toBe(0);

    const fresh = await GameWorld.open(database.db, () => now + 60_000);
    expect(fresh.current).toEqual(old.current);
    expect(await fresh.checkInvariants()).toEqual([]);
    // Loading wrote a snapshot: nothing left to replay.
    expect(await count("world_commands")).toBe(0);
    expect(await savedVersion()).toBe(3);
    expect((await fresh.execute({ type: "tick" })).ok).toBe(true);
  });

  it("writes a snapshot every so many versions and forgets the commands it holds", async () => {
    const w = await GameWorld.open(database.db, () => now, {
      snapshotEveryMs: 3_600_000,
      snapshotEveryVersions: 2,
    });
    await w.execute({ type: "tick" });
    expect(await count("world_commands")).toBe(1);
    await w.execute({ type: "tick" });
    expect(await count("world_commands")).toBe(0);
    expect(await savedVersion()).toBe(2);
    await w.execute({ type: "tick" });
    await w.snapshot();
    expect(await savedVersion()).toBe(3);
    expect(await count("world_commands")).toBe(0);
  });
});

describe("a save from an earlier version", () => {
  it("opens with the first families' tallies dropped", async () => {
    const old = await GameWorld.open(database.db, () => now);
    await old.execute({ type: "tick" });
    await old.snapshot();
    // A world opened in the time of the first families (influence, family orders).
    await database.db.execute(
      sql`update world_states set state = jsonb_set(state::jsonb, '{families}', '{"week":1,"members":{},"weekInfluence":{},"seasonInfluence":{},"ordersDone":{},"patronage":{},"inPower":null}'::jsonb)`,
    );
    const fresh = await GameWorld.open(database.db, () => now + 60_000);
    expect(fresh.current.families).toBeUndefined();
    expect((await fresh.execute({ type: "tick" })).ok).toBe(true);
  });
});

describe("a save from before the ranking by net sales", () => {
  it("rebuilds them from the ledger", async () => {
    const old = await GameWorld.open(database.db, () => now);
    const [ada] = await database.db
      .insert(accounts)
      .values({ email: "ada@example.org", pseudo: "Ada" })
      .returning({ id: accounts.id });
    const id = ada?.id ?? "";
    await old.execute({ type: "join", playerId: id, region: "terraferma" });
    await old.execute({ type: "tick" });
    const sold = await old.execute({
      type: "placeOrder",
      playerId: id,
      resource: "bread",
      side: "sell",
      kind: "instant",
      quantity: 10,
    });
    expect(sold).toMatchObject({ ok: true });
    const sales = old.current.turnover?.[id] ?? 0n;
    expect(sales).toBeGreaterThan(0n);
    await old.snapshot();
    await database.db.execute(sql`update world_states set state = state::jsonb - 'turnover'`);
    const fresh = await GameWorld.open(database.db, () => now + 60_000);
    expect(fresh.current.turnover?.[id]).toBe(sales);
    expect(fresh.current.weekly?.start[id]).toBe(0n);
  });
});

describe("a stalled world", () => {
  it("is reported when no tick has been saved for five minutes", async () => {
    let clock = now;
    const w = await GameWorld.open(database.db, () => clock);
    expect(w.stalled()).toBe(false);
    w.startTicking(60_000, () => undefined);
    await new Promise((r) => setTimeout(r, 50));
    expect(w.stalled()).toBe(false);
    clock += 6 * 60_000;
    expect(w.stalled()).toBe(true);
    w.stopTicking();
  });
});
