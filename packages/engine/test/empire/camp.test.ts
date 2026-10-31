import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The Campo opens the Terraferma (decision of the owner, 31 October 2026): put on a land cell the
// house sees, from the Casa 4 of the fixture's map.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [] },
  map: { ...testEmpire.map, camp: { costDucats: 300, casa: 4, minutes: 60 } },
};

function world(casa = 4) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the Campo, the door of the Terraferma", () => {
  it("asks its Casa, a land cell the house sees, and stands an hour later", () => {
    expect(error(world(3).try({ type: "empireBuildCamp", playerId: "a", cell: "1,0" }))).toBe(
      "requirement_unmet",
    );
    const w = world();
    expect(error(w.try({ type: "empireBuildCamp", playerId: "a", cell: "2,0" }))).toBe(
      "unknown_cell",
    );
    expect(error(w.try({ type: "empireBuildCamp", playerId: "a", cell: "3,1" }))).toBe(
      "hidden_cell",
    );
    w.do({ type: "empireBuildCamp", playerId: "a", cell: "1,0" });
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.sites).toEqual([
      expect.objectContaining({ kind: "camp", cell: "1,0" }),
    ]);
    w.advance(HOUR);
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.camp).toBe("1,0");
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.campSite).toBeNull();
    expect(error(w.try({ type: "empireBuildCamp", playerId: "a", cell: "0,1" }))).toBe("built");
  });

  it("keeps the Terraferma shut without it", () => {
    const w = world();
    expect(error(w.try({ type: "empireTerraJoin", playerId: "a" }))).toBe("no_camp");
  });

  it("is given to a house of before that already played the Terraferma", () => {
    const s = parseEmpireSettings(empire);
    const h = {
      casa: 6,
      terraBest: "gold",
      workshops: [],
      builds: [],
    } as unknown as EmpireHouse;
    ensureMap(h, s);
    expect(h.camp).toBe("0,0");
  });
});
