import { describe, expect, it } from "vitest";
import { foresee } from "../src/empire/foresee.js";
import type { EmpirePayload } from "../src/empire/types.js";

const MIN = 60_000;

function payload(): EmpirePayload {
  return {
    cash: "0",
    now: 0,
    stock: { bricks: 2 },
    catalog: [
      {
        type: "brickworks",
        name: "Briqueterie",
        recipes: [{ code: "bake", inputs: {}, outputs: { bricks: 6 }, minutes: 30 }],
      },
    ],
    view: {
      house: {
        workshops: [
          {
            id: "w1",
            type: "brickworks",
            recipe: "bake",
            level: 2,
            job: { recipe: "bake", startedAt: 0, batches: 3, level: 2, batchMs: 30 * MIN },
          },
          {
            id: "w2",
            type: "brickworks",
            recipe: "bake",
            level: 1,
            job: { recipe: "bake", startedAt: 50 * MIN, batches: 1, level: 1, batchMs: 30 * MIN },
          },
        ],
      },
      upgrades: { w1: { yieldBps: 15_000 } },
      orders: [
        {
          city: "padova",
          orders: [
            { id: "o1", good: "bricks", qty: 6, pay: "100" },
            { id: "o2", good: "bricks", qty: 6, pay: "200" },
          ],
        },
      ],
      carnet: {
        objectives: [
          { kind: "relaunch", progress: 3, target: 3, claimed: false },
          { kind: "deliver", progress: 1, target: 10, claimed: false },
        ],
        carried: [{ kind: "sell", progress: 5, target: 5, claimed: false }],
      },
    },
  } as unknown as EmpirePayload;
}

describe("a gesture shown at once (the gameplay audit, P5)", () => {
  it("takes every ready lot into the store, the rest of the queue going on", () => {
    const next = foresee(payload(), { type: "empireRelaunchAll" }, 65 * MIN);
    // w1: two lots ready, 6 bricks each at 150 %; w2: none yet.
    expect(next?.stock.bricks).toBe(2 + 18);
    const [w1, w2] = next?.view?.house.workshops ?? [];
    expect(w1?.job).toMatchObject({ startedAt: 60 * MIN, batches: 1 });
    expect(w2).toEqual(payload().view?.house.workshops[1]);
  });

  it("takes one workshop's lots, and foresees nothing when none is ready", () => {
    const one = foresee(payload(), { type: "empireRelaunch", workshopId: "w1" }, 95 * MIN);
    expect(one?.stock.bricks).toBe(2 + 27);
    expect(one?.view?.house.workshops[0]?.job).toBeNull();
    expect(foresee(payload(), { type: "empireRelaunch", workshopId: "w2" }, 60 * MIN)).toBeNull();
  });

  it("takes the orders loaded out of their town", () => {
    const next = foresee(
      payload(),
      { type: "empireDeliverCity", city: "padova", orderIds: ["o2"] },
      0,
    );
    expect(next?.view?.orders[0]?.orders.map((o) => o.id)).toEqual(["o1"]);
  });

  it("seals an objective met, in the week's or the carried, never one unmet", () => {
    expect(
      foresee(payload(), { type: "empireClaim", index: 0 }, 0)?.view?.carnet.objectives[0],
    ).toMatchObject({ claimed: true });
    expect(
      foresee(payload(), { type: "empireClaim", index: 2 }, 0)?.view?.carnet.carried[0],
    ).toMatchObject({ claimed: true });
    expect(foresee(payload(), { type: "empireClaim", index: 1 }, 0)).toBeNull();
  });
});
