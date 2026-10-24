import { weekEnd } from "@comptoirs/engine";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, weeklyResults } from "../src/db/schema.js";
import { BotRunner } from "../src/game/bots.js";
import { recordWeek } from "../src/game/weekly.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let now: number;
const DAY = 86_400_000;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});

afterAll(async () => {
  await dropDb();
});

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-12T08:00:00Z");
  world = await GameWorld.open(database.db, () => now);
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string, region = "terraferma") {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region },
  });
  return { cookie, id: res.json().account.id as string };
}

const weekRanking = (cookie: string) =>
  app.inject({ method: "GET", url: "/api/game/ranking/week", headers: { cookie } });

describe("weekly ranking", () => {
  it("ranks this week's gains, bots included with their badge", async () => {
    (world.ctx.settings.bots as { population: number }).population = 2;
    const runner = new BotRunner(database.db, world, 3);
    await runner.step();
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    now += 3_600_000;
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada.cookie },
      payload: { type: "sellToCity", city: "venezia", resource: "bread", quantity: 10 },
    });
    const body = (await weekRanking(ada.cookie)).json();
    expect(body.week).toBe(1);
    expect(body.endsAt).toBe(weekEnd(world.ctx, 0));
    expect(body.total).toBe(2);
    expect(body.me.me).toBe(true);
    expect(body.rows.some((r: { bot: boolean }) => r.bot)).toBe(true);
    expect(body.lastWeek).toEqual([]);
  });

  it("saves the closed week on the tick after the boundary and shows its podium", async () => {
    const ada = await player("ada@example.org");
    await player("bob@example.org", "lagoon");
    await world.execute({ type: "tick" });
    now = world.ctx.startAt + 7 * DAY + 60_000;
    await world.execute({ type: "tick" });
    const rows = await database.db.select().from(weeklyResults);
    expect(rows.map((r) => r.week)).toEqual([0, 0]);
    expect(rows.map((r) => r.rank).sort()).toEqual([1, 2]);
    const body = (await weekRanking(ada.cookie)).json();
    expect(body.week).toBe(2);
    expect(body.lastWeek).toHaveLength(2);
    // The podium names its merchants as the list does: the same default crest.
    expect(body.lastWeek.map((r: { id: string }) => r.id).sort()).toEqual(
      body.rows.map((r: { id: string }) => r.id).sort(),
    );
  });

  it("gives the awards to the three best people with a gain, never to a bot", async () => {
    const people = await Promise.all(["a", "b", "c", "d"].map((n) => player(`${n}@example.org`)));
    const [a, b, c, d] = people.map((p) => p.id);
    const [bot] = await database.db
      .insert(accounts)
      .values({ email: "bot@bots.comptoirs.invalid", pseudo: "Casa Zeno", isBot: true })
      .returning();
    await world.execute({ type: "join", playerId: bot?.id ?? "", region: "lagoon" });
    const rows = await recordWeek(database.db, world.id, {
      week: 0,
      standings: [
        { playerId: bot?.id, gain: "90000" },
        { playerId: a, gain: "50000" },
        { playerId: b, gain: "10000" },
        { playerId: c, gain: "0" },
        { playerId: d, gain: "-500" },
      ],
    });
    expect(rows.map((r) => [r.rank, r.award])).toEqual([
      [1, null],
      [2, "doge"],
      [3, "procurator"],
      [4, null],
      [5, null],
    ]);
    const profile = (
      await app.inject({
        method: "GET",
        url: "/api/game/profile",
        headers: { cookie: people[0]?.cookie ?? "" },
      })
    ).json();
    expect(profile.profile.weekly[0].award).toBe("doge");
    expect(
      profile.profile.badges.find((x: { code: string }) => x.code === "weekly_doge").earned,
    ).toBe(true);
    expect(
      await database.db.select().from(weeklyResults).where(eq(weeklyResults.week, 0)),
    ).toHaveLength(5);
  });
});
