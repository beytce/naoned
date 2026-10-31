import { describe, expect, it } from "vitest";
import {
  type ArmStats,
  type Battle,
  type PlayerUnit,
  type RomeKind,
  type RomeUnit,
  battleResult,
  chooseTarget,
  createBattle,
  makeRomeUnit,
  orderBattle,
  parseEmpireSettings,
  stepBattle,
  tierLine,
  visibleTo,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";

// The battle in the lands of Rome (docs/plan-porta.md § 6), on the frozen fixture.
const s = parseEmpireSettings(testEmpire);

const lances: ArmStats["weapons"][number] = {
  componentId: "cp1",
  effect: "lances",
  power: 40,
  rangeCenti: 150,
  periodS: 0,
  rampBps: 1_500,
  rampEveryS: 2,
  rampMaxBps: 15_000,
};
const rider = (over: Partial<ArmStats> = {}): ArmStats => ({
  model: "rider",
  hp: 1_000,
  speedCenti: 600,
  weapons: [lances],
  actives: [],
  damageCutBps: 0,
  ...over,
});
const entrant = (id: string, stats = rider(), hold = 50) => ({
  id,
  combat: { vehicleId: `${id}-cv`, stats },
  transport: { vehicleId: `${id}-tr`, hold },
});

function battle(tier = 1, players = [entrant("a")], seed = 7): Battle {
  return createBattle({ seed, tier, players }, s);
}
/** An empty field: the cities stay, Rome's units go, the players' vehicles at the gate. */
function empty(players = [entrant("a")]): Battle {
  const b = battle(1, players);
  b.units = b.units.filter((u) => u.side === "player");
  return b;
}
function place(b: Battle, kind: RomeKind, x: number, y: number, home = "c0"): RomeUnit {
  const u = makeRomeUnit(`r${b.units.length}`, kind, { x, y }, home, tierLine(1, s), s);
  b.units.push(u);
  return u;
}
const unit = (b: Battle, id: string) => b.units.find((u) => u.id === id) as PlayerUnit;
const run = (b: Battle, seconds: number) => {
  for (let t = 0; t < (seconds * 1_000) / s.porta.battle.stepMs; t++) stepBattle(b, s);
};
const at = (u: { x: number; y: number }, x: number, y: number) => {
  u.x = x;
  u.y = y;
};

describe("the drawing of a battle", () => {
  it("is the same for the same seed, and puts each player's rarest relics the farthest", () => {
    const one = battle(2, [entrant("a")], 11);
    expect(battle(2, [entrant("a")], 11)).toEqual(one);
    expect(battle(2, [entrant("a")], 12)).not.toEqual(one);
    expect(one.cities).toHaveLength(5);
    const ranks = one.cities.map((c) =>
      Math.max(
        ...(c.relics.a ?? []).map((r) => ["common", "rare", "precious", "legendary"].indexOf(r)),
      ),
    );
    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
  });

  it("sets the vehicles at the gate, the Gonfalonier in the farthest city, more Rome with more players", () => {
    const solo = battle(2, [entrant("a")]);
    const boss = solo.units.find(
      (u): u is RomeUnit => u.side === "rome" && u.kind === "gonfalonier",
    );
    expect(boss?.home).toBe("c4");
    expect(solo.units.filter((u) => u.side === "player")).toHaveLength(2);
    const duo = battle(2, [entrant("a"), entrant("b")]);
    const romeOf = (b: Battle) => b.units.filter((u) => u.side === "rome").length;
    expect(romeOf(duo)).toBeGreaterThan(romeOf(solo));
    // A transport carries a relic for every 25 of hold.
    expect(unit(solo, "p0t").capacity).toBe(2);
  });

  it("refuses a tier its players are too few for", () => {
    expect(() => battle(3, [entrant("a")])).toThrow(RangeError);
    expect(battle(3, [entrant("a"), entrant("b")]).players).toEqual(["a", "b"]);
  });
});

describe("Rome's mind", () => {
  it("sees only within its vision, and never under the smoke", () => {
    const b = empty();
    const r = place(b, "halberdier", 0, 0);
    const c = unit(b, "p0c");
    at(c, 3, 0);
    expect(visibleTo(r, b, s)).toEqual([]);
    at(c, 2, 0);
    expect(visibleTo(r, b, s)).toEqual([c]);
    c.hiddenUntil = b.timeMs + 5_000;
    expect(visibleTo(r, b, s)).toEqual([]);
  });

  it("takes the most threatening vehicle, the transport last, but the light horse the transport first", () => {
    const b = empty();
    const halberd = place(b, "halberdier", 0, 0);
    const horse = place(b, "light_horse", 0, 0);
    at(unit(b, "p0c"), 1.5, 0);
    at(unit(b, "p0t"), 0.5, 0);
    expect(chooseTarget(halberd, b, s)?.id).toBe("p0c");
    expect(chooseTarget(horse, b, s)?.id).toBe("p0t");
  });

  it("warns its city, attacks in range, and fires", () => {
    const b = empty();
    const a = place(b, "crossbowman", b.cities[0]?.x ?? 0, b.cities[0]?.y ?? 0);
    const h = place(b, "halberdier", (b.cities[0]?.x ?? 0) + 0.5, b.cities[0]?.y ?? 0);
    const c = unit(b, "p0c");
    at(c, a.x + 1.8, a.y);
    c.weapons = [];
    run(b, 1);
    expect(a.state).toBe("attack");
    expect(h.targetId).toBe("p0c");
    expect(c.hp).toBeLessThan(c.maxHp);
  });

  it("goes home beyond its leash and drops what it followed", () => {
    const b = empty();
    const city = b.cities[0] ?? { x: 0, y: 0 };
    const h = place(b, "halberdier", city.x, city.y);
    const c = unit(b, "p0c");
    c.weapons = [];
    at(c, city.x + 2, city.y);
    run(b, 0.25);
    expect(h.targetId).toBe("p0c");
    // The vehicle runs off; the halberdier follows to its leash, then turns back.
    c.goal = { x: city.x + 8, y: city.y };
    c.speedCenti = 2_000;
    run(b, 30);
    expect(h.state === "return" || h.state === "idle").toBe(true);
    expect(h.targetId).toBeNull();
  });

  it("falls back below a quarter of its hp, heals at its city, and comes out again", () => {
    const b = empty();
    const city = b.cities[0] ?? { x: 0, y: 0 };
    const h = place(b, "halberdier", city.x, city.y);
    h.hp = h.maxHp * 0.2;
    run(b, 0.25);
    expect(h.state).toBe("retreat");
    run(b, 60);
    expect(h.state).not.toBe("retreat");
    expect(h.hp).toBeGreaterThanOrEqual(h.maxHp * 0.8);
  });

  it("keeps its target until its review, so a vehicle out of sight makes it let go", () => {
    const b = empty();
    const city = b.cities[0] ?? { x: 0, y: 0 };
    const h = place(b, "halberdier", city.x, city.y);
    const c = unit(b, "p0c");
    c.weapons = [];
    at(c, city.x + 1, city.y);
    run(b, 0.25);
    expect(h.targetId).toBe("p0c");
    c.hiddenUntil = b.timeMs + 10_000;
    run(b, 0.25);
    expect(h.targetId).toBeNull();
  });
});

describe("the fight", () => {
  it("raises the lances on one target and kills", () => {
    const b = empty();
    const r = place(b, "crossbowman", 0, 0, "c0");
    r.power = 1;
    at(unit(b, "p0c"), 1, 0);
    run(b, 2);
    const early = r.maxHp - r.hp;
    run(b, 2);
    const later = r.maxHp - r.hp - early;
    expect(later).toBeGreaterThan(early);
    run(b, 30);
    expect(r.dead).toBe(true);
  });

  it("cuts the damage by the cuirass, absorbs it by the pavise", () => {
    const b = empty([
      entrant(
        "a",
        rider({
          weapons: [],
          damageCutBps: 5_000,
          actives: [
            {
              componentId: "pv",
              effect: "pavise",
              power: 100_000,
              rangeCenti: 0,
              durationS: 10,
              cooldownS: 40,
            },
          ],
        }),
      ),
    ]);
    const city = b.cities[0] ?? { x: 0, y: 0 };
    const r = place(b, "crossbowman", city.x, city.y);
    const c = unit(b, "p0c");
    at(c, city.x + 1, city.y);
    run(b, 4);
    // 25 a second for 4 s, halved: it sees, takes its target and fires in the same step.
    expect(c.maxHp - c.hp).toBeCloseTo(25 * 4 * 0.5, 5);
    const before = c.hp;
    expect(orderBattle(b, "a", { type: "activate", unitId: "p0c", componentId: "pv" })).toBeNull();
    expect(orderBattle(b, "a", { type: "activate", unitId: "p0c", componentId: "pv" })).toBe(
      "not_ready",
    );
    run(b, 4);
    expect(c.hp).toBe(before);
    expect(r.dead).toBe(false);
  });

  it("loses a vehicle at 0 hp, with its cargo", () => {
    const b = empty();
    const t = unit(b, "p0t");
    t.cargo = ["rare"];
    const r = place(b, "light_horse", 0, 0);
    r.power = 100_000;
    at(t, 0.5, 0);
    run(b, 1);
    expect(t.outcome).toBe("dead");
    expect(battleResult(b).a?.relics).toEqual([]);
  });
});

describe("the support components", () => {
  it("heals the most hurt ally near the surgeon, another player's too", () => {
    const surgeon = {
      componentId: "sg",
      effect: "surgeon" as const,
      power: 60,
      rangeCenti: 200,
      durationS: 10,
      cooldownS: 45,
    };
    const b = empty([entrant("a", rider({ actives: [surgeon] })), entrant("b")]);
    const other = unit(b, "p1c");
    other.hp = 500;
    orderBattle(b, "a", { type: "activate", unitId: "p0c", componentId: "sg" });
    run(b, 5);
    expect(other.hp).toBeCloseTo(800, 5);
  });

  it("speeds the vehicles near the trumpet", () => {
    const trumpet = {
      componentId: "tp",
      effect: "trumpet" as const,
      power: 5_000,
      rangeCenti: 200,
      durationS: 8,
      cooldownS: 40,
    };
    const b = empty([entrant("a", rider({ actives: [trumpet] }))]);
    const t = unit(b, "p0t");
    const x0 = t.x;
    orderBattle(b, "a", { type: "move", unitId: "p0t", x: 5, y: t.y });
    orderBattle(b, "a", { type: "activate", unitId: "p0c", componentId: "tp" });
    run(b, 6);
    // 5 cells a minute, half again: 0.75 cell in 6 s.
    expect(t.x - x0).toBeCloseTo(0.75, 5);
  });

  it("hides a vehicle until it fires", () => {
    const smoke = {
      componentId: "sm",
      effect: "smoke" as const,
      power: 0,
      rangeCenti: 0,
      durationS: 8,
      cooldownS: 60,
    };
    const b = empty([entrant("a", rider({ actives: [smoke] }))]);
    const c = unit(b, "p0c");
    orderBattle(b, "a", { type: "activate", unitId: "p0c", componentId: "sm" });
    expect(c.hiddenUntil).toBeGreaterThan(b.timeMs);
    place(b, "crossbowman", c.x + 1, c.y);
    run(b, 0.25);
    expect(c.hiddenUntil).toBeLessThanOrEqual(b.timeMs);
  });
});

describe("the relics and the closing", () => {
  it("loads the rarest relic of a city, one at a time, interrupted by a move", () => {
    const b = empty();
    const city = b.cities[0];
    if (!city) throw new Error("no city");
    city.relics.a = ["common", "rare"];
    const t = unit(b, "p0t");
    at(t, city.x, city.y);
    run(b, 10);
    expect(t.cargo).toEqual([]);
    expect(t.loading?.rarity).toBe("rare");
    orderBattle(b, "a", { type: "move", unitId: "p0t", x: city.x + 0.1, y: city.y });
    expect(t.loading).toBeNull();
    // A moment to get there (0.1 cell), then 20 s for the rare one.
    run(b, 23);
    expect(t.cargo).toEqual(["rare"]);
    run(b, 11);
    expect(t.cargo).toEqual(["rare", "common"]);
    // Each player's own: another player's relics there are not his.
    expect(city.relics.a).toEqual([]);
  });

  it("lets a vehicle out by the gate only, with its cargo", () => {
    const b = empty();
    const t = unit(b, "p0t");
    t.cargo = ["precious"];
    at(t, 0, 0);
    expect(orderBattle(b, "a", { type: "leave", unitId: "p0t" })).toBe("too_far");
    expect(orderBattle(b, "b", { type: "leave", unitId: "p0t" })).toBe("not_yours");
    at(t, b.gate.x, b.gate.y);
    expect(orderBattle(b, "a", { type: "leave", unitId: "p0t" })).toBeNull();
    expect(battleResult(b).a).toMatchObject({ relics: ["precious"], won: true });
  });

  it("loses at the closing whatever is still inside, and ends", () => {
    const b = empty();
    unit(b, "p0t").cargo = ["legendary"];
    orderBattle(b, "a", { type: "leave", unitId: "p0c" });
    run(b, 10 * 60);
    expect(b.over).toBe(true);
    expect(battleResult(b).a).toEqual({
      vehicles: [
        { vehicleId: "a-cv", role: "combat", outcome: "exited" },
        { vehicleId: "a-tr", role: "transport", outcome: "lost" },
      ],
      relics: [],
      won: false,
    });
  });

  it("plays out the same twice from the same seed and the same orders", () => {
    const play = () => {
      const b = battle(2, [entrant("a")], 5);
      const target = b.cities[0] ?? { x: 0, y: 0 };
      orderBattle(b, "a", { type: "move", unitId: "p0c", x: target.x, y: target.y });
      orderBattle(b, "a", { type: "move", unitId: "p0t", x: target.x, y: target.y });
      run(b, 120);
      return b;
    };
    expect(play()).toEqual(play());
  });
});

describe("a tier 1 alone", () => {
  it("is won by a rider with lances that clears the nearest city before its transport goes in", () => {
    const b = battle(1, [entrant("a")], 3);
    const city = b.cities[0];
    if (!city) throw new Error("no city");
    orderBattle(b, "a", { type: "move", unitId: "p0c", x: city.x, y: city.y });
    run(b, 150);
    orderBattle(b, "a", { type: "move", unitId: "p0t", x: city.x, y: city.y });
    run(b, 200);
    for (const id of ["p0c", "p0t"])
      orderBattle(b, "a", { type: "move", unitId: id, x: b.gate.x, y: b.gate.y });
    run(b, 200);
    for (const id of ["p0c", "p0t"]) orderBattle(b, "a", { type: "leave", unitId: id });
    const out = battleResult(b).a;
    expect(out?.vehicles.map((v) => v.outcome)).toEqual(["exited", "exited"]);
    expect(out?.won).toBe(true);
  });
});
