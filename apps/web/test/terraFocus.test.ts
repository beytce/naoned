import { describe, expect, it } from "vitest";
import { P } from "../src/art/palette.js";
import {
  FOCUS_ORDER,
  type Focus,
  enemiesOf,
  focusOf,
  territoryLook,
} from "../src/game/terraShapes.js";

const merchant = { me: false, ally: false, milan: false };

describe("the Terraferma's focus", () => {
  it("names the merchant's enemies: who marches on him, and whom he marches on", () => {
    const fronts = [
      { owner: 3, against: 0, mine: false, threat: true },
      { owner: 0, against: 5, mine: true, threat: false },
      { owner: 4, against: 6, mine: false, threat: false },
    ];
    expect([...enemiesOf(fronts, 0)].sort()).toEqual([3, 5]);
  });

  it("places each holder: Milan, the merchant, allies, enemies, neighbours, the others", () => {
    const around = new Set([2, 3]);
    const enemies = new Set([3, 7]);
    const of = (i: number, h = merchant, cells = 10) => focusOf(h, i, cells, around, enemies);
    expect(of(0, { ...merchant, me: true })).toBe("me");
    expect(of(1, { ...merchant, milan: true })).toBe("milan");
    expect(of(2, { ...merchant, ally: true })).toBe("ally");
    expect(of(3)).toBe("enemy");
    expect(of(7)).toBe("enemy");
    expect(of(2)).toBe("neighbour");
    expect(of(9)).toBe("other");
    expect(of(9, merchant, 2)).toBe("faint");
  });

  it("keeps gold for the merchant's land and lagoon for his allies", () => {
    const all: Focus[] = ["me", "ally", "enemy", "neighbour", "milan", "other", "faint"];
    const looks = Object.fromEntries(
      all.map((f) => [f, territoryLook({ focus: f, tone: "#8E6BD8" }, false)]),
    );
    const wears = (f: Focus, c: string) => looks[f]?.fill === c || looks[f]?.stroke === c;
    for (const f of all) {
      expect(wears(f, P.gold)).toBe(f === "me");
      expect(wears(f, P.lagoon)).toBe(f === "ally");
    }
    expect(looks.enemy?.stroke).toBe(P.vermilion);
  });

  it("draws the merchant's land last, over all the others", () => {
    const top = Math.max(...Object.values(FOCUS_ORDER));
    expect(FOCUS_ORDER.me).toBe(top);
  });
});
