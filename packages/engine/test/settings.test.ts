import { describe, expect, it } from "vitest";
import { parseSettings, venice1450, venice1450Settings } from "../src/index.js";

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
});
