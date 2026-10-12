import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";
import { smallOrders } from "./road.js";

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

describe("the road", () => {
  it("delivers through the API: board, departure, ambush, fighting back, arrival", async () => {
    smallOrders(world);
    world.ctx.settings.bandits.openDay = 0;
    world.ctx.settings.bandits.newcomerDays = 0;
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const view = (await get(ada)).view;
    expect(view.road.orders.length).toBeGreaterThanOrEqual(12);
    expect(view.road.vehicles).toHaveLength(2);
    const order = view.road.orders.find(
      (o: { kind: string; resource: string; status: string }) =>
        o.kind === "city" && o.resource === "bread" && o.status === "open",
    );
    const route = `terraferma:${order.city}`;
    const posted = await act(bob, { type: "postBand", route, hours: 2 });
    expect(posted.error).toBeUndefined();
    expect(posted.view.road.bands).toHaveLength(1);
    expect((await get(ada)).view.road.watchedRoutes).toEqual([route]);

    const sent = await act(ada, {
      type: "dispatchDelivery",
      orderId: order.id,
      vehicleId: view.road.vehicles[0].id,
      escort: "none",
    });
    expect(sent.error).toBeUndefined();
    const [d] = sent.view.road.deliveries;
    expect(d.outcome).toBe("en_route");
    expect(sent.view.road.vehicles[0].status).toBe("busy");

    now = d.midAt;
    await world.execute({ type: "tick" });
    const held = (await get(ada)).view.road.deliveries[0];
    expect(held.attack.pending).toBe(true);
    expect(held.attack.bandit).toBeNull();
    expect(held.attack.reactBy).toBe(d.midAt + world.ctx.settings.bandits.reactionMinutes * 60_000);

    now += 5 * 60_000;
    const fought = await act(ada, { type: "reactToAmbush", deliveryId: d.id });
    expect(fought.error).toBeUndefined();
    expect(fought.view.road.deliveries[0].attack.success).toBe(false);

    const cash = BigInt((await get(ada)).view.cash);
    now = fought.view.road.deliveries[0].arriveAt;
    await world.execute({ type: "tick" });
    const after = (await get(ada)).view;
    expect(after.road.deliveries[0].outcome).toBe("delivered");
    expect(BigInt(after.cash)).toBe(cash + BigInt(d.payment));
    expect(await world.checkInvariants()).toEqual([]);

    // The band broke up: its (empty) booty can be collected.
    const band = (await get(bob)).view.road.bands[0];
    expect(band.dispersed).toBe(true);
    expect((await act(bob, { type: "collectBooty", bandId: band.id })).error).toBeUndefined();
  });

  it("buys a vehicle and lists the road in the catalog", async () => {
    const ada = await player("ada@example.org");
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "instantOrder", resource: "planks", side: "buy", quantity: 10 },
    });
    await world.execute({ type: "tick" });
    await act(ada, { type: "instantOrder", resource: "planks", side: "buy", quantity: 10 });
    const bought = await act(ada, { type: "buyVehicle", vehicleType: "cart" });
    expect(bought.error).toBeUndefined();
    expect(bought.view.road.vehicles).toHaveLength(3);
    const catalog = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(catalog.road.vehicles.map((v: { type: string }) => v.type)).toContain("cart");
    expect(catalog.road.routes.terraferma.padova).toBe(30);
    expect(catalog.cities.map((c: { code: string }) => c.code)).toContain("ferrara");
  });
});
