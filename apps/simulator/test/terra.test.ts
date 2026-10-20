import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { runTerra } from "../src/terra.js";

describe("the Terraferma prototype", () => {
  it("plays a week of Venice: merchants set down, fight; latecomers still come in", () => {
    const cfg = parseSettings(venice1450Settings).terraferma;
    if (!cfg) throw new Error("no terraferma");
    const r = runTerra(cfg, 1);
    const early = r.players.filter((p) => p.profile !== "late");
    expect(early.every((p) => p.placed)).toBe(true);
    // Who comes after the first day still sets down (playtest of 20 October).
    expect(r.players.filter((p) => p.profile === "late").some((p) => p.placed)).toBe(true);
    expect(r.fronts.againstMerchants).toBeGreaterThan(0);
    expect(r.daily).toHaveLength(7);
  });
});
