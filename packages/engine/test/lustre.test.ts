import { describe, expect, it } from "vitest";
import {
  type LustreRules,
  applyLustre,
  ghostAt,
  pairByLustre,
  sfidaDelta,
  softReset,
  tierOf,
} from "../src/index.js";

/**
 * The Lustre (R6 of the audit of 27 October 2026, docs/plan-rupture.md): a rank that lasts from
 * season to season, won and lost in weekly duels (the Sfide), against a ghost when nobody is free.
 */

const rules: LustreRules = {
  tiers: [
    { code: "popolano", from: 0 },
    { code: "cittadino", from: 100 },
    { code: "mercante", from: 250 },
  ],
  win: 30,
  loss: 20,
  maxStake: 50,
  resetTiers: 2,
};

describe("the Lustre", () => {
  it("names the tier of a Lustre, and the next one with its threshold", () => {
    expect(tierOf(rules, 0)).toEqual({ code: "popolano", index: 0, from: 0, next: 100 });
    expect(tierOf(rules, 120)).toEqual({ code: "cittadino", index: 1, from: 100, next: 250 });
    expect(tierOf(rules, 900)).toEqual({ code: "mercante", index: 2, from: 250, next: null });
  });

  it("pairs merchants of neighbouring Lustre, the one left over alone", () => {
    const { pairs, left } = pairByLustre([
      { id: "a", lustre: 10 },
      { id: "b", lustre: 300 },
      { id: "c", lustre: 0 },
      { id: "d", lustre: 280 },
      { id: "e", lustre: 120 },
    ]);
    expect(pairs).toEqual([
      ["b", "d"],
      ["e", "a"],
    ]);
    expect(left).toEqual(["c"]);
  });

  it("moves the winner up and the loser down, the stake on top, never below zero", () => {
    expect(sfidaDelta(rules, 500n, 300n)).toEqual({ a: 30, b: -20 });
    expect(sfidaDelta(rules, 100n, 300n, 40)).toEqual({ a: -60, b: 70 });
    expect(sfidaDelta(rules, 200n, 200n)).toEqual({ a: 0, b: 0 });
    // The stake is capped.
    expect(sfidaDelta(rules, 2n, 1n, 500)).toEqual({ a: 80, b: -70 });
    expect(applyLustre(15, -20)).toBe(0);
    expect(applyLustre(15, 30)).toBe(45);
  });

  it("sends a merchant two tiers down at the month's change, never below zero", () => {
    expect(softReset(rules, 300)).toBe(0);
    const more = { ...rules, resetTiers: 1 };
    expect(softReset(more, 300)).toBe(100);
    expect(softReset(more, 50)).toBe(0);
  });

  it("reads a ghost's net sales at an hour of its week, its last value past the end", () => {
    const curve = [0n, 10n, 25n, 25n, 40n];
    expect(ghostAt(curve, 0)).toBe(0n);
    expect(ghostAt(curve, 2)).toBe(25n);
    expect(ghostAt(curve, 99)).toBe(40n);
    expect(ghostAt([], 3)).toBe(0n);
  });
});
