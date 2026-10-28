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

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-05T08:00:00Z");
  // The Pass is off in Venice until it comes back: switched on here to test it.
  // Every lie unmasked here, to see the Lustre it costs.
  world = await GameWorld.open(database.db, () => now, {
    settingsOverride: { pass: { enabled: true }, broglio: { forge: { unmaskBps: 10_000 } } },
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

async function player(email: string, given?: string) {
  const cookie = await login(email);
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region: "terraferma", ...(given ? { given } : {}) },
  });
  return cookie;
}

const get = async (cookie: string, url = "/api/game") =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();

/** Rows of a raw query. */
const rowsOf = <T>(res: unknown) => (res as { rows: T[] }).rows;
const idOf = async (email: string) =>
  rowsOf<{ id: string }>(
    await database.db.execute(sql`select id from accounts where email = ${email}`),
  )[0]?.id ?? "";

/** The Broglio on the server (R8, docs/plan-rupture.md): rumours, forgeries, the liar's Lustre. */
describe("the Broglio on the server", () => {
  it("hides tomorrow's event, shows the morning's rumours, forges against Influence", async () => {
    const ada = await player("ada@example.org");
    for (const n of ["bob", "cid", "dan"]) await player(`${n}@example.org`);
    const v = await get(ada);
    expect(v.view.gazette.next).toBeNull();
    expect(v.view.broglio.today).toBe(2);
    const b = await get(ada, "/api/game/broglio");
    expect(b.today).toHaveLength(2);
    expect(b.offers).toEqual([]);

    // Without Influence, no forgery.
    const forge = (subject: Record<string, unknown>) =>
      app.inject({
        method: "POST",
        url: "/api/game/broglio/forge",
        headers: { cookie: ada },
        payload: { subject },
      });
    const event = b.subjects.events[0];
    const day = b.subjects.days[0];
    expect((await forge({ kind: "event", ...event, day })).json().error).toBe(
      "not_enough_influence",
    );
    const adaId = await idOf("ada@example.org");
    await database.db.execute(
      sql`insert into influence_entries (account_id, world_id, source, amount, key, at) values (${adaId}, ${world.id}, 'mission', 100, 'gift', now())`,
    );
    await database.db.execute(sql`update accounts set lustre = 50 where id = ${adaId}`);
    // A subject that turns out true is refused, its Influence given back; a false one goes.
    let forged: Record<string, unknown> | null = null;
    for (const e of b.subjects.events as { code: string; city: string | null }[]) {
      for (const d of b.subjects.days as number[]) {
        if (forged) break;
        const res = await forge({ kind: "event", code: e.code, city: e.city, day: d });
        if (res.json().error === undefined) forged = { ...e, day: d };
        else expect(res.json().error).toBe("rumour_true");
      }
    }
    expect(forged).not.toBeNull();
    const balance = rowsOf<{ n: number }>(
      await database.db.execute(
        sql`select coalesce(sum(amount), 0)::int as n from influence_entries where account_id = ${adaId}`,
      ),
    )[0]?.n;
    expect(balance).toBe(100 - 20);

    // Its day passed and false: unmasked here, Ada loses 15 of Lustre.
    now += (Number(forged?.day) + 2) * 86_400_000;
    await world.execute({ type: "tick" });
    const lustre = rowsOf<{ lustre: number }>(
      await database.db.execute(sql`select lustre from accounts where id = ${adaId}`),
    )[0]?.lustre;
    expect(lustre).toBe(35);
  });
});
