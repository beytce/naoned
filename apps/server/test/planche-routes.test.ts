import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let now: number;

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
  now = Date.parse("2026-11-16T06:00:00Z");
  const world = await GameWorld.open(database.db, () => now, { empire: true });
  app = await buildApp({
    db: database.db,
    mailer: new MemoryMailer(),
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

function guest() {
  let cookie = "";
  return async (method: "GET" | "POST", url: string, payload?: unknown) => {
    const res = await app.inject({
      method,
      url,
      payload: payload as never,
      headers: cookie ? { cookie } : {},
    });
    const given = res.cookies.find((c) => c.name === "fondaco_guest")?.value;
    if (given) cookie = `fondaco_guest=${given}`;
    return res;
  };
}

// The shared board on line (docs/plan-planche.md L5), through its routes, by two guests.
describe("the board on line", () => {
  it("seats two guests in two houses of one board, and shows each the other's thread", async () => {
    const ana = guest();
    const ben = guest();
    const a = (await ana("GET", "/api/planche")).json().planche;
    const b = (await ben("GET", "/api/planche")).json().planche;
    expect(a.me).toBeTruthy();
    expect(b.me).toBeTruthy();
    expect(a.me).not.toBe(b.me);
    expect(b.players).toEqual(expect.arrayContaining([a.me, b.me]));

    const tied = await ana("POST", "/api/planche/thread", { city: "padoue", good: "verre" });
    expect(tied.statusCode).toBe(200);
    const seen = (await ben("GET", "/api/planche")).json().planche;
    expect(seen.state.houses[a.me].threads.map((t: { to: string }) => t.to)).toEqual(["padoue"]);
    // the amounts come as strings of digits (deniers), never as floats
    expect(seen.state.houses[a.me].ducats).toMatch(/^\d+$/);

    now += 3 * 3_600_000;
    const later = (await ana("GET", "/api/planche")).json().planche;
    expect(later.state.houses[a.me].delivered).toBeGreaterThan(0);
    expect(later.ok).toBe(true);
  });

  it("refuses what the board refuses, with a code", async () => {
    const ana = guest();
    expect(
      (await ana("POST", "/api/planche/thread", { city: "raguse", good: "verre" })).json().error,
    ).toBe("planche_route_shut");
    expect(
      (await ana("POST", "/api/planche/thread", { city: "__proto__", good: "verre" })).statusCode,
    ).toBe(404);
    expect((await ana("POST", "/api/planche/thread", { city: 3 })).statusCode).toBe(400);
    expect(
      (await ana("POST", "/api/planche/force", { passage: "segna", moves: [{ at: 24 }] })).json()
        .error,
    ).toBe("duel_lost");
  });
});
