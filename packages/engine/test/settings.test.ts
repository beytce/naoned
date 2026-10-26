import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  expectedBaleValue,
  missionsOfBoard,
  parseSettings,
  upgradeLegacySettings,
  venice1450,
  venice1450Settings,
} from "../src/index.js";
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

describe("Venice without loans nor warehouses", () => {
  it("has neither: the Bank lends nothing and no city auctions a place", () => {
    const s = parseSettings(venice1450Settings);
    expect(s.loans).toBeUndefined();
    expect(s.warehouses).toBeUndefined();
  });
});

describe("the house's missions of Venice", () => {
  it("listen only to events the engine still sends with the Terraferma live", () => {
    const pool = parseSettings(venice1450Settings).house?.missions?.pool ?? [];
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
    // The old campaign is off once the Terraferma is live: its events do not count.
    const sources = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && f !== "campaign.ts")
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    const sent = new Set([...sources.matchAll(/emit\(\s*tx,\s*"([a-z_]+)"/g)].map((m) => m[1]));
    for (const m of pool) expect(sent, m.id).toContain(m.event);
  });

  it("draw two of the Terraferma's at most, six of trade at least", () => {
    const missions = parseSettings(venice1450Settings).house?.missions;
    expect(missions?.groupMax.terra).toBe(2);
    const trade = (missions?.pool ?? []).filter((m) => m.group === undefined).length;
    expect(trade).toBeGreaterThanOrEqual((missions?.perBoard ?? 0) - 2);
  });
});

describe("the Pass Négociant's settings", () => {
  it("refuse any perk on production, the Dogana's quota, the open offers or the orders", () => {
    for (const perk of [
      "freshBonusBps",
      "marketMakerQuotaBps",
      "extraOpenOrders",
      "contractRerollsPerDay",
    ]) {
      expect(() => parseSettings({ ...testSettings, pass: { [perk]: 1 } }), perk).toThrow(/Pass/);
    }
    expect(parseSettings({ ...testSettings, pass: { enabled: true } }).pass).toMatchObject({
      freshBonusBps: 0,
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
      contractRerollsPerDay: 0,
    });
  });

  it("are within the rule in Venice, things to show only", () => {
    const pass = parseSettings(venice1450Settings).pass;
    expect(pass.perks).toEqual({
      cosmetics: true,
      seal: false,
      domainOrnaments: false,
      goldenName: false,
      illustratedChronicle: false,
    });
  });

  it("refuse any perk but things to show, and drop the information once sold", () => {
    expect(() =>
      parseSettings({ ...testSettings, pass: { perks: { fasterQueues: true } } as never }),
    ).toThrow();
    const old = parseSettings({
      ...testSettings,
      pass: { perks: { history30Days: true, deepBook: true, cosmetics: true } } as never,
    }).pass.perks;
    expect(old).toMatchObject({ cosmetics: true });
    expect(Object.keys(old)).not.toContain("deepBook");
  });

  it("of a world saved before are brought within the rule, the rest kept", () => {
    const stored = {
      ...testSettings,
      pass: {
        enabled: false,
        marketMakerQuotaBps: 2_000,
        extraOpenOrders: 2,
        freshBonusBps: 800,
        contractRerollsPerDay: 1,
      },
    };
    const pass = parseSettings(upgradeLegacySettings(stored)).pass;
    expect(pass).toMatchObject({
      enabled: false,
      marketMakerQuotaBps: 0,
      extraOpenOrders: 0,
      freshBonusBps: 0,
      contractRerollsPerDay: 0,
    });
    expect(upgradeLegacySettings(testSettings)).toEqual(testSettings);
  });

  it("give nothing to read or to show unless listed", () => {
    expect(parseSettings({ ...testSettings, pass: { enabled: true } }).pass.perks).toEqual({
      cosmetics: false,
      seal: false,
      domainOrnaments: false,
      goldenName: false,
      illustratedChronicle: false,
    });
  });
});
