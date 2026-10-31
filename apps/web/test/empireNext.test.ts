import { describe, expect, it } from "vitest";
import { nextStep } from "../src/empire/next.js";
import type { EmpirePayload, EmpireWorkshop } from "../src/empire/types.js";

const HOUR = 3_600_000;
const NOW = 10 * HOUR;

/** A house as the empire's view sends it: Casa 1, three workshops of the socle, at rest. */
function house(over: {
  workshops?: EmpireWorkshop[];
  stock?: Record<string, number>;
  cash?: string;
  next?: Partial<NonNullable<NonNullable<EmpirePayload["view"]>["nextCasa"]>>;
  builds?: unknown[];
  claimable?: boolean;
  market?: EmpirePayload["market"];
  upgrades?: Record<string, unknown>;
}): EmpirePayload {
  const workshops = over.workshops ?? [
    { id: "clay", type: "clay_pit", recipe: "dig_clay", level: 1, job: null },
    { id: "wood", type: "lumber_camp", recipe: "fell_wood", level: 1, job: null },
    { id: "saw", type: "sawmill", recipe: "saw_planks", level: 1, job: null },
  ];
  return {
    kind: "empire",
    now: NOW,
    joined: true,
    cash: over.cash ?? "50000",
    stock: over.stock ?? {},
    market: over.market ?? [],
    casa: [],
    goods: {},
    catalog: [
      {
        type: "clay_pit",
        name: "Carrière",
        recipes: [{ code: "dig_clay", inputs: {}, outputs: { clay: 8 }, minutes: 30 }],
      },
      {
        type: "lumber_camp",
        name: "Bûcherons",
        recipes: [{ code: "fell_wood", inputs: {}, outputs: { wood: 11 }, minutes: 30 }],
      },
      {
        type: "sawmill",
        name: "Scierie",
        recipes: [
          { code: "saw_planks", inputs: { wood: 10 }, outputs: { planks: 6 }, minutes: 30 },
        ],
      },
      {
        type: "brickworks",
        name: "Briqueterie",
        recipes: [
          {
            code: "fire_bricks",
            inputs: { clay: 10, wood: 2 },
            outputs: { bricks: 6 },
            minutes: 30,
          },
        ],
      },
    ],
    view: {
      house: { casa: 1, workshops, builds: over.builds ?? [], favour: 0, seals: 0 },
      nextCasa: {
        level: 2,
        cost: "5000",
        minutes: 2,
        cutBps: 0,
        materials: { bricks: 5, planks: 5 },
        requirementMet: true,
        requires: { workshops: 0, level: 0 },
        opens: [],
        ...over.next,
      },
      newWorkshop: { level: 1, cost: "4800", minutes: 1, cutBps: 0 },
      buildSlots: 1,
      workshopSlots: 4,
      upgrades: over.upgrades ?? {},
      incomePerDay: "0",
      carnet: {
        week: 1,
        objectives: [
          { kind: "relaunch", target: 3, progress: over.claimable ? 3 : 0, claimed: false },
        ],
        carried: [],
        windUntil: null,
      },
    } as unknown as EmpirePayload["view"],
  };
}
const running = (id: string, type: string, recipe: string, startedAt: number): EmpireWorkshop => ({
  id,
  type,
  recipe,
  level: 1,
  job: { recipe, startedAt, batches: 24, level: 1, batchMs: HOUR / 2 },
});

describe("the next step", () => {
  it("first takes what is ready", () => {
    const p = house({ workshops: [running("clay", "clay_pit", "dig_clay", NOW - HOUR)] });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "collect", lots: 2 });
  });

  it("relaunches a workshop at rest whose inputs are there", () => {
    expect(nextStep(house({}), NOW)).toMatchObject({ kind: "relaunch" });
  });

  it("builds the Casa when all is there", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5 },
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "casa", level: 2 });
  });

  it("names the workshop the Casa lacks: the brickworks of the Casa 2", () => {
    const p = house({
      workshops: [
        running("clay", "clay_pit", "dig_clay", NOW),
        running("wood", "lumber_camp", "fell_wood", NOW),
        running("saw", "sawmill", "saw_planks", NOW),
      ],
    });
    expect(nextStep(p, NOW)).toMatchObject({
      kind: "build",
      good: "bricks",
      type: "brickworks",
      recipe: "fire_bricks",
    });
  });

  it("raises the lowest workshop when the Casa asks levels", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5 },
      next: { requirementMet: false, requires: { workshops: 1, level: 2 } },
      upgrades: { clay: { level: 2, cost: "1000", minutes: 5, cutBps: 0 } },
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "upgrade", workshopId: "clay", level: 2 });
  });

  it("sells what piles up when ducats are short, the cities' orders first", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5, clay: 40 },
      cash: "100",
      market: [
        {
          region: "veneto",
          good: "clay",
          ref: "300",
          price: "300",
          asked: true,
          depthLeft: 50,
          boardLeft: 10,
          asOf: NOW,
        },
      ],
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "sell", good: "clay", deliver: true });
  });

  it("claims an objective met", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      claimable: true,
      stock: { bricks: 1 },
      cash: "100",
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "claim", index: 0 });
  });

  it("else waits, and says until when", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW - 10)],
      stock: { bricks: 1 },
      cash: "100",
    });
    const step = nextStep(p, NOW);
    expect(step.kind).toBe("wait");
    expect(step.kind === "wait" && step.at).toBe(NOW - 10 + HOUR / 2);
  });
});
