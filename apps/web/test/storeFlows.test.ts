import { describe, expect, it } from "vitest";
import { flowsOf } from "../src/empire/Store.js";
import type { EmpirePayload } from "../src/empire/types.js";

// The Warehouse's table (P2-03 of the players' audit): made and used an hour, from the queues.
describe("the flows of the Warehouse", () => {
  it("counts each running queue's lots an hour, outputs made and inputs used", () => {
    const job = (batchMs: number) => ({ recipe: "", startedAt: 0, batches: 4, level: 1, batchMs });
    const p = {
      catalog: [
        {
          type: "camp",
          name: "",
          recipes: [{ code: "cut", inputs: {}, outputs: { wood: 12 }, minutes: 30 }],
        },
        {
          type: "mill",
          name: "",
          recipes: [{ code: "saw", inputs: { wood: 10 }, outputs: { planks: 6 }, minutes: 30 }],
        },
      ],
      view: {
        house: {
          workshops: [
            { id: "a", type: "camp", recipe: "cut", level: 1, job: job(1_800_000) },
            { id: "b", type: "mill", recipe: "saw", level: 1, job: job(3_600_000) },
            { id: "c", type: "mill", recipe: "saw", level: 1, job: null },
          ],
        },
      },
    } as unknown as EmpirePayload;
    const f = flowsOf(p);
    expect(f.get("wood")).toEqual({ made: 24, used: 10 });
    expect(f.get("planks")).toEqual({ made: 6, used: 0 });
  });
});
