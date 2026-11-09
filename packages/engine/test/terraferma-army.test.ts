import { describe, expect, it } from "vitest";
import {
  type TerraState,
  type WorldSettingsInput,
  capOf,
  cellsOf,
  cellsThisStep,
  newTerra,
  placeOnTerra,
  terraDistance,
  terraNeighbors,
  winBpsAt,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, makeContext } from "./helpers.js";

// The land makes the army (docs/plan-terraferme-porcellana.md § 4 septies, the owner's decisions
// of 8 November 2026): the cap grows with the land up to a ceiling; a front's mass makes its speed,
// up to a few cells a step; the threshold that wins the week at once lowers day by day.
const START = Date.UTC(2026, 9, 5, 0, 0); // a Monday
const DAY = 24 * HOUR;
const config = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) => {
  const cfg = makeContext({ terraferma: { ...testTerraferma, ...more } }).settings.terraferma;
  if (!cfg) throw new Error("no terraferma");
  return cfg;
};
const freeCell = (s: TerraState) => {
  for (let i = s.owner.length - 1; i >= 0; i--) {
    if (s.owner[i] !== null || terraNeighbors(s.map, i).length < 4) continue;
    if (s.owner.every((o, j) => o === null || terraDistance(s.map, i, j) >= 3)) return i;
  }
  throw new Error("no free cell");
};

describe("the cap grows with the land, to a ceiling", () => {
  const troops = { ...testTerraferma.troops, base: 20, perCell: 3, perCity: 0 };
  it("adds to the cap for each cell held", () => {
    const cfg = config({ troops });
    const s = newTerra(cfg, "seed", 6, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START + HOUR);
    expect(capOf(s, cfg, "a")).toBe(20 + 3 * cellsOf(s, "a").length);
  });
  it("never past its ceiling (golden rule 3)", () => {
    const cfg = config({ troops: { ...troops, max: 50 } });
    const s = newTerra(cfg, "seed", 6, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START + HOUR);
    for (let i = 0; i < s.owner.length && cellsOf(s, "a").length < 40; i++)
      if (s.map.land[i] && s.owner[i] === null) s.owner[i] = "a";
    expect(capOf(s, cfg, "a")).toBe(50);
  });
});

describe("a front's mass makes its speed", () => {
  const cfg = config({
    fronts: { ...testTerraferma.fronts, cellsPerStep: 1, massPerCell: 40, cellsMaxPerStep: 3 },
  });
  it("takes one cell a step when small, one more for each so many troops", () => {
    expect(cellsThisStep(cfg, 10)).toBe(1);
    expect(cellsThisStep(cfg, 40)).toBe(2);
    expect(cellsThisStep(cfg, 85)).toBe(3);
  });
  it("never more than the ceiling of cells a step", () => {
    expect(cellsThisStep(cfg, 10_000)).toBe(3);
  });
  it("keeps the old pace without the setting", () => {
    expect(cellsThisStep(config(), 10_000)).toBe(testTerraferma.fronts.cellsPerStep);
  });
});

describe("the threshold that wins the week lowers day by day", () => {
  const byDay = [9_000, 8_000, 7_000, 6_000, 5_000, 4_000, 3_000];
  it("follows the day of the week", () => {
    const cfg = config({ close: { ...config().close, winBpsByDay: byDay } } as never);
    const s = newTerra(cfg, "seed", 6, START);
    expect(winBpsAt(s, cfg, START + HOUR)).toBe(9_000);
    expect(winBpsAt(s, cfg, START + 3 * DAY + HOUR)).toBe(6_000);
    expect(winBpsAt(s, cfg, START + 6 * DAY + 23 * HOUR)).toBe(3_000);
  });
  it("keeps the one threshold without the setting", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 6, START);
    expect(winBpsAt(s, cfg, START + 5 * DAY)).toBe(cfg.close.winBps);
  });
});
