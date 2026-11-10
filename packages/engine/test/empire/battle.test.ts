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
  it("is the same for the same seed, and keeps the tier's rarest relic in the farthest city", () => {
    const one = battle(2, [entrant("a")], 11);
    expect(battle(2, [entrant("a")], 11)).toEqual(one);
    expect(battle(2, [entrant("a")], 12)).not.toEqual(one);
    expect(one.cities).toHaveLength(5);
    // The fixture's tier 2 holds legendary relics: the farthest city keeps one.
    expect(one.cities.at(-1)?.relics.a).toContain("legendary");
    for (const c of one.cities.slice(0, -1)) {
      const n = c.relics.a?.length ?? 0;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
    }
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

  it("gives each vehicle its own cargo", () => {
    const b = battle();
    unit(b, "p0t").cargo.push("rare");
    expect(unit(b, "p0c").cargo).toEqual([]);
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

describe("the incendiary (2 November)", () => {
  const withIncendiary = (b: Battle): RomeUnit => {
    const c = b.cities[0];
    if (!c) throw new Error("no city");
    const u = makeRomeUnit("inc", "incendiary", { x: c.x + 3, y: c.y }, c.id, tierLine(1, s), s);
    b.units.push(u);
    return u;
  };
  const relicsLeft = (b: Battle) =>
    b.cities.reduce((n, c) => n + Object.values(c.relics).reduce((k, r) => k + r.length, 0), 0);

  it("walks to the city of the rarest relics and burns them, a city left alone", () => {
    const b = battle();
    withIncendiary(b);
    const before = relicsLeft(b);
    for (let i = 0; i < 400 && !b.events.some((e) => e.kind === "burnt"); i++) stepBattle(b, s);
    const burnt = b.events.find((e) => e.kind === "burnt");
    expect(burnt).toBeDefined();
    const city = b.cities.find((c) => burnt?.kind === "burnt" && c.id === burnt.city);
    expect(Object.values(city?.relics ?? {}).flat()).toEqual([]);
    expect(relicsLeft(b)).toBeLessThan(before);
  });

  it("burns nothing once dead", () => {
    const b = battle();
    const u = withIncendiary(b);
    u.hp = 0;
    u.dead = true;
    const before = relicsLeft(b);
    for (let i = 0; i < 400; i++) stepBattle(b, s);
    expect(b.events.some((e) => e.kind === "burnt")).toBe(false);
    expect(relicsLeft(b)).toBe(before);
  });
});

describe("the vehicles' models in the battle (their figurines, docs/plan-porta-3d.md)", () => {
  it("are told for each player's unit: the combat vehicle's model, the transport's type", () => {
    const b = createBattle(
      {
        seed: 3,
        tier: 1,
        players: [
          {
            id: "a",
            combat: { vehicleId: "a-cv", stats: rider({ model: "carro" }) },
            transport: { vehicleId: "a-tr", hold: 50, type: "mule" },
          },
        ],
      },
      s,
    );
    const mine = b.units.filter((u) => u.side === "player");
    expect(mine.find((u) => u.role === "combat")?.model).toBe("carro");
    expect(mine.find((u) => u.role === "transport")?.model).toBe("mule");
  });
});

// The orders that say what they do (docs/plan-porta-jeu.md, lot A): the convoy, the attack, the
// way by steps, the gate.
describe("the convoy and the orders of lot A", () => {
  const dist = (a: { x: number; y: number }, c: { x: number; y: number }) =>
    Math.hypot(a.x - c.x, a.y - c.y);

  it("walks a way by its steps, one after the other, and cuts a way too long", () => {
    const b = empty();
    const c = unit(b, "p0c");
    at(c, 0, 0);
    c.speedCenti = 6_000;
    const then = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: 1, y: i * 0.1 }));
    expect(orderBattle(b, "a", { type: "move", unitId: "p0c", x: 1, y: 0, then })).toBeNull();
    expect(c.route).toHaveLength(s.porta.battle.maxWaypoints);
    run(b, 1.5);
    // Past the first step, on its way to the next ones.
    expect(c.x).toBeCloseTo(1, 1);
    expect(c.y).toBeGreaterThan(0);
    run(b, 20);
    expect(c.goal).toBeNull();
    expect(c.route ?? []).toEqual([]);
    expect(c.y).toBeCloseTo(0.5, 5);
  });

  it("has the transport follow its fighter a cell behind, and stand when it stands", () => {
    const b = empty();
    const c = unit(b, "p0c");
    const t = unit(b, "p0t");
    at(c, 0, 0);
    at(t, 0, 0);
    expect(orderBattle(b, "a", { type: "follow", unitId: "p0t", leaderId: "p0c" })).toBeNull();
    orderBattle(b, "a", { type: "move", unitId: "p0c", x: 4, y: 0 });
    run(b, 120);
    expect(c.x).toBeCloseTo(4, 5);
    const gap = s.porta.battle.followCenti / 100;
    expect(dist(t, c)).toBeLessThanOrEqual(gap + 1e-6);
    expect(dist(t, c)).toBeGreaterThan(gap - 0.2);
    // It follows no one but one's own, and not itself.
    expect(orderBattle(b, "a", { type: "follow", unitId: "p0t", leaderId: "p0t" })).toBe(
      "unknown_unit",
    );
  });

  it("loads while it follows a fighter that stands, and a new way ends the following", () => {
    const b = empty();
    const city = b.cities[0];
    if (!city) throw new Error("no city");
    const c = unit(b, "p0c");
    const t = unit(b, "p0t");
    at(c, city.x, city.y);
    at(t, city.x + 0.5, city.y);
    orderBattle(b, "a", { type: "follow", unitId: "p0t", leaderId: "p0c" });
    run(b, 1);
    expect(t.loading?.cityId).toBe(city.id);
    orderBattle(b, "a", { type: "move", unitId: "p0t", x: city.x + 3, y: city.y });
    expect(t.follow ?? null).toBeNull();
    expect(t.loading).toBeNull();
  });

  it("stops a follower whose fighter falls, and sends it out behind one gone out", () => {
    const b = empty();
    const c = unit(b, "p0c");
    const t = unit(b, "p0t");
    at(c, 0, 0);
    at(t, 3, 0);
    orderBattle(b, "a", { type: "follow", unitId: "p0t", leaderId: "p0c" });
    c.outcome = "dead";
    run(b, 1);
    expect(t.follow ?? null).toBeNull();
    expect(t.x).toBe(3);
    const b2 = empty();
    const c2 = unit(b2, "p0c");
    const t2 = unit(b2, "p0t");
    at(t2, b2.gate.x + 3, 0);
    orderBattle(b2, "a", { type: "follow", unitId: "p0t", leaderId: "p0c" });
    expect(orderBattle(b2, "a", { type: "leave", unitId: "p0c" })).toBeNull();
    expect(c2.outcome).toBe("exited");
    run(b2, 120);
    expect(t2.outcome).toBe("exited");
  });

  it("goes to the gate and out of it by one order, its cargo with it", () => {
    const b = empty();
    const t = unit(b, "p0t");
    at(t, b.gate.x + 4, 1);
    t.cargo.push("rare");
    expect(orderBattle(b, "a", { type: "exit", unitId: "p0t" })).toBeNull();
    run(b, 1);
    expect(t.outcome).toBe("in");
    run(b, 120);
    expect(t.outcome).toBe("exited");
    expect(battleResult(b).a?.relics).toEqual(["rare"]);
    // Another way takes the order back.
    const b2 = empty();
    const t2 = unit(b2, "p0t");
    at(t2, b2.gate.x + 4, 1);
    orderBattle(b2, "a", { type: "exit", unitId: "p0t" });
    orderBattle(b2, "a", { type: "move", unitId: "p0t", x: b2.gate.x, y: b2.gate.y });
    run(b2, 120);
    expect(t2.outcome).toBe("in");
  });

  it("attacks the one it is told: comes within its reach, keeps it before a nearer one, then rests", () => {
    const b = empty();
    const c = unit(b, "p0c");
    at(c, 0, 0);
    const far = place(b, "crossbowman", 5, 0);
    // Both hold through the test: the order is what is looked at.
    c.hp = c.maxHp = 1_000_000;
    far.hp = far.maxHp = 1_000_000;
    expect(orderBattle(b, "a", { type: "attack", unitId: "p0c", targetId: far.id })).toBeNull();
    run(b, 60);
    expect(dist(c, far) * 100).toBeLessThanOrEqual(150);
    expect(dist(c, far) * 100).toBeGreaterThan(100);
    // A nearer one comes: the weapon stays on the one ordered.
    const near = place(b, "crossbowman", c.x, c.y + 0.3);
    run(b, 1);
    expect(c.weapons[0]?.targetId).toBe(far.id);
    far.hp = 1;
    run(b, 1);
    expect(far.dead).toBe(true);
    expect(c.attack ?? null).toBeNull();
    expect(c.weapons[0]?.targetId).toBe(near.id);
  });

  it("refuses to attack what is not Rome's, what is dead, or without a weapon", () => {
    const b = empty();
    const r = place(b, "crossbowman", 5, 0);
    expect(orderBattle(b, "a", { type: "attack", unitId: "p0c", targetId: "p0t" })).toBe(
      "unknown_unit",
    );
    expect(orderBattle(b, "a", { type: "attack", unitId: "p0t", targetId: r.id })).toBe(
      "no_weapon",
    );
    r.dead = true;
    expect(orderBattle(b, "a", { type: "attack", unitId: "p0c", targetId: r.id })).toBe(
      "unknown_unit",
    );
  });

  it("leaves the old orders as they were: the same battle, step for step", () => {
    const play = () => {
      const b = battle(1);
      const city = b.cities[0] ?? { x: 0, y: 0 };
      orderBattle(b, "a", { type: "move", unitId: "p0c", x: city.x, y: city.y });
      orderBattle(b, "a", { type: "move", unitId: "p0t", x: city.x, y: city.y });
      run(b, 90);
      return b;
    };
    expect(play()).toEqual(play());
    const t = unit(play(), "p0t");
    expect(t.follow ?? null).toBeNull();
  });
});
