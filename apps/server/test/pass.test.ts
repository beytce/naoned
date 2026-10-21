import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { PassClosedError, passUntil, purchasePass } from "../src/game/pass.js";
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

describe("the Pass Négociant", () => {
  it("is granted by an admin and known to the engine at once", async () => {
    const ada = await player("ada@example.org");
    const boss = await login("boss@example.org");
    const denied = await app.inject({
      method: "POST",
      url: "/api/admin/pass",
      headers: { cookie: ada },
      payload: { email: "ada@example.org", days: 7 },
    });
    expect(denied.statusCode).toBe(403);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/pass",
      headers: { cookie: boss },
      payload: { email: "ada@example.org", days: 7 },
    });
    expect(res.statusCode).toBe(200);
    const view = (await get(ada)).view;
    expect(view.pass.active).toBe(true);
    // No more open offers than anyone: the Pass gives nothing on the market.
    expect(view.pass.maxOpenOrders).toBe(10);
    // With deliveries by road, the board is never swapped: no Pass perk there.
    expect(view.pass.rerollsLeft).toBe(0);
    const contract = view.contracts[0];
    const swapped = await act(ada, { type: "rerollContract", contractId: contract.id });
    expect(swapped.error).toBe("city_sales_closed");
  });

  it("gives information to read only: thirty days of prices and of dashboard", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const boss = await login("boss@example.org");
    await app.inject({
      method: "POST",
      url: "/api/admin/pass",
      headers: { cookie: boss },
      payload: { email: "ada@example.org", days: 7 },
    });
    expect((await get(ada, "/api/game/prices")).days).toBe(30);
    expect((await get(bob, "/api/game/prices")).days).toBe(7);
    expect((await get(ada, "/api/game/dashboard")).days).toHaveLength(30);
    expect((await get(bob, "/api/game/dashboard")).days).toHaveLength(7);
    const [paid, free] = [(await get(ada)).view, (await get(bob)).view];
    expect(paid.pass.perks).toEqual({
      history30Days: true,
      dashboardDetail: true,
      deepBook: true,
      cosmetics: true,
      contractRerollsPerDay: 0,
    });
    // Nothing on the market: the same number of open offers as anyone.
    expect(paid.pass.maxOpenOrders).toBe(free.pass.maxOpenOrders);
  });

  it("cannot be bought while the payment is unplugged or the Pass is off", async () => {
    const ada = await player("ada@example.org");
    const [account] = (await get(ada, "/api/game/ranking")).rows;
    const on = world.ctx.settings;
    const off = { pass: { ...on.pass, enabled: false } };
    await expect(purchasePass(database.db, on, account.id, now, now + DAY)).rejects.toThrow(
      PassClosedError,
    );
    await expect(
      purchasePass(database.db, off, account.id, now, now + DAY, undefined, true),
    ).rejects.toThrow(PassClosedError);
    expect(await passUntil(database.db, account.id, now)).toBe(0);
    await purchasePass(database.db, on, account.id, now, now + DAY, undefined, true);
    expect(await passUntil(database.db, account.id, now)).toBe(now + DAY);
  });

  it("brings a world saved with the retired perks within the rule at its opening", async () => {
    await database.db.execute(
      sql`update worlds set settings = jsonb_set(settings::jsonb, '{pass}',
        '{"enabled": true, "marketMakerQuotaBps": 2000, "extraOpenOrders": 2, "freshBonusBps": 800}')`,
    );
    const reopened = await GameWorld.open(database.db, () => now);
    expect(reopened.ctx.settings.pass).toMatchObject({
      enabled: true,
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
      freshBonusBps: 0,
    });
    const rows = await database.db.execute(sql`select settings->'pass' as pass from worlds`);
    const [row] = (rows as unknown as { rows: { pass: Record<string, unknown> }[] }).rows;
    expect(row?.pass.freshBonusBps).toBe(0);
  });

  it("goes to the weekly top 10 for the next seven days", async () => {
    const ada = await player("ada@example.org");
    await act(ada, { type: "sellToCity", city: "venezia", resource: "bread", quantity: 5 });
    const [account] = (await get(ada, "/api/game/ranking")).rows;
    now += 7 * DAY + 60_000;
    await world.execute({ type: "tick" });
    expect(await passUntil(database.db, account.id, now)).toBe(now + 7 * DAY);
    const back = await get(ada);
    expect(back.view.pass.active).toBe(true);
    const rows = (await get(ada, "/api/game/ranking")).rows;
    expect(rows[0].pass).toBe(true);
  });

  it("is off in Venice until it comes back: nothing granted, nothing shown", async () => {
    // A new world with the theme's settings as they are.
    await app.close();
    await database.db.execute(sql`truncate worlds cascade`);
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
    const ada = await player("ada@example.org");
    const boss = await login("boss@example.org");
    const granted = await app.inject({
      method: "POST",
      url: "/api/admin/pass",
      headers: { cookie: boss },
      payload: { email: "ada@example.org", days: 7 },
    });
    expect(granted.json().error).toBe("pass_disabled");
    const view = await get(ada);
    expect(view.passPrices).toBeUndefined();
    expect(view.view.pass.active).toBe(false);
    const [account] = (await get(ada, "/api/game/ranking")).rows;
    now += 7 * DAY + 60_000;
    await world.execute({ type: "tick" });
    expect(await passUntil(database.db, account.id, now)).toBe(0);
  });
});
