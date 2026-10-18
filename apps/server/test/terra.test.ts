import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { influenceEntries } from "../src/db/schema.js";
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

async function open(settingsOverride?: Record<string, unknown>) {
  world = await GameWorld.open(
    database.db,
    () => now,
    settingsOverride ? { settingsOverride } : {},
  );
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://fondaco.test",
    production: false,
    world,
    now: () => new Date(now),
  });
}

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry, influence_entries cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-05T08:00:00Z");
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string, region = "terraferma") {
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
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region },
  });
  return cookie;
}

const get = async (cookie: string, url: string) =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();
const act = (cookie: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload });

/** Sets the merchant down on the first land cell the rules accept. */
async function place(cookie: string) {
  const { terra } = await get(cookie, "/api/game/terra");
  const { width } = terra.map;
  const cells = (terra.map.terrain as string)
    .split("")
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t !== "w" && terra.owner[i] === -1 && i % width > width / 3);
  for (const { i } of cells) {
    const res = await act(cookie, { type: "terraPlace", cell: i });
    if (!res.json().error) return i;
  }
  throw new Error("nowhere to set down");
}

describe("the Terraferma on the server", () => {
  it("is off while the world's settings keep it so", async () => {
    await open();
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    expect((await get(ada, "/api/game/terra")).terra).toBeNull();
    expect((await act(ada, { type: "terraPlace", cell: 0 })).json().error).toBe("terra_off");
  });

  it("shows the week's map, takes the merchant's commands and the ducats of the cap", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    await player("bob@example.org", "lagoon");
    await world.execute({ type: "tick" });
    const before = await get(ada, "/api/game/terra");
    expect(before.terra.me).toBeNull();
    expect(before.terra.map.cities.length).toBeGreaterThan(0);
    await place(ada);
    const after = (await get(ada, "/api/game/terra")).terra;
    expect(after.me.cells).toBeGreaterThan(1);
    const me = after.holders.findIndex((h: { me: boolean }) => h.me);
    expect(after.holders[me].pseudo).toBe("ada");
    expect(after.holders[me].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(after.holders[me].cells).toBe(after.me.cells);
    // The cells along her border, with what a front pays for each.
    const border = Object.values(after.costs) as number[];
    expect(border.length).toBeGreaterThan(0);
    expect(border.every((c) => c >= 1)).toBe(true);
    const cash = BigInt((await get(ada, "/api/game")).view.cash);
    expect((await act(ada, { type: "terraRaise" })).json().error).toBeUndefined();
    expect(BigInt((await get(ada, "/api/game")).view.cash)).toBe(cash - 10_000n);
    expect((await get(ada, "/api/game/terra")).terra.me.cap).toBe(after.me.cap + 10);
  });

  it("closes the week: the Influence of the ranking goes to the house", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    await place(ada);
    // Past the week's end (the world opened with the test, on 5 October at 8 h).
    now = Date.parse("2026-10-12T09:00:00Z");
    await world.execute({ type: "tick" });
    const id = (await get(ada, "/api/me")).account.id as string;
    const rows = await database.db
      .select()
      .from(influenceEntries)
      .where(and(eq(influenceEntries.accountId, id), eq(influenceEntries.source, "terraferma")));
    expect(rows.length).toBe(1);
    expect(rows[0]?.amount).toBeGreaterThan(0);
  });
});
