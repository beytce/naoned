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

const get = async (cookie: string, url = "/api/game") =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();

const act = async (cookie: string, payload: object) =>
  (
    await app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload })
  ).json();

describe("the patrician families", () => {
  it("open after a few days: allegiance, patronage and the family's place in the view", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org", "lagoon");
    const before = await get(ada);
    const families = before.view.families;
    expect(families.mine).toBeNull();
    expect(families.standings).toHaveLength(4);
    expect(families.opensAt).toBeGreaterThan(now);
    expect((await act(ada, { type: "joinFamily", family: "morosini" })).error).toBe(
      "family_locked",
    );

    now += 4 * DAY + 60_000;
    expect((await act(ada, { type: "joinFamily", family: "morosini" })).error).toBeUndefined();
    expect((await act(bob, { type: "joinFamily", family: "morosini" })).error).toBeUndefined();
    const cash = BigInt((await get(ada)).view.cash);
    expect((await act(ada, { type: "patronize", points: 5 })).error).toBeUndefined();

    const v = (await get(bob)).view;
    expect(BigInt((await get(ada)).view.cash)).toBe(cash - 1_000n);
    expect(v.families.mine).toBe("morosini");
    expect(v.families.orders).toHaveLength(1);
    expect(v.families.standings[0]).toMatchObject({ family: "morosini", members: 2, influence: 5 });
    // Both members are listed, with their pseudos for the screen.
    const res = await get(bob);
    const adaId = v.families.members.find((m: { week: number }) => m.week === 5)?.playerId;
    expect(res.names[adaId]).toBe("ada");
    const catalog = await get(bob, "/api/game/catalog");
    expect(catalog.families.map((f: { code: string }) => f.code)).toEqual([
      "contarini",
      "morosini",
      "mocenigo",
      "dandolo",
    ]);
  });
});
