import { describe, expect, it } from "vitest";
import { bestNowOf } from "../src/empire/map/BestNow.js";
import type { EmpirePayload } from "../src/empire/types.js";

function payload(bread = 20, orders = true): EmpirePayload {
  return {
    cash: "25000",
    now: 0,
    stock: {},
    view: {
      house: { casa: 2 },
      nextCasa: { cost: "100000" },
      orders: orders
        ? [
            {
              city: "padova",
              posts: ["home"],
              orders: [
                { id: "o1", good: "bread", qty: 10, pay: "30000" },
                { id: "o2", good: "cloth", qty: 5, pay: "90000" },
              ],
            },
          ]
        : [],
      stores: [{ post: "home", region: "veneto", goods: { bread } }],
      vehicles: { mine: [{ id: "v1", at: "home", legs: [], loads: [], capacity: 2 }] },
      carnet: { week: 1, objectives: [], carried: [], windUntil: null },
    },
  } as unknown as EmpirePayload;
}

describe("the card « le mieux maintenant » (the refonte claire, 5 November 2026)", () => {
  it("delivers now what the stock covers, on a free vehicle, at its pay", () => {
    expect(bestNowOf(payload())).toMatchObject({
      kind: "deliver",
      city: "padova",
      crates: 1,
      pay: 30000n,
      picks: ["o1"],
      vehicle: "v1",
    });
  });

  it("else shows the town of the best orders, all its crates and their pay", () => {
    expect(bestNowOf(payload(0))).toMatchObject({
      kind: "order",
      city: "padova",
      crates: 2,
      pay: 120000n,
    });
  });

  it("else aims at the next Casa with the purse's share of it", () => {
    expect(bestNowOf(payload(0, false))).toEqual({ kind: "casa", level: 3, share: 0.25 });
  });
});
