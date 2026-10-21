import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  contractsFor,
  dayIndex,
  hasPass,
  marketMakerQuotaLeft,
  rerollsOf,
} from "../src/index.js";
import { DAY, World, makeContext } from "./helpers.js";

const pass: Partial<WorldSettingsInput> = {
  pass: { enabled: true },
  fresh: { minutes: 30, bonusBps: 500 },
  marketMaker: {
    spreadStartBps: 400,
    spreadEndBps: 2_000,
    spreadRampDays: 14,
    referenceFloorBps: 5_000,
    dailyDepthPerPlayer: { wheat: 5 },
    playerDailyQuota: { wheat: 10 },
    playerDailySellQuota: { wheat: 10 },
  },
  contracts: { perDay: 3, premiumBps: 2_000, quantities: { wheat: 20, clay: 15, wood: 15 } },
};

function world() {
  const w = new World(makeContext(pass));
  w.do({ type: "join", playerId: "paid", region: "terraferma" });
  w.do({ type: "join", playerId: "free", region: "terraferma" });
  w.do({ type: "grantPass", playerId: "paid", until: w.now + 7 * DAY });
  w.do({ type: "tick" });
  return w;
}

describe("the Pass Négociant", () => {
  it("is held until a date, granted by the server (bought or won)", () => {
    const w = world();
    expect(hasPass(w.ctx, w.state, "paid", w.now)).toBe(true);
    expect(hasPass(w.ctx, w.state, "free", w.now)).toBe(false);
    expect(hasPass(w.ctx, w.state, "paid", w.now + 7 * DAY)).toBe(false);
    // A later grant extends it, an earlier one never shortens it.
    w.do({ type: "grantPass", playerId: "paid", until: w.now + DAY });
    expect(hasPass(w.ctx, w.state, "paid", w.now + 6 * DAY)).toBe(true);
  });

  it("never swaps the Doge's orders: no perk on the game", () => {
    const w = world();
    const day = dayIndex(w.ctx, w.now);
    const before = contractsFor(w.ctx, "paid", day, rerollsOf(w.state, "paid", day));
    const first = before[0];
    if (!first) throw new Error("no contract");
    const refused = w.try({ type: "rerollContract", playerId: "paid", contractId: first.id });
    expect(refused.ok ? "" : refused.error).toBe("pass_required");
    expect(contractsFor(w.ctx, "paid", day, rerollsOf(w.state, "paid", day))).toEqual(before);
  });

  it("gives nothing while it is switched off, even to a merchant who holds one", () => {
    const off = new World(
      makeContext({ ...pass, pass: { ...pass.pass, enabled: false } } as never),
    );
    off.do({ type: "join", playerId: "paid", region: "terraferma" });
    off.do({ type: "grantPass", playerId: "paid", until: off.now + 7 * DAY });
    off.do({ type: "tick" });
    expect(hasPass(off.ctx, off.state, "paid", off.now)).toBe(false);
    expect(marketMakerQuotaLeft(off.ctx, off.state, "paid", "wheat", off.now).buy).toBe(10);
    const day = dayIndex(off.ctx, off.now);
    const first = contractsFor(off.ctx, "paid", day)[0];
    const refused = off.try({
      type: "rerollContract",
      playerId: "paid",
      contractId: first?.id ?? "",
    });
    expect(refused.ok ? "" : refused.error).toBe("pass_required");
  });
});
