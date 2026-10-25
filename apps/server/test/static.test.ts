import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { openDatabase } from "../src/db/client.js";
import { MemoryMailer } from "../src/mail/mailer.js";

describe("web app serving", () => {
  it("serves pages, files added after start, and 404 for missing assets", async () => {
    const dist = mkdtempSync(join(tmpdir(), "web-"));
    mkdirSync(join(dist, "assets"));
    writeFileSync(
      join(dist, "index.html"),
      '<!doctype html><title>Comptoirs</title><meta property="og:image" content="%APP_URL%/og.jpg" />',
    );
    const db = openDatabase("pglite:memory");
    const app = await buildApp({
      db: db.db,
      mailer: new MemoryMailer(),
      appUrl: "http://x",
      production: false,
      webDist: dist,
    });
    expect((await app.inject("/")).body).toContain("Comptoirs");
    // The link previews carry the site's absolute address.
    expect((await app.inject("/?ref=ada")).body).toContain('content="http://x/og.jpg"');
    expect((await app.inject("/connexion?token=abc")).body).toContain("Comptoirs");

    writeFileSync(join(dist, "assets", "new-123.js"), "console.log(1)");
    const added = await app.inject("/assets/new-123.js");
    expect(added.statusCode).toBe(200);
    expect(added.headers["content-type"]).toContain("javascript");

    const missing = await app.inject("/assets/old-999.js");
    expect(missing.statusCode).toBe(404);
    expect(missing.headers["content-type"]).not.toContain("html");
    expect((await app.inject("/api/nope")).statusCode).toBe(404);
    await app.close();
    await db.close();
  });
});
