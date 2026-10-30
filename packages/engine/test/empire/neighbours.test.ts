import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// Four workshops on Venice's orbit: the farm feeds the mill; the orbit is a ring.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  workshops: { ...testEmpire.workshops, neighbourBps: 1_000 },
  start: {
    capitalDucats: 0,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "clay_pit", recipe: "dig_clay" },
      { type: "mill", recipe: "mill_flour" },
      { type: "lumber_camp", recipe: "cut_wood" },
    ],
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const ws = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops ?? [];
const wheatIn = (w: World) => {
  const farm = ws(w)[0]?.id === undefined ? "" : (ws(w).find((x) => x.type === "farm")?.id ?? "");
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
  w.advance(HOUR);
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
  return w.state.inventories.a?.wheat?.available ?? 0;
};
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the neighbourhoods", () => {
  it("give nothing to workshops whose chains do not follow", () => {
    expect(wheatIn(world())).toBe(20);
  });

  it("give both a share more when they sit side by side and one feeds the other", () => {
    const w = world();
    const [farm, clay, mill] = ws(w);
    w.do({ type: "empireSwap", playerId: "a", a: clay?.id ?? "", b: mill?.id ?? "" });
    expect(ws(w).map((x) => x.type)).toEqual(["farm", "mill", "clay_pit", "lumber_camp"]);
    expect(farm).toBeDefined();
    expect(wheatIn(w)).toBe(22);
  });

  it("swap only two workshops of the same region", () => {
    const w = world();
    const [farm] = ws(w);
    expect(error(w.try({ type: "empireSwap", playerId: "a", a: farm?.id ?? "", b: "nope" }))).toBe(
      "unknown_building",
    );
  });
});
