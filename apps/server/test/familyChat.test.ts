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
  // The families, as before the Terraferma replaced them.
  world = await GameWorld.open(database.db, () => now, {
    settingsOverride: { terraferma: { live: false } },
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

const say = async (cookie: string, body: string) =>
  await app.inject({
    method: "POST",
    url: "/api/game/family/messages",
    headers: { cookie },
    payload: { body },
  });
const thread = async (cookie: string) =>
  await app.inject({ method: "GET", url: "/api/game/family/messages", headers: { cookie } });
const report = async (cookie: string, id: string) =>
  await app.inject({
    method: "POST",
    url: `/api/game/family/messages/${id}/report`,
    headers: { cookie },
  });

/** Merchants of one family once the families opened. */
async function family(code: string, ...emails: string[]) {
  const cookies: string[] = [];
  for (const email of emails) cookies.push(await player(email));
  now += 2 * DAY + 60_000;
  for (const c of cookies) await act(c, { type: "joinFamily", family: code });
  return cookies;
}

describe("the family's thread", () => {
  it("is for the family's members only", async () => {
    const eve = await player("eve@example.org", "lagoon");
    const [ada, bob] = (await family("morosini", "ada@example.org", "bob@example.org")) as [
      string,
      string,
    ];
    expect((await say(eve, "Bonjour")).statusCode).toBe(403);
    expect((await thread(eve)).statusCode).toBe(403);
    await act(eve, { type: "joinFamily", family: "dandolo" });
    expect((await say(ada, "Qui vend des briques ?")).statusCode).toBe(200);
    now += 20_000;
    expect((await say(bob, "Moi, à 2,20.")).statusCode).toBe(200);
    const seen = (await thread(ada)).json();
    expect(seen.messages.map((m: { body: string }) => m.body)).toEqual([
      "Qui vend des briques ?",
      "Moi, à 2,20.",
    ]);
    expect(seen.messages[0]).toMatchObject({ pseudo: "ada", mine: true });
    expect(seen.messages[1]).toMatchObject({ pseudo: "bob", mine: false });
    // Another family sees its own thread only.
    expect((await thread(eve)).json().messages).toEqual([]);
  });

  it("refuses empty, too long, insulting or linked messages, and keeps a pace", async () => {
    const [ada] = (await family("contarini", "ada@example.org")) as [string];
    expect((await say(ada, "   ")).json().error).toBe("message_empty");
    expect((await say(ada, "a".repeat(281))).json().error).toBe("message_too_long");
    expect((await say(ada, "Espèce de CONNARD")).json().error).toBe("message_refused");
    expect((await say(ada, "Voyez www.example.com")).json().error).toBe("message_refused");
    expect((await say(ada, "Bonjour la famille")).statusCode).toBe(200);
    expect((await say(ada, "Encore moi")).json().error).toBe("message_too_fast");
    now += 11_000;
    expect((await say(ada, "Encore moi")).statusCode).toBe(200);
  });

  it("hides a message three members report, and lets an admin hide one", async () => {
    const cookies = await family(
      "mocenigo",
      "ada@example.org",
      "bob@example.org",
      "cid@example.org",
      "dan@example.org",
      "boss@example.org",
    );
    const [ada, bob, cid, dan, boss] = cookies as [string, string, string, string, string];
    await say(ada, "Un message discutable");
    const id = (await thread(bob)).json().messages[0].id;
    expect((await report(ada, id)).json().error).toBe("own_message");
    for (const c of [bob, cid, bob]) expect((await report(c, id)).statusCode).toBe(200);
    expect((await thread(bob)).json().messages).toHaveLength(1);
    await report(dan, id);
    expect((await thread(bob)).json().messages).toHaveLength(0);

    now += 11_000;
    await say(bob, "Un autre");
    const other = (await thread(ada)).json().messages[0].id;
    await report(ada, other);
    expect(
      (await app.inject({ method: "GET", url: "/api/admin/reports", headers: { cookie: ada } }))
        .statusCode,
    ).toBe(403);
    const reports = (
      await app.inject({ method: "GET", url: "/api/admin/reports", headers: { cookie: boss } })
    ).json().reports;
    expect(reports.map((r: { id: string; reports: number }) => [r.id, r.reports])).toEqual(
      expect.arrayContaining([
        [id, 3],
        [other, 1],
      ]),
    );
    await app.inject({
      method: "POST",
      url: `/api/admin/messages/${other}/hide`,
      headers: { cookie: boss },
    });
    expect((await thread(ada)).json().messages).toHaveLength(0);
  });
});

describe("the families in the view", () => {
  it("shows the family, the map and the marches of the campaign", async () => {
    const [ada, bob] = (await family("contarini", "ada@example.org", "bob@example.org")) as [
      string,
      string,
    ];
    expect((await act(ada, { type: "hireLances", count: 5 })).error).toBeUndefined();
    const sent = await act(ada, { type: "sendMarch", land: "mestre", lances: 5 });
    expect(sent.error).toBeUndefined();
    const res = await app.inject({ method: "GET", url: "/api/game", headers: { cookie: bob } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const v = body.view.families;
    expect(v.mine).toBe("contarini");
    expect(v.families.map((f: { code: string }) => f.code)).toEqual([
      "contarini",
      "morosini",
      "mocenigo",
      "dandolo",
    ]);
    expect(v.lands.find((l: { code: string }) => l.code === "mestre")).toMatchObject({
      holder: null,
      open: true,
    });
    expect(v.lands.find((l: { code: string }) => l.code === "piove")).toMatchObject({
      holder: "contarini",
      seat: "contarini",
    });
    expect(v.marches).toHaveLength(1);
    expect(v.marches[0]).toMatchObject({ target: "mestre", family: "contarini", lances: 5 });
    expect(body.names[v.marches[0].by]).toBe("ada");
    expect(v.members.map((m: { playerId: string }) => body.names[m.playerId]).sort()).toEqual([
      "ada",
      "bob",
    ]);
  });

  it("lists the works and refuses one on a land the family does not hold", async () => {
    const [ada] = (await family("contarini", "ada@example.org")) as [string];
    const catalog = (await app.inject({ method: "GET", url: "/api/game/catalog" })).json();
    expect(Object.keys(catalog.families.campaign.works.kinds)).toEqual([
      "rocca",
      "campo",
      "dogana",
    ]);
    const res = await act(ada, { type: "buildWork", land: "mestre", kind: "rocca" });
    expect(res.error).toBe("not_held");
    const v = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada } })
    ).json().view.families;
    expect(v.me).toMatchObject({ works: 0, worksAllowed: 2 });
    expect(v.lands.find((l: { code: string }) => l.code === "mestre")).toMatchObject({
      work: null,
      from: "piove",
    });
  });
});
