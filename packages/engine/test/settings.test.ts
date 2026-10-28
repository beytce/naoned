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

  it("give a week's Influence within 5 % of the two boards of 84 hours before (E1-7)", () => {
    const ctx = { theme: venice1450, settings: parseSettings(venice1450Settings), startAt: 0 };
    let sum = 0;
    for (let board = 0; board < 1_000; board++) {
      const drawn = missionsOfBoard(ctx, board);
      expect(drawn).toHaveLength(8);
      expect(drawn.filter((m) => m.group === "terra").length).toBeLessThanOrEqual(2);
      sum += drawn.reduce((n, m) => n + m.influence, 0);
    }
    // 62.6 a week before: 31.3 expected on each board of ten, two boards a week.
    expect(sum / 1_000).toBeGreaterThanOrEqual(59.5);
    expect(sum / 1_000).toBeLessThanOrEqual(65.7);
  });
});

describe("the mutators of Venice (E2-9)", () => {
  it("are three, one of pure trade at least, none of the Terraferma alone, from December", () => {
    const m = parseSettings(venice1450Settings).mutators;
    expect(m?.from).toBe("2026-12");
    expect(m?.catalog).toHaveLength(3);
    const touchesTrade = (o: NonNullable<typeof m>["catalog"][number]["override"]) =>
      !!o.cityPriceBps || !!o.cityCapacityBps || o.mudaLotBps !== undefined;
    expect(
      m?.catalog.some((c) => touchesTrade(c.override) && c.override.milanTroopsBps === undefined),
    ).toBe(true);
    expect(m?.catalog.every((c) => touchesTrade(c.override))).toBe(true);
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

describe("the month of letters of Venice (R10)", () => {
  const { letters, referencePrices } = parseSettings(venice1450Settings);
  const episodes = letters?.episodes ?? [];
  const plain = (e?: (typeof episodes)[number]) =>
    !!e && e.needs.length === 0 && e.without.length === 0;

  it("writes a letter without conditions every day of a month, and a last one", () => {
    for (let day = 0; day < 30; day++) {
      const ofDay = episodes.filter((e) => e.day === day && !e.last);
      expect(ofDay.length, `day ${day}`).toBeGreaterThan(0);
      // Those with conditions come first: the plain one closes the day.
      expect(plain(ofDay[ofDay.length - 1]), `day ${day}`).toBe(true);
    }
    const last = episodes.filter((e) => e.last);
    expect(plain(last[last.length - 1])).toBe(true);
    expect(new Set(episodes.map((e) => e.id)).size).toBe(episodes.length);
  });

  it("gives and asks only goods of the theme, a little at a time", () => {
    for (const e of episodes) {
      for (const c of e.choices) {
        for (const gift of [c.pay, c.gain, c.later?.gain]) {
          for (const [g, n] of Object.entries(gift?.goods ?? {})) {
            expect(referencePrices[g], `${e.id}: ${g}`).toBeDefined();
            expect(n).toBeLessThanOrEqual(10);
          }
          expect(gift?.ducats ?? 0n).toBeLessThanOrEqual(3_500n);
        }
      }
    }
    expect(letters?.maxDucatsPerSeason).toBe(10_000n);
  });
});
