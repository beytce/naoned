import { describe, expect, it } from "vitest";
import { weighty } from "../src/empire/Market.js";

describe("a weighty purchase at the Market (audit of 4 November, UX B1)", () => {
  it("asks a second touch beyond a quarter of the purse", () => {
    expect(weighty("32800", "30800")).toBe(true);
    expect(weighty("40000", "10001")).toBe(true);
  });
  it("buys at once up to a quarter", () => {
    expect(weighty("40000", "10000")).toBe(false);
    expect(weighty("500000", "4710")).toBe(false);
  });
});
