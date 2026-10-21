import { describe, expect, it } from "vitest";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

function farmOf(w: World, playerId: string) {
  const farm = w.buildingsOf(playerId).find((b) => b.type === "farm");
  if (!farm) throw new Error("no farm");
  return farm;
}

describe("production", () => {
  it("starts with capital and the regional kit", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(w.cash("a")).toBe(100_000n);
    expect(
      w
        .buildingsOf("a")
        .map((b) => b.type)
        .sort(),
    ).toEqual(["farm", "mill"]);
  });

  it("credits finished batches lazily, with the regional bonus", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = farmOf(w, "a");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 3,
    });
    w.advance(2 * HOUR + 30 * MIN);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(2 * 26); // 20 × 1.3, two batches done
    w.advance(30 * MIN);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(3 * 26);
    expect(w.state.buildings[farm.id]?.job).toBeNull();
  });

  it("gives the same result whatever the collection frequency", () => {
    const run = (stepMs: number) => {
      const w = new World();
      w.do({ type: "join", playerId: "a", region: "terraferma" });
      const farm = farmOf(w, "a");
      w.do({
        type: "startProduction",
        playerId: "a",
        buildingId: farm.id,
        recipe: "grow_wheat",
        batches: 8,
      });
      for (let t = 0; t < 9 * HOUR; t += stepMs) {
        w.advance(stepMs);
        w.do({ type: "collect", playerId: "a", buildingId: farm.id });
      }
      return w.stock("a", "wheat").available;
    };
    expect(run(15 * MIN)).toBe(run(MIN));
    expect(run(15 * MIN)).toBe(run(9 * HOUR));
  });

  it("consumes inputs at start and refuses a queue longer than 8 h", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const mill = w.buildingsOf("a").find((b) => b.type === "mill");
    if (!mill) throw new Error("no mill");
    w.give("a", "wheat", 100);
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 4,
    });
    expect(w.stock("a", "wheat").available).toBe(60);
    const tooMuch = w.try({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 13,
    });
    expect(tooMuch.ok).toBe(false);
    if (!tooMuch.ok) expect(tooMuch.error).toBe("queue_full");
    const noInput = w.try({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 7,
    });
    expect(noInput.ok).toBe(false);
    if (!noInput.ok) expect(noInput.error).toBe("insufficient_stock");
    expect(w.stock("a", "wheat").available).toBe(60); // rejected command changed nothing
  });

  it("applies an upgrade to the next batches only", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = farmOf(w, "a");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 2,
    });
    w.give("a", "bricks", 40).give("a", "planks", 40);
    w.do({ type: "upgrade", playerId: "a", buildingId: farm.id });
    const busy = w.try({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    expect(busy.ok).toBe(false);
    w.advance(2 * HOUR);
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    expect(w.stock("a", "wheat").available).toBe(2 * 26); // old batches at level 1
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(2 * 26 + 52); // new batch at level 2
  });

  it("finishes the first one-batch job of a starting building in seconds", () => {
    const w = new World(
      makeContext({ tutorial: { minutes: 30, fastBatchSeconds: 30, fastBatchesPerBuilding: 1 } }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = farmOf(w, "a");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    // Appending to an accelerated job is refused: it would speed up normal batches.
    expect(
      w.try({
        type: "startProduction",
        playerId: "a",
        buildingId: farm.id,
        recipe: "grow_wheat",
        batches: 1,
      }).ok,
    ).toBe(false);
    w.advance(30_000);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(26);
    // Only once per building: the next batch takes its normal time.
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    w.advance(30_000);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(26);
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(52);
  });

  it("does not accelerate after the tutorial window or for several batches", () => {
    const w = new World(
      makeContext({ tutorial: { minutes: 30, fastBatchSeconds: 30, fastBatchesPerBuilding: 1 } }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = farmOf(w, "a");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 2,
    });
    w.advance(MIN);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(0);

    const late = new World(
      makeContext({ tutorial: { minutes: 30, fastBatchSeconds: 30, fastBatchesPerBuilding: 1 } }),
    );
    late.do({ type: "join", playerId: "b", region: "terraferma" });
    late.advance(31 * MIN);
    const lateFarm = farmOf(late, "b");
    late.do({
      type: "startProduction",
      playerId: "b",
      buildingId: lateFarm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    late.advance(MIN);
    late.do({ type: "collect", playerId: "b", buildingId: lateFarm.id });
    expect(late.stock("b", "wheat").available).toBe(0);
  });

  it("refuses a recipe from another building", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const res = w.try({
      type: "startProduction",
      playerId: "a",
      buildingId: farmOf(w, "a").id,
      recipe: "mill_flour",
      batches: 1,
    });
    expect(res.ok).toBe(false);
  });

  it("gives late joiners a temporary bonus", () => {
    const w = new World();
    w.at(8 * DAY).do({ type: "join", playerId: "late", region: "dolomites" });
    const sawmill = w.buildingsOf("late").find((b) => b.type === "sawmill");
    if (!sawmill) throw new Error("no sawmill");
    w.give("late", "wood", 20);
    w.do({
      type: "startProduction",
      playerId: "late",
      buildingId: sawmill.id,
      recipe: "saw_planks",
      batches: 1,
    });
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "late", buildingId: sawmill.id });
    expect(w.stock("late", "planks").available).toBe(18); // 12 × 1.5
  });

  it("starts production with an empty purse: buildings cost nothing to keep", () => {
    const w = new World(makeContext({ startingCapital: 0 }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(DAY + MIN).do({ type: "tick" });
    const res = w.try({
      type: "startProduction",
      playerId: "a",
      buildingId: farmOf(w, "a").id,
      recipe: "grow_wheat",
      batches: 1,
    });
    expect(res.ok).toBe(true);
  });

  it("harvests exactly the same with or without the Pass Négociant, fresh or not", () => {
    const harvest = (wait: number) => {
      const w = new World(
        makeContext({ pass: { enabled: true }, fresh: { minutes: 30, bonusBps: 500 } }),
      );
      w.do({ type: "join", playerId: "paid", region: "terraferma" });
      w.do({ type: "join", playerId: "free", region: "terraferma" });
      w.do({ type: "grantPass", playerId: "paid", until: w.now + 7 * DAY });
      for (const id of ["paid", "free"])
        w.do({
          type: "startProduction",
          playerId: id,
          buildingId: farmOf(w, id).id,
          recipe: "grow_wheat",
          batches: 2,
        });
      w.advance(2 * HOUR + wait);
      for (const id of ["paid", "free"])
        w.do({ type: "collect", playerId: id, buildingId: farmOf(w, id).id });
      return [w.stock("paid", "wheat").available, w.stock("free", "wheat").available];
    };
    // Collected at once: the second batch is fresh (20 × 1.35 = 27), the first is not (26).
    expect(harvest(5 * MIN)).toEqual([53, 53]);
    // Collected late: nothing fresh, for either.
    expect(harvest(2 * HOUR)).toEqual([52, 52]);
  });
});
