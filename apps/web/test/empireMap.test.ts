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
  fogOf,
  hudOf,
  nearScale,
  nearness,
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
    charterFavour: 40,
    buildingUntil: null,
    next: counter === 0 ? { level: 1, cost: "50000", minutes: 60, charter: true } : null,
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

describe("the fog", () => {
  it("hides the regions ahead, shows the house's own and the next on the way", () => {
    expect(fogOf(payload())).toEqual({
      veneto: "open",
      lombardia: "edge",
      friuli: "hidden",
      levante: "hidden",
    });
    const casa6 = payload({
      house: { casa: 6, favour: 0, seals: 0, workshops: [], builds: [] },
    } as never);
    expect(fogOf(casa6)).toMatchObject({ lombardia: "edge", friuli: "edge", levante: "hidden" });
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

  it("keeps a region the Casa has not reached locked, and charters one it has", () => {
    expect(actionsOf(payload(), { kind: "region", code: "lombardia" }, 0)).toEqual([
      { id: "closed", icon: "lock", words: { key: "closed", n: 6 }, disabled: true },
    ]);
    const casa6 = payload({
      house: { casa: 6, favour: 50, seals: 0, workshops: [], builds: [] },
    } as never);
    const open = actionsOf(casa6, { kind: "region", code: "lombardia" }, 0);
    expect(open[0]).toMatchObject({ id: "charter", action: { type: "empireCharter" } });
    expect(actionsOf(payload(), { kind: "region", code: "veneto" }, 0).map((a) => a.id)).toEqual([
      "convoy",
      "details",
    ]);
  });
});
