import { DENIERS_PER_DUCAT, type Deniers } from "../money.js";
import { SOURCE_ACCOUNT, cashAccount } from "../state.js";
import { type Tx, transfer } from "../tx.js";
import { empireSettings } from "./house.js";
import { researchCost } from "./modules.js";
import { putAt, wherePut } from "./stores.js";

/**
 * The sea, the deposits and the expeditions gone (decision of the owner, 1 November 2026): what
 * a house had engaged in them is given back once, at the first command after the change, so that
 * nothing built is lost (CLAUDE.md). A cargo at sea comes back to its counter of departure; the
 * stakes and the bids, to their houses; a ship, a ship's site, the Arsenal, its price in ducats; a
 * module of the sea researched, its research; the teams leave their deposits.
 */

/** The ships and the Arsenal of before, their price in ducats (venice1450.empire.ts of before). */
const SHIP_DUCATS: Record<string, number> = {
  marciliana: 1_500,
  cocca: 3_500,
  galea: 9_000,
  fiandra: 25_000,
};
const ARSENAL_DUCATS = 3_000;
const colleganzaAccount = (id: string) => `colleganza:${id}`;
const mudaAccount = (id: string) => `muda:${id}`;

const refund = (tx: Tx, playerId: string, amount: Deniers, ref: string) => {
  if (amount > 0n)
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), amount, "empire_refund", ref);
};

export function retireSea(tx: Tx): void {
  const empire = tx.s.empire;
  if (!empire) return;
  const s = empireSettings(tx.ctx);
  const ships = new Set(Object.keys(SHIP_DUCATS).filter((t) => !s.vehicles[t]));
  const houses = Object.entries(empire.houses);
  const engaged =
    (empire.voyages?.length ?? 0) > 0 ||
    (empire.colleganze?.length ?? 0) > 0 ||
    empire.muda !== undefined ||
    empire.deposits !== undefined ||
    houses.some(
      ([, h]) =>
        h.teams !== undefined ||
        h.mudaPasses !== undefined ||
        (h.vehicles ?? []).some((v) => ships.has(v.type)) ||
        h.builds.some((b) => b.kind === "ship" || b.kind === "arsenal") ||
        Object.keys(h.modules ?? {}).some((m) => !s.modules.some((x) => x.code === m)),
    );
  if (!engaged) return;
  // The cargoes at sea: back to their counter of departure.
  for (const v of empire.voyages ?? []) {
    const h = empire.houses[v.house];
    if (h) putAt(tx, h, v.house, wherePut(h, s, v.from), v.good, v.qty, "empire_voyage", v.id);
  }
  // The colleganze: the stakes in escrow back to their houses; a voyage sailed, its capital
  // given back by the traveller, whose cargo came home.
  for (const c of empire.colleganze ?? []) {
    for (const x of c.stakes) {
      const held = tx.s.accounts[colleganzaAccount(c.id)] ?? 0n;
      const back = x.amount < held ? x.amount : held;
      if (back > 0n)
        transfer(
          tx,
          colleganzaAccount(c.id),
          cashAccount(x.house),
          back,
          "empire_colleganza",
          c.id,
        );
      const owed = x.amount - back;
      const purse = tx.s.accounts[cashAccount(c.traveller)] ?? 0n;
      const paid = owed < purse ? owed : purse;
      if (c.status === "sailing" && paid > 0n)
        transfer(
          tx,
          cashAccount(c.traveller),
          cashAccount(x.house),
          paid,
          "empire_colleganza",
          c.id,
        );
    }
  }
  for (const [id, h] of houses) {
    // The Muda's bids in escrow.
    const bid = tx.s.accounts[mudaAccount(id)] ?? 0n;
    if (bid > 0n) transfer(tx, mudaAccount(id), cashAccount(id), bid, "empire_muda", "back");
    // The ships, their sites and the Arsenal's: their price.
    for (const v of (h.vehicles ?? []).filter((x) => ships.has(x.type)))
      refund(tx, id, BigInt(SHIP_DUCATS[v.type] ?? 0) * DENIERS_PER_DUCAT, `ship:${v.id}`);
    for (const b of h.builds.filter((x) => x.kind === "ship"))
      refund(tx, id, BigInt(SHIP_DUCATS[b.vehicleType ?? ""] ?? 0) * DENIERS_PER_DUCAT, "ship");
    if (h.arsenal || h.builds.some((b) => b.kind === "arsenal"))
      refund(tx, id, BigInt(ARSENAL_DUCATS) * DENIERS_PER_DUCAT, "arsenal");
    const gone = new Set((h.vehicles ?? []).filter((x) => ships.has(x.type)).map((x) => x.id));
    h.vehicles = (h.vehicles ?? []).filter((x) => !gone.has(x.id));
    h.builds = h.builds.filter((b) => b.kind !== "ship" && b.kind !== "arsenal");
    for (const m of h.staff ?? []) if (m.placedAt && gone.has(m.placedAt)) m.placedAt = undefined;
    // The modules of the sea, the deposits and the arms: their research given back.
    for (const [code, level] of Object.entries(h.modules ?? {})) {
      if (s.modules.some((x) => x.code === code)) continue;
      let paid = 0n;
      for (let l = 1; l <= level; l++) paid += researchCost(l, s);
      refund(tx, id, paid, `module:${code}`);
      const { [code]: _, ...rest } = h.modules ?? {};
      h.modules = rest;
    }
    for (const r of h.research ?? [])
      if (!s.modules.some((x) => x.code === r.code))
        refund(tx, id, researchCost(r.level, s), `research:${r.code}`);
    h.research = (h.research ?? []).filter((r) => s.modules.some((x) => x.code === r.code));
    h.teams = undefined;
    h.mudaPasses = undefined;
  }
  empire.voyages = undefined;
  empire.colleganze = undefined;
  empire.muda = undefined;
  empire.deposits = undefined;
}
