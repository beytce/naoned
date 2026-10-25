import { describe, expect, it } from "vitest";
import {
  type Modal,
  type Page,
  type Rect,
  type Target,
  bringOnce,
  isCovered,
  outOfSheet,
  unionBox,
} from "../src/game/coachSight.js";

const H = 844;

function rect(top: number, height: number, left = 20, width = 100): Rect {
  return { top, bottom: top + height, left, right: left + width, width, height };
}

/** A sheet from y = 80 to the foot of the screen, scrolled by `scrollTop`. */
function sheet(): Modal & { scrolls: number[]; holds: Set<unknown>; slides: boolean } {
  const holds = new Set<unknown>();
  const scrolls: number[] = [];
  return {
    holds,
    scrolls,
    slides: false,
    getAnimations() {
      return this.slides ? [{ playState: "running" }] : [];
    },
    scrollTop: 0,
    contains: (other) => holds.has(other),
    getBoundingClientRect: () => rect(80, H - 80, 0, 390),
    scrollTo({ top }) {
      scrolls.push(top);
      this.scrollTop = top;
    },
  };
}

/** A target at `top` in the page, inside `within` when given (its box moves with its scroll). */
function target(top: number, within?: ReturnType<typeof sheet>): Target {
  const el: Target = {
    contains: (other) => other === el,
    getBoundingClientRect: () => rect(top - (within?.scrollTop ?? 0), 44),
    closest: () => within ?? null,
  };
  within?.holds.add(el);
  return el;
}

function page(under: unknown, modals: Modal[] = []): Page {
  return {
    width: 390,
    height: H,
    at: () =>
      (under as never) ?? {
        contains: () => false,
        closest: () => null,
      },
    modals: () => modals,
  };
}

describe("the guide's ring", () => {
  it("is drawn on a target nothing lies over", () => {
    const bell = target(120);
    expect(isCovered(bell, bell.getBoundingClientRect(), page(bell))).toBe(false);
  });

  it("is never drawn on a target a window covers, even while it slides in and leaves it bare", () => {
    const bell = target(120);
    const rialto = sheet();
    // The sheet still below the bell: the bell is what lies under its centre.
    expect(isCovered(bell, bell.getBoundingClientRect(), page(bell, [rialto]))).toBe(true);
  });

  it("is drawn on a target inside the window open over the page", () => {
    const rialto = sheet();
    const row = target(400, rialto);
    expect(isCovered(row, row.getBoundingClientRect(), page(row, [rialto]))).toBe(false);
  });

  it("is never drawn on the map under a place open over it (the counter up close)", () => {
    const cart = target(400);
    const orbit = sheet();
    const p = { ...page(cart), places: () => [orbit] };
    expect(isCovered(cart, cart.getBoundingClientRect(), p)).toBe(true);
  });

  it("is drawn on a target in the place, and in a window opened over the place", () => {
    const orbit = sheet();
    const harvest = target(700, orbit);
    expect(
      isCovered(harvest, harvest.getBoundingClientRect(), {
        ...page(harvest),
        places: () => [orbit],
      }),
    ).toBe(false);
    const workshops = sheet();
    const produce = target(400, workshops);
    const p = { ...page(produce, [workshops]), places: () => [orbit] };
    expect(isCovered(produce, produce.getBoundingClientRect(), p)).toBe(false);
  });

  it("is not drawn on a target something else lies over", () => {
    const bell = target(120);
    const card = { contains: () => false, closest: () => null };
    expect(isCovered(bell, bell.getBoundingClientRect(), page(card))).toBe(true);
  });
});

describe("a target out of sight", () => {
  it("in a sheet: the sheet scrolled to it once a step, then left to the player", () => {
    const ledger = sheet();
    const reward = target(1200, ledger);
    const bring = bringOnce();
    bring("ledger>claim", reward, H);
    expect(ledger.scrolls).toHaveLength(1);
    expect(reward.getBoundingClientRect().top).toBeGreaterThan(80);
    expect(reward.getBoundingClientRect().bottom).toBeLessThan(H);
    // The player scrolls back up to read: the guide does not pull the sheet down again.
    ledger.scrollTop = 0;
    for (let i = 0; i < 8; i++) bring("ledger>claim", reward, H);
    expect(ledger.scrolls).toHaveLength(1);
    // A new step may bring its own target once.
    bring("ledger>claim-2", reward, H);
    expect(ledger.scrolls).toHaveLength(2);
  });

  it("in sight: nothing scrolls, and the step may still bring it later", () => {
    const ledger = sheet();
    const reward = target(400, ledger);
    const bring = bringOnce();
    bring("ledger>claim", reward, H);
    expect(ledger.scrolls).toHaveLength(0);
    ledger.scrollTop = 600;
    bring("ledger>claim", reward, H);
    expect(ledger.scrolls).toHaveLength(1);
  });

  it("in a sheet still sliding in: brought once it has settled, not before", () => {
    const workshops = sheet();
    const produce = target(1200, workshops);
    const bring = bringOnce();
    workshops.slides = true;
    bring("produce", produce, H);
    expect(workshops.scrolls).toHaveLength(0);
    workshops.slides = false;
    bring("produce", produce, H);
    expect(workshops.scrolls).toHaveLength(1);
    expect(outOfSheet(produce, H)).toBe(false);
  });

  it("scrolled past its sheet's top: out of sight, though on the screen", () => {
    const workshops = sheet();
    const produce = target(400, workshops);
    workshops.scrollTop = 360;
    expect(produce.getBoundingClientRect().top).toBeGreaterThan(0);
    expect(outOfSheet(produce, H)).toBe(true);
  });

  it("under its sheet's sticky head: out of sight, and brought below the head", () => {
    const tenders = sheet();
    // The head: the handle, the title and the cross, from y = 80 to 160.
    tenders.querySelector = () => ({ getBoundingClientRect: () => rect(80, 80, 0, 390) });
    const bid = target(500, tenders);
    tenders.scrollTop = 370;
    expect(bid.getBoundingClientRect().top).toBeGreaterThan(80);
    expect(outOfSheet(bid, H)).toBe(true);
    bringOnce()("bid", bid, H);
    // Centred in what the head leaves of the sheet: 160 to 844.
    expect(tenders.scrolls).toEqual([370 + (130 + 22) - (160 + H) / 2]);
  });

  it("on the map: nothing is scrolled, neither the page nor the map", () => {
    let scrolled = false;
    const city: Target & { scrollIntoView(): void } = {
      contains: () => false,
      getBoundingClientRect: () => rect(-60, 44),
      closest: () => null,
      scrollIntoView: () => {
        scrolled = true;
      },
    };
    const bring = bringOnce();
    for (let i = 0; i < 4; i++) bring("venezia", city, H);
    expect(scrolled).toBe(false);
  });
});

describe("the guide's ring", () => {
  it("holds the target and what goes with it", () => {
    const u = unionBox([rect(100, 60, 150, 60), rect(156, 16, 130, 100)]);
    expect(u).toEqual({ left: 130, top: 100, right: 230, bottom: 172, width: 100, height: 72 });
    expect(unionBox([])).toBeNull();
  });
});
