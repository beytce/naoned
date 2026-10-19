import { describe, expect, it } from "vitest";
import { unlocks } from "../src/game/unlocks.js";

describe("the first session's unlocks", () => {
  it("keep the newcomer on the counter, the cities and the cargoes", () => {
    expect(unlocks(["produce", "harvest"], false)).toEqual({
      rialto: false,
      ranking: false,
      terraferma: false,
      house: false,
    });
  });

  it("open the market, the ranking and the Terraferma after the first delivery", () => {
    expect(unlocks(["produce", "harvest", "sell_city"], false)).toMatchObject({
      rialto: true,
      ranking: true,
      terraferma: true,
      house: false,
    });
  });

  it("open the house once the market is learned", () => {
    expect(unlocks(["produce", "harvest", "sell_city", "market_buy"], false).house).toBe(true);
  });

  it("open everything when the guide is paused or done", () => {
    expect(Object.values(unlocks([], true)).every(Boolean)).toBe(true);
  });
});
