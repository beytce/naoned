import { DAY, type House, type World } from "./model.js";
import { addStock, market, takeStock, transfer } from "./world.js";

/**
 * The company and its entraide (CADRAGE-v3 § 7), as the model plays them: a house joins on
 * arrival the smallest company, so that they mix the ages, one company for some 17 houses, 25 at
 * most; a young house asks the inputs it lacks, a partner supplies them from what it holds beyond
 * its own needs, at Venice's reference price, the money moved between them (neither made nor
 * destroyed).
 */

const PER_COMPANY = 17;

export function joinCompany(w: World, h: House) {
  const max = w.s.company.max;
  const open = w.companies.filter((c) => c.members.length < max);
  const wanted = Math.ceil((w.houses.length + 1) / PER_COMPANY);
  let c = open.sort((a, b) => a.members.length - b.members.length)[0];
  if (!c || w.companies.length < wanted) {
    c = { id: w.companies.length, members: [] };
    w.companies.push(c);
  }
  c.members.push(h.id);
  h.company = c.id;
  h.companySince = w.now;
}

const refOf = (w: World, good: string) =>
  w.markets.has(`veneto:${good}`) ? market(w, "veneto", good).ref : null;

/** A partner asks a lot of a good it lacks; how many it asked (0 when it may not). */
export function askAid(w: World, h: House, good: string, qty: number): number {
  const a = w.s.aid;
  if (h.company === undefined || w.now - h.companySince < a.minDays * DAY) return 0;
  if (h.askedAt !== undefined && w.now - h.askedAt < a.everyHours) return 0;
  const ref = refOf(w, good);
  const n = Math.min(Math.floor(qty), a.lotPerCasa * h.casa);
  if (ref === null || n <= 0 || h.cash < ref * BigInt(n)) return 0;
  h.askedAt = w.now;
  w.aid.requests.push({ house: h.id, company: h.company, good, qty: n, at: w.now });
  w.aid.asked++;
  return n;
}

/** A partner supplies the requests of its company it can, from what it holds beyond its needs. */
export function supplyAid(w: World, h: House, keep: (good: string) => number) {
  const a = w.s.aid;
  if (h.company === undefined || w.now - h.companySince < a.minDays * DAY) return;
  w.aid.requests = w.aid.requests.filter((r) => w.now - r.at < a.expireHours);
  const day = Math.floor(w.now / DAY);
  if (h.supplied.day !== day) h.supplied = { day, value: 0n };
  const cap = BigInt(a.dailyDucatsPerCasa * h.casa) * 100n;
  for (const r of [...w.aid.requests]) {
    if (r.company !== h.company || r.house === h.id) continue;
    const asker = w.houses[r.house];
    const ref = refOf(w, r.good);
    if (!asker || ref === null) continue;
    const value = ref * BigInt(r.qty);
    if (h.supplied.value + value > cap || asker.cash < value) continue;
    if ((h.stock.get(r.good) ?? 0) - keep(r.good) < r.qty) continue;
    takeStock(h, r.good, r.qty);
    addStock(asker, r.good, r.qty);
    transfer(asker, h, value);
    h.supplied.value += value;
    w.aid.requests = w.aid.requests.filter((x) => x !== r);
    w.aid.supplied++;
    w.aid.value += value;
    if (asker.casa <= w.m.youngCasa) w.aid.toYoung += value;
  }
}
