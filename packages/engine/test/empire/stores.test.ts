import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext, openLombardy } from "../helpers.js";

// Each counter's own stock (the map that grows, 31 October 2026): what is made, bought or found
// at a counter stays there; a counter sells and delivers from its own; Venice holds the rest.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  markets: {
    depthBase: 100,
    depthPerHouse: 0,
    boardPerHouse: 0,
    smallShareBps: 0,
    smallCasa: 20,
    orderPremiumBps: 0,
    taxBps: 0,
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < 4; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  openLombardy(w);
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const stores = (w: World) => empireView(w.ctx, w.state, "a", w.now)?.stores ?? [];
const lombardy = (w: World) => house(w).posts?.find((p) => p.region === "lombardia")?.id ?? "";
const at = (w: World, post: string, good: string) =>
  stores(w).find((x) => x.post === post)?.goods[good] ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("each counter's own stock", () => {
  it("holds in Venice all a house of before has", () => {
    const w = world();
    w.give("a", "salt", 12);
    expect(at(w, "home", "salt")).toBe(12);
    expect(at(w, lombardy(w), "salt")).toBe(0);
  });

  it("buys at the market of the counter's region, into its stock", () => {
    const w = world();
    const post = lombardy(w);
    expect(error(w.try({ type: "empireBuy", playerId: "a", good: "iron", qty: 5, post }))).toBe("");
    expect(at(w, post, "iron")).toBe(5);
    expect(at(w, "home", "iron")).toBe(0);
    // Venice's market does not trade iron.
    expect(
      error(w.try({ type: "empireBuy", playerId: "a", good: "iron", qty: 5, post: "home" })),
    ).toBe("unknown_resource");
    expect(
      error(w.try({ type: "empireBuy", playerId: "a", good: "iron", qty: 5, post: "nowhere" })),
    ).toBe("unknown_target");
  });

  it("sells from the counters of the region, never from another's", () => {
    const w = world();
    w.give("a", "salt", 12);
    // Lombardy asks salt, but the salt is in Venice.
    expect(
      error(
        w.try({ type: "empireSell", playerId: "a", good: "salt", qty: 5, region: "lombardia" }),
      ),
    ).toBe("not_here");
    const post = lombardy(w);
    w.do({ type: "empireBuy", playerId: "a", good: "iron", qty: 8, post });
    w.do({ type: "empireSell", playerId: "a", good: "iron", qty: 3, region: "lombardia" });
    expect(at(w, post, "iron")).toBe(5);
  });

  it("keeps the counters' stocks summing to the house's inventory", () => {
    const w = world();
    w.give("a", "salt", 7);
    w.do({ type: "empireBuy", playerId: "a", good: "iron", qty: 4, post: lombardy(w) });
    w.advance(HOUR);
    const total = (good: string) => stores(w).reduce((n, x) => n + (x.goods[good] ?? 0), 0);
    for (const good of ["salt", "iron"])
      expect(total(good)).toBe(w.state.inventories.a?.[good]?.available ?? 0);
  });
});
