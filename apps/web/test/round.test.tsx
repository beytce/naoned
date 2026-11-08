import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoundDock } from "../src/empire/map/RoundDock.js";
import { planRound } from "../src/empire/map/round.js";
import type { EmpirePayload } from "../src/empire/types.js";

function payload(capacity = 3, bricks = 20): EmpirePayload {
  return {
    cash: "0",
    now: 0,
    stock: {},
    view: {
      orders: [
        {
          city: "padova",
          posts: ["home"],
          orders: [
            { id: "p1", good: "bricks", qty: 10, pay: "300" },
            { id: "p2", good: "planks", qty: 5, pay: "500" },
          ],
        },
        {
          city: "venezia",
          posts: ["home"],
          orders: [{ id: "v1", good: "bricks", qty: 10, pay: "900" }],
        },
        {
          city: "milano",
          posts: ["far"],
          orders: [{ id: "m1", good: "bricks", qty: 1, pay: "50" }],
        },
      ],
      stores: [
        { post: "home", region: "veneto", goods: { bricks, planks: 5 } },
        { post: "far", region: "lombardia", goods: { bricks: 50 } },
      ],
      vehicles: {
        mine: [
          { id: "c", at: "home", legs: [], loads: [], capacity },
          { id: "away", at: "home", legs: [{ to: "city:padova" }], loads: [], capacity: 4 },
        ],
      },
    },
  } as unknown as EmpirePayload;
}

describe("a round drawn by finger (the gameplay audit, P1)", () => {
  it("loads each town touched in order, the best paid first, the stock shared along the way", () => {
    const plan = planRound(payload(), "c", ["padova", "venezia"]);
    expect(plan.stops).toEqual([
      { city: "padova", orderIds: ["p2", "p1"], pay: 800n },
      { city: "venezia", orderIds: ["v1"], pay: 900n },
    ]);
    expect(plan.pay).toBe(1700n);
    expect(plan.room).toBe(0);
    expect(plan.open).toEqual([]);
  });

  it("leaves a town out when the stock left no longer covers it, and says where the finger may go", () => {
    const plan = planRound(payload(4, 10), "c", ["padova"]);
    expect(plan.stops[0]?.orderIds).toEqual(["p2", "p1"]);
    // The bricks are gone to Padua: Venice is no longer open; Milan is served by another fondaco.
    expect(plan.open).toEqual([]);
    expect(planRound(payload(4, 10), "c", []).open).toEqual(["padova", "venezia"]);
    expect(planRound(payload(4, 10), "c", ["padova", "venezia"]).stops).toHaveLength(1);
  });

  it("is nothing for a vehicle away, or a town another fondaco serves", () => {
    expect(planRound(payload(), "away", ["padova"]).stops).toEqual([]);
    expect(planRound(payload(), "c", ["milano"]).stops).toEqual([]);
  });
});

describe("a round waiting in its dock", () => {
  it("says its towns in order with their crates, and « Partir » with what it pays", () => {
    const html = renderToStaticMarkup(
      RoundDock({
        p: payload(),
        round: { vehicleId: "c", cities: ["padova", "venezia"], drawing: false },
        busy: false,
        onGo: () => undefined,
        onCancel: () => undefined,
      }),
    );
    expect(html).toContain('data-round-dock="padova,venezia"');
    expect(html.indexOf("Padoue")).toBeLessThan(html.indexOf("Venise"));
    expect(html).toContain("×2");
    expect(html).toContain("Partir");
    expect(html).toContain("La soute est pleine.");
  });
});

describe("the Campo, a stop of the round (the supply by road, 8 November 2026)", () => {
  const withCampo = () => {
    const p = payload(4, 30);
    (p.view as unknown as { campo: unknown }).campo = {
      orders: [{ id: "c1", good: "bricks", qty: 10 }],
      posts: ["home"],
      store: {},
      point: [10, 10],
    };
    return p;
  };
  it("is open to the finger and loads its orders, paid nothing", () => {
    expect(planRound(withCampo(), "c", []).open).toContain("campo");
    const plan = planRound(withCampo(), "c", ["padova", "campo"]);
    expect(plan.stops.map((s) => s.city)).toEqual(["padova", "campo"]);
    expect(plan.stops[1]).toEqual({ city: "campo", orderIds: ["c1"], pay: 0n });
  });
});
