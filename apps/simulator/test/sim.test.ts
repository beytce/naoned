import { venice1450Settings } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { gini } from "../src/metrics.js";
import { DEFAULT_MIX, runSimulation } from "../src/sim.js";

const short = (seed: number) =>
  runSimulation({
    settings: venice1450Settings,
    seed,
    days: 3,
    stepMinutes: 15,
    mix: { ...DEFAULT_MIX, producer: 3, artisan: 3, builder: 2, speculator: 1, casual: 1 },
    lateJoiners: 0,
  });

describe("simulator", () => {
  it("is deterministic for a given seed", () => {
    const a = short(7);
    const b = short(7);
    expect(a.daily).toEqual(b.daily);
    expect(a.commands).toEqual(b.commands);
  });

  it("keeps the invariants and trades", () => {
    const r = short(3);
    expect(r.violations).toEqual([]);
    expect(r.daily.reduce((n, d) => n + d.trades, 0)).toBeGreaterThan(0);
  });

  it("computes the Gini index", () => {
    expect(gini([1, 1, 1, 1])).toBeCloseTo(0);
    expect(gini([0, 0, 0, 10])).toBeCloseTo(0.75);
  });
});
