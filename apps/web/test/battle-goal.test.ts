import { describe, expect, it } from "vitest";
import { battleGoal } from "../src/empire/porta/goal.js";
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
