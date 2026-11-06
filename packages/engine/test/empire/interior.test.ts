import { describe, expect, it } from "vitest";
import {
  type EmpireStaff,
  type EmpireWorkshop,
  type InteriorStation,
  fatigueFactorBps,
  fatigueResting,
  fatigueWorking,
  hallAt,
  interiorLayoutProblem,
  interiorThroughput,
  parseEmpireSettings,
  stationPorts,
  wearAfter,
  wearFactorBps,
} from "../../src/index.js";
import { testEmpire, testInterior } from "../fixture.js";

// The workshops' insides (docs/plan-ateliers.md § 3 and § 5.3, lot A1): the rate of a hall is its
// slowest stage's, after the carrying between stations, the hands, their wear and their fatigue.
const s = parseEmpireSettings({ ...testEmpire, interior: testInterior });

const preset = (): InteriorStation[] => [
  { id: "s1", kind: "cutter", x: 0, y: 0, rot: 0, level: 1, wear: 0, care: 0 },
  { id: "s2", kind: "press", x: 1, y: 1, rot: 0, level: 1, wear: 0, care: 0 },
  { id: "s3", kind: "kiln", x: 3, y: 2, rot: 0, level: 1, wear: 0, care: 0 },
];

function shop(
  stations = preset(),
  extra: Partial<EmpireWorkshop["interior"]> = {},
): EmpireWorkshop {
  return {
    id: "w1",
    type: "test_works",
    recipe: "r",
    level: 1,
    job: null,
    interior: { v: 1, stations, links: [], buffers: {}, settledAt: 0, seed: 1, ...extra },
  };
}

function hand(
  id: string,
  stationId: string,
  trade: string,
  more: Partial<EmpireStaff> = {},
  shift: "day" | "night" = "day",
): EmpireStaff {
  return {
    id,
    role: "worker",
    rarity: "common",
    level: 1,
    xp: 0,
    skills: [],
    trade,
    fatigue: 0,
    station: { workshopId: "w1", stationId, shift },
    ...more,
  };
}

const crew = () => [hand("h1", "s1", "sawyer"), hand("h2", "s2", "carpenter")];
const rate = (ws: EmpireWorkshop, staff: EmpireStaff[] = crew()) =>
  interiorThroughput(ws, { staff }, s);

describe("the interior's settings", () => {
  it("are optional: a world without them keeps today's workshops", () => {
    expect(parseEmpireSettings(testEmpire).interior).toBeUndefined();
    expect(s.interior?.buildings.test_works?.stages.map((x) => x.code)).toEqual([
      "cut",
      "press",
      "bake",
    ]);
  });

  it("refuse a stage or a preset naming a station that does not exist", () => {
    const bad = structuredClone(testInterior);
    const b = bad.buildings.test_works;
    if (!b) throw new Error("fixture");
    b.stages[0] = { code: "cut", stations: ["saw_of_nowhere"] };
    expect(() => parseEmpireSettings({ ...testEmpire, interior: bad })).toThrow();
    const bad2 = structuredClone(testInterior);
    bad2.buildings.test_works?.preset.push({ kind: "ghost", x: 0, y: 2, rot: 0 });
    expect(() => parseEmpireSettings({ ...testEmpire, interior: bad2 })).toThrow();
  });
});

describe("the hall", () => {
  it("grows with the workshop's level", () => {
    expect(hallAt(s, 1)).toEqual({ w: 4, h: 3 });
    expect(hallAt(s, 2)).toEqual({ w: 4, h: 3 });
    expect(hallAt(s, 7)).toEqual({ w: 6, h: 4 });
  });

  it("has a station's goods come in behind it and go out in front, turned with it", () => {
    const press = (rot: 0 | 1 | 2 | 3): InteriorStation => ({
      id: "p",
      kind: "press",
      x: 1,
      y: 1,
      rot,
      level: 1,
      wear: 0,
      care: 0,
    });
    expect(stationPorts(press(0), s)).toEqual({ entry: [0, 1], exit: [3, 1] });
    expect(stationPorts(press(1), s)).toEqual({ entry: [1, 0], exit: [1, 3] });
    expect(stationPorts(press(2), s)).toEqual({ entry: [3, 1], exit: [0, 1] });
    expect(stationPorts(press(3), s)).toEqual({ entry: [1, 3], exit: [1, 0] });
  });

  it("tells what is wrong with a plan: outside, on a wall, on another station", () => {
    expect(interiorLayoutProblem(shop(), s)).toBeNull();
    const out = preset();
    out[2] = { ...(out[2] as InteriorStation), x: 4 };
    expect(interiorLayoutProblem(shop(out), s)).toBe("outside");
    const wall = preset();
    wall[2] = { ...(wall[2] as InteriorStation), x: 2 };
    expect(interiorLayoutProblem(shop(wall), s)).toBe("wall");
    const over = preset();
    over[0] = { ...(over[0] as InteriorStation), x: 2, y: 1 };
    expect(interiorLayoutProblem(shop(over), s)).toBe("overlap");
    const odd = preset();
    odd[0] = { ...(odd[0] as InteriorStation), kind: "ghost" };
    expect(interiorLayoutProblem(shop(odd), s)).toBe("kind");
  });
});

describe("the rate of a hall", () => {
  it("is its slowest stage's, the bottleneck named (worked by hand on the preset)", () => {
    // cut: 60 s a unit, nothing to carry → 60/h; press: 120 s for 2, 2 tiles carried at 6 s → 72 s
    // a unit → 50/h; bake: 90 s, 2 tiles → 102 s → 35.294/h; without a buffer each stage after the
    // first loses 10 % to the variations.
    const r = rate(shop());
    expect(r.stages.map((x) => x.rateMilli)).toEqual([60_000, 45_000, 31_764]);
    expect(r.unitsMilliPerHour).toBe(31_764);
    expect(r.lotsMilliPerHour).toBe(15_882);
    expect(r.bottleneck).toEqual({ stage: "bake", station: "s3" });
    expect(r.byproductMilliPerHour).toBe(15_882);
    expect(r.qualityBps).toBe(0);
  });

  it("breaks the bottleneck with a second station of its stage, side by side", () => {
    const two = [
      ...preset(),
      { id: "s4", kind: "kiln", x: 3, y: 0, rot: 0 as const, level: 1, wear: 0, care: 0 },
    ];
    const r = rate(shop(two));
    const bake = r.stages[2];
    expect(bake?.stations).toHaveLength(2);
    expect(bake?.rateMilli ?? 0).toBeGreaterThan(rate(shop()).stages[2]?.rateMilli ?? 0);
    expect(r.bottleneck.stage).toBe("press");
  });

  it("is a dead stop at a station that wants hands and has none, never at one that runs alone", () => {
    const r = rate(shop(), [hand("h1", "s1", "sawyer")]);
    expect(r.stages[1]?.rateMilli).toBe(0);
    expect(r.unitsMilliPerHour).toBe(0);
    expect(r.bottleneck).toEqual({ stage: "press", station: "s2" });
    expect(rate(shop()).stages[2]?.rateMilli).toBeGreaterThan(0);
  });

  it("names an empty stage the bottleneck", () => {
    const r = rate(shop(preset().slice(0, 2)));
    expect(r.unitsMilliPerHour).toBe(0);
    expect(r.bottleneck).toEqual({ stage: "bake", station: null });
  });
});

describe("the carrying", () => {
  it("costs so much a tile between a station's goods and the next one's door", () => {
    const near = rate(shop()).stages[2]?.stations[0];
    expect(near?.handlingMs).toBe(12_000);
    const far = preset();
    far[2] = { ...(far[2] as InteriorStation), x: 0, y: 2 };
    const r = rate(shop(far));
    // from the press's exit (3, 1) to the kiln's entry (-1, 2): 5 tiles; from its exit (1, 2) to
    // the door (4, 2): 3 more.
    expect(r.stages[2]?.stations[0]?.handlingMs).toBe(48_000);
    expect(r.unitsMilliPerHour).toBeLessThan(rate(shop()).unitsMilliPerHour);
  });

  it("falls to almost nothing along a conveyor", () => {
    const links = [{ from: "s2", to: "s3", via: [[3, 0]] as [number, number][] }];
    const r = rate(shop(preset(), { links }));
    expect(r.stages[2]?.stations[0]?.handlingMs).toBe(1_000);
  });

  it("takes from the nearest station of the stage before", () => {
    const two = [
      ...preset(),
      { id: "s5", kind: "press", x: 0, y: 2, rot: 0 as const, level: 1, wear: 0, care: 0 },
    ];
    // the second press's goods come out at (2, 2), right at the kiln's back: nothing to carry.
    const r = rate(shop(two), [...crew(), hand("h3", "s5", "carpenter")]);
    expect(r.stages[2]?.stations[0]?.handlingMs).toBe(0);
  });
});

describe("the hands", () => {
  const cut = (staff: EmpireStaff[]) =>
    interiorThroughput(shop(), { staff }, s).stages[0]?.rateMilli;

  it("work at their trade's full rate, a labourer at 70 %, a stranger at 50 %", () => {
    expect(cut([hand("h", "s1", "sawyer")])).toBe(60_000);
    expect(cut([hand("h", "s1", "labourer")])).toBe(42_000);
    expect(cut([hand("h", "s1", "potter")])).toBe(30_000);
  });

  it("go faster with their skill and their rarity", () => {
    expect(cut([hand("h", "s1", "sawyer", { level: 11 })])).toBe(72_000);
    expect(cut([hand("h", "s1", "sawyer", { rarity: "rare" })])).toBe(90_000);
  });

  it("add up to the station's seats, no more", () => {
    const up: InteriorStation[] = preset().map((x) => (x.id === "s1" ? { ...x, level: 2 } : x));
    const one = [hand("a", "s1", "sawyer")];
    const two = [...one, hand("b", "s1", "sawyer")];
    const three = [...two, hand("c", "s1", "sawyer")];
    const r = (st: EmpireStaff[]) =>
      interiorThroughput(shop(up), { staff: st }, s).stages[0]?.rateMilli;
    expect(r(one)).toBe(80_000);
    expect(r(two)).toBe(160_000);
    expect(r(three)).toBe(160_000);
  });

  it("slow down as they tire, to a floor; a night shift shares the day", () => {
    expect(cut([hand("h", "s1", "sawyer", { fatigue: 2_000 })])).toBe(48_000);
    expect(cut([hand("h", "s1", "sawyer", { fatigue: 9_000 })])).toBe(36_000);
    // two shifts: the station runs on the mean of the two; one alone covers the whole day.
    const day = hand("d", "s1", "sawyer", { fatigue: 2_000 });
    const night = hand("n", "s1", "sawyer", {}, "night");
    expect(cut([day, night])).toBe(54_000);
    expect(cut([hand("n", "s1", "sawyer", {}, "night")])).toBe(60_000);
  });

  it("from another workshop or nowhere, do not count", () => {
    const away = hand("h", "s1", "sawyer");
    away.station = { workshopId: "w2", stationId: "s1", shift: "day" };
    expect(cut([away])).toBe(0);
  });
});

describe("wear and fatigue, in closed form", () => {
  const I = s.interior;
  if (!I) throw new Error("fixture");

  it("wear slows a machine to a floor and never passes the full", () => {
    expect(wearFactorBps(0, I)).toBe(10_000);
    expect(wearFactorBps(4_000, I)).toBe(8_000);
    expect(wearFactorBps(10_000, I)).toBe(7_000);
    expect(wearAfter(9_000, 100, 20)).toBe(10_000);
    expect(wearAfter(0, 100, 20)).toBe(2_000);
    const worn = preset().map((x) => (x.id === "s1" ? { ...x, wear: 4_000 } : x));
    expect(rate(shop(worn)).stages[0]?.rateMilli).toBe(48_000);
  });

  it("fatigue rises at work and falls at rest, bounded", () => {
    expect(fatigueWorking(0, 2 * 3_600_000, I)).toBe(1_000);
    expect(fatigueWorking(9_800, 3_600_000, I)).toBe(10_000);
    expect(fatigueResting(3_000, 2 * 3_600_000, I)).toBe(1_000);
    expect(fatigueResting(500, 3_600_000, I)).toBe(0);
    expect(fatigueFactorBps(10_000, I)).toBe(6_000);
  });
});

describe("buffers, care and quality", () => {
  it("a buffer gives back what the variations take, whole at its full size", () => {
    const base = rate(shop()).stages[1]?.rateMilli;
    const half = rate(shop(preset(), { buffers: { "cut>press": 2 } })).stages[1]?.rateMilli;
    const full = rate(shop(preset(), { buffers: { "cut>press": 4 } })).stages[1]?.rateMilli;
    expect(base).toBe(45_000);
    expect(half).toBe(47_500);
    expect(full).toBe(50_000);
    expect(rate(shop(preset(), { buffers: { "cut>press": 6 } })).stages[1]?.rateMilli).toBe(50_000);
  });

  it("care slows a station and raises the quality; an inspection raises it more", () => {
    const careful = preset().map((x) => ({ ...x, care: 10_000 }));
    const r = rate(shop(careful));
    expect(r.stages[0]?.rateMilli).toBe(40_000);
    expect(r.qualityBps).toBe(6_000);
    const half = preset().map((x) => (x.id === "s1" ? { ...x, care: 6_000 } : x));
    expect(rate(shop(half)).qualityBps).toBe(1_200);
    const inspected = [
      ...careful,
      { id: "s6", kind: "inspector", x: 0, y: 2, rot: 0 as const, level: 1, wear: 0, care: 0 },
    ];
    expect(rate(shop(inspected), [...crew(), hand("h9", "s6", "carpenter")]).qualityBps).toBe(
      7_500,
    );
    // an inspection without its inspector does nothing.
    expect(rate(shop(inspected)).qualityBps).toBe(6_000);
  });
});

describe("determinism", () => {
  it("gives the same rate whatever the order of the stations and the hands", () => {
    const a = rate(shop());
    const b = interiorThroughput(
      shop([...preset()].reverse()),
      { staff: [...crew()].reverse() },
      s,
    );
    expect(b).toEqual(a);
    expect(rate(shop())).toEqual(a);
  });

  it("is all integers", () => {
    const r = rate(shop(preset().map((x) => ({ ...x, care: 3_333, wear: 1_234 }))));
    const nums = [
      r.unitsMilliPerHour,
      r.lotsMilliPerHour,
      r.qualityBps,
      r.byproductMilliPerHour,
      ...r.stages.flatMap((x) => [
        x.rateMilli,
        ...x.stations.flatMap((y) => [y.rateMilli, y.handlingMs]),
      ]),
    ];
    for (const n of nums) expect(Number.isInteger(n)).toBe(true);
  });
});
