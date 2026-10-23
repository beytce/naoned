import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, influenceEntries } from "../src/db/schema.js";
import { retention } from "../src/game/admin.js";
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
    await open({ terraferma: { live: false } });
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    expect((await get(ada, "/api/game/terra")).terra).toBeNull();
    expect((await act(ada, { type: "terraPlace", cell: 0 })).json().error).toBe("terra_off");
  });

  it("ranks the week by its net sales, the Terraferma live or not", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    const week = await get(ada, "/api/game/ranking/week");
    expect(week.unit).toBeUndefined();
    expect(week.me.gain).toBe("0");
  });

  it("shows the week's map, takes the merchant's commands and the ducats of the cap", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org", "lagoon");
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
    expect(after.holders[me].bot).toBe(false);
    // A house of the computer is told as one wherever its name shows; Milan is no house.
    await database.db.update(accounts).set({ isBot: true }).where(eq(accounts.pseudo, "bob"));
    await place(bob);
    const houses = (await get(ada, "/api/game/terra")).terra.holders as {
      pseudo: string | null;
      bot: boolean;
      milan: boolean;
    }[];
    expect(houses.find((h) => h.pseudo === "bob")?.bot).toBe(true);
    expect(houses.find((h) => h.milan)?.bot).toBe(false);
    // The cells along her border, with what a front pays for each.
    const border = Object.values(after.costs) as number[];
    expect(border.length).toBeGreaterThan(0);
    expect(border.every((c) => c >= 1)).toBe(true);
    // Her ring of cells, just taken from neutral land.
    expect(after.changes.filter((c: { from: number }) => c.from === -1).length).toBe(
      after.me.cells,
    );
    const cash = BigInt((await get(ada, "/api/game")).view.cash);
    expect((await act(ada, { type: "terraRaise" })).json().error).toBeUndefined();
    expect(BigInt((await get(ada, "/api/game")).view.cash)).toBe(cash - 10_000n);
    expect((await get(ada, "/api/game/terra")).terra.me.cap).toBe(
      after.me.cap + after.rules.capRaise,
    );
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

  it("plays a skirmish: a lobby, a live match with condottieri, its ranks to the week's glory", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await world.execute({ type: "tick" });
    await place(ada);
    await place(bob);
    const before = (await get(ada, "/api/game/terra")).terra.me.glory as number;
    const none = await get(ada, "/api/game/skirmish");
    expect(none.phase).toBe("none");
    expect(none.rankedLeft).toBe(1);
    expect(none.ranked).toBe(true);
    const join = (cookie: string) =>
      app.inject({ method: "POST", url: "/api/game/skirmish/join", headers: { cookie } });
    expect((await join(ada)).statusCode).toBe(200);
    expect((await join(bob)).statusCode).toBe(200);
    const lobby = await get(ada, "/api/game/skirmish");
    expect(lobby.phase).toBe("lobby");
    expect(lobby.ranked).toBe(true);
    // Who it opens with, told before it starts: two merchants, the field filled by condottieri.
    expect(lobby.humans).toBe(2);
    expect(lobby.humans + lobby.bots).toBe(world.ctx.settings.terraferma?.skirmish?.players);
    now += 61_000;
    const live = await get(ada, "/api/game/skirmish");
    expect(live.phase).toBe("playing");
    expect(live.ranked).toBe(true);
    expect(live.why).toBeNull();
    expect(live.view.holders.length).toBeGreaterThan(8);
    const condottieri = live.view.holders.filter((h: { pseudo: string | null }) =>
      h.pseudo?.startsWith("Condottiere"),
    );
    expect(condottieri.length).toBe(lobby.bots);
    expect(condottieri.every((h: { bot: boolean }) => h.bot)).toBe(true);
    // A quarter of an hour later, the match is over and its rank paid on the week's map.
    now += 16 * 60_000;
    const done = await get(ada, "/api/game/skirmish");
    expect(done.phase).toBe("done");
    expect(done.rankedLeft).toBe(0);
    // The same badge at the end as at the start, though the quota is now spent.
    expect(done.ranked).toBe(true);
    const mine = done.result.find((r: { me: boolean }) => r.me);
    expect(mine).toBeDefined();
    expect(mine.bot).toBe(false);
    expect(done.result.filter((r: { bot: boolean }) => r.bot).length).toBe(lobby.bots);
    const after = (await get(ada, "/api/game/terra")).terra.me.glory as number;
    expect(after).toBeGreaterThanOrEqual(before + mine.glory);

    // The next match of the day is friendly: no glory, whatever the rank.
    now += 4 * 60_000;
    await get(ada, "/api/game/skirmish");
    expect((await join(ada)).statusCode).toBe(200);
    expect((await join(bob)).statusCode).toBe(200);
    now += 61_000;
    const second = await get(ada, "/api/game/skirmish");
    expect(second.phase).toBe("playing");
    expect(second.ranked).toBe(false);
    expect(second.why).toBe("quota");
    now += 16 * 60_000;
    const friendly = await get(ada, "/api/game/skirmish");
    expect(friendly.phase).toBe("done");
    expect(friendly.result.every((r: { glory: number }) => r.glory === 0)).toBe(true);
    // Friendly for each of them, from the start to the end of the match.
    expect(friendly.ranked).toBe(false);
    expect(friendly.why).toBe("quota");
    expect(friendly.rankedLeft).toBe(0);
    // The beta's dashboard: two ranked and two friendly matches played, no glory at night.
    const { skirmishes } = await retention(database.db, world.id, now);
    expect(skirmishes).toEqual([{ day: "2026-10-05", ranked: 2, friendly: 2, night: 0 }]);
  });

  it("plays alone or at night without glory, and opens no lobby at night", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    await place(ada);
    const join = () =>
      app.inject({ method: "POST", url: "/api/game/skirmish/join", headers: { cookie: ada } });
    expect((await join()).statusCode).toBe(200);
    const alone = await get(ada, "/api/game/skirmish");
    expect(alone.ranked).toBe(false);
    expect(alone.why).toBe("few");
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    const done = await get(ada, "/api/game/skirmish");
    expect(done.ranked).toBe(false);
    expect(done.why).toBe("few");
    expect(done.result.every((r: { glory: number }) => r.glory === 0)).toBe(true);
    expect(done.rankedLeft).toBe(1);
    // 23 h in Paris: no skirmish until 8 h.
    now = Date.parse("2026-10-05T21:00:00Z");
    const night = await get(ada, "/api/game/skirmish");
    expect(night.phase).toBe("night");
    expect(night.opensAtHour).toBe(8);
    const refused = await join();
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error).toBe("night");
  });
  it("says whether the ranked match of the day may still be played after a match alone", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    await place(ada);
    const join = () =>
      app.inject({ method: "POST", url: "/api/game/skirmish/join", headers: { cookie: ada } });
    // 10 h in Paris, alone: friendly, and a ranked match may still be played today.
    expect((await join()).statusCode).toBe(200);
    const morning = await get(ada, "/api/game/skirmish");
    expect(morning.why).toBe("few");
    expect(morning.rankedLater).toBe(true);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    await get(ada, "/api/game/skirmish");
    now += 4 * 60_000;
    await get(ada, "/api/game/skirmish");
    // 21 h 30 in Paris, alone: the match ends at 21 h 46, and the next could not end before 22 h.
    now = Date.parse("2026-10-05T19:30:00Z");
    const before = await get(ada, "/api/game/skirmish");
    expect(before.phase).toBe("none");
    expect(before.ranked).toBe(true);
    expect(before.rankedLater).toBe(true);
    expect((await join()).statusCode).toBe(200);
    const lobby = await get(ada, "/api/game/skirmish");
    expect(lobby.why).toBe("few");
    expect(lobby.rankedLater).toBe(false);
    now += 61_000;
    const live = await get(ada, "/api/game/skirmish");
    expect(live.phase).toBe("playing");
    expect(live.why).toBe("few");
    expect(live.rankedLeft).toBe(1);
    expect(live.rankedLater).toBe(false);
    now += 16 * 60_000;
    const done = await get(ada, "/api/game/skirmish");
    expect(done.phase).toBe("done");
    expect(done.why).toBe("few");
    expect(done.rankedLater).toBe(false);
  });
  it("announces as friendly a match launched too late to end before 22 h", async () => {
    await open({ terraferma: { live: true } });
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await world.execute({ type: "tick" });
    await place(ada);
    await place(bob);
    // 21 h 50 in Paris: the lobby is open, but a match launched now would end after 22 h.
    now = Date.parse("2026-10-05T19:50:00Z");
    const none = await get(ada, "/api/game/skirmish");
    expect(none.phase).toBe("none");
    expect(none.rankedLeft).toBe(1);
    expect(none.ranked).toBe(false);
    expect(none.why).toBe("late");
    expect(none.closesAtHour).toBe(22);
    const join = (cookie: string) =>
      app.inject({ method: "POST", url: "/api/game/skirmish/join", headers: { cookie } });
    expect((await join(ada)).statusCode).toBe(200);
    expect((await join(bob)).statusCode).toBe(200);
    const lobby = await get(ada, "/api/game/skirmish");
    expect(lobby.ranked).toBe(false);
    expect(lobby.why).toBe("late");
    now += 61_000;
    expect((await get(ada, "/api/game/skirmish")).why).toBe("late");
    now += 16 * 60_000;
    const done = await get(ada, "/api/game/skirmish");
    expect(done.phase).toBe("done");
    expect(done.ranked).toBe(false);
    expect(done.why).toBe("late");
    // Nothing paid: its quota of the day is untouched.
    expect(done.rankedLeft).toBe(1);
  });
});
