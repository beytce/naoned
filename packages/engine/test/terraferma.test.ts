import { describe, expect, it } from "vitest";
import {
  EngineError,
  MILAN,
  type TerraState,
  type WorldSettingsInput,
  advanceTerra,
  buildOnTerra,
  capOf,
  cellCenter,
  cellCost,
  cellsOf,
  closeTerra,
  forecastFronts,
  hexDistance,
  hexNeighbors,
  isNation,
  launchFront,
  launchNaval,
  newTerra,
  placeOnTerra,
  raiseCap,
  recallFront,
  recruitPerHour,
  setPeasants,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, MIN, makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 5, 0, 0); // a Monday, 2 h in Paris
const STEP = 10 * MIN;
const config = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) => {
  const cfg = makeContext({ terraferma: { ...testTerraferma, ...more } }).settings.terraferma;
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
/** The first inner neutral cell at least `away` from every owned cell, scanning from the east. */
const freeCell = (s: TerraState, away = 3) => {
  for (let i = s.owner.length - 1; i >= 0; i--) {
    if (s.owner[i] !== null || hexNeighbors(s.map, i).length < 6) continue;
    if (s.owner.every((o, j) => o === null || hexDistance(s.map, i, j) >= away)) return i;
  }
  throw new Error("no free cell");
};
/** A neutral cell next to the player's territory. */
const border = (s: TerraState, id: string, against: string | null = null) => {
  const i = s.owner.findIndex(
    (o, j) => o === against && hexNeighbors(s.map, j).some((n) => s.owner[n] === id),
  );
  if (i < 0) throw new Error("no border");
  return i;
};

describe("the map of the Terraferma", () => {
  it("grows with the world, the same for the same seed", () => {
    const cfg = config();
    const small = newTerra(cfg, "seed", 2, START);
    const big = newTerra(cfg, "seed", 10, START);
    // At least `minActive` merchants counted: 4 × 10 cells.
    expect(small.map.width * small.map.height).toBeGreaterThanOrEqual(40);
    expect(big.map.width * big.map.height).toBeGreaterThanOrEqual(100);
    expect(big.map.width).toBeGreaterThan(big.map.height);
    expect(newTerra(cfg, "seed", 10, START).map).toEqual(big.map);
    expect(newTerra(cfg, "other", 10, START).map.terrain).not.toEqual(big.map.terrain);
    expect(big.map.city.filter(Boolean)).toHaveLength(2);
  });

  it("gives Milan the west", () => {
    const s = newTerra(config(), "seed", 10, START);
    const { width } = s.map;
    s.owner.forEach((o, i) => {
      const col = i % width;
      expect(o === "milan").toBe(col < Math.ceil((width * 2_000) / 10_000));
    });
    expect(s.players.milan?.troops).toBe(60 + 5 * 10);
    // Its cap does not grow with the land it takes.
    expect(capOf(s, config(), "milan")).toBe(60 + 5 * 10);
  });

  it("knows its neighbours and distances", () => {
    const s = newTerra(config(), "seed", 10, START);
    const { width, height } = s.map;
    const mid = Math.floor(height / 2) * width + Math.floor(width / 2);
    expect(hexNeighbors(s.map, mid)).toHaveLength(6);
    expect(hexNeighbors(s.map, 0).length).toBeLessThan(6);
    for (const n of hexNeighbors(s.map, mid)) {
      expect(hexDistance(s.map, mid, n)).toBe(1);
      expect(hexNeighbors(s.map, n)).toContain(mid);
    }
    expect(hexDistance(s.map, 0, width - 1)).toBe(width - 1);
  });
});

describe("a merchant's start", () => {
  it("takes the chosen cell and the neutral ones around it, protected for a day", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const at = freeCell(s);
    placeOnTerra(s, cfg, "a", at, START + HOUR);
    const mine = cellsOf(s, "a");
    expect(mine).toContain(at);
    expect(mine.length).toBe(1 + hexNeighbors(s.map, at).length);
    expect(s.players.a?.troops).toBe(30);
    expect(s.players.a?.protectedUntil).toBe(START + 25 * HOUR);
    expect(code(() => placeOnTerra(s, cfg, "a", freeCell(s), START + HOUR))).toBe("already_placed");
  });

  it("stays away from the others and from Milan, and comes better armed later in the week", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const at = freeCell(s);
    placeOnTerra(s, cfg, "a", at, START);
    const near = hexNeighbors(s.map, at)
      .flatMap((n) => hexNeighbors(s.map, n))
      .find((c) => s.owner[c] === null) as number;
    expect(code(() => placeOnTerra(s, cfg, "b", near, START))).toBe("too_close");
    expect(code(() => placeOnTerra(s, cfg, "b", 0, START))).toBe("not_neutral");
    placeOnTerra(s, cfg, "c", freeCell(s), START + 2 * 24 * HOUR);
    expect(s.players.c?.troops).toBe(30 + 2 * 10);
  });
});

describe("troops", () => {
  it("come back each open step toward a cap that grows with the land", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const cells = cellsOf(s, "a").length;
    const cap = capOf(s, cfg, "a");
    expect(cap).toBe(20 + 3 * cells + 10 * cellsOf(s, "a").filter((i) => s.map.city[i]).length);
    const before = s.players.a?.troops ?? 0;
    advanceTerra(s, cfg, START + STEP);
    expect(s.players.a?.troops).toBe(
      before + Math.max(1, Math.floor(((cap - before) * 1_000) / 10_000)),
    );
    // Within the day of protection: Milan cannot strike yet.
    advanceTerra(s, cfg, START + 20 * HOUR);
    expect(s.players.a?.troops).toBe(cap);
  });

  it("rest at night, and so do the fronts", () => {
    const cfg = config({ openHours: { from: 8, to: 22 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const troops = s.players.a?.troops;
    // 2 h to 6 h in Paris: closed.
    advanceTerra(s, cfg, START + 4 * HOUR);
    expect(s.players.a?.troops).toBe(troops);
  });
});

describe("fronts", () => {
  it("take a few neutral cells a step, nearest the aim first, paying their militia", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const aim = border(s, "a");
    const troops = s.players.a?.troops ?? 0;
    launchFront(s, cfg, "a", aim, 10_000, START);
    expect(s.players.a?.troops).toBe(0);
    const front = s.fronts[0];
    expect(front?.troops).toBe(troops);
    const before = cellsOf(s, "a").length;
    const cost = cellCost(s, cfg, aim);
    advanceTerra(s, cfg, START + STEP);
    expect(s.owner[aim]).toBe("a");
    const taken = cellsOf(s, "a").length - before;
    expect(taken).toBeGreaterThanOrEqual(1);
    expect(taken).toBeLessThanOrEqual(2);
    expect(s.fronts[0]?.troops ?? 0).toBeLessThanOrEqual(troops - cost);
  });

  it("stop when their troops no longer pay a cell, and give back what is left", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    advanceTerra(s, cfg, START + 12 * HOUR);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
    // Everything spent or back home; the land held grew.
    expect(cellsOf(s, "a").length).toBeGreaterThan(7);
  });

  it("are refused against a protected merchant, too many at once, or too small", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 1_000;
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 500, START))).toBe(
      "share_too_small",
    );
    expect(code(() => launchFront(s, cfg, "a", cellsOf(s, "a")[0] as number, 5_000, START))).toBe(
      "own_cell",
    );
    expect(code(() => launchFront(s, cfg, "a", 0, 5_000, START))).toBe("not_adjacent");
    for (let k = 0; k < 3; k++) launchFront(s, cfg, "a", border(s, "a"), 2_000, START);
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 2_000, START))).toBe(
      "too_many_fronts",
    );
  });

  it("against a merchant, cost his density on the terrain, and cost him as much", () => {
    const cfg = config({ start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0 } });
    const s = newTerra(cfg, "seed", 10, START);
    const a = freeCell(s, 2);
    placeOnTerra(s, cfg, "a", a, START);
    // b two cells beyond a's ring: their lands touch.
    const b = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, a, i) === 3 &&
        hexNeighbors(s.map, i).every(
          (n) => s.owner[n] === null || s.owner[n] === "a" || hexDistance(s.map, a, n) >= 2,
        ),
    );
    placeOnTerra(s, cfg, "b", b, START);
    const target = border(s, "a", "b");
    const bTroops = s.players.b?.troops ?? 0;
    const density = Math.max(1, Math.floor(bTroops / cellsOf(s, "b").length));
    const terrain = s.map.terrain[target] === "hill" ? 15_000 : 10_000;
    const city = s.map.city[target] ? 15_000 : 10_000;
    expect(cellCost(s, cfg, target)).toBe(Math.ceil((density * terrain * city) / 100_000_000));
    launchFront(s, cfg, "a", target, 10_000, START);
    advanceTerra(s, cfg, START + STEP);
    expect(s.owner[target]).toBe("a");
    expect(s.players.b?.troops ?? 0).toBeLessThan(bTroops);
  });

  it("never take a merchant's capital: nobody is wiped off the map", () => {
    const cfg = config({ start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0 } });
    const s = newTerra(cfg, "seed", 10, START);
    const a = freeCell(s, 2);
    placeOnTerra(s, cfg, "a", a, START);
    const b = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, a, i) === 3 &&
        hexNeighbors(s.map, i).every(
          (n) => s.owner[n] === null || s.owner[n] === "a" || hexDistance(s.map, a, n) >= 2,
        ),
    );
    placeOnTerra(s, cfg, "b", b, START);
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a", "b"), 10_000, START);
    advanceTerra(s, cfg, START + 6 * HOUR);
    expect(cellsOf(s, "b")).toEqual([b]);
  });

  it("come home after their hours, what is left of them", () => {
    const cfg = config({ fronts: { ...testTerraferma.fronts, cellsPerStep: 1, maxHours: 1 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    const before = cellsOf(s, "a").length;
    advanceTerra(s, cfg, START + 3 * HOUR);
    // Six steps of an hour, one cell each, then home.
    expect(cellsOf(s, "a").length - before).toBe(6);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
  });

  it("can be called back, their troops home", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    const left = s.players.a?.troops ?? 0;
    const id = s.fronts[0]?.id ?? "";
    expect(code(() => recallFront(s, "b", id))).toBe("not_owner");
    recallFront(s, "a", id);
    expect(s.fronts).toHaveLength(0);
    expect(s.players.a?.troops).toBeGreaterThan(left);
  });
});

describe("glory and Milan", () => {
  it("count the land held every open step", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const cells = cellsOf(s, "a");
    const per = cells.length + 3 * cells.filter((i) => s.map.city[i]).length;
    advanceTerra(s, cfg, START + 3 * STEP);
    expect(s.players.a?.glory).toBe(3 * per);
  });

  it("rides out every few open hours, at the leader when it borders him, else into neutral land", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const before = cellsOf(s, "milan").length;
    advanceTerra(s, cfg, START + 4 * HOUR);
    expect(s.fronts.some((f) => f.owner === "milan") || cellsOf(s, "milan").length > before).toBe(
      true,
    );
  });
});

describe("a map on the real geography", () => {
  // A land of 150 × 100 with the sea along its eastern side, two cities.
  const geography = {
    box: { x0: 0, y0: 0, x1: 150, y1: 100 },
    water: [
      [
        [120, 0],
        [150, 0],
        [150, 100],
        [120, 100],
      ] as [number, number][],
    ],
    cities: [
      { code: "verona", x: 30, y: 50 },
      { code: "padova", x: 90, y: 50 },
    ],
  };

  it("lays its cells on the land only, finer as the world grows, the cities where they are", () => {
    const cfg = config({ geography });
    const small = newTerra(cfg, "seed", 4, START);
    const big = newTerra(cfg, "seed", 12, START);
    const land = (s: TerraState) => s.map.land.filter(Boolean).length;
    // About 10 land cells a merchant, at least `minActive` counted.
    expect(land(small)).toBeGreaterThanOrEqual(30);
    expect(land(small)).toBeLessThanOrEqual(55);
    expect(land(big)).toBeGreaterThan(land(small) * 2);
    for (let i = 0; i < big.owner.length; i++) {
      const [x] = cellCenter(big.map, i);
      if (x > 121) expect(big.map.land[i]).toBe(false);
    }
    const verona = big.map.cityCode.indexOf("verona");
    const [vx, vy] = cellCenter(big.map, verona);
    expect(Math.hypot(vx - 30, vy - 50)).toBeLessThan(big.map.size * 2);
    expect(big.map.city[verona]).toBe(true);
  });

  it("never sets anyone down on the water, nor lets a front take it", () => {
    const cfg = config({ geography });
    const s = newTerra(cfg, "seed", 4, START);
    const water = s.map.land.indexOf(false);
    expect(code(() => placeOnTerra(s, cfg, "a", water, START))).toBe("not_neutral");
    expect(s.owner[water]).toBeNull();
    s.owner.forEach((o, i) => {
      if (!s.map.land[i]) expect(o).toBeNull();
    });
  });
});

describe("a merchant who comes late", () => {
  it("sets down on the edge of Milan's land once no neutral place is left, and only then", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const edge = s.owner.findIndex(
      (o, i) => o === MILAN && hexNeighbors(s.map, i).some((n) => s.owner[n] === null),
    );
    expect(code(() => placeOnTerra(s, cfg, "late", edge, START))).toBe("neutral_left");
    // The neutral land all taken.
    for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === null) s.owner[i] = "someone";
    const inner = s.owner.findIndex(
      (o, i) => o === MILAN && hexNeighbors(s.map, i).every((n) => s.owner[n] === MILAN),
    );
    if (inner >= 0)
      expect(code(() => placeOnTerra(s, cfg, "late", inner, START))).toBe("not_neutral");
    const free = s.owner.findIndex(
      (o, i) =>
        o === MILAN &&
        hexNeighbors(s.map, i).some((n) => s.owner[n] === "someone") &&
        s.owner.every((p, j) => p !== "someone" || hexDistance(s.map, i, j) >= 1),
    );
    placeOnTerra(s, cfg, "late", free, START + 3 * 24 * HOUR);
    expect(s.owner[free]).toBe("late");
    // Its ring is taken from Milan; it comes with more troops, later in the week.
    expect(cellsOf(s, "late").length).toBeGreaterThan(1);
    expect(s.players.late?.troops).toBe(30 + 3 * 10);
  });
});

describe("neutral land", () => {
  it("is taken more slowly than a neighbour's", () => {
    const cfg = config({
      fronts: { ...testTerraferma.fronts, cellsPerStep: 1, neutralEverySteps: 2 },
    });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    const before = cellsOf(s, "a").length;
    advanceTerra(s, cfg, START + 4 * STEP);
    expect(cellsOf(s, "a").length - before).toBe(2);
  });
});

describe("a front's forecast", () => {
  it("tells which cells it will take and when, and when it will stop, without touching the map", () => {
    const cfg = config({
      openHours: { from: 8, to: 22 },
      fronts: { ...testTerraferma.fronts, cellsPerStep: 1, neutralEverySteps: 3 },
    });
    // 6 h in Paris: the front waits for the morning.
    const at = START + 4 * HOUR;
    const s = newTerra(cfg, "seed", 10, at);
    placeOnTerra(s, cfg, "a", freeCell(s), at);
    (s.players.a as { troops: number }).troops = 20;
    const front = launchFront(s, cfg, "a", border(s, "a"), 10_000, at);
    const before = JSON.stringify(s);
    const forecast = forecastFronts(s, cfg, [front.id], at + 2 * 24 * HOUR)[front.id];
    expect(JSON.stringify(s)).toBe(before);
    // 20 troops on 3-troop plains (6 on hills): a few cells, one every 3 open steps from 8 h.
    expect(forecast?.takes.length).toBeGreaterThanOrEqual(2);
    expect(forecast?.takes[0]?.at).toBe(at + 2 * HOUR + 3 * STEP);
    expect(forecast?.endsAt).not.toBeNull();
    // What the map then does, step by step.
    for (const take of forecast?.takes ?? []) {
      advanceTerra(s, cfg, take.at - STEP);
      expect(s.owner[take.cell]).toBeNull();
      advanceTerra(s, cfg, take.at);
      expect(s.owner[take.cell]).toBe("a");
    }
    // It comes home with its last cell, as soon as it can no longer pay the next.
    expect(forecast?.endsAt).toBe(forecast?.takes.at(-1)?.at);
    expect(s.fronts.some((f) => f.id === front.id)).toBe(false);
  });

  it("stops at its horizon, the front still marching", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 10_000;
    const front = launchFront(s, cfg, "a", border(s, "a"), 10_000, START);
    const forecast = forecastFronts(s, cfg, [front.id], START + 2 * STEP)[front.id];
    expect(forecast?.takes.length).toBe(4);
    expect(forecast?.endsAt).toBeNull();
  });
});

describe("a week of war: everyone sets down on Monday, then no limit", () => {
  const war = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) =>
    config({
      start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0, placementHours: 24 },
      fronts: { ...testTerraferma.fronts, capitalSafe: false },
      ...more,
    });
  /** a, and b three cells away: their lands touch. */
  const pair = (s: TerraState, cfg: ReturnType<typeof war>, at: number) => {
    const a = freeCell(s, 2);
    placeOnTerra(s, cfg, "a", a, at);
    const b = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, a, i) === 3 &&
        hexNeighbors(s.map, i).every(
          (n) => s.owner[n] === null || s.owner[n] === "a" || hexDistance(s.map, a, n) >= 2,
        ),
    );
    placeOnTerra(s, cfg, "b", b, at);
    return { a, b };
  };

  it("lets merchants set down only during the first day, all safe from each other until then", () => {
    const cfg = war();
    const s = newTerra(cfg, "seed", 10, START);
    pair(s, cfg, START + 20 * HOUR);
    expect(s.players.a?.protectedUntil).toBe(START + 24 * HOUR);
    expect(
      code(() => launchFront(s, cfg, "a", border(s, "a", "b"), 5_000, START + 20 * HOUR)),
    ).toBe("protected");
    // Free land may be taken while setting down.
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 2_000, START + 20 * HOUR))).toBe(
      "ok",
    );
    expect(code(() => placeOnTerra(s, cfg, "c", freeCell(s, 2), START + 24 * HOUR))).toBe(
      "placement_closed",
    );
    expect(
      code(() => launchFront(s, cfg, "a", border(s, "a", "b"), 5_000, START + 24 * HOUR)),
    ).toBe("ok");
  });

  it("with a truce and no placement window: a latecomer sets down, safe for a while", () => {
    const cfg = war({
      start: {
        ...testTerraferma.start,
        minDistance: 2,
        protectionHours: 12,
        placementHours: 0,
        truceHours: 24,
      },
    });
    const s = newTerra(cfg, "seed", 10, START);
    pair(s, cfg, START + 2 * HOUR);
    // Everyone safe until the truce ends, even past their own 12 hours.
    expect(s.players.a?.protectedUntil).toBe(START + 24 * HOUR);
    // On the third day: no truce left, 12 hours of its own.
    const late = START + 50 * HOUR;
    expect(code(() => placeOnTerra(s, cfg, "c", freeCell(s, 2), late))).toBe("ok");
    expect(s.players.c?.protectedUntil).toBe(late + 12 * HOUR);
  });

  it("takes even a capital: a merchant left without land is out of the week", () => {
    const cfg = war();
    const s = newTerra(cfg, "seed", 10, START);
    const { b } = pair(s, cfg, START);
    advanceTerra(s, cfg, START + 24 * HOUR);
    (s.players.a as { troops: number }).troops = 100_000;
    (s.players.b as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a", "b"), 10_000, s.clock);
    launchFront(s, cfg, "b", border(s, "b"), 1_000, s.clock);
    (s.players.b as { troops: number }).troops = 1;
    advanceTerra(s, cfg, s.clock + 6 * HOUR);
    expect(s.owner[b]).toBe("a");
    expect(cellsOf(s, "b")).toEqual([]);
    expect(s.players.b?.eliminatedAt).toBeGreaterThan(START);
    expect(s.players.b?.troops).toBe(0);
    expect(s.fronts.some((f) => f.owner === "b")).toBe(false);
    expect(code(() => placeOnTerra(s, cfg, "b", 0, s.clock))).toBe("already_placed");
  });

  it("never takes the capital of a merchant who attacked no merchant this week", () => {
    const cfg = war({
      fronts: { ...testTerraferma.fronts, capitalSafe: false, peacefulSafe: true },
    });
    const s = newTerra(cfg, "seed", 10, START);
    const { b } = pair(s, cfg, START);
    advanceTerra(s, cfg, START + 24 * HOUR);
    (s.players.a as { troops: number }).troops = 100_000;
    launchFront(s, cfg, "a", border(s, "a", "b"), 10_000, s.clock);
    (s.players.b as { troops: number }).troops = 1;
    advanceTerra(s, cfg, s.clock + 6 * HOUR);
    // Only its capital is left, and it stays.
    expect(cellsOf(s, "b")).toEqual([b]);
    expect(s.players.b?.eliminatedAt).toBeUndefined();
  });

  it("takes the capital of a merchant who attacked another", () => {
    const cfg = war({
      fronts: { ...testTerraferma.fronts, capitalSafe: false, peacefulSafe: true },
    });
    const s = newTerra(cfg, "seed", 10, START);
    const { b } = pair(s, cfg, START);
    advanceTerra(s, cfg, START + 24 * HOUR);
    (s.players.b as { troops: number }).troops = 10_000;
    const raid = launchFront(s, cfg, "b", border(s, "b", "a"), 1_000, s.clock);
    // Called back at once: the attack is what counts.
    recallFront(s, "b", raid.id);
    expect(s.players.b?.aggressor).toBe(true);
    (s.players.a as { troops: number }).troops = 100_000;
    launchFront(s, cfg, "a", border(s, "a", "b"), 10_000, s.clock);
    (s.players.b as { troops: number }).troops = 1;
    advanceTerra(s, cfg, s.clock + 12 * HOUR);
    expect(s.owner[b]).toBe("a");
  });

  it("sends Milan at its weakest neighbour, not at the leader", () => {
    const cfg = war({ milan: { ...testTerraferma.milan, target: "weakest" } });
    const s = newTerra(cfg, "seed", 10, START);
    // Two merchants along Milan's land, far from each other.
    const edge = (away: string[]) =>
      s.owner.findIndex(
        (o, i) =>
          o === null &&
          s.owner.every(
            (p, j) =>
              p === null ||
              (p === MILAN ? hexDistance(s.map, i, j) >= 2 : hexDistance(s.map, i, j) >= 4),
          ) &&
          s.owner.some((p, j) => p === MILAN && hexDistance(s.map, i, j) === 2) &&
          away.every((id) => cellsOf(s, id).every((j) => hexDistance(s.map, i, j) >= 4)),
      );
    placeOnTerra(s, cfg, "strong", edge([]), START);
    placeOnTerra(s, cfg, "weak", edge(["strong"]), START);
    advanceTerra(s, cfg, START + 24 * HOUR);
    (s.players.strong as { troops: number; glory: number }).troops = 1_000;
    (s.players.strong as { glory: number }).glory = 1_000;
    (s.players.weak as { troops: number }).troops = 1;
    s.milanSteps = 0;
    s.fronts = [];
    // Step by step until Milan rides out.
    const step = cfg.stepMinutes * MIN;
    for (let k = 0; k < 48 && !s.fronts.some((f) => f.owner === MILAN); k++)
      advanceTerra(s, cfg, s.clock + step);
    expect(s.fronts.find((f) => f.owner === MILAN)?.against).toBe("weak");
  });
});

describe("troops a merchant understands", () => {
  const plain = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) =>
    config({
      stepMinutes: 60,
      terrains: { plain: { defenseBps: 10_000, militia: 3 } },
      bands: [{ untilBps: 10_000, weights: { plain: 1 } }],
      city: { militiaBps: 10_000, defenseBps: 10_000 },
      troops: {
        ...testTerraferma.troops,
        base: 50,
        perCell: 0,
        perCity: 0,
        recruit: { base: 6, perCell: 1 },
      },
      ...more,
    });

  it("have a maximum raised by ducats only, and are recruited by the hour, faster with more land", () => {
    const cfg = plain();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const cells = cellsOf(s, "a").length;
    expect(capOf(s, cfg, "a")).toBe(50);
    expect(recruitPerHour(s, cfg, "a")).toBe(6 + cells);
    (s.players.a as { troops: number }).troops = 0;
    advanceTerra(s, cfg, START + HOUR);
    expect(s.players.a?.troops).toBe(6 + cells);
    // Never past the maximum; ducats raise it.
    advanceTerra(s, cfg, START + 10 * HOUR);
    expect(s.players.a?.troops).toBe(50);
    raiseCap(s, cfg, "a", START + 10 * HOUR);
    expect(capOf(s, cfg, "a")).toBe(50 + cfg.capRaise.amount);
  });

  it("refuse a front that cannot take its first cell, and bring one home as soon as it no longer can", () => {
    const cfg = plain({ fronts: { ...testTerraferma.fronts, cellsPerStep: 1 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 2;
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 10_000, START))).toBe("too_weak");
    // Enough for one cell of 3 and a troop more: it takes one, then comes home with the troop.
    (s.players.a as { troops: number }).troops = 4;
    const rate = recruitPerHour(s, cfg, "a");
    launchFront(s, cfg, "a", border(s, "a"), 10_000, START);
    advanceTerra(s, cfg, START + HOUR);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
    // The hour's recruits (counted on the land before the take) and the troop come home.
    expect(s.players.a?.troops).toBe(rate + 1);
  });
});

describe("a front's account", () => {
  it("is kept when it comes home: the cells it took, the troops it spent, those it brought back", () => {
    const cfg = config({
      terrains: { plain: { defenseBps: 10_000, militia: 3 } },
      bands: [{ untilBps: 10_000, weights: { plain: 1 } }],
      city: { militiaBps: 10_000, defenseBps: 10_000 },
      fronts: { ...testTerraferma.fronts, cellsPerStep: 1 },
    });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 10;
    const front = launchFront(s, cfg, "a", border(s, "a"), 10_000, START);
    advanceTerra(s, cfg, START + HOUR);
    // 10 troops, 3 a cell: three cells, one troop home.
    expect(s.returns).toEqual([
      {
        front: front.id,
        owner: "a",
        against: null,
        cells: 3,
        spent: 9,
        back: 1,
        at: START + 3 * STEP,
      },
    ]);
  });
});

describe("the battle hour", () => {
  // 4 h to 5 h in Paris: START + 2 h to START + 3 h.
  const battle = { from: 4, to: 5, stepMinutes: 1, warnMinutes: 15 };
  /** A merchant alone on the map, a front at the free land; cells taken and glory in 30 min. */
  const run = (at: number) => {
    const cfg = config({ battle, start: { ...testTerraferma.start, troops: 5_000 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    advanceTerra(s, cfg, at);
    const before = { cells: cellsOf(s, "a").length, glory: s.players.a?.glory ?? 0 };
    launchFront(s, cfg, "a", border(s, "a"), 10_000, s.clock);
    advanceTerra(s, cfg, at + 30 * MIN);
    return {
      cells: cellsOf(s, "a").length - before.cells,
      glory: (s.players.a?.glory ?? 0) - before.glory,
    };
  };

  it("makes the fronts march ten times as fast, the glory and the troops at their usual pace", () => {
    const calm = run(START + 30 * MIN);
    const fight = run(START + 2 * HOUR);
    expect(calm.cells).toBeGreaterThan(0);
    expect(fight.cells).toBeGreaterThanOrEqual(calm.cells * 5);
    // Glory counts land held, step by economic step: the same number of steps.
    expect(fight.glory).toBeGreaterThan(0);
  });
});

describe("soldiers and peasants", () => {
  const peasants = {
    yields: { plain: { resource: "wheat", perCells: 2 }, hill: { resource: "clay", perCells: 2 } },
    routeDucats: 100,
  };
  const recruit = { base: 6, perCell: 1, perCity: 3 };

  it("recruits more with more soldiers, harvests more with more peasants", () => {
    const cfg = config({ peasants, troops: { ...testTerraferma.troops, recruit } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const half = recruitPerHour(s, cfg, "a");
    setPeasants(s, "a", 0);
    expect(recruitPerHour(s, cfg, "a")).toBe(half * 2);
    setPeasants(s, "a", 10_000);
    expect(recruitPerHour(s, cfg, "a")).toBe(0);
    advanceTerra(s, cfg, START + 2 * HOUR);
    const owed = s.players.a?.harvest ?? {};
    expect(Object.values(owed).reduce((n, q) => n + q, 0)).toBeGreaterThan(0);
  });

  it("pays a route between two of the merchant's cities joined by its own land", () => {
    const cfg = config({ peasants });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    // Give it a path to two cities.
    const cities = s.map.city.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < s.owner.length; i++) if (s.map.land[i]) s.owner[i] = "a";
    expect(cities.length).toBeGreaterThanOrEqual(2);
    advanceTerra(s, cfg, START + HOUR);
    // 100 d an hour a city on the route, counted step by step (the land taken closes the week).
    expect(s.players.a?.routeOwed ?? 0n).toBe((BigInt(cities.length) * 100n * 10n) / 60n);
  });
});

describe("the water", () => {
  const porto = { price: 1_000, perCells: 1, guardBps: 5_000, minutesPerWater: 10 };
  /** A lake down the middle of the map: two columns of water. */
  const withLake = (cfg: ReturnType<typeof config>) => {
    const s = newTerra(cfg, "seed", 10, START);
    const mid = Math.floor(s.map.width / 2);
    for (let i = 0; i < s.owner.length; i++) {
      const col = i % s.map.width;
      if (col === mid || col === mid + 1) {
        s.map.land[i] = false;
        s.map.terrain[i] = "water";
        s.owner[i] = null;
      }
    }
    return { s, mid };
  };
  const coastal = (s: TerraState, i: number) =>
    s.map.land[i] && hexNeighbors(s.map, i).some((n) => !s.map.land[n]);

  it("lets a port send a boat across the water to land on the far shore", () => {
    const cfg = config({
      buildings: { rocca: { price: 4_000, defenseBps: 16_000, perCells: 15 }, porto },
      start: { ...testTerraferma.start, troops: 500, protectionHours: 0 },
    });
    const { s, mid } = withLake(cfg);
    const row = Math.floor(s.map.height / 2);
    const west = row * s.map.width + mid - 1;
    const east = row * s.map.width + mid + 2;
    expect(coastal(s, west) && coastal(s, east)).toBe(true);
    placeOnTerra(s, cfg, "a", west, START);
    buildOnTerra(s, cfg, "a", west, "porto");
    const boat = launchNaval(s, cfg, "a", east, 5_000, START);
    expect(boat.landsAt).toBeGreaterThan(START);
    // At sea: nothing taken yet.
    advanceTerra(s, cfg, START + STEP);
    expect(s.owner[east]).toBe(null);
    advanceTerra(s, cfg, START + 2 * HOUR);
    expect(s.owner[east]).toBe("a");
  });

  it("refuses a boat without a port, or to a shore of another water", () => {
    const cfg = config({
      buildings: { rocca: { price: 4_000, defenseBps: 16_000, perCells: 15 }, porto },
      start: { ...testTerraferma.start, troops: 500, protectionHours: 0 },
    });
    const { s, mid } = withLake(cfg);
    const row = Math.floor(s.map.height / 2);
    placeOnTerra(s, cfg, "a", row * s.map.width + mid - 1, START);
    expect(code(() => launchNaval(s, cfg, "a", row * s.map.width + mid + 2, 5_000, START))).toBe(
      "no_port",
    );
    // A port is built on the shore only.
    const inland = row * s.map.width + mid - 3;
    s.owner[inland] = "a";
    expect(code(() => buildOnTerra(s, cfg, "a", inland, "porto"))).toBe("not_coastal");
  });
});

describe("the nations of 1450", () => {
  const nation = (behavior: "defensive" | "opportunist" | "raider" | "slow", more = {}) => ({
    id: "mantova",
    atBps: { x: 6_000, y: 5_000 },
    radius: 1,
    troops: 200,
    troopsPerActive: 0,
    regenBps: 500,
    everyHours: 1,
    shareBps: 3_000,
    behavior,
    ...more,
  });

  it("hold their land around their seat, never rank, and are not merchants", () => {
    const cfg = config({ nations: [nation("slow")] });
    const s = newTerra(cfg, "seed", 10, START);
    const id = "nation:mantova";
    expect(cellsOf(s, id).length).toBe(7);
    expect(isNation(id)).toBe(true);
    expect(isNation("a")).toBe(false);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    advanceTerra(s, cfg, START + 3 * HOUR);
    // A slow nation spreads into free land only.
    expect(cellsOf(s, id).length).toBeGreaterThan(7);
    expect(s.fronts.every((f) => f.owner !== id || f.against === null)).toBe(true);
    const close = closeTerra(s, cfg, START + 3 * HOUR);
    expect(close.ranking.some((r) => r.id === id)).toBe(false);
  });

  it("a defensive nation strikes back only at the merchant who attacked it", () => {
    const cfg = config({
      nations: [nation("defensive")],
      start: { ...testTerraferma.start, troops: 300, protectionHours: 0, minDistance: 2 },
    });
    const s = newTerra(cfg, "seed", 10, START);
    const id = "nation:mantova";
    // A merchant on the nation's border.
    const seat = s.players[id]?.capital ?? 0;
    const near = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, i, seat) === 3 &&
        hexNeighbors(s.map, i).filter((n) => s.map.land[n]).length === 6 &&
        s.owner.every((p, j) => p === null || p === id || hexDistance(s.map, i, j) >= 2),
    );
    placeOnTerra(s, cfg, "a", near, START);
    advanceTerra(s, cfg, START + 2 * HOUR);
    expect(s.fronts.some((f) => f.owner === id && f.against === "a")).toBe(false);
    launchFront(s, cfg, "a", border(s, "a", id), 5_000, s.clock);
    advanceTerra(s, cfg, s.clock + 2 * HOUR);
    expect(s.players[id]?.wronged).toContain("a");
  });
});
