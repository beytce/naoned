import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { loginTokens } from "../src/db/schema.js";
import { MemoryMailer } from "../src/mail/mailer.js";
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
const enter = (email: string, code: string) =>
  app.inject({ method: "POST", url: "/api/auth/code", payload: { email, code } });

/** The code of the last mail, as the player reads it: « 482 913 ». */
function lastCode(): string {
  const text = mailer.sent.at(-1)?.text ?? "";
  const match = text.match(/\b(\d{3}) (\d{3})\b/);
  if (!match) throw new Error("no code in mail");
  return `${match[1]}${match[2]}`;
}

function lastToken(): string {
  const text = mailer.sent.at(-1)?.text ?? "";
  const match = text.match(/connexion\?token=([\w%-]+)/);
  if (!match?.[1]) throw new Error("no link in mail");
  return decodeURIComponent(match[1]);
}

const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

describe("the code in the mail", () => {
  it("is in the mail beside the link, and stored only as a hash tied to the token", async () => {
    await request("ada@example.org");
    const code = lastCode();
    expect(mailer.sent[0]?.html).toContain(`${code.slice(0, 3)} ${code.slice(3)}`);
    const [row] = await database.db.select().from(loginTokens);
    expect(row?.codeHash).toBeTruthy();
    expect(row?.codeHash).not.toContain(code);
    expect(row?.attempts).toBe(0);
  });

  it("opens a session like the link, creating the account the first time", async () => {
    await request("Ada@Example.org");
    const res = await enter(" ada@example.org ", lastCode());
    expect(res.statusCode).toBe(200);
    expect(res.json().account).toMatchObject({ email: "ada@example.org" });
    expect(res.cookies.find((c) => c.name === SESSION_COOKIE)?.httpOnly).toBe(true);
  });

  it("accepts spaces in what is typed or pasted", async () => {
    await request("ada@example.org");
    const code = lastCode();
    expect(
      (await enter("ada@example.org", `${code.slice(0, 3)} ${code.slice(3)}`)).statusCode,
    ).toBe(200);
  });

  it("is used up by the link, and the link by the code: the first used wins", async () => {
    await request("ada@example.org");
    const code = lastCode();
    expect((await verify(lastToken())).statusCode).toBe(200);
    expect((await enter("ada@example.org", code)).json()).toEqual({ error: "invalid_code" });

    await request("ada@example.org");
    expect((await enter("ada@example.org", lastCode())).statusCode).toBe(200);
    expect((await verify(lastToken())).statusCode).toBe(400);
  });

  it("is burned at the fifth wrong try: the right code fails after", async () => {
    await request("ada@example.org");
    const code = lastCode();
    for (let i = 0; i < 4; i++)
      expect((await enter("ada@example.org", wrong(code))).json()).toEqual({
        error: "invalid_code",
      });
    // The fifth wrong try burns the token.
    expect((await enter("ada@example.org", wrong(code))).statusCode).toBe(400);
    expect((await enter("ada@example.org", code)).json()).toEqual({ error: "invalid_code" });
    const [row] = await database.db.select().from(loginTokens);
    expect(row?.usedAt).not.toBeNull();
  });

  it("still works after four wrong tries", async () => {
    await request("ada@example.org");
    const code = lastCode();
    for (let i = 0; i < 4; i++) await enter("ada@example.org", wrong(code));
    expect((await enter("ada@example.org", code)).statusCode).toBe(200);
  });

  it("lasts as long as the link", async () => {
    await request("ada@example.org");
    const code = lastCode();
    clock = new Date(clock.getTime() + 16 * 60_000);
    expect((await enter("ada@example.org", code)).json()).toEqual({ error: "invalid_code" });
  });

  it("opens nothing for another address", async () => {
    await request("ada@example.org");
    const code = lastCode();
    await request("bob@example.org");
    expect((await enter("bob@example.org", code)).statusCode).toBe(400);
  });

  it("answers the same for an address that has asked for nothing", async () => {
    const res = await enter("nobody@example.org", "123456");
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "invalid_code" });
  });

  it("refuses what is not six digits", async () => {
    expect((await enter("ada@example.org", "12345")).statusCode).toBe(400);
    expect((await enter("ada@example.org", "abcdef")).statusCode).toBe(400);
  });
});
