import { describe, expect, it } from "vitest";
import { tutorActive, tutorStep } from "../src/empire/tutor/script.js";
import type { EmpirePayload } from "../src/empire/types.js";

// The guided start (8 November 2026): from the founding to the Fondaco's level 2, one gesture lit
// at a time, the deepest first.
const NOW = 1_000_000;

function house(over: {
  casa?: number;
  welcome?: boolean;
  done?: boolean;
  workshops?: { id: string; type: string }[];
  builds?: unknown[];
  stock?: Record<string, number>;
}): EmpirePayload {
  return {
    kind: "empire",
    now: NOW,
    joined: true,
    cash: "50000",
    stock: over.stock ?? {},
    market: [],
    casa: [],
    goods: {},
    catalog: [
      {
        type: "lumber_camp",
        name: "Camp",
        recipes: [{ code: "cut_wood", inputs: {}, outputs: { wood: 12 }, minutes: 30 }],
      },
    ],
    view: {
      welcome:
        over.welcome === false
          ? undefined
          : { workshop: { type: "lumber_camp", recipe: "cut_wood" }, batchSeconds: 30 },
      house: {
        casa: over.casa ?? 1,
        workshops: (over.workshops ?? []).map((w) => ({
          ...w,
          recipe: "cut_wood",
          level: 1,
          job: null,
        })),
        builds: over.builds ?? [],
        welcome: over.welcome === false ? undefined : { done: over.done ?? false },
      },
      nextCasa: { level: 2, materials: { bricks: 5, planks: 5 } },
      orders: [],
      vehicles: { mine: [] },
    } as unknown as EmpirePayload["view"],
  };
}

describe("the guided start", () => {
  it("leads a new house only, until its Fondaco's level 2", () => {
    expect(tutorActive(house({}))).toBe(true);
    expect(tutorActive(house({ casa: 2 }))).toBe(false);
    expect(tutorActive(house({ welcome: false }))).toBe(false);
  });

  it("first lights the build button, then the free tile's card, then its pin", () => {
    const s = tutorStep(house({}), NOW);
    expect(s?.id).toBe("build");
    expect(s?.chain.slice(0, 3)).toEqual([
      "[data-build-recipe='cut_wood'] button",
      ".pc-card[data-card-place^='free:'] .pc-go",
      ".pc-pin[data-place^='free:']",
    ]);
  });

  it("after the welcome: the sawmill, the Market for what is short, then the Fondaco", () => {
    const camp = { id: "w1", type: "lumber_camp" };
    expect(tutorStep(house({ done: true, workshops: [camp] }), NOW)?.id).toBe("sawmill");
    const both = [camp, { id: "w2", type: "sawmill" }];
    const market = tutorStep(house({ done: true, workshops: both, stock: { planks: 5 } }), NOW);
    expect(market).toMatchObject({ id: "market", good: "bricks" });
    expect(market?.chain[0]).toBe("[data-market-buy='bricks'] button:not(:disabled)");
    const casa = tutorStep(
      house({ done: true, workshops: both, stock: { bricks: 5, planks: 5 } }),
      NOW,
    );
    expect(casa?.id).toBe("casa");
    expect(casa?.chain[0]).toBe("[data-map-action=casa]:not(:disabled)");
  });

  it("ends on the Fondaco rising, a wait with its arc", () => {
    const s = tutorStep(
      house({
        done: true,
        workshops: [{ id: "w1", type: "lumber_camp" }],
        builds: [{ kind: "casa", level: 2, startedAt: NOW - 1_000, endsAt: NOW + 119_000 }],
      }),
      NOW,
    );
    expect(s).toMatchObject({ id: "rising", until: NOW + 119_000, chain: [] });
  });
});
