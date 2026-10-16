import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, redactUrl } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { LiveHub, type LiveSocket } from "../src/game/live.js";
import { MemoryMailer } from "../src/mail/mailer.js";

let app: FastifyInstance | undefined;
let database: Database | undefined;

async function open(production: boolean): Promise<FastifyInstance> {
  const db = openDatabase("pglite:memory");
  database = db;
  await db.migrate();
  const opened = await buildApp({
    db: db.db,
    mailer: new MemoryMailer(),
    appUrl: "https://fondaco.test",
    production,
  });
  app = opened;
  return opened;
}

afterEach(async () => {
  await app?.close();
  await database?.close();
  app = undefined;
  database = undefined;
});

describe("hardening", () => {
  it("sends the security headers, HSTS in production", async () => {
    const app = await open(true);
    const res = await app.inject("/api/health");
    const csp = String(res.headers["content-security-policy"]);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' wss://fondaco.test");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("same-origin");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
  });

  it("trusts only the last proxy's address for the rate limits", async () => {
    const app = await open(true);
    const ask = (i: number) =>
      app.inject({
        method: "POST",
        url: "/api/auth/request",
        headers: { "x-forwarded-for": `198.51.100.${i}, 203.0.113.7` },
        payload: { email: `p${i}@example.org` },
      });
    for (let i = 0; i < 10; i++) expect((await ask(i)).statusCode).toBe(202);
    // A new address made up at the front of the header does not reset the count.
    expect((await ask(10)).statusCode).toBe(429);
  });

  it("refuses a write sent from another site", async () => {
    const app = await open(false);
    const logout = (origin?: string) =>
      app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: origin ? { origin } : {},
      });
    expect((await logout("https://evil.example")).statusCode).toBe(403);
    expect((await logout("https://fondaco.test")).statusCode).toBe(204);
    expect((await logout()).statusCode).toBe(204);
  });

  it("keeps sign-in tokens out of the logs", () => {
    expect(redactUrl("/connexion?token=abc-DEF_1")).toBe("/connexion?token=…");
    expect(redactUrl("/x?a=1&token=abc&b=2")).toBe("/x?a=1&token=…&b=2");
    expect(redactUrl("/api/game")).toBe("/api/game");
  });
});

describe("live games", () => {
  const socket = () => {
    const closed = { value: false };
    const s: LiveSocket & { closed: typeof closed } = {
      readyState: 1,
      closed,
      send: () => undefined,
      ping: () => undefined,
      terminate: () => {
        closed.value = true;
      },
      on: () => undefined,
    };
    return s;
  };

  it("keeps a few open games per merchant, closing the oldest", () => {
    const hub = new LiveHub();
    const all = Array.from({ length: 7 }, socket);
    for (const s of all) hub.add("ada", s);
    expect(hub.size).toBe(5);
    expect(all.map((s) => s.closed.value)).toEqual([true, true, false, false, false, false, false]);
  });
});
