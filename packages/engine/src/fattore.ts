import { rationsPerDay } from "./buildings.js";
import { hourIn, hourWithin } from "./clock.js";
import {
  deliveriesDoneToday,
  deliveriesOn,
  deliveryOrdersFor,
  dispatchDelivery,
  vehiclesOf,
} from "./deliveries.js";
import { HOUR_MS, MINUTE_MS, type WorldState, dayIndex } from "./state.js";
import { EngineError, type Tx, emit } from "./tx.js";

/** The fattore works in the day, like the merchants. */
const OPEN = { from: 8, to: 22 };

/**
 * The fattore (recommendations of 20 October 2026): for each merchant seen lately whose vehicle
 * has stayed at the counter a while, the best order of the day the stock covers leaves with it, a
 * few times a day; the bread the workers eat stays home. Scheduled every tick.
 */
export function runFattore(tx: Tx): void {
  const cfg = tx.ctx.settings.deliveries.fattore;
  if (!cfg || cfg.perDay <= 0 || !deliveriesOn(tx.ctx)) return;
  if (!hourWithin(hourIn(tx.now), OPEN)) return;
  const state = tx.s as WorldState;
  const day = dayIndex(tx.ctx, tx.now);
  const rations = tx.ctx.settings.rations.resource;
  for (const player of Object.values(state.players)) {
    if (tx.now - player.lastActionAt > cfg.activeHours * HOUR_MS) continue;
    const count = tx.s.fattore?.[player.id];
    const runs = count && count.day === day ? count.runs : 0;
    if (runs >= cfg.perDay) continue;
    const idleSince = (busyUntil: number) => Math.max(busyUntil, player.lastActionAt);
    const vehicle = vehiclesOf(state, player.id)
      .filter((v) => idleSince(v.busyUntil) <= tx.now - cfg.idleMinutes * MINUTE_MS)
      .sort((a, b) => a.busyUntil - b.busyUntil || (a.id < b.id ? -1 : 1))[0];
    if (!vehicle) continue;
    const capacity = tx.ctx.settings.deliveries.vehicles[vehicle.type]?.capacity ?? 0;
    const stock = tx.s.inventories[player.id] ?? {};
    const keep = rationsPerDay(tx.ctx, Object.values(tx.s.buildings), player.id);
    const done = deliveriesDoneToday(state, player.id, day);
    const orders = deliveryOrdersFor(tx.ctx, state, player.id, day)
      .filter(
        (o) =>
          !done.includes(o.id) &&
          !(o.shared && o.takenBy) &&
          o.opensAt <= tx.now &&
          tx.now < o.expiresAt &&
          o.quantity <= capacity &&
          (stock[o.resource]?.available ?? 0) - (o.resource === rations ? keep : 0) >= o.quantity,
      )
      .sort(
        (a, b) =>
          Number(b.unitPrice * BigInt(b.quantity) - a.unitPrice * BigInt(a.quantity)) ||
          (a.id < b.id ? -1 : 1),
      );
    for (const order of orders) {
      try {
        const { id } = dispatchDelivery(tx, player.id, order.id, vehicle.id);
        const sent = tx.s.deliveries?.[id];
        if (sent) sent.fattore = true;
      } catch (err) {
        // Refused before anything moved (reserved, no route…): the next order.
        if (err instanceof EngineError) continue;
        throw err;
      }
      tx.s.fattore = { ...tx.s.fattore, [player.id]: { day, runs: runs + 1 } };
      emit(tx, "fattore_sent", player.id, { order: order.id, city: order.city });
      break;
    }
  }
}
