import { DENIERS_PER_DUCAT, type Deniers } from "../money.js";
import { DAY_MS, type EmpireHouse, HOUR_MS, type PlayerId, cashAccount } from "../state.js";
import { type Tx, addStock, fail, inventoryLine, removeStock, transfer } from "../tx.js";
import { empireSettings, ownHouse } from "./house.js";
import { regionOf } from "./prices.js";

/** The company a command carries: the server's knowledge of it, never the client's. */
export interface EmpireCompanyTag {
  id: string;
  since: number;
}

const HOME = "veneto";

/**
 * Keeps the house's company as the server tells it (CADRAGE-v3 § 7): a house that left one, or
 * changed, has its requests withdrawn.
 */
export function syncCompany(tx: Tx, playerId: PlayerId, tag: EmpireCompanyTag | null): void {
  const h = ownHouse(tx, playerId);
  if ((tag?.id ?? undefined) === h.company && (tag?.since ?? undefined) === h.companySince) return;
  if (tag?.id !== h.company && tx.s.empire?.aid)
    tx.s.empire.aid = tx.s.empire.aid.filter((r) => r.house !== playerId);
  if (tag) {
    h.company = tag.id;
    h.companySince = tag.since;
  } else {
    h.company = undefined;
    h.companySince = undefined;
  }
}

/** The requests lapsed by now go, settled at the reading. */
export function settleAid(tx: Tx): void {
  const e = tx.s.empire;
  if (!e?.aid) return;
  const s = empireSettings(tx.ctx);
  e.aid = e.aid.filter((r) => tx.now - r.at < s.aid.expireHours * HOUR_MS);
}

/** Venice's reference price of a good, or why not. */
function refOf(tx: Tx, good: string): Deniers {
  const r = regionOf(HOME, empireSettings(tx.ctx));
  const ref = r.demands[good] ?? r.produces[good];
  if (ref === undefined) fail("unknown_resource");
  return ref;
}

function senior(h: EmpireHouse, now: number, minDays: number): boolean {
  return h.companySince !== undefined && now - h.companySince >= minDays * DAY_MS;
}

/** A partner asks its company for a lot: one every `everyHours`, at most `lotPerCasa` × Casa. */
export function askAid(tx: Tx, playerId: PlayerId, good: string, qty: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!h.company) fail("no_company");
  if (!senior(h, tx.now, s.aid.minDays)) fail("too_new");
  if (!Number.isInteger(qty) || qty <= 0 || qty > s.aid.lotPerCasa * h.casa)
    fail("invalid_quantity");
  const ref = refOf(tx, good);
  if (h.askedAt !== undefined && tx.now - h.askedAt < s.aid.everyHours * HOUR_MS) fail("too_soon");
  if ((tx.s.accounts[cashAccount(playerId)] ?? 0n) < ref * BigInt(qty)) fail("insufficient_funds");
  h.askedAt = tx.now;
  const e = tx.s.empire;
  if (!e) return;
  e.aid = [
    ...(e.aid ?? []),
    { id: `${playerId}:${tx.now}`, house: playerId, company: h.company, good, qty, at: tx.now },
  ];
}

/**
 * Another partner supplies the lot in one gesture: a sale at Venice's reference price, the money
 * from the asker to the supplier, the goods the other way, no tax nor wages; Merit for the
 * supplier, within its day's cap.
 */
export function supplyAid(tx: Tx, playerId: PlayerId, requestId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const e = tx.s.empire;
  const r = e?.aid?.find((x) => x.id === requestId);
  if (!e || !r) fail("unknown_order");
  if (r.house === playerId) fail("own_order");
  if (!h.company || h.company !== r.company) fail("not_same_company");
  if (!senior(h, tx.now, s.aid.minDays)) fail("too_new");
  const value = refOf(tx, r.good) * BigInt(r.qty);
  const day = Math.floor(tx.now / DAY_MS);
  const today = h.supplied?.day === day ? h.supplied.value : 0n;
  const cap = BigInt(s.aid.dailyDucatsPerCasa * h.casa) * DENIERS_PER_DUCAT;
  if (today + value > cap) fail("over_limit");
  if (inventoryLine(tx, playerId, r.good).available < r.qty) fail("insufficient_stock");
  transfer(tx, cashAccount(r.house), cashAccount(playerId), value, "empire_aid", requestId);
  removeStock(tx, playerId, r.good, r.qty, "empire_aid", requestId);
  addStock(tx, r.house, r.good, r.qty, "empire_aid", requestId);
  h.supplied = { day, value: today + value };
  h.merit =
    (h.merit ?? 0) + Number((value * BigInt(s.aid.meritPer100Ducats)) / (100n * DENIERS_PER_DUCAT));
  e.aid = e.aid?.filter((x) => x.id !== requestId);
}
