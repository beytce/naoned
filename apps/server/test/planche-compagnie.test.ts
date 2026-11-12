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
let now: number;
let mailer: MemoryMailer;

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
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry, companies cascade`,
  );
  now = Date.parse("2026-11-16T06:00:00Z");
  const world = await GameWorld.open(database.db, () => now, { empire: true });
  mailer = new MemoryMailer();
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

/** A player with an account: signed in by the link of his mail, then his calls carry his session. */
async function player(email: string) {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
  return Object.assign(
    (method: "GET" | "POST", url: string, payload?: unknown) =>
      app.inject({ method, url, payload: payload as never, headers: { cookie } }),
    { cookie },
  );
}

// The company on the board (docs/plan-compagnie.md K1, K2).
describe("the company on the board", () => {
  it("is founded with a flag, joined by its link, seen on the board, and talks under the old rules", async () => {
    const ana = await player("ana@example.org");
    await ana("GET", "/api/planche");
    expect((await ana("GET", "/api/planche/compagnie")).json().compagnie).toBeNull();
    const bad = await ana("POST", "/api/planche/compagnie", {
      name: "La Tana",
      flag: { color: "vermilion", symbol: "lion" },
    });
    expect(bad.json().error).toBe("invalid_flag");
    const made = (
      await ana("POST", "/api/planche/compagnie", {
        name: "La Tana",
        flag: { color: "emerald", symbol: "anchor" },
      })
    ).json().compagnie;
    expect(made.name).toBe("La Tana");
    expect(made.members).toHaveLength(1);
    expect(made.members[0].role).toBe("doge");
    // Ben, a newcomer, comes by the link: seated in Ana's lagoon, and a member.
    const ben = await player("ben@example.org");
    expect(
      (await ben("GET", `/api/planche/compagnie/invitation/${made.code}`)).json().invitation.name,
    ).toBe("La Tana");
    const joined = (await ben("POST", "/api/planche/compagnie/join", { code: made.code })).json()
      .compagnie;
    expect(joined.members).toHaveLength(2);
    expect(joined.members[1].world).toBe(joined.members[0].world);
    // The board shows the company's flag on both houses.
    const board = (await ana("GET", "/api/planche")).json().planche;
    const flagged = Object.values(board.compagnies as Record<string, { name: string }>);
    expect(flagged.filter((c) => c.name === "La Tana")).toHaveLength(2);
    // The doge names a captain; a member may not.
    const benId = joined.members[1].id;
    expect(
      (
        await ben("POST", "/api/planche/compagnie/role", { member: made.members[0].id, role: null })
      ).json().error,
    ).toBe("not_doge");
    const roled = (
      await ana("POST", "/api/planche/compagnie/role", { member: benId, role: "capitaine" })
    ).json().compagnie;
    expect(roled.members[1].role).toBe("capitaine");
    // The thread: the old game's rules (no link), a message reported.
    expect(
      (
        await ana("POST", "/api/planche/compagnie/messages", { body: "Voyez www.exemple.com" })
      ).json().error,
    ).toBe("message_refused");
    const thread = (
      await ana("POST", "/api/planche/compagnie/messages", { body: "Bienvenue à la Tana !" })
    ).json();
    expect(thread.messages.map((m: { body: string }) => m.body)).toEqual(["Bienvenue à la Tana !"]);
    const seen = (await ben("GET", "/api/planche/compagnie/messages")).json();
    expect(seen.messages[0].mine).toBe(false);
    expect(
      (await ben("POST", "/api/planche/compagnie/report", { message: seen.messages[0].id }))
        .statusCode,
    ).toBe(200);
    // Ben leaves; Ana alone, the doge still.
    const left = await ben("POST", "/api/planche/compagnie/leave");
    expect(left.json().compagnie).toBeNull();
    expect((await ana("GET", "/api/planche/compagnie")).json().compagnie.members).toHaveLength(1);
    expect(
      (await ben("POST", "/api/planche/compagnie/join", { code: made.code })).json().error,
    ).toBe("left_recently");
  });

  it("lays its signs on the board for the week, and greets a neighbour once a day", async () => {
    const ana = await player("ana@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    const made = (
      await ana("POST", "/api/planche/compagnie", {
        name: "Arsenalotti",
        flag: { color: "gold", symbol: "ship" },
      })
    ).json().compagnie;
    const ben = await player("ben@example.org");
    const b = (await ben("POST", "/api/planche/compagnie/join", { code: made.code })).json();
    expect(b.compagnie.members).toHaveLength(2);
    expect(
      (await ana("POST", "/api/planche/sign", { kind: "tour", target: "passage:canal-1" }))
        .statusCode,
    ).toBe(200);
    expect(
      (await ana("POST", "/api/planche/sign", { kind: "tour", target: "passage:canal-3" }))
        .statusCode,
    ).toBe(200);
    expect(
      (await ana("POST", "/api/planche/sign", { kind: "rien", target: "passage:canal-3" })).json()
        .error,
    ).toBe("invalid_sign");
    const seen = (await ben("GET", "/api/planche")).json().planche;
    expect(seen.signs).toEqual([
      expect.objectContaining({ kind: "tour", target: "passage:canal-3", mine: false }),
    ]);
    // A greeting to Ana's house: once a day.
    expect(
      (await ben("POST", "/api/planche/greet", { house: a.me, kind: "salut" })).statusCode,
    ).toBe(200);
    expect(
      (await ben("POST", "/api/planche/greet", { house: a.me, kind: "salut" })).json().error,
    ).toBe("greeted_today");
    const greeted = (await ana("GET", "/api/planche")).json().planche.greeted;
    expect(greeted).toEqual([expect.objectContaining({ kind: "salut" })]);
  });
});
