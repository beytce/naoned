import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accountAtouts } from "../src/db/schema.js";
import { recordAtoutUnlocks } from "../src/game/atouts.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

/** The Atouts on the server (R3, docs/plan-rupture.md): the offer, the choice, a feat's unlock. */

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

describe("the Atouts on the server", () => {
  it("offers three Atouts a week and takes one", async () => {
    const { cookie } = await login("ada@example.org");
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie },
      payload: { region: "lagoon" },
    });
    const v = (await get(cookie)).json().view;
    expect(v.atouts.open).toBe(true);
    expect(v.atouts.offer).toHaveLength(3);
    expect(v.atouts.locked.length).toBeGreaterThan(0);
    const res = await act(cookie, { type: "chooseAtout", code: v.atouts.offer[0] });
    expect(res.json().error).toBeUndefined();
    const after = res.json().view.atouts;
    expect(after.held).toEqual([v.atouts.offer[0]]);
    expect(after.open).toBe(false);
  });

  it("keeps a feat's Atout for the account and gives it to the world at the next join", async () => {
    const { cookie, id } = await login("ada@example.org");
    const won = await recordAtoutUnlocks(
      database.db,
      world.id,
      world.ctx.settings,
      [{ type: "incanto_won", playerId: id, data: {} }],
      new Date(now),
    );
    expect(won.map((w) => w.code)).toEqual(["armatore"]);
    const rows = await database.db
      .select()
      .from(accountAtouts)
      .where(eq(accountAtouts.accountId, id));
    expect(rows.map((r) => r.reason)).toEqual(["incanto"]);
    await app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie },
      payload: { region: "lagoon" },
    });
    expect(world.current.players[id]?.atoutPool).toEqual(["armatore"]);
    const v = (await get(cookie)).json().view;
    expect(v.atouts.locked.map((l: { code: string }) => l.code)).not.toContain("armatore");
  });
});
