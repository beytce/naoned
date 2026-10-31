import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireView,
  levelCost,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext, openLombardy } from "../helpers.js";

// The fixture's Lombardy: Casa 4, 6 hours from Venice, 3 workshop places, three cities on the map,
// iron made at 900, salt asked at 700, 30 units of private book.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  counters: { maxLevel: 10, bookStepBps: 5_000, costTimes: 4 },
};
const s = parseEmpireSettings(empire);

function world(casa = 4, favour = 0) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a", favour });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}

const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("a counter put down on the map (step 2)", () => {
  it("asks a land cell the house sees, of a region its Casa has reached", () => {
    const w = world();
    expect(error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" }))).toBe(
      "hidden_cell",
    );
    expect(error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "2,0" }))).toBe(
      "unknown_cell",
    );
    const low = world(3);
    low.do({ type: "empirePlaceCounter", playerId: "a", cell: "1,0" });
    low.advance(HOUR);
    expect(error(low.try({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" }))).toBe(
      "requirement_unmet",
    );
  });

  it("reveals the cells around it once it stands, and costs more for each one down", () => {
    const w = world();
    const first = cash(w);
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "1,0" });
    expect(cash(w)).toBe(first - levelCost(1, s) * 4n);
    expect(house(w).revealed).not.toContain("3,0");
    w.advance(HOUR);
    expect(house(w).revealed).toContain("3,0");
    expect(house(w).posts).toEqual([{ cell: "1,0", region: "veneto" }]);
    const before = cash(w);
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" });
    // The second counter: Lombardy's charter of before, a quarter dearer.
    expect(cash(w)).toBe(before - (levelCost(4, s) * 4n * 12_500n) / 10_000n);
    // The opening voyage: six hours from Venice, and an hour to build.
    expect(house(w).builds[0]?.endsAt).toBe(w.now + 7 * HOUR);
    expect(house(w).counters?.lombardia).toBeUndefined();
    w.advance(7 * HOUR);
    expect(house(w).counters?.lombardia).toBe(1);
    expect(house(w).revealed).toContain("4,0");
    expect(error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" }))).toBe("built");
  });

  it("raises its region's counter, up to its last level", () => {
    const w = world();
    openLombardy(w);
    const before = cash(w);
    w.do({ type: "empireUpgradeCounter", playerId: "a", region: "lombardia" });
    expect(cash(w)).toBe(before - levelCost(2, s) * 4n);
    w.advance(30 * MIN);
    expect(house(w).counters?.lombardia).toBe(2);
    expect(error(w.try({ type: "empireUpgradeCounter", playerId: "a", region: "friuli" }))).toBe(
      "unknown_region",
    );
  });
});

describe("the workshops of a region", () => {
  function lombardy() {
    const w = world();
    openLombardy(w);
    return w;
  }
  const build = (w: World, workshopType: string, recipe: string, region?: string) =>
    w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType,
      recipe,
      ...(region ? { region } : {}),
    });

  it("are built only where the house has a counter", () => {
    expect(error(build(world(), "mill", "mill_flour", "lombardia"))).toBe("unknown_region");
    const w = lombardy();
    expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("");
    w.advance(HOUR);
    expect(house(w).workshops.at(-1)?.region).toBe("lombardia");
  });

  it("make there only the raw goods the region makes", () => {
    expect(error(build(lombardy(), "farm", "grow_wheat", "lombardia"))).toBe("unknown_recipe");
  });

  it("fill the counter's places, not the Casa's", () => {
    const w = lombardy();
    for (let i = 0; i < 3; i++) {
      expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("");
      w.advance(HOUR);
    }
    expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("no_room");
    expect(error(build(w, "mill", "mill_flour"))).toBe("");
  });
});

describe("the regions in the view", () => {
  it("say what a counter there costs, then the counter's next level", () => {
    const w = world();
    const at = () =>
      empireView(w.ctx, w.state, "a", w.now)?.regions.find((r) => r.code === "lombardia");
    expect(at()).toMatchObject({ next: null, postCost: levelCost(4, s) * 4n, counter: 0 });
    expect(at()?.cities).toEqual({ found: 0, all: 3 });
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "1,0" });
    w.advance(HOUR);
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" });
    expect(at()?.buildingUntil).toBe(w.now + 7 * HOUR);
    w.advance(7 * HOUR);
    expect(at()).toMatchObject({ counter: 1, next: { level: 2 }, cities: { found: 2, all: 3 } });
  });
});
