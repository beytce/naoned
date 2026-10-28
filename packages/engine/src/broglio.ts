import { draw, pickWeighted } from "./draw.js";
import { eventStartingOn, nextEvent } from "./events.js";
import type { Deniers } from "./money.js";
import { mudaArrivalAt, mudaLotBps, nextMudaIndex } from "./muda.js";
import {
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, transfer } from "./tx.js";

/**
 * The Broglio (R8 of the audit of 27 October 2026, docs/plan-rupture.md): information as a good.
 * Each morning a merchant hears private rumours of what is coming — an event of the gazette, the
 * Muda's next lot — from sources that tell the truth as often as they are reliable; the engine
 * always knows what is true. Rumours are sold between merchants, false ones forged (against
 * Influence, taken by the server) and sometimes unmasked once their day has passed; a spy at a
 * rival's shows one of its offers a day. A rumour never names a merchant, nothing is free text.
 * Off without its settings.
 */

/** What a rumour says: an event starting on a day (in a city), or the size of the next lot. */
export type RumourSubject =
  | { kind: "event"; code: string; city: string | null; day: number }
  | { kind: "muda"; arrival: number; big: boolean };

export interface Rumour {
  id: string;
  subject: RumourSubject;
  /** The source's code (`settings.broglio.sources`), or `rialto` for a forged one. */
  source: string;
  reliabilityBps: number;
  /** The day it was heard. */
  day: number;
  /** Forged by a merchant (its id kept by the engine, never shown). */
  forged?: string;
}

export interface BroglioState {
  /** Rumours bought or delivered (forged), per merchant. */
  held: Record<PlayerId, Rumour[]>;
  offers: Record<
    string,
    {
      id: string;
      seller: PlayerId;
      rumour: Rumour;
      price: Deniers;
      to?: PlayerId;
      buyers: PlayerId[];
    }
  >;
  forged: Record<
    string,
    {
      id: string;
      author: PlayerId;
      subject: RumourSubject;
      /** The day it was forged: delivered the next morning. */
      day: number;
      recipients?: PlayerId[];
      resolved?: boolean;
      unmasked?: boolean;
    }
  >;
  /** Forgeries per merchant today. */
  forgedToday?: Record<PlayerId, { day: number; n: number }>;
  spies: Record<PlayerId, { target: PlayerId; until: number }>;
}

/** Whether a subject says the truth (the engine always knows). */
export function rumourTruth(ctx: WorldContext, subject: RumourSubject): boolean {
  if (subject.kind === "event") {
    const e = eventStartingOn(ctx, subject.day);
    return !!e && e.code === subject.code && (e.city ?? null) === subject.city;
  }
  return mudaLotBps(ctx, subject.arrival) >= 10_000 === subject.big;
}

/** When a subject's truth is out: its day passed, its galleys arrived. */
function resolvedAt(ctx: WorldContext, subject: RumourSubject): number {
  return subject.kind === "event"
    ? ctx.startAt + (subject.day + 1) * DAY_MS
    : mudaArrivalAt(ctx, subject.arrival);
}

/** The truth of a subject at `now`, once known (null before). */
export function rumourKnown(ctx: WorldContext, subject: RumourSubject, now: number) {
  return now >= resolvedAt(ctx, subject) ? rumourTruth(ctx, subject) : null;
}

/** The true subject of a kind, as of a day: the next event, the next galleys. */
function trueSubject(ctx: WorldContext, kind: "event" | "muda", day: number): RumourSubject | null {
  const dayStart = ctx.startAt + day * DAY_MS;
  if (kind === "event") {
    const e = nextEvent(ctx, dayStart);
    if (!e) return null;
    return {
      kind: "event",
      code: e.code,
      city: e.city ?? null,
      day: Math.round((e.startsAt - ctx.startAt) / DAY_MS),
    };
  }
  const arrival = nextMudaIndex(ctx, dayStart);
  if (arrival < 0 || mudaArrivalAt(ctx, arrival) >= seasonEnd(ctx)) return null;
  return { kind: "muda", arrival, big: mudaLotBps(ctx, arrival) >= 10_000 };
}

/** A subject made false: another event or city, or the other size of lot. */
function falsify(ctx: WorldContext, subject: RumourSubject, roll: number): RumourSubject {
  if (subject.kind === "muda") return { ...subject, big: !subject.big };
  const codes = ctx.settings.events.catalog.map((e) => e.code).filter((c) => c !== subject.code);
  const code = codes[roll % Math.max(1, codes.length)];
  if (code) {
    const def = ctx.settings.events.catalog.find((e) => e.code === code);
    return { ...subject, code, city: def?.city ?? null };
  }
  // A catalog of one: the same event, another city.
  const cities = Object.keys(ctx.settings.cities).filter((c) => c !== subject.city);
  return { ...subject, city: cities[roll % Math.max(1, cities.length)] ?? null };
}

/** The rumours a merchant hears on a day, drawn from the world's secret. */
function drawnRumours(ctx: WorldContext, state: WorldState, playerId: PlayerId, day: number) {
  const rules = ctx.settings.broglio;
  const player = state.players[playerId];
  if (!rules || !player) return [];
  const joinedDay = dayIndex(ctx, player.joinedAt);
  const newcomer = day - joinedDay < rules.newcomerDays;
  const sources = newcomer
    ? rules.sources.filter((s) => s.reliabilityBps >= rules.newcomerMinBps)
    : rules.sources;
  const pool = sources.length > 0 ? sources : rules.sources;
  const out: Rumour[] = [];
  for (let i = 0; i < rules.perDay; i++) {
    const key = `rumour:${playerId}:${day}:${i}`;
    const source = pickWeighted(pool, draw(ctx, `${key}:source`));
    const kind = i % 2 === 0 ? "event" : "muda";
    const truth =
      trueSubject(ctx, kind, day) ?? trueSubject(ctx, kind === "event" ? "muda" : "event", day);
    if (!source || !truth) continue;
    const honest = draw(ctx, `${key}:truth`) % 10_000 < source.reliabilityBps;
    out.push({
      id: `r:${playerId}:${day}:${i}`,
      subject: honest ? truth : falsify(ctx, truth, draw(ctx, `${key}:lie`)),
      source: source.code,
      reliabilityBps: source.reliabilityBps,
      day,
    });
  }
  return out;
}

/**
 * A merchant's rumours: today's (drawn, bought, delivered) and the last days', each with its
 * truth once known.
 */
export function rumourBook(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const day = dayIndex(ctx, now);
  if (!ctx.settings.broglio) return { today: [], past: [] };
  const held = state.broglio?.held[playerId] ?? [];
  const today = [...drawnRumours(ctx, state, playerId, day), ...held.filter((r) => r.day === day)];
  const past: (Rumour & { truth: boolean | null; unmasked: boolean })[] = [];
  for (let d = day - 1; d >= Math.max(0, day - 3); d--) {
    for (const r of [...drawnRumours(ctx, state, playerId, d), ...held.filter((h) => h.day === d)])
      past.push({
        ...r,
        truth: rumourKnown(ctx, r.subject, now),
        unmasked: !!(r.forged && state.broglio?.forged[r.forged]?.unmasked),
      });
  }
  return { today, past };
}

function broglioState(tx: Tx): BroglioState {
  tx.s.broglio ??= { held: {}, offers: {}, forged: {}, spies: {} };
  return tx.s.broglio;
}

function rules(tx: Tx) {
  const r = tx.ctx.settings.broglio;
  if (!r) fail("broglio_off");
  return r;
}

/** A rumour the merchant may sell: one of today's or the last days'. */
function ownRumour(tx: Tx, playerId: PlayerId, rumourId: string): Rumour {
  const book = rumourBook(tx.ctx, tx.s as WorldState, playerId, tx.now);
  const r = [...book.today, ...book.past].find((x) => x.id === rumourId);
  if (!r) fail("unknown_rumour");
  return {
    id: r.id,
    subject: r.subject,
    source: r.source,
    reliabilityBps: r.reliabilityBps,
    day: r.day,
    ...(r.forged ? { forged: r.forged } : {}),
  };
}

/** A rumour offered, to a merchant named or to all the Rialto. */
export function offerRumour(
  tx: Tx,
  playerId: PlayerId,
  rumourId: string,
  price: Deniers,
  to?: PlayerId,
): void {
  const r = rules(tx);
  const b = broglioState(tx);
  if (price <= 0n) fail("invalid_quantity");
  if (to && (to === playerId || !tx.s.players[to])) fail("unknown_target");
  const open = Object.values(b.offers).filter((o) => o.seller === playerId).length;
  if (open >= r.maxOffers) fail("offers_limit");
  const id = nextId(tx, "b");
  b.offers[id] = {
    id,
    seller: playerId,
    rumour: ownRumour(tx, playerId, rumourId),
    price,
    buyers: [],
    ...(to ? { to } : {}),
  };
  emit(tx, "rumour_offered", playerId, { offer: id, ...(to ? { to } : {}) });
}

/** A copy bought: the seller keeps its own; an offer to a merchant named closes once bought. */
export function buyRumour(tx: Tx, playerId: PlayerId, offerId: string): void {
  rules(tx);
  const b = broglioState(tx);
  const offer = b.offers[offerId];
  if (!offer) fail("unknown_offer");
  if (offer.seller === playerId) fail("own_offer");
  if (offer.to && offer.to !== playerId) fail("not_for_you");
  if (offer.buyers.includes(playerId)) fail("already_bought");
  // Information, not goods: out of the net sales.
  transfer(
    tx,
    cashAccount(playerId),
    cashAccount(offer.seller),
    offer.price,
    "rumour_sale",
    offerId,
  );
  offer.buyers.push(playerId);
  b.held[playerId] = [
    ...(b.held[playerId] ?? []),
    { ...offer.rumour, id: `${offer.rumour.id}:${playerId}`, day: dayIndex(tx.ctx, tx.now) },
  ];
  emit(tx, "rumour_sold", offer.seller, { offer: offerId, price: offer.price.toString() });
  if (offer.to) delete b.offers[offerId];
}

export function cancelRumourOffer(tx: Tx, playerId: PlayerId, offerId: string): void {
  rules(tx);
  const b = broglioState(tx);
  const offer = b.offers[offerId];
  if (!offer || offer.seller !== playerId) fail("unknown_offer");
  delete b.offers[offerId];
}

/** A subject the catalogs know, still to come. */
function validSubject(ctx: WorldContext, s: RumourSubject, now: number): boolean {
  if (now >= resolvedAt(ctx, s)) return false;
  if (s.kind === "muda")
    return !!ctx.settings.muda && Number.isInteger(s.arrival) && s.arrival >= 0;
  return (
    Number.isInteger(s.day) &&
    ctx.settings.events.catalog.some((e) => e.code === s.code) &&
    (s.city === null || s.city in ctx.settings.cities)
  );
}

/** A false rumour forged (the server took its Influence): delivered the next morning. */
export function forgeRumour(tx: Tx, playerId: PlayerId, subject: RumourSubject): void {
  const r = rules(tx);
  const b = broglioState(tx);
  if (!validSubject(tx.ctx, subject, tx.now)) fail("invalid_subject");
  if (rumourTruth(tx.ctx, subject)) fail("rumour_true");
  const day = dayIndex(tx.ctx, tx.now);
  b.forgedToday ??= {};
  const mine = b.forgedToday[playerId];
  const n = mine && mine.day === day ? mine.n : 0;
  if (n >= r.forge.perDay) fail("forge_limit");
  b.forgedToday[playerId] = { day, n: n + 1 };
  const id = nextId(tx, "f");
  b.forged[id] = {
    id,
    author: playerId,
    subject: subject.kind === "event" ? { ...subject } : { ...subject },
    day,
  };
  emit(tx, "rumour_forged", playerId, { id });
}

/** A spy at a rival's, for a week: its cost destroyed. */
export function hireSpy(tx: Tx, playerId: PlayerId, target: PlayerId): void {
  const r = rules(tx);
  const b = broglioState(tx);
  if (target === playerId || !tx.s.players[target]) fail("unknown_target");
  const mine = b.spies[playerId];
  if (mine && mine.until > tx.now) fail("spy_exists");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, r.spy.cost, "spy_hire", target);
  b.spies[playerId] = { target, until: tx.now + r.spy.days * DAY_MS };
  // The rival knows it is watched, never by whom.
  emit(tx, "spy_posted", target, {});
}

/** Every spy at the merchant's chased, for the cost of one. */
export function chaseSpy(tx: Tx, playerId: PlayerId): void {
  const r = rules(tx);
  const b = broglioState(tx);
  const owners = Object.entries(b.spies)
    .filter(([, s]) => s.target === playerId && s.until > tx.now)
    .map(([owner]) => owner);
  if (owners.length === 0) fail("no_spy");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, r.spy.cost, "spy_chase", playerId);
  for (const owner of owners) {
    delete b.spies[owner];
    emit(tx, "spy_chased", owner, {});
  }
}

/** Whether a merchant is watched now (by anyone, never told whom). */
export function spiedOn(state: WorldState, playerId: PlayerId, now: number): boolean {
  return Object.values(state.broglio?.spies ?? {}).some(
    (s) => s.target === playerId && s.until > now,
  );
}

/** What the merchant's spy saw today: one of the rival's open offers, drawn (null: no spy). */
export function spyReport(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const spy = state.broglio?.spies[playerId];
  if (!spy || spy.until <= now) return null;
  const offers = Object.values(state.orders)
    .filter((o) => o.playerId === spy.target && o.remaining > 0)
    .sort((a, b) => a.seq - b.seq);
  const day = dayIndex(ctx, now);
  const o = offers.length > 0 ? offers[draw(ctx, `spy:${playerId}:${day}`) % offers.length] : null;
  return {
    target: spy.target,
    until: spy.until,
    offer: o
      ? { resource: o.resource, side: o.side, price: o.price.toString(), quantity: o.remaining }
      : null,
  };
}

/**
 * At the tick: the forged rumours delivered on the morning after, unmasked (or not) once their
 * day has passed; the spies gone at their week's end; old offers closed.
 */
export function settleBroglio(tx: Tx): void {
  const r = tx.ctx.settings.broglio;
  if (!r || !tx.s.broglio) return;
  const b = tx.s.broglio;
  const day = dayIndex(tx.ctx, tx.now);
  for (const f of Object.values(b.forged)) {
    if (!f.recipients && day > f.day) {
      const others = Object.keys(tx.s.players)
        .filter((id) => id !== f.author && !tx.s.players[id]?.npc)
        .map((id) => ({ id, w: draw(tx.ctx, `forged:${f.id}:${id}`) }))
        .sort((a, c) => a.w - c.w || a.id.localeCompare(c.id))
        .slice(0, r.forge.recipients)
        .map((x) => x.id);
      f.recipients = others;
      for (const id of others) {
        b.held[id] = [
          ...(b.held[id] ?? []),
          {
            id: `f:${f.id}:${id}`,
            subject: f.subject,
            source: "rialto",
            reliabilityBps: r.forge.reliabilityBps,
            day,
            forged: f.id,
          },
        ];
      }
    }
    if (f.recipients && !f.resolved && tx.now >= resolvedAt(tx.ctx, f.subject)) {
      f.resolved = true;
      f.unmasked = draw(tx.ctx, `unmask:${f.id}`) % 10_000 < r.forge.unmaskBps;
      if (f.unmasked) {
        emit(tx, "liar_unmasked", f.author, { id: f.id });
        // The dupes learn it was a lie, never whose.
        for (const id of f.recipients) emit(tx, "rumour_unmasked", id, { id: f.id });
      }
    }
  }
  for (const [owner, s] of Object.entries(b.spies)) if (s.until <= tx.now) delete b.spies[owner];
  // Offers of rumours older than three days are closed: their news is stale.
  for (const [id, o] of Object.entries(b.offers)) if (o.rumour.day < day - 3) delete b.offers[id];
}
