import { type PlayerId, SINK_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, fail, nextId, transfer } from "../tx.js";
import { empireSettings, ownHouse } from "./house.js";
import { checkDepot, ensureMap } from "./map.js";

/**
 * Buys a land vehicle at its Casa, at the house's Remise (CADRAGE-v3 § 3.3): its price is
 * destroyed. The sea's ships are gone (decision of the owner, 1 November 2026): only carts.
 */
export function buyEmpireVehicle(tx: Tx, playerId: PlayerId, type: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const spec = s.vehicles[type];
  if (!spec) fail("unknown_building_type");
  if (h.casa < spec.casa) fail("requirement_unmet");
  ensureMap(h, s);
  checkDepot(h, s);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, BigInt(spec.costDucats) * 100n, "empire_build");
  h.vehicles = [...(h.vehicles ?? []), { id: nextId(tx, "v"), type, busyUntil: 0 }];
}
