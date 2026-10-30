import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The entraide (CADRAGE-v3 § 7): a lot asked every 8 h, supplied at Venice's reference price
// (wheat: 400 d), no tax; 3 days of seniority; a supplier's day capped at 50 ducats a Casa.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  aid: {
    everyHours: 8,
    lotPerCasa: 20,
    minDays: 3,
    dailyDucatsPerCasa: 50,
    expireHours: 24,
    meritPer100Ducats: 10,
  },
};

const ALL = ["a", "b", "c"] as const;
type Who = (typeof ALL)[number];
const companyOf: Record<Who, string> = { a: "co1", b: "co1", c: "co2" };

/** Three houses, a and b of one company, c of another, all joined at the start. */
function world() {
  const w = new World(makeContext({ empire }));
  for (const p of ALL) w.do({ type: "empireJoin", playerId: p, company: tag(p, w.now) });
  return w;
}
const tag = (p: Who, since: number) => ({ id: companyOf[p], since });
const ask = (w: World, p: Who, good: string, qty: number) =>
  w.try({ type: "empireAsk", playerId: p, good, qty, company: tag(p, T0(w)) });
const supply = (w: World, p: Who, requestId: string) =>
  w.try({ type: "empireSupply", playerId: p, requestId, company: tag(p, T0(w)) });
const T0 = (w: World) => w.state.empire?.houses.a?.joinedAt ?? w.now;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const cash = (w: World, p: Who) => w.state.accounts[cashAccount(p)] ?? 0n;
const requests = (w: World) => w.state.empire?.aid ?? [];
const house = (w: World, p: Who) => {
  const h = empireHouseAt(w.ctx, w.state, p, w.now);
  if (!h) throw new Error("no house");
  return h;
};

describe("the entraide", () => {
  it("waits three days of seniority, then lets a partner ask a lot every 8 hours", () => {
    const w = world();
    expect(error(ask(w, "a", "wheat", 10))).toBe("too_new");
    w.advance(3 * DAY);
    expect(error(ask(w, "a", "wheat", 21))).toBe("invalid_quantity");
    expect(error(ask(w, "a", "gold", 1))).toBe("unknown_resource");
    expect(error(ask(w, "a", "wheat", 10))).toBe("");
    expect(requests(w)).toHaveLength(1);
    w.advance(7 * HOUR);
    expect(error(ask(w, "a", "wheat", 5))).toBe("too_soon");
    w.advance(HOUR);
    expect(error(ask(w, "a", "wheat", 5))).toBe("");
  });

  it("is supplied by a partner at the reference price, in the ledger and the stock journal", () => {
    const w = world();
    w.give("b", "wheat", 30);
    w.advance(3 * DAY);
    ask(w, "a", "wheat", 10);
    const id = requests(w)[0]?.id ?? "";
    expect(error(supply(w, "a", id))).toBe("own_order");
    expect(error(supply(w, "c", id))).toBe("not_same_company");
    const [a, b] = [cash(w, "a"), cash(w, "b")];
    expect(error(supply(w, "b", id))).toBe("");
    // 10 × 400 d, no tax, no wages.
    expect(a - cash(w, "a")).toBe(4_000n);
    expect(cash(w, "b") - b).toBe(4_000n);
    expect(w.state.inventories.a?.wheat?.available).toBe(10);
    expect(w.state.inventories.b?.wheat?.available).toBe(20);
    expect(requests(w)).toHaveLength(0);
    // The supplier's Merit: 10 a 100 ducats, 40 ducats sold.
    expect(house(w, "b").merit).toBe(4);
    expect(error(supply(w, "b", id))).toBe("unknown_order");
  });

  it("caps a supplier's day, and gives Merit by the hundred ducats", () => {
    const w = world();
    w.give("b", "wheat", 100);
    w.advance(3 * DAY);
    // 50 ducats a day at the Casa 1: 12 wheat; a lot of 20 passes it.
    ask(w, "a", "wheat", 20);
    const id = requests(w)[0]?.id ?? "";
    expect(error(supply(w, "b", id))).toBe("over_limit");
    w.advance(8 * HOUR);
    ask(w, "a", "wheat", 12);
    const next = requests(w).at(-1)?.id ?? "";
    expect(error(supply(w, "b", next))).toBe("");
    expect(house(w, "b").merit).toBe(4);
    w.advance(DAY);
    ask(w, "a", "wheat", 12);
    expect(error(supply(w, "b", requests(w).at(-1)?.id ?? ""))).toBe("");
    expect(house(w, "b").merit).toBe(8);
  });

  it("refuses a lot the asker cannot pay, and lets a request lapse after 24 hours", () => {
    const w = world();
    w.advance(3 * DAY);
    w.do({ type: "empireAsk", playerId: "a", good: "wheat", qty: 5, company: tag("a", T0(w)) });
    w.advance(25 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a", company: tag("a", T0(w)) });
    expect(requests(w)).toHaveLength(0);
  });

  it("forgets the company a house left: its requests go, and it asks no more", () => {
    const w = world();
    w.give("b", "wheat", 30);
    w.advance(3 * DAY);
    ask(w, "a", "wheat", 10);
    const id = requests(w)[0]?.id ?? "";
    w.do({ type: "empireRelaunchAll", playerId: "a", company: null });
    expect(house(w, "a").company).toBeUndefined();
    expect(requests(w)).toHaveLength(0);
    expect(error(supply(w, "b", id))).toBe("unknown_order");
    expect(
      error(w.try({ type: "empireAsk", playerId: "a", good: "wheat", qty: 1, company: null })),
    ).toBe("no_company");
  });
});
