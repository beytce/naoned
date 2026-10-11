import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
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
