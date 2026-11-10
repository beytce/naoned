import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

// The living map's two rules behind their switches (docs/plan-carte-vivante.md, lots 3 and 5): the
// terroirs and the towns' loyalty change the trade, so each is off unless the server says « on ».
let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
const now = Date.parse("2026-11-10T08:00:00Z");

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});

async function start(options: { empireTerroirs?: boolean; empireLoyalty?: boolean }) {
  world = await GameWorld.open(database.db, () => now, {
    empire: true,
    empireGrid: "square",
    ...options,
  });
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

type View = {
  view: {
    map: {
      terrain: Record<string, string>;
      terrains: Record<string, unknown>;
      horizon: unknown[];
      unlocked: string[];
    };
    orders: { city: string; loyalty?: unknown }[];
    house: { workshops: { id: string; tile?: string }[] };
  };
};

async function founded(): Promise<{ cookie: string; body: View }> {
  const cookie = await login("living@example.org");
  await app.inject({ method: "POST", url: "/api/empire/join", headers: { cookie }, payload: {} });
  const res = await app.inject({ method: "GET", url: "/api/empire", headers: { cookie } });
  return { cookie, body: res.json() as View };
}

describe("the living map's rules behind their switches", () => {
  it("leaves the land and the towns as before while they are off", async () => {
    await start({});
    const { body } = await founded();
    expect(body.view.map.terrain).toEqual({});
    expect(body.view.map.terrains).toEqual({});
    for (const town of body.view.orders) expect(town.loyalty).toBeUndefined();
    // The horizon is no rule: the land beyond is told whatever the switches.
    expect(body.view.map.horizon.length).toBeGreaterThan(0);
  });

  it("gives each tile its land, and each town its loyalty, once they are on", async () => {
    await start({ empireTerroirs: true, empireLoyalty: true });
    const { body } = await founded();
    expect(Object.keys(body.view.map.terrain).length).toBeGreaterThan(0);
    expect(Object.keys(body.view.map.terrains)).toEqual(
      expect.arrayContaining(["forest", "clay", "fields", "pasture", "sand"]),
    );
    expect(body.view.orders.length).toBeGreaterThan(0);
    for (const town of body.view.orders)
      expect(town.loyalty).toMatchObject({ tier: 0, served: 0, next: { at: 3 } });
  });

  it("switches one without the other", async () => {
    await start({ empireTerroirs: true });
    const { body } = await founded();
    expect(Object.keys(body.view.map.terrain).length).toBeGreaterThan(0);
    for (const town of body.view.orders) expect(town.loyalty).toBeUndefined();
  });

  it("takes them away again when switched off: a world that had them runs as before", async () => {
    await start({ empireTerroirs: true, empireLoyalty: true });
    const { cookie } = await founded();
    await app.close();
    await start({});
    const res = await app.inject({ method: "GET", url: "/api/empire", headers: { cookie } });
    const body = res.json() as View;
    expect(body.view.map.terrain).toEqual({});
    for (const town of body.view.orders) expect(town.loyalty).toBeUndefined();
  });
});
