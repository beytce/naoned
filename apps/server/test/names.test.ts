import { describe, expect, it } from "vitest";
import { FIRST_NAMES, TRADES, proposedNames } from "../src/auth/names.js";
import { pseudoSchema } from "../src/auth/service.js";
import { FAMILY_NAMES, HOUSES } from "../src/game/bots.js";

describe("the names proposed to newcomers", () => {
  it("never carry a house of the computer nor a patrician family", () => {
    const houses = [...HOUSES, ...FAMILY_NAMES].map((h) => h.toLowerCase());
    for (const word of [...FIRST_NAMES, ...TRADES.flatMap((t) => t.split("_"))])
      expect(houses, word).not.toContain(word.toLowerCase());
  });

  it("all fit the pseudo's rule, enough of them", () => {
    const names = proposedNames();
    expect(names.length).toBeGreaterThan(100);
    for (const n of names) expect(pseudoSchema.safeParse(n).success, n).toBe(true);
  });
});
