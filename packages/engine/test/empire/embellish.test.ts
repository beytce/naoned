import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The Seals' use (docs/plan-publication.md D2, I5): embellishments round the Fondaco, bought with
// Seals, seen on the map, worth nothing else (golden rule 4: never yield).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [] },
  embellishments: { well: 1, statue: 3 },
};

function world(seals: number) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  const h = w.state.empire?.houses.a as EmpireHouse;
  w.state = {
    ...w.state,
    empire: {
      ...(w.state.empire as NonNullable<typeof w.state.empire>),
      houses: { ...w.state.empire?.houses, a: { ...h, seals } },
    },
  };
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("an embellishment bought with Seals", () => {
  it("stands by the Fondaco for its Seals, once, and shows in the view", () => {
    const w = world(4);
    w.do({ type: "empireEmbellish", playerId: "a", code: "statue" });
    expect(house(w).seals).toBe(1);
    expect(house(w).embellishments).toEqual(["statue"]);
    expect(empireView(w.ctx, w.state, "a", w.now)?.embellishments).toEqual({
      owned: ["statue"],
      prices: { well: 1, statue: 3 },
    });
    expect(error(w.try({ type: "empireEmbellish", playerId: "a", code: "statue" }))).toBe(
      "already_bought",
    );
  });

  it("refuses an unknown one, or without the Seals", () => {
    const w = world(0);
    expect(error(w.try({ type: "empireEmbellish", playerId: "a", code: "well" }))).toBe(
      "insufficient_seals",
    );
    expect(error(w.try({ type: "empireEmbellish", playerId: "a", code: "castle" }))).toBe(
      "unknown_use",
    );
  });
});
