import { upkeepPerDay } from "./buildings.js";
import { expireOrders } from "./market.js";
import { requoteMarketMaker } from "./marketMaker.js";
import { bigMin } from "./money.js";
import { openDueProjects } from "./projects.js";
import { DAY_MS, HOUR_MS, SINK_ACCOUNT, cashAccount, dayIndex } from "./state.js";
import { type Tx, balance, emit, removeStock, transfer } from "./tx.js";
import { closeWeek } from "./weekly.js";

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
    for (const player of Object.values(tx.s.players)) {
      if (player.joinedAt >= boundary) continue;
      let due = 0n;
      for (const b of Object.values(tx.s.buildings)) {
        if (b.playerId === player.id) due += upkeepPerDay(ctx, b);
      }
      const cash = cashAccount(player.id);
      const paid = bigMin(due, balance(tx, cash));
      transfer(tx, cash, SINK_ACCOUNT, paid, "upkeep", `day:${day}`);
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
      const needed = levels * rations.perLevelPerDay;
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
  expireOrders(tx);
  chargeUpkeep(tx);
  closeWeek(tx);
  openDueProjects(tx);
  requoteMarketMaker(tx);
}
