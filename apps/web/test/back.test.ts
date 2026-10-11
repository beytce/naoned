import { beforeAll, describe, expect, it } from "vitest";

/** A history with just what the back button module touches. */
function fakeWindow() {
  const listeners: (() => void)[] = [];
  const entries: unknown[] = [null];
  let at = 0;
  const pop = () => {
    for (const l of listeners) l();
  };
  const history = {
    scrollRestoration: "auto",
    get state() {
      return entries[at];
    },
    get length() {
      return entries.length;
    },
    pushState(state: unknown) {
      entries.splice(at + 1, entries.length, state);
      at++;
    },
    back() {
      if (at === 0) {
        left = true;
        return;
      }
      at--;
      pop();
    },
  };
  let left = false;
  return {
    window: { history, addEventListener: (_: string, l: () => void) => listeners.push(l) },
    left: () => left,
    depth: () => at,
  };
}

const fake = fakeWindow();
let onBack: typeof import("../src/game/back.js").onBack;

beforeAll(async () => {
  (globalThis as { window?: unknown }).window = fake.window;
  ({ onBack } = await import("../src/game/back.js"));
});

describe("back button", () => {
  it("closes the newest window first, then the older one, then leaves", () => {
    const closed: string[] = [];
    let sectionOpen = true;
    const stopSection = onBack(() => {
      if (!sectionOpen) return false;
      sectionOpen = false;
      closed.push("section");
      return true;
    });
    const stopSheet = onBack(() => {
      closed.push("sheet");
      stopSheet();
      return true;
    });
    expect(fake.depth()).toBe(1);
    expect(fake.window.history.scrollRestoration).toBe("manual");

    fake.window.history.back();
    expect(closed).toEqual(["sheet"]);
    expect(fake.depth()).toBe(1); // Re-armed: the next press is still caught.

    fake.window.history.back();
    expect(closed).toEqual(["sheet", "section"]);

    fake.window.history.back();
    expect(fake.left()).toBe(true);
    stopSection();
  });

  it("pushes a single spare entry however many windows open", () => {
    const stops = [onBack(() => true), onBack(() => true), onBack(() => true)];
    expect(fake.depth()).toBeLessThanOrEqual(1);
    for (const stop of stops) stop();
  });
});
