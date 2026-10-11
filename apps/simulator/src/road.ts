import {
  type BanditBand,
  type Delivery,
  type WorldContext,
  type WorldState,
  hourIn,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const FREQUENT = new Set(["producer", "artisan", "builder", "speculator"]);
/** Hours a day a vehicle can be on the road: the merchant's day, 8 h to 22 h in Paris. */
const DAY_HOURS = 14;

export interface BandStats {
  bands: number;
  hours: number;
  /** Ambushes attempted. */
  attacks: number;
  /** Successful ones. */
  hits: number;
  /** Fee and provisions at reference prices, in deniers. */
  cost: number;
  /** Booty kept at reference prices, in deniers. */
  booty: number;
}

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
  ambushes: number;
  robbed: number;
  /** Beaten off by an escort or a draw. */
  defended: number;
  /** Beaten off by the merchant fighting back. */
  reacted: number;
  escorted: number;
  /** Value lost to bandits, in bps of the value delivered. */
  lossBps: number;
  /** Bands of players by the bandit's profile (frequent: speculators; casual). */
  bandits: { frequent: BandStats; casual: BandStats };
  npcBands: number;
  /** Margin of a careful deliverer over the reference price, per hour on the road (deniers). */
  deliveryMarginPerHour: number;
  /** Net gain of a frequent bandit per hour of band (deniers). */
  banditGainPerHour: number;
  /** Deliveries that set off at night in Paris (should be none for people; bots play by UTC). */
  nightAmbushes: number;
}

const empty = (): BandStats => ({ bands: 0, hours: 0, attacks: 0, hits: 0, cost: 0, booty: 0 });

export function roadStats(
  ctx: WorldContext,
  state: WorldState,
  deliveries: Delivery[],
  bands: BanditBand[],
  bots: { id: string; profile: string }[],
  start: number,
  end: number,
): RoadStats {
  const profile = new Map(bots.map((b) => [b.id, b.profile]));
  const ref = (r: string) => Number(ctx.settings.referencePrices[r] ?? 0n);
  let value = 0;
  let lost = 0;
  let margin = 0;
  let marginHours = 0;
  const busy = { frequent: 0, casual: 0 };
  for (const d of deliveries) {
    value += Number(d.payment);
    const taken = d.attack?.taken[d.resource] ?? 0;
    if (d.loaded > 0) lost += (Number(d.payment) * taken) / d.loaded;
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
  const bandit = { frequent: empty(), casual: empty() };
  const cfg = ctx.settings.bandits;
  let npc = 0;
  for (const b of bands) {
    if (b.playerId === null) {
      npc++;
      continue;
    }
    const p = profile.get(b.playerId) ?? "";
    const line = p === "casual" ? bandit.casual : FREQUENT.has(p) ? bandit.frequent : undefined;
    if (!line) continue;
    const hours = (b.endAt - b.startAt) / HOUR;
    line.bands++;
    line.attacks += b.attacks;
    line.hits += deliveries.filter((d) => d.attack?.bandId === b.id && d.attack.success).length;
    line.hours += hours;
    line.cost += Number(cfg.feePerHour) * hours;
    for (const [r, q] of Object.entries(cfg.provisionsPerHour)) line.cost += ref(r) * q * hours;
    for (const [r, q] of Object.entries(b.booty)) line.booty += ref(r) * q;
  }
  const attacks = deliveries.filter((d) => d.attack);
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
    ambushes: attacks.length,
    robbed: attacks.filter((d) => d.attack?.success).length,
    defended: attacks.filter((d) => d.attack?.success === false && !d.attack.reacted).length,
    reacted: attacks.filter((d) => d.attack?.reacted).length,
    escorted: deliveries.filter((d) => d.escort !== "none").length,
    lossBps: value > 0 ? (lost * 10_000) / value : 0,
    bandits: bandit,
    npcBands: npc,
    deliveryMarginPerHour: marginHours > 0 ? margin / marginHours : 0,
    banditGainPerHour:
      bandit.frequent.hours > 0
        ? (bandit.frequent.booty - bandit.frequent.cost) / bandit.frequent.hours
        : 0,
    nightAmbushes: attacks.filter((d) => {
      const h = hourIn(d.attack?.at ?? 0);
      return h >= 22 || h < 8;
    }).length,
  };
}
