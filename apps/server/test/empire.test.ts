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

describe("the map (the map at the centre, step 2)", () => {
  it("shows Venetia and its cities alone, puts a counter down, refuses the unknown", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    const map = (await get(cookie)).json().view.map;
    expect(map.cities.map((c: { code: string }) => c.code)).toEqual(["venezia"]);
    expect(
      Object.values(map.cells as Record<string, { region: string }>).every(
        (c) => c.region === "veneto",
      ),
    ).toBe(true);
    // Milan's cell, far in the unknown at the Casa 1.
    const far = await act(cookie, { type: "empirePlaceCounter", cell: "-3,9" });
    expect(far.json().error).toMatch(/hidden_cell|unknown_cell/);
    // Venice's own sector: the counter there reveals the six around it.
    const cell = Object.keys(map.cells)[0];
    const put = await act(cookie, { type: "empirePlaceCounter", cell });
    expect(put.json().error).toBeUndefined();
    expect(put.json().view.map.sites).toEqual([expect.objectContaining({ kind: "post", cell })]);
    const city = await act(cookie, {
      type: "empireDeliver",
      good: "bread",
      qty: 1,
      city: "milano",
    });
    expect(city.json().error).toBe("hidden_cell");
    // The Terraferma waits for the Campo (from the Casa 4).
    expect((await act(cookie, { type: "empireTerraJoin" })).json().error).toBe("no_camp");
    expect((await act(cookie, { type: "empireBuildCamp", cell })).json().error).toBe(
      "requirement_unmet",
    );
  });
});

describe("the sea", () => {
  it("answers the Arsenal, the Muda and the colleganza through the route, and shows the risk", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    const body = (await get(cookie)).json();
    const galea = body.view.vehicles.shop.find((v: { type: string }) => v.type === "galea");
    expect(galea).toMatchObject({ muda: true, slots: 4 });
    expect(body.view.muda.next).toBeGreaterThan(now);
    expect(
      body.view.regions.find((r: { code: string }) => r.code === "dalmazia").corsairRiskBps,
    ).toBeGreaterThan(0);
    const ship = await act(cookie, { type: "empireBuildShip", vehicleType: "marciliana" });
    expect(ship.json().error).toBe("requirement_unmet");
    const mule = body.view.vehicles.mine[0].id;
    expect(
      (await act(cookie, { type: "empireMudaBid", vehicleId: mule, amount: "100" })).json().error,
    ).toBe("unknown_building_type");
    const open = await act(cookie, {
      type: "empireColleganzaOpen",
      vehicleId: mule,
      from: "veneto",
      to: "veneto",
      good: "clay",
      qty: 5,
      target: "1000",
    });
    expect(open.json().error).toBe("requirement_unmet");
  });
});

describe("the house's identity", () => {
  it("hires a master, places it, and reads its identity", async () => {
    const cookie = await login("ada@example.org");
    await post(cookie, "/api/empire/join");
    const hired = await act(cookie, { type: "empireHire", role: "master" });
    expect(hired.json().error).toBeUndefined();
    const body = hired.json();
    const member = body.view.identity.staff.members[0];
    expect(member).toMatchObject({ role: "master", level: 1 });
    const workshop = body.view.house.workshops[0].id;
    const placed = await act(cookie, { type: "empirePlace", staffId: member.id, at: workshop });
    expect(placed.json().view.identity.staff.members[0].placedAt).toBe(workshop);
    expect(placed.json().view.identity.arte.options).toHaveLength(5);
    const arte = await act(cookie, { type: "empireChooseArte", arte: "vetrai" });
    expect(arte.json().error).toBe("requirement_unmet");
  });
});
