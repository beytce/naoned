import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { Notifier } from "../src/notify/notifier.js";
import { MemoryPusher } from "../src/notify/push.js";
import { testDatabase } from "./db.js";
import { joinAtWork } from "./empire-start.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let notifier: Notifier;
let pusher: MemoryPusher;
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
  pusher = new MemoryPusher();
  // 11 h in Paris: no quiet hours.
  now = Date.parse("2026-10-26T10:00:00Z");
  world = await GameWorld.open(database.db, () => now, { empire: true });
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

async function login(email: string): Promise<string> {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
  return `${SESSION_COOKIE}=${cookie?.value}`;
}
const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });

async function merchant(email: string, endpoint: string) {
  const cookie = await login(email);
  await joinAtWork(post, cookie, (ms) => {
    now += ms;
  });
  await post(cookie, "/api/notifications/push/subscribe", {
    endpoint,
    keys: { p256dh: "p", auth: "a" },
  });
  await post(cookie, "/api/empire/actions", { type: "empireRelaunchAll" });
  return cookie;
}

describe("the empire's notifications (audit of 4 November)", () => {
  it("are offered in the empire's world, off until asked for", async () => {
    const ada = await merchant("ada@example.org", "https://fcm.googleapis.com/fcm/send/1");
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/push",
      headers: { cookie: ada },
    });
    const body = res.json();
    expect(body.kinds).toEqual(
      expect.arrayContaining(["empire_full", "empire_site", "empire_orders"]),
    );
    expect(body.optIn).toEqual(
      expect.arrayContaining(["empire_full", "empire_site", "empire_orders"]),
    );
  });

  it("tell a merchant who asked that a queue ran dry, once, and no one else", async () => {
    const ada = await merchant("ada@example.org", "https://fcm.googleapis.com/fcm/send/1");
    await merchant("bob@example.org", "https://fcm.googleapis.com/fcm/send/2");
    await app.inject({
      method: "PATCH",
      url: "/api/notifications/push",
      headers: { cookie: ada },
      payload: { off: ["empire_full"] },
    });
    await notifier.scan();
    // Two days later, at 11 h in Paris: every queue has run dry meanwhile.
    now += 2 * 24 * 3_600_000;
    await notifier.scan();
    now += 60_000;
    await notifier.scan();
    const full = pusher.sent.filter((p) => p.payload.kind === "empire_full");
    expect(full).toHaveLength(1);
    expect(full[0]?.target.endpoint).toBe("https://fcm.googleapis.com/fcm/send/1");
    expect(String(full[0]?.payload.title)).toContain("files");
  });
});
