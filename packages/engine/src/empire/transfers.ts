import { HOUR_MS, type PlayerId } from "../state.js";
import { type Tx, fail, nextId } from "../tx.js";
import { houseEffect } from "./effects.js";
import { capacityOf } from "./fleet.js";
import { empireSettings, ownHouse } from "./house.js";
import { standingPosts } from "./map.js";
import { HOME_POST, putAt, takeAt } from "./stores.js";

/**
 * The deliveries between counters (the map that grows, 31 October 2026): a land vehicle standing
 * at a counter carries goods of its stock to another, in a time that grows with the distance
 * (`map.transferUnitsPerHour`), and stays there. The goods leave at once and come in at arrival.
 */
export function startTransfer(
  tx: Tx,
  playerId: PlayerId,
  vehicleId: string,
  to: string,
  good: string,
  qty: number,
): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const v = h.vehicles?.find((x) => x.id === vehicleId);
  if (!v) fail("unknown_building");
  const spec = s.vehicles[v.type];
  // A ship sails between ports (a voyage); a land vehicle goes between counters.
  if (!spec || spec.build) fail("unknown_building_type");
  if (v.busyUntil > tx.now) fail("building_busy");
  const posts = standingPosts(h, s);
  const from = posts.find((p) => p.id === (v.at ?? HOME_POST));
  const dest = posts.find((p) => p.id === to);
  if (!from || !dest || dest.id === from.id) fail("unknown_target");
  const hold = Math.floor(
    (capacityOf(h, v.type, s) * (10_000 + houseEffect(h, "capacity", s, { vehicleId }))) / 10_000,
  );
  if (!Number.isInteger(qty) || qty <= 0 || qty > hold) fail("invalid_quantity");
  takeAt(tx, h, playerId, from.id, good, qty, "empire_voyage");
  const units = Math.hypot(dest.x - from.x, dest.y - from.y);
  const ms = Math.max(1, Math.round((units / s.map.transferUnitsPerHour) * HOUR_MS));
  const arrivesAt = tx.now + ms;
  v.at = dest.id;
  v.busyUntil = arrivesAt;
  h.transfers = [
    ...(h.transfers ?? []),
    {
      id: nextId(tx, "t"),
      vehicleId,
      from: from.id,
      to: dest.id,
      good,
      qty,
      leftAt: tx.now,
      arrivesAt,
    },
  ];
}

/** The transfers arrived by now, every house's: their goods in the stock of their counter. */
export function settleTransfers(tx: Tx): void {
  const houses = tx.s.empire?.houses ?? {};
  for (const [id, h] of Object.entries(houses)) {
    const due = (h.transfers ?? []).filter((t) => t.arrivesAt <= tx.now);
    if (due.length === 0) continue;
    const left = (h.transfers ?? []).filter((t) => t.arrivesAt > tx.now);
    h.transfers = left.length > 0 ? left : undefined;
    for (const t of due) putAt(tx, h, id, t.to, t.good, t.qty, "empire_voyage", t.id);
  }
}
