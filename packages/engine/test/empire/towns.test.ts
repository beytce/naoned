import { describe, expect, it } from "vitest";
import { mergeCities } from "../../src/index.js";

// Some thirty towns (the gameplay audit, 5 November 2026, P2b): a town left out is merged into a
// kept neighbour, which takes its weight in the region's book and grows a size.
const town = (code: string, size: number, weight?: number) => ({
  code,
  cell: "0,0",
  region: "r",
  x: 0,
  y: 0,
  size,
  ...(weight ? { weight } : {}),
});

describe("the towns merged", () => {
  it("keep only the towns not merged, in their order", () => {
    const out = mergeCities([town("a", 3), town("b", 1), town("c", 2)], { b: "a" });
    expect(out.map((c) => c.code)).toEqual(["a", "c"]);
  });

  it("give a kept town the weight of those merged into it (1 each by default)", () => {
    const out = mergeCities([town("a", 3, 20), town("b", 1), town("c", 2, 3)], { b: "a", c: "a" });
    expect(out[0]?.weight).toBe(24);
  });

  it("grow a kept town a size for one merged, two for three or more, five at most", () => {
    const one = mergeCities([town("a", 2), town("b", 1)], { b: "a" });
    expect(one[0]?.size).toBe(3);
    const three = mergeCities([town("a", 2), town("b", 1), town("c", 1), town("d", 1)], {
      b: "a",
      c: "a",
      d: "a",
    });
    expect(three[0]?.size).toBe(4);
    const big = mergeCities([town("a", 5), town("b", 1)], { b: "a" });
    expect(big[0]?.size).toBe(5);
  });

  it("refuses a merge into a town absent or merged itself", () => {
    expect(() => mergeCities([town("a", 1), town("b", 1)], { b: "z" })).toThrow();
    expect(() =>
      mergeCities([town("a", 1), town("b", 1), town("c", 1)], { b: "c", c: "a" }),
    ).toThrow();
  });
});
