import { describe, expect, it } from "vitest";
import {
  type Command,
  type DeliveryOrder,
  type WorldSettingsInput,
  deliveryOrdersFor,
  hexDistance,
  hexNeighbors,
  orderVisible,
  podestaOf,
  signoriaStandings,
} from "../src/index.js";
import { deliverySettings, testTerraferma } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

/**
 * The Signoria of the cities (R2 of the audit of 27 October 2026, docs/plan-rupture.md): a city
 * is taken by delivering to it or by holding it on the Terraferma, on the same gauge; its leader
 * at the day's close is its Podestà, who takes a toll on the others' deliveries there and sees
 * its orders before them.
 */

const signoria = {
  cityPointsPerHour: 10,
  decayBps: 5_000,
  minPoints: 1,
  maxCities: 1,
  tollBps: 1_000,
  previewMinutes: 30,
  newcomerDays: 0,
  openHours: { from: 8, to: 22 },
};

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, signoria, ...more } as Partial<WorldSettingsInput>);

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  // 10 h in Paris: open hours.
  w.at(9 * HOUR);
  for (const id of ["a", "b"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 400).give(id, "bricks", 200).give(id, "planks", 100);
  }
  return w;
}

const today = (w: World) => Math.floor((w.now - w.ctx.startAt) / DAY);
const board = (w: World, playerId = "a") => deliveryOrdersFor(w.ctx, w.state, playerId, today(w));
const pick = (w: World, playerId = "a", kind: DeliveryOrder["kind"] = "city") => {
  const o = board(w, playerId).find((x) => x.kind === kind && x.quantity <= 40);
  if (!o) throw new Error(`no ${kind} order`);
  return o;
};
const cartOf = (w: World, playerId = "a") =>
  Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === playerId)?.id ?? "";
const dispatch = (w: World, orderId: string, playerId = "a") =>
  w.try({
    type: "dispatchDelivery",
    playerId,
    orderId,
    vehicleId: cartOf(w, playerId),
  } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const arriveAll = (w: World) => {
  const last = Math.max(...Object.values(w.state.deliveries ?? {}).map((d) => d.arriveAt));
  w.at(last - w.ctx.startAt).do({ type: "tick" });
};

describe("the Signoria of the cities", () => {
  it("counts a delivery's ducats on the city's gauge, live", () => {
    const w = world();
    const o = pick(w);
    expect(error(dispatch(w, o.id))).toBe("ok");
    expect(signoriaStandings(w.state, o.city)).toEqual([]);
    arriveAll(w);
    const [first] = signoriaStandings(w.state, o.city);
    expect(first?.playerId).toBe("a");
    expect(first?.points).toBe(Number((o.unitPrice * BigInt(o.quantity)) / 100n));
  });

  it("counts nothing for a delivery sent at night", () => {
    const w = world();
    w.at(22 * HOUR + 30 * MIN);
    const o = pick(w);
    expect(error(dispatch(w, o.id))).toBe("ok");
    arriveAll(w);
    expect(signoriaStandings(w.state, o.city)).toEqual([]);
  });

  it("names the day's leader Podestà at the day's close, and its points decay", () => {
    const w = world();
    const o = pick(w);
    expect(error(dispatch(w, o.id))).toBe("ok");
    arriveAll(w);
    const points = signoriaStandings(w.state, o.city)[0]?.points ?? 0;
    w.at(DAY + 9 * HOUR);
    const res = w.do({ type: "tick" });
    expect(podestaOf(w.state, o.city)).toBe("a");
    expect(res.effects.events.some((e) => e.type === "podesta_named" && e.playerId === "a")).toBe(
      true,
    );
    expect(signoriaStandings(w.state, o.city)[0]?.points).toBe(Math.floor(points / 2));
  });

  it("never names a house of the computer, and a house holds its cities up to the limit", () => {
    const w = world();
    const a = w.state.players.a;
    if (!a) throw new Error("no a");
    w.state = {
      ...w.state,
      players: { ...w.state.players, a: { ...a, npc: true } },
      signoria: {
        day: 0,
        points: { venezia: { a: 100, b: 50 }, padova: { b: 80 } },
        podesta: {},
      },
    };
    w.at(DAY + 9 * HOUR).do({ type: "tick" });
    // The computer's house is passed over; b may hold one city only: its best gauge's.
    expect(podestaOf(w.state, "padova")).toBe("b");
    expect(podestaOf(w.state, "venezia")).toBeUndefined();
  });

  it("takes the Podestà's toll on the others' deliveries, through the ledger", () => {
    const w = world();
    const o = pick(w);
    w.state = {
      ...w.state,
      signoria: { day: 0, points: {}, podesta: { [o.city]: { playerId: "b", since: 0 } } },
    };
    const a = w.cash("a");
    const b = w.cash("b");
    expect(error(dispatch(w, o.id))).toBe("ok");
    arriveAll(w);
    const paid = o.unitPrice * BigInt(o.quantity);
    expect(w.cash("b") - b).toBe(paid / 10n);
    expect(w.cash("a") - a).toBe(paid - paid / 10n);
    expect(w.state.turnover?.b).toBe(paid / 10n);
  });

  it("spares a newcomer the toll", () => {
    const w = world({ signoria: { ...signoria, newcomerDays: 3 } } as never);
    const o = pick(w);
    w.state = {
      ...w.state,
      signoria: { day: 0, points: {}, podesta: { [o.city]: { playerId: "b", since: 0 } } },
    };
    const b = w.cash("b");
    expect(error(dispatch(w, o.id))).toBe("ok");
    arriveAll(w);
    expect(w.cash("b")).toBe(b);
  });

  it("lets the Podestà see and take its city's orders before the others", () => {
    const w = world();
    const urgent = board(w).find((x) => x.kind === "urgent" && x.opensAt > w.now + 30 * MIN);
    if (!urgent) throw new Error("no urgent order still to open");
    w.at(urgent.opensAt - 20 * MIN - w.ctx.startAt);
    expect(orderVisible(w.ctx, w.state, "a", urgent, w.now)).toBe(false);
    expect(error(dispatch(w, urgent.id))).toBe("order_not_open");
    w.state = {
      ...w.state,
      signoria: {
        day: today(w),
        points: {},
        podesta: { [urgent.city]: { playerId: "a", since: 0 } },
      },
    };
    expect(orderVisible(w.ctx, w.state, "a", urgent, w.now)).toBe(true);
    expect(error(dispatch(w, urgent.id))).toBe("ok");
  });

  it("is off without its settings", () => {
    const w = world({ signoria: undefined } as never);
    const o = pick(w);
    expect(error(dispatch(w, o.id))).toBe("ok");
    arriveAll(w);
    w.at(DAY + 9 * HOUR).do({ type: "tick" });
    expect(signoriaStandings(w.state, o.city)).toEqual([]);
    expect(podestaOf(w.state, o.city)).toBeUndefined();
  });

  it("counts each open hour a city is held on the Terraferma", () => {
    const w = new World(
      ctx({
        terraferma: {
          ...testTerraferma,
          live: true,
          start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2 },
        },
      } as never),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    const map = w.state.terra?.map;
    if (!map) throw new Error("no map");
    const cell = map.owner.findIndex(
      (o, k) =>
        o === null &&
        hexNeighbors(map.map, k).length === 6 &&
        map.owner.every((p, j) => p === null || hexDistance(map.map, k, j) >= 2),
    );
    w.do({ type: "terraPlace", playerId: "a", cell } as Command);
    // The capital stands for Venice on this map.
    const terra = w.state.terra;
    if (!terra) throw new Error("no terra");
    const cityCode = [...terra.map.map.cityCode];
    cityCode[cell] = "venezia";
    w.state = {
      ...w.state,
      terra: { ...terra, map: { ...terra.map, map: { ...terra.map.map, cityCode } } },
    };
    w.advance(2 * HOUR).do({ type: "tick" });
    const points = signoriaStandings(w.state, "venezia")[0];
    expect(points?.playerId).toBe("a");
    // 10 points an hour, two hours (within a step).
    expect(points?.points).toBeGreaterThanOrEqual(18);
    expect(points?.points).toBeLessThanOrEqual(20);
  });
});
