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

  it("pays every Venetian order of a made good well above the cost of its inputs", () => {
    const s = parseSettings(venice1450Settings);
    const d = s.deliveries;
    const ref = (r: string) => Number(s.referencePrices[r] ?? 0n);
    const shortest = Math.min(
      ...Object.values(d.routes).flatMap((cities) => Object.values(cities)),
    );
    for (const recipe of venice1450.recipes) {
      if (Object.keys(recipe.inputs).length === 0) continue;
      for (const [out, qty] of Object.entries(recipe.outputs)) {
        const inputs = Object.entries(recipe.inputs).reduce((a, [r, q]) => a + ref(r) * q, 0);
        const cost = inputs / qty;
        const cheapest =
          (ref(out) * (d.cityPriceBps + Math.floor((d.distanceBonusBpsPerHour * shortest) / 60))) /
          10_000;
        expect(cheapest).toBeGreaterThan(cost * 1.3);
      }
    }
  });
});
