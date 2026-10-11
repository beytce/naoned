import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { notifications } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { Notifier } from "../src/notify/notifier.js";
import { MemoryPusher } from "../src/notify/push.js";
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
  now = Date.parse("2026-10-12T08:00:00Z");
  world = await GameWorld.open(database.db, () => now);
  const notifier = new Notifier(database.db, world, new MemoryPusher());
  world.onEffects((fx, at) => void notifier.fromEffects(fx, at));
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://comptoirs.test",
    production: false,
    world,
    notifier,
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function player(email: string, pseudo: string) {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = `${SESSION_COOKIE}=${res.cookies.find((c) => c.name === SESSION_COOKIE)?.value}`;
  await app.inject({ method: "PATCH", url: "/api/me", headers: { cookie }, payload: { pseudo } });
  await app.inject({
    method: "POST",
    url: "/api/game/join",
    headers: { cookie },
    payload: { region: "lagoon" },
  });
  return { cookie, id: res.json().account.id as string };
}

const act = async (cookie: string, payload: object) =>
  (
    await app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload })
  ).json();

describe("offers at one's own price", () => {
  it("rest in the book under the seller's name, can be cancelled, and notify when taken", async () => {
    const ada = await player("ada@example.org", "Ada");
    const bob = await player("bob@example.org", "Bob");
    await world.execute({ type: "tick" });

    const posted = await act(ada.cookie, {
      type: "limitOrder",
      resource: "bread",
      side: "sell",
      // Between the Fondaco's bid (1,76 d) and its ask (1,83 d): the offer waits for a buyer.
      price: "180",
      quantity: 8,
    });
    expect(posted.error).toBeUndefined();
    expect(posted.view.openOrders).toHaveLength(1);

    const seen = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: bob.cookie } })
    ).json();
    const best = seen.view.book.bread.asks[0];
    expect(best).toMatchObject({ by: ada.id, price: "180", quantity: 8, mine: false });
    expect(seen.names[ada.id]).toBe("Ada");
    expect(seen.view.book.bread.quota.buy).toBeGreaterThan(0);

    // Bob buys at once: the cheapest offer is Ada's.
    await act(bob.cookie, { type: "instantOrder", resource: "bread", side: "buy", quantity: 5 });
    // The notice is written just after the trade is saved.
    let notes = await database.db.select().from(notifications);
    for (let i = 0; i < 40 && notes.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 50));
      notes = await database.db.select().from(notifications);
    }
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ accountId: ada.id, kind: "order" });
    expect(notes[0]?.data).toMatchObject({ quantity: 5, side: "sell", counterpartyName: "Bob" });

    const orderId = posted.view.openOrders[0].id;
    const cancelled = await act(ada.cookie, { type: "cancelOrder", orderId });
    expect(cancelled.view.openOrders).toEqual([]);
    expect(await world.checkInvariants()).toEqual([]);
  });

  it("refuses a malformed price", async () => {
    const ada = await player("ada@example.org", "Ada");
    const res = await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada.cookie },
      payload: { type: "limitOrder", resource: "bread", side: "sell", price: "1.5", quantity: 1 },
    });
    expect(res.statusCode).toBe(400);
  });
});
