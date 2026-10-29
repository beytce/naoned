import { describe, expect, it } from "vitest";
import { terraUpcoming, upcoming } from "../src/game/timeline.js";
import type { BuildingView, DeliveryView } from "../src/game/types.js";

const MIN = 60_000;
const NOW = 1_000 * MIN;

const building = (
  id: string,
  job: { startedAt: number; batches: number; batchMs: number } | null,
) =>
  ({
    id,
    type: id,
    level: 1,
    recipe: null,
    job: job && { recipe: "r", level: 1, ready: 0, endsAt: 0, freshUntil: null, ...job },
    canStart: 0,
    fastSeconds: null,
    upgradeCost: null,
  }) as unknown as BuildingView;

const delivery = (id: string, arriveAt: number, outcome: DeliveryView["outcome"] = "en_route") =>
  ({ id, route: "terraferma:padova", arriveAt, outcome }) as unknown as DeliveryView;

const names = { building: (t: string) => t, city: (c: string) => c };

describe("the strip of what comes next", () => {
  it("puts the soonest first and keeps three", () => {
    const list = upcoming(
      {
        ...names,
        buildings: [
          building("mill", { startedAt: NOW - 18 * MIN, batches: 2, batchMs: 30 * MIN }),
          building("farm", { startedAt: NOW - 5 * MIN, batches: 1, batchMs: 30 * MIN }),
        ],
        deliveries: [delivery("d1", NOW + 1 * MIN)],
        nextWaveAt: NOW + 120 * MIN,
      },
      NOW,
    );
    expect(list.map((u) => u.key)).toEqual(["d:d1", "b:mill", "b:farm"]);
    expect(list[1]?.at).toBe(NOW + 12 * MIN);
  });

  it("skips what is already there: a finished job, a delivery arrived, a past wave", () => {
    const list = upcoming(
      {
        ...names,
        buildings: [
          building("farm", { startedAt: NOW - 40 * MIN, batches: 1, batchMs: 30 * MIN }),
          building("idle", null),
        ],
        deliveries: [delivery("a", NOW - MIN), delivery("b", NOW + MIN, "delivered")],
        nextWaveAt: NOW - MIN,
      },
      NOW,
    );
    expect(list).toEqual([]);
  });

  it("counts the next batch of a queue, not its end", () => {
    const [u] = upcoming(
      {
        ...names,
        buildings: [building("mill", { startedAt: NOW - 45 * MIN, batches: 3, batchMs: 30 * MIN })],
        deliveries: [],
        nextWaveAt: null,
      },
      NOW,
    );
    expect(u?.at).toBe(NOW + 15 * MIN);
  });
});

describe("the Conquest's strip of the day", () => {
  const fmt = { hour: (at: number) => `${at / MIN}m`, day: (at: number) => `d${at / MIN}` };
  const front = (mine: boolean, ...takes: number[]) => ({
    mine,
    takes: takes.map((at) => ({ at })),
  });

  it("reads the merchant's next front, the battle of the evening and the week's end, in order", () => {
    const list = terraUpcoming(
      {
        fronts: [
          front(false, NOW + 5 * MIN),
          front(true, NOW + 90 * MIN),
          front(true, NOW + 30 * MIN),
        ],
        battle: { from: 20, on: false },
        closesAt: NOW + 3_000 * MIN,
        closed: false,
      },
      NOW,
      fmt,
    );
    expect(list.map((u) => u.key)).toEqual(["front", "battle", "end"]);
    expect(list[0]?.label).toContain(`${(NOW + 30 * MIN) / MIN}m`);
    expect(list[1]?.label).toContain("20");
    expect(list[2]?.label).toContain(`d${(NOW + 3_000 * MIN) / MIN}`);
    expect(list.every((u) => u.plain)).toBe(true);
  });

  it("says the battle under way, and nothing once the week is closed", () => {
    const input = {
      fronts: [],
      battle: { from: 20, on: true },
      closesAt: NOW + MIN,
      closed: false,
    };
    expect(terraUpcoming(input, NOW, fmt).map((u) => u.key)).toEqual(["battle", "end"]);
    expect(terraUpcoming({ ...input, closed: true }, NOW, fmt)).toEqual([]);
    expect(terraUpcoming({ ...input, battle: null }, NOW, fmt).map((u) => u.key)).toEqual(["end"]);
  });
});
