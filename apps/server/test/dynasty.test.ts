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

/** The Dynastie on the server (R4, docs/plan-rupture.md): a line, one generation a month. */
describe("the Dynastie on the server", () => {
  it("names the month's member, closes it with its traits and passes the heir's on", async () => {
    const before = await login("ada@example.org");
    const offered = (await get(before, "/api/game/dynasty")).names as string[];
    expect(offered).toHaveLength(3);
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie: before },
      payload: { region: "terraferma", given: offered[1] },
    });
    const ada = before;
    await player("bob@example.org");
    let line = await get(ada, "/api/game/dynasty");
    expect(line.current).toMatchObject({ given: offered[1], year: 1450, traitIn: null });
    expect(line.heir).toBeNull();

    // Ada sells at the Dogana: first of the month, raised at the Rialto, « le Magnifique ».
    await world.execute({ type: "tick" });
    const sold = await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "instantOrder", resource: "bread", side: "sell", quantity: 10 },
    });
    expect(sold.json().error).toBeUndefined();
    now = Date.parse("2026-10-31T23:30:00Z");
    await world.execute({ type: "tick" });

    line = await get(ada, "/api/game/dynasty");
    expect(line.current).toBeNull();
    expect(line.generations[0]).toMatchObject({ rank: 1, epithet: "magnifico" });
    expect(line.heir.earned).toContain("rialto");
    const refused = await app.inject({
      method: "POST",
      url: "/api/game/heir",
      headers: { cookie: ada },
      payload: { trait: "notaio" },
    });
    expect(refused.json().error).toBe("trait_not_earned");
    await app.inject({
      method: "POST",
      url: "/api/game/heir",
      headers: { cookie: ada },
      payload: { trait: "rialto" },
    });

    // The heir joins the next month with the trait, a year later.
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie: ada },
      payload: { region: "lagoon" },
    });
    expect(
      world.current.players[
        Object.keys(world.current.players).find((id) => world.current.players[id]?.trait) ?? ""
      ]?.trait,
    ).toBe("rialto");
    line = await get(ada, "/api/game/dynasty");
    expect(line.current).toMatchObject({ year: 1451, traitIn: "rialto" });
    expect(line.generations).toHaveLength(2);
    expect((await get(ada)).view.dynasty.trait).toBe("rialto");
  });
});
