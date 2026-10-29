import { describe, expect, it } from "vitest";
import { bestAim } from "../src/game/terraAim.js";

const holders = [
  { me: true, ally: false },
  { me: false, ally: false },
  { me: false, ally: true },
];

const view = (costs: Record<string, number>, troops = 100, aimed: number[] = []) => ({
  costs,
  owner: [0, 0, 1, 1, 2, -1, -1],
  holders,
  fronts: aimed.map((aim) => ({ mine: true, aim })),
  me: { troops },
});

describe("the camp's advice: where a front goes first", () => {
  it("aims at the cheapest cell along the border, with the share of troops it needs", () => {
    const aim = bestAim(view({ "2": 25, "3": 40, "5": 12 }, 121));
    expect(aim).toEqual({ cell: 5, holder: -1, cost: 12, shareBps: 992 });
    // The share always sends at least the cost: floor(121 × 992 / 10 000) = 12.
    expect(Math.floor((121 * (aim?.shareBps ?? 0)) / 10_000)).toBeGreaterThanOrEqual(12);
  });

  it("never aims at an ally, nor where a front of the merchant already goes", () => {
    expect(bestAim(view({ "4": 5, "2": 25, "5": 12 }, 100, [5]))?.cell).toBe(2);
  });

  it("breaks a tie by the cell, so the advice does not flicker", () => {
    expect(bestAim(view({ "6": 20, "3": 20 }))?.cell).toBe(3);
  });

  it("gives nothing when the troops cannot pay any cell, or nothing is in reach", () => {
    expect(bestAim(view({ "2": 25 }, 20))).toBeNull();
    expect(bestAim(view({}))).toBeNull();
    expect(bestAim({ ...view({ "2": 25 }), me: null })).toBeNull();
  });
});
