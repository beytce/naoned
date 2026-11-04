import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ChoiceCard,
  CompareRows,
  CostChips,
  StepRail,
  compareTone,
  costChips,
  siblingOf,
  stepStates,
} from "../src/dock.js";

// The dock (docs/plan-dock.md, design of 4 November 2026): one scene, one dock, one decision.

describe("the neighbours at a gesture", () => {
  const ids = ["a", "b", "c"];
  it("go to the next and the previous, round the ring", () => {
    expect(siblingOf(ids, "a", 1)).toBe("b");
    expect(siblingOf(ids, "c", 1)).toBe("a");
    expect(siblingOf(ids, "a", -1)).toBe("c");
  });
  it("stay put alone, or start at the first when lost", () => {
    expect(siblingOf(["a"], "a", 1)).toBe("a");
    expect(siblingOf(ids, "z", 1)).toBe("a");
    expect(siblingOf([], "z", 1)).toBeNull();
  });
});

describe("the cost in chips « have / need »", () => {
  it("tells the ducats, each good and the time, what lacks in cinnabar", () => {
    const chips = costChips({
      cash: "250000",
      cost: "240000",
      materials: { bricks: 40, planks: 30 },
      stock: { bricks: 40, planks: 12 },
      minutes: 45,
    });
    expect(chips).toEqual([
      { kind: "ducats", need: "240000", ok: true },
      { kind: "good", code: "bricks", have: 40, need: 40, ok: true },
      { kind: "good", code: "planks", have: 12, need: 30, ok: false },
      { kind: "time", minutes: 45, ok: true },
    ]);
  });
  it("say when the purse falls short, and never count more than needed", () => {
    const [ducats, good] = costChips({
      cash: "100",
      cost: "200",
      materials: { clay: 5 },
      stock: { clay: 9 },
    });
    expect(ducats?.ok).toBe(false);
    expect(good).toMatchObject({ have: 5, need: 5, ok: true });
  });
  it("are drawn, the lacking one marked", () => {
    const html = renderToStaticMarkup(
      <CostChips
        chips={costChips({ cash: "0", cost: "100", materials: {}, stock: {} })}
        goodName={(c) => c}
      />,
    );
    expect(html).toContain("data-cost-chip");
    expect(html).toContain('data-lacking=""');
  });
});

describe("before → after", () => {
  it("is lagoon when it gains, cinnabar when it loses", () => {
    expect(compareTone(8, 11)).toBe("better");
    expect(compareTone(180, 90)).toBe("worse");
    expect(compareTone(3, 3)).toBe("same");
    expect(compareTone(180, 90, true)).toBe("better");
  });
  it("draws its rows", () => {
    const html = renderToStaticMarkup(
      <CompareRows rows={[{ label: "Production", before: 8, after: 11, unit: "/h" }]} />,
    );
    expect(html).toContain("Production");
    expect(html).toContain("text-lagoon");
  });
});

describe("the steps", () => {
  it("are done, now or next", () => {
    expect(stepStates(1, 3)).toEqual(["done", "now", "next"]);
    expect(stepStates(0, 2)).toEqual(["now", "next"]);
  });
  it("lead back to a step done, never ahead", () => {
    const html = renderToStaticMarkup(
      <StepRail steps={["Équipage", "Palier", "Partir"]} current={1} onStep={() => {}} />,
    );
    expect(html).toContain('aria-current="step"');
    // The step to come is not a button.
    expect(html.match(/<button/g)?.length).toBe(1);
  });
});

describe("a choice", () => {
  it("is a pressed card, and a locked one says why", () => {
    const on = renderToStaticMarkup(
      <ChoiceCard selected onClick={() => {}}>
        Mule
      </ChoiceCard>,
    );
    expect(on).toContain('aria-pressed="true"');
    const locked = renderToStaticMarkup(
      <ChoiceCard locked="Casa 11" onClick={() => {}}>
        Chariot
      </ChoiceCard>,
    );
    expect(locked).toContain("disabled");
    expect(locked).toContain("Casa 11");
  });
});
