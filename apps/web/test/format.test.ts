import { describe, expect, it } from "vitest";
import { amount, d, ducats, hourOf, whole } from "../src/game/format.js";

/** A breaking space would cut « 10 d » into « 10 » and « d » at the end of a line. */
const BREAKING = /[ \t\n]/;
const NBSP = "\u00a0";

describe("amounts", () => {
  it("never break between the number and its unit", () => {
    for (const v of [0n, 1_000n, 1_100_000n, 12_855n, -250_000n]) {
      expect(d(v)).not.toMatch(BREAKING);
      expect(ducats(v)).not.toMatch(BREAKING);
      expect(amount(v)).not.toMatch(BREAKING);
    }
  });

  it("group thousands with a no-break space the faces draw", () => {
    expect(d(1_100_000n)).toBe(`11${NBSP}000${NBSP}d`);
    expect(ducats(12_855n)).toBe(`128,55${NBSP}ducats`);
    expect(amount(100_000_000n)).toBe(`1${NBSP}000${NBSP}000`);
  });
});

describe("whole ducats", () => {
  it("cut the deniers, never round up: a purse never shows more than it holds", () => {
    expect(whole(112_880n)).toBe(`1${NBSP}128${NBSP}d`);
    expect(whole(-2_972n)).toBe(`−29${NBSP}d`);
    expect(whole(99n)).toBe(`0${NBSP}d`);
    expect(amount(112_880n)).toBe(`1${NBSP}128`);
  });
});

describe("an hour of Paris", () => {
  it("reads the French way, whatever the browser's zone", () => {
    expect(hourOf(Date.UTC(2026, 10, 2, 7, 0))).toBe(`8${NBSP}h`);
    expect(hourOf(Date.UTC(2026, 6, 2, 19, 40))).toBe(`21${NBSP}h${NBSP}40`);
  });
});
