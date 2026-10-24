import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, players } from "../src/db/schema.js";
import { BotRunner, FAMILY_NAMES, HOUSES } from "../src/game/bots.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let runner: BotRunner;
let now: number;

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
  runner = new BotRunner(database.db, world, 42);
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

async function login(email: string): Promise<string | undefined> {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
  return cookie ? `${SESSION_COOKIE}=${cookie.value}` : undefined;
}

const setPopulation = (n: number) => {
  (world.ctx.settings.bots as { population: number }).population = n;
};

describe("bots in a live world", () => {
  it("recruits trading houses one at a time, as bots, and keeps the journals balanced", async () => {
    setPopulation(3);
    for (let i = 0; i < 5; i++) {
      await runner.step();
      now += 60_000;
    }
    const bots = await database.db.select().from(accounts).where(eq(accounts.isBot, true));
    expect(bots).toHaveLength(3);
    expect(bots.every((b) => b.pseudo?.startsWith("Casa "))).toBe(true);
    const rows = await database.db.select().from(players);
    expect(rows.every((r) => r.botProfile)).toBe(true);
    // Marked as the computer's in the engine too: never Signore of the Terraferma.
    expect(bots.every((b) => world.current.players[b.id]?.npc === true)).toBe(true);
    // They played their first session: something beyond joining happened.
    const own = Object.values(world.current.buildings).filter((b) =>
      bots.some((a) => a.id === b.playerId),
    );
    expect(own.some((b) => b.job)).toBe(true);
    expect(await world.checkInvariants()).toEqual([]);
  });

  it("show in the rankings with a badge, and steps aside as people arrive", async () => {
    setPopulation(2);
    await runner.step();
    await runner.step();
    const cookie = await login("ada@example.org");
    if (!cookie) throw new Error("no session");
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie },
      payload: { region: "lagoon" },
    });
    const before = (
      await app.inject({ method: "GET", url: "/api/game/ranking", headers: { cookie } })
    ).json();
    expect(before.total).toBe(3);
    expect(before.rows.filter((r: { bot: boolean }) => r.bot)).toHaveLength(2);

    // One person now: one bot is enough.
    await runner.step();
    const retired = await database.db
      .select()
      .from(players)
      .where(and(eq(players.worldId, world.id), sql`${players.retiredAt} is not null`));
    expect(retired).toHaveLength(1);
    const id = retired[0]?.accountId ?? "";
    expect(Object.values(world.current.orders).some((o) => o.playerId === id)).toBe(false);
    const after = (
      await app.inject({ method: "GET", url: "/api/game/ranking", headers: { cookie } })
    ).json();
    expect(after.total).toBe(2);

    // Within the hour, no second departure.
    setPopulation(0);
    await runner.step();
    expect(runner.active.size).toBe(1);

    // When the world empties again, the retired house comes back rather than a new one.
    setPopulation(3);
    now += 2 * 3_600_000;
    await runner.step();
    expect(runner.active.has(id)).toBe(true);
    expect(await database.db.select().from(accounts).where(eq(accounts.isBot, true))).toHaveLength(
      2,
    );
  });

  it("still recruits once every house name and the numbered one are taken", async () => {
    setPopulation(1);
    // Every name of the roster taken, and "Casa 1" too, by people; the bot's usual address as well.
    await database.db
      .insert(accounts)
      .values([
        ...HOUSES.map((h, i) => ({ email: `p${i}@example.org`, pseudo: `Casa ${h}` })),
        { email: "casa1@example.org", pseudo: "casa 1" },
        { email: `bot-${world.id}-1@bots.comptoirs.invalid`, pseudo: "Zorzi" },
      ]);
    await runner.step();
    const bots = await database.db.select().from(accounts).where(eq(accounts.isBot, true));
    expect(bots).toHaveLength(1);
    expect(bots[0]?.pseudo).toBe("Casa 2");
    expect(world.current.players[bots[0]?.id ?? ""]).toBeDefined();
  });

  it("never names a house after a patrician family, and renames the old ones", async () => {
    const families = FAMILY_NAMES.map((f) => `Casa ${f}`.toLowerCase());
    setPopulation(6);
    for (let i = 0; i < 6; i++) await runner.step();
    const bots = await database.db.select().from(accounts).where(eq(accounts.isBot, true));
    expect(bots).toHaveLength(6);
    expect(bots.some((b) => families.includes(b.pseudo?.toLowerCase() ?? ""))).toBe(false);

    // A house of an older version, named after a family: renamed on the next start.
    const old = bots[0];
    if (!old) throw new Error("no bot");
    await database.db
      .update(accounts)
      .set({ pseudo: "Casa Dandolo" })
      .where(eq(accounts.id, old.id));
    await new BotRunner(database.db, world, 1).load();
    const [renamed] = await database.db.select().from(accounts).where(eq(accounts.id, old.id));
    expect(renamed?.pseudo?.startsWith("Casa ")).toBe(true);
    expect(families.includes(renamed?.pseudo?.toLowerCase() ?? "")).toBe(false);
    const pseudos = (await database.db.select().from(accounts).where(eq(accounts.isBot, true))).map(
      (b) => b.pseudo,
    );
    expect(new Set(pseudos).size).toBe(pseudos.length);
  });

  it("resumes after a restart with the same houses", async () => {
    setPopulation(2);
    await runner.step();
    await runner.step();
    const again = new BotRunner(database.db, world, 1);
    await again.load();
    expect(again.active).toEqual(runner.active);
  });

  it("never opens a session on a bot's address", async () => {
    setPopulation(1);
    await runner.step();
    const [bot] = await database.db.select().from(accounts).where(eq(accounts.isBot, true));
    expect(await login(bot?.email ?? "")).toBeUndefined();
  });
});
