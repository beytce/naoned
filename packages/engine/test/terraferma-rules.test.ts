import { describe, expect, it } from "vitest";
import {
  EngineError,
  MILAN,
  type TerraState,
  type WorldSettingsInput,
  acceptAlliance,
  advanceTerra,
  alliesOf,
  breakAlliance,
  buildOnTerra,
  capOf,
  cellCost,
  cellsOf,
  chooseDecree,
  closeTerra,
  hexDistance,
  hexNeighbors,
  launchFront,
  newTerra,
  placeOnTerra,
  proposeAlliance,
  raiseCap,
  sendTroops,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 5, 0, 0);
const config = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) => {
  const cfg = makeContext({
    terraferma: {
      ...testTerraferma,
      start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0 },
      ...more,
    },
  }).settings.terraferma;
  if (!cfg) throw new Error("no terraferma");
  return cfg;
};
const code = (f: () => unknown) => {
  try {
    f();
    return "ok";
  } catch (e) {
    return e instanceof EngineError ? e.code : String(e);
  }
};

/** a and b side by side (their lands touch), c further away. */
function three() {
  const cfg = config();
  const s = newTerra(cfg, "seed", 10, START);
  const inner = (i: number) => hexNeighbors(s.map, i).length === 6;
  const a = s.owner.findIndex((o, i) => o === null && inner(i) && i % s.map.width > 4);
  placeOnTerra(s, cfg, "a", a, START);
  const b = s.owner.findIndex(
    (o, i) =>
      o === null &&
      inner(i) &&
      hexDistance(s.map, a, i) === 3 &&
      s.owner.every((p, j) => p === null || p === MILAN || hexDistance(s.map, i, j) >= 2),
  );
  placeOnTerra(s, cfg, "b", b, START);
  const c = s.owner.findIndex(
    (o, i) =>
      o === null &&
      inner(i) &&
      s.owner.every((p, j) => p === null || hexDistance(s.map, i, j) >= 3),
  );
  placeOnTerra(s, cfg, "c", c, START);
  return { cfg, s };
}
const borderOf = (s: TerraState, id: string, against: string) =>
  s.owner.findIndex(
    (o, i) => o === against && hexNeighbors(s.map, i).some((n) => s.owner[n] === id),
  );

describe("alliances", () => {
  it("are asked and accepted; allies cannot strike each other, and their fronts come home", () => {
    const { cfg, s } = three();
    launchFront(s, cfg, "a", borderOf(s, "a", "b"), 5_000, START);
    proposeAlliance(s, cfg, "a", "b", START);
    expect(alliesOf(s, "a")).toEqual([]);
    expect(code(() => acceptAlliance(s, cfg, "b", "c", START))).toBe("no_request");
    acceptAlliance(s, cfg, "b", "a", START);
    expect(alliesOf(s, "a")).toEqual(["b"]);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
    expect(code(() => launchFront(s, cfg, "a", borderOf(s, "a", "b"), 5_000, START))).toBe(
      "allied",
    );
  });

  it("are made at once when both ask, two at most", () => {
    const { cfg, s } = three();
    proposeAlliance(s, cfg, "a", "b", START);
    proposeAlliance(s, cfg, "b", "a", START);
    expect(alliesOf(s, "b")).toEqual(["a"]);
    proposeAlliance(s, cfg, "c", "a", START);
    acceptAlliance(s, cfg, "a", "c", START);
    expect(alliesOf(s, "a")).toEqual(["b", "c"]);
    placeOnTerra(
      s,
      cfg,
      "d",
      s.owner.findIndex(
        (o, i) =>
          o === null && s.owner.every((p, j) => p === null || hexDistance(s.map, i, j) >= 2),
      ),
      START,
    );
    expect(code(() => proposeAlliance(s, cfg, "a", "d", START))).toBe("too_many_allies");
  });

  it("end two hours after a break; breaking too often makes a traitor, easier to take", () => {
    const { cfg, s } = three();
    const ally = (x: string, y: string) => {
      proposeAlliance(s, cfg, x, y, s.clock);
      acceptAlliance(s, cfg, y, x, s.clock);
    };
    ally("a", "b");
    breakAlliance(s, cfg, "a", "b", START);
    advanceTerra(s, cfg, START + HOUR);
    expect(alliesOf(s, "a")).toEqual(["b"]);
    advanceTerra(s, cfg, START + 3 * HOUR);
    expect(alliesOf(s, "a")).toEqual([]);
    const target = borderOf(s, "b", "a");
    const before = cellCost(s, cfg, target);
    ally("a", "b");
    breakAlliance(s, cfg, "a", "b", s.clock);
    advanceTerra(s, cfg, s.clock + 3 * HOUR);
    ally("a", "b");
    // The third break in the week: a traitor for a day.
    breakAlliance(s, cfg, "a", "b", s.clock);
    expect(s.players.a?.traitorUntil).toBeGreaterThan(s.clock);
    expect(code(() => proposeAlliance(s, cfg, "c", "a", s.clock))).toBe("traitor");
    expect(cellCost(s, cfg, target)).toBeLessThanOrEqual(before);
  });

  it("let allies send each other troops, within a share of the cap a day", () => {
    const { cfg, s } = three();
    expect(code(() => sendTroops(s, cfg, "a", "b", 5, START))).toBe("not_allied");
    proposeAlliance(s, cfg, "a", "b", START);
    acceptAlliance(s, cfg, "b", "a", START);
    const limit = Math.floor((capOf(s, cfg, "a") * 3_000) / 10_000);
    const b = s.players.b?.troops ?? 0;
    sendTroops(s, cfg, "a", "b", limit, START);
    expect(s.players.b?.troops).toBe(b + limit);
    expect(code(() => sendTroops(s, cfg, "a", "b", 1, START))).toBe("gift_limit");
  });
});

describe("buildings and the cap", () => {
  it("a rocca, one per 15 cells, guards its cell and those around; razed when taken", () => {
    const { cfg, s } = three();
    const home = s.players.b?.capital as number;
    const spot = hexNeighbors(s.map, home)[0] as number;
    expect(code(() => buildOnTerra(s, cfg, "b", spot, "rocca"))).toBe("no_room");
    // b holds 15 cells.
    for (const i of s.owner
      .map((_, k) => k)
      .filter((k) => s.owner[k] === null)
      .slice(0, 8))
      s.owner[i] = "b";
    expect(cellsOf(s, "b").length).toBeGreaterThanOrEqual(15);
    const target = borderOf(s, "a", "b");
    const before = cellCost(s, cfg, target);
    expect(buildOnTerra(s, cfg, "b", target, "rocca")).toBe(4_000n);
    expect(cellCost(s, cfg, target)).toBe(Math.max(1, Math.ceil((before * 16_000) / 10_000)));
    expect(code(() => buildOnTerra(s, cfg, "b", target, "rocca"))).toBe("built");
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", target, 10_000, START);
    advanceTerra(s, cfg, START + 2 * HOUR);
    if (s.owner[target] === "a") expect(s.buildings?.[target]).toBeUndefined();
  });

  it("a borgo and ducats raise the cap; ducats twice a day at most", () => {
    const { cfg, s } = three();
    const cap = capOf(s, cfg, "a");
    expect(raiseCap(s, cfg, "a", START)).toBe(10_000n);
    raiseCap(s, cfg, "a", START);
    expect(capOf(s, cfg, "a")).toBe(cap + 20);
    expect(code(() => raiseCap(s, cfg, "a", START))).toBe("raise_limit");
    raiseCap(s, cfg, "a", START + 24 * HOUR);
    expect(capOf(s, cfg, "a")).toBe(cap + 30);
  });
});

describe("what changed hands", () => {
  it("keeps, for each cell, when it last changed hands and from whom", () => {
    const { cfg, s } = three();
    const a = s.players.a?.capital ?? -1;
    expect(s.taken?.[a]).toEqual({ at: START, from: null });
    const aim = borderOf(s, "b", "a");
    launchFront(s, cfg, "b", aim, 10_000, START);
    advanceTerra(s, cfg, START + 2 * HOUR);
    const lost = s.owner.findIndex((o, i) => o === "b" && s.taken?.[i]?.from === "a");
    expect(lost).toBeGreaterThanOrEqual(0);
    const when = s.taken?.[lost]?.at ?? 0;
    expect(when).toBeGreaterThan(START);
    expect(when).toBeLessThanOrEqual(START + 2 * HOUR);
  });
});

describe("pockets", () => {
  it("fall to the rival that rings them, a share an hour", () => {
    const { cfg, s } = three();
    // A cell of a's deep in b's land.
    for (const i of s.owner
      .map((_, k) => k)
      .filter((k) => s.owner[k] === null)
      .slice(0, 20))
      s.owner[i] = "b";
    const pocket = cellsOf(s, "b").find(
      (i) =>
        i !== s.players.b?.capital &&
        hexNeighbors(s.map, i).length === 6 &&
        hexNeighbors(s.map, i).every((n) => s.owner[n] === "b"),
    );
    if (pocket === undefined) throw new Error("no pocket");
    s.owner[pocket] = "a";
    advanceTerra(s, cfg, START + HOUR);
    expect(s.owner[pocket]).toBe("b");
  });
});

describe("the close", () => {
  it("ranks the merchants by glory, gives Influence by tier, and the Signore's decree", () => {
    const { cfg, s } = three();
    expect(code(() => chooseDecree(s, cfg, "a", { code: "doge" }))).toBe("invalid_programme");
    chooseDecree(s, cfg, "a", { code: "embargo", target: "verona" });
    chooseDecree(s, cfg, "b", { code: "dime" });
    for (const i of s.owner
      .map((_, k) => k)
      .filter((k) => s.owner[k] === null)
      .slice(0, 10))
      s.owner[i] = "a";
    advanceTerra(s, cfg, START + 2 * HOUR);
    const close = closeTerra(s, cfg, s.clock);
    expect(close.signore).toBe("a");
    expect(close.ranking.map((r) => r.tier)).toEqual(["signore", "podium", "podium"]);
    expect(close.ranking[0]?.influence).toBe(20);
    expect(close.decree).toEqual({ code: "embargo", target: "verona" });
    // Closed: time no longer moves the map.
    const glory = s.players.a?.glory;
    advanceTerra(s, cfg, s.clock + 5 * HOUR);
    expect(s.players.a?.glory).toBe(glory);
  });

  it("comes at once when a merchant holds most of the land", () => {
    const { cfg, s } = three();
    const land = s.map.land.filter(Boolean).length;
    let n = cellsOf(s, "a").length;
    for (let i = 0; i < s.owner.length && n * 10_000 < 8_000 * land; i++) {
      if (s.owner[i] !== "a" && s.players.b?.capital !== i && s.players.c?.capital !== i) {
        s.owner[i] = "a";
        n++;
      }
    }
    advanceTerra(s, cfg, START + HOUR);
    expect(s.closed?.signore).toBe("a");
    expect(s.closed?.conquest).toBe(true);
  });
});
