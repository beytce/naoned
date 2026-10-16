import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { ledgerEntries, players, stockMovements, telemetry } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";
import { deliverBread, smallOrders } from "./road.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});

afterAll(async () => {
  await dropDb();
});
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let now: number;

async function start() {
  world = await GameWorld.open(database.db, () => now);
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
  now = Date.parse("2026-10-12T08:00:00Z");
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

const get = (cookie: string, url = "/api/game") =>
  app.inject({ method: "GET", url, headers: { cookie } });
const post = (cookie: string, url: string, payload: unknown) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });
const act = (cookie: string, payload: unknown) => post(cookie, "/api/game/actions", payload);

describe("profile and visuals", () => {
  it("saves a coat of arms and rejects unknown pieces", async () => {
    const cookie = await login("ada@example.org");
    const ok = await app.inject({
      method: "PATCH",
      url: "/api/me",
      headers: { cookie },
      payload: { crest: { shape: "heater", color: "lagoon", symbol: "lion" } },
    });
    expect(ok.json().account.crest).toEqual({ shape: "heater", color: "lagoon", symbol: "lion" });
    const bad = await app.inject({
      method: "PATCH",
      url: "/api/me",
      headers: { cookie },
      payload: { crest: { shape: "heater", color: "pink", symbol: "lion" } },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("gives a profile with title, rank, stats and trophies", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "lagoon" });
    await world.execute({ type: "tick" });
    await act(cookie, { type: "instantOrder", resource: "planks", side: "buy", quantity: 2 });
    const res = await get(cookie, "/api/game/profile");
    expect(res.statusCode).toBe(200);
    const p = res.json().profile;
    expect(p.title.current.name).toBe("Colporteur");
    expect(p.rank).toBe(1);
    expect(p.stats.trades).toBe(1);
    expect(p.badges.find((b: { code: string }) => b.code === "first_trade").earned).toBe(true);
  });

  it("returns hourly price history", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "lagoon" });
    await world.execute({ type: "tick" });
    await act(cookie, { type: "instantOrder", resource: "planks", side: "buy", quantity: 2 });
    const series = (await get(cookie, "/api/game/prices")).json().series;
    expect(series.planks).toHaveLength(1);
    expect(series.planks[0].volume).toBe(2);
  });
});

describe("living world", () => {
  it("never sends the world id (it seeds the draws)", async () => {
    const res = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(res.world.id).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain(world.id);
  });

  it("shows today's contracts and the gazette; home goods go by road", async () => {
    const cookie = await login("ada@example.org");
    const v = (await post(cookie, "/api/game/join", { region: "terraferma" })).json().view;
    expect(v.contracts).toHaveLength(2); // Two orders of the Doge.
    expect(v.gazette).toHaveProperty("next");
    expect(v.rations.perDay).toBe(6); // farm + mill + bakery
    const home = v.contracts.find((c: { resource: string }) =>
      ["wheat", "flour", "bread", "clay", "wood", "bricks", "planks"].includes(c.resource),
    );
    if (home) {
      const res = await act(cookie, { type: "fulfillContract", contractId: home.id });
      expect(res.json().error).toBe("city_sales_closed");
    }
  });
});

describe("game API", () => {
  it("creates the first world and serves its catalog", async () => {
    const res = await app.inject({ method: "GET", url: "/api/game/catalog" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.world.name).toContain("Venise");
    expect(body.regions.map((r: { code: string }) => r.code)).toEqual([
      "terraferma",
      "lagoon",
      "dolomites",
    ]);
  });

  it("requires a session and a joined player", async () => {
    expect((await app.inject({ method: "GET", url: "/api/game" })).statusCode).toBe(401);
    const cookie = await login("ada@example.org");
    expect((await get(cookie)).json().view).toBeNull();
    expect((await act(cookie, { type: "collectAll" })).statusCode).toBe(409);
  });

  it("plays the tutorial loop: produce, harvest, transform, deliver to a city", async () => {
    smallOrders(world);
    const cookie = await login("ada@example.org");
    const joined = await post(cookie, "/api/game/join", { region: "lagoon" });
    expect(joined.statusCode).toBe(200);
    const v = joined.json().view;
    expect(v.cash).toBe("100000");
    const pit = v.buildings.find((b: { type: string }) => b.type === "clay_pit");
    const works = v.buildings.find((b: { type: string }) => b.type === "brickworks");

    await act(cookie, { type: "startProduction", buildingId: pit.id, batches: 1 });
    now += 31_000; // tutorial batch: 30 s
    await act(cookie, { type: "collectAll" });
    await act(cookie, { type: "startProduction", buildingId: works.id, batches: 1 });
    now += 31_000;
    await act(cookie, { type: "collectAll" });
    const d = await deliverBread(world, v.player.id, now);
    now = d.arriveAt;
    await world.execute({ type: "tick" });
    const after = (await get(cookie)).json().view;
    expect(BigInt(after.cash)).toBeGreaterThan(100_000n);
    expect(after.tutorial).toEqual(["produce", "harvest", "transform", "sell_city"]);

    const steps = await database.db.select().from(telemetry).where(sql`type = 'tutorial_step'`);
    expect(steps).toHaveLength(4);
  });

  it("buys instantly from the market maker once the tick has quoted", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "terraferma" });
    expect(
      (
        await act(cookie, { type: "instantOrder", resource: "planks", side: "buy", quantity: 2 })
      ).json().error,
    ).toBe("no_liquidity");
    await world.execute({ type: "tick" });
    const res = await act(cookie, {
      type: "instantOrder",
      resource: "planks",
      side: "buy",
      quantity: 2,
    });
    expect(res.statusCode).toBe(200);
    const v = res.json().view;
    expect(v.inventory.find((i: { resource: string }) => i.resource === "planks").available).toBe(
      2,
    );
    expect(v.tutorial).toContain("market_buy");
  });

  it("refuses to act on another player's building", async () => {
    const ada = await login("ada@example.org");
    const bob = await login("bob@example.org");
    const adaView = (await post(ada, "/api/game/join", { region: "terraferma" })).json().view;
    await post(bob, "/api/game/join", { region: "lagoon" });
    const res = await act(bob, { type: "collect", buildingId: adaView.buildings[0].id });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe("not_owner");
  });

  it("rejects malformed actions", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "terraferma" });
    expect(
      (await act(cookie, { type: "instantOrder", resource: "wheat", side: "buy", quantity: -1 }))
        .statusCode,
    ).toBe(400);
    expect((await act(cookie, { type: "placeOrder", playerId: "x" })).statusCode).toBe(400);
  });

  it("opens Faraj's welcome bale once: its goods are journaled, the next one comes later", async () => {
    const cookie = await login("ada@example.org");
    const v = (await post(cookie, "/api/game/join", { region: "lagoon" })).json().view;
    expect(v.bales).toMatchObject({ available: 1, max: 2 });
    expect(v.bales.odds.find((o: { rarity: string }) => o.rarity === "legendary")).toBeDefined();
    const opened = (await act(cookie, { type: "openBale" })).json().view;
    expect(opened.bales.available).toBe(0);
    expect(opened.bales.last.cards).toHaveLength(3);
    expect(opened.bales.nextAt).toBeGreaterThan(now);
    const again = await act(cookie, { type: "openBale" });
    expect(again.statusCode).toBe(422);
    expect(again.json().error).toBe("no_bale");
    const gifts = (await database.db.select().from(stockMovements)).filter(
      (m) => m.reason === "bale_gift",
    );
    expect(gifts).toHaveLength(3);
    expect(await world.checkInvariants()).toEqual([]);
  });

  it("saves everything: a restarted server finds the same world, journals match the state", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "terraferma" });
    await world.execute({ type: "tick" });
    await act(cookie, { type: "instantOrder", resource: "bricks", side: "buy", quantity: 3 });
    const before = (await get(cookie)).json().view;

    await app.close();
    await start();
    const after = (await get(cookie)).json().view;
    expect(after.cash).toBe(before.cash);
    expect(after.inventory).toEqual(before.inventory);
    expect(await world.checkInvariants()).toEqual([]);

    const entries = await database.db.select().from(ledgerEntries);
    expect(entries.length).toBeGreaterThan(0);
    const [row] = await database.db.select().from(players);
    expect(row?.region).toBe("terraferma");
  });

  it("restarts a player from scratch once, keeping the journals consistent", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "lagoon" });
    await world.execute({ type: "tick" });
    await act(cookie, { type: "instantOrder", resource: "planks", side: "buy", quantity: 2 });
    const reset = await post(cookie, "/api/game/reset", {});
    expect(reset.statusCode).toBe(200);
    expect(reset.json().view).toBeNull();
    expect(await world.checkInvariants()).toEqual([]);

    const again = (await post(cookie, "/api/game/join", { region: "dolomites" })).json().view;
    expect(again.cash).toBe("100000");
    expect(again.tutorial).toEqual([]);
    expect((await post(cookie, "/api/game/reset", {})).json().error).toBe("reset_limit");
  });

  it("counts a new session after a pause", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/game/join", { region: "terraferma" });
    await get(cookie);
    now += 10 * 60_000;
    await get(cookie);
    now += 40 * 60_000;
    await get(cookie);
    const sessions = await database.db.select().from(telemetry).where(sql`type = 'session_start'`);
    expect(sessions).toHaveLength(1);
  });

  it("ranks players by net worth", async () => {
    const ada = await login("ada@example.org");
    await app.inject({
      method: "PATCH",
      url: "/api/me",
      headers: { cookie: ada },
      payload: { pseudo: "Ada" },
    });
    await post(ada, "/api/game/join", { region: "terraferma" });
    const bob = await login("bob@example.org");
    await post(bob, "/api/game/join", { region: "lagoon" });
    const res = (await get(bob, "/api/game/ranking")).json();
    expect(res.total).toBe(2);
    expect(res.rows[0]).toHaveProperty("netWorth");
    expect(res.rows.some((r: { pseudo: string; me: boolean }) => r.pseudo === "Ada" && !r.me)).toBe(
      true,
    );
    expect(res.rows).not.toContainEqual(expect.objectContaining({ playerId: expect.anything() }));
  });
});
