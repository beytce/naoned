import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, companyMembers, ledgerEntries, telemetry } from "../src/db/schema.js";
import { COMPANY_MAX } from "../src/game/company.js";
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
const MIN = 60_000;

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

const act = async (cookie: string, payload: object) =>
  (
    await app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload })
  ).json();

const post = (cookie: string, url: string, payload: object = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload });

async function found(cookie: string, name = "Les Amis du Rialto") {
  const res = await post(cookie, "/api/company", { name });
  expect(res.statusCode).toBe(200);
  return res.json().company as { code: string; name: string };
}

describe("companies", () => {
  it("are founded, joined by link, shown with what the company lacks", async () => {
    const ada = await player("ada@example.org", "terraferma");
    const bob = await player("bob@example.org", "lagoon");
    const { code } = await found(ada);
    // The invitation, before joining: the company and the trade it lacks.
    const inv = (
      await app.inject({ method: "GET", url: `/api/company/invitation/${code}` })
    ).json();
    expect(inv).toMatchObject({ name: "Les Amis du Rialto", members: 1, full: false });
    expect(inv.missingRegion).toBe("lagoon");
    expect((await post(bob, "/api/company/join", { code })).statusCode).toBe(200);
    const view = (await get(bob, "/api/company")).company;
    expect(view.members.map((m: { pseudo: string }) => m.pseudo)).toEqual(["ada", "bob"]);
    expect(view.missingRegion).toBe("dolomites");
    expect(view.members.find((m: { me: boolean }) => m.me).pseudo).toBe("bob");
  });

  it("holds six at most, one company per account, a week before joining another", async () => {
    const ada = await player("ada@example.org");
    const { code } = await found(ada);
    const others = [];
    for (let i = 1; i < COMPANY_MAX; i++) others.push(await player(`p${i}@example.org`));
    for (const c of others)
      expect((await post(c, "/api/company/join", { code })).statusCode).toBe(200);
    const late = await player("late@example.org");
    expect((await post(late, "/api/company/join", { code })).json().error).toBe("company_full");
    // Already in one: neither found nor join another.
    expect((await post(ada, "/api/company", { name: "Autre Maison" })).json().error).toBe(
      "already_member",
    );
    // Who leaves waits a week.
    const leaver = others[0] as string;
    await post(leaver, "/api/company/leave");
    expect((await post(leaver, "/api/company/join", { code })).json().error).toBe("left_recently");
    expect((await get(leaver, "/api/company")).mayJoinAt).toBeGreaterThan(now);
    now += 7 * DAY + MIN;
    expect((await post(leaver, "/api/company/join", { code })).statusCode).toBe(200);
  });

  it("closes with its last member, and refuses names coarse or taken", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    expect((await post(ada, "/api/company", { name: "ab" })).json().error).toBe("invalid_name");
    expect((await post(ada, "/api/company", { name: "Maison Connard" })).json().error).toBe(
      "invalid_name",
    );
    await found(ada, "La Serenissima");
    expect((await post(bob, "/api/company", { name: "la serenissima" })).json().error).toBe(
      "name_taken",
    );
    await post(ada, "/api/company/leave");
    expect((await get(ada, "/api/company")).company).toBeNull();
    // The name is free again.
    now += 7 * DAY + MIN;
    expect((await post(bob, "/api/company", { name: "La Serenissima" })).statusCode).toBe(200);
  });

  it("outlives the month: kept at the layer of the accounts", async () => {
    const ada = await player("ada@example.org");
    await found(ada);
    const [id] = await database.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, "ada@example.org"));
    const rows = await database.db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.accountId, id?.id ?? ""));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] ?? {})).not.toContain("worldId");
  });

  it("has a thread for its members only, under the rules of every thread", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const eve = await player("eve@example.org");
    const { code } = await found(ada);
    await post(bob, "/api/company/join", { code });
    expect(
      (await post(ada, "/api/company/messages", { body: "Rendez-vous à 12 h 30" })).statusCode,
    ).toBe(200);
    expect((await post(ada, "/api/company/messages", { body: "encore" })).json().error).toBe(
      "message_too_fast",
    );
    now += MIN;
    expect(
      (await post(ada, "/api/company/messages", { body: "voir www.site.com" })).json().error,
    ).toBe("message_refused");
    const thread = await get(bob, "/api/company/messages");
    expect(thread.messages.map((m: { body: string }) => m.body)).toEqual(["Rendez-vous à 12 h 30"]);
    expect(
      (await app.inject({ method: "GET", url: "/api/company/messages", headers: { cookie: eve } }))
        .statusCode,
    ).toBe(403);
    // Bob may report Ada's message, not his own.
    const id = thread.messages[0].id;
    expect((await post(bob, `/api/company/messages/${id}/report`)).statusCode).toBe(200);
    expect((await post(ada, `/api/company/messages/${id}/report`)).json().error).toBe(
      "own_message",
    );
  });

  it("gives no ducats, goods nor alliance: founding and joining move nothing in the ledger", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const before = (await database.db.select().from(ledgerEntries)).length;
    const cashBefore = { ...world.current.accounts };
    const { code } = await found(ada);
    await post(bob, "/api/company/join", { code });
    await post(ada, "/api/company/call");
    expect((await database.db.select().from(ledgerEntries)).length).toBe(before);
    expect(world.current.accounts).toEqual(cashBefore);
    const terra = world.current.terra;
    for (const p of Object.values(terra?.map?.players ?? {})) {
      expect((p as { allies?: string[] }).allies ?? []).toHaveLength(0);
    }
  });

  it("calls its members to the next skirmish, and counts the invitations shared", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const { code } = await found(ada);
    await post(bob, "/api/company/join", { code });
    await post(ada, "/api/company/invite");
    const view = (await (await post(ada, "/api/company/call")).json()).company;
    expect(view.call.at).toBeGreaterThan(now);
    expect(view.call.by).toBe("ada");
    const invites = await database.db
      .select()
      .from(telemetry)
      .where(eq(telemetry.type, "company_invite"));
    expect(invites).toHaveLength(1);
  });

  it("forgets an account erased: out of the company, its messages gone", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    const { code } = await found(ada);
    await post(bob, "/api/company/join", { code });
    await post(bob, "/api/company/messages", { body: "Bonjour" });
    const res = await app.inject({
      method: "DELETE",
      url: "/api/me",
      headers: { cookie: bob },
      payload: { confirm: "SUPPRIMER" },
    });
    expect(res.statusCode).toBe(204);
    const view = (await get(ada, "/api/company")).company;
    expect(view.members).toHaveLength(1);
    expect((await get(ada, "/api/company/messages")).messages).toHaveLength(0);
  });
});
