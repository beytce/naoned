import { describe, expect, it } from "vitest";
import {
  type Command,
  type EmpireSettingsInput,
  carnetWeek,
  hexDistance,
  hexNeighbors,
  isContesaWeek,
  terraWeekStart,
} from "../../src/index.js";
import { testEmpire, testTerraferma } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The switch of 9 November 2026 (lot T7, the owner's decision): the week's theatres opened on the
// hexagons are made again on the square grid at the first command after the switch; their members
// stay, their places are gone, the entry is not taken twice; each member is told.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  terra: {
    entry: { wheat: 5 },
    theatreMax: 2,
    rationBread: 3,
    favour: { signore: 60, podium: 30, top10: 15, quarter: 8, participant: 4 },
    seals: { signore: 2, podium: 1 },
    sealsPerWeek: 2,
    contesa: {
      rosterSizes: [2],
      deadlineDay: 3,
      maxCompanies: 4,
      sealsPerMember: 1,
      winnerSeals: 1,
      aloneBps: 5_000,
      lustre: 10,
    },
  },
};
const terra = (grid: "hex" | "square") => ({
  ...testTerraferma,
  live: true,
  grid,
  start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2, placementHours: 24 },
});
const cmd = (c: Record<string, unknown>) => c as unknown as Command;

describe("the switch to the square grid, this week", () => {
  it("makes the week's theatres again on the new grid, its members kept, their places gone", () => {
    const w = new World(makeContext({ empire, terraferma: terra("hex") }));
    w.do({ type: "empireJoin", playerId: "a" });
    w.give("a", "wheat", 20);
    let week = carnetWeek(w.now) + 1;
    if (isContesaWeek(week)) week++;
    w.now = terraWeekStart(week) + HOUR;
    w.do(cmd({ type: "empireTerraJoin", playerId: "a" }));
    const map = w.state.empire?.terra?.theatres[0]?.map;
    if (!map) throw new Error("no theatre");
    const cell = map.owner.findIndex(
      (o, c) =>
        o === null &&
        map.map.land[c] &&
        hexNeighbors(map.map, c).length === 6 &&
        map.owner.every((x, j) => x === null || hexDistance(map.map, c, j) >= 3),
    );
    w.do(cmd({ type: "empireTerra", playerId: "a", action: { type: "terraPlace", cell } }));
    const wheat = w.state.inventories.a?.wheat?.available;
    // The switch: the same world, the settings of the square grid.
    const after = Object.assign(w, {
      ctx: makeContext({ empire, terraferma: terra("square") }),
    }) as World;
    after.now = w.now + HOUR;
    const res = after.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    const th = after.state.empire?.terra?.theatres[0];
    expect(th?.cfg.grid).toBe("square");
    expect(th?.map.map.grid).toBe("square");
    expect(th?.members).toEqual(["a"]);
    expect(th?.map.players.a).toBeUndefined();
    expect(after.state.inventories.a?.wheat?.available).toBe(wheat);
    expect(res.effects.events.some((e) => e.type === "terra_reformed" && e.playerId === "a")).toBe(
      true,
    );
    // Once: the next command leaves it as it is.
    const again = after.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    expect(again.effects.events.some((e) => e.type === "terra_reformed")).toBe(false);
  });
});
