import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

/** The Letter of the day on the server (R10, docs/plan-rupture.md): the view and the answer. */

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
  now = Date.parse("2026-10-12T08:00:00Z");
  world = await GameWorld.open(database.db, () => now);
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
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
  return { cookie, id: res.json().account.id as string };
}
const get = (cookie: string) =>
  app.inject({ method: "GET", url: "/api/game", headers: { cookie } });
const act = (cookie: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload });

describe("the Letter of the day on the server", () => {
  it("shows today's letter with its two answers, and takes one, once", async () => {
    const { cookie } = await login("ada@example.org");
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie },
      payload: { region: "lagoon" },
    });
    const v = (await get(cookie)).json().view;
    expect(v.letter.answered).toBeNull();
    expect(v.letter.choices).toHaveLength(2);
    const choice = v.letter.choices.find((c: { can: boolean }) => c.can);
    const cash = BigInt(v.cash);
    const res = await act(cookie, { type: "answerLetter", choice: choice.id });
    expect(res.json().error).toBeUndefined();
    const after = (await get(cookie)).json().view;
    expect(after.letter.answered).toBe(choice.id);
    expect(BigInt(after.cash)).toBe(cash - BigInt(choice.pay.ducats) + BigInt(choice.gain.ducats));
    const again = await act(cookie, { type: "answerLetter", choice: choice.id });
    expect(again.json().error).toBe("letter_answered");
  });
});
