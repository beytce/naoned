import { describe, expect, it } from "vitest";
import {
  type Command,
  type Delivery,
  type DeliveryOrder,
  type WorldSettingsInput,
  checkInvariants,
  deliveryOrdersFor,
  netWorth,
} from "../src/index.js";
import { deliverySettings, testBandits } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

type Bandits = typeof testBandits;

const ctx = (b: Partial<Bandits> = {}, more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, bandits: { ...testBandits, ...b }, ...more });

const PLAYERS = ["bandit", "a", "c", "d"];

/** Four merchants of the Terraferma, at 10 h in Paris. */
function world(b: Partial<Bandits> = {}, more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(b, more));
  w.at(9 * HOUR);
  for (const id of PLAYERS) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 200).give(id, "bricks", 100);
  }
  return w;
}

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const day = (w: World) => Math.floor((w.now - w.ctx.startAt) / DAY);
const cart = (w: World, playerId: string) =>
  Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === playerId)?.id ?? "";

/** A city order of this merchant to `city` (bread to Padua by default). */
function orderTo(w: World, playerId: string, city = "padova"): DeliveryOrder {
  const o = deliveryOrdersFor(w.ctx, w.state, playerId, day(w)).find(
    (x) =>
      x.kind === "city" &&
      x.city === city &&
      !(w.state.deliveriesDone?.[playerId]?.ids ?? []).includes(x.id),
  );
  if (!o) throw new Error(`no order to ${city} for ${playerId}`);
  return o;
}

function send(w: World, playerId: string, escort = "none", city = "padova"): Delivery {
  const o = orderTo(w, playerId, city);
  w.do({
    type: "dispatchDelivery",
    playerId,
    orderId: o.id,
    vehicleId: cart(w, playerId),
    escort,
  } as Command);
  return Object.values(w.state.deliveries ?? {}).at(-1) as Delivery;
}

const post = (w: World, route = "terraferma:padova", hours = 4, playerId = "bandit") =>
  w.try({ type: "postBand", playerId, route, hours } as Command);

const band = (w: World, playerId = "bandit") =>
  Object.values(w.state.bands ?? {}).find((b) => b.playerId === playerId);

const delivery = (w: World, id: string) => w.state.deliveries?.[id] as Delivery;

/** Moves to `at` and runs the scheduled job. */
const tickAt = (w: World, at: number) => {
  w.at(at - w.ctx.startAt);
  return w.do({ type: "tick" });
};

describe("posting a band", () => {
  it("costs a fee and provisions, which leave the game", () => {
    const w = world();
    const cash = w.cash("bandit");
    expect(error(post(w))).toBe("ok");
    expect(w.cash("bandit")).toBe(cash - 4_000n);
    expect(w.stock("bandit", "bread").available).toBe(196);
    expect(w.state.accounts["system:sink"]).toBe(4_000n);
    const b = band(w);
    expect(b?.endAt).toBe(w.now + 4 * HOUR);
    expect(b?.attacks).toBe(0);
  });

  it("is refused on an unknown road, for an odd duration, twice at once or on a full road", () => {
    const w = world();
    expect(error(post(w, "terraferma:roma"))).toBe("no_route");
    expect(error(post(w, "terraferma:padova", 3))).toBe("invalid_hours");
    expect(error(post(w))).toBe("ok");
    expect(error(post(w))).toBe("too_many_bands");
    expect(error(post(w, "terraferma:padova", 2, "a"))).toBe("ok");
    expect(error(post(w, "terraferma:padova", 2, "c"))).toBe("route_full");
    expect(error(post(w, "terraferma:verona", 2, "c"))).toBe("ok");
  });

  it("opens some days after joining, and not at all without settings", () => {
    expect(error(post(world({ openDay: 6 })))).toBe("bandits_locked");
    const off = world({ hoursOptions: [] });
    expect(error(post(off))).toBe("no_bandits");
  });
});

describe("an ambush", () => {
  it("halts a lone delivery for the time to fight back, then takes 30 %, half lost in flight", () => {
    const w = world();
    post(w);
    const d = send(w, "a");
    const loaded = d.loaded;
    tickAt(w, d.midAt);
    const held = delivery(w, d.id);
    expect(held.attack?.reactBy).toBe(d.midAt + 10 * MIN);
    expect(held.attack?.success).toBeUndefined();
    expect(held.arriveAt).toBe(d.arriveAt + 10 * MIN);
    expect(held.backAt).toBe(d.backAt + 10 * MIN);
    expect(w.state.vehicles?.[d.vehicleId]?.busyUntil).toBe(held.backAt);
    expect(band(w)?.attacks).toBe(1);

    tickAt(w, d.midAt + 10 * MIN);
    const robbed = delivery(w, d.id);
    const taken = Math.floor((loaded * 3_000) / 10_000);
    expect(robbed.attack?.success).toBe(true);
    expect(robbed.attack?.taken[d.resource]).toBe(taken);
    expect(robbed.cargo[d.resource]).toBe(loaded - taken);
    expect(band(w)?.booty[d.resource]).toBe(Math.floor(taken / 2));
    expect(w.state.plunderedAt?.a).toBe(w.now);

    const cash = w.cash("a");
    tickAt(w, robbed.arriveAt);
    const paid = (d.payment * BigInt(loaded - taken)) / BigInt(loaded);
    expect(w.cash("a")).toBe(cash + paid);
    expect(delivery(w, d.id).outcome).toBe("robbed_delivered");

    // The booty is collected once the band is over.
    const b = band(w);
    expect(error(w.try({ type: "collectBooty", playerId: "bandit", bandId: b?.id ?? "" }))).toBe(
      "band_active",
    );
    w.at((b?.endAt ?? 0) - w.ctx.startAt);
    const stock = w.stock("bandit", d.resource).available;
    w.do({ type: "collectBooty", playerId: "bandit", bandId: b?.id ?? "" });
    expect(w.stock("bandit", d.resource).available).toBe(stock + Math.floor(taken / 2));
    expect(error(w.try({ type: "collectBooty", playerId: "bandit", bandId: b?.id ?? "" }))).toBe(
      "booty_collected",
    );
  });

  it("fails when the merchant fights back in time, and the band breaks up", () => {
    const w = world();
    post(w);
    const d = send(w, "a");
    tickAt(w, d.midAt);
    w.at(d.midAt + 9 * MIN - w.ctx.startAt);
    expect(
      error(w.try({ type: "reactToAmbush", playerId: "c", deliveryId: d.id } as Command)),
    ).toBe("not_owner");
    w.do({ type: "reactToAmbush", playerId: "a", deliveryId: d.id });
    const after = delivery(w, d.id);
    expect(after.attack?.success).toBe(false);
    expect(after.cargo[d.resource]).toBe(d.loaded);
    expect(band(w)?.dispersed).toBe(true);
    tickAt(w, after.arriveAt);
    expect(delivery(w, d.id).outcome).toBe("delivered");
    expect(delivery(w, d.id).paid).toBe(d.payment);
  });

  it("refuses to fight back too late", () => {
    const w = world();
    post(w);
    const d = send(w, "a");
    tickAt(w, d.midAt);
    w.at(d.midAt + 11 * MIN - w.ctx.startAt);
    expect(
      error(w.try({ type: "reactToAmbush", playerId: "a", deliveryId: d.id } as Command)),
    ).toBe("too_late");
  });

  it("is settled at once against an escort, which may beat it off", () => {
    const w = world();
    post(w);
    const d = send(w, "a", "company");
    tickAt(w, d.midAt);
    const after = delivery(w, d.id);
    expect(after.attack?.success).toBe(false);
    expect(after.arriveAt).toBe(d.arriveAt);
    expect(band(w)?.attacks).toBe(1);
    expect(band(w)?.dispersed).toBe(false);
  });

  it("is tried twice at most by a band, successful or not", () => {
    const w = world();
    const victims = ["a", "c", "d"];
    const city = ["padova", "verona", "venezia"].find((c) =>
      victims.every((id) =>
        deliveryOrdersFor(w.ctx, w.state, id, 0).some((o) => o.kind === "city" && o.city === c),
      ),
    );
    post(w, `terraferma:${city}`);
    const ds = victims.map((id) => send(w, id, "company", city));
    tickAt(w, Math.max(...ds.map((d) => d.midAt)));
    const attacked = ds.filter((d) => delivery(w, d.id).attack);
    expect(attacked).toHaveLength(2);
    expect(band(w)?.attacks).toBe(2);
  });
});

describe("safeguards", () => {
  const attacked = (w: World, victim = "a") => {
    const d = send(w, victim);
    tickAt(w, d.midAt);
    return delivery(w, d.id).attack !== undefined;
  };

  it("no ambush at night in Venice", () => {
    const w = world();
    // 23 h in Paris.
    w.at(22 * HOUR);
    post(w);
    expect(attacked(w)).toBe(false);
  });

  it("no ambush of a newcomer", () => {
    const w = world({ newcomerDays: 3 });
    post(w);
    expect(attacked(w)).toBe(false);
  });

  it("no ambush of a merchant much poorer than the bandit", () => {
    const w = world();
    w.give("bandit", "bricks", 2_000);
    post(w);
    expect(attacked(w)).toBe(false);
  });

  it("no ambush within the guild", () => {
    const guilds = {
      openDay: 0,
      foundingCost: 0,
      minStake: 1_000,
      caratValue: 100,
      maxMembers: 5,
      exitFeeBps: 0,
      maxVoteBps: 10_000,
      voteHours: 24,
      maxTollBps: 800,
      maxBountyPerUnit: 50,
    };
    const w = world({}, { guilds });
    w.do({ type: "foundGuild", playerId: "a", name: "Leone", emblem: "lion", stake: 1_000 });
    const id = w.state.guilds?.memberOf.a ?? "";
    w.do({ type: "joinGuild", playerId: "bandit", guildId: id, stake: 1_000 });
    post(w);
    expect(attacked(w)).toBe(false);
    expect(attacked(w, "c")).toBe(true);
  });

  it("no second ambush of a victim within a day", () => {
    const w = world({ maxAttacksPerBand: 5 });
    post(w);
    const d = send(w, "a");
    tickAt(w, d.midAt);
    tickAt(w, d.midAt + 10 * MIN);
    expect(delivery(w, d.id).attack?.success).toBe(true);
    w.at(delivery(w, d.id).backAt - w.ctx.startAt);
    expect(attacked(w)).toBe(false);
  });

  it("never by one's own band", () => {
    const w = world();
    post(w);
    expect(attacked(w, "bandit")).toBe(false);
  });

  it("gives the Pass Négociant nothing on the road", () => {
    const run = (pass: boolean) => {
      const w = world();
      if (pass) w.do({ type: "grantPass", playerId: "a", until: w.now + 30 * DAY });
      post(w);
      const d = send(w, "a");
      tickAt(w, d.midAt);
      tickAt(w, d.midAt + 10 * MIN);
      tickAt(w, d.backAt);
      const after = delivery(w, d.id);
      return { cash: w.cash("a"), paid: after.paid, attack: after.attack, back: after.backAt };
    };
    expect(run(true)).toEqual(run(false));
  });
});

describe("infamy and bounties", () => {
  const bounty = { base: 500, perInfamyBps: 2_000, max: 1_000 };

  it("a successful take makes the bandit infamous; a failed one does not", () => {
    const w = world({ bounty });
    post(w);
    const d = send(w, "a", "company");
    tickAt(w, d.midAt);
    expect(delivery(w, d.id).attack?.success).toBe(false);
    expect(w.state.infamy?.bandit ?? 0).toBe(0);
    const lone = send(w, "c");
    tickAt(w, lone.midAt);
    tickAt(w, lone.midAt + 10 * MIN);
    expect(delivery(w, lone.id).attack?.success).toBe(true);
    expect(w.state.infamy?.bandit).toBe(1);
  });

  it("the Doge pays whoever beats off a player's band with an escort, at once", () => {
    const w = world({ bounty });
    post(w);
    // Beaten off by an escort: the base bounty, at once.
    const cash = w.cash("a");
    const escorted = send(w, "a", "company");
    const escort = cash - w.cash("a");
    tickAt(w, escorted.midAt);
    expect(w.cash("a")).toBe(cash - escort + 500n);
    expect(w.state.bounties?.a).toBe(500n);
    expect(checkInvariants(w.state, w.totals)).toEqual([]);
  });

  it("grows with the bandit's infamy, up to a cap, and pays a fight back too", () => {
    const w = world({ bounty, maxAttacksPerBand: 3 });
    post(w);
    const lone = send(w, "a");
    tickAt(w, lone.midAt);
    tickAt(w, lone.midAt + 10 * MIN);
    expect(w.state.infamy?.bandit).toBe(1);
    // Infamy 1: 500 × 1.2 = 600.
    const d = send(w, "c");
    tickAt(w, d.midAt);
    const cash = w.cash("c");
    w.do({ type: "reactToAmbush", playerId: "c", deliveryId: d.id });
    expect(w.cash("c")).toBe(cash + 600n);
    // Far more infamous: capped.
    const steep = world({ bounty: { ...bounty, perInfamyBps: 50_000 }, maxAttacksPerBand: 3 });
    post(steep);
    const first = send(steep, "a");
    tickAt(steep, first.midAt);
    tickAt(steep, first.midAt + 10 * MIN);
    const before = steep.cash("c");
    const second = send(steep, "c", "company");
    const paidEscort = before - steep.cash("c");
    tickAt(steep, second.midAt);
    expect(steep.cash("c")).toBe(before - paidEscort + 1_000n);
    expect(checkInvariants(steep.state, steep.totals)).toEqual([]);
  });

  it("pays nothing against the computer's bands, nor without settings", () => {
    const w = world({ npcBands: { perDay: 2, hours: 12 }, bounty });
    tickAt(w, w.ctx.startAt + 9 * HOUR + MIN);
    const cash = w.cash("a");
    const d = send(w, "a", "company", "padova");
    const escort = cash - w.cash("a");
    tickAt(w, d.midAt);
    expect(w.cash("a")).toBe(cash - escort);
    const off = world();
    post(off);
    const before = off.cash("a");
    const e = send(off, "a", "company");
    const paid = before - off.cash("a");
    tickAt(off, e.midAt);
    expect(off.cash("a")).toBe(before - paid);
  });
});

describe("bands of the computer", () => {
  it("lie in wait every day so that a small world has some risk; their booty is lost", () => {
    const w = world({ npcBands: { perDay: 2, hours: 3 } });
    tickAt(w, w.ctx.startAt + 9 * HOUR + MIN);
    const npc = Object.values(w.state.bands ?? {}).filter((b) => b.playerId === null);
    expect(npc).toHaveLength(2);
    for (const b of npc) expect(b.endAt - b.startAt).toBe(3 * HOUR);
    tickAt(w, w.ctx.startAt + DAY + 9 * HOUR);
    expect(Object.values(w.state.bands ?? {}).filter((b) => b.playerId === null)).toHaveLength(4);
    for (const b of npc) expect(w.state.bands?.[b.id]?.collected).toBe(true);
  });
});

describe("net worth", () => {
  it("counts goods on the road and booty not yet collected", () => {
    const w = world();
    post(w);
    const victim = netWorth(w.ctx, w.state, "a", w.now).total;
    const bandit = netWorth(w.ctx, w.state, "bandit", w.now).total;
    const d = send(w, "a");
    expect(netWorth(w.ctx, w.state, "a", w.now).total).toBe(victim);
    tickAt(w, d.midAt);
    tickAt(w, d.midAt + 10 * MIN);
    const unit = w.ctx.settings.referencePrices[d.resource] ?? 0n;
    const booty = band(w)?.booty[d.resource] ?? 0;
    const taken = delivery(w, d.id).attack?.taken[d.resource] ?? 0;
    expect(booty).toBeGreaterThan(0);
    expect(netWorth(w.ctx, w.state, "bandit", w.now).total).toBe(bandit + unit * BigInt(booty));
    expect(netWorth(w.ctx, w.state, "a", w.now).total).toBe(victim - unit * BigInt(taken));
  });
});
