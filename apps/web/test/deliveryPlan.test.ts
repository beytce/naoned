import { describe, expect, it } from "vitest";
import { deliveryPlan } from "../src/empire/map/logic.js";
import type { EmpirePayload } from "../src/empire/types.js";

// « Livrer » from a city (decision of the owner, 3 November 2026): what the button would do, as the
// engine does it (empireDeliverCity): the orders the stock covers, the best paid first, on the
// smallest free vehicle that takes them all; else why not, and until when.
const order = (id: string, good: string, qty: number, pay: number) => ({
  id,
  city: "padova",
  good,
  qty,
  pay: String(pay),
});
function payload(
  goods: Record<string, number>,
  vehicles: { id: string; capacity: number; at?: string; legs?: { arrivesAt: number }[] }[],
) {
  return {
    now: 1_000,
    view: {
      stores: [{ post: "home", region: "veneto", goods }],
      orders: [
        {
          city: "padova",
          region: "veneto",
          size: 3,
          cap: 3,
          fillBps: 10_000,
          nextAt: null,
          posts: ["home"],
          orders: [
            order("o1", "wood", 40, 400),
            order("o2", "clay", 30, 600),
            order("o3", "wood", 40, 500),
          ],
        },
      ],
      vehicles: {
        mine: vehicles.map((v) => ({
          type: "mule",
          busyUntil: 0,
          loads: [],
          at: "home",
          legs: [],
          ...v,
        })),
      },
    },
  } as unknown as EmpirePayload;
}

describe("the delivery a city's « Livrer » would make", () => {
  it("takes what the stock covers, the best paid first, on the smallest vehicle enough", () => {
    const p = payload({ wood: 50, clay: 30 }, [
      { id: "big", capacity: 6 },
      { id: "small", capacity: 2 },
    ]);
    const plan = deliveryPlan(p, "padova");
    // Clay (600) and the better paid wood (500); the other wood lacks stock.
    expect(plan.picks).toEqual(["o2", "o3"]);
    expect(plan.vehicle?.id).toBe("small");
    expect(plan.pay).toBe(1_100n);
    expect(plan.reason).toBeNull();
    // Its stock alone would cover it, but not after the better paid one.
    expect(plan.orders.find((x) => x.o.id === "o1")?.covered).toBe(true);
    expect(plan.orders.find((x) => x.o.id === "o1")?.have).toBe(50);
  });

  it("keeps to the orders chosen", () => {
    const p = payload({ wood: 100, clay: 30 }, [{ id: "m", capacity: 3 }]);
    expect(deliveryPlan(p, "padova", new Set(["o1"])).picks).toEqual(["o1"]);
  });

  it("says nothing is in stock", () => {
    const p = payload({}, [{ id: "m", capacity: 3 }]);
    const plan = deliveryPlan(p, "padova");
    expect(plan.picks).toEqual([]);
    expect(plan.reason).toBe("stock");
  });

  it("says every vehicle is away, and when the first comes back", () => {
    const p = payload({ wood: 100 }, [
      { id: "a", capacity: 3, legs: [{ arrivesAt: 90_000 }] },
      { id: "b", capacity: 3, at: "city:mestre", legs: [{ arrivesAt: 50_000 }] },
    ]);
    const plan = deliveryPlan(p, "padova");
    expect(plan.reason).toBe("busy");
    expect(plan.freeAt).toBe(50_000);
  });

  it("says the city is out of every counter's reach", () => {
    const p = payload({ wood: 100 }, [{ id: "m", capacity: 3 }]);
    expect(deliveryPlan(p, "verona").reason).toBe("reach");
  });
});
