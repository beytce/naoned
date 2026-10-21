import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { notifications, skirmishMatches, telemetry } from "../src/db/schema.js";
import { retention } from "../src/game/admin.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { pushText } from "../src/notify/texts.js";
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

/** Opens the world and the app, as a start of the server does. */
async function open() {
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
}

beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry, notifications cascade`,
  );
  mailer = new MemoryMailer();
  // 10 h in Paris.
  now = Date.parse("2026-10-05T08:00:00Z");
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string) {
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
    payload: { region: "terraferma" },
  });
  return cookie;
}

const get = async (cookie: string, url: string) =>
  (await app.inject({ method: "GET", url, headers: { cookie } })).json();
const join = (cookie: string) =>
  app.inject({ method: "POST", url: "/api/game/skirmish/join", headers: { cookie } });

/** Sets the merchant down on the first land cell the rules accept. */
async function place(cookie: string) {
  const { terra } = await get(cookie, "/api/game/terra");
  const { width } = terra.map;
  const cells = (terra.map.terrain as string)
    .split("")
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t !== "w" && terra.owner[i] === -1 && i % width > width / 3);
  for (const { i } of cells) {
    const res = await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie },
      payload: { type: "terraPlace", cell: i },
    });
    if (!res.json().error) return i;
  }
  throw new Error("nowhere to set down");
}

/** Two merchants set down on the week's map, their ids. */
async function two() {
  const ada = await player("ada@example.org");
  const bob = await player("bob@example.org");
  await world.execute({ type: "tick" });
  await place(ada);
  await place(bob);
  const ids = [
    (await get(ada, "/api/me")).account.id as string,
    (await get(bob, "/api/me")).account.id as string,
  ];
  return { ada, bob, ids };
}

const glory = async (cookie: string) =>
  (await get(cookie, "/api/game/terra")).terra.me.glory as number;
const rows = () => database.db.select().from(skirmishMatches);
const paidLines = (matchId: string) =>
  database.db
    .select()
    .from(telemetry)
    .where(
      and(eq(telemetry.type, "terra_skirmish"), sql`${telemetry.props}->>'matchId' = ${matchId}`),
    );

describe("a skirmish's row", () => {
  it("follows the match from its lobby to its payment, every merchant paid at once", async () => {
    await open();
    const { ada, bob, ids } = await two();
    expect((await join(ada)).statusCode).toBe(200);
    expect((await join(bob)).statusCode).toBe(200);
    await get(ada, "/api/game/skirmish");
    const [lobby] = await rows();
    expect(lobby?.status).toBe("open");
    expect(lobby?.players).toEqual(ids);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    expect((await rows())[0]?.status).toBe("playing");
    expect((await rows())[0]?.ranked).toBe(true);
    now += 16 * 60_000;
    const done = await get(ada, "/api/game/skirmish");
    expect(done.phase).toBe("done");
    const [row] = await rows();
    expect(row?.status).toBe("paid");
    // One line of glory per merchant, both from the match's one command.
    const lines = await paidLines(row?.id ?? "");
    expect(lines.map((l) => l.accountId).sort()).toEqual([...ids].sort());
    expect(done.rankedLeft).toBe(0);
    expect((await get(bob, "/api/game/skirmish")).rankedLeft).toBe(0);
  });

  it("refuses to pay a match twice", async () => {
    await open();
    const { ada, bob, ids } = await two();
    await join(ada);
    await join(bob);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    await get(ada, "/api/game/skirmish");
    const [row] = await rows();
    const id = row?.id ?? "";
    const before = await glory(ada);
    // The next day, the same match again: refused, whatever its ranks.
    now += 24 * 3_600_000;
    const again = await world.execute({
      type: "terraSkirmishPay",
      matchId: id,
      ranks: ids.map((playerId) => ({ playerId, glory: 45 })),
    });
    expect(again).toEqual({ ok: false, error: "already_paid" });
    expect(await glory(ada)).toBe(before);
    expect((await paidLines(id)).length).toBe(2);
    expect((await get(ada, "/api/game/skirmish")).rankedLeft).toBe(1);
  });

  it("pays every merchant of the match or none of them", async () => {
    await open();
    const { ada, ids } = await two();
    const matchId = "00000000-0000-4000-8000-000000000001";
    // Refused as a whole (one merchant short of the two a ranked match needs): no one paid.
    const alone = await world.execute({
      type: "terraSkirmishPay",
      matchId,
      ranks: [{ playerId: ids[0] ?? "", glory: 45 }],
    });
    expect(alone).toEqual({ ok: false, error: "too_few_humans" });
    expect((await paidLines(matchId)).length).toBe(0);
    expect((await get(ada, "/api/game/skirmish")).rankedLeft).toBe(1);
  });

  it("aborts a match cut short by a restart: no glory, the quota untouched, its merchants told", async () => {
    await open();
    const { ada, bob } = await two();
    await join(ada);
    await join(bob);
    now += 61_000;
    expect((await get(ada, "/api/game/skirmish")).phase).toBe("playing");
    const before = await glory(ada);
    // The server falls in the middle of the match, and starts again.
    now += 5 * 60_000;
    await world.snapshot();
    await app.close();
    await open();
    const [row] = await rows();
    expect(row?.status).toBe("aborted");
    // Long after the match would have ended: nothing paid, nothing spent.
    now += 20 * 60_000;
    const after = await get(ada, "/api/game/skirmish");
    expect(after.phase).toBe("none");
    expect(after.interrupted).toBe(true);
    expect(after.rankedLeft).toBe(1);
    expect(after.ranked).toBe(true);
    // Its ranked match still to play today, on the week's map.
    expect(after.rankedLater && after.onMap).toBe(true);
    expect(await glory(ada)).toBe(before);
    expect((await paidLines(row?.id ?? "")).length).toBe(0);
    const told = await database.db
      .select()
      .from(notifications)
      .where(sql`${notifications.data}->>'event' = 'skirmish_aborted'`);
    expect(told.length).toBe(2);
    expect(told.every((n) => n.kind === "family" && n.data.ranked === true)).toBe(true);
    // The notice promises nothing (the bell keeps it): no word of a ranked match still to play.
    expect(told.every((n) => !("rankedLater" in n.data) && !("rankedUntil" in n.data))).toBe(true);
    // A new match: the interruption is told no more, and the ranked match is still to play.
    expect((await join(ada)).statusCode).toBe(200);
    const lobby = await get(ada, "/api/game/skirmish");
    expect(lobby.interrupted).toBe(false);
    expect((await get(bob, "/api/game/skirmish")).interrupted).toBe(true);
    // The admin's dashboard: one match lost this week, no glory paid for it, none paid twice.
    const { skirmishMatches: m } = await retention(database.db, world.id, now);
    expect(m.weeks).toEqual([{ week: "2026-10-05", paid: 0, done: 0, aborted: 1 }]);
    expect(m.duplicates).toBe(0);
    expect(m.abortedPaid).toBe(0);
  });

  it("tells an interruption in the past, still true once the ranked match is played", async () => {
    await open();
    const { ada, bob } = await two();
    await join(ada);
    await join(bob);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    // 10 h 06: a deployment cuts the match short.
    now += 5 * 60_000;
    await world.snapshot();
    await app.close();
    await open();
    // 10 h 30: a new ranked match, played to its end and paid.
    now = Date.parse("2026-10-05T08:30:00Z");
    await join(ada);
    await join(bob);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    const played = await get(ada, "/api/game/skirmish");
    expect(played.phase).toBe("done");
    expect(played.rankedLeft).toBe(0);
    // 11 h: the notice still says what is true, and the push the same words.
    now = Date.parse("2026-10-05T09:00:00Z");
    const told = await database.db
      .select()
      .from(notifications)
      .where(sql`${notifications.data}->>'event' = 'skirmish_aborted'`);
    expect(told.length).toBe(2);
    for (const n of told) {
      const push = pushText(n.kind, n.data);
      expect(push.body).toBe(
        "Escarmouche interrompue par une maintenance : aucune Gloire, rien n'est compté ; elle n'a pas consommé votre partie classée du jour.",
      );
      expect(push.body).not.toContain("reste à jouer");
    }
  });

  it("promises no ranked match after the closing hour, and tells of the match that day only", async () => {
    // 21 h 35 in Paris: a ranked match, ending before 22 h.
    now = Date.parse("2026-10-05T19:35:00Z");
    await open();
    const { ada, bob } = await two();
    await join(ada);
    await join(bob);
    now += 61_000;
    const playing = await get(ada, "/api/game/skirmish");
    expect(playing.phase).toBe("playing");
    expect(playing.ranked).toBe(true);
    const before = await glory(ada);
    // A deployment at 21 h 50: a match launched now would end past 22 h, friendly.
    now = Date.parse("2026-10-05T19:50:00Z");
    await world.snapshot();
    await app.close();
    await open();
    const cut = await get(ada, "/api/game/skirmish");
    expect(cut.interrupted).toBe(true);
    expect(cut.rankedLeft).toBe(1);
    expect(cut.rankedLater && cut.onMap).toBe(false);
    const told = await database.db
      .select()
      .from(notifications)
      .where(sql`${notifications.data}->>'event' = 'skirmish_aborted'`);
    expect(told.length).toBe(2);
    // 22 h 10: night, the interruption still told, no promise.
    now = Date.parse("2026-10-05T20:10:00Z");
    const night = await get(ada, "/api/game/skirmish");
    expect(night.phase).toBe("night");
    expect(night.interrupted).toBe(true);
    expect(night.rankedLater && night.onMap).toBe(false);
    expect(await glory(ada)).toBe(before);
    // The next morning, 8 h 30: another day, the interruption told no more (after a restart too).
    now = Date.parse("2026-10-06T06:30:00Z");
    expect((await get(ada, "/api/game/skirmish")).interrupted).toBe(false);
    await app.close();
    await open();
    expect((await get(bob, "/api/game/skirmish")).interrupted).toBe(false);
  });

  it("settles a friendly match, or a ranked one paying no one, as done, never paid", async () => {
    await open();
    const { ada, bob, ids } = await two();
    // Alone: friendly.
    await join(ada);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    expect((await get(ada, "/api/game/skirmish")).phase).toBe("done");
    expect((await rows())[0]?.status).toBe("done");
    expect((await rows())[0]?.ranked).toBe(false);
    // Together: ranked and paid, each spending its ranked match of the day.
    now += 4 * 60_000;
    await join(ada);
    await join(bob);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    await get(ada, "/api/game/skirmish");
    const before = { ada: await glory(ada), bob: await glory(bob) };
    // Again together: ranked by the hour, but both have played their ranked match: no one paid.
    now += 4 * 60_000;
    await join(ada);
    await join(bob);
    now += 61_000;
    await get(ada, "/api/game/skirmish");
    now += 16 * 60_000;
    const last = await get(ada, "/api/game/skirmish");
    expect(last.phase).toBe("done");
    expect(last.ranked).toBe(false);
    expect(last.why).toBe("quota");
    expect(await glory(ada)).toBe(before.ada);
    expect(await glory(bob)).toBe(before.bob);
    const all = await rows();
    const byStatus = (st: string) => all.filter((r) => r.status === st);
    expect(byStatus("paid").length).toBe(1);
    expect(byStatus("done").length).toBe(2);
    const [unpaid] = byStatus("done").filter((r) => r.ranked);
    expect(unpaid).toBeDefined();
    expect((await paidLines(unpaid?.id ?? "")).length).toBe(0);
    expect((await paidLines(byStatus("paid")[0]?.id ?? "")).map((l) => l.accountId).sort()).toEqual(
      [...ids].sort(),
    );
    // The admin's dashboard: one paid, two without glory.
    const { skirmishMatches: m } = await retention(database.db, world.id, now);
    expect(m.weeks).toEqual([{ week: "2026-10-05", paid: 1, done: 2, aborted: 0 }]);
  });

  it("aborts a lobby cut short by a restart too", async () => {
    await open();
    const { ada } = await two();
    await join(ada);
    await get(ada, "/api/game/skirmish");
    await app.close();
    await open();
    expect((await rows())[0]?.status).toBe("aborted");
    expect((await get(ada, "/api/game/skirmish")).interrupted).toBe(true);
  });
});
