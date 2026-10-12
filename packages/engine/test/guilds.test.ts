import { describe, expect, it } from "vitest";
import {
  SINK_ACCOUNT,
  type WorldSettingsInput,
  caratValue,
  guildAccount,
  guildOf,
  netWorth,
  seasonEnd,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const rules: NonNullable<WorldSettingsInput["guilds"]> = {
  openDay: 1,
  foundingCost: 5_000,
  minStake: 2_000,
  caratValue: 100,
  maxMembers: 3,
  exitFeeBps: 2_000,
  maxVoteBps: 4_000,
  voteHours: 24,
  maxTollBps: 800,
  maxBountyPerUnit: 50,
};

function world(...ids: string[]) {
  const w = new World(makeContext({ guilds: rules }));
  for (const id of ids) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.at(DAY);
  return w;
}

const cash = (w: World, id: string) => w.state.accounts[`cash:${id}`] ?? 0n;

/** Founds "Leone" with a, then b and c join; carats 60 / 20 / 20. */
function leone() {
  const w = world("a", "b", "c");
  w.do({ type: "foundGuild", playerId: "a", name: "Leone", emblem: "lion", stake: 6_000 });
  const id = guildOf(w.state, "a")?.id ?? "";
  w.do({ type: "joinGuild", playerId: "b", guildId: id, stake: 2_000 });
  w.do({ type: "joinGuild", playerId: "c", guildId: id, stake: 2_000 });
  return { w, id };
}

describe("guilds", () => {
  it("are off without members allowed", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(2 * DAY);
    const r = w.try({
      type: "foundGuild",
      playerId: "a",
      name: "X",
      emblem: "lion",
      stake: 10_000,
    });
    expect(r.ok ? null : r.error).toBe("guilds_off");
  });

  it("are founded after the opening day, the fee destroyed and the stake in the treasury", () => {
    const w = new World(makeContext({ guilds: rules }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const early = w.try({
      type: "foundGuild",
      playerId: "a",
      name: "Leone",
      emblem: "lion",
      stake: 10_000,
    });
    expect(early.ok ? null : early.error).toBe("guild_locked");
    w.at(DAY);
    const before = cash(w, "a");
    const sinkBefore = w.state.accounts[SINK_ACCOUNT] ?? 0n;
    const small = w.try({
      type: "foundGuild",
      playerId: "a",
      name: "Leone",
      emblem: "lion",
      stake: 1_999,
    });
    expect(small.ok ? null : small.error).toBe("stake_too_small");
    w.do({ type: "foundGuild", playerId: "a", name: "Leone", emblem: "lion", stake: 10_000 });
    const g = guildOf(w.state, "a");
    expect(g?.name).toBe("Leone");
    expect(g?.members.a?.carats).toBe(100);
    expect(cash(w, "a")).toBe(before - 15_000n);
    expect((w.state.accounts[SINK_ACCOUNT] ?? 0n) - sinkBefore).toBe(5_000n);
    expect(w.state.accounts[guildAccount(g?.id ?? "")]).toBe(10_000n);
    const again = w.try({
      type: "foundGuild",
      playerId: "a",
      name: "Other",
      emblem: "lion",
      stake: 10_000,
    });
    expect(again.ok ? null : again.error).toBe("guild_member");
  });

  it("refuse a name already taken, and a full guild", () => {
    const { w, id } = leone();
    w.do({ type: "join", playerId: "d", region: "lagoon" });
    w.advance(DAY);
    const taken = w.try({
      type: "foundGuild",
      playerId: "d",
      name: "leone",
      emblem: "lion",
      stake: 10_000,
    });
    expect(taken.ok ? null : taken.error).toBe("guild_name_taken");
    const full = w.try({ type: "joinGuild", playerId: "d", guildId: id, stake: 10_000 });
    expect(full.ok ? null : full.error).toBe("guild_full");
  });

  it("issue carats at the treasury's value: investing does not change one's worth", () => {
    const { w, id } = leone();
    const g = guildOf(w.state, "a");
    expect(g?.members.b?.carats).toBe(20);
    expect(caratValue(w.state, id, 20)).toBe(2_000n);
    const worth = netWorth(w.ctx, w.state, "b", w.now).total;
    w.do({ type: "investGuild", playerId: "b", amount: 3_000 });
    expect(guildOf(w.state, "b")?.members.b?.carats).toBe(50);
    expect(netWorth(w.ctx, w.state, "b", w.now).total).toBe(worth);
  });

  it("refund a leaver four fifths of their carats' value; the rest stays with the guild", () => {
    const { w, id } = leone();
    const before = cash(w, "c");
    w.do({ type: "leaveGuild", playerId: "c" });
    expect(cash(w, "c") - before).toBe(1_600n);
    expect(guildOf(w.state, "c")).toBeNull();
    // The 400 left behind raise the others' carats.
    expect(w.state.accounts[guildAccount(id)]).toBe(8_400n);
    expect(caratValue(w.state, id, 80)).toBe(8_400n);
  });

  it("dissolve when the last member leaves, who takes everything back", () => {
    const w = world("a");
    w.do({ type: "foundGuild", playerId: "a", name: "Leone", emblem: "lion", stake: 10_000 });
    const id = guildOf(w.state, "a")?.id ?? "";
    const before = cash(w, "a");
    w.do({ type: "leaveGuild", playerId: "a" });
    expect(cash(w, "a") - before).toBe(10_000n);
    expect(w.state.guilds?.guilds[id]).toBeUndefined();
  });

  it("decide by carats, no member weighing more than the cap", () => {
    const { w } = leone();
    w.do({ type: "propose", playerId: "a", proposal: { kind: "toll", value: 500 } });
    const p = Object.values(w.state.guilds?.proposals ?? {})[0];
    expect(p?.status).toBe("open");
    // a holds 60 % of the carats but weighs 40 % at most: not a majority alone.
    w.do({ type: "vote", playerId: "a", proposalId: p?.id ?? "", yes: true });
    expect(w.state.guilds?.proposals[p?.id ?? ""]?.status).toBe("open");
    w.do({ type: "vote", playerId: "b", proposalId: p?.id ?? "", yes: true });
    expect(w.state.guilds?.proposals[p?.id ?? ""]?.status).toBe("passed");
    expect(guildOf(w.state, "a")?.tollBps).toBe(500);
    const late = w.try({ type: "vote", playerId: "c", proposalId: p?.id ?? "", yes: false });
    expect(late.ok ? null : late.error).toBe("proposal_closed");
  });

  it("settle at the end of the vote: more yes than no among the votes cast", () => {
    const { w } = leone();
    w.do({ type: "propose", playerId: "b", proposal: { kind: "dividend", value: 5_000 } });
    const id = Object.keys(w.state.guilds?.proposals ?? {})[0] ?? "";
    w.do({ type: "vote", playerId: "b", proposalId: id, yes: true });
    w.advance(25 * HOUR);
    w.do({ type: "tick" });
    expect(w.state.guilds?.proposals[id]?.status).toBe("passed");
    expect(guildOf(w.state, "a")?.dividendBps).toBe(5_000);
    // A refused proposal changes nothing.
    w.do({ type: "propose", playerId: "b", proposal: { kind: "toll", value: 800 } });
    const id2 = Object.keys(w.state.guilds?.proposals ?? {}).find((k) => k !== id) ?? "";
    w.do({ type: "vote", playerId: "a", proposalId: id2, yes: false });
    w.advance(25 * HOUR);
    w.do({ type: "tick" });
    expect(w.state.guilds?.proposals[id2]?.status).toBe("rejected");
    expect(guildOf(w.state, "a")?.tollBps).toBe(0);
  });

  it("keep proposals within bounds, and to members", () => {
    const { w } = leone();
    const high = w.try({ type: "propose", playerId: "a", proposal: { kind: "toll", value: 900 } });
    expect(high.ok ? null : high.error).toBe("invalid_proposal");
    w.do({ type: "join", playerId: "z", region: "lagoon" });
    const out = w.try({ type: "propose", playerId: "z", proposal: { kind: "toll", value: 100 } });
    expect(out.ok ? null : out.error).toBe("no_guild");
  });

  it("exclude a member by vote, who is paid the full value of their carats", () => {
    const { w } = leone();
    w.do({ type: "propose", playerId: "a", proposal: { kind: "exclude", target: "c" } });
    const id = Object.keys(w.state.guilds?.proposals ?? {})[0] ?? "";
    const before = cash(w, "c");
    w.do({ type: "vote", playerId: "a", proposalId: id, yes: true });
    w.do({ type: "vote", playerId: "b", proposalId: id, yes: true });
    expect(guildOf(w.state, "c")).toBeNull();
    expect(cash(w, "c") - before).toBe(2_000n);
  });

  it("close to newcomers by vote", () => {
    const { w, id } = leone();
    w.do({ type: "leaveGuild", playerId: "c" });
    w.do({ type: "propose", playerId: "a", proposal: { kind: "open", value: 0 } });
    const pid = Object.keys(w.state.guilds?.proposals ?? {})[0] ?? "";
    // Two members left: a's 60 carats weigh 32 (40 % of 80), a majority of 52 on their own.
    w.do({ type: "vote", playerId: "a", proposalId: pid, yes: true });
    expect(w.state.guilds?.proposals[pid]?.status).toBe("passed");
    const r = w.try({ type: "joinGuild", playerId: "c", guildId: id, stake: 10_000 });
    expect(r.ok ? null : r.error).toBe("guild_closed");
  });

  it("share out the treasury by carats when the season ends", () => {
    const { w, id } = leone();
    w.now = seasonEnd(w.ctx) + HOUR;
    const res = w.do({ type: "tick" });
    const paid = (id: string) =>
      res.ok
        ? res.effects.ledger
            .filter((e) => e.reason === "guild_payout" && e.to === `cash:${id}`)
            .reduce((n, e) => n + e.amount, 0n)
        : 0n;
    expect(paid("a")).toBe(6_000n);
    expect(paid("b")).toBe(2_000n);
    expect(w.state.accounts[guildAccount(id)] ?? 0n).toBe(0n);
    expect(guildOf(w.state, "a")?.members.a?.carats).toBe(0);
  });
});
