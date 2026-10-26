import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, currentCriee, dailyFor, nextCriee } from "../src/index.js";
import { DAY, HOUR, MIN, T0, World, makeContext } from "./helpers.js";

const fresh = { fresh: { minutes: 30, bonusBps: 1_000 } };

function farmOf(w: World, playerId: string) {
  const farm = w.buildingsOf(playerId).find((b) => b.type === "farm");
  if (!farm) throw new Error("no farm");
  return farm;
}

describe("fresh produce", () => {
  it("adds a bonus to batches collected soon after they are done", () => {
    const run = (late: number) => {
      const w = new World(makeContext(fresh));
      w.do({ type: "join", playerId: "a", region: "terraferma" });
      const farm = farmOf(w, "a");
      w.do({
        type: "startProduction",
        playerId: "a",
        buildingId: farm.id,
        recipe: "grow_wheat",
        batches: 1,
      });
      w.advance(HOUR + late);
      w.do({ type: "collect", playerId: "a", buildingId: farm.id });
      return w.stock("a", "wheat").available;
    };
    // 20 × 1.3 regional bonus = 26; +10 % fresh: 20 × 1.4 = 28.
    expect(run(10 * MIN)).toBe(28);
    expect(run(31 * MIN)).toBe(26);
  });

  it("is off unless the world sets it", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = farmOf(w, "a");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(26);
  });
});

const criees = {
  criees: {
    perDay: 3,
    fromHour: 8,
    toHour: 20,
    minutes: 20,
    minPremiumBps: 1_500,
    maxPremiumBps: 2_500,
    perPlayer: 15,
    perActivePlayer: 10,
    minTotal: 20,
    resources: ["bread"],
  },
};

describe("the Criées of the Rialto", () => {
  it("opens a few short buying windows a day, known only once they start", () => {
    const ctx = makeContext(criees);
    const day = Array.from({ length: 24 * 6 }, (_, i) => currentCriee(ctx, T0 + i * 10 * MIN))
      .filter((c) => c !== null)
      .map((c) => c?.index);
    expect(new Set(day).size).toBe(3);
    const first = nextCriee(ctx, T0);
    expect(first).not.toBeNull();
    expect(first?.startsAt).toBeGreaterThanOrEqual(T0 + 8 * HOUR);
    expect(first?.endsAt).toBe((first?.startsAt ?? 0) + 20 * MIN);
    expect(first?.premiumBps).toBeGreaterThanOrEqual(1_500);
    expect(first?.premiumBps).toBeLessThanOrEqual(2_500);
  });

  it("buys at a premium, up to a share per merchant and a total", () => {
    const ctx = makeContext(criees);
    const c = nextCriee(ctx, T0);
    if (!c) throw new Error("no criée");
    const w = new World(ctx);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.give("a", "bread", 40).give("b", "bread", 40);
    expect(w.try({ type: "sellToCriee", playerId: "a", quantity: 5 }).ok).toBe(false);
    w.at(c.startsAt - T0 + MIN);
    const before = w.cash("a");
    w.do({ type: "sellToCriee", playerId: "a", quantity: 15 });
    const unit = (180n * BigInt(10_000 + c.premiumBps)) / 10_000n;
    expect(w.cash("a") - before).toBe(unit * 15n);
    const more = w.try({ type: "sellToCriee", playerId: "a", quantity: 1 });
    expect(more.ok ? "" : more.error).toBe("criee_quota");
    // Two active merchants: max(20, 2 × 10) = 20 units in all; 5 left for b.
    w.do({ type: "sellToCriee", playerId: "b", quantity: 5 });
    const full = w.try({ type: "sellToCriee", playerId: "b", quantity: 1 });
    expect(full.ok ? "" : full.error).toBe("criee_sold_out");
    w.at(c.endsAt - T0);
    const late = w.try({ type: "sellToCriee", playerId: "b", quantity: 1 });
    expect(late.ok ? "" : late.error).toBe("no_criee");
  });
});

const daily: Partial<WorldSettingsInput> = {
  daily: {
    perDay: 2,
    tasks: [
      { id: "sell_bread", event: "city_sale", count: 1, reward: { goods: { bread: 5 } } },
      { id: "offer", event: "order_placed", count: 1, reward: { goods: { wood: 5 } } },
    ],
    chest: { ducats: 2_000, perStreakDay: 1_000, maxStreak: 3 },
  },
};

describe("tasks of the day and the streak", () => {
  it("draws the day's tasks and pays a chest, larger each day in a row", () => {
    const w = new World(makeContext(daily));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const play = () => {
      w.give("a", "bread", 1);
      w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 1 });
      w.give("a", "wheat", 1);
      w.do({
        type: "placeOrder",
        playerId: "a",
        resource: "wheat",
        side: "sell",
        kind: "limit",
        price: 500n,
        quantity: 1,
      });
      for (const t of dailyFor(w.ctx, w.state, "a", w.now).tasks) {
        w.do({ type: "claimDaily", playerId: "a", taskId: t.id });
      }
    };
    expect(
      dailyFor(w.ctx, w.state, "a", w.now)
        .tasks.map((t) => t.id)
        .sort(),
    ).toEqual(["offer", "sell_bread"]);
    const c0 = w.cash("a");
    play();
    const day1 = dailyFor(w.ctx, w.state, "a", w.now);
    expect(day1.streak).toBe(1);
    expect(day1.chestClaimed).toBe(true);
    const chest1 = w.cash("a") - c0;

    w.advance(DAY);
    expect(dailyFor(w.ctx, w.state, "a", w.now).tasks.every((t) => !t.claimed)).toBe(true);
    const c1 = w.cash("a");
    play();
    expect(dailyFor(w.ctx, w.state, "a", w.now).streak).toBe(2);
    expect(w.cash("a") - c1 - (chest1 - 0n)).toBeGreaterThanOrEqual(1_000n - 100n);

    // A day missed: the streak starts again.
    w.advance(2 * DAY);
    play();
    expect(dailyFor(w.ctx, w.state, "a", w.now).streak).toBe(1);
    expect(dailyFor(w.ctx, w.state, "a", w.now).best).toBe(2);
  });

  it("forgives one day missed in each period of 7 days (E3-10), not two", () => {
    const w = new World(
      makeContext({
        daily: { ...daily.daily, chest: { ...daily.daily?.chest, graceDaysPerWeek: 1 } },
      } as Partial<WorldSettingsInput>),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const play = () => {
      w.give("a", "bread", 1);
      w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 1 });
      w.give("a", "wheat", 1);
      w.do({
        type: "placeOrder",
        playerId: "a",
        resource: "wheat",
        side: "sell",
        kind: "limit",
        price: 500n,
        quantity: 1,
      });
      for (const t of dailyFor(w.ctx, w.state, "a", w.now).tasks) {
        w.do({ type: "claimDaily", playerId: "a", taskId: t.id });
      }
    };
    const view = () => dailyFor(w.ctx, w.state, "a", w.now);
    play(); // day 0
    w.advance(DAY);
    play(); // day 1
    expect(view().graceLeft).toBe(1);
    // Day 2 missed: on day 3 the streak still stands, the grace of the week spent.
    w.advance(2 * DAY);
    expect(view().streak).toBe(2);
    expect(view().graceLeft).toBe(0);
    play();
    expect(view().streak).toBe(3);
    expect(view().graceLeft).toBe(0);
    // Day 4 missed too, in the same week: the streak starts again.
    w.advance(2 * DAY);
    expect(view().streak).toBe(0);
    play(); // day 5
    expect(view().streak).toBe(1);
    w.advance(DAY);
    play(); // day 6
    // A new week (days 7 to 13), a new grace: day 7 missed, day 8 goes on.
    w.advance(2 * DAY);
    expect(view().graceLeft).toBe(0);
    play();
    expect(view().streak).toBe(3);
    // Two days missed in a row are never forgiven by one grace.
    w.advance(3 * DAY);
    expect(view().streak).toBe(0);
  });

  it("refuses a task not done or already claimed", () => {
    const w = new World(makeContext(daily));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const r = w.try({ type: "claimDaily", playerId: "a", taskId: "sell_bread" });
    expect(r.ok ? "" : r.error).toBe("daily_not_done");
  });
});
