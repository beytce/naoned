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
});
