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

/** The Doge on the server (R7, docs/plan-rupture.md): elected in a month, ruling the next. */
describe("the Doge on the server", () => {
  it("elects the Doge in the month's last week and writes its programme into the next month", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await world.execute({ type: "tick" });
    // Ada sells: first of the month.
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "instantOrder", resource: "bread", side: "sell", quantity: 10 },
    });
    expect((await get(ada, "/api/game/election")).open).toBe(false);

    now = Date.parse("2026-10-26T09:00:00Z");
    await world.execute({ type: "tick" });
    let election = await get(ada, "/api/game/election");
    expect(election.open).toBe(true);
    expect(election.candidate).toBe(true);
    expect(election.candidates.map((c: { pseudo: string }) => c.pseudo)).toEqual(["ada", "bob"]);
    const stood = await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: {
        type: "standForDoge",
        mutator: "grand_gel",
        decree: { code: "faveur", target: "venezia" },
      },
    });
    expect(stood.json().error).toBeUndefined();
    const voted = await app.inject({
      method: "POST",
      url: "/api/game/election/vote",
      headers: { cookie: bob },
      payload: { candidate: election.candidates[0].id, boost: 0 },
    });
    expect(voted.json().error).toBeUndefined();
    election = await get(ada, "/api/game/election");
    expect(election.candidates[0]).toMatchObject({ pseudo: "ada", votes: 1 });
    // Influence for more voices: none to give yet.
    const rich = await app.inject({
      method: "POST",
      url: "/api/game/election/vote",
      headers: { cookie: bob },
      payload: { candidate: election.candidates[0].id, boost: 2 },
    });
    expect(rich.json().error).toBe("not_enough_influence");

    now = Date.parse("2026-10-31T23:30:00Z");
    await world.execute({ type: "tick" });
    expect(world.name).toBe("Venise 1450 · novembre 2026");
    expect(world.ctx.settings.doge?.decree).toEqual({ code: "faveur", target: "venezia" });
    expect(world.ctx.settings.doge?.mutator).toBe("grand_gel");
    expect(world.ctx.settings.doge?.previous).toBeTruthy();
    const catalog = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(catalog.previousDoge.pseudo).toBe("ada");
    expect(catalog.mutator.current).toBe("grand_gel");
    // The Signore's decree is gone: the Doge's replaces it.
    expect(world.ctx.settings.terraferma?.close.decrees).toEqual([]);
  });
});
