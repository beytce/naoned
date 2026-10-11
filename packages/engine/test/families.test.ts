import { describe, expect, it } from "vitest";
import {
  SINK_ACCOUNT,
  type WorldSettingsInput,
  dayIndex,
  familyOrdersFor,
  familyStandings,
  netWorth,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;

const rules = {
  openDay: 2,
  ordersPerDay: 1,
  powerPremiumBps: 1_000,
  orderInfluence: 10,
  patronageUnit: 200,
  patronageMaxPerDay: 20,
  weeklyCapPerMember: 50,
  minMembers: 2,
  houses: [
    { code: "contarini", quantities: { bricks: 10, planks: 10 } },
    { code: "morosini", quantities: { wheat: 20 } },
  ],
};

const families: Partial<WorldSettingsInput> = {
  contracts: { perDay: 2, premiumBps: 2_000, quantities: { wheat: 20 } },
  families: rules,
};

function world(...ids: string[]) {
  const w = new World(makeContext(families));
  for (const id of ids) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "tick" });
  return w;
}

/** Joins a family once allegiance has opened (two days after joining). */
function pledge(w: World, playerId: string, family: string) {
  if (w.now < 2 * DAY + w.ctx.startAt) w.at(2 * DAY);
  w.do({ type: "joinFamily", playerId, family });
}

function order(w: World, playerId: string) {
  const day = dayIndex(w.ctx, w.now);
  const [o] = familyOrdersFor(w.ctx, w.state, playerId, day);
  if (!o) throw new Error("no family order");
  return o;
}

describe("the patrician families", () => {
  it("are off without houses in the settings", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(5 * DAY);
    expect(w.try({ type: "joinFamily", playerId: "a", family: "contarini" }).ok).toBe(false);
  });

  it("open some days after joining, once for the season", () => {
    const w = world("a");
    w.at(DAY);
    const early = w.try({ type: "joinFamily", playerId: "a", family: "morosini" });
    expect(early.ok ? null : early.error).toBe("family_locked");
    w.at(2 * DAY);
    const unknown = w.try({ type: "joinFamily", playerId: "a", family: "borgia" });
    expect(unknown.ok ? null : unknown.error).toBe("unknown_family");
    w.do({ type: "joinFamily", playerId: "a", family: "morosini" });
    expect(w.state.families?.members.a).toBe("morosini");
    const again = w.try({ type: "joinFamily", playerId: "a", family: "contarini" });
    expect(again.ok ? null : again.error).toBe("family_chosen");
  });

  it("give each member one order a day from the family's domain, at the Doge's premium", () => {
    const w = world("a");
    pledge(w, "a", "morosini");
    const o = order(w, "a");
    expect(o.resource).toBe("wheat");
    expect(o.quantity).toBe(20);
    expect(o.unitPrice).toBe(120n); // reference 100 + 20 %
    w.give("a", "wheat", 40);
    const before = w.cash("a");
    w.do({ type: "fulfillFamilyOrder", playerId: "a", orderId: o.id });
    expect(w.cash("a") - before).toBe(2_400n);
    expect(w.stock("a", "wheat").available).toBe(20);
    expect(w.state.families?.weekInfluence.a).toBe(10);
    expect(w.state.families?.seasonInfluence.a).toBe(10);
    const twice = w.try({ type: "fulfillFamilyOrder", playerId: "a", orderId: o.id });
    expect(twice.ok ? null : twice.error).toBe("contract_done");
    // The next day brings a new order; yesterday's has expired.
    w.advance(DAY);
    const late = w.try({ type: "fulfillFamilyOrder", playerId: "a", orderId: o.id });
    expect(late.ok ? null : late.error).toBe("contract_expired");
  });

  it("have no order for a merchant without a family", () => {
    const w = world("a");
    w.at(3 * DAY);
    expect(familyOrdersFor(w.ctx, w.state, "a", dayIndex(w.ctx, w.now))).toEqual([]);
    const res = w.try({ type: "fulfillFamilyOrder", playerId: "a", orderId: "3:f0" });
    expect(res.ok ? null : res.error).toBe("no_family");
  });

  it("take patronage in ducats that leave the game, up to a daily limit", () => {
    const w = world("a");
    pledge(w, "a", "contarini");
    const cash = w.cash("a");
    const sink = w.state.accounts[SINK_ACCOUNT] ?? 0n;
    const worth = netWorth(w.ctx, w.state, "a", w.now).total;
    w.do({ type: "patronize", playerId: "a", points: 15 });
    expect(cash - w.cash("a")).toBe(3_000n);
    expect((w.state.accounts[SINK_ACCOUNT] ?? 0n) - sink).toBe(3_000n);
    // Influence is not wealth: the gift lowers net worth.
    expect(netWorth(w.ctx, w.state, "a", w.now).total).toBe(worth - 3_000n);
    expect(w.state.families?.weekInfluence.a).toBe(15);
    const over = w.try({ type: "patronize", playerId: "a", points: 6 });
    expect(over.ok ? null : over.error).toBe("patronage_limit");
    w.do({ type: "patronize", playerId: "a", points: 5 });
    // A new day, a new allowance.
    w.advance(DAY);
    w.do({ type: "patronize", playerId: "a", points: 20 });
    expect(w.state.families?.weekInfluence.a).toBe(40);
  });

  it("refuse patronage without a family or beyond one's purse", () => {
    const w = new World(
      makeContext({
        ...families,
        families: { ...rules, patronageMaxPerDay: 1_000_000 },
      }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(2 * DAY);
    const none = w.try({ type: "patronize", playerId: "a", points: 1 });
    expect(none.ok ? null : none.error).toBe("no_family");
    w.do({ type: "joinFamily", playerId: "a", family: "contarini" });
    // 1 000 ducats of capital: 500 points at 2 ducats each, not 600.
    const broke = w.try({ type: "patronize", playerId: "a", points: 600 });
    expect(broke.ok ? null : broke.error).toBe("insufficient_funds");
  });

  it("rank the families by capped influence per active member", () => {
    const w = world("a", "b", "c", "d");
    pledge(w, "a", "contarini");
    w.do({ type: "joinFamily", playerId: "b", family: "contarini" });
    w.do({ type: "joinFamily", playerId: "c", family: "contarini" });
    w.do({ type: "joinFamily", playerId: "d", family: "morosini" });
    // Contarini: a gives a lot (capped at 50); b and c are present but give nothing.
    // Morosini: d alone gives as much.
    for (let day = 0; day < 3; day++) {
      w.do({ type: "patronize", playerId: "a", points: 20 });
      w.do({ type: "patronize", playerId: "d", points: 20 });
      if (day < 2) w.advance(DAY);
    }
    const table = familyStandings(w.ctx, w.state, w.now);
    const contarini = table.find((f) => f.family === "contarini");
    const morosini = table.find((f) => f.family === "morosini");
    expect(contarini?.members).toBe(3);
    // 50 counted for a (cap), shared by three active members.
    expect(contarini?.influence).toBe(50);
    expect(contarini?.score).toBe(Math.floor((50 * 100) / 3));
    // Morosini: one member, counted as two (the minimum) so a lone merchant cannot win easily.
    expect(morosini?.influence).toBe(50);
    expect(morosini?.score).toBe(Math.floor((50 * 100) / 2));
    // The small but diligent family leads.
    expect(table[0]?.family).toBe("morosini");
    expect(table[0]?.champion).toBe("d");
    expect(contarini?.champion).toBe("a");
  });

  it("hand power to the week's winner, whose members earn more on family orders", () => {
    const w = world("a", "b");
    pledge(w, "a", "morosini");
    w.do({ type: "joinFamily", playerId: "b", family: "contarini" });
    w.do({ type: "patronize", playerId: "a", points: 20 });
    w.do({ type: "patronize", playerId: "b", points: 5 });
    w.at(WEEK + HOUR);
    const res = w.do({ type: "tick" });
    const closed = res.effects.events.find((e) => e.type === "family_week_closed");
    expect(closed?.data?.week).toBe(0);
    expect(closed?.data?.winner).toBe("morosini");
    expect(w.state.families?.inPower).toBe("morosini");
    // A new week starts from zero; the season's influence is kept.
    expect(w.state.families?.weekInfluence.a ?? 0).toBe(0);
    expect(w.state.families?.seasonInfluence.a).toBe(20);
    // Morosini rule: their orders pay 20 % + 10 %.
    expect(order(w, "a").unitPrice).toBe(130n);
    expect(order(w, "b").unitPrice).toBe(264n); // bricks or planks at 220 + 20 %
    // Only once per week.
    const again = w.do({ type: "tick" });
    expect(again.effects.events.some((e) => e.type === "family_week_closed")).toBe(false);
  });

  it("leave power vacant after a week without influence", () => {
    const w = world("a");
    pledge(w, "a", "morosini");
    w.at(WEEK + HOUR);
    const res = w.do({ type: "tick" });
    const closed = res.effects.events.find((e) => e.type === "family_week_closed");
    expect(closed?.data?.winner).toBeNull();
    expect(w.state.families?.inPower).toBeNull();
  });

  it("forget the allegiance of a merchant who starts over", () => {
    const w = world("a");
    pledge(w, "a", "morosini");
    w.do({ type: "patronize", playerId: "a", points: 3 });
    w.do({ type: "resetPlayer", playerId: "a" });
    expect(w.state.families?.members.a).toBeUndefined();
    expect(w.state.families?.weekInfluence.a).toBeUndefined();
  });
});
