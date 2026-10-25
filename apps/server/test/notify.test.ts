import { seasonActs } from "@comptoirs/engine";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import {
  accounts,
  notifications,
  players,
  pushSubscriptions,
  weeklyResults,
} from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { NOTIFICATION_KINDS, Notifier } from "../src/notify/notifier.js";
import { MemoryPusher } from "../src/notify/push.js";
import { testDatabase } from "./db.js";
import { smallOrders } from "./road.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let pusher: MemoryPusher;
let notifier: Notifier;
let now: number;
const MIN = 60_000;
const HOUR = 60 * MIN;

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
  // 10:00 in Paris.
  now = Date.parse("2026-10-12T08:00:00Z");
  world = await GameWorld.open(database.db, () => now);
  pusher = new MemoryPusher();
  notifier = new Notifier(database.db, world, pusher);
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

const subscribe = (cookie: string, endpoint = "https://fcm.googleapis.com/fcm/send/1") =>
  app.inject({
    method: "POST",
    url: "/api/notifications/push/subscribe",
    headers: { cookie },
    payload: { endpoint, keys: { p256dh: "key", auth: "secret" } },
  });

/** Starts a full batch on the player's raw building; returns when it ends. */
async function produce(id: string): Promise<number> {
  const farm = Object.values(world.current.buildings).find(
    (b) => b.playerId === id && b.type === "farm",
  );
  if (!farm) throw new Error("no farm");
  await world.execute({
    type: "startProduction",
    playerId: id,
    buildingId: farm.id,
    recipe: "grow_wheat",
    batches: 1,
  });
  const job = world.current.buildings[farm.id]?.job;
  if (!job) throw new Error("no job");
  return job.startedAt + job.batches * job.batchMs;
}

describe("notifications", () => {
  it("rings the bell and pushes when a harvest is ready", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    const end = await produce(ada.id);
    now = end + MIN;
    await notifier.scan();

    const bell = (
      await app.inject({
        method: "GET",
        url: "/api/notifications",
        headers: { cookie: ada.cookie },
      })
    ).json();
    expect(bell.unread).toBe(1);
    expect(bell.items[0].kind).toBe("harvest");
    expect(pusher.sent).toHaveLength(1);
    expect(pusher.sent[0]?.payload.title).toBe("Récolte prête");

    const game = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada.cookie } })
    ).json();
    expect(game.unread).toBe(1);
    await app.inject({
      method: "POST",
      url: "/api/notifications/read",
      headers: { cookie: ada.cookie },
    });
    const after = (
      await app.inject({
        method: "GET",
        url: "/api/notifications",
        headers: { cookie: ada.cookie },
      })
    ).json();
    expect(after.unread).toBe(0);
    expect(after.items[0].read).toBe(true);
  });

  it("stays quiet at night, keeps to one push per kind and hour, and respects choices", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    const send = (kind: "harvest" | "delivery") =>
      notifier.send([{ accountId: ada.id, kind, data: {} }], now);

    await send("harvest");
    await send("harvest");
    expect(pusher.sent).toHaveLength(1);

    await app.inject({
      method: "PATCH",
      url: "/api/notifications/push",
      headers: { cookie: ada.cookie },
      payload: { off: ["delivery"] },
    });
    await send("delivery");
    expect(pusher.sent).toHaveLength(1);

    // 23:30 in Paris.
    now = Date.parse("2026-10-12T21:30:00Z");
    await send("harvest");
    expect(pusher.sent).toHaveLength(1);
    const bell = (
      await app.inject({
        method: "GET",
        url: "/api/notifications",
        headers: { cookie: ada.cookie },
      })
    ).json();
    expect(bell.unread).toBe(4);
  });

  it("pushes three a day at most, whatever the kinds, an attack always", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    // Every kind once, an hour apart from the last of its kind: only three go out.
    for (const kind of NOTIFICATION_KINDS) {
      await notifier.send([{ accountId: ada.id, kind, data: { at: now, arriveAt: now } }], now);
      now += MIN;
    }
    const pushed = () => pusher.sent.filter((p) => p.payload.kind !== "siege").length;
    expect(pushed()).toBe(3);
    // An attack is pushed past the cap: the merchant has minutes.
    const before = pusher.sent.length;
    await notifier.send(
      [{ accountId: ada.id, kind: "siege", data: { at: now, arriveAt: now } }],
      now,
    );
    expect(pusher.sent.length).toBe(before + 1);
    // The next day (Paris), three again.
    now = Date.parse("2026-10-13T08:00:00Z");
    await notifier.send([{ accountId: ada.id, kind: "harvest", data: {} }], now);
    expect(pushed()).toBe(4);
  });

  it("opens the right place from a push, by a link of the list", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    await notifier.send([{ accountId: ada.id, kind: "delivery", data: {} }], now);
    expect(pusher.sent[0]?.payload.url).toBe("/?open=cargo&src=push&kind=delivery");
  });

  it("gives at 8:05 the night's news kept in the bell, once a day", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    // 23:30 in Paris: kept in the bell, not pushed.
    now = Date.parse("2026-10-12T21:30:00Z");
    await notifier.send([{ accountId: ada.id, kind: "harvest", data: {} }], now);
    await notifier.send(
      [{ accountId: ada.id, kind: "delivery", data: { amount: "15000" } }],
      now + MIN,
    );
    expect(pusher.sent).toHaveLength(0);
    // 8:04: not yet; 8:05: the gazette, once.
    now = Date.parse("2026-10-13T06:04:00Z");
    await notifier.scan();
    expect(pusher.sent).toHaveLength(0);
    now = Date.parse("2026-10-13T06:05:00Z");
    await notifier.scan();
    now += MIN;
    await notifier.scan();
    const morning = pusher.sent.filter((p) => p.payload.kind === "morning");
    expect(morning).toHaveLength(1);
    expect(morning[0]?.payload.url).toBe("/?open=notices&src=push&kind=morning");
    expect(String(morning[0]?.payload.body)).toContain("150");
  });

  it("counts the asks to notify and gives the hours of the guide's last card", async () => {
    const ada = await player("ada@example.org");
    const game = () =>
      app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada.cookie } });
    expect((await game()).json().pushAsk).toMatchObject({ count: 0 });
    const res = await app.inject({
      method: "POST",
      url: "/api/game/push-ask",
      headers: { cookie: ada.cookie },
      payload: { accepted: false, ios: true },
    });
    expect(res.statusCode).toBe(204);
    expect((await game()).json().pushAsk).toMatchObject({ count: 1 });
    await produce(ada.id);
    const agenda = (await game()).json().view.agenda;
    expect(agenda.queuesEndAt).toBeGreaterThan(now);
    expect(agenda.nextWaveAt).toBeGreaterThan(now);
  });

  it("tells of a call to skirmish a quarter of an hour before, only whoever asked", async () => {
    world = await GameWorld.open(database.db, () => now, {
      settingsOverride: { terraferma: { live: true } },
    });
    notifier = new Notifier(database.db, world, pusher);
    await app.close();
    app = await buildApp({
      db: database.db,
      mailer,
      appUrl: "https://comptoirs.test",
      production: false,
      world,
      notifier,
      now: () => new Date(now),
    });
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await subscribe(ada.cookie);
    await subscribe(bob.cookie, "https://fcm.googleapis.com/fcm/send/2");
    await app.inject({
      method: "PATCH",
      url: "/api/notifications/push",
      headers: { cookie: ada.cookie },
      payload: { off: ["skirmish_call"] },
    });
    // 12:14 then 12:15 in Paris: the call of 12:30 told once, to Ada who asked.
    now = Date.parse("2026-10-12T10:14:00Z");
    await notifier.scan();
    now = Date.parse("2026-10-12T10:15:00Z");
    await notifier.scan();
    now += 60_000;
    await notifier.scan();
    const calls = pusher.sent.filter((p) => p.payload.kind === "skirmish_call");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.target.endpoint).toBe("https://fcm.googleapis.com/fcm/send/1");
    expect(String(calls[0]?.payload.title)).toContain("12:30");
  });

  it("refuses a push endpoint outside the browsers' push services", async () => {
    const ada = await player("ada@example.org");
    const res = await subscribe(ada.cookie, "https://10.0.0.1/internal");
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_endpoint");
  });

  it("keeps a few devices per person, the latest ones", async () => {
    const ada = await player("ada@example.org");
    for (let i = 0; i < 12; i++) {
      now += MIN;
      await subscribe(ada.cookie, `https://fcm.googleapis.com/fcm/send/d${i}`);
    }
    const rows = await database.db.select().from(pushSubscriptions);
    expect(rows.map((r) => r.endpoint).sort()).toEqual(
      Array.from({ length: 10 }, (_, i) => `https://fcm.googleapis.com/fcm/send/d${i + 2}`).sort(),
    );
  });

  it("forgets devices that unsubscribed", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie, "https://fcm.googleapis.com/fcm/send/old");
    pusher.gone.add("https://fcm.googleapis.com/fcm/send/old");
    await notifier.send([{ accountId: ada.id, kind: "harvest", data: {} }], now);
    expect(await database.db.select().from(pushSubscriptions)).toEqual([]);
  });

  it("announces a new event to everyone, and never notifies bots", async () => {
    await player("ada@example.org");
    const [bot] = await database.db
      .insert(accounts)
      .values({ email: "bot@bots.comptoirs.invalid", pseudo: "Casa Zeno", isBot: true })
      .returning();
    await world.execute({ type: "join", playerId: bot?.id ?? "", region: "lagoon" });
    // The first event starts on day 1.
    now = world.ctx.startAt + 24 * HOUR - MIN;
    await notifier.scan();
    now += 2 * MIN;
    await notifier.scan();
    const rows = await database.db.select().from(notifications);
    expect(rows.map((r) => r.kind)).toEqual(["event"]);
  });

  it("announces each new act of the season once, with the variant drawn for it", async () => {
    await player("ada@example.org");
    const act = seasonActs(world.ctx)[1];
    if (!act) throw new Error("the theme has acts");
    now = act.startsAt - MIN;
    await notifier.scan();
    now += 2 * MIN;
    await notifier.scan();
    await notifier.scan();
    const rows = await database.db.select().from(notifications);
    const acts = rows.filter((r) => r.kind === "act");
    expect(acts).toHaveLength(1);
    expect(acts[0]?.data).toMatchObject({ code: act.code, index: 1, variant: act.variant?.code });
  });

  it("tells each person their weekly result once", async () => {
    const ada = await player("ada@example.org");
    await database.db.insert(weeklyResults).values({
      worldId: world.id,
      week: 0,
      accountId: ada.id,
      rank: 1,
      gain: 12_345n,
      award: "doge",
    });
    now = world.ctx.startAt + 7 * 24 * HOUR + MIN;
    await subscribe(ada.cookie);
    await notifier.scan();
    await notifier.scan();
    const rows = await database.db
      .select()
      .from(notifications)
      .where(eq(notifications.kind, "week"));
    expect(rows).toHaveLength(1);
    expect(pusher.sent[0]?.payload.body).toContain("Doge de la semaine");
  });
});

describe("notifications of the road", () => {
  it("tells of a wave whose orders the stock covers, only to whoever is away", async () => {
    smallOrders(world);
    // A board big enough for every wave to hold a few orders of each merchant's road.
    world.ctx.settings.deliveries.sharedOrdersPerActivePlayer = 20;
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await subscribe(ada.cookie);
    await subscribe(bob.cookie, "https://fcm.googleapis.com/fcm/send/2");
    await notifier.scan();
    // 11 h in Paris: both were here an hour ago, nobody is told.
    now = Date.parse("2026-10-12T09:00:00Z");
    await world.execute({ type: "tick" });
    await notifier.scan();
    expect(pusher.sent.filter((p) => p.payload.kind === "wave")).toHaveLength(0);
    // 14 h: Ada away since 10 h, Bob back at 13:30.
    await database.db
      .update(players)
      .set({ lastSeenAt: new Date(Date.parse("2026-10-12T11:30:00Z")) })
      .where(eq(players.accountId, bob.id));
    now = Date.parse("2026-10-12T11:59:00Z");
    await world.execute({ type: "tick" });
    await notifier.scan();
    now = Date.parse("2026-10-12T12:00:00Z");
    await world.execute({ type: "tick" });
    await notifier.scan();
    now += MIN;
    await notifier.scan();
    const waves = pusher.sent.filter((p) => p.payload.kind === "wave");
    expect(waves).toHaveLength(1);
    expect(waves[0]?.target.endpoint).toBe("https://fcm.googleapis.com/fcm/send/1");
    expect(String(waves[0]?.payload.title)).toContain("14:00");
    expect(String(waves[0]?.payload.url)).toContain("open=cargo");
  });

  it("tells the merchant that goods arrived", async () => {
    smallOrders(world);
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie);
    await notifier.scan();
    const view = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada.cookie } })
    ).json().view;
    // A city order the starting stock covers (the welcome order waits for the first harvest).
    const have = (r: string) =>
      view.inventory.find((i: { resource: string }) => i.resource === r)?.available ?? 0;
    const order = view.road.orders.find(
      (o: { kind: string; status: string; resource: string; quantity: number }) =>
        o.kind === "city" && o.status === "open" && have(o.resource) >= o.quantity,
    );
    await app.inject({
      method: "POST",
      url: "/api/game/actions",
      headers: { cookie: ada.cookie },
      payload: { type: "dispatchDelivery", orderId: order.id, vehicleId: view.road.vehicles[0].id },
    });
    const d = Object.values(world.current.deliveries ?? {})[0];
    if (!d) throw new Error("no delivery");
    now = d.arriveAt + 10_000;
    await world.execute({ type: "tick" });
    await notifier.scan();
    const kinds = (
      await database.db.select().from(notifications).where(eq(notifications.accountId, ada.id))
    ).map((n) => n.kind);
    expect(kinds).toContain("delivery");
    expect(pusher.sent.some((p) => p.payload.title === "Livraison arrivée")).toBe(true);
  });
});
