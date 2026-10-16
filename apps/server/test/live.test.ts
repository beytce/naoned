import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
const now = Date.parse("2026-10-12T08:00:00Z");

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
  world = await GameWorld.open(database.db, () => now);
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    now: () => new Date(now),
  });
  await app.ready();
});
afterEach(async () => {
  await app.close();
  await database.close();
});

async function login(email: string): Promise<string> {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  return `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
}

/** An open game: the messages it hears. */
async function open(cookie?: string) {
  const heard: { type: string; version: number }[] = [];
  const ws = await app.injectWS("/api/live", cookie ? { headers: { cookie } } : {});
  ws.on("message", (data: Buffer) => heard.push(JSON.parse(String(data))));
  const closed = new Promise<number>((resolve) => ws.on("close", (code: number) => resolve(code)));
  return { ws, heard, closed };
}
const settle = () => new Promise((r) => setTimeout(r, 50));

describe("the live game", () => {
  it("is told when something of the merchant's changed, and the others on the tick", async () => {
    const ada = await login("ada@example.org");
    const bob = await login("bob@example.org");
    for (const cookie of [ada, bob]) {
      await app.inject({
        method: "POST",
        url: "/api/game/join",
        headers: { cookie },
        payload: { region: "lagoon" },
      });
    }
    await world.execute({ type: "tick" });
    const a = await open(ada);
    const b = await open(bob);
    await settle();

    const res = await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "instantOrder", resource: "planks", side: "buy", quantity: 1 },
    });
    expect(res.statusCode).toBe(200);
    await settle();
    // Ada's game hears it, with the version her view already has; Bob's hears nothing.
    expect(a.heard).toEqual([{ type: "changed", version: res.json().version }]);
    expect(b.heard).toEqual([]);

    await world.execute({ type: "tick" });
    await settle();
    expect(b.heard).toEqual([{ type: "tick", version: world.savedVersion }]);
    a.ws.terminate();
    b.ws.terminate();
  });

  it("closes a game without a session", async () => {
    const { closed } = await open();
    expect(await closed).toBe(4401);
  });
});

describe("the game's pace", () => {
  it("limits each merchant's actions, not the others'", async () => {
    const ada = await login("ada@example.org");
    const bob = await login("bob@example.org");
    const act = (cookie: string) =>
      app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload: {} });
    for (let i = 0; i < 300; i++) expect((await act(ada)).statusCode).not.toBe(429);
    expect((await act(ada)).statusCode).toBe(429);
    expect((await act(bob)).statusCode).not.toBe(429);
  });
});
