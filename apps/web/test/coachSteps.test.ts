import { describe, expect, it } from "vitest";
import { doneSteps } from "../src/game/Coach.js";

describe("the guide's steps", () => {
  it("count a delivery arrived as sold, before the server's tick marks it", () => {
    const tutorial = ["produce", "harvest", "transform"];
    expect(doneSteps(tutorial, [{ arriveAt: 1_000 }], 999).has("sell_city")).toBe(false);
    expect(doneSteps(tutorial, [{ arriveAt: 1_000 }], 1_000).has("sell_city")).toBe(true);
    expect(doneSteps(tutorial, [], 5_000).has("sell_city")).toBe(false);
  });
});
