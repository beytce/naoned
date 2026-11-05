import { describe, expect, it } from "vitest";
import { handTargets } from "../src/empire/hand.js";

describe("Lorenzo's hand (the gameplay audit, P4)", () => {
  it("points at the object itself first, the place's tab that leads there after", () => {
    expect(
      handTargets({ kind: "collect", lots: 2, action: { type: "empireRelaunchAll" } }),
    ).toEqual(["[data-workshop][data-ready]", "[data-place-tab=fondaco]"]);
    expect(
      handTargets({
        kind: "upgrade",
        workshopId: "w7",
        type: "farm",
        level: 2,
        action: { type: "empireUpgrade", workshopId: "w7" },
      })[0],
    ).toBe('[data-workshop="w7"]');
  });

  it("points nowhere while one waits", () => {
    expect(handTargets({ kind: "wait", at: null })).toEqual([]);
  });
});
