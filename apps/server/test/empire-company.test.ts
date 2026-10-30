import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, companyMembers, ledgerEntries } from "../src/db/schema.js";
import { CondottaHub } from "../src/game/condotta.js";
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
    settingsOverride: { terraferma: { live: true } },
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
  now = Date.parse("2026-10-26T08:00:00Z");
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

const DAY = 86_400_000;
const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });
const act = (cookie: string, payload: unknown) => post(cookie, "/api/empire/actions", payload);
const view = async (cookie: string) =>
  (await app.inject({ method: "GET", url: "/api/company", headers: { cookie } })).json();

/** A merchant of the empire, joined. */
async function merchant(email: string) {
  const cookie = await login(email);
  await post(cookie, "/api/empire/join");
  return cookie;
}

/** A company founded by the first, joined by the others. */
async function company(...cookies: string[]) {
  const [capo, ...rest] = cookies;
  if (!capo) throw new Error("no founder");
  const founded = await post(capo, "/api/company", { name: "Ca' d'Oro" });
  const code = founded.json().company.code;
  for (const c of rest) expect((await post(c, "/api/company/join", { code })).statusCode).toBe(200);
  return (await view(capo)).company;
}

describe("the empire's company (CADRAGE-v3 § 7)", () => {
  it("makes its founder Capo and takes up to 25 partners", async () => {
    const a = await merchant("ada@example.org");
    const b = await merchant("bea@example.org");
    const c = await company(a, b);
    expect(c.max).toBe(25);
    expect(c.myRole).toBe("capo");
    expect(c.members.map((m: { role: string | null }) => m.role)).toEqual(["capo", null]);
  });

  it("waits three days, not seven, before joining another", async () => {
    const a = await merchant("ada@example.org");
    const b = await merchant("bea@example.org");
    const { code } = await company(a, b);
    await post(b, "/api/company/leave");
    expect((await post(b, "/api/company/join", { code })).json().error).toBe("left_recently");
    now += 3 * DAY + 60_000;
    expect((await post(b, "/api/company/join", { code })).statusCode).toBe(200);
  });

  it("lets the Capo alone name the vocations, four Consiglieri at most", async () => {
    const cookies = [];
    for (const n of ["ada", "bea", "cid", "dan", "eva", "fra"])
      cookies.push(await merchant(`${n}@example.org`));
    const [capo, b] = cookies as [string, string];
    const c = await company(...cookies);
    const ids = c.members.map((m: { id: string }) => m.id);
    const name = (cookie: string, i: number, role: string | null) =>
      post(cookie, "/api/company/role", { member: ids[i], role });
    expect((await name(b, 2, "consigliere")).json().error).toBe("not_capo");
    for (const i of [1, 2, 3, 4]) expect((await name(capo, i, "consigliere")).statusCode).toBe(200);
    expect((await name(capo, 5, "consigliere")).json().error).toBe("roles_full");
    await name(capo, 5, "cassiere");
    await name(capo, 4, "cassiere");
    const roles = (await view(capo)).company.members.map((m: { role: string | null }) => m.role);
    expect(roles).toEqual(["capo", "consigliere", "consigliere", "consigliere", "cassiere", null]);
    // Only the Capo and the Consiglieri call the company.
    const f = cookies[5] as string;
    expect((await post(f, "/api/company/call")).json().error).toBe("not_capo");
  });

  it("hands the place of a Capo absent seven days to the oldest active Consigliere", async () => {
    const a = await merchant("ada@example.org");
    const b = await merchant("bea@example.org");
    const c = await merchant("cid@example.org");
    const co = await company(a, b, c);
    await post(a, "/api/company/role", { member: co.members[2].id, role: "consigliere" });
    now += 7 * DAY + 60_000;
    // The Consigliere acts, the Capo does not.
    await act(c, { type: "empireRelaunchAll" });
    await act(b, { type: "empireRelaunchAll" });
    const after = (await view(b)).company;
    expect(after.members.map((m: { role: string | null }) => m.role)).toEqual([null, null, "capo"]);
    const rows = await database.db.select().from(companyMembers);
    expect(rows.filter((r) => r.role === "capo")).toHaveLength(1);
  });

  it("carries the entraide: a lot asked, supplied by a partner, in the ledger", async () => {
    const a = await merchant("ada@example.org");
    const b = await merchant("bea@example.org");
    await company(a, b);
    // Too new in the company; the client's own company is ignored.
    const early = await act(a, {
      type: "empireAsk",
      good: "clay",
      qty: 5,
      company: { id: "x", since: 0 },
    });
    expect(early.json().error).toBe("too_new");
    now += 3 * DAY + 60_000;
    await act(b, { type: "empireRelaunchAll" });
    now += 3 * 3_600_000;
    await act(b, { type: "empireRelaunchAll" });
    expect(
      (await act(a, { type: "empireAsk", good: "clay", qty: 5 })).json().error,
    ).toBeUndefined();
    const seen = (await act(b, { type: "empireRelaunchAll" })).json();
    const [request] = seen.view.aid.requests;
    expect(request).toMatchObject({ good: "clay", qty: 5 });
    const before = seen.stock.clay;
    const done = (await act(b, { type: "empireSupply", requestId: request.id })).json();
    expect(done.error).toBeUndefined();
    expect(done.stock.clay).toBe(before - 5);
    expect(done.view.aid.merit).toBeGreaterThanOrEqual(0);
    const rows = await database.db.select().from(ledgerEntries).where(sql`reason = 'empire_aid'`);
    expect(rows).toHaveLength(1);
  });

  it("plays the Condotta at the tier its Casa opens, and pays a win a day in Seals", async () => {
    const a = await merchant("ada@example.org");
    const [row] = await database.db.select().from(accounts).where(eq(accounts.pseudo, "ada"));
    const id = row?.id ?? "";
    await database.db.update(accounts).set({ condottaLevel: 5 }).where(eq(accounts.id, id));
    const hub = new CondottaHub(database.db, world);
    const ledger = (await database.db.select().from(ledgerEntries)).length;
    const win = async () => {
      expect(await hub.open(id, false, now)).toBe(true);
      type Inside = {
        matches: Map<
          string,
          {
            c: {
              humans: string[];
              level: number;
              state: { owner: (string | null)[]; map: { land: boolean[] } };
            };
          }
        >;
      };
      const m = [...(hub as unknown as Inside).matches.values()].find((x) =>
        x.c.humans.includes(id),
      );
      if (!m) throw new Error("no match");
      // The Casa 1 opens the first tier only, whatever the level won before.
      expect(m.c.level).toBe(1);
      m.c.state.owner = m.c.state.owner.map((o, i) => (m.c.state.map.land[i] ? id : o));
      now += 9 * 60_000;
      await hub.step(now);
    };
    await win();
    const seals = () => world.current.empire?.houses[id]?.seals ?? 0;
    expect(seals()).toBe(1);
    now += 5 * 60_000;
    await win();
    expect(seals()).toBe(1);
    // Seals, never ducats.
    expect((await database.db.select().from(ledgerEntries)).length).toBe(ledger);
    void a;
  });
});
