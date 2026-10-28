import { settleBroglio } from "./broglio.js";
import { rationsPerDay } from "./buildings.js";
import { advanceCampaign } from "./campaign.js";
import { ensureBoard, pruneRoad, resolveDeliveries } from "./deliveries.js";
import { electDoge, openElection } from "./doge.js";
import { dissolveLegacyGuilds } from "./families.js";
import { runFattore } from "./fattore.js";
import { closeIncantoLots } from "./incanto.js";
import { settleLetters } from "./letters.js";
import { collectLoans } from "./loans.js";
import { expireOrders } from "./market.js";
import { requoteMarketMaker } from "./marketMaker.js";
import { arriveMuda } from "./muda.js";
import { settlePartners } from "./partners.js";
import { settleShares } from "./shares.js";
import { openDueProjects } from "./projects.js";
import { retireSeaAndBandits } from "./retired.js";
import { closeSignoriaDays } from "./signoria.js";
import { DAY_MS, HOUR_MS, dayIndex } from "./state.js";
import { runTenders } from "./tenders.js";
import { advanceTerraWorld } from "./terraWorld.js";
import { type Tx, emit, removeStock } from "./tx.js";
import { closeSeason, closeWeek } from "./weekly.js";

/**
 * Daily rations, served once per day boundary to players who joined before it: workers eat
 * bread every day; short of it, production slows down for a day.
 */
export function serveRations(tx: Tx): void {
  const { ctx } = tx;
  const today = dayIndex(ctx, tx.now);
  while (tx.s.lastUpkeepDay < today) {
    const day = tx.s.lastUpkeepDay + 1;
    const boundary = ctx.startAt + day * DAY_MS;
    const dormancy = ctx.settings.dormancy;
    const rations = ctx.settings.rations;
    for (const player of Object.values(tx.s.players)) {
      if (player.joinedAt + rations.graceHours * HOUR_MS >= boundary) continue;
      // Left alone for a while: the workers do not starve.
      const dormant =
        dormancy.afterHours > 0 && player.lastActionAt < boundary - dormancy.afterHours * HOUR_MS;
      if (dormant) continue;
      const needed = rationsPerDay(ctx, Object.values(tx.s.buildings), player.id);
      if (needed === 0) continue;
      const have = tx.s.inventories[player.id]?.[rations.resource]?.available ?? 0;
      const eaten = Math.min(needed, have);
      removeStock(tx, player.id, rations.resource, eaten, "rations", `day:${day}`);
      if (eaten < needed) {
        player.hungryUntil = tx.now + 24 * HOUR_MS;
        emit(tx, "hungry", player.id, { needed, eaten });
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
  serveRations(tx);
  // The Terraferma: its fronts up to now, and its week closed when it turns (before the weekly
  // ranking, which is its glory).
  advanceTerraWorld(tx);
  // The Signoria of the cities: each day's Podestà, once the day's deliveries and land are in.
  closeSignoriaDays(tx);
  // Colleganze and commissions at term, before the week's and the season's rankings are frozen:
  // a share paid at the season's end counts in it.
  settlePartners(tx);
  // The houses' parts bought back the month's last day (R9), before the ranking closes too.
  settleShares(tx);
  closeWeek(tx);
  // States of the time of the guilds: their treasuries go back to their members.
  dissolveLegacyGuilds(tx);
  // The week's campaign: marches arrive, Milan rides, glory is counted, the week closes.
  advanceCampaign(tx);
  // The Doge's election (R7): its candidates frozen at the opening, its winner at the close.
  openElection(tx);
  electDoge(tx);
  closeSeason(tx);
  openDueProjects(tx);
  runTenders(tx);
  collectLoans(tx);
  // Shared demand: the world's board of the day, drawn once the day's active merchants are known.
  ensureBoard(tx);
  // The fattore sends the vehicles left at the counter.
  runFattore(tx);
  // The galleys of the Muda, before the Dogana quotes their lot; the incanto's lots of the Sera.
  arriveMuda(tx);
  closeIncantoLots(tx);
  // The Letter's consequences come days after the answer.
  settleLetters(tx);
  // The Broglio's forged rumours delivered and unmasked, its spies gone (R8).
  settleBroglio(tx);
  requoteMarketMaker(tx);
}
