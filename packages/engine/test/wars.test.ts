import { describe, expect, it } from "vitest";
import {
  type Command,
  type Delivery,
  type DeliveryOrder,
  type WorldSettingsInput,
  activeWarOn,
  concessionHolder,
  deliveryOrdersFor,
  guildAccount,
  guildOf,
} from "../src/index.js";
import { deliverySettings, testBandits, testDeliveries } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const guilds: WorldSettingsInput["guilds"] = {
  openDay: 0,
  foundingCost: 0,
  minStake: 1_000,
  caratValue: 100,
  maxMembers: 5,
  exitFeeBps: 0,
  maxVoteBps: 4_000,
  voteHours: 24,
  maxTollBps: 800,
  maxBountyPerUnit: 50,
};

const concessions: WorldSettingsInput["concessions"] = [
  { code: "padova-bread", city: "padova", resource: "bread" },
  { code: "venezia-bricks", city: "venezia", resource: "bricks" },
];

const wars: WorldSettingsInput["wars"] = {
  hours: 48,
  stake: 5_000,
  defenderBonusBps: 2_000,
  protectHours: 72,
  seigneurieUnitsPerActive: 4,
  memberPremiumBps: 1_000,
  ordersPerActiveBps: 20_000,
};

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(
    makeContext({
      ...deliverySettings,
      // The world's board, which a war fills with orders of its good.
      deliveries: { ...testDeliveries, sharedOrdersPerActivePlayer: 4 },
      guilds,
      concessions,
      wars,
      ...more,
    } as never),
  );
  w.at(9 * HOUR);
  for (const id of ["a", "b", "c", "d", "e"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 400).give(id, "bricks", 100);
  }
  w.do({ type: "foundGuild", playerId: "a", name: "Leone", emblem: "lion", stake: 10_000 });
  w.do({ type: "joinGuild", playerId: "b", guildId: gid(w, "a"), stake: 10_000 });
  w.do({ type: "foundGuild", playerId: "c", name: "Stella", emblem: "star", stake: 10_000 });
  w.do({ type: "joinGuild", playerId: "d", guildId: gid(w, "c"), stake: 10_000 });
  w.do({ type: "tick" });
  return w;
}

const gid = (w: World, playerId: string) => guildOf(w.state, playerId)?.id ?? "";
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const day = (w: World) => Math.floor((w.now - w.ctx.startAt) / DAY);
const cart = (w: World, playerId: string) =>
  Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === playerId && v.busyUntil <= w.now)
    ?.id ?? "";

function orderTo(w: World, playerId: string, city: string, resource: string): DeliveryOrder {
  // An order of the board still open; otherwise the next day's board.
  for (let tries = 0; tries < 10; tries++) {
    w.do({ type: "tick" });
    const o = deliveryOrdersFor(w.ctx, w.state, playerId, day(w)).find(
      (x) =>
        x.city === city &&
        x.resource === resource &&
        x.kind !== "urgent" &&
        !x.takenBy &&
        w.now >= x.opensAt &&
        !(w.state.deliveriesDone?.[playerId]?.ids ?? []).includes(x.id),
    );
    if (o) return o;
    w.now = w.ctx.startAt + (day(w) + 1) * DAY + 9 * HOUR;
  }
  throw new Error(`no order of ${resource} to ${city} for ${playerId}`);
}

/** Sends the merchant's next order of bread to Padua and lets it arrive. */
function deliver(w: World, playerId: string): Delivery {
  const o = orderTo(w, playerId, "padova", "bread");
  w.do({
    type: "dispatchDelivery",
    playerId,
    orderId: o.id,
    vehicleId: cart(w, playerId),
    escort: "none",
  } as Command);
  const d = Object.values(w.state.deliveries ?? {}).at(-1) as Delivery;
  const back = w.now;
  w.now = d.arriveAt;
  w.do({ type: "tick" });
  const done = w.state.deliveries?.[d.id] as Delivery;
  w.now = Math.max(back, done.backAt);
  return done;
}

/** Proposes and carries a war of `who`'s guild on a concession (both members vote yes). */
function declare(w: World, who: string, mate: string, target = "padova-bread") {
  w.do({ type: "propose", playerId: who, proposal: { kind: "war", target } });
  const p = Object.values(w.state.guilds?.proposals ?? {}).at(-1);
  w.do({ type: "vote", playerId: who, proposalId: p?.id ?? "", yes: true });
  w.do({ type: "vote", playerId: mate, proposalId: p?.id ?? "", yes: true });
  return Object.values(w.state.wars ?? {}).at(-1);
}

/** Stella takes Padua's bread from the Seigneurie. */
function stellaHolds(w: World) {
  const war = declare(w, "c", "d");
  for (let i = 0; i < 3; i++) deliver(w, "c");
  w.now = (war?.endAt ?? 0) + 1;
  w.do({ type: "tick" });
}

describe("concessions and trade wars", () => {
  it("start with the Seigneurie, which holds every concession", () => {
    const w = world();
    expect(concessionHolder(w.state, "padova-bread")).toBeNull();
  });

  it("are declared by a guild's vote, the war chest leaving its treasury", () => {
    const w = world();
    const before = w.state.accounts[guildAccount(gid(w, "a"))] ?? 0n;
    const war = declare(w, "a", "b");
    expect(war?.attacker).toBe(gid(w, "a"));
    expect(war?.defender).toBeNull();
    expect(war?.endAt).toBe(w.now + 48 * HOUR);
    // Against the Seigneurie: a threshold of units per active merchant.
    expect(war?.threshold).toBe(20);
    expect(before - (w.state.accounts[guildAccount(gid(w, "a"))] ?? 0n)).toBe(5_000n);
    expect(activeWarOn(w.state, "padova", "bread", w.now)?.id).toBe(war?.id);
  });

  it("are refused on an unknown concession, twice at once, or without the war chest", () => {
    const w = world();
    const unknown = w.try({
      type: "propose",
      playerId: "a",
      proposal: { kind: "war", target: "roma-wine" },
    });
    expect(error(unknown)).toBe("unknown_concession");
    declare(w, "a", "b");
    const again = w.try({
      type: "propose",
      playerId: "a",
      proposal: { kind: "war", target: "venezia-bricks" },
    });
    expect(error(again)).toBe("guild_at_war");
    const same = w.try({
      type: "propose",
      playerId: "c",
      proposal: { kind: "war", target: "padova-bread" },
    });
    expect(error(same)).toBe("war_under_way");
  });

  it("go to the attacker who delivers more than the Seigneurie's threshold", () => {
    const w = world();
    stellaHolds(w);
    expect(concessionHolder(w.state, "padova-bread")).toBe(gid(w, "c"));
    const war = Object.values(w.state.wars ?? {})[0];
    expect(war?.outcome).toBe("attacker");
    expect(war?.score.attacker).toBeGreaterThan(20);
    // Protected for a while after the war.
    const early = w.try({
      type: "propose",
      playerId: "a",
      proposal: { kind: "war", target: "padova-bread" },
    });
    expect(error(early)).toBe("concession_protected");
  });

  it("count the defender's units a fifth more, and keep the concession if it holds", () => {
    const w = world();
    stellaHolds(w);
    w.now += 73 * HOUR;
    const war = declare(w, "a", "b");
    expect(war?.defender).toBe(gid(w, "c"));
    const da = deliver(w, "a");
    const dc = deliver(w, "c");
    const now = w.state.wars?.[war?.id ?? ""];
    expect(now?.score.attacker).toBe(da.loaded);
    expect(now?.score.defender).toBe(Math.floor(dc.loaded * 1.2));
    w.now = (war?.endAt ?? 0) + 1;
    w.do({ type: "tick" });
    const end = w.state.wars?.[war?.id ?? ""];
    expect(end?.outcome).toBe(
      (end?.score.attacker ?? 0) > (end?.score.defender ?? 0) ? "attacker" : "defender",
    );
  });

  it("levy the holder's toll on others' deliveries, and pay its members a premium", () => {
    const w = world();
    stellaHolds(w);
    w.do({ type: "propose", playerId: "c", proposal: { kind: "toll", value: 500 } });
    const p = Object.values(w.state.guilds?.proposals ?? {}).at(-1);
    w.do({ type: "vote", playerId: "c", proposalId: p?.id ?? "", yes: true });
    w.do({ type: "vote", playerId: "d", proposalId: p?.id ?? "", yes: true });
    const treasury = () => w.state.accounts[guildAccount(gid(w, "c"))] ?? 0n;
    const before = treasury();
    const cashA = w.cash("a");
    const da = deliver(w, "a");
    const toll = ((da.paid ?? 0n) * 500n) / 10_000n;
    expect(treasury() - before).toBe(toll);
    expect(w.cash("a") - cashA).toBe((da.paid ?? 0n) - toll);
    const cashC = w.cash("c");
    const dc = deliver(w, "c");
    expect(w.cash("c") - cashC).toBe((dc.paid ?? 0n) + ((dc.paid ?? 0n) * 1_000n) / 10_000n);
  });

  it("let a merchant of no guild supply one side, for the bounty its guild voted", () => {
    const w = world();
    w.do({ type: "propose", playerId: "a", proposal: { kind: "bounty", value: 20 } });
    const p = Object.values(w.state.guilds?.proposals ?? {}).at(-1);
    w.do({ type: "vote", playerId: "a", proposalId: p?.id ?? "", yes: true });
    w.do({ type: "vote", playerId: "b", proposalId: p?.id ?? "", yes: true });
    const war = declare(w, "a", "b");
    const member = w.try({
      type: "enlist",
      playerId: "c",
      warId: war?.id ?? "",
      side: "attacker",
    } as Command);
    expect(error(member)).toBe("guild_member");
    w.do({ type: "enlist", playerId: "e", warId: war?.id ?? "", side: "attacker" } as Command);
    const twice = w.try({
      type: "enlist",
      playerId: "e",
      warId: war?.id ?? "",
      side: "attacker",
    } as Command);
    expect(error(twice)).toBe("already_enlisted");
    const cash = w.cash("e");
    const d = deliver(w, "e");
    expect(w.cash("e") - cash).toBe((d.paid ?? 0n) + 20n * BigInt(d.loaded));
    expect(w.state.wars?.[war?.id ?? ""]?.score.attacker).toBe(d.loaded);
  });

  it("allow bands only on the roads of a war, against the other side's convoys", () => {
    const w = world({
      bandits: { ...testBandits, warOnly: true, minTargetWorthBps: 0 },
    } as never);
    const before = w.try({
      type: "postBand",
      playerId: "a",
      route: "terraferma:padova",
      hours: 2,
    } as Command);
    expect(error(before)).toBe("no_war");
    stellaHolds(w);
    w.now += 73 * HOUR;
    declare(w, "a", "b");
    const neutral = w.try({
      type: "postBand",
      playerId: "e",
      route: "terraferma:padova",
      hours: 2,
    } as Command);
    expect(error(neutral)).toBe("no_war");
    const other = w.try({
      type: "postBand",
      playerId: "a",
      route: "terraferma:verona",
      hours: 2,
    } as Command);
    expect(error(other)).toBe("no_war");
    expect(
      error(
        w.try({ type: "postBand", playerId: "a", route: "terraferma:padova", hours: 2 } as Command),
      ),
    ).toBe("ok");
  });
});
