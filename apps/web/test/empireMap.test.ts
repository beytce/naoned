import { describe, expect, it } from "vitest";
import { seatOf } from "../src/art/mediterranean.js";
import {
  CHART,
  actionsOf,
  canCasa,
  coverClamp,
  coverScale,
  detailOf,
  farCamera,
  fleetOf,
  hudOf,
  nearScale,
  nearness,
  placeable,
  placingCost,
  scaleBounds,
} from "../src/empire/map/logic.js";
import type { EmpirePayload, EmpireRegion, EmpireWorkshop } from "../src/empire/types.js";

const HOUR = 3_600_000;
const PHONE = { w: 390, h: 844 };
const PC = { w: 1440, h: 900 };

const region = (code: string, casa: number, counter = 0): EmpireRegion =>
  ({
    code,
    casa,
    counter,
    buildingUntil: null,
    demands: ["bread"],
    next: null,
    postCost: "50000",
    cities: { found: counter > 0 ? 1 : 0, all: 2 },
  }) as unknown as EmpireRegion;

const job = { recipe: "grow_wheat", startedAt: 0, batches: 24, level: 1, batchMs: HOUR / 2 };
const farm = (j: EmpireWorkshop["job"]): EmpireWorkshop => ({
  id: "w1",
  type: "farm",
  recipe: "grow_wheat",
  level: 1,
  job: j,
});

function payload(over: Partial<NonNullable<EmpirePayload["view"]>> = {}, cash = "100000") {
  return {
    kind: "empire",
    now: 0,
    joined: true,
    cash,
    stock: {},
    market: [],
    casa: [],
    goods: {},
    catalog: [
      {
        type: "farm",
        name: "Ferme",
        recipes: [{ code: "grow_wheat", inputs: {}, outputs: { wheat: 8 }, minutes: 30 }],
      },
    ],
    view: {
      house: { casa: 1, favour: 12, seals: 3, workshops: [farm(null)], builds: [] },
      buildSlots: 1,
      upgrades: { w1: { level: 2, cost: "20000", minutes: 30 } },
      nextCasa: {
        level: 2,
        cost: "50000",
        minutes: 60,
        materials: {},
        requirementMet: true,
        requires: { workshops: 0, level: 0 },
        opens: [],
        cutBps: 0,
      },
      regions: [
        region("veneto", 1, 1),
        region("lombardia", 6),
        region("friuli", 8),
        region("levante", 14),
      ],
      map: {
        cells: {
          "2,4": { region: "veneto", coast: true },
          "2,3": { region: "veneto", coast: false },
          "3,3": { region: "veneto", coast: true },
          "1,4": { region: "lombardia", coast: false },
        },
        revealed: ["2,4", "2,3", "3,3", "1,4"],
        posts: [{ cell: "2,3", region: "veneto" }],
        sites: [],
        arsenal: null,
        cities: [
          { code: "venezia", cell: "2,4", region: "veneto" },
          { code: "milano", cell: "1,4", region: "lombardia" },
        ],
        radius: 2,
        arsenalSite: { cost: "300000", minutes: 480, casa: 9 },
      },
      vehicles: {
        shop: [],
        mine: [
          { id: "v1", type: "mule", busyUntil: 0, capacity: 10 },
          { id: "v2", type: "mule", busyUntil: 5 * HOUR, capacity: 10 },
        ],
        voyages: [],
        haulPerDay: 80,
      },
      ...over,
    },
  } as unknown as EmpirePayload;
}

describe("the map's camera (the map at the centre, step 1)", () => {
  it("always covers the screen, on a phone as on a computer", () => {
    for (const view of [PHONE, PC]) {
      const s = coverScale(view);
      expect(CHART.w * s).toBeGreaterThanOrEqual(view.w - 0.01);
      expect(CHART.h * s).toBeGreaterThanOrEqual(view.h - 0.01);
      const c = coverClamp({ s, tx: 500, ty: 500 }, view);
      expect(c.tx).toBeLessThanOrEqual(0);
      expect(c.ty).toBeLessThanOrEqual(0);
      const far = coverClamp({ s, tx: -99999, ty: -99999 }, view);
      expect(far.tx + CHART.w * s).toBeGreaterThanOrEqual(view.w - 0.01);
      expect(far.ty + CHART.h * s).toBeGreaterThanOrEqual(view.h - 0.01);
    }
  });

  it("opens Venice's house up close, and only up close", () => {
    for (const view of [PHONE, PC]) {
      const { min, max } = scaleBounds(view);
      expect(detailOf(min, view)).toBe("far");
      expect(detailOf(max, view)).toBe("near");
      const near = nearScale(view);
      expect(near).toBeLessThanOrEqual(max);
      expect(detailOf(near, view)).toBe("near");
      expect(nearness(near, view)).toBe(1);
      expect(nearness(min, view)).toBe(0);
    }
  });
});

describe("the camera far out", () => {
  it("frames every region in sight, never smaller than the screen", () => {
    for (const view of [PHONE, PC]) {
      const cam = farCamera(payload(), view);
      expect(cam.s).toBeGreaterThanOrEqual(coverScale(view) - 1e-9);
      expect(detailOf(cam.s, view)).toBe("far");
      for (const code of ["veneto", "lombardia"]) {
        const [x, y] = seatOf(code);
        expect(x * cam.s + cam.tx).toBeGreaterThan(20);
        expect(x * cam.s + cam.tx).toBeLessThan(view.w - 20);
        expect(y * cam.s + cam.ty).toBeGreaterThan(20);
        expect(y * cam.s + cam.ty).toBeLessThan(view.h - 20);
      }
    }
  });
});

describe("the corners", () => {
  it("count the ducats, the Favour and the Seals, in that order", () => {
    expect(hudOf(payload({}, "123400"))).toEqual([
      { id: "ducats", value: expect.stringContaining("1") },
      { id: "favour", value: "12" },
      { id: "seals", value: "3" },
    ]);
  });

  it("count the vehicles at home among all, with no cap", () => {
    expect(fleetOf(payload(), HOUR)).toEqual({ free: 1, total: 2 });
    expect(fleetOf(payload(), 6 * HOUR)).toEqual({ free: 2, total: 2 });
  });
});

describe("putting down on the map (step 2)", () => {
  it("lights the cells a counter may go on: seen, of a region reached, free", () => {
    expect(placeable(payload(), { kind: "post" })).toEqual(["2,4", "3,3"]);
    const casa6 = payload({
      house: { casa: 6, favour: 0, seals: 0, workshops: [], builds: [] },
    } as never);
    expect(placeable(casa6, { kind: "post" })).toEqual(["1,4", "2,4", "3,3"]);
    expect(placeable(casa6, { kind: "post", region: "lombardia" })).toEqual(["1,4"]);
    expect(placingCost(casa6, { kind: "post" }, "1,4")).toBe("50000");
  });

  it("lights the coasts for the Arsenal, its price from the view", () => {
    expect(placeable(payload(), { kind: "arsenal" })).toEqual(["2,4", "3,3"]);
    expect(placingCost(payload(), { kind: "arsenal" }, "2,4")).toBe("300000");
  });
});

describe("the action panel", () => {
  it("collects a ready workshop, relaunches one at rest, then its level and its details", () => {
    const ready = payload({
      house: { casa: 1, favour: 0, seals: 0, workshops: [farm(job)], builds: [] },
    } as never);
    expect(actionsOf(ready, { kind: "workshop", id: "w1" }, HOUR).map((a) => a.id)).toEqual([
      "collect",
      "upgrade",
      "details",
    ]);
    const idle = actionsOf(payload(), { kind: "workshop", id: "w1" }, 0);
    expect(idle.map((a) => a.id)).toEqual(["relaunch", "upgrade", "details"]);
    expect(idle[1]).toMatchObject({ cost: "20000", disabled: false });
    expect(actionsOf(payload({}, "100"), { kind: "workshop", id: "w1" }, 0)[1]?.disabled).toBe(
      true,
    );
    // At its highest for the Casa reached: a locked square, the next Casa lifts it.
    expect(
      actionsOf(payload({ upgrades: {} }), { kind: "workshop", id: "w1" }, 0)[1],
    ).toMatchObject({ id: "upgrade", icon: "lock", disabled: true });
  });

  it("offers the next Casa when it may be built, and greys it otherwise", () => {
    expect(canCasa(payload())).toBe(true);
    const casa = actionsOf(payload(), { kind: "casa" }, 0);
    expect(casa.map((a) => a.id)).toEqual(["casa", "workshops", "details"]);
    expect(casa[0]).toMatchObject({ disabled: false, action: { type: "empireBuildCasa" } });
    expect(actionsOf(payload({}, "10"), { kind: "casa" }, 0)[0]?.disabled).toBe(true);
  });

  it("keeps a region the Casa has not reached locked, and puts a counter down in one it has", () => {
    expect(actionsOf(payload(), { kind: "region", code: "lombardia" }, 0)).toEqual([
      { id: "closed", icon: "lock", words: { key: "closed", n: 6 }, disabled: true },
    ]);
    const casa6 = payload({
      house: { casa: 6, favour: 0, seals: 0, workshops: [], builds: [] },
    } as never);
    const open = actionsOf(casa6, { kind: "city", code: "milano" }, 0);
    expect(open[0]).toMatchObject({ id: "post", cost: "50000", open: "place:post:lombardia" });
    expect(open.at(-1)).toMatchObject({ id: "details", open: "region:lombardia" });
  });

  it("delivers to a city of an open region what the house holds of its demands", () => {
    const p = payload();
    p.stock = { bread: 12 };
    const city = actionsOf(p, { kind: "city", code: "venezia" }, 0);
    expect(city[0]).toMatchObject({
      id: "deliver:bread",
      good: "bread",
      action: { type: "empireDeliver", good: "bread", qty: 12, city: "venezia" },
    });
  });
});
