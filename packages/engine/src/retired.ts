import { type PlayerId, SOURCE_ACCOUNT, type WorldState, cashAccount } from "./state.js";
import { type Tx, addStock, emit, transfer } from "./tx.js";

/**
 * The sea (ships, convoys, corsairs) and the bandits were removed in October 2026. A state saved
 * in their time is settled at the next tick, through the ledger and the stock journal: ships are
 * paid back at cost, goods still at sea or in a booty go back to their owner (the computer's bands
 * keep nothing), then all of it is forgotten.
 */
export function retireSeaAndBandits(tx: Tx): void {
  const s = tx.s;
  if (!s.ships && !s.expeditions && !s.raids && !s.bands && !s.infamy && !s.bounties) return;
  const known = (id: PlayerId | null): id is PlayerId => !!id && !!(s as WorldState).players[id];
  const touched = new Set<PlayerId>();
  const give = (playerId: PlayerId | null, goods: Record<string, number>, ref: string) => {
    if (!known(playerId)) return;
    for (const [resource, qty] of Object.entries(goods)) {
      if (qty <= 0) continue;
      addStock(tx, playerId, resource, qty, "expedition_return", ref);
      touched.add(playerId);
    }
  };
  for (const [id, ship] of Object.entries(s.ships ?? {})) {
    if (!known(ship.playerId)) continue;
    transfer(tx, SOURCE_ACCOUNT, cashAccount(ship.playerId), ship.investedValue, "sea_closed", id);
    touched.add(ship.playerId);
  }
  for (const [id, e] of Object.entries(s.expeditions ?? {})) {
    if (e.outcome === "pending") give(e.playerId, e.cargo, id);
  }
  for (const [id, r] of Object.entries(s.raids ?? {})) {
    if (r.outcome === "cruising") give(r.playerId, r.booty, id);
  }
  for (const [id, b] of Object.entries(s.bands ?? {})) {
    if (!b.collected) give(b.playerId, b.booty, id);
  }
  for (const playerId of [...touched].sort()) emit(tx, "sea_closed", playerId);
  for (const key of [
    "ships",
    "expeditions",
    "raids",
    "bands",
    "npcBandsDay",
    "plunderedAt",
    "infamy",
    "bounties",
  ] as const) {
    delete s[key];
  }
}
