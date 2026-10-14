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

describe("a save from an earlier version", () => {
  it("opens with the first families' tallies dropped", async () => {
    const old = await GameWorld.open(database.db, () => now);
    await old.execute({ type: "tick" });
    // A world opened in the time of the first families (influence, family orders).
    await database.db.execute(
      sql`update world_states set state = jsonb_set(state::jsonb, '{families}', '{"week":1,"members":{},"weekInfluence":{},"seasonInfluence":{},"ordersDone":{},"patronage":{},"inPower":null}'::jsonb)`,
    );
    const fresh = await GameWorld.open(database.db, () => now + 60_000);
    expect(fresh.current.families).toBeUndefined();
    expect((await fresh.execute({ type: "tick" })).ok).toBe(true);
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
