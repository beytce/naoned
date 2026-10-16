import type { Delivery, WorldContext, WorldState } from "@comptoirs/engine";

const HOUR = 3_600_000;
const FREQUENT = new Set(["producer", "artisan", "builder", "speculator"]);
/** Hours a day a vehicle can be on the road: the merchant's day, 8 h to 22 h in Paris. */
const DAY_HOURS = 14;

export interface RoadStats {
  dispatched: number;
  arrived: number;
  /** Deliveries per active merchant-day. */
  perMerchantDay: number;
  /** Share of the merchant's day the vehicles of frequent merchants spend on the road. */
  utilization: number;
  /** Same for casual merchants. */
  utilizationCasual: number;
  vehiclesPerMerchant: number;
  /** Margin of a deliverer over the reference price, per hour on the road (deniers). */
  deliveryMarginPerHour: number;
}

export function roadStats(
  ctx: WorldContext,
  state: WorldState,
  deliveries: Delivery[],
  bots: { id: string; profile: string }[],
  start: number,
  end: number,
): RoadStats {
  const profile = new Map(bots.map((b) => [b.id, b.profile]));
  const ref = (r: string) => Number(ctx.settings.referencePrices[r] ?? 0n);
  let margin = 0;
  let marginHours = 0;
  const busy = { frequent: 0, casual: 0 };
  for (const d of deliveries) {
    const p = profile.get(d.playerId) ?? "";
    const hours = (Math.min(d.backAt, end) - d.departAt) / HOUR;
    if (FREQUENT.has(p)) busy.frequent += hours;
    if (p === "casual") busy.casual += hours;
    if (p === "builder" && d.outcome !== "en_route") {
      margin += Number(d.paid ?? 0n) - ref(d.resource) * d.loaded;
      marginHours += hours;
    }
  }
  const capacity = { frequent: 0, casual: 0 };
  const vehicles = Object.values(state.vehicles ?? {});
  for (const v of vehicles) {
    const p = profile.get(v.playerId) ?? "";
    const hours = ((end - (v.since ?? start)) / (24 * HOUR)) * DAY_HOURS;
    if (FREQUENT.has(p)) capacity.frequent += hours;
    if (p === "casual") capacity.casual += hours;
  }
  const activeDays = Math.max(
    1,
    Object.values(state.players).reduce(
      (n, p) => n + Math.max(0, Math.min(end, p.lastActionAt) - p.joinedAt) / (24 * HOUR),
      0,
    ),
  );
  return {
    dispatched: deliveries.length,
    arrived: deliveries.filter((d) => d.outcome !== "en_route").length,
    perMerchantDay: deliveries.length / activeDays,
    utilization: busy.frequent / Math.max(1, capacity.frequent),
    utilizationCasual: busy.casual / Math.max(1, capacity.casual),
    vehiclesPerMerchant: vehicles.length / Math.max(1, Object.keys(state.players).length),
    deliveryMarginPerHour: marginHours > 0 ? margin / marginHours : 0,
  };
}
