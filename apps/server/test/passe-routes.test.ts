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
  now = Date.parse("2026-11-11T12:00:00Z");
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

/** A guest: the cookie given on the first call, kept for the next. */
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

// The duel on line of the Passe (docs/plan-passe.md P6), through its routes, by two guests.
describe("the Passe on line", () => {
  it("opens a room for a guest, lets a friend in by its code, and plays in turn", async () => {
    const ana = guest();
    const ben = guest();
    const opened = await ana("POST", "/api/passe/room", { board: "lido" });
    expect(opened.statusCode).toBe(200);
    const room = opened.json().room;
    expect(room.waiting).toBe(true);
    expect(room.you).toBe(1);
    const url = `/api/passe/room/${room.code}`;

    const joined = await ben("POST", `${url}/join`);
    expect(joined.json().room.you).toBe(2);
    expect(joined.json().room.waiting).toBe(false);
    expect(joined.json().room.names.thread).not.toBe(joined.json().room.names.chain);

    expect((await ben("POST", `${url}/play`, { at: 12 })).statusCode).toBe(409);
    const played = await ana("POST", `${url}/play`, { at: 12 });
    expect(played.statusCode).toBe(200);
    expect(played.json().room.state.cells[12]).toBe(1);
    expect((await ben("POST", `${url}/play`, { at: 12 })).statusCode).toBe(422);
    expect((await ben("POST", `${url}/play`, { at: 13 })).statusCode).toBe(200);

    // the clock: twenty seconds on, the lieutenant has laid a piece for Ana
    now += 20_000;
    const late = (await ben("GET", url)).json().room;
    expect(late.late.thread).toBe(1);
    expect(late.state.turn).toBe(2);
  });

  it("answers no room, a full room, an unknown board, a malformed code", async () => {
    const ana = guest();
    expect((await ana("GET", "/api/passe/room/ZZZZZZ")).statusCode).toBe(404);
    expect((await ana("GET", "/api/passe/room/nope")).statusCode).toBe(400);
    expect((await ana("POST", "/api/passe/room", { board: "__proto__" })).statusCode).toBe(404);
    const { code } = (await ana("POST", "/api/passe/room", { board: "lido" })).json().room;
    await guest()("POST", `/api/passe/room/${code}/join`);
    expect((await guest()("POST", `/api/passe/room/${code}/join`)).statusCode).toBe(409);
    expect((await ana("POST", `/api/passe/room/${code}/play`, { at: "x" })).statusCode).toBe(400);
    expect((await ana("POST", `/api/passe/room/${code}/again`)).statusCode).toBe(409);
  });
});
