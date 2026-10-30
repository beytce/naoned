import { describe, expect, it } from "vitest";
import { parseEmpireSettings, salaryBps, wagesOn } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings(testEmpire);

describe("the wages on receipts (arbitrage A, CADRAGE-v3 § 5.2)", () => {
  it("rise from the smallest house's share toward the largest's, never past it", () => {
    expect(salaryBps(0, s)).toBe(300);
    expect(salaryBps(1_000, s)).toBe(1_400);
    let last = 0;
    for (const p of [0, 10, 100, 500, 1_000, 5_000, 100_000, 10_000_000]) {
      const b = salaryBps(p, s);
      expect(b).toBeGreaterThanOrEqual(last);
      expect(b).toBeLessThanOrEqual(2_500);
      last = b;
    }
  });

  it("are taken on a receipt, in whole deniers, never more than it, nothing on nothing", () => {
    expect(wagesOn(100_000n, 1_000, s)).toBe(14_000n);
    expect(wagesOn(0n, 1_000_000, s)).toBe(0n);
    expect(wagesOn(7n, 0, s)).toBe(0n);
  });
});
