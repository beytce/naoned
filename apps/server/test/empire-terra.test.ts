import { carnetWeek, isContesaWeek, terraWeekStart } from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { terraResults } from "../src/db/schema.js";
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

/** A merchant of the empire with planks made: its workshops relaunched through the night. */
async function merchant(email: string) {
  const cookie = await login(email);
  await post(cookie, "/api/empire/join");
  return cookie;
}
async function planks(cookie: string) {
  for (let i = 0; i < 3; i++) {
    await act(cookie, { type: "empireRelaunchAll" });
    now += 4 * HOUR;
  }
  return (await act(cookie, { type: "empireRelaunchAll" })).json().stock.planks ?? 0;
}

describe("the empire's Terraferma on the server", () => {
  it("enters a theatre for its planks, shows its map, and plays a command on it", async () => {
    const a = await merchant("ada@example.org");
    // Nothing made yet: the entry is refused.
    expect((await act(a, { type: "empireTerraJoin" })).json().error).toBe("insufficient_stock");
    expect((await terra(a)).terra).toBeNull();
    expect(await planks(a)).toBeGreaterThanOrEqual(20);
    const joined = (await act(a, { type: "empireTerraJoin", rating: 9_999 })).json();
    expect(joined.error).toBeUndefined();
    expect(joined.view.terra.theatre).toMatchObject({ kind: "open", members: 1 });
    const seen = (await terra(a)).terra;
    expect(seen.theatre.kind).toBe("open");
    expect(seen.view).toBeTruthy();
    // A command on the theatre's map: a bad cell is the map's own refusal.
    const bad = await act(a, { type: "empireTerra", action: { type: "terraPlace", cell: 0 } });
    expect(["not_neutral", "too_close", "neutral_left"]).toContain(bad.json().error);
  });

  it("refuses the Contesa's roster to a partner without a vocation", async () => {
    const a = await merchant("ada@example.org");
    const b = await merchant("bea@example.org");
    const founded = await post(a, "/api/company", { name: "Ca' Foscari" });
    await post(b, "/api/company/join", { code: founded.json().company.code });
    const ids = (
      await (
        await app.inject({ method: "GET", url: "/api/company", headers: { cookie: a } })
      ).json()
    ).company.members.map((m: { id: string }) => m.id);
    expect((await post(b, "/api/empire/contesa/roster", { members: ids })).json().error).toBe(
      "not_capo",
    );
    // The Capo may: the engine then wants 5, 10 or 15.
    expect((await post(a, "/api/empire/contesa/roster", { members: ids })).json().error).toBe(
      "roster_size",
    );
  });

  it("closes the week's theatres: an unplaced merchant is not rated", async () => {
    const a = await merchant("ada@example.org");
    await planks(a);
    await act(a, { type: "empireTerraJoin" });
    now += 7 * DAY;
    await act(a, { type: "empireRelaunchAll" });
    const rows = await database.db.select().from(terraResults);
    expect(rows).toHaveLength(0);
    expect((await terra(a)).terra).toBeNull();
  });
});
