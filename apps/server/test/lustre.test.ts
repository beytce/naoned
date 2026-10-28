import { weekIndex } from "@comptoirs/engine";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, sfide, weekCurves } from "../src/db/schema.js";
import { BotRunner } from "../src/game/bots.js";
import { settleSfide, softResetLustre } from "../src/game/lustre.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

/** The Lustre on the server (R6, docs/plan-rupture.md): Sfide paired, settled, challenged. */

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let now: number;
const DAY = 86_400_000;

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

async function player(email: string, region = "terraferma") {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region },
  });
  return { cookie, id: res.json().account.id as string };
}

const sfida = (cookie: string) =>
  app.inject({ method: "GET", url: "/api/game/sfida", headers: { cookie } });
const lustreOf = async (id: string) =>
  (await database.db.select({ l: accounts.lustre }).from(accounts).where(eq(accounts.id, id)))[0]
    ?.l;

describe("the Lustre", () => {
  it("pairs the week's people, a house of the computer for the one left over", async () => {
    (world.ctx.settings.bots as { population: number }).population = 1;
    await new BotRunner(database.db, world, 3).step();
    const ada = await player("ada@example.org");
    const bea = await player("bea@example.org");
    const cid = await player("cid@example.org");
    await world.execute({ type: "tick" });
    const week = weekIndex(world.ctx, now);
    const rows = await database.db.select().from(sfide).where(eq(sfide.week, week));
    expect(rows).toHaveLength(2);
    const ids = new Set(rows.flatMap((r) => [r.a, r.b]));
    for (const p of [ada, bea, cid]) expect(ids.has(p.id)).toBe(true);
    const house = rows.find((r) => r.b && ![ada.id, bea.id, cid.id].includes(r.b));
    expect(house).toBeDefined();
    const body = (await sfida(ada.cookie)).json();
    expect(body.tier.code).toBe("popolano");
    expect(body.sfida.opponent).not.toBeNull();
    // The game's rival is the Sfida's opponent.
    const game = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada.cookie } })
    ).json();
    expect(game.rival.sfida).toBe(true);
    // Each hour, the curves of the week.
    const curves = await database.db.select().from(weekCurves).where(eq(weekCurves.week, week));
    expect(curves.map((c) => c.accountId).sort()).toEqual([ada.id, bea.id, cid.id].sort());
  });

  it("settles the week: the winner up, the loser down (never below zero), a house never moves", async () => {
    (world.ctx.settings.bots as { population: number }).population = 1;
    await new BotRunner(database.db, world, 3).step();
    const ada = await player("ada@example.org");
    const bea = await player("bea@example.org");
    const cid = await player("cid@example.org");
    await world.execute({ type: "tick" });
    const week = weekIndex(world.ctx, now);
    await database.db.update(accounts).set({ lustre: 100 }).where(eq(accounts.id, bea.id));
    const rows = await database.db.select().from(sfide).where(eq(sfide.week, week));
    const pair = rows.find((r) => r.b && [ada.id, bea.id, cid.id].includes(r.b));
    if (!pair?.b) throw new Error("no pair");
    await settleSfide(
      database.db,
      world.id,
      world.ctx,
      {
        week,
        standings: [
          { playerId: pair.a, gain: "50000" },
          { playerId: pair.b, gain: "10000" },
        ],
      },
      new Date(now),
    );
    const settled = await database.db.select().from(sfide).where(eq(sfide.id, pair.id));
    expect(settled[0]?.deltaA).toBe(30);
    expect(settled[0]?.deltaB).toBe(-20);
    const loserBefore = pair.b === bea.id ? 100 : 0;
    expect(await lustreOf(pair.a)).toBe((pair.a === bea.id ? 100 : 0) + 30);
    expect(await lustreOf(pair.b)).toBe(Math.max(0, loserBefore - 20));
    // The curves are closed: ghosts for the weeks to come.
    const closed = await database.db
      .select()
      .from(weekCurves)
      .where(and(eq(weekCurves.week, week), eq(weekCurves.closed, true)));
    expect(closed.length).toBeGreaterThan(0);
    // The month's change: two tiers down.
    await database.db.update(accounts).set({ lustre: 300 }).where(eq(accounts.id, ada.id));
    await softResetLustre(database.db, world.id, world.ctx);
    expect(await lustreOf(ada.id)).toBe(0);
  });

  it("sends the one left over against a ghost once a curve of a past week exists", async () => {
    const ada = await player("ada@example.org");
    await world.execute({ type: "tick" });
    const week = weekIndex(world.ctx, now);
    await settleSfide(database.db, world.id, world.ctx, { week, standings: [] }, new Date(now));
    now += 7 * DAY;
    const bea = await player("bea@example.org");
    const cid = await player("cid@example.org");
    await world.execute({ type: "tick" });
    const next = await database.db
      .select()
      .from(sfide)
      .where(eq(sfide.week, weekIndex(world.ctx, now)));
    const ghost = next.find((r) => r.ghostAccount);
    expect(ghost?.ghostAccount).toBeDefined();
    expect(ghost?.a).not.toBe(ghost?.ghostAccount);
    expect(
      next
        .flatMap((r) => [r.a, r.b])
        .filter(Boolean)
        .sort(),
    ).toEqual([ada.id, bea.id, cid.id].sort());
    const body = (await sfida(ghost?.a === ada.id ? ada.cookie : bea.cookie)).json();
    if (ghost?.a === ada.id || ghost?.a === bea.id) expect(body.sfida.ghost).not.toBeNull();
  });

  it("pairs a challenge once accepted, the stake on top", async () => {
    const ada = await player("ada@example.org");
    const bea = await player("bea@example.org");
    const cid = await player("cid@example.org");
    await world.execute({ type: "tick" });
    const ask = await app.inject({
      method: "POST",
      url: "/api/game/sfida/challenge",
      headers: { cookie: ada.cookie },
      payload: { to: cid.id, stake: 40 },
    });
    expect(ask.statusCode).toBe(200);
    const twice = await app.inject({
      method: "POST",
      url: "/api/game/sfida/challenge",
      headers: { cookie: ada.cookie },
      payload: { to: bea.id, stake: 10 },
    });
    expect(twice.json().error).toBe("already_asked");
    const got = (await sfida(cid.cookie)).json();
    expect(got.challenges.in).toHaveLength(1);
    const accept = await app.inject({
      method: "POST",
      url: "/api/game/sfida/accept",
      headers: { cookie: cid.cookie },
      payload: { id: got.challenges.in[0].id },
    });
    expect(accept.statusCode).toBe(200);
    now += 7 * DAY;
    await world.execute({ type: "tick" });
    const week = weekIndex(world.ctx, now);
    const rows = await database.db.select().from(sfide).where(eq(sfide.week, week));
    const duel = rows.find((r) => r.kind === "challenge");
    expect(duel?.a).toBe(ada.id);
    expect(duel?.b).toBe(cid.id);
    expect(duel?.stake).toBe(40);
    // Bea is paired apart (a ghost: the closed curves of the week before).
    expect(rows.some((r) => r.a === bea.id || r.b === bea.id)).toBe(true);
  });
});
