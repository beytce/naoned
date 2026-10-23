import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";
import { deliverBread, smallOrders } from "./road.js";

/** What the trade screens tell the merchant: the summary of an absence, a harvest, an order. */

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

describe("an order right away", () => {
  it("says what it traded: nothing once the Dogana's quota is used up", async () => {
    const cookie = await player("ada@example.org");
    await world.execute({ type: "tick" });
    const first = await act(cookie, {
      type: "instantOrder",
      resource: "bread",
      side: "sell",
      quantity: 30,
    });
    expect(first.error).toBeUndefined();
    // The Dogana alone buys: five a day from each merchant.
    expect(first.outcome).toMatchObject({ kind: "instant", side: "sell", requested: 30 });
    expect(first.outcome.filled).toBeGreaterThan(0);
    expect(first.outcome.filled).toBeLessThan(30);
    expect(first.outcome.reason).toBe("quota");
    expect(BigInt(first.outcome.amount)).toBeGreaterThan(0n);
    // Its line is gone from the book once the quota is used, and the best bid with it.
    expect(first.view.book.bread.bids.some((l: { by: string }) => l.by === "market_maker")).toBe(
      false,
    );
    expect(first.view.book.bread.instant.sell.units).toBe(0);
    const again = await act(cookie, {
      type: "instantOrder",
      resource: "bread",
      side: "sell",
      quantity: 30,
    });
    expect(again.error).toBeUndefined();
    expect(again.outcome).toMatchObject({ requested: 30, filled: 0, reason: "quota" });
  });
});

describe("harvesting", () => {
  it("only harvests with « collectAll »: no input consumed, nothing started", async () => {
    const cookie = await player("ada@example.org");
    await act(cookie, { type: "collectAndRestart" });
    now += 5 * HOUR;
    const res = await act(cookie, { type: "collectAll" });
    expect(res.error).toBeUndefined();
    expect(res.outcome.kind).toBe("harvest");
    expect(res.outcome.harvested.wheat).toBeGreaterThan(0);
    expect(res.outcome.started).toEqual([]);
    const id = res.view.player.id;
    const inputs = await database.db.execute(
      sql`select count(*)::int as n from stock_movements where player_id = ${id}
        and reason = 'production_input' and at > ${new Date(now - HOUR).toISOString()}::timestamptz`,
    );
    expect((inputs as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
    // The harvested wheat stays in stock.
    const wheat = res.view.inventory.find((i: { resource: string }) => i.resource === "wheat");
    expect(wheat.available).toBeGreaterThanOrEqual(res.outcome.harvested.wheat);
  });

  it("tells what « collectAndRestart » harvested and what it started with which inputs", async () => {
    const cookie = await player("ada@example.org");
    await act(cookie, { type: "collectAndRestart" });
    now += 5 * HOUR;
    const res = await act(cookie, { type: "collectAndRestart" });
    expect(res.outcome.harvested.wheat).toBeGreaterThan(0);
    const mill = res.outcome.started.find((s: { building: string }) => s.building === "mill");
    expect(mill.batches).toBeGreaterThan(0);
    expect(mill.inputs.wheat).toBeGreaterThan(0);
  });
});

describe("the profile's figures", () => {
  it("count a delivery arrived as sold to the cities, towards the trophy", async () => {
    smallOrders(world);
    const cookie = await player("ada@example.org");
    const first = await get(cookie);
    const d = await deliverBread(world, first.view.player.id, now);
    const profile = async () =>
      (await app.inject({ method: "GET", url: "/api/game/profile", headers: { cookie } })).json()
        .profile;
    // Still on the road: not sold yet.
    expect((await profile()).stats.citySold).toBe(0);
    now = d.arriveAt + 1;
    await world.execute({ type: "tick" });
    const after = await profile();
    expect(after.stats.citySold).toBe(d.loaded);
    const trophy = after.badges.find((b: { code: string }) => b.code === "city_500");
    expect(trophy.value).toBe(d.loaded);
  });
});

describe("coming back after trade", () => {
  it("counts a delivery paid while away in the commerce", async () => {
    smallOrders(world);
    const cookie = await player("ada@example.org");
    const first = await get(cookie);
    const d = await deliverBread(world, first.view.player.id, now);
    now = d.arriveAt + HOUR;
    await world.execute({ type: "tick" });
    const paid = world.current.deliveries?.[d.id]?.paid ?? 0n;
    expect(paid).toBeGreaterThan(0n);
    const back = await get(cookie);
    const total = Object.values(back.welcome.income as Record<string, string>).reduce(
      (n, v) => n + BigInt(v),
      0n,
    );
    expect(total).toBe(paid);
  });

  it("counts a delivery due while away even before the next tick paid it", async () => {
    smallOrders(world);
    const cookie = await player("ada@example.org");
    const first = await get(cookie);
    const d = await deliverBread(world, first.view.player.id, now);
    // Back after its arrival, the world not ticked since.
    now = d.arriveAt + HOUR;
    const back = await get(cookie);
    const paid = world.current.deliveries?.[d.id]?.paid ?? 0n;
    expect(paid).toBeGreaterThan(0n);
    const total = Object.values(back.welcome.income as Record<string, string>).reduce(
      (n, v) => n + BigInt(v),
      0n,
    );
    expect(total).toBe(paid);
  });

  it("tells what the fattore sent, and what it was paid", async () => {
    smallOrders(world);
    const cookie = await player("ada@example.org");
    await get(cookie);
    // The vehicle idle at the counter for hours, in the day: the fattore sends it.
    for (let i = 0; i < 4; i++) {
      now += HOUR;
      await world.execute({ type: "tick" });
    }
    const sent = Object.values(world.current.deliveries ?? {}).find((d) => d.fattore);
    expect(sent).toBeDefined();
    if (!sent) return;
    now = Math.max(now, sent.arriveAt) + HOUR;
    await world.execute({ type: "tick" });
    const back = await get(cookie);
    // Twice a day at most: the first one sent is told first.
    expect(back.welcome.fattore.length).toBeGreaterThanOrEqual(1);
    expect(back.welcome.fattore[0]).toMatchObject({
      resource: sent.resource,
      quantity: sent.loaded,
      city: sent.route.split(":")[1],
    });
    expect(BigInt(back.welcome.fattore[0].paid)).toBeGreaterThan(0n);
  });

  it("opens on the week closed while away", async () => {
    const cookie = await player("ada@example.org");
    const first = await get(cookie);
    now += HOUR;
    await database.db.execute(sql`insert into notifications (world_id, account_id, kind, data, created_at)
      values (${world.id}, ${first.view.player.id}::uuid, 'week',
        ${JSON.stringify({ week: 0, rank: 1, gain: "12345", award: "doge" })}::jsonb,
        ${new Date(now).toISOString()}::timestamptz)`);
    now += HOUR;
    const back = await get(cookie);
    expect(back.welcome.week).toMatchObject({ week: 0, rank: 1, gain: "12345", award: "doge" });
  });
});
