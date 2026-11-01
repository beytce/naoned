import { describe, expect, it } from "vitest";
import {
  type AdminEdit,
  type EmpireSettingsInput,
  type Player,
  cashAccount,
  empireHouseAt,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { MIN, World, makeContext } from "../helpers.js";

const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 10_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

const edit = (w: World, e: AdminEdit) => w.try({ type: "adminEdit", playerId: "a", edit: e });
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};

describe("the admin's hand", () => {
  it("sets the cash up and down through the ledger", () => {
    const w = world();
    expect(edit(w, { kind: "cash", deniers: "5000000" }).ok).toBe(true);
    expect(cash(w)).toBe(5_000_000n);
    expect(edit(w, { kind: "cash", deniers: "100" }).ok).toBe(true);
    expect(cash(w)).toBe(100n);
    expect(edit(w, { kind: "cash", deniers: "-1" }).ok).toBe(false);
  });

  it("does not count as net sales", () => {
    const w = world();
    edit(w, { kind: "cash", deniers: "9000000" });
    expect(w.state.turnover?.a ?? 0n).toBe(0n);
  });

  it("sets a good's stock through the movements", () => {
    const w = world();
    expect(edit(w, { kind: "stock", good: "wheat", qty: 50 }).ok).toBe(true);
    expect(w.state.inventories.a?.wheat?.available).toBe(50);
    edit(w, { kind: "stock", good: "wheat", qty: 10 });
    expect(w.state.inventories.a?.wheat?.available).toBe(10);
    expect(edit(w, { kind: "stock", good: "nothing", qty: 1 }).ok).toBe(false);
  });

  it("sets Venice's share of a good, the other counters' left as they are", () => {
    const w = world();
    edit(w, { kind: "stock", good: "wheat", qty: 30 });
    const empire = w.state.empire;
    const h = empire?.houses.a;
    if (!empire || !h) throw new Error("no house");
    // A counter beyond Venice holding 20 of the 30 (as a delivery would leave it).
    w.state = {
      ...w.state,
      empire: { ...empire, houses: { a: { ...h, stores: { p2: { wheat: 20 } } } } },
    };
    expect(edit(w, { kind: "stock", good: "wheat", qty: 5 }).ok).toBe(true);
    expect(w.state.inventories.a?.wheat?.available).toBe(25);
    expect(w.state.empire?.houses.a?.stores?.p2?.wheat).toBe(20);
  });

  it("sets the Casa within its levels", () => {
    const w = world();
    expect(edit(w, { kind: "casa", level: 5 }).ok).toBe(true);
    expect(house(w).casa).toBe(5);
    expect(edit(w, { kind: "casa", level: 6 }).ok).toBe(false);
    expect(edit(w, { kind: "casa", level: 2 }).ok).toBe(true);
    expect(house(w).casa).toBe(2);
  });

  it("sets the house's counts, a workshop, a module and a model", () => {
    const w = world();
    edit(w, { kind: "house", favour: 300, seals: 7, heritage: 2 });
    expect([house(w).favour, house(w).seals, house(w).heritage]).toEqual([300, 7, 2]);
    const id = house(w).workshops[0]?.id ?? "";
    expect(edit(w, { kind: "workshop", workshopId: id, level: 12 }).ok).toBe(true);
    expect(house(w).workshops[0]?.level).toBe(12);
    expect(edit(w, { kind: "workshop", workshopId: id, level: 21 }).ok).toBe(false);
    edit(w, { kind: "module", code: "hold", level: 3 });
    expect(house(w).modules?.hold).toBe(3);
    edit(w, { kind: "module", code: "hold", level: 0 });
    expect(house(w).modules?.hold).toBeUndefined();
    expect(edit(w, { kind: "module", code: "nope", level: 1 }).ok).toBe(false);
  });

  it("opens a counter on the region's seat, and reveals around it", () => {
    const w = world();
    expect(edit(w, { kind: "counter", region: "lombardia", level: 3 }).ok).toBe(true);
    expect(house(w).counters?.lombardia).toBe(3);
    expect(house(w).posts?.some((p) => p.region === "lombardia")).toBe(true);
    expect(house(w).revealed).toContain("4,0");
    expect(edit(w, { kind: "counter", region: "veneto", level: 1 }).ok).toBe(false);
  });

  it("ends the sites now", () => {
    const w = world();
    edit(w, { kind: "cash", deniers: "100000000" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(house(w).casa).toBe(1);
    edit(w, { kind: "finish" });
    expect(house(w).casa).toBe(2);
    expect(house(w).builds).toHaveLength(0);
    w.advance(MIN);
  });

  it("reveals the map, and stands no building the world does not set", () => {
    const w = world();
    edit(w, { kind: "revealMap" });
    expect(house(w).revealed).toHaveLength(10);
    expect(edit(w, { kind: "site", site: "depot" }).ok).toBe(false);
    expect(edit(w, { kind: "site", site: "camp" }).ok).toBe(false);
  });

  it("resets a house to zero: a newcomer again, through the journals", () => {
    const w = world();
    edit(w, { kind: "cash", deniers: "90000000" });
    edit(w, { kind: "stock", good: "wheat", qty: 40 });
    edit(w, { kind: "casa", level: 4 });
    edit(w, { kind: "house", favour: 300, seals: 7, heritage: 2 });
    edit(w, { kind: "module", code: "hold", level: 3 });
    edit(w, { kind: "counter", region: "lombardia", level: 2 });
    edit(w, { kind: "vehicle", vehicleType: "mule" });
    const empire = w.state.empire;
    const h = empire?.houses.a;
    if (!empire || !h) throw new Error("no house");
    w.state = {
      ...w.state,
      empire: {
        ...empire,
        houses: { a: { ...h, company: "c1", companySince: 5 } },
        aid: [{ id: "a:1", house: "a", company: "c1", good: "wheat", qty: 5, at: 1 }],
      },
      players: { ...w.state.players, a: { ...(w.state.players.a as Player), passUntil: 99 } },
    };
    expect(edit(w, { kind: "reset" }).ok).toBe(true);
    const fresh = house(w);
    expect(fresh.casa).toBe(1);
    expect(fresh.workshops).toHaveLength(1);
    expect(fresh.workshops[0]?.level).toBe(1);
    expect([fresh.favour, fresh.seals, fresh.heritage ?? 0]).toEqual([0, 0, 0]);
    expect(fresh.modules ?? {}).toEqual({});
    expect(fresh.counters ?? {}).toEqual({});
    expect(fresh.vehicles ?? []).toHaveLength(0);
    expect(cash(w)).toBe(10_000n * 100n);
    expect(w.state.inventories.a ?? {}).toEqual({});
    // The company stays, its open requests go.
    expect([fresh.company, fresh.companySince]).toEqual(["c1", 5]);
    expect(w.state.empire?.aid ?? []).toHaveLength(0);
    // The account's Pass stays.
    expect(w.state.players.a?.passUntil).toBe(99);
  });

  it("does not reset a house in a battle of the Porta", () => {
    const w = world();
    const empire = w.state.empire;
    const h = empire?.houses.a;
    if (!empire || !h) throw new Error("no house");
    const battle = { id: "b1", tier: 1, combatId: "x", transportId: "y", paid: 0 };
    const porta = { cell: "0,0", level: 1, best: 0, relics: {}, week: { index: 0, points: 0 } };
    w.state = {
      ...w.state,
      empire: { ...empire, houses: { a: { ...h, porta: { ...porta, battle } } } },
    };
    const res = edit(w, { kind: "reset" });
    expect(res.ok ? "" : res.error).toBe("vehicle_busy");
  });

  it("refuses an unknown merchant", () => {
    const w = world();
    const res = w.try({ type: "adminEdit", playerId: "zz", edit: { kind: "casa", level: 2 } });
    expect(res.ok ? "" : res.error).toBe("unknown_player");
  });

  it("sets cash and stock in a world of the monthly seasons too", () => {
    const w = new World(makeContext());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(edit(w, { kind: "cash", deniers: "123400" }).ok).toBe(true);
    expect(cash(w)).toBe(123_400n);
    expect(edit(w, { kind: "casa", level: 2 }).ok).toBe(false);
  });
});
