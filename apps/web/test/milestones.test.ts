import { describe, expect, it } from "vitest";
import { milestonesOf } from "../src/empire/map/Milestones.js";
import type { EmpirePayload } from "../src/empire/types.js";

const objective = (kind: string, progress: number, target: number, claimed = false) => ({
  kind,
  progress,
  target,
  claimed,
});

function payload(): EmpirePayload {
  return {
    cash: "25000",
    now: 0,
    stock: {},
    view: {
      house: { casa: 2 },
      nextCasa: { cost: "100000" },
      orders: [
        {
          city: "padova",
          posts: ["home"],
          orders: [
            { id: "o1", good: "bread", qty: 10, pay: "30000" },
            { id: "o2", good: "cloth", qty: 5, pay: "90000" },
          ],
        },
      ],
      stores: [{ post: "home", region: "veneto", goods: { bread: 20 } }],
      vehicles: { mine: [{ id: "v1", at: "home", legs: [], loads: [], capacity: 2 }] },
      carnet: {
        week: 1,
        objectives: [
          objective("relaunch", 2, 10),
          objective("deliver", 9, 10),
          objective("sell", 10, 10),
        ],
        carried: [],
        windUntil: null,
      },
    },
  } as unknown as EmpirePayload;
}

describe("the three milestones past the tutorial (audit of 4 November, UX B2)", () => {
  it("aim at the next Casa with the purse's share of it", () => {
    expect(milestonesOf(payload())?.casa).toEqual({ level: 3, share: 0.25 });
  });

  it("put first an order « Livrer » would send now, before a better paid one", () => {
    expect(milestonesOf(payload())?.order).toMatchObject({
      city: "padova",
      good: "bread",
      ready: true,
    });
  });

  it("show the Carnet's nearest goal not yet met, and how many are met", () => {
    expect(milestonesOf(payload())?.carnet).toMatchObject({ kind: "sell", done: 1, of: 3 });
  });
});
