import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, ledgerEntries, telemetry } from "../src/db/schema.js";
import { CondottaHub, condottaGrade } from "../src/game/condotta.js";
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
const MIN = 60_000;

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
  world = await GameWorld.open(database.db, () => now, {
    settingsOverride: { terraferma: { live: true } },
  });
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://fondaco.test",
    production: false,
    world,
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string, region = "terraferma") {
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
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region },
  });
  return { cookie, id: res.json().account.id as string };
}

const get = async (cookie: string) =>
  (await app.inject({ method: "GET", url: "/api/game/condotta", headers: { cookie } })).json();
const post = (cookie: string, url: string, payload: object = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload });

/** The hub's match of a merchant, to set its field by hand (a win needs more than a test plays). */
type Inside = {
  matches: Map<
    string,
    { c: { humans: string[]; state: { owner: (string | null)[]; map: { land: boolean[] } } } }
  >;
};
const matchOf = (hub: CondottaHub, id: string) =>
  [...(hub as unknown as Inside).matches.values()].find((m) => m.c.humans.includes(id));

describe("the Condotta on the server", () => {
  it("starts at once alone, at level 1, and ends lost when nobody plays", async () => {
    const ada = await player("ada@example.org");
    expect((await get(ada.cookie)).phase).toBe("none");
    expect((await post(ada.cookie, "/api/game/condotta/open")).statusCode).toBe(200);
    const playing = await get(ada.cookie);
    expect(playing.phase).toBe("playing");
    expect(playing.playedLevel).toBe(1);
    expect(playing.endsAt - now).toBe(8 * MIN);
    expect(playing.view.holders.some((h: { me: boolean }) => h.me)).toBe(true);
    // A second one while it plays: refused.
    expect((await post(ada.cookie, "/api/game/condotta/open")).json().error).toBe("already_in");
    now += 9 * MIN;
    const done = await get(ada.cookie);
    expect(done.phase).toBe("done");
    expect(done.result.won).toBe(false);
    expect(done.level).toBe(1);
    const played = await database.db
      .select()
      .from(telemetry)
      .where(eq(telemetry.type, "condotta_played"));
    expect(played).toHaveLength(1);
  });

  it("opens the next level on a win, gives a grade and the mission's event, and pays nothing", async () => {
    const ada = await player("ada@example.org");
    const hub = new CondottaHub(database.db, world);
    const ledger = (await database.db.select().from(ledgerEntries)).length;
    const cash = world.current.accounts[`cash:${ada.id}`];
    const glory = world.current.terra?.map.players[ada.id]?.glory ?? 0;
    const events: string[] = [];
    world.onEffects((fx) => events.push(...fx.events.map((e) => `${e.type}:${e.playerId}`)));
    expect(await hub.open(ada.id, false, now)).toBe(true);
    // The whole land Ada's: the city and far more than 35 %.
    const m = matchOf(hub, ada.id);
    if (!m) throw new Error("no match");
    m.c.state.owner = m.c.state.owner.map((o, i) => (m.c.state.map.land[i] ? ada.id : o));
    now += 9 * MIN;
    await hub.step(now);
    const status = await hub.status(ada.id, now);
    if (status.phase !== "done") throw new Error(status.phase);
    expect(status.result?.won).toBe(true);
    expect(status.level).toBe(2);
    expect(status.best).toBe(1);
    expect(status.grade?.name).toBe("Condottiere di ventura");
    expect(events).toContain(`condotta_won:${ada.id}`);
    const [row] = await database.db.select().from(accounts).where(eq(accounts.id, ada.id));
    expect(row?.condottaLevel).toBe(2);
    // No ducats, goods nor Glory.
    expect((await database.db.select().from(ledgerEntries)).length).toBe(ledger);
    expect(world.current.accounts[`cash:${ada.id}`]).toBe(cash);
    expect(world.current.terra?.map.players[ada.id]?.glory ?? 0).toBe(glory);
  });

  it("waits a minute for the company, then plays at the highest level open to all", async () => {
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org", "lagoon");
    const code = (await post(ada.cookie, "/api/company", { name: "Les Amis du Rialto" })).json()
      .company.code;
    await post(bob.cookie, "/api/company/join", { code });
    await database.db.update(accounts).set({ condottaLevel: 5 }).where(eq(accounts.id, ada.id));
    await database.db.update(accounts).set({ condottaLevel: 3 }).where(eq(accounts.id, bob.id));
    expect((await post(ada.cookie, "/api/game/condotta/open", { company: true })).statusCode).toBe(
      200,
    );
    const seen = await get(bob.cookie);
    expect(seen.phase).toBe("lobby");
    expect(seen.joined).toBe(false);
    expect(
      (await post(bob.cookie, "/api/game/condotta/join", { lobby: seen.lobby })).statusCode,
    ).toBe(200);
    now += 61_000;
    const playing = await get(bob.cookie);
    expect(playing.phase).toBe("playing");
    expect(playing.playedLevel).toBe(3);
    expect(playing.players.sort()).toEqual(["ada", "bob"]);
  });

  it("refuses the company's lobby to whoever is not in it, and « with my company » without one", async () => {
    const ada = await player("ada@example.org");
    const eve = await player("eve@example.org");
    expect(
      (await post(eve.cookie, "/api/game/condotta/open", { company: true })).json().error,
    ).toBe("no_company");
    await post(ada.cookie, "/api/company", { name: "Les Amis du Rialto" });
    await post(ada.cookie, "/api/game/condotta/open", { company: true });
    const lobby = (await get(ada.cookie)).lobby;
    expect((await get(eve.cookie)).phase).toBe("none");
    expect((await post(eve.cookie, "/api/game/condotta/join", { lobby })).json().error).toBe(
      "no_company",
    );
  });

  it("names its grades from the best level won", () => {
    expect(condottaGrade(0)).toBeNull();
    expect(condottaGrade(3)?.name).toBe("Condottiere di ventura");
    expect(condottaGrade(8)?.name).toBe("Capitano di ventura");
    expect(condottaGrade(12)?.name).toBe("Capitano generale");
  });
});
