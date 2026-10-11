import { describe, expect, it } from "vitest";
import { Alerts } from "../src/monitor.js";

describe("alerts", () => {
  it("posts to the webhook, at most once per 10 minutes for the same alert", async () => {
    const sent: string[] = [];
    let now = 0;
    const alerts = new Alerts(
      "https://example.test/hook",
      (async (_url: unknown, init?: RequestInit) => {
        sent.push(String(init?.body));
        return new Response(null);
      }) as typeof fetch,
      () => now,
    );
    expect(await alerts.alert("world stalled", "no tick for 6 min")).toBe(true);
    expect(await alerts.alert("world stalled")).toBe(false);
    expect(await alerts.alert("invariant violations")).toBe(true);
    now += 11 * 60_000;
    expect(await alerts.alert("world stalled")).toBe(true);
    expect(sent).toHaveLength(3);
    expect(JSON.parse(sent[0] ?? "{}").content).toContain("no tick for 6 min");
  });

  it("does nothing without a webhook", async () => {
    expect(await new Alerts(undefined).alert("anything")).toBe(false);
  });
});
