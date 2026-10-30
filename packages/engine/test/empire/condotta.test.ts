import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  condottaTierCap,
  empireHouseAt,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The Condotta of the empire: the tier n from the Casa n + 2; Seals for a won match a day.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  condotta: { casaOffset: 2, sealsByTier: [1, 2, 3] },
};

const seals = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now)?.seals ?? 0;
const won = (w: World, tier: number) => w.try({ type: "empireCondotta", playerId: "a", tier });

describe("the Condotta of the empire", () => {
  it("opens its tiers by the Casa", () => {
    const s = parseEmpireSettings(empire);
    expect(condottaTierCap(1, s, 12)).toBe(1);
    expect(condottaTierCap(3, s, 12)).toBe(1);
    expect(condottaTierCap(4, s, 12)).toBe(2);
    expect(condottaTierCap(20, s, 12)).toBe(12);
  });

  it("pays Seals by its tier, for one won match a day", () => {
    const w = new World(makeContext({ empire }));
    w.do({ type: "empireJoin", playerId: "a" });
    expect(won(w, 2).ok).toBe(true);
    expect(seals(w)).toBe(2);
    w.advance(HOUR);
    won(w, 3);
    expect(seals(w)).toBe(2);
    w.advance(DAY);
    // Past the table, its last value.
    won(w, 9);
    expect(seals(w)).toBe(5);
  });
});
