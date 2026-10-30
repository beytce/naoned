import { describe, expect, it } from "vitest";
import {
  newsDelayMs,
  parseEmpireSettings,
  pressureAfterHours,
  pressureAfterTrade,
  priceAt,
  refPriceOf,
  regionOf,
  routeHours,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings(testEmpire);
const HOUR = 3_600_000;

describe("the regions and their routes (CADRAGE-v3 § 3.4)", () => {
  it("reads a region, and refuses one that does not exist", () => {
    expect(regionOf("lombardia", s).casa).toBe(4);
    expect(() => regionOf("atlantide", s)).toThrow();
  });

  it("routes pass by Venice, the same both ways, nothing to stay put", () => {
    expect(routeHours("veneto", "lombardia", 0, s)).toBe(6);
    expect(routeHours("lombardia", "levante", 0, s)).toBe(102);
    expect(routeHours("levante", "lombardia", 0, s)).toBe(102);
    expect(routeHours("levante", "levante", 0, s)).toBe(0);
  });

  it("goes quicker with sails, never below an hour on a real route", () => {
    expect(routeHours("veneto", "levante", 10_000, s)).toBe(48);
    expect(routeHours("veneto", "lombardia", 1_000_000, s)).toBe(1);
  });
});

describe("the regional prices (profondeur.md § D)", () => {
  it("reads a good's local reference, made or wanted there", () => {
    expect(refPriceOf("veneto", "wheat", s)).toBe(400n);
    expect(refPriceOf("levante", "cloth", s)).toBe(3_000n);
    expect(refPriceOf("lombardia", "spices", s)).toBeNull();
  });

  it("follows the pressure, between the floor and the ceiling", () => {
    expect(priceAt(1_000n, 10_000, s)).toBe(1_000n);
    expect(priceAt(1_000n, 12_000, s)).toBe(1_200n);
    expect(priceAt(1_000n, 1_000, s)).toBe(600n);
    expect(priceAt(1_000n, 90_000, s)).toBe(1_500n);
  });

  it("rises when one buys, falls when one sells, in proportion to the market's depth", () => {
    expect(pressureAfterTrade(10_000, 50, 100, "buy", s)).toBe(11_000);
    expect(pressureAfterTrade(10_000, 50, 100, "sell", s)).toBe(9_000);
    expect(pressureAfterTrade(10_000, 0, 100, "buy", s)).toBe(10_000);
  });

  it("comes back halfway to the reference in a half-life, all the way in time", () => {
    expect(pressureAfterHours(14_000, 24, s)).toBe(12_000);
    expect(pressureAfterHours(6_000, 24, s)).toBe(8_000);
    expect(pressureAfterHours(14_000, 24 * 30, s)).toBe(10_000);
  });
});

describe("the news travels at the speed of ships (profondeur.md § D)", () => {
  it("is live where the house has a counter, and in Venetia", () => {
    expect(newsDelayMs("levante", true, 0, s)).toBe(0);
    expect(newsDelayMs("veneto", false, 0, s)).toBe(0);
  });

  it("comes as late as a ship from elsewhere, less late with a portolan", () => {
    expect(newsDelayMs("levante", false, 0, s)).toBe(96 * HOUR);
    expect(newsDelayMs("levante", false, 10_000, s)).toBe(48 * HOUR);
  });
});
