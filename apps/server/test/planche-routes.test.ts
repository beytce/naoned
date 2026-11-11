import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts } from "../src/db/schema.js";
import { plancheTheme } from "../src/game/planche.js";
import { PlancheLagoons } from "../src/game/plancheLagoons.js";
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
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
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
  return (method: "GET" | "POST", url: string, payload?: unknown) =>
    app.inject({ method, url, payload: payload as never, headers: { cookie } });
}

// The shared board on line (docs/plan-planche.md L5), through its routes, by two players with an account.
describe("the board on line", () => {
  it("seats two players in two houses of one board, and shows each the other's thread", async () => {
    const ana = await player("ana@example.org");
    const ben = await player("ben@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    const b = (await ben("GET", "/api/planche")).json().planche;
    expect(a.me).toBeTruthy();
    expect(b.me).toBeTruthy();
    expect(a.me).not.toBe(b.me);
    expect(b.players).toEqual(expect.arrayContaining([a.me, b.me]));

    // a sand pit on a free tile of her island, and a thread of sand to the Rialto
    const tiles = a.state.houses[a.me].ile.tiles;
    const free = Object.keys(tiles).find((k) => !tiles[k].building) as string;
    expect(
      (await ana("POST", "/api/planche/ile/build", { type: "sand_pit", at: free })).statusCode,
    ).toBe(200);
    const tied = await ana("POST", "/api/planche/thread", { city: "rialto", good: "sand" });
    expect(tied.statusCode).toBe(200);
    const seen = (await ben("GET", "/api/planche")).json().planche;
    expect(seen.state.houses[a.me].threads.map((t: { to: string }) => t.to)).toEqual(["rialto"]);
    // the amounts come as strings of digits (deniers), never as floats
    expect(seen.state.houses[a.me].ducats).toMatch(/^\d+$/);

    now += 3 * 3_600_000;
    const later = (await ana("GET", "/api/planche")).json().planche;
    expect(later.state.houses[a.me].delivered).toBeGreaterThan(0);
    expect(later.ok).toBe(true);
  });

  it("builds the player's island: a workshop paid from the purse, seen by the other", async () => {
    const ana = await player("ana@example.org");
    const ben = await player("ben@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    const before = BigInt(a.state.houses[a.me].ducats);
    const tiles = a.state.houses[a.me].ile.tiles;
    const free = Object.keys(tiles).find((k) => !tiles[k].building) as string;
    const built = await ana("POST", "/api/planche/ile/build", { type: "sand_pit", at: free });
    expect(built.statusCode).toBe(200);
    const after = built.json().planche.state.houses[a.me];
    expect(after.ile.tiles[free].building.type).toBe("sand_pit");
    expect(BigInt(after.ducats)).toBeLessThan(before);
    const seen = (await ben("GET", "/api/planche")).json().planche;
    expect(seen.state.houses[a.me].ile.tiles[free].building.type).toBe("sand_pit");
    // a tile that touches the island, bought; a malformed tile, refused
    expect((await ana("POST", "/api/planche/ile/buy", { at: "2,0" })).statusCode).toBe(200);
    expect((await ana("POST", "/api/planche/ile/buy", { at: "nope" })).statusCode).toBe(400);
    expect(
      (await ana("POST", "/api/planche/ile/build", { type: "__proto__", at: "1,1" })).json().error,
    ).toBe("ile_unknown");
  });

  it("refuses what the board refuses, with a code", async () => {
    const ana = await player("ana@example.org");
    expect(
      (await ana("POST", "/api/planche/thread", { city: "raguse", good: "glass" })).json().error,
    ).toBe("planche_route_shut");
    expect(
      (await ana("POST", "/api/planche/thread", { city: "__proto__", good: "glass" })).statusCode,
    ).toBe(404);
    expect((await ana("POST", "/api/planche/thread", { city: 3 })).statusCode).toBe(400);
    expect(
      (await ana("POST", "/api/planche/force", { passage: "segna", moves: [{ at: 24 }] })).json()
        .error,
    ).toBe("duel_lost");
  });
});

// The account and the house kept for good (docs/plan-compte.md C3).
describe("the board for accounts", () => {
  it("refuses whoever has no account", async () => {
    const res = await app.inject({ method: "GET", url: "/api/planche" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("not_signed_in");
    const tie = await app.inject({
      method: "POST",
      url: "/api/planche/thread",
      payload: { city: "rialto", good: "sand" },
    });
    expect(tie.statusCode).toBe(401);
  });

  it("gives an account one house, named after it, and the same one every time", async () => {
    const ana = await player("ana@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    expect(a.me).toBeTruthy();
    expect(a.names[a.me]).toMatch(/^Ca’ /);
    expect(a.lagoon).toBe("Lagune de Murano");
    now += 10 * 86_400_000;
    const again = (await ana("GET", "/api/planche")).json().planche;
    expect(again.me).toBe(a.me);
  });

  it("opens a second lagoon when the first one is full", async () => {
    const seen: { me: string; lagoon: string }[] = [];
    for (let k = 0; k < 9; k++) {
      const p = await player(`p${k}@example.org`);
      seen.push((await p("GET", "/api/planche")).json().planche);
    }
    const first = seen.slice(0, 8);
    expect(new Set(first.map((v) => v.me)).size).toBe(8);
    expect(first.every((v) => v.lagoon === "Lagune de Murano")).toBe(true);
    expect(seen[8]?.lagoon).toBe("Lagune de Burano");
  });

  it("finds an account's house again after a restart", async () => {
    const ana = await player("ana@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    await ana("POST", "/api/planche/thread", { city: "rialto", good: "sand" });
    // A second server on the same base: it takes every board over and plays its journal again.
    const lagoons = await PlancheLagoons.open(database.db, plancheTheme(), now);
    const [row] = await database.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, "ana@example.org"));
    const { store, house } = await lagoons.seatOf(row?.id ?? "", "Ca’ ana", now);
    expect(house).toBe(a.me);
    const v = await store.hub.view("x", "x", now);
    expect(v.state.houses[a.me]?.threads.map((t) => t.to)).toEqual(["rialto"]);
  });
});
