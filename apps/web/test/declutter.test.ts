import { describe, expect, it } from "vitest";
import { type Label, declutter } from "../src/game/map/declutter.js";

const box = (key: string, x: number, y: number, priority: number, w = 40, h = 14): Label => ({
  key,
  x,
  y,
  w,
  h,
  priority,
});

/** The rectangles of what is shown, where declutter put them. */
function shown(labels: Label[]) {
  const placed = declutter(labels);
  return labels.flatMap((l) => {
    const p = placed.get(l.key);
    return p
      ? [
          {
            key: l.key,
            x0: l.x + p.dx - l.w / 2,
            x1: l.x + p.dx + l.w / 2,
            y0: l.y + p.dy - l.h / 2,
            y1: l.y + p.dy + l.h / 2,
          },
        ]
      : [];
  });
}

describe("labels on a crowded map", () => {
  it("never show two that cover each other", () => {
    const labels = Array.from({ length: 60 }, (_, i) =>
      box(`l${i}`, (i * 37) % 300, (i * 53) % 400, i % 7),
    );
    const r = shown(labels);
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i];
        const b = r[j];
        if (!a || !b) continue;
        const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        expect(w > 2 && h > 2, `${a.key} over ${b.key}`).toBe(false);
      }
  });

  it("always show the first rank, where it stands", () => {
    const placed = declutter([box("other", 100, 100, 5), box("me", 100, 100, 0)]);
    expect(placed.get("me")).toEqual({ dx: 0, dy: 0 });
  });

  it("move a lesser one aside before hiding it, and hide it when there is no room", () => {
    const aside = declutter([box("me", 100, 100, 0), box("city", 100, 100, 2)]);
    expect(aside.get("city")).not.toBeNull();
    expect(aside.get("city")).not.toEqual({ dx: 0, dy: 0 });
    const walled = [
      box("me", 100, 100, 0),
      box("n", 100, 86, 0),
      box("s", 100, 114, 0),
      box("e", 124, 100, 0),
      box("w", 76, 100, 0),
      box("small", 100, 100, 6),
    ];
    expect(declutter(walled).get("small")).toBeNull();
  });

  it("give the same answer for the same map, whatever the order it was given in", () => {
    const labels = Array.from({ length: 30 }, (_, i) =>
      box(`l${i}`, (i * 13) % 90, (i * 29) % 90, i % 4),
    );
    const a = declutter(labels);
    const b = declutter([...labels].reverse());
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });
});
