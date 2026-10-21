import { describe, expect, it } from "vitest";
import { expectedBaleValue, parseSettings, venice1450, venice1450Settings } from "../src/index.js";
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

  it("leaves deliveries off when absent", () => {
    const s = parseSettings(testSettings);
    expect(s.deliveries.ordersPerDay.max).toBe(0);
    expect(s.deliveries.routes).toEqual({});
  });

  it("parses the deliveries of the test fixture, money as bigint", () => {
    const s = parseSettings({ ...testSettings, ...deliverySettings });
    expect(s.deliveries.vehicles.cart?.costDucats).toBe(10_000n);
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
        const inputs = Object.entries(recipe.inputs).reduce(
          (a, [r, q]) => a + ref(r) * (q ?? 0),
          0,
        );
        const cost = inputs / (qty ?? 1);
        const cheapest =
          (ref(out) * (d.cityPriceBps + Math.floor((d.distanceBonusBpsPerHour * shortest) / 60))) /
          10_000;
        expect(cheapest).toBeGreaterThan(cost * 1.3);
      }
    }
  });

  it("fills Faraj's bales of Venice with goods of the theme, rare ones really rare", () => {
    const settings = parseSettings(venice1450Settings);
    const ctx = { theme: venice1450, settings, startAt: 0 };
    const { bales } = settings;
    const total = bales.rarities.reduce((n, r) => n + r.weight, 0);
    for (const r of bales.rarities) {
      for (const g of r.resources) expect(settings.referencePrices[g]).toBeDefined();
    }
    const chance = (code: string) =>
      (bales.rarities.find((r) => r.code === code)?.weight ?? 0) / total;
    expect(bales.rarities.find((r) => r.code === "legendary")?.resources).toContain("silk");
    expect(bales.rarities.find((r) => r.code === "rare")?.resources).toContain("salt");
    expect(chance("legendary")).toBeLessThanOrEqual(0.0025);
    // About 7.5 ducats a bale, whatever the region (docs/calibration.md).
    for (const region of venice1450.regions) {
      const value = Number(expectedBaleValue(ctx, region.code));
      expect(value).toBeGreaterThan(700);
      expect(value).toBeLessThan(800);
    }
  });
});

describe("the Pass Négociant's settings", () => {
  it("refuse any perk on production, the Dogana's quota or the open offers", () => {
    for (const perk of ["freshBonusBps", "marketMakerQuotaBps", "extraOpenOrders"]) {
      expect(() => parseSettings({ ...testSettings, pass: { [perk]: 1 } }), perk).toThrow(/Pass/);
    }
    expect(parseSettings({ ...testSettings, pass: { enabled: true } }).pass).toMatchObject({
      freshBonusBps: 0,
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
    });
  });

  it("are within the rule in Venice", () => {
    expect(() => parseSettings(venice1450Settings)).not.toThrow();
  });
});
