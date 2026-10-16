import { upkeepPerDay } from "./buildings.js";
import { advanceCampaign } from "./campaign.js";
import { upkeepDiscountBps } from "./decrees.js";
import { ensureBoard, pruneRoad, resolveDeliveries, vehicleUpkeep } from "./deliveries.js";
import { dissolveLegacyGuilds } from "./families.js";
import { expireOrders } from "./market.js";
import { requoteMarketMaker } from "./marketMaker.js";
import { bigMin } from "./money.js";
import { arriveMuda } from "./muda.js";
import { openDueProjects } from "./projects.js";
import { retireSeaAndBandits } from "./retired.js";
import { DAY_MS, HOUR_MS, SINK_ACCOUNT, type WorldState, cashAccount, dayIndex } from "./state.js";
import { type Tx, balance, emit, removeStock, transfer } from "./tx.js";
import { closeSeason, closeWeek } from "./weekly.js";

/**
 * Daily upkeep, charged once per day boundary to players who joined before it.
 * A player who cannot pay in full pays what they have and cannot start production for a while.
 */
export function chargeUpkeep(tx: Tx): void {
  const { ctx } = tx;
  const today = dayIndex(ctx, tx.now);
  while (tx.s.lastUpkeepDay < today) {
    const day = tx.s.lastUpkeepDay + 1;
    const boundary = ctx.startAt + day * DAY_MS;
    const dormancy = ctx.settings.dormancy;
    for (const player of Object.values(tx.s.players)) {
      if (player.joinedAt >= boundary) continue;
      // Left alone for a while: a share of the upkeep, and the workers do not starve.
      const dormant =
        dormancy.afterHours > 0 && player.lastActionAt < boundary - dormancy.afterHours * HOUR_MS;
      let due = 0n;
      for (const b of Object.values(tx.s.buildings)) {
        if (b.playerId === player.id) due += upkeepPerDay(ctx, b);
      }
      // The franchise: the family that imposed it pays less for its workshops.
      const franchise = upkeepDiscountBps(ctx, tx.s as WorldState, player.id, boundary);
      if (franchise > 0) due = (due * BigInt(10_000 - franchise)) / 10_000n;
      let road = 0n;
      for (const v of Object.values(tx.s.vehicles ?? {})) {
        if (v.playerId === player.id) road += vehicleUpkeep(ctx, v);
      }
      if (dormant) {
        due = (due * BigInt(dormancy.upkeepBps)) / 10_000n;
        road = (road * BigInt(dormancy.upkeepBps)) / 10_000n;
      }
      const cash = cashAccount(player.id);
      const paidHome = bigMin(due, balance(tx, cash));
      transfer(tx, cash, SINK_ACCOUNT, paidHome, "upkeep", `day:${day}`);
      // Vehicles apart, so that the cost of transport shows in the ledger.
      const paidRoad = bigMin(road, balance(tx, cash));
      transfer(tx, cash, SINK_ACCOUNT, paidRoad, "vehicle_upkeep", `day:${day}`);
      const paid = paidHome + paidRoad;
      due += road;
      if (paid < due) {
        player.upkeepDefaultUntil = tx.now + ctx.settings.upkeepDefaultHours * HOUR_MS;
        emit(tx, "upkeep_default", player.id, { due: due.toString(), paid: paid.toString() });
      }

      // Rations: workers eat every day; short of food, production slows down for a day.
      const rations = ctx.settings.rations;
      let levels = 0;
      for (const b of Object.values(tx.s.buildings)) {
        if (b.playerId === player.id && b.type !== "palazzo") levels += b.level;
      }
      const needed = dormant ? 0 : levels * rations.perLevelPerDay;
      if (needed > 0) {
        const have = tx.s.inventories[player.id]?.[rations.resource]?.available ?? 0;
        const eaten = Math.min(needed, have);
        removeStock(tx, player.id, rations.resource, eaten, "rations", `day:${day}`);
        if (eaten < needed) {
          player.hungryUntil = tx.now + 24 * HOUR_MS;
          emit(tx, "hungry", player.id, { needed, eaten });
        }
      }
    }
    tx.s.lastUpkeepDay = day;
  }
}

/** Scheduled job, every 60 s in production. Does not advance production (it is lazy). */
export function tick(tx: Tx): void {
  // States of the time of the sea and the bandits: settled, then forgotten.
  retireSeaAndBandits(tx);
  resolveDeliveries(tx);
  pruneRoad(tx);
  expireOrders(tx);
  chargeUpkeep(tx);
  closeWeek(tx);
  // States of the time of the guilds: their treasuries go back to their members.
  dissolveLegacyGuilds(tx);
  // The week's campaign: marches arrive, Milan rides, glory is counted, the week closes.
  advanceCampaign(tx);
  closeSeason(tx);
  openDueProjects(tx);
  // Shared demand: the world's board of the day, drawn once the day's active merchants are known.
  ensureBoard(tx);
  // The galleys of the Muda, before the Dogana quotes their lot.
  arriveMuda(tx);
  requoteMarketMaker(tx);
}
