import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { hashToken } from "../src/auth/tokens.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { loginTokens } from "../src/db/schema.js";
import { MailError, MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});

afterAll(async () => {
  await dropDb();
});
let app: FastifyInstance;
let mailer: MemoryMailer;
let clock: Date;

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate accounts, login_tokens, sessions cascade`);
  mailer = new MemoryMailer();
  clock = new Date("2026-10-10T10:00:00Z");
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    now: () => clock,
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

const request = (email: string) =>
  app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
const verify = (token: string) =>
  app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });

function lastToken(): string {
  const text = mailer.sent.at(-1)?.text ?? "";
  const match = text.match(/connexion\?token=([\w%-]+)/);
  if (!match?.[1]) throw new Error("no link in mail");
  return decodeURIComponent(match[1]);
}

function sessionCookie(res: { cookies: { name: string; value: string }[] }): string {
  const c = res.cookies.find((x) => x.name === SESSION_COOKIE);
  if (!c) throw new Error("no session cookie");
  return `${SESSION_COOKIE}=${c.value}`;
}

async function login(email = "Ada@Example.org") {
  await request(email);
  const res = await verify(lastToken());
  return sessionCookie(res);
}

describe("health", () => {
  it("answers with the database up", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("magic link", () => {
  it("sends a link to the normalised address without saying whether it exists", async () => {
    const res = await request("  Ada@Example.org ");
    expect(res.statusCode).toBe(202);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe("ada@example.org");
    expect(mailer.sent[0]?.text).toContain("https://comptoirs.test/connexion?token=");
  });

  it("stores only a hash of the token", async () => {
    await request("ada@example.org");
    const token = lastToken();
    const rows = await database.db.select().from(loginTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(hashToken(token));
    expect(rows[0]?.tokenHash).not.toContain(token);
  });

  it("reports a mail provider failure clearly", async () => {
    mailer.send = async () => {
      throw new MailError("provider down");
    };
    const res = await request("ada@example.org");
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: "mail_unavailable" });
  });

  it("rejects an invalid address", async () => {
    expect((await request("not-an-email")).statusCode).toBe(400);
    expect(mailer.sent).toHaveLength(0);
  });

  it("logs in, creates the account once, and sets an httpOnly session cookie", async () => {
    await request("ada@example.org");
    const res = await verify(lastToken());
    expect(res.statusCode).toBe(200);
    expect(res.json().account).toMatchObject({ email: "ada@example.org", pseudo: null });
    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");

    const firstId = res.json().account.id;
    await request("ada@example.org");
    const again = await verify(lastToken());
    expect(again.json().account.id).toBe(firstId);
  });

  it("accepts a token only once", async () => {
    await request("ada@example.org");
    const token = lastToken();
    expect((await verify(token)).statusCode).toBe(200);
    const reuse = await verify(token);
    expect(reuse.statusCode).toBe(400);
    expect(reuse.json()).toEqual({ error: "invalid_token" });
  });

  it("refuses an expired token", async () => {
    await request("ada@example.org");
    clock = new Date(clock.getTime() + 16 * 60_000);
    expect((await verify(lastToken())).statusCode).toBe(400);
  });

  it("refuses an unknown token", async () => {
    expect((await verify("forged")).statusCode).toBe(400);
  });

  it("limits links per address per hour", async () => {
    for (let i = 0; i < 5; i++) expect((await request("ada@example.org")).statusCode).toBe(202);
    expect((await request("ada@example.org")).statusCode).toBe(429);
    clock = new Date(clock.getTime() + 61 * 60_000);
    expect((await request("ada@example.org")).statusCode).toBe(202);
  });
});

describe("session", () => {
  it("identifies the player, then forgets them after logout", async () => {
    const cookie = await login();
    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().account.email).toBe("ada@example.org");

    expect(
      (await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie } }))
        .statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: "GET", url: "/api/me", headers: { cookie } })).statusCode,
    ).toBe(401);
  });

  it("expires after 30 days", async () => {
    const cookie = await login();
    clock = new Date(clock.getTime() + 31 * 86_400_000);
    expect(
      (await app.inject({ method: "GET", url: "/api/me", headers: { cookie } })).statusCode,
    ).toBe(401);
  });

  it("rejects requests without a session", async () => {
    expect((await app.inject({ method: "GET", url: "/api/me" })).statusCode).toBe(401);
  });
});

describe("pseudo", () => {
  const setPseudo = (cookie: string, pseudo: string) =>
    app.inject({ method: "PATCH", url: "/api/me", headers: { cookie }, payload: { pseudo } });

  it("is set once valid and unique, case-insensitively", async () => {
    const ada = await login("ada@example.org");
    const res = await setPseudo(ada, "Doge_Ada");
    expect(res.statusCode).toBe(200);
    expect(res.json().account.pseudo).toBe("Doge_Ada");

    const bob = await login("bob@example.org");
    expect((await setPseudo(bob, "doge_ada")).statusCode).toBe(409);
    expect((await setPseudo(bob, "x")).statusCode).toBe(400);
    expect((await setPseudo(bob, "Marchand de Venise")).statusCode).toBe(400);
    expect((await setPseudo(bob, "Bérénice")).statusCode).toBe(200);
  });
});
