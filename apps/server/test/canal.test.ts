import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { redistributeCanal } from "../src/game/canal.js";
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
  // The Pass is off in Venice until it comes back: switched on here to test it.
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

/** The Grand Canal on the server (R5, docs/plan-rupture.md): forty palaces, kept or lost. */
describe("the Grand Canal on the server", () => {
  it("gives the month's people a palace, shown to everyone without e-mail", async () => {
    const ada = await player("ada@example.org");
    await player("bob@example.org");
    await world.execute({ type: "tick" });
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "instantOrder", resource: "bread", side: "sell", quantity: 10 },
    });
    // Ada played a week of the month, Bob a day.
    const [row] = rowsOf<{ id: string }>(
      await database.db.execute(sql`select id from accounts where email = 'ada@example.org'`),
    );
    for (let d = 0; d < 7; d++)
      await database.db.execute(
        sql`insert into telemetry (account_id, world_id, type, at) values (${row?.id}, ${world.id}, 'visit', ${new Date(Date.parse("2026-10-06T10:00:00Z") + d * 86_400_000)})`,
      );
    now = Date.parse("2026-10-31T23:30:00Z");
    await world.execute({ type: "tick" });

    const canal = (await app.inject({ method: "GET", url: "/api/canal" })).json();
    expect(canal.plots).toHaveLength(1);
    expect(canal.plots[0]).toMatchObject({ plot: 1, pseudo: "ada", generations: 1 });
    expect(JSON.stringify(canal)).not.toContain("@example.org");
    expect((await get(ada)).ceremony.palace).toBe(1);
  });

  it("keeps a palace while its house stays in the forty, and gives the free ones by rank", async () => {
    const ids: string[] = [];
    for (const name of ["a", "b", "c"]) {
      await login(`${name}@example.org`);
      const [r] = rowsOf<{ id: string }>(
        await database.db.execute(
          sql`select id from accounts where email = ${`${name}@example.org`}`,
        ),
      );
      ids.push(r?.id ?? "");
    }
    const [a = "", b = "", c = ""] = ids;
    const at = new Date(now);
    await redistributeCanal(
      database.db,
      world.id,
      [
        { accountId: a, rank: 1, days: 10 },
        { accountId: b, rank: 2, days: 10 },
      ],
      at,
    );
    const plots = async () =>
      rowsOf<{ plot: number; account_id: string }>(
        await database.db.execute(sql`select plot, account_id from canal_plots order by plot`),
      );
    expect((await plots()).map((p) => p.account_id)).toEqual([a, b]);
    // Next month b leads, a leaves, c arrives: b keeps plot 2, c takes plot 1.
    await redistributeCanal(
      database.db,
      world.id,
      [
        { accountId: b, rank: 1, days: 10 },
        { accountId: c, rank: 2, days: 10 },
        { accountId: a, rank: 3, days: 2 },
      ],
      at,
    );
    expect(await plots()).toEqual([
      { plot: 1, account_id: c },
      { plot: 2, account_id: b },
    ]);
  });
});
