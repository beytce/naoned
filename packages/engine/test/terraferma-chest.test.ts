import { describe, expect, it } from "vitest";
import {
  EngineError,
  type TerraState,
  type WorldSettingsInput,
  buildOnTerra,
  cellsOf,
  chestOf,
  newTerra,
  placeOnTerra,
  raiseCap,
  terraDistance,
  terraNeighbors,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, makeContext } from "./helpers.js";

// The equal war chest (docs/plan-terraferme-porcellana.md § 4 quinquies, the owner's decisions of
// 8 November 2026): the Terraferma's buildings and cap paid in écus, the same for every merchant of
// a theatre, given at the start and each morning up to a ceiling; never in the ducats of commerce.
const START = Date.UTC(2026, 9, 5, 0, 0); // a Monday
const DAY = 24 * HOUR;
const chest = {
  start: 60,
  perDay: 25,
  cap: 120,
  prices: { rocca: 40, borgo: 50, porto: 30, bombarda: 110, mura: 50, cap: 60 },
};
const config = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) => {
  const cfg = makeContext({ terraferma: { ...testTerraferma, chest, ...more } }).settings
    .terraferma;
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
const freeCell = (s: TerraState) => {
  for (let i = s.owner.length - 1; i >= 0; i--) {
    if (s.owner[i] !== null || terraNeighbors(s.map, i).length < 4) continue;
    if (s.owner.every((o, j) => o === null || terraDistance(s.map, i, j) >= 3)) return i;
  }
  throw new Error("no free cell");
};
const placed = (cfg = config(), at = START + HOUR) => {
  const s = newTerra(cfg, "seed", 6, START);
  placeOnTerra(s, cfg, "a", freeCell(s), at);
  // Room for every kind of building: the merchant holds land enough.
  return { s, cfg };
};
const roomy = (s: TerraState) => {
  const p = s.players.a;
  if (!p) throw new Error("not placed");
  for (let i = 0; i < s.owner.length && cellsOf(s, "a").length < 60; i++)
    if (s.map.land[i] && s.owner[i] === null) s.owner[i] = "a";
};

describe("the war chest, in écus", () => {
  it("gives every merchant the same chest at the start", () => {
    const { s, cfg } = placed();
    expect(chestOf(s, cfg, "a", START + HOUR)).toBe(60);
  });

  it("adds the day's écus each morning, never past its ceiling (golden rule 3)", () => {
    const { s, cfg } = placed();
    expect(chestOf(s, cfg, "a", START + 23 * HOUR)).toBe(60);
    expect(chestOf(s, cfg, "a", START + DAY)).toBe(85);
    expect(chestOf(s, cfg, "a", START + 2 * DAY + HOUR)).toBe(110);
    expect(chestOf(s, cfg, "a", START + 6 * DAY)).toBe(120);
  });

  it("is nothing without the settings: the old ways, or none", () => {
    const cfg = config({ chest: undefined });
    const { s } = placed(cfg);
    expect(chestOf(s, cfg, "a", START + DAY)).toBe(0);
  });
});

describe("what the chest pays", () => {
  it("builds for écus, never ducats", () => {
    const { s, cfg } = placed();
    roomy(s);
    const cell = cellsOf(s, "a").find((c) => !s.buildings?.[c]) as number;
    expect(buildOnTerra(s, cfg, "a", cell, "rocca", START + HOUR)).toBe(0n);
    expect(s.buildings?.[cell]?.kind).toBe("rocca");
    expect(chestOf(s, cfg, "a", START + HOUR)).toBe(20);
  });

  it("refuses what the chest cannot pay, and builds nothing", () => {
    const { s, cfg } = placed();
    roomy(s);
    raiseCap(s, cfg, "a", START + HOUR);
    const cell = cellsOf(s, "a")[2] as number;
    expect(code(() => buildOnTerra(s, cfg, "a", cell, "rocca", START + HOUR))).toBe("chest_short");
    expect(s.buildings?.[cell]).toBeUndefined();
    expect(chestOf(s, cfg, "a", START + HOUR)).toBe(0);
  });

  it("raises the cap for écus", () => {
    const { s, cfg } = placed();
    expect(raiseCap(s, cfg, "a", START + HOUR)).toBe(0n);
    expect(s.players.a?.boughtCap).toBe(cfg.capRaise.amount);
    expect(chestOf(s, cfg, "a", START + HOUR)).toBe(0);
    expect(code(() => raiseCap(s, cfg, "a", START + HOUR))).toBe("chest_short");
  });

  it("keeps spending and the morning's écus apart: spent today, refilled tomorrow", () => {
    const { s, cfg } = placed();
    raiseCap(s, cfg, "a", START + HOUR);
    expect(chestOf(s, cfg, "a", START + DAY + HOUR)).toBe(25);
  });
});
