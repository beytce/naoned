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
  world = await GameWorld.open(database.db, () => now, {
    settingsOverride: { pass: { enabled: true } },
  });
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

async function player(email: string, given?: string) {
  const cookie = await login(email);
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region: "terraferma", ...(given ? { given } : {}) },
  });
  return cookie;
}

const get = async (cookie: string, url = "/api/game") =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();

/** Rows of a raw query. */
const rowsOf = <T>(res: unknown) => (res as { rows: T[] }).rows;
const idOf = async (email: string) =>
  rowsOf<{ id: string }>(
    await database.db.execute(sql`select id from accounts where email = ${email}`),
  )[0]?.id ?? "";

const act = (cookie: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload });

/** The parts of a house on the server (R9, docs/plan-rupture.md): the register, the council. */
describe("the parts of a house on the server", () => {
  it("lists a house after a week, trades its parts, and opens its accounts to its council", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const adaId = await idOf("ada@example.org");
    const bobId = await idOf("bob@example.org");
    expect((await get(ada)).view.shares).toEqual({ listed: false, canList: false, held: 0 });
    expect((await act(ada, { type: "listHouse" })).json().error).toBe("too_early");

    now = Date.parse("2026-10-13T08:00:00Z");
    expect((await get(ada)).view.shares.canList).toBe(true);
    expect((await get(ada, "/api/game/shares")).mine.refusal).toBeNull();
    expect((await act(ada, { type: "listHouse" })).statusCode).toBe(200);
    const sell = (cookie: string, quantity: number, side = "sell") =>
      act(cookie, { type: "placeShareOrder", house: adaId, side, price: "500", quantity });
    expect((await sell(ada, 20)).statusCode).toBe(200);
    expect((await sell(bob, 10, "buy")).statusCode).toBe(200);

    const seen = await get(bob, `/api/game/house/${adaId}/shares`);
    expect(
      seen.holders.map((h: { pseudo: string; shares: number }) => [h.pseudo, h.shares]),
    ).toEqual([
      ["ada", 90],
      ["bob", 10],
    ]);
    // The book never names who offers.
    expect(seen.asks).toEqual([
      { id: expect.any(String), price: "500", quantity: 10, mine: false },
    ]);
    expect(seen.accounts).toBeNull();
    expect((await get(bob, "/api/game/shares")).held).toMatchObject([
      { house: adaId, pseudo: "ada", shares: 10, council: false },
    ]);

    // 30 parts seat a holder on the council: the house's accounts open to it.
    expect((await sell(ada, 10)).statusCode).toBe(200);
    expect((await sell(bob, 20, "buy")).statusCode).toBe(200);
    const council = await get(bob, `/api/game/house/${adaId}/shares`);
    expect(council.council).toBe(true);
    expect(council.accounts.cash).toMatch(/^\d+$/);
    expect((await get(ada, `/api/game/house/${bobId}/shares`)).listed).toBe(false);
  });

  it("takes no free text in its orders", async () => {
    const ada = await player("ada@example.org");
    const res = await act(ada, {
      type: "placeShareOrder",
      house: "not-a-house",
      side: "buy",
      price: "1 ducat",
      quantity: 1,
    });
    expect(res.statusCode).toBe(400);
  });
});
