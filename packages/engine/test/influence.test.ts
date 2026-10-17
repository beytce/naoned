import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  dailyFor,
  deliveryOrdersFor,
  houseMissionsFor,
  houseSpendFor,
  reserveOf,
  rushCost,
} from "../src/index.js";
import { campaignSettings, deliverySettings, testCampaign, testHouse } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const earned = (res: ReturnType<World["do"]>) =>
  res.effects.events
    .filter((e) => e.type === "influence_earned")
    .map((e) => ({ playerId: e.playerId, ...e.data }) as Record<string, unknown>);

/** Sells bread to Venice `times` times (the testing world still buys at the counter). */
function sell(w: World, playerId: string, times = 1) {
  for (let i = 0; i < times; i++) {
    w.give(playerId, "bread", 1);
    w.do({ type: "sellToCity", playerId, city: "venezia", resource: "bread", quantity: 1 });
  }
}

describe("the house's missions", () => {
  it("draw a board for everyone, count the merchant's events and pay Influence once", () => {
    const w = new World(makeContext({ house: testHouse }));
    for (const id of ["a", "b"]) w.do({ type: "join", playerId: id, region: "terraferma" });
    const board = houseMissionsFor(w.ctx, w.state, "a", w.now);
    expect(board.missions).toHaveLength(3);
    expect(houseMissionsFor(w.ctx, w.state, "b", w.now).missions.map((m) => m.id)).toEqual(
      board.missions.map((m) => m.id),
    );
    expect(board.endsAt).toBe(w.ctx.startAt + 84 * HOUR);

    const selling = board.missions.find((m) => m.event === "city_sale");
    if (!selling) throw new Error("no selling mission on the board");
    const claim = () => w.try({ type: "claimHouseMission", playerId: "a", missionId: selling.id });
    expect(error(claim())).toBe("mission_not_done");
    sell(w, "a", selling.count);
    const res = w.do({ type: "claimHouseMission", playerId: "a", missionId: selling.id });
    expect(earned(res)).toEqual([
      {
        playerId: "a",
        source: "mission",
        key: `mission:0:${selling.id}`,
        amount: selling.influence,
      },
    ]);
    expect(error(claim())).toBe("mission_claimed");
    // b's sales are b's.
    expect(
      houseMissionsFor(w.ctx, w.state, "b", w.now).missions.every((m) => m.progress === 0),
    ).toBe(true);
    expect(error(w.try({ type: "claimHouseMission", playerId: "a", missionId: "nothing" }))).toBe(
      "unknown_mission",
    );
  });

  it("start again with the next board", () => {
    const w = new World(makeContext({ house: testHouse }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    sell(w, "a", 2);
    w.advance(84 * HOUR);
    const next = houseMissionsFor(w.ctx, w.state, "a", w.now);
    expect(next.board).toBe(1);
    expect(next.missions.every((m) => m.progress === 0 && !m.claimed)).toBe(true);
  });

  it("are none in a world without them", () => {
    const w = new World(makeContext());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(houseMissionsFor(w.ctx, w.state, "a", w.now).missions).toEqual([]);
  });
});

/** a of the plain, with a cart on the road to a city (the world of deliveries). */
function onTheRoad(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext({ ...deliverySettings, house: testHouse, ...more }));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.do({ type: "join", playerId: "b", region: "terraferma" });
  w.give("a", "bread", 200);
  return w;
}

function send(w: World) {
  const done = w.state.deliveriesDone?.a?.ids ?? [];
  const o = deliveryOrdersFor(w.ctx, w.state, "a", 0).find(
    (x) =>
      x.resource === "bread" &&
      !x.takenBy &&
      !done.includes(x.id) &&
      x.opensAt <= w.now &&
      w.now < x.expiresAt,
  );
  const vehicle = Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === "a");
  if (!o || !vehicle) throw new Error("nothing to send");
  w.do({ type: "dispatchDelivery", playerId: "a", orderId: o.id, vehicleId: vehicle.id });
  const d = Object.values(w.state.deliveries ?? {}).at(-1);
  if (!d) throw new Error("no delivery");
  return { d, o };
}

describe("a rushed delivery", () => {
  it("arrives at once, paid as usual, for Influence by the time left", () => {
    const w = onTheRoad();
    const { d, o } = send(w);
    w.advance(5 * MIN);
    const left = d.arriveAt - w.now;
    expect(rushCost(w.ctx, w.state.deliveries?.[d.id] ?? d, w.now)).toBe(
      Math.ceil(left / (20 * MIN)),
    );
    const cash = w.cash("a");
    expect(error(w.try({ type: "rushDelivery", playerId: "b", deliveryId: d.id } as Command))).toBe(
      "not_owner",
    );
    w.do({ type: "rushDelivery", playerId: "a", deliveryId: d.id });
    const after = w.state.deliveries?.[d.id];
    expect(after?.outcome).toBe("delivered");
    expect(w.cash("a")).toBe(cash + o.unitPrice * BigInt(o.quantity));
    // The vehicle still has the road back.
    expect(after?.backAt).toBe(w.now + (d.arriveAt - d.departAt));
    expect(error(w.try({ type: "rushDelivery", playerId: "a", deliveryId: d.id }))).toBe(
      "not_en_route",
    );
  });

  it("is limited each day", () => {
    const w = onTheRoad({
      deliveries: { ...deliverySettings.deliveries, maxVehicles: 5 } as never,
    });
    for (let i = 0; i < 2; i++) {
      const { d } = send(w);
      w.do({ type: "rushDelivery", playerId: "a", deliveryId: d.id });
      w.advance(4 * HOUR);
    }
    const { d } = send(w);
    expect(error(w.try({ type: "rushDelivery", playerId: "a", deliveryId: d.id }))).toBe(
      "rush_limit",
    );
    expect(houseSpendFor(w.ctx, w.state, "a", w.now)?.rushesLeft).toBe(0);
    w.advance(DAY);
    expect(houseSpendFor(w.ctx, w.state, "a", w.now)?.rushesLeft).toBe(2);
    expect(error(w.try({ type: "rushDelivery", playerId: "a", deliveryId: d.id }))).not.toBe(
      "rush_limit",
    );
  });
});

/** a of the Rossi, b of the Verdi, Milan quiet. */
function campaign() {
  const quiet = { ...testCampaign, milan: { ...testCampaign.milan, base: 0, perActive: 0 } };
  const w = new World(makeContext({ ...campaignSettings, campaign: quiet, house: testHouse }));
  w.at(0);
  for (const id of ["a", "b"]) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
  w.do({ type: "joinFamily", playerId: "b", family: "verdi" });
  w.do({ type: "tick" });
  return w;
}

describe("troops bought with Influence", () => {
  it("join the reserve, besides those hired for ducats, up to a number a day", () => {
    const w = campaign();
    w.at(10 * HOUR);
    const cash = w.cash("a");
    w.do({ type: "buyTroops", playerId: "a", count: 6 });
    expect(w.cash("a")).toBe(cash);
    expect(reserveOf(w.state, "a", w.now)).toBe(6);
    expect(error(w.try({ type: "buyTroops", playerId: "a", count: 5 }))).toBe("troop_limit");
    w.do({ type: "buyTroops", playerId: "a", count: 4 });
    expect(houseSpendFor(w.ctx, w.state, "a", w.now)).toMatchObject({
      troopsLeft: 0,
      troopsPerPoint: 2,
      rushWork: 5,
    });
    w.advance(DAY);
    w.do({ type: "buyTroops", playerId: "a", count: 10 });
  });
});

describe("a work finished at once", () => {
  it("serves now, for a family's land with a work under way", () => {
    const w = campaign();
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 10 });
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 5 });
    w.at(10 * HOUR + 20 * MIN).do({ type: "tick" });
    expect(error(w.try({ type: "rushWork", playerId: "a", land: "borgo" }))).toBe("no_work");
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "tower" });
    expect(error(w.try({ type: "rushWork", playerId: "b", land: "borgo" }))).toBe("no_work");
    w.do({ type: "rushWork", playerId: "a", land: "borgo" });
    expect(w.state.campaign?.lands.borgo?.work?.readyAt).toBe(w.now);
    expect(error(w.try({ type: "rushWork", playerId: "a", land: "borgo" }))).toBe("work_ready");
  });
});

describe("choices made again during the season", () => {
  it("move the second counter to a third region", () => {
    const w = onTheRoad();
    w.do({ type: "grantPatent", playerId: "a", patent: "second_counter" });
    expect(error(w.try({ type: "moveSecondCounter", playerId: "a", region: "lagoon" }))).toBe(
      "no_second_counter",
    );
    w.do({ type: "chooseSecondCounter", playerId: "a", region: "lagoon" });
    expect(error(w.try({ type: "moveSecondCounter", playerId: "a", region: "lagoon" }))).toBe(
      "same_region",
    );
    expect(error(w.try({ type: "moveSecondCounter", playerId: "a", region: "terraferma" }))).toBe(
      "same_region",
    );
    w.do({ type: "moveSecondCounter", playerId: "a", region: "dolomites" });
    expect(w.state.players.a?.secondRegion).toBe("dolomites");
  });

  it("let the mastery be chosen again", () => {
    const w = onTheRoad();
    expect(error(w.try({ type: "resetSpecialty", playerId: "a" }))).toBe("no_specialty");
    const a = w.state.players.a;
    if (!a) throw new Error("no player");
    w.state = { ...w.state, players: { ...w.state.players, a: { ...a, specialty: "carter" } } };
    w.do({ type: "resetSpecialty", playerId: "a" });
    expect(w.state.players.a?.specialty).toBeUndefined();
  });

  it("swap a task of the day for another", () => {
    const daily = {
      perDay: 1,
      tasks: [
        { id: "sell_bread", event: "city_sale", count: 1, reward: { goods: { bread: 5 } } },
        { id: "offer", event: "order_placed", count: 1, reward: { goods: { wood: 5 } } },
      ],
      chest: { ducats: 2_000, perStreakDay: 1_000, maxStreak: 3 },
    };
    const w = new World(makeContext({ daily: daily as never, house: testHouse }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const [first] = dailyFor(w.ctx, w.state, "a", w.now).tasks;
    if (!first) throw new Error("no task");
    w.do({ type: "rerollDaily", playerId: "a", taskId: first.id });
    const [then] = dailyFor(w.ctx, w.state, "a", w.now).tasks;
    expect(then?.id).not.toBe(first.id);
    expect(error(w.try({ type: "rerollDaily", playerId: "a", taskId: first.id }))).toBe(
      "unknown_daily",
    );
    // b keeps the day's task.
    w.do({ type: "join", playerId: "b", region: "terraferma" });
    expect(dailyFor(w.ctx, w.state, "b", w.now).tasks[0]?.id).toBe(first.id);
  });
});
