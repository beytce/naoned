import { describe, expect, it } from "vitest";
import {
  bestUpgrade,
  costForLevel,
  nextActions,
  recipesFor,
  workshopEconomics,
} from "../src/index.js";
import { World } from "./helpers.js";

describe("a workshop's economics", () => {
  it("says what it earns an hour, what the next level adds and when it pays back", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = Object.values(w.state.buildings).find(
      (b) => b.playerId === "a" && b.type === "farm",
    );
    if (!farm) throw new Error("no farm");
    const e = workshopEconomics(w.ctx, w.state, "a", farm, w.now);
    expect(e.marginPerHour).toBeGreaterThan(0n);
    expect(e.next?.addedPerHour).toBeGreaterThan(0n);
    expect(e.next?.paybackMinutes).toBeGreaterThan(0);
    // A level up pays back faster on a workshop that earns more an hour.
    expect(e.next?.cost).toBeGreaterThan(0n);
  });

  it("points at the upgrade that pays back first", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const best = bestUpgrade(w.ctx, w.state, "a", w.now);
    expect(best).not.toBeNull();
    const all = Object.values(w.state.buildings)
      .filter((b) => b.playerId === "a")
      .map(
        (b) =>
          workshopEconomics(w.ctx, w.state, "a", b, w.now).next?.paybackMinutes ??
          Number.POSITIVE_INFINITY,
      );
    expect(best?.paybackMinutes).toBe(Math.min(...all));
  });
});

describe("honest advice", () => {
  it("passes over a workshop whose goods pile up unsold", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    const pit = w.buildingsOf("a").find((b) => b.type === "clay_pit");
    if (!pit) throw new Error("no clay pit");
    const before = workshopEconomics(w.ctx, w.state, "a", pit, w.now);
    expect(before.unsold.stock).toBe(w.stock("a", "clay").available);
    w.give("a", "clay", 1_000);
    const e = workshopEconomics(w.ctx, w.state, "a", pit, w.now);
    expect(e.unsold.stock).toBe(w.stock("a", "clay").available);
    // 20 clay an hour: a thousand in stock is fifty hours of digging.
    expect(e.unsold.hoursOfOutput).toBeGreaterThanOrEqual(w.ctx.settings.advice.glutHours);
    expect(bestUpgrade(w.ctx, w.state, "a", w.now)?.buildingId).not.toBe(pit.id);
  });

  it("names the input a workshop lacks for one batch, and does not advise upgrading it", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    const works = w.buildingsOf("a").find((b) => b.type === "brickworks");
    if (!works) throw new Error("no brickworks");
    const clay = w.stock("a", "clay").available;
    if (clay > 0) {
      w.do({
        type: "sellToCity",
        playerId: "a",
        city: "venezia",
        resource: "clay",
        quantity: clay,
      });
    }
    expect(w.stock("a", "clay").available).toBe(0);
    expect(workshopEconomics(w.ctx, w.state, "a", works, w.now).missingInputs).toEqual(["clay"]);
    expect(bestUpgrade(w.ctx, w.state, "a", w.now)?.buildingId).not.toBe(works.id);
    w.give("a", "clay", 20);
    expect(workshopEconomics(w.ctx, w.state, "a", works, w.now).missingInputs).toEqual([]);
  });
});

describe("the next best action", () => {
  it("harvests first, then restarts idle workshops, then the best upgrade it can pay", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = w.buildingsOf("a").find((b) => b.type === "farm");
    if (!farm) throw new Error("no farm");
    // A new counter: its workshops stand idle, the farm needs nothing to start.
    const idle = nextActions(w.ctx, w.state, "a", w.now);
    expect(idle.some((a) => a.kind === "produce" && a.buildingId === farm.id)).toBe(true);
    expect(idle.some((a) => a.kind === "harvest")).toBe(false);

    const recipe = recipesFor(w.ctx.theme, "farm")[0]?.code ?? "";
    w.do({ type: "startProduction", playerId: "a", buildingId: farm.id, recipe, batches: 1 });
    w.advance(3 * 3_600_000);
    const later = nextActions(w.ctx, w.state, "a", w.now);
    expect(later[0]).toMatchObject({ kind: "harvest", count: 1 });
    // A workshop whose batches are all done counts as idle again.
    expect(later.some((a) => a.kind === "produce" && a.buildingId === farm.id)).toBe(true);
  });

  it("names the upgrade only once the ducats and materials are there", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const best = bestUpgrade(w.ctx, w.state, "a", w.now);
    const b = best && w.state.buildings[best.buildingId];
    if (!b) throw new Error("no upgrade");
    const cost = costForLevel(w.ctx, b.type, b.level + 1);
    const has = (n: ReturnType<typeof nextActions>) => n.some((a) => a.kind === "upgrade");
    for (const [res, qty] of Object.entries(cost.materials)) {
      const missing = qty - w.stock("a", res).available;
      if (missing > 0) w.give("a", res, missing);
    }
    const enough = w.cash("a") >= cost.ducats;
    expect(has(nextActions(w.ctx, w.state, "a", w.now))).toBe(enough);
  });
});
