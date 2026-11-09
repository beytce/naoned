import { carnetWeek, isContesaWeek, terraWeekStart } from "@comptoirs/engine";
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

async function start() {
  world = await GameWorld.open(database.db, () => now, {
    empire: true,
    // The Campo, the door of the Terraferma, is tested on its own (empire.test.ts): here the
    // theatres themselves.
    settingsOverride: { terraferma: { live: true }, empire: { map: { camp: null } } },
  });
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    now: () => new Date(now),
  });
}

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  // An hour into the Monday of an odd week: the theatres, not the Contesa.
  let week = carnetWeek(Date.parse("2026-11-02T12:00:00Z"));
  if (isContesaWeek(week)) week++;
  now = terraWeekStart(week) + 3_600_000;
  await start();
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function login(email: string): Promise<string> {
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

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });
const act = (cookie: string, payload: unknown) => post(cookie, "/api/empire/actions", payload);
const terra = async (cookie: string) =>
  (await app.inject({ method: "GET", url: "/api/empire/terra", headers: { cookie } })).json();

const battle = async (cookie: string) =>
  (await app.inject({ method: "GET", url: "/api/empire/battle", headers: { cookie } })).json()
    .battle;

// The Battle (docs/plan-terraferme-porcellana.md § 4 nonies, lot T6b): a lobby always open, a
// match of 12 minutes when full or after a minute, the empty places taken by the computer.
describe("the Battle on the server", () => {
  it("opens a lobby, starts after its minute with the computer's houses, plays and ends", async () => {
    const a = await login("ada@example.org");
    const b = await login("bob@example.org");
    expect((await battle(a)).phase).toBe("none");
    expect((await post(a, "/api/empire/battle/join")).statusCode).toBe(200);
    expect((await post(b, "/api/empire/battle/join")).statusCode).toBe(200);
    const lobby = await battle(a);
    expect(lobby.phase).toBe("lobby");
    expect(lobby.waiting).toBe(2);
    now += 61_000;
    const live = await battle(a);
    expect(live.phase).toBe("playing");
    expect(live.view.holders.filter((h: { bot: boolean }) => h.bot)).toHaveLength(6);
    expect(live.view.me.chest.ecus).toBeGreaterThan(0);
    // An order of the week on the match's map: a front at a border cell.
    const aim = Number(Object.keys(live.view.costs)[0]);
    const order = await post(a, "/api/empire/battle/act", {
      action: { type: "terraFront", aim, shareBps: 5_000 },
    });
    expect(order.json().ok).toBe(true);
    // A placing is no order of the Battle.
    expect(
      (await post(a, "/api/empire/battle/act", { action: { type: "terraPlace", cell: 0 } }))
        .statusCode,
    ).toBe(400);
    now += 13 * 60_000;
    const done = await battle(a);
    expect(done.phase).toBe("done");
    expect(done.result).toHaveLength(8);
    expect(done.result.filter((r: { me: boolean }) => r.me)).toHaveLength(1);
    // The cote (B3): 1 000 at the start, moved by the ranks at the end, and on the public ranking.
    expect(done.rating).toBe(1_000);
    expect(done.ratingAfter).not.toBeNull();
    expect(done.ratingAfter).not.toBe(1_000);
    const ranking = (await app.inject({ method: "GET", url: "/api/empire/battle/ranking" })).json()
      .ranking;
    expect(ranking).toHaveLength(2);
    expect(ranking.map((r: { pseudo: string }) => r.pseudo).sort()).toEqual(["ada", "bob"]);
    // Once it is over, the next lobby may be joined.
    expect((await post(a, "/api/empire/battle/join")).statusCode).toBe(200);
    expect((await battle(a)).phase).toBe("lobby");
  });

  it("refuses a second lobby to a player whose match is under way", async () => {
    const a = await login("ada@example.org");
    await post(a, "/api/empire/battle/join");
    now += 61_000;
    expect((await battle(a)).phase).toBe("playing");
    const again = await post(a, "/api/empire/battle/join");
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe("already_playing");
  });

  it("lets a guest play at once, and the account made after keeps its cote", async () => {
    // No account: a guest's cookie given on the first read, a name drawn by lot.
    const first = await app.inject({ method: "GET", url: "/api/empire/battle" });
    expect(first.statusCode).toBe(200);
    const token = first.cookies.find((c) => c.name === "fondaco_guest")?.value;
    expect(token).toBeTruthy();
    const g = `fondaco_guest=${token}`;
    const none = first.json().battle;
    expect(none.phase).toBe("none");
    expect(none.guest).toBe(true);
    expect(none.rating).toBe(1_000);
    expect((await post(g, "/api/empire/battle/join")).statusCode).toBe(200);
    now += 61_000;
    const live = await battle(g);
    expect(live.phase).toBe("playing");
    const me = live.view.holders.find((h: { me: boolean; pseudo: string }) => h.me);
    expect(me.pseudo).toMatch(/\S+ \S+/);
    now += 13 * 60_000;
    const done = await battle(g);
    expect(done.phase).toBe("done");
    expect(done.ratingAfter).not.toBeNull();
    // A guest's cote is no line of the public ranking.
    const ranking = async () =>
      (await app.inject({ method: "GET", url: "/api/empire/battle/ranking" })).json().ranking;
    expect(await ranking()).toHaveLength(0);
    // Signed in from the same browser: the account takes the guest's cote, the guest is let go.
    const a = await login("ada@example.org");
    const both = await app.inject({
      method: "GET",
      url: "/api/empire/battle",
      headers: { cookie: `${a}; ${g}` },
    });
    expect(both.json().battle.guest).toBe(false);
    expect(both.cookies.find((c) => c.name === "fondaco_guest")?.value).toBe("");
    const rows = await ranking();
    expect(rows).toHaveLength(1);
    expect(rows[0].rating).toBe(done.ratingAfter);
    expect(rows[0].matches).toBe(1);
  });

  it("opens a private room by its code, launched by its host, its match unranked", async () => {
    const a = await login("ada@example.org");
    const b = await login("bob@example.org");
    const opened = (await post(a, "/api/empire/battle/room")).json().battle;
    expect(opened.phase).toBe("lobby");
    expect(opened.room).toMatch(/^[A-Z2-9]{6}$/);
    expect(opened.host).toBe(true);
    expect((await post(b, "/api/empire/battle/join", { room: "ZZZZZZ" })).statusCode).toBe(404);
    expect((await post(b, "/api/empire/battle/join", { room: opened.room })).statusCode).toBe(200);
    const joined = await battle(b);
    expect(joined.room).toBe(opened.room);
    expect(joined.host).toBe(false);
    expect(joined.waiting).toBe(2);
    // A room waits for its host, past the public lobby's minute.
    now += 2 * 60_000;
    expect((await battle(a)).phase).toBe("lobby");
    expect((await post(b, "/api/empire/battle/room/start")).statusCode).toBe(403);
    expect((await post(a, "/api/empire/battle/room/start")).statusCode).toBe(200);
    expect((await battle(b)).phase).toBe("playing");
    now += 13 * 60_000;
    const done = await battle(a);
    expect(done.phase).toBe("done");
    expect(done.ratingAfter).toBeNull();
    expect(
      (await app.inject({ method: "GET", url: "/api/empire/battle/ranking" })).json().ranking,
    ).toHaveLength(0);
  });
});
