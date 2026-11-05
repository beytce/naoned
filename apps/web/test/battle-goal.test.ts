import { describe, expect, it } from "vitest";
import { battleGoal, relicStep } from "../src/empire/porta/goal.js";
import type { BattleSnapshot } from "../src/empire/porta/types.js";

const unit = (id: string, outcome: string, cargo: string[], mine = true) => ({
  id,
  owner: mine ? "a" : "b",
  mine,
  role: "transport",
  x: 0,
  y: 0,
  hp: 1,
  maxHp: 1,
  outcome,
  goal: null,
  cargo,
  capacity: 2,
  loading: null,
  shield: 0,
  hiddenUntil: 0,
  weapons: [],
  actives: [],
});

const battle = {
  cities: [
    { id: "c1", x: 0, y: 0, relics: { common: 2, rare: 0, precious: 1, legendary: 0 } },
    { id: "c2", x: 1, y: 0, relics: { common: 0, rare: 1, precious: 0, legendary: 0 } },
  ],
  units: [
    unit("out", "exited", ["common", "rare"]),
    unit("in", "in", ["legendary"]),
    unit("dead", "dead", ["precious"]),
    unit("theirs", "exited", ["legendary"], false),
  ],
} as unknown as BattleSnapshot;

describe("the battle's goal (the refonte claire, lot 4)", () => {
  it("counts the player's relics out, aboard and in the towns, the best first", () => {
    expect(battleGoal(battle)).toEqual({
      home: ["rare", "common"],
      aboard: ["legendary"],
      left: ["precious", "rare", "common", "common"],
    });
  });
});

describe("the relics' next step (relicStep)", () => {
  const combat = { ...unit("cb", "in", []), role: "combat" };
  const field = (t: Record<string, unknown>, chests = 1) =>
    ({
      cities: [
        { id: "c1", x: 0, y: 0, relics: { common: chests, rare: 0, precious: 0, legendary: 0 } },
      ],
      units: [combat, { ...unit("tr", "in", []), ...t }],
    }) as unknown as BattleSnapshot;

  it("asks for the transport while the combat vehicle is chosen", () => {
    expect(relicStep(field({}), "cb")).toBe("chooseTransport");
  });
  it("then a town, then the way, then the loading", () => {
    expect(relicStep(field({}), "tr")).toBe("touchTown");
    expect(relicStep(field({ goal: { x: 1, y: 1 } }), "tr")).toBe("onTheWay");
    expect(relicStep(field({ loading: { cityId: "c1", rarity: "common", doneAt: 9 } }), "cb")).toBe(
      "loading",
    );
  });
  it("sends it to the gate once full, or once no chest is left", () => {
    expect(relicStep(field({ cargo: ["common", "rare"] }), "tr")).toBe("toGate");
    expect(relicStep(field({ cargo: ["common"] }, 0), "tr")).toBe("toGate");
    expect(relicStep(field({}, 0), "tr")).toBeNull();
  });
});
