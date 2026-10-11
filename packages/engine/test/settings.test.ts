import { describe, expect, it } from "vitest";
import { parseSettings, venice1450, venice1450Settings } from "../src/index.js";
import { deliverySettings, testSettings } from "./fixture.js";

describe("settings", () => {
  it("parses the Venice 1450 defaults, money as bigint", () => {
    const s = parseSettings(venice1450Settings);
    expect(s.startingCapital).toBe(100_000n);
    expect(s.referencePrices.bread).toBe(180n);
  });

  it("covers every building and resource of the theme", () => {
    const s = parseSettings(venice1450Settings);
    for (const b of venice1450.buildings) expect(s.buildings[b.type]).toBeDefined();
    for (const r of venice1450.resources) expect(s.referencePrices[r.code]).toBeDefined();
  });

  it("rejects floats and negative amounts", () => {
    expect(() => parseSettings({ ...venice1450Settings, startingCapital: 10.5 })).toThrow();
    expect(() => parseSettings({ ...venice1450Settings, marketTaxBps: -1 })).toThrow();
  });

  it("leaves deliveries and bandits off when absent", () => {
    const s = parseSettings(testSettings);
    expect(s.deliveries.ordersPerDay.max).toBe(0);
    expect(s.deliveries.routes).toEqual({});
    expect(s.bandits.hoursOptions).toEqual([]);
  });

  it("parses the deliveries of the test fixture, money as bigint", () => {
    const s = parseSettings({ ...testSettings, ...deliverySettings });
    expect(s.deliveries.vehicles.cart?.costDucats).toBe(10_000n);
    expect(s.bandits.feePerHour).toBe(1_000n);
    expect(s.bandits.attackChanceBps["2"]).toBe(5_000);
  });
});
