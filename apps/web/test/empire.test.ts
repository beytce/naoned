import { describe, expect, it } from "vitest";
import {
  activeEmpireTab,
  casaReached,
  daysOfIncome,
  lotProgress,
  queueEnd,
  readyLots,
  trendOf,
  wantsRelaunch,
  workshopStatus,
} from "../src/empire/logic.js";
import type { EmpirePayload, EmpireWorkshop } from "../src/empire/types.js";

const HOUR = 3_600_000;
const ws = (job: EmpireWorkshop["job"]): EmpireWorkshop => ({
  id: "w1",
  type: "farm",
  recipe: "grow_wheat",
  level: 1,
  job,
});

function payload(workshops: EmpireWorkshop[], stock: Record<string, number> = {}): EmpirePayload {
  return {
    kind: "empire",
    now: 0,
    joined: true,
    cash: "0",
    stock,
    market: [],
    casa: [],
    goods: {},
    catalog: [
      {
        type: "farm",
        name: "Ferme",
        recipes: [{ code: "grow_wheat", inputs: {}, outputs: { wheat: 8 }, minutes: 30 }],
      },
      {
        type: "mill",
        name: "Moulin",
        recipes: [
          { code: "mill_flour", inputs: { wheat: 10 }, outputs: { flour: 8 }, minutes: 30 },
        ],
      },
    ],
    view: { house: { workshops } } as unknown as EmpirePayload["view"],
  };
}

describe("the empire's queue, read in the browser", () => {
  const job = { recipe: "grow_wheat", startedAt: 0, batches: 24, level: 1, batchMs: HOUR / 2 };

  it("counts the lots ready, never past the queue", () => {
    expect(readyLots(ws(job), 2 * HOUR)).toBe(4);
    expect(readyLots(ws(job), 40 * HOUR)).toBe(24);
    expect(readyLots(ws(null), 2 * HOUR)).toBe(0);
  });

  it("says when the queue runs dry, and how far the lot under way is", () => {
    expect(queueEnd(ws(job))).toBe(12 * HOUR);
    expect(lotProgress(ws(job), HOUR / 4)).toBeCloseTo(0.5);
    expect(lotProgress(ws(job), 13 * HOUR)).toBe(0);
  });

  it("asks for a relaunch when lots wait or a workshop could run", () => {
    expect(wantsRelaunch(payload([ws(job)]), HOUR)).toBe(true);
    expect(wantsRelaunch(payload([ws({ ...job, startedAt: HOUR })]), HOUR + 1)).toBe(false);
    const mill: EmpireWorkshop = {
      id: "w2",
      type: "mill",
      recipe: "mill_flour",
      level: 1,
      job: null,
    };
    expect(wantsRelaunch(payload([mill]), 0)).toBe(false);
    expect(wantsRelaunch(payload([mill], { wheat: 10 }), 0)).toBe(true);
  });

  it("puts the next step in days of income, none before a sale", () => {
    expect(daysOfIncome("5000", "1000")).toBe(5);
    expect(daysOfIncome("5000", "1500")).toBe(3.3);
    expect(daysOfIncome("5000", "0")).toBeNull();
  });
});

describe("a workshop's star", () => {
  const job = { recipe: "grow_wheat", startedAt: 0, batches: 24, level: 1, batchMs: HOUR / 2 };
  const mill: EmpireWorkshop = {
    id: "w2",
    type: "mill",
    recipe: "mill_flour",
    level: 1,
    job: null,
  };

  it("reads ready, running, at rest or waiting for an input", () => {
    expect(workshopStatus(payload([ws(job)]), ws(job), HOUR)).toEqual({
      state: "ready",
      lots: 2,
      quantity: 16,
      good: "wheat",
    });
    expect(workshopStatus(payload([ws(job)]), ws(job), HOUR / 4)).toMatchObject({
      state: "running",
      left: HOUR / 4,
    });
    expect(workshopStatus(payload([ws(null)]), ws(null), 0)).toEqual({ state: "idle" });
    expect(workshopStatus(payload([mill]), mill, 0)).toEqual({
      state: "blocked",
      resource: "wheat",
    });
  });

  it("sees the Casa climb between two views", () => {
    const at = (casa: number) =>
      ({ ...payload([]), view: { house: { casa, workshops: [] } } }) as unknown as Parameters<
        typeof casaReached
      >[1];
    expect(casaReached(at(1), at(2))).toBe(2);
    expect(casaReached(at(2), at(2))).toBeNull();
    expect(casaReached(null, at(2))).toBeNull();
  });
});

describe("the empire's five tabs (lot C)", () => {
  it("send each sheet and place to its tab", () => {
    expect(activeEmpireTab(null, "veneto")).toBe("workshops");
    expect(activeEmpireTab("casa", null)).toBe("workshops");
    expect(activeEmpireTab("workshops", null)).toBe("workshops");
    expect(activeEmpireTab("workshop:w1", "veneto")).toBe("workshops");
    expect(activeEmpireTab("new:lombardia", "lombardia")).toBe("workshops");
    expect(activeEmpireTab("market", "veneto")).toBe("venice");
    expect(activeEmpireTab(null, null)).toBe("map");
    expect(activeEmpireTab(null, "lombardia")).toBe("map");
    expect(activeEmpireTab("voyage:veneto", "veneto")).toBe("map");
    expect(activeEmpireTab("company", null)).toBe("ranking");
    expect(activeEmpireTab("family", "veneto")).toBe("conquest");
  });

  it("read a price against its rate, 5 % either way", () => {
    expect(trendOf({ price: "1050", ref: "1000" })).toBe("up");
    expect(trendOf({ price: "1049", ref: "1000" })).toBe("flat");
    expect(trendOf({ price: "951", ref: "1000" })).toBe("flat");
    expect(trendOf({ price: "950", ref: "1000" })).toBe("down");
  });
});
