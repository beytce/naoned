import type { Deniers } from "../money.js";
import { type EmpireColleganza, type EmpireVoyage, type PlayerId, cashAccount } from "../state.js";
import { type Tx, emit, fail, nextId, transfer } from "../tx.js";
import { settleColleganza } from "./colleganza.js";
import { empireSettings, ownHouse } from "./house.js";
import { startVoyage } from "./voyages.js";

/**
 * The colleganza at sea (CADRAGE-v3 § 3 quater, profondeur.md § E): a traveller publishes a
 * voyage and the capital it seeks; investors put ducats in escrow; at the departure, the cargo is
 * bought with the stakes first, what it did not use goes back; at the return, what the stakes'
 * share of the cargo brought is shared by `settleColleganza` (a quarter of the profit to the
 * traveller, a loss shared by the stakes), all at the ledger. The traveller's record is public.
 */

export const colleganzaAccount = (id: string) => `colleganza:${id}`;

/** The Casa that opens the colleganza (the one whose openings name it; none named: open). */
function opened(casa: number, tx: Tx): boolean {
  const s = empireSettings(tx.ctx);
  const at = s.casa.findIndex((c) => c.opens.includes("colleganza"));
  return at < 0 || casa >= at + 1;
}

function find(tx: Tx, id: string): EmpireColleganza {
  const c = tx.s.empire?.colleganze?.find((x) => x.id === id);
  if (!c) fail("unknown_colleganza");
  return c;
}

const total = (c: EmpireColleganza) => c.stakes.reduce((a, x) => a + x.amount, 0n);

/** A traveller publishes a voyage of one of its ships, and the capital it seeks. */
export function openSeaColleganza(
  tx: Tx,
  playerId: PlayerId,
  v: { vehicleId: string; from: string; to: string; good: string; qty: number; target: Deniers },
): void {
  const h = ownHouse(tx, playerId);
  if (!opened(h.casa, tx)) fail("requirement_unmet");
  if (!h.vehicles?.some((x) => x.id === v.vehicleId)) fail("unknown_building");
  if (v.target <= 0n || !Number.isInteger(v.qty) || v.qty <= 0) fail("invalid_quantity");
  const e = tx.s.empire;
  if (!e) return;
  if ((e.colleganze ?? []).some((c) => c.vehicleId === v.vehicleId && c.status === "open"))
    fail("building_busy");
  e.colleganze = [
    ...(e.colleganze ?? []),
    { id: nextId(tx, "cg"), traveller: playerId, ...v, stakes: [], status: "open" },
  ];
}

/** An investor puts ducats in escrow: never in its own voyage, never past the capital sought. */
export function stakeSeaColleganza(tx: Tx, playerId: PlayerId, id: string, amount: Deniers): void {
  const h = ownHouse(tx, playerId);
  const c = find(tx, id);
  if (c.status !== "open") fail("colleganza_closed");
  if (c.traveller === playerId) fail("own_colleganza");
  if (!opened(h.casa, tx)) fail("requirement_unmet");
  if (amount <= 0n || total(c) + amount > c.target) fail("over_limit");
  transfer(tx, cashAccount(playerId), colleganzaAccount(id), amount, "empire_colleganza", id);
  const mine = c.stakes.find((x) => x.house === playerId);
  if (mine) mine.amount += amount;
  else c.stakes.push({ house: playerId, amount });
}

/** An investor takes its stake back while the voyage has not sailed. */
export function withdrawSeaColleganza(tx: Tx, playerId: PlayerId, id: string): void {
  const c = find(tx, id);
  if (c.status !== "open") fail("colleganza_closed");
  const mine = c.stakes.find((x) => x.house === playerId);
  if (!mine) fail("unknown_colleganza");
  transfer(tx, colleganzaAccount(id), cashAccount(playerId), mine.amount, "empire_colleganza", id);
  c.stakes = c.stakes.filter((x) => x !== mine);
}

/** The traveller gives up its voyage: every stake goes back. */
export function cancelSeaColleganza(tx: Tx, playerId: PlayerId, id: string): void {
  const c = find(tx, id);
  if (c.traveller !== playerId) fail("not_owner");
  if (c.status !== "open") fail("colleganza_closed");
  for (const x of c.stakes)
    transfer(tx, colleganzaAccount(id), cashAccount(x.house), x.amount, "empire_colleganza", id);
  if (tx.s.empire) tx.s.empire.colleganze = (tx.s.empire.colleganze ?? []).filter((x) => x !== c);
}

/**
 * The traveller sails (a galley of the Muda with its place won): the stakes come to its purse,
 * the cargo is bought with them first; what it did not use goes back to the investors, each in
 * proportion. Its own goods still sail first, as in any voyage.
 */
export function sailSeaColleganza(tx: Tx, playerId: PlayerId, id: string, insured = false): void {
  const c = find(tx, id);
  if (c.traveller !== playerId) fail("not_owner");
  if (c.status !== "open") fail("colleganza_closed");
  const staked = total(c);
  if (staked > 0n)
    transfer(tx, colleganzaAccount(id), cashAccount(playerId), staked, "empire_colleganza", id);
  const before = tx.s.accounts[cashAccount(playerId)] ?? 0n;
  startVoyage(tx, playerId, c.vehicleId, c.from, c.to, c.good, c.qty, insured);
  const spent = before - (tx.s.accounts[cashAccount(playerId)] ?? 0n);
  const voyage = tx.s.empire?.voyages?.at(-1) as EmpireVoyage;
  const used = spent <= 0n ? 0n : spent < staked ? spent : staked;
  // What the cargo did not use goes back, each stake in proportion (the last takes the rounding).
  let keptSoFar = 0n;
  const kept = c.stakes.map((x, i) => {
    const keep =
      i === c.stakes.length - 1 ? used - keptSoFar : staked > 0n ? (x.amount * used) / staked : 0n;
    keptSoFar += keep;
    const back = x.amount - keep;
    if (back > 0n)
      transfer(tx, cashAccount(playerId), cashAccount(x.house), back, "empire_colleganza", id);
    return { house: x.house, amount: keep };
  });
  c.stakes = kept.filter((x) => x.amount > 0n);
  c.capital = c.stakes.reduce((a, x) => a + x.amount, 0n);
  c.cargoCost = voyage.cost;
  c.status = "sailing";
  voyage.colleganza = id;
}

/**
 * At the voyage's return: the stakes' share of what the cargo brought (`proceeds`, the
 * traveller's purse's gain at the arrival), shared at the ledger; the traveller's record grows.
 */
export function returnSeaColleganza(tx: Tx, v: EmpireVoyage, proceeds: Deniers): void {
  const e = tx.s.empire;
  const c = e?.colleganze?.find((x) => x.id === v.colleganza);
  if (!e || !c) return;
  e.colleganze = (e.colleganze ?? []).filter((x) => x !== c);
  const capital = c.capital ?? 0n;
  const cost = c.cargoCost ?? 0n;
  if (capital <= 0n || cost <= 0n || c.stakes.length === 0) return;
  const s = empireSettings(tx.ctx);
  const theirs = (proceeds * capital) / cost;
  const split = settleColleganza(
    c.stakes.map((x) => x.amount),
    theirs > 0n ? theirs : 0n,
    s,
  );
  c.stakes.forEach((x, i) => {
    const amount = split.investors[i] ?? 0n;
    if (amount > 0n)
      transfer(
        tx,
        cashAccount(c.traveller),
        cashAccount(x.house),
        amount,
        "empire_colleganza",
        c.id,
      );
    emit(tx, "colleganza_returned", x.house, {
      id: c.id,
      staked: x.amount.toString(),
      back: amount.toString(),
    });
  });
  const h = e.houses[c.traveller];
  if (h) {
    const r = h.colleganzaRecord ?? { voyages: 0, returnBps: 0 };
    h.colleganzaRecord = {
      voyages: r.voyages + 1,
      returnBps: r.returnBps + Number((theirs * 10_000n) / capital),
    };
  }
}
