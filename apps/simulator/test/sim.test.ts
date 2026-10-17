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

  it("gives houses their patents, which choose a second counter and earn Influence", () => {
    const r = runSimulation({
      settings: venice1450Settings,
      seed: 5,
      // Two weeks: the first one closes on day 7 (the last runs to the end of the season).
      days: 14,
      stepMinutes: 30,
      mix: { ...DEFAULT_MIX, producer: 2, artisan: 2, builder: 1, speculator: 1, casual: 1 },
      lateJoiners: 0,
      patentShare: 0.5,
    });
    expect(r.violations).toEqual([]);
    const holders = r.patentHolders ?? [];
    expect(holders.length).toBeGreaterThan(0);
    for (const id of holders) {
      expect(r.finalState?.players[id]?.patents).toEqual(["second_counter"]);
      expect(r.finalState?.players[id]?.secondRegion).toBeDefined();
    }
    // The first week closed: net sales earned Influence.
    expect(Object.values(r.influence ?? {}).some((i) => i.commerce > 0)).toBe(true);
  });

  it("computes the Gini index", () => {
    expect(gini([1, 1, 1, 1])).toBeCloseTo(0);
    expect(gini([0, 0, 0, 10])).toBeCloseTo(0.75);
  });
});
