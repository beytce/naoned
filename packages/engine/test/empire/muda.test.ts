import { describe, expect, it } from "vitest";
import { mudaAuction, mudaPlaces, mudaReserve, parseEmpireSettings } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings({
  ...testEmpire,
  muda: {
    vehicles: ["galley"],
    departuresPerWeek: 2,
    placesShareBps: 2_500,
    reserveDaysBps: 5_000,
  },
});

describe("the incanto of the Muda's places", () => {
  it("gives the places to the highest bids, each paying the bid just below", () => {
    expect(mudaAuction([300n, 900n, 500n, 700n], 2, 100n)).toEqual([null, 700n, null, 500n]);
  });

  it("never asks less than the reserve, and refuses the bids below it", () => {
    expect(mudaAuction([900n, 150n, 80n], 2, 200n)).toEqual([200n, null, null]);
    expect(mudaAuction([900n, 700n], 3, 100n)).toEqual([700n, 100n]);
  });

  it("breaks a tie by the first bid, and asks no winner more than its bid", () => {
    const bids = [500n, 500n, 500n];
    const prices = mudaAuction(bids, 2, 100n);
    expect(prices).toEqual([500n, 500n, null]);
    prices.forEach((p, i) => {
      if (p !== null) expect(p <= (bids[i] ?? 0n)).toBe(true);
    });
  });

  it("gives nothing without places", () => {
    expect(mudaAuction([900n], 0, 100n)).toEqual([null]);
  });

  it("opens places in proportion to the galley owners, one at least", () => {
    expect(mudaPlaces(0, s)).toBe(0);
    expect(mudaPlaces(1, s)).toBe(1);
    expect(mudaPlaces(10, s)).toBe(3);
    expect(mudaPlaces(40, s)).toBe(10);
  });

  it("sets the reserve in days of the median income", () => {
    expect(mudaReserve(1_000n, s)).toBe(500n);
  });
});
