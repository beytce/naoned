import { describe, expect, it } from "vitest";
import { type Box, crowded } from "../src/empire/map/declutter.js";

const box = (key: string, x: number, y: number, rank: number): Box => ({
  key,
  x,
  y,
  w: 80,
  h: 20,
  rank,
});

describe("the map's names never on each other (the refonte claire, lot 2)", () => {
  it("keeps the higher rank where two overlap, whatever their order", () => {
    expect(crowded([box("town", 0, 0, 41), box("home", 10, 5, 100)])).toEqual(new Set(["town"]));
    expect(crowded([box("home", 10, 5, 100), box("town", 0, 0, 41)])).toEqual(new Set(["town"]));
  });

  it("keeps every name that has room, a margin between them", () => {
    expect(crowded([box("a", 0, 0, 40), box("b", 0, 30, 40), box("c", 200, 0, 10)]).size).toBe(0);
    expect(crowded([box("a", 0, 0, 40), box("b", 0, 22, 40)])).toEqual(new Set(["b"]));
  });

  it("lets a name stay when only a name that gave way stood on it", () => {
    // b gives way to a; c touches b only: c stays.
    const out = crowded([box("a", 0, 0, 90), box("b", 60, 0, 50), box("c", 130, 0, 20)]);
    expect(out).toEqual(new Set(["b"]));
  });
});
