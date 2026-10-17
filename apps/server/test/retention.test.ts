import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";
import { deliverBread, smallOrders } from "./road.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
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
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    adminEmails: ["boss@example.org"],
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function login(email: string) {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  return `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
}

async function player(email: string, region = "terraferma") {
  const cookie = await login(email);
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region },
  });
  return cookie;
}

const act = async (cookie: string, payload: object) =>
  (
    await app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload })
  ).json();
const get = async (cookie: string) =>
  (await app.inject({ method: "GET", url: "/api/game", headers: { cookie } })).json();

describe("a short session", () => {
  it("collects and restarts every workshop in one tap", async () => {
    const cookie = await player("ada@example.org");
    const res = await act(cookie, { type: "collectAndRestart" });
    expect(res.error).toBeUndefined();
    const farm = res.view.buildings.find((b: { type: string }) => b.type === "farm");
    expect(farm.job).not.toBeNull();
    // Hours later: the harvest is collected and the queue filled again.
    now += 5 * HOUR;
    const again = await act(cookie, { type: "collectAndRestart" });
    // The harvested wheat went straight into the mill.
    const mill = again.view.buildings.find((b: { type: string }) => b.type === "mill");
    expect(mill.job).not.toBeNull();
    expect(again.view.tutorial).toContain("harvest");
    expect(await world.checkInvariants()).toEqual([]);
  });
});

describe("coming back", () => {
  it("summarises what happened while the player was away", async () => {
    const cookie = await player("ada@example.org");
    await act(cookie, { type: "collectAndRestart" });
    await get(cookie);
    expect((await get(cookie)).welcome).toBeUndefined();
    now += 26 * HOUR;
    await world.execute({ type: "tick" });
    const back = await get(cookie);
    expect(back.welcome.readyBatches).toBeGreaterThan(0);
    expect(back.welcome.slept).toBe(true);
    // Only once.
    expect((await get(cookie)).welcome).toBeUndefined();
  });
});

describe("the ledger of missions", () => {
  it("rewards the first delivery and closes the tutorial", async () => {
    smallOrders(world);
    const cookie = await player("ada@example.org");
    const before = await get(cookie);
    expect(before.view.missions[0]).toMatchObject({ id: "first_delivery", done: false });
    const d = await deliverBread(world, before.view.player.id, now);
    now = d.arriveAt;
    await world.execute({ type: "tick" });
    const claimed = await act(cookie, { type: "claimMission", missionId: "first_delivery" });
    expect(claimed.error).toBeUndefined();
    expect(claimed.view.missions[0].claimed).toBe(true);
    expect(claimed.view.tutorial).toContain("mission");
  });
});

describe("the retention dashboard", () => {
  it("is for admins only", async () => {
    const someone = await player("ada@example.org");
    const denied = await app.inject({
      method: "GET",
      url: "/api/admin/retention",
      headers: { cookie: someone },
    });
    expect(denied.statusCode).toBe(403);
    const boss = await login("boss@example.org");
    now += 2 * 24 * HOUR;
    await get(someone);
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/retention",
      headers: { cookie: boss },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.players).toBe(1);
    expect(body.retention[0]).toEqual({ day: 1, eligible: 1, returned: 1 });
    expect(body.tutorial[0].step).toBe("produce");
  });
});

describe("suspicious trades", () => {
  it("shows two accounts trading with each other far above the reference price", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    for (let i = 0; i < 3; i++) {
      const bid = await act(ada, {
        type: "limitOrder",
        resource: "bread",
        side: "buy",
        price: "720",
        quantity: 1,
      });
      expect(bid.error).toBeUndefined();
      const sold = await act(bob, {
        type: "instantOrder",
        resource: "bread",
        side: "sell",
        quantity: 1,
      });
      expect(sold.error).toBeUndefined();
    }
    // Beyond four times the reference (180 deniers), an offer is refused.
    const tooHigh = await act(ada, {
      type: "limitOrder",
      resource: "bread",
      side: "buy",
      price: "721",
      quantity: 1,
    });
    expect(tooHigh.error).toBe("price_out_of_band");
    const boss = await login("boss@example.org");
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/suspicious",
      headers: { cookie: boss },
    });
    const [pair] = res.json().pairs;
    expect(pair.trades).toBe(3);
    expect(BigInt(pair.gap)).toBe(3n * (720n - 180n));
  });
});
