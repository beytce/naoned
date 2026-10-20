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

  it("open the market and the ranking after the first delivery", () => {
    expect(unlocks(["produce", "harvest", "sell_city"], false, 0)).toMatchObject({
      rialto: true,
      ranking: true,
      terraferma: false,
      house: false,
    });
  });

  it("open the Terraferma after a first day of trade, once a delivery is made", () => {
    const day = 24 * 3_600_000;
    expect(unlocks(["sell_city"], false, day - 1).terraferma).toBe(false);
    expect(unlocks(["sell_city"], false, day).terraferma).toBe(true);
    expect(unlocks([], true, day).terraferma).toBe(false);
  });

  it("open the house once the market is learned", () => {
    expect(unlocks(["produce", "harvest", "sell_city", "market_buy"], false).house).toBe(true);
  });

  it("open the rest when the guide is paused or done", () => {
    const { terraferma, ...rest } = unlocks([], true);
    expect(Object.values(rest).every(Boolean)).toBe(true);
    expect(terraferma).toBe(false);
  });
});
