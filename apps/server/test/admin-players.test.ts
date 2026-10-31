import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { ledgerEntries, telemetry } from "../src/db/schema.js";
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

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-26T08:00:00Z");
  world = await GameWorld.open(database.db, () => now, { empire: true });
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    now: () => new Date(now),
    adminEmails: ["boss@example.org"],
  });
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

const get = (cookie: string, url: string) =>
  app.inject({ method: "GET", url, headers: { cookie } });
const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });

describe("the admin's desk on the merchants", () => {
  it("is closed to a merchant", async () => {
    const ada = await login("ada@example.org");
    expect((await get(ada, "/api/admin/players")).statusCode).toBe(403);
    expect((await get(ada, "/api/admin/world")).statusCode).toBe(403);
  });

  it("lists, reads and sets a merchant's cash, Casa and stock", async () => {
    const ada = await login("ada@example.org");
    await post(ada, "/api/empire/join");
    const boss = await login("boss@example.org");
    const list = (await get(boss, "/api/admin/players?q=ada")).json();
    expect(list.players).toHaveLength(1);
    const id = list.players[0].id;
    expect(list.players[0].casa).toBe(1);

    const edit = (e: unknown) => post(boss, `/api/admin/players/${id}/edit`, { edit: e });
    expect((await edit({ kind: "cash", deniers: "99900000" })).statusCode).toBe(200);
    expect((await edit({ kind: "casa", level: 6 })).statusCode).toBe(200);
    expect((await edit({ kind: "stock", good: "bricks", qty: 500 })).statusCode).toBe(200);
    expect((await edit({ kind: "casa", level: 999 })).json().error).toBe("invalid_quantity");
    expect((await edit({ kind: "nope" })).statusCode).toBe(400);

    const sheet = (await get(boss, `/api/admin/players/${id}`)).json();
    expect(sheet.cash).toBe("99900000");
    expect(sheet.empire.house.casa).toBe(6);
    expect(sheet.stock.bricks.available).toBe(500);
    expect(sheet.empire.bounds.casa).toBeGreaterThanOrEqual(6);

    // The merchant sees it at once, and the ledger holds the money given.
    expect((await get(ada, "/api/empire")).json().view.house.casa).toBe(6);
    const given = await database.db
      .select()
      .from(ledgerEntries)
      .where(sql`reason = 'admin_adjust'`);
    expect(given).toHaveLength(1);
    // The admin's hand is no visit of the merchant's.
    const visits = await database.db
      .select()
      .from(telemetry)
      .where(sql`type = 'admin_edit'`);
    expect(visits).toHaveLength(0);
    const check = (await post(boss, "/api/admin/invariants")).json();
    expect(check.ok).toBe(true);
  });

  it("sets the account's marks", async () => {
    const ada = await login("ada@example.org");
    await post(ada, "/api/empire/join");
    const boss = await login("boss@example.org");
    const id = (await get(boss, "/api/admin/players")).json().players[0].id;
    const res = await post(boss, `/api/admin/players/${id}/account`, {
      condottaLevel: 12,
      terraRating: 1500,
    });
    expect(res.statusCode).toBe(200);
    const sheet = (await get(boss, `/api/admin/players/${id}`)).json();
    expect(sheet.account.condottaLevel).toBe(12);
    expect(sheet.account.terraRating).toBe(1500);
  });
});
