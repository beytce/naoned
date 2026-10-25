import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, influenceEntries, terraResults } from "../src/db/schema.js";
import { monthTitles } from "../src/game/season.js";
import { GameWorld } from "../src/game/world.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let world: GameWorld;
const now = Date.parse("2026-10-12T08:00:00Z");

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});
beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate accounts, worlds cascade`);
  world = await GameWorld.open(database.db, () => now);
});
afterEach(async () => {
  await database.close();
});

async function account(email: string, isBot = false) {
  const [a] = await database.db.insert(accounts).values({ email, isBot }).returning();
  return a?.id ?? "";
}

const week = (accountId: string, w: number, glory: number, signore = false) => ({
  worldId: world.id,
  week: w,
  accountId,
  rank: 1,
  of: 3,
  glory,
  cells: 5,
  rating: 1000,
  signore,
  at: new Date(now),
});

describe("the month's titles of the Terraferma", () => {
  it("go to people: the most Influence there, and the Signore of the last week", async () => {
    const [ada, bob, bot] = [
      await account("ada@example.org"),
      await account("bob@example.org"),
      await account("bot@bots.invalid", true),
    ];
    await database.db.insert(influenceEntries).values([
      {
        accountId: bot,
        worldId: world.id,
        source: "terraferma",
        week: 0,
        amount: 99,
        key: "k1",
        at: new Date(now),
      },
      {
        accountId: ada,
        worldId: world.id,
        source: "terraferma",
        week: 0,
        amount: 20,
        key: "k2",
        at: new Date(now),
      },
      {
        accountId: bob,
        worldId: world.id,
        source: "terraferma",
        week: 1,
        amount: 20,
        key: "k3",
        at: new Date(now),
      },
      {
        accountId: bob,
        worldId: world.id,
        source: "mission",
        week: 1,
        amount: 50,
        key: "k4",
        at: new Date(now),
      },
    ]);
    // Ada and Bob even on Influence: the glory breaks the tie; Bob the Signore of the last week.
    await database.db
      .insert(terraResults)
      .values([week(ada, 0, 300, true), week(bob, 0, 100), week(bob, 1, 150, true)]);
    expect(await monthTitles(database.db, world.id)).toEqual({ capitano: ada, gonfalone: bob });
  });

  it("go to nobody when no person earned there", async () => {
    expect(await monthTitles(database.db, world.id)).toEqual({ capitano: null, gonfalone: null });
  });
});
