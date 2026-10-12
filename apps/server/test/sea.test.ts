import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { notifications } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { Notifier } from "../src/notify/notifier.js";
import { MemoryPusher } from "../src/notify/push.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let notifier: Notifier;
let now: number;
const HOUR = 3_600_000;

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
  notifier = new Notifier(database.db, world, new MemoryPusher());
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    notifier,
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string, region: string) {
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
  return cookie;
}

const act = async (cookie: string, payload: object) => {
  const res = await app.inject({
    method: "POST",
    url: "/api/game/actions",
    headers: { cookie },
    payload,
  });
  return res.json();
};

describe("the sea", () => {
  it("builds a fleet, sails a convoy, and lets privateers board it, with notices for both", async () => {
    // Planks for a ship at the Dogana in one go (its daily quota is smaller now).
    world.ctx.settings.marketMaker.playerDailyQuota.planks = 25;
    const corsair = await player("corsair@example.org", "lagoon");
    const trader = await player("trader@example.org", "terraferma");
    await world.execute({ type: "tick" });
    // Past the newcomers' protection.
    now += 4 * 24 * HOUR;
    await world.execute({ type: "tick" });
    for (const cookie of [corsair, trader]) {
      await act(cookie, { type: "instantOrder", resource: "planks", side: "buy", quantity: 20 });
      const built = await act(cookie, { type: "buildShip", shipType: "cog" });
      expect(built.error).toBeUndefined();
      expect(built.view.ships).toHaveLength(1);
      expect(built.view.ships[0].status).toBe("ready");
    }
    const shipOf = async (cookie: string) =>
      (await app.inject({ method: "GET", url: "/api/game", headers: { cookie } })).json().view
        .ships[0].id;

    await notifier.scan();
    const commissioned = await act(corsair, {
      type: "commissionPrivateers",
      route: "ragusa",
      ships: [await shipOf(corsair)],
    });
    expect(commissioned.error).toBeUndefined();
    expect(commissioned.view.raids).toHaveLength(1);
    expect(commissioned.view.watchedRoutes).toEqual(["ragusa"]);

    // Four days of rations have eaten the starting bread: buy provisions.
    await act(trader, { type: "instantOrder", resource: "bread", side: "buy", quantity: 10 });
    const sailed = await act(trader, {
      type: "launchExpedition",
      destination: "ragusa",
      cargo: { wood: 10 },
      escort: false,
      ships: [await shipOf(trader)],
    });
    expect(sailed.error).toBeUndefined();
    expect(sailed.view.ports.ragusa.wood).toBeGreaterThan(0);

    now += 4 * HOUR;
    await world.execute({ type: "tick" });
    await notifier.scan();
    const kinds = (await database.db.select().from(notifications)).map((n) => n.kind);
    expect(kinds.filter((k) => k === "raid")).toHaveLength(2);

    const seen = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: trader } })
    ).json();
    const boarding = seen.view.expeditions[0].boarding;
    expect(boarding).not.toBeNull();
    expect(seen.names[boarding.raider]).toBeDefined();

    now += 9 * HOUR;
    const raidId = commissioned.view.raids[0].id;
    const back = await act(corsair, { type: "collectRaid", raidId });
    expect(back.error).toBeUndefined();
    expect(await world.checkInvariants()).toEqual([]);
  });
});
