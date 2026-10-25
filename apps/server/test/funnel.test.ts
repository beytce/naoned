import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { funnelDay, funnelReport, funnelSource } from "../src/funnel.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
const clock = new Date("2026-11-01T22:30:00Z");

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});
beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate accounts, login_tokens, sessions, funnel_counts cascade`);
  mailer = new MemoryMailer();
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://fondaco.test",
    production: false,
    now: () => clock,
  });
});
afterEach(async () => {
  await app.close();
  await database.close();
});

describe("the way in", () => {
  it("counts by the day of Paris and the campaign's source, never a person", async () => {
    // 22:30 UTC on 1 November is 23:30 in Paris: still the 1st.
    expect(funnelDay(clock)).toBe("2026-11-01");
    expect(funnelSource(" Reddit ")).toBe("reddit");
    for (let i = 0; i < 3; i++)
      await app.inject({
        method: "POST",
        url: "/api/funnel/landing",
        payload: { source: "reddit" },
      });
    await app.inject({ method: "POST", url: "/api/funnel/landing", payload: {} });
    await app.inject({
      method: "POST",
      url: "/api/auth/request",
      payload: { email: "ada@example.org", source: "reddit" },
    });
    const token = decodeURIComponent(
      mailer.sent.at(-1)?.text.match(/connexion\?token=([\w%-]+)/)?.[1] ?? "",
    );
    await app.inject({
      method: "POST",
      url: "/api/auth/verify",
      payload: { token, origin: { utmSource: "reddit" } },
    });
    const report = await funnelReport(database.db, clock);
    expect(report.days[0]).toEqual({
      day: "2026-11-01",
      steps: {
        landing_view: 4,
        link_requested: 1,
        signed_in: 1,
        region_chosen: 0,
        first_produce: 0,
      },
    });
    expect(report.sources.find((s) => s.source === "reddit")?.steps.landing_view).toBe(3);
    expect(report.sources.find((s) => s.source === "")?.steps.landing_view).toBe(1);
  });
});
