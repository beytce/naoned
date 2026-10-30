import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { companyMembers } from "../src/db/schema.js";
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
  world = await GameWorld.open(database.db, () => now, { empire: true });
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
});
