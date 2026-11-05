import { describe, expect, it } from "vitest";
import { casaRoad } from "../src/empire/map/casaRoad.js";
import type { EmpirePayload } from "../src/empire/types.js";

function payload(builds: unknown[] = []): EmpirePayload {
  return {
    cash: "45200",
    now: 0,
    stock: { bricks: 12, planks: 60 },
    view: {
      house: {
        casa: 3,
        builds,
        workshops: [
          { id: "a", level: 3 },
          { id: "b", level: 1 },
          { id: "c", level: 4 },
        ],
      },
      nextCasa: {
        cost: "120000",
        materials: { bricks: 60, planks: 60 },
        requires: { workshops: 4, level: 3 },
        requirementMet: false,
        opens: ["scuola", "tradeModules"],
      },
    },
  } as unknown as EmpirePayload;
}

describe("the road to the next Casa (the refonte claire, lot 3)", () => {
  it("says each thing it asks and what the house has of it, ducats in whole ducats", () => {
    const road = casaRoad(payload());
    expect(road?.level).toBe(4);
    expect(road?.opens).toEqual(["scuola", "tradeModules"]);
    expect(road?.steps).toEqual([
      { id: "ducats", good: null, have: 452, need: 1200 },
      { id: "bricks", good: "bricks", have: 12, need: 60 },
      { id: "planks", good: "planks", have: 60, need: 60 },
      { id: "workshops", good: null, have: 2, need: 4 },
    ]);
  });

  it("is as far as the mean of its steps, each at most full", () => {
    const share = casaRoad(payload())?.share ?? 0;
    expect(share).toBeCloseTo((452 / 1200 + 12 / 60 + 1 + 2 / 4) / 4, 5);
  });

  it("tells its site once it is being built", () => {
    const site = { kind: "casa", level: 4, startedAt: 0, endsAt: 10 };
    expect(casaRoad(payload([site]))?.building).toEqual(site);
  });
});
