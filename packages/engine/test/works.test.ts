import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  defenseOf,
  liveGlory,
  marchMinutes,
  worksAllowed,
} from "../src/index.js";
import { campaignSettings, testCampaign } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const noMilan = {
  campaign: { ...testCampaign, milan: { ...testCampaign.milan, base: 0, perActive: 0 } },
};

/** a of the Rossi (seat in the north), b of the Verdi (seat in the south), and more Rossi. */
function world(more: Partial<WorldSettingsInput> = {}, extra: string[] = []) {
  const w = new World(makeContext({ ...campaignSettings, ...more }));
  w.at(0);
  for (const id of ["a", "b", ...extra]) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
  w.do({ type: "joinFamily", playerId: "b", family: "verdi" });
  for (const id of extra) w.do({ type: "joinFamily", playerId: id, family: "rossi" });
  w.do({ type: "tick" });
  return w;
}

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const land = (w: World, code: string) => w.state.campaign?.lands[code];
const tickAt = (w: World, offset: number) => w.at(offset).do({ type: "tick" });
const build = (w: World, playerId: string, landCode: string, kind: string) =>
  w.try({ type: "buildWork", playerId, land: landCode, kind } as Command);
/** a takes the village next to its seat at 10 h (UTC), arriving at 10 h 20, with 5 left. */
function takeBorgo(w: World) {
  w.at(10 * HOUR);
  w.do({ type: "hireLances", playerId: "a", count: 10 });
  w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 5 });
  tickAt(w, 10 * HOUR + 20 * MIN);
}

describe("works", () => {
  it("are built by a member on a land the family holds, for ducats destroyed", () => {
    const w = world(noMilan);
    takeBorgo(w);
    const cash = w.cash("a");
    expect(error(build(w, "a", "campo", "tower"))).toBe("not_held");
    expect(error(build(w, "a", "nord", "tower"))).toBe("seat_untouchable");
    expect(error(build(w, "a", "borgo", "keep"))).toBe("unknown_work");
    expect(error(build(w, "b", "borgo", "tower"))).toBe("not_held");
    expect(error(build(w, "a", "borgo", "tower"))).toBe("ok");
    expect(w.cash("a")).toBe(cash - 500n);
    // An hour of works, in open hours.
    expect(land(w, "borgo")?.work).toEqual({
      kind: "tower",
      family: "rossi",
      by: "a",
      readyAt: w.now + HOUR,
    });
    expect(error(build(w, "a", "borgo", "toll"))).toBe("work_exists");
  });

  it("are finished in the morning when begun at night", () => {
    const w = world(noMilan);
    takeBorgo(w);
    // 21 h 30 in Paris: half an hour tonight, the other half from 8 h.
    w.at(20 * HOUR + 30 * MIN);
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "tower" } as Command);
    expect(land(w, "borgo")?.work?.readyAt).toBe(w.ctx.startAt + DAY + 7 * HOUR + 30 * MIN);
  });

  it("are so many per family, more as it has more active members", () => {
    const w = world(noMilan);
    expect(worksAllowed(w.ctx, w.state, "rossi", w.now)).toBe(1);
    takeBorgo(w);
    w.do({ type: "sendMarch", playerId: "a", land: "campo", lances: 5 });
    tickAt(w, 11 * HOUR);
    expect(land(w, "campo")?.holder).toBe("rossi");
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "tower" } as Command);
    expect(error(build(w, "a", "campo", "tower"))).toBe("too_many_works");
    const more = world(noMilan, ["c"]);
    expect(worksAllowed(more.ctx, more.state, "rossi", more.now)).toBe(2);
  });

  it("a tower counts the garrison more once finished", () => {
    const w = world();
    takeBorgo(w);
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "tower" } as Command);
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 5 });
    tickAt(w, 10 * HOUR + 50 * MIN);
    expect(defenseOf(w.ctx, w.state, "borgo", w.now)).toBe(6);
    expect(defenseOf(w.ctx, w.state, "borgo", w.ctx.startAt + 11 * HOUR + 20 * MIN)).toBe(12);
    // Milan rides at noon, Paris time, with 12 lances: the tower holds, its garrison spent.
    tickAt(w, 11 * HOUR + 30 * MIN);
    expect(land(w, "borgo")?.holder).toBe("rossi");
    expect(land(w, "borgo")?.stacks).toEqual([]);
  });

  it("a toll counts the land's glory more once finished", () => {
    const w = world(noMilan);
    takeBorgo(w);
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "toll" } as Command);
    // Held 10 h 40 to the close at 22 h in Paris, the toll counting from 11 h 20 (UTC).
    tickAt(w, 23 * HOUR);
    expect(liveGlory(w.ctx, w.state, w.now)).toEqual({ rossi: 20, verdi: 0 });
  });

  it("a camp sends the family's marches from nearer than the seat", () => {
    const w = world(noMilan);
    takeBorgo(w);
    expect(marchMinutes(w.ctx, "rossi", "colle", w.state, w.now)).toBe(30);
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "camp" } as Command);
    expect(marchMinutes(w.ctx, "rossi", "colle", w.state, w.now)).toBe(30);
    w.at(11 * HOUR + 30 * MIN);
    expect(marchMinutes(w.ctx, "rossi", "colle", w.state, w.now)).toBe(20);
    w.do({ type: "sendMarch", playerId: "a", land: "colle", lances: 1 });
    const march = Object.values(w.state.campaign?.marches ?? {})[0];
    expect(march?.from).toBe("borgo");
    expect((march?.arriveAt ?? 0) - w.now).toBe(20 * MIN);
  });

  it("are razed when the land is taken, the assailants earning merit", () => {
    const w = world(noMilan);
    takeBorgo(w);
    // The Verdi take Padova (a city: 6 lances worth one and a half) and build a tower there.
    w.do({ type: "hireLances", playerId: "b", count: 10 });
    w.do({ type: "sendMarch", playerId: "b", land: "padova", lances: 10 });
    tickAt(w, 11 * HOUR);
    expect(land(w, "padova")?.holder).toBe("verdi");
    w.do({ type: "buildWork", playerId: "b", land: "padova", kind: "tower" } as Command);
    // The next day the Rossi take the hill, then Padova: 1 lance × 1.5 × 2 = 3 to beat.
    w.at(DAY + 10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 10 });
    w.do({ type: "sendMarch", playerId: "a", land: "colle", lances: 7 });
    tickAt(w, DAY + 11 * HOUR);
    expect(land(w, "colle")?.holder).toBe("rossi");
    const before = w.state.campaign?.merit.a?.battle ?? 0;
    w.do({ type: "sendMarch", playerId: "a", land: "padova", lances: 4 });
    const res = w.at(DAY + 12 * HOUR).do({ type: "tick" });
    expect(land(w, "padova")?.holder).toBe("rossi");
    expect(land(w, "padova")?.work).toBeUndefined();
    expect(w.state.campaign?.merit.a?.battle).toBe(before + 4 + 3);
    expect(res.effects.events.find((e) => e.type === "work_razed")?.playerId).toBe("b");
  });

  it("are gone when the map opens again", () => {
    const w = world(noMilan);
    takeBorgo(w);
    w.do({ type: "buildWork", playerId: "a", land: "borgo", kind: "tower" } as Command);
    tickAt(w, 7 * DAY + HOUR);
    expect(land(w, "borgo")?.work).toBeUndefined();
  });
});
