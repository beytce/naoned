import { describe, expect, it } from "vitest";
import {
  type Command,
  type DeliveryOrder,
  type WorldSettingsInput,
  deliveryOrdersFor,
  hasPatent,
  seasonInfluence,
  seasonTier,
} from "../src/index.js";
import { campaignSettings, deliverySettings, testDeliveries, testHouse } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const influence = (res: ReturnType<World["do"]>, source: string) =>
  res.effects.events
    .filter((e) => e.type === "influence_earned" && e.data?.source === source)
    .map((e) => ({ playerId: e.playerId, ...e.data }) as Record<string, unknown>);

/** a holds a privilege (the gilded name), b none; both of the plain (terraferma). */
function road(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext({ ...deliverySettings, house: testHouse, ...more }));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma", patents: ["gilded_name"] });
  w.do({ type: "join", playerId: "b", region: "terraferma" });
  for (const id of ["a", "b"]) w.give(id, "bread", 200).give(id, "bricks", 100);
  return w;
}

/** A bread order of the day, open now, from the cities a's board asks for. */
const order = (w: World, playerId: string) =>
  deliveryOrdersFor(w.ctx, w.state, playerId, 0).find(
    (o) => o.resource === "bread" && o.opensAt <= w.now && w.now < o.expiresAt,
  ) as DeliveryOrder;
const cartOf = (w: World, playerId: string) =>
  Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === playerId)?.id ?? "";
const dispatch = (w: World, playerId: string, o: DeliveryOrder) =>
  w.try({
    type: "dispatchDelivery",
    playerId,
    orderId: o.id,
    vehicleId: cartOf(w, playerId),
  } as Command);

describe("privileges", () => {
  it("come with the house on joining, and nothing without them", () => {
    const w = road();
    expect(w.state.players.a?.patents).toEqual(["gilded_name"]);
    expect(w.state.players.b?.patents).toBeUndefined();
    expect(hasPatent(w.ctx, w.state, "a", "gilded_name")).toBe(true);
    expect(hasPatent(w.ctx, w.state, "b", "gilded_name")).toBe(false);
  });

  it("are ignored in a world without them", () => {
    const w = road({ house: undefined });
    expect(hasPatent(w.ctx, w.state, "a", "gilded_name")).toBe(false);
  });

  it("no longer include a second counter: every vehicle leaves from home", () => {
    const w = road();
    const o = order(w, "a");
    expect(error(dispatch(w, "a", o))).toBe("ok");
    expect(Object.values(w.state.deliveries ?? {})[0]?.route).toBe(`terraferma:${o.city}`);
  });
});

describe("influence", () => {
  it("is earned by the week's net sales, capped", () => {
    const w = new World(makeContext({ house: testHouse }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.do({ type: "join", playerId: "c", region: "lagoon" });
    w.do({ type: "tick" });
    w.advance(HOUR).give("a", "bread", 20).give("b", "bread", 200);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    w.do({ type: "sellToCity", playerId: "b", city: "venezia", resource: "bread", quantity: 200 });
    const gainA = w.state.turnover?.a ?? 0n;
    w.at(WEEK + MIN);
    const earned = influence(w.do({ type: "tick" }), "commerce");
    const per = BigInt(testHouse.influence.commerce.ducatsPerPoint * 100);
    expect(earned).toEqual([
      { playerId: "a", source: "commerce", week: 0, amount: Number(gainA / per) },
      {
        playerId: "b",
        source: "commerce",
        week: 0,
        amount: testHouse.influence.commerce.weeklyCap,
      },
    ]);
  });

  it("is earned by the campaign's merit, with a bonus for the winning family, capped", () => {
    const w = new World(makeContext({ ...campaignSettings, house: testHouse }));
    w.at(0);
    for (const id of ["a", "b"]) w.do({ type: "join", playerId: id, region: "terraferma" });
    w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
    w.do({ type: "joinFamily", playerId: "b", family: "verdi" });
    w.do({ type: "tick" });
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 5 });
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 5 });
    w.at(WEEK + MIN);
    const earned = influence(w.do({ type: "tick" }), "campaign");
    const cfg = testHouse.influence.campaign;
    const a = earned.find((e) => e.playerId === "a");
    expect(a?.merit).toBeGreaterThan(0);
    expect(a?.amount).toBe(
      Math.min(cfg.weeklyCap, Math.floor(Number(a?.merit) / cfg.meritPerPoint) + cfg.winBonus),
    );
    // b's family held nothing and b earned no merit: nothing to write.
    expect(earned.some((e) => e.playerId === "b")).toBe(false);
  });

  it("is never earned in a world without it", () => {
    const w = new World(makeContext());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    w.at(WEEK + MIN);
    expect(influence(w.do({ type: "tick" }), "commerce")).toEqual([]);
  });
});

describe("the season's tier", () => {
  it("follows the rank of the close, the participant's after a week of play", () => {
    expect(seasonTier(1, 200, 0)).toBe("doge");
    expect(seasonTier(3, 200, 0)).toBe("podium");
    expect(seasonTier(10, 200, 0)).toBe("top10");
    expect(seasonTier(20, 200, 0)).toBe("elite");
    expect(seasonTier(50, 200, 0)).toBe("notable");
    expect(seasonTier(51, 200, 9)).toBe("participant");
    expect(seasonTier(51, 200, 2)).toBe("none");
  });

  it("brings the house its Influence, none without the setting", () => {
    const ctx = makeContext({ house: testHouse });
    expect(seasonInfluence(ctx, "doge")).toBe(testHouse.influence.season.doge);
    expect(seasonInfluence(ctx, "none")).toBe(0);
    expect(seasonInfluence(makeContext(), "doge")).toBe(0);
  });
});

describe("a privilege bought during the season", () => {
  it("takes effect at once, once, and only if the world knows it", () => {
    const w = road();
    w.do({ type: "grantPatent", playerId: "b", patent: "gilded_name" });
    expect(w.state.players.b?.patents).toEqual(["gilded_name"]);
    w.do({ type: "grantPatent", playerId: "b", patent: "gilded_name" });
    expect(w.state.players.b?.patents).toEqual(["gilded_name"]);
    expect(error(w.try({ type: "grantPatent", playerId: "b", patent: "lombardy" }))).toBe(
      "unknown_patent",
    );
    expect(error(w.try({ type: "grantPatent", playerId: "z", patent: "gilded_name" }))).toBe(
      "unknown_player",
    );
  });
});
