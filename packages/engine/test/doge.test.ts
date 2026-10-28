import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  calmiereCap,
  decreeTaxBps,
  dogeTally,
  electionOpen,
  favourBps,
  levantQuotaBps,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Doge (R7 of the audit of 27 October 2026, docs/plan-rupture.md): the month's last week, the
 * Senate elects the Doge of the next month among the first houses of the people. Each candidate
 * stands with a public programme (a mutator, a decree of the Republic); each merchant votes,
 * weighed by its cities. The decree then holds all the next month, for everyone.
 */

const mutators = {
  from: "2026-01",
  catalog: [
    { code: "gel", weight: 1, override: { cityPriceBps: { bread: 12_000 } } },
    { code: "milan", weight: 1, override: { milanTroopsBps: 15_000 } },
  ],
};
const doge = {
  candidates: 2,
  electionDays: 7,
  minDays: 3,
  maxBoost: 3,
  decrees: ["faveur", "franchigia", "levante", "calmiere"],
  effects: {
    faveur: { premiumBps: 1_000 },
    franchigia: { taxCutBps: 100 },
    levante: { quotaBps: 2_000 },
    calmiere: { capBps: 11_000 },
  },
};
const OPEN = 35 * DAY + HOUR;
const END = 42 * DAY;

const world = (more: Record<string, unknown> = {}) => {
  const w = new World(
    makeContext({ mutators, doge: { ...doge, ...more } } as Partial<WorldSettingsInput>),
  );
  w.at(9 * HOUR);
  for (const id of ["a", "b", "c"]) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "join", playerId: "npc", region: "terraferma", npc: true } as Command);
  return w;
};
const stand = (w: World, id: string, decree = { code: "franchigia" }, mutator = "gel") =>
  w.try({ type: "standForDoge", playerId: id, mutator, decree } as Command);
const vote = (w: World, id: string, candidate: string, boost = 0) =>
  w.try({ type: "voteDoge", playerId: id, candidate, influenceBoost: boost } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

describe("the election of the Doge", () => {
  it("opens the month's last week with the first houses of the people as candidates", () => {
    const w = world();
    expect(electionOpen(w.ctx, w.now)).toBe(false);
    expect(error(stand(w, "a"))).toBe("election_closed");
    w.at(OPEN).do({ type: "tick" });
    expect(electionOpen(w.ctx, w.now)).toBe(true);
    // Equal sales: by id, the house of the computer never a candidate.
    expect(w.state.election?.candidates).toEqual(["a", "b"]);
    // The outgoing Doge may not stand again (contumacia).
    const again = world({ previous: "a" });
    again.at(OPEN).do({ type: "tick" });
    expect(again.state.election?.candidates).toEqual(["b", "c"]);
  });

  it("takes a programme from a candidate only, from the catalogs only", () => {
    const w = world();
    w.at(OPEN).do({ type: "tick" });
    expect(error(stand(w, "c"))).toBe("not_candidate");
    expect(error(stand(w, "a", { code: "franchigia" }, "plague"))).toBe("unknown_mutator");
    expect(error(stand(w, "a", { code: "gabelle" }))).toBe("unknown_decree");
    expect(error(stand(w, "a", { code: "faveur" }))).toBe("unknown_decree");
    expect(error(stand(w, "a", { code: "faveur", target: "venezia" } as never))).toBe("ok");
    expect(w.state.election?.programmes.a).toEqual({
      mutator: "gel",
      decree: { code: "faveur", target: "venezia" },
    });
  });

  it("counts one voice a merchant, more for a Podestà and some Influence, changed at will", () => {
    const w = world();
    w.at(OPEN).do({ type: "tick" });
    expect(error(vote(w, "c", "a"))).toBe("no_programme");
    stand(w, "a");
    stand(w, "b", { code: "levante" }, "milan");
    expect(error(vote(w, "npc", "a"))).toBe("cannot_vote");
    expect(error(vote(w, "c", "c"))).toBe("not_candidate");
    // c is the Podestà of Venice: two voices, and three of Influence (capped).
    w.state = {
      ...w.state,
      signoria: {
        ...(w.state.signoria ?? { points: {}, podesta: {}, day: 0 }),
        podesta: { venezia: { playerId: "c", since: 0 } },
      } as never,
    };
    expect(error(vote(w, "c", "b", 9))).toBe("ok");
    expect(w.state.election?.votes.c).toEqual({ candidate: "b", weight: 5, boost: 3 });
    expect(error(vote(w, "a", "a"))).toBe("ok");
    expect(dogeTally(w.state)).toEqual([
      { playerId: "b", votes: 5 },
      { playerId: "a", votes: 1 },
    ]);
    // A change of mind keeps the Influence already given.
    vote(w, "c", "a");
    expect(w.state.election?.votes.c).toEqual({ candidate: "a", weight: 5, boost: 3 });
    expect(dogeTally(w.state)[0]).toEqual({ playerId: "a", votes: 6 });
  });

  it("refuses the voice of a merchant come too late in the month", () => {
    const w = world({ minDays: 40 });
    w.at(OPEN).do({ type: "tick" });
    stand(w, "a");
    expect(error(vote(w, "c", "a"))).toBe("too_new");
  });

  it("elects the leader at the month's close, the better ranked on a tie", () => {
    const w = world();
    w.at(OPEN).do({ type: "tick" });
    stand(w, "a");
    stand(w, "b", { code: "levante" }, "milan");
    vote(w, "c", "b");
    vote(w, "a", "a");
    const res = w.at(END + HOUR).do({ type: "tick" });
    const elected = res.effects.events.find((e) => e.type === "doge_elected");
    expect(elected?.playerId).toBe("a");
    expect(elected?.data).toMatchObject({ mutator: "gel", decree: { code: "franchigia" } });
    expect(res.effects.events.some((e) => e.type === "season_closed")).toBe(true);
  });

  it("elects nobody without a programme", () => {
    const w = world();
    w.at(OPEN).do({ type: "tick" });
    const res = w.at(END + HOUR).do({ type: "tick" });
    expect(res.effects.events.some((e) => e.type === "doge_elected")).toBe(false);
  });
});

describe("the Doge's decree of the month", () => {
  const ruled = (decree: { code: string; target?: string }) => {
    const w = new World(makeContext({ doge: { ...doge, decree } } as Partial<WorldSettingsInput>));
    w.at(9 * HOUR).do({ type: "join", playerId: "a", region: "terraferma" });
    return w;
  };

  it("holds for everyone, all month", () => {
    const tax = ruled({ code: "franchigia" });
    expect(decreeTaxBps(tax.ctx, tax.state, "a", 300, tax.now)).toBe(200);
    const fav = ruled({ code: "faveur", target: "venezia" });
    expect(favourBps(fav.ctx, fav.state, "a", "venezia", fav.now)).toBe(1_000);
    expect(favourBps(fav.ctx, fav.state, "a", "padova", fav.now)).toBe(0);
    const lev = ruled({ code: "levante" });
    expect(levantQuotaBps(lev.ctx, lev.state, "a", lev.now)).toBe(2_000);
    const cal = ruled({ code: "calmiere", target: "bread" });
    const ref = cal.ctx.settings.referencePrices.bread ?? 0n;
    expect(calmiereCap(cal.ctx, cal.state, "bread", cal.now)).toBe((ref * 11_000n) / 10_000n);
    const none = new World(makeContext());
    expect(decreeTaxBps(none.ctx, none.state, "a", 300, none.now)).toBe(300);
  });
});
