import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, netWorth } from "../src/index.js";
import { deliverySettings } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, ...more });

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  // 10 h in Paris: open hours.
  w.at(9 * HOUR);
  for (const id of ["a", "b"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 200).give(id, "bricks", 100).give(id, "planks", 100);
  }
  return w;
}

const vehiclesOf = (w: World, playerId: string) =>
  Object.values(w.state.vehicles ?? {}).filter((v) => v.playerId === playerId);

describe("vehicles", () => {
  it("are given on joining and counted in net worth at cost", () => {
    const w = world();
    const [cart] = vehiclesOf(w, "a");
    expect(cart?.type).toBe("cart");
    // 100 ducats and 10 planks at 220.
    expect(cart?.investedValue).toBe(10_000n + 2_200n);
    expect(cart?.busyUntil).toBe(0);
    const worth = netWorth(w.ctx, w.state, "a", w.now);
    const buildings = Object.values(w.state.buildings)
      .filter((b) => b.playerId === "a")
      .reduce((n, b) => n + b.investedValue, 0n);
    expect(worth.buildings).toBe(buildings + 12_200n);
  });

  it("are bought with ducats and materials, which leave the game, up to the limit", () => {
    const w = world();
    const cash = w.cash("a");
    w.do({ type: "buyVehicle", playerId: "a", vehicleType: "cart" });
    expect(w.cash("a")).toBe(cash - 10_000n);
    expect(w.stock("a", "planks").available).toBe(90);
    expect(w.state.accounts["system:sink"]).toBe(10_000n);
    w.do({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    expect(vehiclesOf(w, "a")).toHaveLength(3);
    const more = w.try({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    expect(more.ok ? "ok" : more.error).toBe("max_vehicles");
    const unknown = w.try({ type: "buyVehicle", playerId: "b", vehicleType: "galley" });
    expect(unknown.ok ? "ok" : unknown.error).toBe("unknown_vehicle_type");
  });

  it("cost their upkeep every day", () => {
    const withVehicles = world();
    withVehicles.do({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    const without = world({
      deliveries: { ...deliverySettings.deliveries, startingVehicles: [] } as never,
    });
    const before = [withVehicles.cash("a"), without.cash("a")];
    for (const w of [withVehicles, without]) {
      w.at(DAY + 9 * HOUR);
      w.do({ type: "tick" });
    }
    const paid = (w: World, i: number) => (before[i] ?? 0n) - w.cash("a");
    // Cart 2 ducats and mule 1 ducat a day.
    expect(paid(withVehicles, 0) - paid(without, 1)).toBe(300n);
  });
});
