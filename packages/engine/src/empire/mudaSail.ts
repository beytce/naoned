import type { Deniers } from "../money.js";
import { DAY_MS, HOUR_MS, type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, emit, fail, transfer } from "../tx.js";
import { carnetWeek } from "./carnet.js";
import { empireSettings, ownHouse } from "./house.js";
import { mudaAuction, mudaPlaces, mudaReserve } from "./muda.js";
import type { EmpireSettings } from "./settings.js";
import { terraWeekStart } from "./terra.js";
import { incomePerDay } from "./trade.js";

/**
 * The State's Muda (CADRAGE-v3 § 3.3, § 12 bis): the great galleys sail only in its convoy, at its
 * fixed departures. Their places go at the incanto: bids held in escrow until the departure, then
 * a Vickrey sale (each winner pays the bid below it, never less than the reserve), the price
 * destroyed, the rest given back. A place won lets the galley leave within `passHours`; it sails
 * at the departure's hour. Settled at the reading, as the rest of the empire.
 */

export const mudaAccount = (playerId: PlayerId) => `muda:${playerId}`;

/** The first departure of the Muda at or after `at`. */
export function mudaDepartureAfter(at: number, s: EmpireSettings): number {
  const week = carnetWeek(at);
  for (let w = week - 1; w <= week + 1; w++) {
    const start = terraWeekStart(w);
    const times = s.muda.departures
      .map((d) => start + d.day * DAY_MS + d.hour * HOUR_MS)
      .sort((a, b) => a - b);
    const next = times.find((t) => t >= at);
    if (next !== undefined) return next;
  }
  return terraWeekStart(week + 2) + (s.muda.departures[0]?.hour ?? 0) * HOUR_MS;
}

const isMuda = (type: string, s: EmpireSettings) => s.muda.vehicles.includes(type);

/**
 * A bid for a galley's place at the next departure, in escrow; a new bid replaces the last, a bid
 * of nothing takes it back.
 */
export function bidMuda(tx: Tx, playerId: PlayerId, vehicleId: string, amount: Deniers): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  if (!isMuda(v.type, s)) fail("unknown_building_type");
  if (amount < 0n) fail("invalid_quantity");
  const m = tx.s.empire?.muda ?? { bids: [] };
  const old = m.bids.find((b) => b.house === playerId && b.vehicleId === vehicleId);
  if (old)
    transfer(tx, mudaAccount(playerId), cashAccount(playerId), old.amount, "empire_muda", "back");
  m.bids = m.bids.filter((b) => b !== old);
  if (amount > 0n) {
    transfer(tx, cashAccount(playerId), mudaAccount(playerId), amount, "empire_muda", "bid");
    m.bids.push({ house: playerId, vehicleId, amount, departure: mudaDepartureAfter(tx.now, s) });
  }
  if (tx.s.empire) tx.s.empire.muda = m;
}

function median(xs: Deniers[]): Deniers {
  if (xs.length === 0) return 0n;
  const sorted = [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0n;
}

/** The departures passed since the last one settled: their incanti. */
export function settleMuda(tx: Tx): void {
  const e = tx.s.empire;
  const s = tx.ctx.settings.empire;
  if (!e || !s || s.muda.vehicles.length === 0) return;
  const m = e.muda ?? { bids: [] };
  let last = m.last ?? tx.now;
  for (;;) {
    const next = mudaDepartureAfter(last + 1, s);
    if (next > tx.now) break;
    runDeparture(tx, m, next, s);
    last = next;
  }
  m.last = last;
  e.muda = m;
}

function runDeparture(
  tx: Tx,
  m: NonNullable<NonNullable<Tx["s"]["empire"]>["muda"]>,
  at: number,
  s: EmpireSettings,
): void {
  const houses = tx.s.empire?.houses ?? {};
  const bids = m.bids.filter((b) => b.departure <= at);
  m.bids = m.bids.filter((b) => b.departure > at);
  const owners = Object.values(houses).filter((h) =>
    (h.vehicles ?? []).some((v) => isMuda(v.type, s)),
  ).length;
  const places = mudaPlaces(owners, s);
  const reserve = mudaReserve(
    median(bids.map((b) => (houses[b.house] ? incomePerDay(houses[b.house] as never, at) : 0n))),
    s,
  );
  const prices = mudaAuction(
    bids.map((b) => b.amount),
    places,
    reserve,
  );
  bids.forEach((b, i) => {
    const price = prices[i] ?? null;
    const paid = price ?? 0n;
    if (paid > 0n) transfer(tx, mudaAccount(b.house), SINK_ACCOUNT, paid, "empire_muda", "place");
    const back = b.amount - paid;
    if (back > 0n)
      transfer(tx, mudaAccount(b.house), cashAccount(b.house), back, "empire_muda", "back");
    const h = houses[b.house];
    if (price !== null && h)
      h.mudaPasses = [
        ...(h.mudaPasses ?? []).filter((p) => p.until > tx.now),
        { vehicleId: b.vehicleId, departure: at, until: at + s.muda.passHours * HOUR_MS },
      ];
    emit(tx, "muda_result", b.house, {
      departure: at,
      won: price !== null,
      price: paid.toString(),
    });
  });
  m.lastResult = {
    departure: at,
    places,
    reserve,
    prices: prices.filter((p) => p !== null) as Deniers[],
  };
}

/**
 * A galley of the Muda leaves only with a place won: the pass is spent, and it sails at the
 * departure's hour. Returns that hour (the voyage's start), or the present for any other vehicle.
 */
export function mudaDeparture(tx: Tx, playerId: PlayerId, vehicleId: string, type: string): number {
  const s = empireSettings(tx.ctx);
  if (!isMuda(type, s)) return tx.now;
  const h = ownHouse(tx, playerId);
  const pass = h.mudaPasses?.find((p) => p.vehicleId === vehicleId && tx.now < p.until);
  if (!pass) fail("muda_only");
  h.mudaPasses = (h.mudaPasses ?? []).filter((p) => p !== pass);
  return pass.departure;
}
