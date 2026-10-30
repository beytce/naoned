import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, World, makeContext } from "../helpers.js";

// T0 is Monday 5 January 2026: the first quarter. The second opens on 1 April, in Paris.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 0, workshops: [] },
  staff: {
    hireCostDucats: 0,
    hireGrowthBps: 10_000,
    slotsBase: 1,
    casaPerSlot: 4,
    xpPerLevel: 10,
    maxLevel: 30,
    tierEvery: 5,
    rarityBps: { common: 10_000, rare: 15_000 },
    roles: {
      master: { place: "workshop", perLevel: {}, paths: [] },
      factor: { place: "region", perLevel: {}, paths: [] },
    },
  },
  family: {
    roles: ["factor", "master"],
    rarity: "rare",
    traits: [
      { code: "mercanti", effects: { book: 1_000 } },
      { code: "navigatori", effects: { speed: 500 } },
    ],
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const trait = (w: World, code: string) =>
  w.try({ type: "empireLineage", playerId: "a", trait: code });

describe("the family", () => {
  it("passes a generation each quarter: a point of Heritage, a member of the family to the staff", () => {
    const w = world();
    expect(house(w).generation).toMatchObject({ number: 1 });
    w.advance(90 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(house(w).generation?.number).toBe(2);
    expect(house(w).heritage).toBe(1);
    expect(house(w).staff?.[0]).toMatchObject({ role: "factor", rarity: "rare" });
    expect(house(w).staff?.[0]?.family).toBeTruthy();
  });

  it("opens a lineage trait for each point of Heritage, each once", () => {
    const w = world();
    expect(error(trait(w, "mercanti"))).toBe("too_early");
    w.advance(90 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(error(trait(w, "nope"))).toBe("unknown_choice");
    expect(error(trait(w, "mercanti"))).toBe("");
    expect(error(trait(w, "navigatori"))).toBe("too_early");
    w.advance(92 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(error(trait(w, "mercanti"))).toBe("built");
    expect(error(trait(w, "navigatori"))).toBe("");
    expect(house(w).lineage).toEqual(["mercanti", "navigatori"]);
  });
});
