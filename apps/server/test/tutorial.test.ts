import { type GameEvent, venice1450 } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { TUTORIAL_STEPS, stepsReached } from "../src/game/tutorial.js";

const event = (type: string, data: Record<string, unknown> = {}) =>
  ({ type, playerId: "a", at: 0, data }) as GameEvent;

describe("the guide's steps", () => {
  it("count the first upgrade of a workshop, between the purchase and the ledger", () => {
    expect(TUTORIAL_STEPS.indexOf("invest")).toBe(TUTORIAL_STEPS.indexOf("market_buy") + 1);
    expect(TUTORIAL_STEPS.at(-1)).toBe("mission");
    expect([...stepsReached(venice1450, [event("upgrade", { level: 2 })])]).toEqual(["invest"]);
  });
});
