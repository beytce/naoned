import { type Deniers, type WorldContext, type WorldState, netWorth } from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { weeklyRecord } from "./weekly.js";

/**
 * Merchant titles, from net worth (ducats). Cosmetic only: a title never changes the economy.
 * Thresholds are a first guess, to be tuned with the beta.
 */
export const TITLES = [
  { code: "peddler", name: "Colporteur", from: 0 },
  { code: "shopkeeper", name: "Boutiquier", from: 3_000 },
  { code: "merchant", name: "Marchand", from: 5_000 },
  { code: "trader", name: "Négociant", from: 8_000 },
  { code: "shipowner", name: "Armateur", from: 13_000 },
  { code: "patrician", name: "Patricien", from: 20_000 },
  { code: "senator", name: "Sénateur", from: 32_000 },
  { code: "doge", name: "Doge", from: 50_000 },
] as const;

export function titleFor(totalDeniers: Deniers) {
  const ducats = Number(totalDeniers / 100n);
  let index = 0;
  TITLES.forEach((t, i) => {
    if (ducats >= t.from) index = i;
  });
  const current = TITLES[index] ?? TITLES[0];
  const next = TITLES[index + 1] ?? null;
  const progress = next ? (ducats - current.from) / (next.from - current.from) : 1;
  return { index, current, next, progress: Math.max(0, Math.min(1, progress)) };
}

interface Counts {
  trades: number;
  citySold: number;
  delivered: number;
  days: number;
  builds: number;
  contracts: number;
  voyages: number;
}

async function counts(db: Db, worldId: string, playerId: string): Promise<Counts> {
  const rows = await db.execute(sql`
    select
      (select count(*) from trades where world_id = ${worldId}
        and (buyer_id = ${playerId} or seller_id = ${playerId}))::int as trades,
      (select coalesce(-sum(quantity), 0) from stock_movements where world_id = ${worldId}
        and player_id = ${playerId} and reason = 'city_sale')::int as city_sold,
      (select coalesce(-sum(quantity), 0) from stock_movements where world_id = ${worldId}
        and player_id = ${playerId} and reason = 'project_delivery')::int as delivered,
      (select count(distinct date_trunc('day', at)) from telemetry where world_id = ${worldId}
        and account_id = ${playerId}::uuid)::int as days,
      (select count(*) from telemetry where world_id = ${worldId}
        and account_id = ${playerId}::uuid and type in ('build', 'upgrade'))::int as builds,
      (select count(*) from telemetry where world_id = ${worldId}
        and account_id = ${playerId}::uuid and type = 'contract_fulfilled')::int as contracts,
      (select count(*) from telemetry where world_id = ${worldId}
        and account_id = ${playerId}::uuid and type = 'expedition_returned')::int as voyages`);
  const r = ((rows as { rows?: Record<string, number>[] }).rows ?? [])[0] ?? {};
  return {
    trades: Number(r.trades ?? 0),
    citySold: Number(r.city_sold ?? 0),
    delivered: Number(r.delivered ?? 0),
    days: Number(r.days ?? 0),
    builds: Number(r.builds ?? 0),
    contracts: Number(r.contracts ?? 0),
    voyages: Number(r.voyages ?? 0),
  };
}

export async function profile(
  db: Db,
  worldId: string,
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  now: number,
  rank: { rank: number | null; total: number },
) {
  const player = state.players[playerId];
  if (!player) return null;
  const worth = netWorth(ctx, state, playerId, now);
  const buildings = Object.values(state.buildings).filter((b) => b.playerId === playerId);
  const c = await counts(db, worldId, playerId);
  const maxLevel = buildings.reduce((m, b) => Math.max(m, b.level), 0);
  const palazzo = buildings.find((b) => b.type === "palazzo")?.level ?? 0;
  const weekly = await weeklyRecord(db, worldId, playerId);
  const podiums = weekly.filter((w) => w.award).length;
  const wins = weekly.filter((w) => w.award === "doge").length;

  // Trophies: cosmetic milestones, with progress towards each.
  const badge = (code: string, name: string, value: number, goal: number) => ({
    code,
    name,
    value: Math.min(value, goal),
    goal,
    earned: value >= goal,
  });
  const badges = [
    badge("first_trade", "Premier marché conclu", c.trades, 1),
    badge("trader_50", "Habitué du Rialto", c.trades, 50),
    badge("city_500", "Fournisseur des villes", c.citySold, 500),
    badge("project_100", "Bâtisseur de la République", c.delivered, 100),
    badge("builder_5", "Maître d'œuvre", c.builds, 5),
    badge("level_5", "Atelier d'excellence", maxLevel, 5),
    badge("palazzo", "Palais sur le Grand Canal", palazzo, 1),
    badge("days_7", "Fidèle au comptoir", c.days, 7),
    badge("contracts_10", "Fournisseur du Doge", c.contracts, 10),
    badge("voyage_1", "Retour d'Orient", c.voyages, 1),
    badge("weekly_podium", "Sur le podium de la semaine", podiums, 1),
    badge("weekly_doge", "Doge de la semaine", wins, 1),
  ];

  return {
    region: player.region,
    joinedAt: player.joinedAt,
    title: titleFor(worth.total),
    titles: TITLES,
    netWorth: worth,
    rank: rank.rank,
    players: rank.total,
    buildings: buildings.length,
    totalLevels: buildings.reduce((n, b) => n + b.level, 0),
    stats: c,
    badges,
    weekly,
  };
}

/** Hourly volume-weighted prices over the last 48 h, per resource, for sparklines. */
export async function priceHistory(db: Db, worldId: string, now: number, hours = 48) {
  const since = new Date(now - hours * 3_600_000);
  const rows = await db.execute(sql`
    select resource, extract(epoch from date_trunc('hour', at))::bigint * 1000 as hour,
      (sum(price * quantity) / sum(quantity))::bigint as price, sum(quantity)::int as volume
    from trades where world_id = ${worldId} and at >= ${since.toISOString()}::timestamptz
    group by resource, date_trunc('hour', at) order by hour`);
  const out: Record<string, { t: number; price: string; volume: number }[]> = {};
  for (const r of (rows as { rows?: Record<string, unknown>[] }).rows ?? []) {
    const resource = String(r.resource);
    out[resource] ??= [];
    out[resource].push({ t: Number(r.hour), price: String(r.price), volume: Number(r.volume) });
  }
  return out;
}
