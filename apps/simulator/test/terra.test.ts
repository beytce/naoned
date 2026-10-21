import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { TERRA_PROFILES, runTerra, skirmishRank } from "../src/terra.js";

const cfg = parseSettings(venice1450Settings).terraferma;
if (!cfg?.skirmish) throw new Error("no terraferma");
const sk = cfg.skirmish;

describe("the Terraferma prototype", () => {
  it("plays a week of Venice: merchants set down, fight; latecomers still come in", () => {
    const r = runTerra(cfg, 1);
    const early = r.players.filter((p) => p.profile !== "late");
    expect(early.every((p) => p.placed)).toBe(true);
    // Who comes after the first day still sets down (playtest of 20 October).
    expect(r.players.filter((p) => p.profile === "late").some((p) => p.placed)).toBe(true);
    expect(r.fronts.againstMerchants).toBeGreaterThan(0);
    expect(r.daily).toHaveLength(7);
  });

  it("ranks a merchant among the two or three merchants of its skirmish, ahead of the condottieri", () => {
    const ranks = new Set<number>();
    for (let k = 0; k < 200; k++) ranks.add(skirmishRank("merchants", `key${k}`));
    expect([...ranks].sort()).toEqual([0, 1, 2]);
    expect(skirmishRank("first", "key0")).toBe(0);
  });

  it("pays one ranked skirmish a day, however many are played, and counts it in the glory", () => {
    expect(TERRA_PROFILES.active?.skirmishes).toBe(3);
    const first = runTerra(cfg, 1, undefined, undefined, "first");
    const top = sk.glory[0] as number;
    for (const p of first.players) {
      // At most the first place once a day, never three times.
      expect(p.skirmishGlory % top).toBe(0);
      expect(p.skirmishGlory).toBeLessThanOrEqual(7 * top);
      expect(p.glory).toBeGreaterThanOrEqual(p.skirmishGlory);
    }
    const actives = first.players.filter((p) => p.profile === "active");
    expect(Math.max(...actives.map((p) => p.skirmishGlory))).toBe(7 * top);
    // Who plays none gets none; nor anyone in the week without skirmishes.
    for (const p of first.players.filter((x) => x.profile === "casual"))
      expect(p.skirmishGlory).toBe(0);
    const off = runTerra(cfg, 1, undefined, undefined, "off");
    expect(off.players.every((p) => p.skirmishGlory === 0)).toBe(true);
    // The same week otherwise: each merchant's glory, less its skirmishes', as without them.
    const without = new Map(off.players.map((p) => [p.id, p.glory]));
    for (const p of first.players) expect(p.glory - p.skirmishGlory).toBe(without.get(p.id));
  });

  it("moves nothing but the alliances: blind to the skirmishes' glory, the week is the same", () => {
    // The ranks drawn among the merchants change who asks whom for an alliance (the bots ask the
    // most glorious neighbour); merchants who leave that glory out play the week without them.
    const blind = runTerra(cfg, 1, undefined, undefined, "merchants", { blind: true });
    const off = runTerra(cfg, 1, undefined, undefined, "off");
    const without = new Map(off.players.map((p) => [p.id, p.glory]));
    expect(blind.players.some((p) => p.skirmishGlory > 0)).toBe(true);
    for (const p of blind.players) expect(p.glory - p.skirmishGlory).toBe(without.get(p.id));
    expect(blind.signore.id).toBe(off.signore.id);
  });
});
