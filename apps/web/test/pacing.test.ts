import { describe, expect, it } from "vitest";
import { Glide, Pacer, Resolution, pixelBudget, wheelFactor } from "../src/game/pacing.js";

describe("the scenes' pace", () => {
  it("draws every frame while the player moves the view", () => {
    const p = new Pacer();
    expect([0, 16, 33, 50].map((t) => p.due(t, "busy"))).toEqual([true, true, true, true]);
  });

  it("draws living scenes at 30 images a second", () => {
    const p = new Pacer();
    const drawn = [0, 16.7, 33.3, 50, 66.7, 83.3, 100].filter((t) => p.due(t, "anim"));
    expect(drawn).toEqual([0, 33.3, 66.7, 100]);
  });

  it("draws a still scene once a second, or at once when something changed", () => {
    const p = new Pacer();
    expect(p.due(0, "still")).toBe(true);
    expect(p.due(500, "still")).toBe(false);
    p.poke();
    expect(p.due(516, "still")).toBe(true);
    expect(p.due(900, "still")).toBe(false);
    expect(p.due(1516, "still")).toBe(true);
  });
});

describe("the scenes' resolution", () => {
  it("keeps a budget of pixels on large screens", () => {
    expect(pixelBudget(390, 700, 3)).toBe(2);
    expect(pixelBudget(1400, 900, 2)).toBeCloseTo(1.44, 2);
    expect(pixelBudget(2560, 1300, 1)).toBe(1);
    expect(pixelBudget(800, 600, 0.8)).toBe(0.8);
  });

  it("lowers the resolution when frames come late, then raises it again", () => {
    const r = new Resolution(2);
    let changed = false;
    for (let i = 0; i < 20; i++) changed = r.sample(40, 16.7) || changed;
    expect(changed).toBe(true);
    expect(r.ratio).toBeCloseTo(1.6, 5);
    for (let i = 0; i < 240; i++) r.sample(16.7, 16.7);
    expect(r.ratio).toBeCloseTo(1.84, 5);
  });

  it("never goes below its floor, and ignores a single hiccup", () => {
    const r = new Resolution(1);
    r.sample(400, 16.7);
    expect(r.ratio).toBe(1);
    for (let i = 0; i < 400; i++) r.sample(60, 16.7);
    expect(r.ratio).toBe(0.75);
  });

  it("follows a new budget", () => {
    const r = new Resolution(2);
    expect(r.setMax(1.4)).toBe(true);
    expect(r.ratio).toBe(1.4);
    expect(r.setMax(1.4)).toBe(false);
  });
});

describe("the map's glide", () => {
  it("carries on the throw, slower and slower, then stops", () => {
    const g = new Glide();
    g.track(0, 0, 0);
    g.track(10, 0, 16);
    g.track(20, 0, 32);
    g.release(40);
    const first = g.step(16);
    expect(first?.dx).toBeGreaterThan(0);
    const second = g.step(16);
    expect(second?.dx).toBeLessThan(first?.dx ?? 0);
    let steps = 0;
    while (g.step(16) && steps < 500) steps++;
    expect(steps).toBeLessThan(200);
    expect(g.active).toBe(false);
  });

  it("does not glide when the finger stopped before letting go", () => {
    const g = new Glide();
    g.track(0, 0, 0);
    g.track(20, 0, 16);
    g.release(200);
    expect(g.step(16)).toBeNull();
  });
});

describe("the wheel's zoom", () => {
  it("zooms out on a wheel turned down, in on a wheel turned up, by the same step", () => {
    const out = wheelFactor(100, 0, false);
    const back = wheelFactor(-100, 0, false);
    expect(out).toBeGreaterThan(1);
    expect(out * back).toBeCloseTo(1, 10);
  });

  it("reads lines like pixels, and a trackpad pinch more finely", () => {
    expect(wheelFactor(3, 1, false)).toBeCloseTo(wheelFactor(48, 0, false), 10);
    expect(wheelFactor(4, 0, true)).toBeGreaterThan(wheelFactor(4, 0, false));
  });

  it("keeps a wild wheel within one step", () => {
    expect(wheelFactor(5000, 0, false)).toBeLessThanOrEqual(1.5);
  });
});
