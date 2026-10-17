import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, influenceEntries } from "../src/db/schema.js";
import { botBuysPatents, buyPatent, houseOf } from "../src/game/house.js";
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

/** A world with the house: 1 Influence per ducat of net sales (to see it on a small sale). */
const house = {
  influence: {
    commerce: { ducatsPerPoint: 1, weeklyCap: 25 },
    campaign: { meritPerPoint: 20, winBonus: 3, weeklyCap: 10 },
    season: { doge: 50, podium: 30, top10: 20, elite: 15, notable: 10, participant: 5 },
  },
  patents: {
    second_counter: { cost: 15, requires: [] },
    lombardy: { cost: 80, requires: ["second_counter"] },
  },
};

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
  await join(cookie, region);
  return cookie;
}

const join = (cookie: string, region: string) =>
  app.inject({ method: "POST", url: "/api/game/join", headers: { cookie }, payload: { region } });
const get = async (cookie: string, url = "/api/house") =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();
const buy = (cookie: string, patent: string) =>
  app.inject({
    method: "POST",
    url: "/api/house/patents",
    headers: { cookie },
    payload: { patent },
  });
const act = (cookie: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload });

/** Ada sells at the Dogana, then the season closes: Influence for the week and the tier. */
async function season() {
  const ada = await player("ada@example.org");
  const bob = await player("bob@example.org", "lagoon");
  await world.execute({ type: "tick" });
  const sold = await act(ada, {
    type: "instantOrder",
    resource: "bread",
    side: "sell",
    quantity: 10,
  });
  expect(sold.json().error).toBeUndefined();
  now = Date.parse("2026-10-31T23:30:00Z");
  await world.execute({ type: "tick" });
  return { ada, bob };
}

describe("the house's Influence", () => {
  it("is earned at the week's close and by the season's tier, kept for the next season", async () => {
    await open({ house });
    const { ada, bob } = await season();
    const a = await get(ada);
    expect(a.enabled).toBe(true);
    const sources = Object.fromEntries(
      (a.entries as { source: string; amount: number }[]).map((e) => [e.source, e.amount]),
    );
    expect(sources.commerce).toBeGreaterThan(0);
    expect(sources.commerce).toBeLessThanOrEqual(25);
    expect(sources.season).toBe(50);
    expect(a.influence).toBe((sources.commerce ?? 0) + 50);
    const b = await get(bob);
    expect(b.influence).toBe(30);
    // The whole catalogue, with what each patent asks for first.
    expect(a.catalog).toEqual([
      { code: "lombardy", cost: 80, requires: ["second_counter"], owned: false },
      { code: "second_counter", cost: 15, requires: [], owned: false },
    ]);
  });

  it("buys patents: paid once, in order, within the balance", async () => {
    await open({ house });
    const { ada, bob } = await season();
    expect((await buy(bob, "lombardy")).json().error).toBe("patent_requires");
    expect((await buy(bob, "atlantis")).json().error).toBe("unknown_patent");
    const before = (await get(ada)).influence;
    const res = await buy(ada, "second_counter");
    expect(res.statusCode).toBe(200);
    expect(res.json().influence).toBe(before - 15);
    expect(res.json().patents).toEqual(["second_counter"]);
    expect((await buy(ada, "second_counter")).json().error).toBe("patent_owned");
    expect((await buy(ada, "lombardy")).json().error).toBe("not_enough_influence");
    expect((await get(ada)).influence).toBe(before - 15);
  });

  it("brings the patents into the world: on joining, and at once when bought there", async () => {
    await open({ house });
    const { ada, bob } = await season();
    await buy(ada, "second_counter");
    await join(ada, "terraferma");
    const view = (await get(ada, "/api/game")).view;
    expect(view.player.patents).toEqual(["second_counter"]);
    const chosen = await act(ada, { type: "chooseSecondCounter", region: "lagoon" });
    expect(chosen.json().error).toBeUndefined();
    expect(chosen.json().view.player.secondRegion).toBe("lagoon");

    await join(bob, "lagoon");
    expect((await get(bob, "/api/game")).view.player.patents).toBeUndefined();
    expect((await buy(bob, "second_counter")).statusCode).toBe(200);
    expect((await get(bob, "/api/game")).view.player.patents).toEqual(["second_counter"]);
  });

  it("is spent by the computer's houses as a merchant would, cheapest first", async () => {
    await open({ house });
    const [bot] = await database.db
      .insert(accounts)
      .values({ email: "bot@bots.invalid", pseudo: "Casa Bot", isBot: true })
      .returning({ id: accounts.id });
    const id = bot?.id ?? "";
    const at = new Date(now);
    const earn = (key: string, amount: number) =>
      database.db
        .insert(influenceEntries)
        .values({ accountId: id, worldId: world.id, source: "commerce", amount, key, at });
    await earn("w0", 50);
    expect(await botBuysPatents(database.db, world.ctx.settings, id, world.id, at)).toEqual([
      "second_counter",
    ]);
    await earn("w1", 60);
    expect(await botBuysPatents(database.db, world.ctx.settings, id, world.id, at)).toEqual([
      "second_counter",
      "lombardy",
    ]);
  });

  it("is in the account's data export", async () => {
    await open({ house });
    const { ada } = await season();
    const data = await get(ada, "/api/me/export");
    expect(data.influence.length).toBeGreaterThan(0);
  });

  it("is on in Venice, and off in a world without it", async () => {
    await open();
    const ada = await player("ada@example.org");
    expect((await get(ada)).enabled).toBe(true);
    const id = (await get(ada, "/api/me")).account.id as string;
    const off = { ...world.ctx.settings, house: undefined };
    expect(await houseOf(database.db, off, id)).toEqual({ enabled: false });
    await expect(
      buyPatent(database.db, off, id, "second_counter", world.id, new Date(now)),
    ).rejects.toThrow("house_off");
  });
});
