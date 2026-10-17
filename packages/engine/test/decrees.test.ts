import { describe, expect, it } from "vitest";
import {
  type Command,
  type DecreePick,
  type Delivery,
  type WorldSettingsInput,
  deliveryOrdersFor,
  familyAccount,
  programmeOf,
  weekIndex,
} from "../src/index.js";
import { campaignSettings, deliverySettings } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;

/** a and c of the Rossi, b of the Verdi, at 10 h (Paris). */
function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext({ ...campaignSettings, ...more }));
  w.at(9 * HOUR);
  for (const id of ["a", "b", "c"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 200);
  }
  w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
  w.do({ type: "joinFamily", playerId: "b", family: "verdi" });
  w.do({ type: "joinFamily", playerId: "c", family: "rossi" });
  w.do({ type: "tick" });
  return w;
}

/** The Rossi won last week: their decrees are in force now (a's share of what they collect). */
function impose(w: World, items: DecreePick[], cities: string[] = []) {
  const c = w.state.campaign;
  if (!c) throw new Error("no campaign");
  const week = weekIndex(w.ctx, w.now);
  w.state = {
    ...w.state,
    campaign: { ...c, decrees: { week, family: "rossi", items, shares: { a: 1 }, cities } },
  };
}

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const vote = (w: World, playerId: string, picks: DecreePick[]) =>
  w.try({ type: "voteProgramme", playerId, picks });
const limit = (w: World, playerId: string, side: "buy" | "sell", price: bigint, qty = 10) =>
  w.try({
    type: "placeOrder",
    playerId,
    resource: "bread",
    side,
    kind: "limit",
    price,
    quantity: qty,
  } as Command);

describe("the programme", () => {
  it("is voted by the members, among the decrees of the catalogue", () => {
    const w = world();
    expect(error(vote(w, "a", [{ code: "gabelle" }]))).toBe("invalid_programme");
    expect(error(vote(w, "a", [{ code: "faveur", target: "bread" }]))).toBe("invalid_programme");
    expect(error(vote(w, "a", [{ code: "fondaco", target: "bread" }]))).toBe("invalid_programme");
    expect(error(vote(w, "a", [{ code: "fondaco" }, { code: "fondaco" }]))).toBe(
      "invalid_programme",
    );
    expect(error(vote(w, "a", [{ code: "fondaco" }, { code: "peage" }, { code: "levant" }]))).toBe(
      "invalid_programme",
    );
    expect(error(vote(w, "a", [{ code: "doge" }]))).toBe("invalid_programme");
    expect(error(vote(w, "a", [{ code: "gabelle", target: "bread" }]))).toBe("ok");
  });

  it("weighs each ballot by merit, no member above half the family's", () => {
    const w = world();
    vote(w, "a", [{ code: "gabelle", target: "bread" }, { code: "peage" }]);
    vote(w, "c", [{ code: "levant" }, { code: "peage" }]);
    const c = w.state.campaign;
    if (!c) throw new Error("no campaign");
    w.state = {
      ...w.state,
      campaign: {
        ...c,
        merit: { a: { battle: 30, garrisonMs: 0 }, c: { battle: 10, garrisonMs: 0 } },
      },
    };
    // a weighs 20 (half of 40), c 10: péage 30, gabelle 20, levant 10.
    expect(programmeOf(w.ctx, w.state, "rossi")).toEqual([
      { code: "peage" },
      { code: "gabelle", target: "bread" },
    ]);
  });

  it("falls back on the defaults, never a decree the family imposes this week", () => {
    const w = world();
    expect(programmeOf(w.ctx, w.state, "verdi")).toEqual([{ code: "fondaco" }, { code: "levant" }]);
    impose(w, [{ code: "fondaco" }]);
    vote(w, "a", [{ code: "fondaco" }]);
    expect(programmeOf(w.ctx, w.state, "rossi")).toEqual([{ code: "levant" }]);
  });
});

describe("the decrees", () => {
  it("the Fondaco's privilege: the members' market tax lighter", () => {
    const w = world();
    impose(w, [{ code: "fondaco" }]);
    const a = w.cash("a");
    limit(w, "b", "buy", 180n);
    limit(w, "a", "sell", 180n);
    // 1 % instead of 3 % on 1 800.
    expect(w.cash("a") - a).toBe(1_782n);
    const b = w.cash("b");
    limit(w, "a", "buy", 180n);
    limit(w, "b", "sell", 180n);
    expect(w.cash("b") - b).toBe(1_746n);
  });

  it("the gabelle: others' sales of the good pay the family, shared out at the end of the week", () => {
    const w = world();
    impose(w, [{ code: "gabelle", target: "bread" }]);
    limit(w, "a", "buy", 180n);
    const b = w.cash("b");
    limit(w, "b", "sell", 180n);
    // 3 % of tax and 4 % of gabelle on 1 800.
    expect(w.cash("b") - b).toBe(1_674n);
    expect(w.state.accounts[familyAccount("rossi")]).toBe(72n);
    // A member's sale pays no gabelle.
    limit(w, "b", "buy", 180n);
    limit(w, "c", "sell", 180n);
    expect(w.state.accounts[familyAccount("rossi")]).toBe(72n);
    const close = w.at(WEEK + MIN).do({ type: "tick" });
    expect(
      close.effects.ledger.filter((e) => e.reason === "decree_share").map((e) => [e.to, e.amount]),
    ).toEqual([["cash:a", 72n]]);
    expect(w.state.accounts[familyAccount("rossi")]).toBe(0n);
  });

  it("the calmiere: no offer of the good above its cap", () => {
    const w = world();
    impose(w, [{ code: "calmiere", target: "bread" }]);
    // 180 × 115 %.
    expect(error(limit(w, "b", "sell", 208n))).toBe("price_out_of_band");
    expect(error(limit(w, "a", "buy", 208n))).toBe("price_out_of_band");
    expect(error(limit(w, "b", "sell", 207n))).toBe("ok");
  });

  it("lapse with their week", () => {
    const w = world();
    impose(w, [{ code: "fondaco" }]);
    w.at(WEEK + 10 * HOUR);
    const a = w.cash("a");
    limit(w, "b", "buy", 180n);
    limit(w, "a", "sell", 180n);
    expect(w.cash("a") - a).toBe(1_746n);
  });
});

describe("the decrees on the roads", () => {
  const roads = () => world({ ...deliverySettings });
  const day = (w: World) => Math.floor((w.now - w.ctx.startAt) / DAY);
  const cart = (w: World, id: string) =>
    Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === id)?.id ?? "";

  /** The first city order of the board a merchant may take (to `city` if given). */
  function orderFor(w: World, playerId: string, city?: string) {
    const o = deliveryOrdersFor(w.ctx, w.state, playerId, day(w)).find(
      (x) =>
        x.kind === "city" &&
        !x.takenBy &&
        x.resource === "bread" &&
        (city === undefined || x.city === city) &&
        !(w.state.deliveriesDone?.[playerId]?.ids ?? []).includes(x.id),
    );
    if (!o) throw new Error(`no order to ${city}`);
    return o;
  }

  function send(w: World, playerId: string, city?: string): Delivery {
    const o = orderFor(w, playerId, city);
    w.do({
      type: "dispatchDelivery",
      playerId,
      orderId: o.id,
      vehicleId: cart(w, playerId),
    });
    return Object.values(w.state.deliveries ?? {}).at(-1) as Delivery;
  }

  it("the favour of a city pays its members more there", () => {
    const w = roads();
    const city = orderFor(w, "a").city;
    impose(w, [{ code: "faveur", target: city }]);
    const d = send(w, "a", city);
    const a = w.cash("a");
    w.at(d.arriveAt - w.ctx.startAt).do({ type: "tick" });
    expect(w.cash("a") - a).toBe(d.payment + d.payment / 10n);
    const e = send(w, "b");
    const b = w.cash("b");
    w.at(e.arriveAt - w.ctx.startAt).do({ type: "tick" });
    expect(w.cash("b") - b).toBe(e.payment);
  });

  it("the toll of the cities the family held takes a share of others' deliveries", () => {
    const w = roads();
    const city = orderFor(w, "b").city;
    impose(w, [{ code: "peage" }], [city]);
    const d = send(w, "b", city);
    const b = w.cash("b");
    w.at(d.arriveAt - w.ctx.startAt).do({ type: "tick" });
    const toll = (d.payment * 300n) / 10_000n;
    expect(w.cash("b") - b).toBe(d.payment - toll);
    expect(w.state.accounts[familyAccount("rossi")]).toBe(toll);
  });
});
