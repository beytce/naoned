import { describe, expect, it } from "vitest";
import {
  type Command,
  type EmpireSettingsInput,
  type EmpireWorkshop,
  interiorPaceBps,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire, testInterior } from "../fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "../helpers.js";

// The workshops' insides at work (docs/plan-ateliers.md lot A2): the farm of the test theme gets
// the fixture's made-up inside (cut → press → bake, 2 units a lot); the mill keeps no inside.
// grow_wheat: 20 wheat a lot of 60 minutes; the night queue holds 12 hours.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0, materials: {} })),
  start: {
    capitalDucats: 100_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "mill", recipe: "mill_flour" },
    ],
  },
  queueHours: 12,
  interior: {
    ...testInterior,
    buildings: { farm: testInterior.buildings.test_works as never },
  },
};
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

const house = (w: World) => {
  const h = w.state.empire?.houses.a;
  if (!h) throw new Error("no house");
  return h;
};
const farm = (w: World) => house(w).workshops[0] as EmpireWorkshop;
const mill = (w: World) => house(w).workshops[1] as EmpireWorkshop;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const relaunch = (w: World) =>
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w).id });
const act = (w: World, cmd: Record<string, unknown>) =>
  w.do({ playerId: "a", workshopId: farm(w).id, ...cmd } as Command);
const tryAct = (w: World, cmd: Record<string, unknown>) =>
  w.try({ playerId: "a", workshopId: farm(w).id, ...cmd } as Command);
const pace = (w: World) => interiorPaceBps(farm(w), house(w), s, w.now);

describe("the switch", () => {
  it("gives each workshop of a type with an inside its default plan, with a hand at each seat", () => {
    const w = world();
    const inside = farm(w).interior;
    expect(inside?.stations.map((x) => x.kind)).toEqual(["cutter", "press", "kiln"]);
    expect(inside?.hands?.map((x) => [x.trade, x.stationId])).toEqual([
      ["sawyer", "s1"],
      ["carpenter", "s2"],
    ]);
    expect(mill(w).interior).toBeUndefined();
  });

  it("loses nothing: the default plan makes exactly what the workshop made before", () => {
    const w = world();
    expect(pace(w)).toBe(10_000);
    relaunch(w);
    expect(farm(w).job?.batchMs).toBe(HOUR);
    expect(farm(w).job?.batches).toBe(12);
    w.advance(3 * HOUR);
    relaunch(w);
    expect(stock(w, "wheat")).toBe(60);
  });

  it("gives the byproduct and grows the hands with the lots", () => {
    const w = world();
    relaunch(w);
    w.advance(3 * HOUR);
    relaunch(w);
    // 3 lots × 2 units × 50 %.
    expect(stock(w, "wood")).toBe(3);
    expect(farm(w).interior?.hands?.[0]?.xp).toBe(3);
  });
});

describe("the pace of the queue", () => {
  it("a better plan quickens the lots not yet started; the lot under way ends when it would", () => {
    const w = world();
    relaunch(w);
    w.advance(30 * MIN);
    // A full buffer before the kiln, the bottleneck: its 10 % back.
    act(w, { type: "empireInteriorBuffer", link: "press>bake", size: 4 });
    const job = farm(w).job;
    expect(job?.batchMs).toBeLessThan(HOUR);
    expect((job?.startedAt ?? 0) + (job?.batchMs ?? 0)).toBe(w.now + 30 * MIN);
    // The 10 % given back, less the half hour of wear the kiln took meanwhile.
    expect(pace(w)).toBe(11_027);
  });

  it("a slower plan slows only the lots after", () => {
    const w = world();
    relaunch(w);
    w.advance(10 * MIN);
    act(w, { type: "empireInteriorCare", stationId: "s3", care: 10_000 });
    const job = farm(w).job;
    expect(job?.batchMs).toBeGreaterThan(HOUR);
    expect((job?.startedAt ?? 0) + (job?.batchMs ?? 0)).toBe(w.now + 50 * MIN);
  });

  it("a station placed works once its site ends, and its price goes through the ledger", () => {
    const w = world();
    const cash = w.cash("a");
    act(w, { type: "empireInteriorPlace", kind: "kiln", x: 3, y: 0, rot: 0 });
    expect(cash - w.cash("a")).toBe(100n * 100n);
    expect(pace(w)).toBe(10_000);
    w.advance(5 * MIN);
    expect(pace(w)).toBeGreaterThan(10_000);
  });

  it("a station that wants hands and has none stops the queue from filling, nothing lost", () => {
    const w = world();
    act(w, { type: "empireInteriorAssign", handId: "h1", stationId: null, shift: "day" });
    expect(pace(w)).toBe(0);
    relaunch(w);
    expect(farm(w).job).toBeNull();
    act(w, { type: "empireInteriorAssign", handId: "h1", stationId: "s1", shift: "day" });
    relaunch(w);
    expect(farm(w).job?.batches).toBe(12);
  });
});

describe("rule 3: the absence costs nothing, nothing piles up", () => {
  it("after a week away: the full queue given, the workshop slowed, never stopped", () => {
    const w = world();
    relaunch(w);
    w.advance(7 * DAY);
    relaunch(w);
    expect(stock(w, "wheat")).toBe(240);
    const inside = farm(w).interior;
    expect(inside?.stations[0]?.wear).toBeGreaterThan(0);
    // The hands worked 12 hours and rested the rest of the week: fresh again.
    expect(inside?.hands?.every((x) => x.fatigue === 0)).toBe(true);
    const p = pace(w);
    expect(p).toBeLessThan(10_000);
    expect(p).toBeGreaterThan(0);
    // Mended: as new again, for a little money.
    const cash = w.cash("a");
    act(w, { type: "empireInteriorMaintain" });
    expect(w.cash("a")).toBeLessThan(cash);
    expect(farm(w).interior?.stations.every((x) => x.wear === 0)).toBe(true);
    expect(pace(w)).toBe(10_000);
  });

  it("a hand at work for hours tires, and the next queue is slower for it", () => {
    const w = world();
    relaunch(w);
    w.advance(10 * HOUR);
    relaunch(w);
    expect(farm(w).interior?.hands?.[0]?.fatigue).toBe(5_000);
    expect(pace(w)).toBeLessThan(10_000);
  });
});

describe("the commands of the inside", () => {
  it("place refuses a station on a wall, outside, on another, or of another workshop", () => {
    const w = world();
    expect(tryAct(w, { type: "empireInteriorPlace", kind: "kiln", x: 2, y: 2, rot: 0 }).ok).toBe(
      false,
    );
    expect(tryAct(w, { type: "empireInteriorPlace", kind: "kiln", x: 9, y: 0, rot: 0 }).ok).toBe(
      false,
    );
    expect(tryAct(w, { type: "empireInteriorPlace", kind: "kiln", x: 0, y: 0, rot: 0 }).ok).toBe(
      false,
    );
    expect(tryAct(w, { type: "empireInteriorPlace", kind: "ghost", x: 3, y: 0, rot: 0 }).ok).toBe(
      false,
    );
    const other = w.try({
      type: "empireInteriorPlace",
      playerId: "a",
      workshopId: mill(w).id,
      kind: "kiln",
      x: 3,
      y: 0,
      rot: 0,
    } as Command);
    expect(other.ok).toBe(false);
  });

  it("move is free, remove gives half back", () => {
    const w = world();
    act(w, { type: "empireInteriorPlace", kind: "kiln", x: 3, y: 0, rot: 0 });
    expect(tryAct(w, { type: "empireInteriorMove", stationId: "s4", x: 0, y: 2, rot: 0 }).ok).toBe(
      false,
    );
    w.advance(5 * MIN);
    const cash = w.cash("a");
    act(w, { type: "empireInteriorMove", stationId: "s4", x: 0, y: 2, rot: 2 });
    expect(w.cash("a")).toBe(cash);
    expect(farm(w).interior?.stations[3]).toMatchObject({ x: 0, y: 2, rot: 2 });
    act(w, { type: "empireInteriorRemove", stationId: "s4" });
    expect(w.cash("a") - cash).toBe(50n * 100n);
    expect(farm(w).interior?.stations).toHaveLength(3);
  });

  it("upgrade raises a station to its last level, no further", () => {
    const w = world();
    act(w, { type: "empireInteriorUpgrade", stationId: "s1" });
    expect(farm(w).interior?.stations[0]?.level).toBe(2);
    expect(tryAct(w, { type: "empireInteriorUpgrade", stationId: "s3" }).ok).toBe(false);
  });

  it("a conveyor runs from beside the door to behind the station, and moving that station takes it up", () => {
    const w = world();
    act(w, { type: "empireInteriorMove", stationId: "s1", x: 1, y: 0, rot: 0 });
    expect(tryAct(w, { type: "empireInteriorLink", from: "in", to: "s1", via: [[0, 1]] }).ok).toBe(
      false,
    );
    const cash = w.cash("a");
    act(w, { type: "empireInteriorLink", from: "in", to: "s1", via: [[0, 0]] });
    expect(cash - w.cash("a")).toBe(10n * 100n);
    expect(farm(w).interior?.links).toHaveLength(1);
    act(w, { type: "empireInteriorMove", stationId: "s1", x: 0, y: 0, rot: 0 });
    expect(farm(w).interior?.links).toHaveLength(0);
    expect(cash - w.cash("a")).toBe(5n * 100n);
  });

  it("hires at the door, so many a seat at most, and places within the seats of a shift", () => {
    const w = world();
    // Seats: cutter 1, press 2, kiln 0 → 3 seats, 2 hands a seat, 2 already there.
    for (let i = 0; i < 4; i++) act(w, { type: "empireInteriorHire", trade: "carpenter" });
    expect(tryAct(w, { type: "empireInteriorHire", trade: "carpenter" }).ok).toBe(false);
    expect(tryAct(w, { type: "empireInteriorHire", trade: "glassblower" }).ok).toBe(false);
    act(w, { type: "empireInteriorAssign", handId: "h3", stationId: "s2", shift: "day" });
    expect(
      tryAct(w, { type: "empireInteriorAssign", handId: "h4", stationId: "s2", shift: "day" }).ok,
    ).toBe(false);
    act(w, { type: "empireInteriorAssign", handId: "h4", stationId: "s2", shift: "night" });
    expect(farm(w).interior?.hands?.find((x) => x.id === "h4")?.shift).toBe("night");
  });

  it("care raises the share of better lots", () => {
    const w = world();
    for (const id of ["s1", "s2", "s3"])
      act(w, { type: "empireInteriorCare", stationId: id, care: 10_000 });
    relaunch(w);
    w.advance(6 * HOUR);
    relaunch(w);
    expect(stock(w, "wheat:fine")).toBeGreaterThan(0);
  });
});
