import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { tierFor } from "../src/game/season.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { Notifier } from "../src/notify/notifier.js";
import { NoPusher } from "../src/notify/push.js";
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

describe("seasons on calendar months", () => {
  it("opens the first season until the end of the month", async () => {
    const res = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(new Date(res.world.endsAt).toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(res.world.name).toBe("Venise 1450 · octobre 2026");
    expect(res.world.seasonDays).toBe(27);
  });

  it("closes the season, rewards people and opens the next month", async () => {
    const opened: string[] = [];
    world.onSeasonOpened((id) => opened.push(id));
    const notifier = new Notifier(database.db, world, new NoPusher());
    world.onSeasonOpened((id) => void notifier.seasonOpened(id));
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org", "lagoon");
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada },
      payload: { type: "sellToCity", city: "venezia", resource: "bread", quantity: 10 },
    });
    const first = world.id;

    now = Date.parse("2026-10-31T23:30:00Z");
    await world.execute({ type: "tick" });
    expect(world.id).not.toBe(first);
    expect(opened).toEqual([first]);
    expect(world.name).toBe("Venise 1450 · novembre 2026");
    expect(new Date(world.ctx.endAt ?? 0).toISOString()).toBe("2026-11-30T23:00:00.000Z");

    // Everyone starts afresh: the region screen, then the ceremony of the last season.
    const back = await get(ada);
    expect(back.view).toBeNull();
    expect(back.ceremony).toMatchObject({ rank: 1, players: 2, tier: "doge", renown: 100 });
    expect(back.ceremony.podium.map((p: { pseudo: string }) => p.pseudo)).toEqual(["ada", "bob"]);
    expect((await get(bob)).ceremony).toMatchObject({ rank: 2, tier: "podium" });

    await app.inject({
      method: "POST",
      url: "/api/game/ceremony/seen",
      headers: { cookie: ada },
      payload: { worldId: first },
    });
    expect((await get(ada)).ceremony).toBeUndefined();

    const catalog = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(catalog.previousDoge.pseudo).toBe("ada");

    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie: ada },
      payload: { region: "lagoon" },
    });
    // The Doge of the last season holds the Pass for the whole new one.
    const joined = await get(ada);
    expect(joined.view.pass.active).toBe(true);
    expect(joined.view.pass.until).toBe(Date.parse("2026-11-30T23:00:00Z"));
    const prof = await get(ada, "/api/game/profile");
    expect(prof.palmares.renown.points).toBe(100);
    expect(prof.palmares.seasons[0]).toMatchObject({ rank: 1, award: "Doge de la saison" });

    await new Promise((r) => setTimeout(r, 50));
    const bell = await get(bob, "/api/notifications");
    expect(JSON.stringify(bell)).toContain("season");
  });
});

describe("reward tiers", () => {
  it("rewards each place of the top 10, then the top 10 % and 25 %", () => {
    expect(tierFor(1, 200, 0)).toBe("doge");
    expect(tierFor(3, 200, 0)).toBe("podium");
    expect(tierFor(10, 200, 0)).toBe("top10");
    expect(tierFor(20, 200, 0)).toBe("elite");
    expect(tierFor(50, 200, 0)).toBe("notable");
    expect(tierFor(51, 200, 9)).toBe("participant");
    expect(tierFor(51, 200, 2)).toBe("none");
  });
});

describe("rehearsing the end of a season", () => {
  it("lets an admin bring the end forward to test the closing", async () => {
    const boss = await (async () => {
      await app.inject({
        method: "POST",
        url: "/api/auth/request",
        payload: { email: "boss@example.org" },
      });
      const token = decodeURIComponent(
        mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "",
      );
      const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
      return `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
    })();
    const ada = await player("ada@example.org");
    const first = world.id;
    const endsAt = new Date(now + 2 * 3_600_000).toISOString();
    const denied = await app.inject({
      method: "POST",
      url: "/api/admin/season-end",
      headers: { cookie: ada },
      payload: { endsAt },
    });
    expect(denied.statusCode).toBe(403);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/season-end",
      headers: { cookie: boss },
      payload: { endsAt },
    });
    expect(res.statusCode).toBe(200);
    expect(world.ctx.endAt).toBe(Date.parse(endsAt));
    now += 3 * 3_600_000;
    await world.execute({ type: "tick" });
    expect(world.id).not.toBe(first);
    expect((await get(ada)).ceremony.rank).toBe(1);
  });
});
