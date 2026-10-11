import { describe, expect, it } from "vitest";
import { World, makeContext } from "./helpers.js";

const band = { priceBand: { minBps: 2_500, maxBps: 40_000 } };

function offer(w: World, side: "buy" | "sell", price: bigint) {
  return w.try({
    type: "placeOrder",
    playerId: "a",
    resource: "wheat",
    side,
    kind: "limit",
    price,
    quantity: 1,
  });
}

describe("price band of offers between players", () => {
  it("refuses offers far from the reference price, so ducats cannot be passed on", () => {
    const w = new World(makeContext(band));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "wheat", 10);
    // Reference 100 deniers: from 25 to 400.
    expect(offer(w, "sell", 25n).ok).toBe(true);
    expect(offer(w, "sell", 400n).ok).toBe(true);
    const low = offer(w, "sell", 24n);
    expect(low.ok ? "" : low.error).toBe("price_out_of_band");
    const high = offer(w, "buy", 401n);
    expect(high.ok ? "" : high.error).toBe("price_out_of_band");
  });

  it("is off unless the world sets it", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "wheat", 10);
    expect(offer(w, "sell", 10_000n).ok).toBe(true);
  });
});
