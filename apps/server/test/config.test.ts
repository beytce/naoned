import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("accepts a Railway domain without scheme, spaces or with a trailing slash", () => {
    expect(loadConfig({ APP_URL: "naoned-production.up.railway.app" }).APP_URL).toBe(
      "https://naoned-production.up.railway.app",
    );
    expect(loadConfig({ APP_URL: " https://jeu.example.fr/ " }).APP_URL).toBe(
      "https://jeu.example.fr",
    );
    expect(loadConfig({}).APP_URL).toBe("http://localhost:5173");
  });

  it("refuses to start in production without e-mail key or with an embedded database", () => {
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x" })).toThrow(
      /RESEND_API_KEY/,
    );
    expect(() => loadConfig({ NODE_ENV: "production", RESEND_API_KEY: "re_x" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("starts the clock of a test at a chosen instant, never in production", () => {
    expect(loadConfig({ CLOCK_START: "2026-03-02T10:00:00+01:00" }).CLOCK_START).toBe(
      Date.UTC(2026, 2, 2, 9),
    );
    expect(loadConfig({}).CLOCK_START).toBeUndefined();
    expect(() => loadConfig({ CLOCK_START: "lundi" })).toThrow();
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        RESEND_API_KEY: "re_x",
        DATABASE_URL: "postgres://x",
        CLOCK_START: "2026-03-02T10:00:00+01:00",
      }),
    ).toThrow(/CLOCK_START/);
  });

  it("rejects a value that is not a URL", () => {
    expect(() => loadConfig({ APP_URL: "pas une url" })).toThrow();
  });
});
