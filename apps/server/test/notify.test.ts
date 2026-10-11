import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, notifications, pushSubscriptions, weeklyResults } from "../src/db/schema.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { Notifier } from "../src/notify/notifier.js";
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

const subscribe = (cookie: string, endpoint = "https://push.example/1") =>
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
    const send = (kind: "harvest" | "galley") =>
      notifier.send([{ accountId: ada.id, kind, data: { destination: "alexandria" } }], now);

    await send("harvest");
    await send("harvest");
    expect(pusher.sent).toHaveLength(1);

    await app.inject({
      method: "PATCH",
      url: "/api/notifications/push",
      headers: { cookie: ada.cookie },
      payload: { off: ["galley"] },
    });
    await send("galley");
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

  it("forgets devices that unsubscribed", async () => {
    const ada = await player("ada@example.org");
    await subscribe(ada.cookie, "https://push.example/old");
    pusher.gone.add("https://push.example/old");
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
  it("pushes an ambush at once, then the outcome to both sides and the arrival", async () => {
    smallOrders(world);
    world.ctx.settings.bandits.openDay = 0;
    world.ctx.settings.bandits.newcomerDays = 0;
    const ada = await player("ada@example.org");
    const bob = await player("bob@example.org");
    await app.inject({
      method: "PATCH",
      url: "/api/me",
      headers: { cookie: bob.cookie },
      payload: { pseudo: "Bob" },
    });
    await subscribe(ada.cookie);
    await notifier.scan();
    const view = (
      await app.inject({ method: "GET", url: "/api/game", headers: { cookie: ada.cookie } })
    ).json().view;
    const order = view.road.orders.find(
      (o: { kind: string; status: string }) => o.kind === "city" && o.status === "open",
    );
    const act = (cookie: string, payload: object) =>
      app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload });
    await act(bob.cookie, { type: "postBand", route: `terraferma:${order.city}`, hours: 2 });
    await act(ada.cookie, {
      type: "dispatchDelivery",
      orderId: order.id,
      vehicleId: view.road.vehicles[0].id,
      escort: "none",
    });
    const d = Object.values(world.current.deliveries ?? {})[0];
    if (!d) throw new Error("no delivery");
    now = d.midAt;
    await world.execute({ type: "tick" });
    now += 30_000;
    await notifier.scan();
    const alert = pusher.sent.find((p) => p.payload.kind === "ambush");
    expect(alert?.payload.title).toBe("Brigands sur la route !");
    expect(alert?.payload.body).toContain("10 minutes");
    expect(alert?.payload.url).toBe(`/?ambush=${d.id}`);

    now += 2 * MIN;
    await act(ada.cookie, { type: "reactToAmbush", deliveryId: d.id });
    await notifier.scan();
    const kinds = async (id: string) =>
      (await database.db.select().from(notifications).where(eq(notifications.accountId, id))).map(
        (n) => n.kind,
      );
    expect(await kinds(ada.id)).toContain("defended");
    expect(await kinds(bob.id)).toContain("defended");
    const toBob = (
      await database.db.select().from(notifications).where(eq(notifications.accountId, bob.id))
    ).find((n) => n.kind === "defended");
    expect(toBob?.data.victimName).toBe(null);

    now = (world.current.deliveries?.[d.id]?.arriveAt ?? 0) + 10_000;
    await world.execute({ type: "tick" });
    await notifier.scan();
    expect(await kinds(ada.id)).toContain("delivery");
    now = (Object.values(world.current.bands ?? {})[0]?.endAt ?? 0) + 10_000;
    await notifier.scan();
    // A band broken up hears it with the defeat, not again at the end.
    expect((await kinds(bob.id)).filter((k) => k === "band_over")).toHaveLength(0);
  });
});
