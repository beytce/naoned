import {
  type EmpireHouse,
  interiorsOf,
  parseEmpireSettings,
  presetInterior,
  venice1450EmpireInterior,
} from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import {
  advise,
  moveSpots,
  placeSpots,
  settingsOf,
  unitsOf,
  workshopOf,
} from "../src/empire/interior/reckon.js";
import type { InteriorRules } from "../src/empire/types.js";

// The screen's own reckoning of an inside (docs/plan-ateliers.md lot A6), from the rules as the
// server sends them (money as strings): the same rate as the engine's, the spots of a move or of a
// new station, Lorenzo's advice.
const s0 = parseEmpireSettings(venice1450EmpireInterior);
const rules = JSON.parse(
  JSON.stringify(s0.interior, (_, x) => (typeof x === "bigint" ? x.toString() : x)),
) as InteriorRules;
const s = settingsOf(rules);

function sawmill() {
  const house = {
    workshops: [
      {
        id: "w1",
        type: "sawmill",
        recipe: "",
        level: 1,
        job: null,
        interior: presetInterior("sawmill", s0, 0),
      },
    ],
    staff: [],
  } as unknown as EmpireHouse;
  const v = interiorsOf(house, s0, 0).w1;
  if (!v) throw new Error("no inside");
  return { v, ws: workshopOf("w1", "sawmill", 1, v) };
}

describe("the screen's reckoning", () => {
  it("gives the engine's rate from the rules the server sends", () => {
    const { v, ws } = sawmill();
    expect(unitsOf(ws, s, 0)).toBe(v.rate.unitsMilliPerHour);
  });

  it("finds where a station may move, never on the canal nor on another", () => {
    const { ws } = sawmill();
    const spots = moveSpots(ws, s, "s4", { w: 4, h: 3 }, 0);
    expect(spots.length).toBeGreaterThan(0);
    for (const p of spots) {
      expect(p.x).not.toBe(3);
      expect([p.x, p.y]).not.toEqual([0, 0]);
    }
  });

  it("foresees a second saw bench raising the rate: the saw is the bottleneck", () => {
    const { ws } = sawmill();
    const spots = placeSpots(ws, s, "saw_bench", { w: 4, h: 3 }, 0);
    expect(spots.length).toBeGreaterThan(0);
    expect(Math.max(...spots.map((p) => p.units))).toBeGreaterThan(unitsOf(ws, s, 0));
  });

  it("advises the one move that betters the rate most, or nothing", () => {
    const { ws } = sawmill();
    const a = advise(ws, s, { w: 4, h: 3 }, 0);
    if (a) expect(a.units).toBeGreaterThan(unitsOf(ws, s, 0));
  });
});
