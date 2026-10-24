import { describe, expect, it } from "vitest";
import { defaultBatches } from "../src/game/workshops.js";

describe("the batches a workshop's sheet proposes", () => {
  it("are one while the guide lasts, so the first lots come back fast", () => {
    expect(defaultBatches(["produce", "harvest"], 6)).toBe(1);
  });
  it("are all it can start once the guide is done (« invest » was never recorded)", () => {
    const done = ["produce", "harvest", "transform", "sell_city", "market_buy", "mission"];
    expect(defaultBatches(done, 6)).toBe(6);
    expect(defaultBatches(done, 0)).toBe(1);
  });
});
