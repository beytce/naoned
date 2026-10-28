import { describe, expect, it } from "vitest";
import { type Command, type WorldSettingsInput, letterOf } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Letter of the day (R10 of the audit of 27 October 2026, docs/plan-rupture.md): each day of
 * the season a letter from a recurring figure, with two choices; flags remember them, and some
 * consequences come days later. The gains are small and capped for the season.
 */

const letters = {
  maxDucatsPerSeason: 500,
  episodes: [
    {
      id: "faraj_loan",
      sender: "faraj",
      day: 0,
      choices: [
        {
          id: "lend",
          pay: { ducats: 100 },
          set: ["lent_faraj"],
          later: { id: "faraj_back", days: 3, gain: { ducats: 300 }, set: ["faraj_friend"] },
        },
        { id: "refuse", gain: { goods: { salt: 2 } } },
      ],
    },
    {
      id: "widow_friend",
      sender: "contarini",
      day: 1,
      needs: ["lent_faraj"],
      choices: [
        { id: "visit", gain: { ducats: 400 } },
        { id: "decline", set: ["proud"] },
      ],
    },
    {
      id: "widow",
      sender: "contarini",
      day: 1,
      choices: [
        { id: "visit", gain: { ducats: 50 } },
        { id: "decline", set: ["proud"] },
      ],
    },
    {
      id: "spy",
      sender: "spy",
      day: 2,
      without: ["proud"],
      choices: [
        { id: "listen", gain: { goods: { spices: 1 } } },
        { id: "report", set: ["loyal"] },
      ],
    },
    {
      id: "end_friend",
      sender: "lorenzo",
      last: true,
      needs: ["faraj_friend"],
      choices: [{ id: "toast", gain: { ducats: 100 } }, { id: "rest" }],
    },
    {
      id: "end",
      sender: "lorenzo",
      last: true,
      choices: [{ id: "toast" }, { id: "rest" }],
    },
  ],
};

const world = (more: Partial<WorldSettingsInput> = {}) => {
  const w = new World(makeContext({ letters, ...more } as Partial<WorldSettingsInput>));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  return w;
};
const answer = (w: World, choice: string) =>
  w.try({ type: "answerLetter", playerId: "a", choice } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const today = (w: World) => letterOf(w.ctx, w.state, "a", w.now);

describe("the Letter of the day", () => {
  it("gives the day's letter whose flags are met, then the next day's", () => {
    const w = world();
    expect(today(w)?.id).toBe("faraj_loan");
    expect(today(w)?.answered).toBeNull();
    w.advance(DAY);
    // Faraj was not helped: the widow's plain letter.
    expect(today(w)?.id).toBe("widow");
    w.advance(DAY);
    expect(today(w)?.id).toBe("spy");
    // Nothing written for the day: no letter.
    w.advance(DAY);
    expect(today(w)).toBeNull();
  });

  it("answers once a day, paying and giving through the ledger and the stock journal", () => {
    const w = world();
    const cash = w.cash("a");
    expect(error(answer(w, "elsewhere"))).toBe("unknown_choice");
    expect(error(answer(w, "lend"))).toBe("ok");
    expect(w.cash("a")).toBe(cash - 100n);
    expect(error(answer(w, "refuse"))).toBe("letter_answered");
    expect(today(w)?.answered).toBe("lend");
    // The flag opens the widow's other letter the next day.
    w.advance(DAY);
    expect(today(w)?.id).toBe("widow_friend");
    // The spy writes only to the merchant who is not proud.
    expect(error(answer(w, "decline"))).toBe("ok");
    w.advance(DAY);
    expect(today(w)).toBeNull();
    expect(error(answer(w, "listen"))).toBe("no_letter");
  });

  it("gives goods by the stock journal", () => {
    const w = world();
    const salt = w.stock("a", "salt").available;
    w.do({ type: "answerLetter", playerId: "a", choice: "refuse" } as Command);
    expect(w.stock("a", "salt").available).toBe(salt + 2);
  });

  it("brings a consequence days later, at the tick, and its flag", () => {
    const w = world();
    answer(w, "lend");
    const cash = w.cash("a");
    w.advance(2 * DAY).do({ type: "tick" });
    expect(w.cash("a")).toBe(cash);
    w.advance(DAY + HOUR);
    const res = w.do({ type: "tick" });
    expect(w.cash("a")).toBe(cash + 300n);
    expect(res.effects.events.some((e) => e.type === "letter_followup")).toBe(true);
    expect(w.state.letters?.a?.flags).toContain("faraj_friend");
    // Paid once only.
    w.advance(DAY).do({ type: "tick" });
    expect(w.cash("a")).toBe(cash + 300n);
  });

  it("keeps the season's gains under the cap", () => {
    const w = world();
    answer(w, "lend");
    w.advance(DAY);
    const cash = w.cash("a");
    answer(w, "visit");
    // 400 written, 400 left under the 500 of the season.
    expect(w.cash("a")).toBe(cash + 400n);
    w.advance(3 * DAY).do({ type: "tick" });
    // Faraj's 300 come back, but only 100 are left under the cap.
    expect(w.cash("a")).toBe(cash + 500n);
    expect(w.state.letters?.a?.minted).toBe(500n);
  });

  it("closes the season with the letter of the merchant's choices", () => {
    const w = world();
    answer(w, "lend");
    const last = 41 * DAY;
    w.at(last + 10 * HOUR).do({ type: "tick" });
    expect(today(w)?.id).toBe("end_friend");
    const other = world();
    other.at(last + 10 * HOUR);
    expect(today(other)?.id).toBe("end");
  });

  it("writes nothing without its settings", () => {
    const w = world({ letters: undefined } as never);
    expect(today(w)).toBeNull();
    expect(error(answer(w, "lend"))).toBe("letters_off");
  });
});
