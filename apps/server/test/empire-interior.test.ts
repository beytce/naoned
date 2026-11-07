import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, influenceEntries, ledgerEntries, players, worlds } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";
import { joinAtWork } from "./empire-start.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let now: number;
let interiorOn = true;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});

async function start() {
  world = await GameWorld.open(database.db, () => now, {
    empire: true,
    empireGrid: "square",
    empireInterior: interiorOn,
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

type Inside = {
  paceBps: number;
  stations: { id: string; kind: string; x: number; y: number }[];
  hands: { id: string; stationId?: string }[];
  rate: { bottleneck: { stage: string } };
};

async function sawmill(cookie: string) {
  const body = (await get(cookie)).json();
  const ws = body.view.house.workshops.find((w: { type: string }) => w.type === "sawmill");
  return { id: ws.id as string, inside: body.view.interiors[ws.id] as Inside, body };
}

// The workshops' insides through the server (docs/plan-ateliers.md lot A4): the commands checked
// by their schema, run by the engine, their money in the ledger; the view carries each inside.
describe("the workshops' insides", () => {
  it("shows each workshop's inside, its default plan never slower than before", async () => {
    const cookie = await login("ada@example.org");
    await joinAtWork(post, cookie, (ms) => {
      now += ms;
    });
    const { inside, body } = await sawmill(cookie);
    // Never less than before the insides; new machines and rested hands, more.
    expect(inside.paceBps).toBeGreaterThanOrEqual(10_000);
    expect(inside.stations.map((s) => s.kind)).toEqual([
      "barking",
      "saw_bench",
      "drying_shed",
      "planing",
    ]);
    expect(inside.rate.bottleneck.stage).toBe("saw");
    expect(body.view.interiorRules.stations.saw_bench.levels).toHaveLength(5);
  });

  it("places, moves and mends a station, its price in the ledger", async () => {
    const cookie = await login("ada@example.org");
    await joinAtWork(post, cookie, (ms) => {
      now += ms;
    });
    const { id } = await sawmill(cookie);
    const before = (await get(cookie)).json().cash;
    const placed = await act(cookie, {
      type: "empireInteriorPlace",
      workshopId: id,
      kind: "barking",
      x: 0,
      y: 1,
      rot: 0,
    });
    expect(placed.statusCode).toBe(200);
    expect(BigInt(placed.json().cash)).toBe(BigInt(before) - 6_000n);
    const paid = await database.db
      .select()
      .from(ledgerEntries)
      .where(sql`reason = 'empire_build' and ref like 'station:%'`);
    expect(paid.length).toBeGreaterThan(0);
    now += 5 * 60_000;
    const moved = await act(cookie, {
      type: "empireInteriorMove",
      workshopId: id,
      stationId: "s5",
      x: 0,
      y: 2,
      rot: 0,
    });
    expect(moved.statusCode).toBe(200);
    const { inside } = await sawmill(cookie);
    expect(inside.stations.find((s) => s.id === "s5")).toMatchObject({ x: 0, y: 2 });
    expect((await act(cookie, { type: "empireInteriorMaintain", workshopId: id })).statusCode).toBe(
      200,
    );
  });

  it("hires at the door and places the hand on a shift", async () => {
    const cookie = await login("ada@example.org");
    await joinAtWork(post, cookie, (ms) => {
      now += ms;
    });
    const { id } = await sawmill(cookie);
    const hired = await act(cookie, {
      type: "empireInteriorHire",
      workshopId: id,
      trade: "sawyer",
    });
    expect(hired.statusCode).toBe(200);
    const hand = hired.json().view.interiors[id].hands.at(-1);
    const placed = await act(cookie, {
      type: "empireInteriorAssign",
      workshopId: id,
      handId: hand.id,
      stationId: "s2",
      shift: "night",
    });
    expect(placed.statusCode).toBe(200);
    const { inside } = await sawmill(cookie);
    expect(inside.hands.find((h) => h.id === hand.id)?.stationId).toBe("s2");
  });

  it("refuses what the schema does not know, and what the engine refuses", async () => {
    const cookie = await login("ada@example.org");
    await joinAtWork(post, cookie, (ms) => {
      now += ms;
    });
    const { id } = await sawmill(cookie);
    const bad = await act(cookie, {
      type: "empireInteriorCare",
      workshopId: id,
      stationId: "s1",
      care: 20_000,
    });
    expect(bad.statusCode).toBe(400);
    // On the canal: a wall.
    const wall = await act(cookie, {
      type: "empireInteriorPlace",
      workshopId: id,
      kind: "barking",
      x: 3,
      y: 1,
      rot: 0,
    });
    expect(wall.statusCode).toBe(422);
    expect(wall.json().error).toBe("no_room");
  });

  it("switched off, the world has no insides and the commands are refused", async () => {
    await app.close();
    interiorOn = false;
    await start();
    try {
      const cookie = await login("ada@example.org");
      await joinAtWork(post, cookie, (ms) => {
        now += ms;
      });
      const body = (await get(cookie)).json();
      expect(body.view.interiors).toEqual({});
      const ws = body.view.house.workshops[0];
      const res = await act(cookie, {
        type: "empireInteriorHire",
        workshopId: ws.id,
        trade: "labourer",
      });
      expect(res.statusCode).toBe(422);
    } finally {
      interiorOn = true;
    }
  });
});
