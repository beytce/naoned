import { describe, expect, it } from "vitest";
import { upcoming } from "../src/game/timeline.js";
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
