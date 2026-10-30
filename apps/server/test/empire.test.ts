import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, influenceEntries, ledgerEntries, players, worlds } from "../src/db/schema.js";
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

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});

async function start() {
  world = await GameWorld.open(database.db, () => now, { empire: true });
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    now: () => new Date(now),
  });
}

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-26T08:00:00Z");
  await start();
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function login(email: string): Promise<string> {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
  return `${SESSION_COOKIE}=${cookie?.value}`;
}

const get = (cookie: string) =>
  app.inject({ method: "GET", url: "/api/empire", headers: { cookie } });
const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });
const act = (cookie: string, payload: unknown) => post(cookie, "/api/empire/actions", payload);

describe("the empire's world", () => {
  it("opens a world of the empire, never bounded by a month", async () => {
    const [w] = await database.db.select().from(worlds);
    expect((w?.settings as { empire?: unknown }).empire).toBeDefined();
    expect(w?.endsAt.getUTCFullYear()).toBe(9999);
  });

  it("lets a merchant join at the Casa 1 with its workshops", async () => {
    const cookie = await login("ada@example.org");
    expect((await get(cookie)).json().joined).toBe(false);
    const res = await post(cookie, "/api/empire/join");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.view.house.casa).toBe(1);
    expect(body.view.house.workshops).toHaveLength(3);
    expect(body.cash).toBe("50000");
    const rows = await database.db.select().from(players);
    expect(rows).toHaveLength(1);
  });

  it("relaunches, sells, builds, and the site ends while away", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    expect((await act(cookie, { type: "empireRelaunchAll" })).statusCode).toBe(200);
    now += 6 * 3_600_000;
    await act(cookie, { type: "empireRelaunchAll" });
    const sold = await act(cookie, { type: "empireSell", good: "clay", qty: 10 });
    expect(sold.json().error).toBeUndefined();
    // The wages of the sale are in the ledger.
    const wages = await database.db
      .select()
      .from(ledgerEntries)
      .where(sql`reason = 'empire_wages'`);
    expect(wages.length).toBeGreaterThan(0);
    // The Casa 2 asks bricks and planks: the bricks need a brickworks first.
    const short = await act(cookie, { type: "empireBuildCasa" });
    expect(short.json().error).toBe("insufficient_stock");
    const kiln = await act(cookie, {
      type: "empireBuildWorkshop",
      workshopType: "brickworks",
      recipe: "fire_bricks",
    });
    expect(kiln.json().error).toBeUndefined();
    now += 60_000;
    await act(cookie, { type: "empireRelaunchAll" });
    now += 60 * 60_000;
    await act(cookie, { type: "empireRelaunchAll" });
    const built = await act(cookie, { type: "empireBuildCasa" });
    expect(built.json().error).toBeUndefined();
    now += 60 * 60_000;
    expect((await get(cookie)).json().view.house.casa).toBe(2);
  });

  it("refuses what the engine refuses, with the view", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    const res = await act(cookie, { type: "empireUpgrade", workshopId: "nope" });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe("unknown_building");
    expect(res.json().view.house.casa).toBe(1);
  });

  it("stays open past the end of the month, and keeps what is built across a restart", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    now = Date.parse("2026-11-03T08:00:00Z");
    await world.execute({ type: "tick" });
    await act(cookie, { type: "empireRelaunchAll" });
    await app.close();
    await start();
    const open = await database.db.select().from(worlds);
    expect(open).toHaveLength(1);
    expect(open[0]?.status).toBe("open");
    const body = (await get(cookie)).json();
    expect(body.view.house.casa).toBe(1);
    expect(body.view.house.workshops[0].job).not.toBeNull();
    expect(await world.checkInvariants()).toEqual([]);
  });
});

describe("the switch", () => {
  it("opens the empire in place of the next month once its instant is past, Influence as Favour", async () => {
    await app.close();
    await database.db.execute(sql`truncate worlds cascade`);
    now = Date.parse("2026-10-26T08:00:00Z");
    world = await GameWorld.open(database.db, () => now, {
      empireFrom: Date.parse("2026-10-31T00:00:00Z"),
    });
    app = await buildApp({
      db: database.db,
      mailer,
      appUrl: "https://comptoirs.test",
      production: false,
      world,
      now: () => new Date(now),
    });
    // A month of the seasons, until its end.
    expect(world.ctx.settings.empire).toBeUndefined();
    await login("ada@example.org");
    const [account] = await database.db.select({ id: accounts.id }).from(accounts);
    await database.db.insert(influenceEntries).values({
      accountId: account?.id ?? "",
      source: "season",
      amount: 12,
      key: "test:season",
      at: new Date(now),
    });
    // Just past the month's end (the calendar's own, in Paris).
    now = (world.ctx.endAt ?? 0) + 5 * 60_000;
    await world.execute({ type: "tick" });
    expect(world.ctx.settings.empire).toBeDefined();
    const rows = await database.db.select().from(worlds);
    expect(rows.filter((w) => w.status === "open")).toHaveLength(1);
    // A month later, the session has run out: signed in again.
    const joined = await post(await login("ada@example.org"), "/api/empire/join");
    expect(joined.json().view.house.favour).toBe(12);
  });
});

describe("the empire beyond Venetia", () => {
  it("answers the new actions through the route: a vehicle bought, a research refused", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    const body = (await get(cookie)).json();
    expect(body.view.vehicles.mine).toHaveLength(2);
    expect(body.view.regions.map((r: { code: string }) => r.code)).toContain("lombardia");
    const res = await act(cookie, { type: "empireResearch", module: "hold" });
    expect(res.json().error).toBe("no_build_slot");
    const cart = await act(cookie, { type: "empireBuyVehicle", vehicleType: "cart" });
    expect(cart.json().error).toBe("requirement_unmet");
  });
});
