import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  atoutOffer,
  dailyFor,
  freeLeft,
  heirNames,
  letterView,
  parseSettings,
  specialtyEffects,
  traitEffects,
} from "../src/index.js";
import { testSettings } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Dynastie (R4 of the audit of 27 October 2026, docs/plan-rupture.md): each month a member of
 * the house, and an heir with one trait earned in the month. A trait is an option or a piece of
 * information, never yield: its effects are a short list, nothing else parses.
 */

const dynasty = {
  names: ["Marco", "Pietro", "Zuane", "Alvise", "Nicolò", "Andrea"],
  traits: {
    quais: { effects: { urgentPreviewMinutes: 15 } },
    rialto: { effects: { atoutChoices: 1 } },
    notaio: { effects: { freeDailyRerolls: 1 } },
    condottiere: { effects: { freeRespecs: 1 } },
    lettrato: { effects: { letterPreview: 1 } },
    citta: { effects: { signoriaRivals: 1 } },
  },
};

const world = (trait?: string, more: Partial<WorldSettingsInput> = {}) => {
  const w = new World(makeContext({ dynasty, ...more } as Partial<WorldSettingsInput>));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma", trait } as Command);
  return w;
};
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

describe("the Dynastie", () => {
  it("gives the heir its trait at joining, an unknown one dropped", () => {
    const w = world("quais");
    expect(w.state.players.a?.trait).toBe("quais");
    expect(traitEffects(w.ctx, w.state, "a").urgentPreviewMinutes).toBe(15);
    // Information only: the orders seen earlier, added to the mastery's and the Atouts'.
    expect(specialtyEffects(w.ctx, w.state, "a").urgentPreviewMinutes).toBe(15);
    const other = world("gold_mine");
    expect(other.state.players.a?.trait).toBeUndefined();
    expect(traitEffects(other.ctx, other.state, "a").urgentPreviewMinutes).toBe(0);
  });

  it("refuses a trait that would touch quantities, prices or time", () => {
    expect(() =>
      parseSettings({
        ...testSettings,
        dynasty: { names: ["Marco"], traits: { bad: { effects: { rawYieldBps: 500 } } } },
      } as never),
    ).toThrow();
  });

  it("draws three names for the heir, always the same for a merchant and a month", () => {
    const w = world();
    const names = heirNames(w.ctx, "a");
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    for (const n of names) expect(dynasty.names).toContain(n);
    expect(heirNames(w.ctx, "a")).toEqual(names);
  });

  it("offers one more Atout card to the one raised at the Rialto", () => {
    const atouts = {
      perWeek: 1,
      choices: 3,
      catalog: Object.fromEntries(
        ["a1", "a2", "a3", "a4", "a5"].map((c) => [
          c,
          { starter: true, effects: { taxDiscountBps: 100 } },
        ]),
      ),
    };
    const plain = world(undefined, { atouts } as never);
    expect(atoutOffer(plain.ctx, plain.state, "a", plain.now)).toHaveLength(3);
    const raised = world("rialto", { atouts } as never);
    expect(atoutOffer(raised.ctx, raised.state, "a", raised.now)).toHaveLength(4);
  });

  it("swaps a task of the day for free once a day, the notary's son only", () => {
    const daily = {
      perDay: 1,
      tasks: ["t1", "t2", "t3", "t4"].map((id) => ({
        id,
        event: "city_sale",
        count: 1,
        reward: { goods: { bread: 1 } },
      })),
      chest: { ducats: 1_000, perStreakDay: 100, maxStreak: 3 },
    };
    const w = world("notaio", { daily } as never);
    expect(freeLeft(w.ctx, w.state, "a", w.now).dailyRerolls).toBe(1);
    const task = () => dailyFor(w.ctx, w.state, "a", w.now).tasks[0]?.id ?? "";
    w.do({ type: "rerollDaily", playerId: "a", taskId: task(), free: true } as Command);
    expect(freeLeft(w.ctx, w.state, "a", w.now).dailyRerolls).toBe(0);
    expect(
      error(w.try({ type: "rerollDaily", playerId: "a", taskId: task(), free: true } as Command)),
    ).toBe("no_free_left");
    w.advance(DAY);
    expect(freeLeft(w.ctx, w.state, "a", w.now).dailyRerolls).toBe(1);
    const plain = world(undefined, { daily } as never);
    expect(
      error(
        plain.try({
          type: "rerollDaily",
          playerId: "a",
          taskId: dailyFor(plain.ctx, plain.state, "a", plain.now).tasks[0]?.id ?? "",
          free: true,
        } as Command),
      ),
    ).toBe("no_free_left");
  });

  it("changes the mastery for free once a season, the condottiere's son only", () => {
    const w = world("condottiere");
    const give = () => {
      const a = w.state.players.a;
      if (!a) throw new Error("no a");
      w.state = { ...w.state, players: { ...w.state.players, a: { ...a, specialty: "carter" } } };
    };
    give();
    expect(freeLeft(w.ctx, w.state, "a", w.now).respecs).toBe(1);
    w.do({ type: "resetSpecialty", playerId: "a", free: true } as Command);
    give();
    expect(error(w.try({ type: "resetSpecialty", playerId: "a", free: true } as Command))).toBe(
      "no_free_left",
    );
  });

  it("tells the man of letters who writes tomorrow", () => {
    const letters = {
      maxDucatsPerSeason: 100,
      episodes: [
        { id: "d0", sender: "lorenzo", day: 0, choices: [{ id: "x" }, { id: "y" }] },
        { id: "d1", sender: "faraj", day: 1, choices: [{ id: "x" }, { id: "y" }] },
      ],
    };
    const w = world("lettrato", { letters } as never);
    expect(letterView(w.ctx, w.state, "a", w.now)?.tomorrow).toBe("faraj");
    const plain = world(undefined, { letters } as never);
    expect(letterView(plain.ctx, plain.state, "a", plain.now)?.tomorrow).toBeNull();
  });

  it("does nothing without its settings", () => {
    const w = new World(makeContext());
    w.at(9 * HOUR).do({
      type: "join",
      playerId: "a",
      region: "terraferma",
      trait: "quais",
    } as Command);
    expect(w.state.players.a?.trait).toBeUndefined();
    expect(heirNames(w.ctx, "a")).toEqual([]);
  });
});
