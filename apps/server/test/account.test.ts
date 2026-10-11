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
let now: number;
const DAY = 86_400_000;

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
  now = Date.parse("2026-10-05T08:00:00Z");
  world = await GameWorld.open(database.db, () => now);
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://fondaco.test",
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
  const cookie = `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
  await app.inject({
    method: "PATCH",
    url: "/api/me",
    headers: { cookie },
    payload: { pseudo: email.split("@")[0] },
  });
  return cookie;
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

describe("personal data (GDPR)", () => {
  it("exports everything the game keeps about a player", async () => {
    const ada = await player("ada@example.org");
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "sellToCity", city: "venezia", resource: "bread", quantity: 2 },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/me/export",
      headers: { cookie: ada },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    const data = res.json();
    expect(data.account.email).toBe("ada@example.org");
    expect(data.seasons.length).toBe(1);
    expect(data.money.length).toBeGreaterThan(0);
    expect(data.activity.length).toBeGreaterThan(0);
  });

  it("deletes an account: no more login, no trace of the person, the world stays balanced", async () => {
    const ada = await player("ada@example.org");
    const refused = await app.inject({
      method: "DELETE",
      url: "/api/me",
      headers: { cookie: ada },
      payload: { confirm: "non" },
    });
    expect(refused.statusCode).toBe(400);
    const res = await app.inject({
      method: "DELETE",
      url: "/api/me",
      headers: { cookie: ada },
      payload: { confirm: "SUPPRIMER" },
    });
    expect(res.statusCode).toBe(204);
    // The session is gone.
    expect(
      (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: ada } })).statusCode,
    ).toBe(401);
    // The address and the name can be used again.
    const rows = await database.db.execute(sql`select email, pseudo from accounts`);
    const all = (rows as { rows: { email: string; pseudo: string | null }[] }).rows;
    expect(all.some((r) => r.email === "ada@example.org" || r.pseudo === "ada")).toBe(false);
    const again = await player("ada@example.org");
    expect(
      (await app.inject({ method: "GET", url: "/api/game", headers: { cookie: again } })).json()
        .view,
    ).not.toBeNull();
    expect(await world.checkInvariants()).toEqual([]);
  });
});
