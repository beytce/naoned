import { describe, expect, it } from "vitest";
import { rivalLine } from "../src/game/rival.js";

const rival = {
  pseudo: "Comm884",
  bot: true,
  character: null,
  gain: "12000",
  mine: "0",
  ahead: true,
};

describe("the rival's line on the HUD", () => {
  it("waits for the merchant's first sale of the week", () => {
    expect(rivalLine(rival)).toBeNull();
  });

  it("says who and how far once the merchant has sold", () => {
    expect(rivalLine({ ...rival, mine: "2000" })).toContain("Comm884");
  });
});
