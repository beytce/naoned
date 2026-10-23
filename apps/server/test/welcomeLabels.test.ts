import { describe, expect, it } from "vitest";
import { fr } from "../../web/src/i18n.js";
import { INCOME_REASONS } from "../src/game/welcome.js";

describe("the welcome back's commerce", () => {
  it("has a label in the game for every reason it counts", () => {
    const missing = INCOME_REASONS.filter((r) => !fr.game.welcome.sources[r]);
    expect(missing).toEqual([]);
  });
});
