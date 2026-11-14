import { venice1450Planche } from "@comptoirs/engine";
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
  return Object.assign(
    (method: "GET" | "POST", url: string, payload?: unknown) =>
      app.inject({ method, url, payload: payload as never, headers: { cookie } }),
    { cookie },
  );
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

  it("keeps the detour to the open sea for the Casa (docs/plan-economie.md C1)", async () => {
    const ana = await player("ana@example.org");
    // Raguse is beyond the mouth and the strait of Cannaregio, both the corsairs'.
    expect(
      (await ana("POST", "/api/planche/thread", { city: "raguse", good: "glass" })).json().error,
    ).toBe("planche_route_shut");
    // A new house is at level 1: the detour opens at level 6 (the engine's tests take it there).
    expect(
      (
        await ana("POST", "/api/planche/thread", { city: "raguse", good: "glass", detour: true })
      ).json().error,
    ).toBe("planche_detour_level");
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
    // A duel against the computer, played piece by piece by the server (docs/plan-duels.md B1).
    const begun = (
      await ana("POST", "/api/planche/duel/start", { kind: "force", passage: "canal-1" })
    ).json().duel;
    expect(begun).toMatchObject({ kind: "force", target: "canal-1", side: 1, over: false });
    expect((await ana("GET", "/api/planche/duel")).json().duel.target).toBe("canal-1");
    expect(
      (await ana("POST", "/api/planche/duel/start", { kind: "force", passage: "canal-1" })).json()
        .duel.target,
    ).toBe("canal-1");
    expect((await ana("POST", "/api/planche/duel/play", { at: 9_999 })).statusCode).toBe(400);
    expect((await ana("POST", "/api/planche/duel/quit", {})).json().duel).toMatchObject({
      over: true,
      won: false,
    });
    expect((await ana("GET", "/api/planche/duel")).json().duel).toBeNull();
    // The try was spent when the duel began.
    expect(
      (await ana("POST", "/api/planche/duel/start", { kind: "force", passage: "canal-1" })).json()
        .error,
    ).toBe("planche_force_tried");
    expect((await ana("POST", "/api/planche/duel/start", { kind: "nope" })).statusCode).toBe(400);
    // The edges (docs/plan-socle.md A4): an inherited key as a good, a JSON that does not parse.
    expect(
      (await ana("POST", "/api/planche/thread", { city: "rialto", good: "toString" })).statusCode,
    ).toBe(400);
    expect(
      (await ana("POST", "/api/planche/compagnie/phare", { goods: { constructor: 30 } }))
        .statusCode,
    ).toBe(400);
    const broken = await app.inject({
      method: "POST",
      url: "/api/planche/thread",
      payload: "{broken",
      headers: { cookie: ana.cookie, "content-type": "application/json" },
    });
    expect(broken.statusCode).toBe(400);
  });
});

// The account and the house kept for good (docs/plan-compte.md C3).
describe("the board for accounts", () => {
  it("sends the board compressed to whoever accepts it", async () => {
    const ana = await player("ana@example.org");
    await ana("GET", "/api/planche");
    const res = await app.inject({
      method: "GET",
      url: "/api/planche",
      headers: {
        cookie: ana.cookie,
        "accept-encoding": "gzip",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.rawPayload.length).toBeLessThan(20_000);
  });

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
    // A board of 8 here, not to sign 49 accounts in: the rule is the same for a lagoon of 48.
    await app.close();
    const small = await PlancheLagoons.open(
      database.db,
      { ...plancheTheme(), board: venice1450Planche },
      now,
    );
    app = await buildApp({
      db: database.db,
      mailer,
      appUrl: "https://comptoirs.test",
      production: false,
      world: await GameWorld.open(database.db, () => now, { empire: true }),
      now: () => new Date(now),
      planche: small,
    });
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

// The house's growth on line (docs/plan-progression-maison.md M3).
describe("the house's growth", () => {
  it("gives a week's Prestige, the level it reaches, and tells it in the Livre of the account", async () => {
    await app.close();
    const lagoons = await PlancheLagoons.open(database.db, plancheTheme(), now);
    app = await buildApp({
      db: database.db,
      mailer,
      appUrl: "https://comptoirs.test",
      production: false,
      world: await GameWorld.open(database.db, () => now, { empire: true }),
      now: () => new Date(now),
      planche: lagoons,
    });
    const ana = await player("ana@example.org");
    const a = (await ana("GET", "/api/planche")).json().planche;
    const tiles = a.state.houses[a.me].ile.tiles;
    const free = Object.keys(tiles).find((k) => !tiles[k].building) as string;
    expect(
      (await ana("POST", "/api/planche/ile/build", { type: "sand_pit", at: free })).statusCode,
    ).toBe(200);
    expect(
      (await ana("POST", "/api/planche/thread", { city: "rialto", good: "sand" })).statusCode,
    ).toBe(200);
    const before = (await ana("GET", "/api/maison")).json().maison;
    expect(before).toMatchObject({ level: 1, title: "Bottega", prestige: 0 });
    expect(before.caps.bobbins).toBe(3);
    expect(before.opens[0]).toMatchObject({ level: 2, bobbins: 4 });
    // A week goes by: its trade and its place give Prestige; the Livre is written at the snapshot.
    now += 8 * 86_400_000;
    await ana("GET", "/api/planche");
    await lagoons.snapshot();
    const after = (await ana("GET", "/api/maison")).json().maison;
    expect(after.prestige).toBeGreaterThan(0);
    expect(after.level).toBeGreaterThan(1);
    // The journal of points keeps the weeks closed; the Prestige counts the week under way too
    // (docs/plan-economie.md C2).
    expect(after.kept).toBeGreaterThan(0);
    expect(after.kept).toBeLessThanOrEqual(after.prestige);
    expect(after.livre.some((e: { kind: string }) => e.kind === "level")).toBe(true);
    expect(after.collection.level).toBeGreaterThan(0);
  });
});
