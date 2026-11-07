import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireView,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The first steps, lot 2 (docs/plan-premiers-pas.md, the owner's feedback of 6 November 2026):
// a new house is led to its first order. Its first workshop rises at once, its first lot is made
// in seconds, an order of welcome waits in the nearest town for exactly that lot, and its first
// delivery there goes quickly. Once only, for a house founded with the welcome; never for those of
// before.
const SECOND = 1_000;
const welcome = {
  workshop: { type: "farm", recipe: "grow_wheat" },
  batchSeconds: 30,
  tripSeconds: 45,
  payDucats: 100,
};
const empire: EmpireSettingsInput = {
  ...ordersEmpire,
  start: { capitalDucats: 10_000, workshops: [], vehicles: ["cart"] },
  moves: { ...ordersEmpire.moves, returnHome: true },
  welcome,
};

function world(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const build = (w: World) =>
  w.try({
    type: "empireBuildWorkshop",
    playerId: "a",
    workshopType: "farm",
    recipe: "grow_wheat",
  });
const relaunch = (w: World) => w.do({ type: "empireRelaunchAll", playerId: "a" });
const welcomeOrder = (w: World) =>
  (view(w)?.orders ?? []).flatMap((c) => c.orders).find((o) => o.id.endsWith("#welcome"));

describe("the welcome of a new house", () => {
  it("names the workshop to build first, in the view", () => {
    const w = world();
    expect(house(w).welcome).toEqual({});
    expect(view(w)?.welcome?.workshop).toEqual(welcome.workshop);
  });

  it("raises the first workshop at once", () => {
    const w = world();
    expect(error(build(w))).toBe("");
    w.advance(SECOND);
    expect(house(w).workshops).toHaveLength(1);
    expect(house(w).welcome?.built).toBe(true);
  });

  it("makes the first lot in seconds, an order of welcome waiting for exactly it", () => {
    const w = world();
    build(w);
    w.advance(SECOND);
    expect(welcomeOrder(w)).toBeUndefined();
    relaunch(w);
    const job = house(w).workshops[0]?.job;
    expect(job?.batches).toBe(1);
    expect(job?.batchMs).toBe(30 * SECOND);
    // The order of welcome: the nearest town, the good of the lot, its quantity, its pay.
    const o = welcomeOrder(w);
    expect(o?.city).toBe("venezia");
    expect(o?.good).toBe("wheat");
    expect(o?.qty).toBe(20);
    expect(BigInt(o?.pay ?? 0)).toBe(10_000n);
    w.advance(30 * SECOND);
    relaunch(w);
    expect(w.state.inventories.a?.wheat?.available).toBe(20);
    // The next lots at the workshop's own pace.
    expect(house(w).workshops[0]?.job?.batchMs).toBe(HOUR);
  });

  it("brings the order of welcome quickly, paid at the arrival", () => {
    const w = world();
    build(w);
    w.advance(SECOND);
    relaunch(w);
    w.advance(30 * SECOND);
    relaunch(w);
    const before = cash(w);
    expect(error(w.try({ type: "empireDeliverCity", playerId: "a", city: "venezia" }))).toBe("");
    const leg = house(w).vehicles?.[0]?.legs?.[0];
    expect((leg?.arrivesAt ?? 0) - (leg?.departAt ?? 0)).toBe(45 * SECOND);
    w.advance(45 * SECOND);
    w.do({ type: "empireSettle", playerId: "a" });
    // Its pay, the wages taken as on every receipt.
    expect(cash(w) - before).toBeGreaterThan(9_000n);
    expect(cash(w) - before).toBeLessThanOrEqual(10_000n);
    expect(house(w).welcome?.done).toBe(true);
  });

  it("is given once: the next order and the next delivery at their own pace", () => {
    const w = world();
    build(w);
    w.advance(SECOND);
    relaunch(w);
    w.advance(30 * SECOND);
    relaunch(w);
    w.do({ type: "empireDeliverCity", playerId: "a", city: "venezia" });
    w.advance(2 * HOUR);
    w.do({ type: "empireSettle", playerId: "a" });
    expect(welcomeOrder(w)).toBeUndefined();
    const second = w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "bakery",
      recipe: "bake_bread",
    });
    expect(error(second)).toBe("");
    expect(house(w).builds[0]?.endsAt).toBeGreaterThan(w.now);
  });

  it("keeps the haste for the welcome's own workshop, built later if another came first", () => {
    const w = world();
    // A bakery first: built at its own pace, no welcome for it.
    w.do({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "bakery",
      recipe: "bake_bread",
    });
    expect(house(w).builds[0]?.endsAt).toBeGreaterThan(w.now);
    w.advance(HOUR);
    expect(house(w).welcome?.built).toBeUndefined();
    // Then the farm: at once, its first lot quick, the order of welcome for its wheat.
    build(w);
    w.advance(SECOND);
    relaunch(w);
    const farm = house(w).workshops.find((x) => x.type === "farm");
    expect(farm?.job?.batchMs).toBe(30 * SECOND);
    expect(welcomeOrder(w)?.good).toBe("wheat");
  });

  it("adds nothing to the quick lot's queue: a relaunch waits for it", () => {
    const w = world();
    build(w);
    w.advance(SECOND);
    relaunch(w);
    relaunch(w);
    expect(house(w).workshops[0]?.job?.batches).toBe(1);
    w.advance(30 * SECOND);
    relaunch(w);
    // Done, the queue fills at the workshop's own pace.
    expect(house(w).workshops[0]?.job?.batchMs).toBe(HOUR);
    expect(house(w).workshops[0]?.job?.once).toBeUndefined();
  });

  it("leaves a house of before as it was: no welcome, no haste", () => {
    const { welcome: _, ...before } = empire;
    const w = world(before);
    expect(house(w).welcome).toBeUndefined();
    expect(view(w)?.welcome).toBeUndefined();
    build(w);
    w.advance(HOUR);
    relaunch(w);
    expect(house(w).workshops[0]?.job?.batchMs).toBe(HOUR);
    expect(welcomeOrder(w)).toBeUndefined();
  });
});
