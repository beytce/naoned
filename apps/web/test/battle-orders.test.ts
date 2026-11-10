import { describe, expect, it } from "vitest";
import {
  convoyOf,
  marginS,
  moodOf,
  returnS,
  tell,
  thin,
  wayS,
} from "../src/empire/porta/orders.js";
import type { BattleSnapshot, PlayerUnitView } from "../src/empire/porta/types.js";

// What a touch orders in the battle (docs/plan-porta-jeu.md, lot A).
const mine = (over: Partial<PlayerUnitView>): PlayerUnitView =>
  ({
    side: "player",
    owner: "a",
    mine: true,
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    speedCenti: 600,
    outcome: "in",
    goal: null,
    route: [],
    follow: null,
    attack: null,
    exiting: false,
    cargo: [],
    capacity: 2,
    loading: null,
    shield: 0,
    hiddenUntil: 0,
    weapons: [],
    actives: [],
    ...over,
  }) as PlayerUnitView;

const lances = [{ effect: "lances", rangeCenti: 150, targetId: null }];
const battle = (over: Partial<BattleSnapshot> = {}): BattleSnapshot =>
  ({
    id: "b",
    tier: 1,
    timeMs: 0,
    endsAtMs: 600_000,
    over: false,
    radius: 8,
    gate: { x: -7.5, y: 0 },
    gateRadiusCenti: 100,
    stepMs: 250,
    cityRadiusCenti: 100,
    loadS: { common: 10, rare: 20, precious: 35, legendary: 60 },
    cities: [
      { id: "c0", x: 2, y: 1, relics: { common: 1, rare: 0, precious: 0, legendary: 0 } },
      { id: "c1", x: 4, y: 4, relics: { common: 0, rare: 0, precious: 0, legendary: 0 } },
    ],
    units: [
      mine({ id: "c", role: "combat", weapons: lances }),
      mine({ id: "t", role: "transport", follow: "c" }),
      {
        id: "r",
        side: "rome",
        kind: "crossbowman",
        x: 3,
        y: 1,
        hp: 10,
        maxHp: 10,
        state: "idle",
        targetId: null,
        rangeCenti: 200,
        visionCenti: 300,
        dead: false,
      },
    ],
    events: [],
    ...over,
  }) as BattleSnapshot;

describe("the orders a touch gives", () => {
  it("knows the convoy: the transport behind its fighter", () => {
    const c = convoyOf(battle());
    expect(c.joined).toBe(true);
    expect(c.combat?.id).toBe("c");
    const b = battle();
    (b.units[1] as PlayerUnitView).follow = null;
    expect(convoyOf(b).joined).toBe(false);
  });

  it("says « Charger ici » on a town with relics when a transport comes along, else « Aller »", () => {
    const b = battle();
    expect(tell(b, "c", { kind: "city", id: "c0" })).toMatchObject({
      word: "Charger ici",
      orders: [{ type: "move", unitId: "c", x: 2, y: 1 }],
    });
    // An empty town, or a fighter alone: a place to go like another.
    expect(tell(b, "c", { kind: "city", id: "c1" })?.word).toBe("Aller");
    (b.units[1] as PlayerUnitView).follow = null;
    expect(tell(b, "c", { kind: "city", id: "c0" })?.word).toBe("Aller");
    expect(tell(b, "t", { kind: "city", id: "c0" })?.word).toBe("Charger ici");
  });

  it("goes out by the gate, attacks Rome with a weapon and never without", () => {
    const b = battle();
    expect(tell(b, "c", { kind: "gate" })).toMatchObject({
      word: "Rentrer",
      orders: [{ type: "exit", unitId: "c" }],
    });
    expect(tell(b, "c", { kind: "rome", id: "r" })).toMatchObject({
      word: "Attaquer",
      orders: [{ type: "attack", unitId: "c", targetId: "r" }],
    });
    expect(tell(b, "t", { kind: "rome", id: "r" })).toMatchObject({ refused: true, orders: [] });
    expect(tell(b, "nope", { kind: "gate" })).toBeNull();
  });

  it("thins a way drawn by the finger to a few steps, its end kept", () => {
    const drawn = Array.from({ length: 41 }, (_, i) => ({ x: i * 0.25, y: 0 }));
    const way = thin(drawn, 5);
    expect(way.length).toBeLessThanOrEqual(5);
    expect(way.at(-1)).toEqual({ x: 10, y: 0 });
    expect(thin([{ x: 0, y: 0 }], 5)).toEqual([{ x: 0, y: 0 }]);
  });

  it("tells a way's seconds, the way back's, and what is left before turning back", () => {
    const b = battle({ timeMs: 500_000 });
    const c = b.units[0] as PlayerUnitView;
    // Six cases a minute: a case in ten seconds.
    expect(wayS(c, [{ x: 3, y: 4 }])).toBeCloseTo(50, 5);
    expect(returnS(b, c)).toBeCloseTo(65, 5);
    expect(marginS(b, c)).toBeCloseTo(35, 5);
  });

  it("says in a word what a vehicle does", () => {
    const b = battle();
    const [c, t, r] = b.units as [
      PlayerUnitView,
      PlayerUnitView,
      { state: string; targetId: string },
    ];
    expect(moodOf(b, c)).toBe("idle");
    expect(moodOf(b, t)).toBe("follow");
    c.goal = { x: 1, y: 1 };
    expect(moodOf(b, c)).toBe("moving");
    r.state = "attack";
    r.targetId = "c";
    expect(moodOf(b, c)).toBe("fire");
    // Full, it says so before it says whom it follows.
    t.cargo = ["common", "common"];
    expect(moodOf(b, t)).toBe("full");
  });
});
