import { draw } from "../draw.js";
import { Rng } from "../rng.js";
import { DAY_MS, type EmpireDeposit, type EmpireHouse, HOUR_MS, type PlayerId } from "../state.js";
import { type Tx, addStock, fail } from "../tx.js";
import { depositStock, extract, teamRate } from "./deposits.js";
import { houseEffect } from "./effects.js";
import { empireSettings, isAsleep, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";
import { HOME_POST, putAt, storeOf, takeAt, wherePut } from "./stores.js";
import { counterLevel } from "./trade.js";

const dayOf = (now: number) => Math.floor(now / DAY_MS);
/** No world sleeps longer than this without a command: the days before are not drawn again. */
const CATCH_UP_DAYS = 14;

/** The teams a house sends out (CADRAGE-v3 § 3 bis): none before the Casa that opens them. */
export function extractionTeams(h: EmpireHouse, s: EmpireSettings): number {
  const { teamsFromCasa, casaPerTeam } = s.deposits;
  if (h.casa < teamsFromCasa) return 0;
  return 1 + Math.floor((h.casa - teamsFromCasa) / casaPerTeam) + houseEffect(h, "teamsExtra", s);
}

/** One of a region's goods, the dearer the likelier (a deposit of alum before one of salt). */
function valuable(rng: Rng, produces: Record<string, bigint>): string | undefined {
  const goods = Object.entries(produces);
  const total = goods.reduce((a, [, p]) => a + Number(p), 0);
  let pick = rng.next() * total;
  for (const [good, p] of goods) {
    pick -= Number(p);
    if (pick < 0) return good;
  }
  return goods[0]?.[0];
}

/**
 * The deposits of the days gone by, drawn by the world's seed: each region where houses are gets
 * its chance a day, the more houses the more deposits (profondeur.md § A).
 */
function drawDeposits(tx: Tx): void {
  const s = empireSettings(tx.ctx);
  const empire = tx.s.empire;
  if (!empire) return;
  const today = dayOf(tx.now);
  const last = empire.depositsDay ?? today;
  empire.depositsDay = today;
  const houses = Object.values(empire.houses).filter((h) => !isAsleep(h, tx.now, s));
  for (let day = Math.max(last + 1, today - CATCH_UP_DAYS + 1); day <= today; day++) {
    for (const r of s.regions) {
      const there = houses.filter((h) => counterLevel(h, r.code) > 0).length;
      if (there === 0 || Object.keys(r.produces).length === 0) continue;
      const rate = Math.round(
        (s.deposits.spawnBpsPerRegionDay * Math.max(1, there)) / s.deposits.housesPerDeposit,
      );
      const rng = new Rng(draw(tx.ctx, `deposit:${r.code}:${day}`));
      const count = Math.floor(rate / 10_000) + (rng.next() * 10_000 < rate % 10_000 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const good = valuable(rng, r.produces);
        if (!good) continue;
        empire.deposits = [
          ...(empire.deposits ?? []),
          {
            id: `d${day}${r.code}${i}`,
            region: r.code,
            good,
            stock: depositStock(rng, s),
            at: tx.now,
            teams: [],
          },
        ];
      }
    }
  }
}

/**
 * The extraction since the last read, every deposit's: its teams share it in proportion to their
 * rates (the yield module gives more); what they take goes to the store, held where it was found.
 * A spent deposit goes, its teams come home.
 */
function settleExtraction(tx: Tx): void {
  const s = empireSettings(tx.ctx);
  const empire = tx.s.empire;
  if (!empire?.deposits) return;
  for (const dep of empire.deposits) {
    const hours = (tx.now - dep.at) / HOUR_MS;
    dep.at = tx.now;
    if (dep.teams.length === 0 || hours <= 0) continue;
    const rates = dep.teams.map((id) => teamRate(houseEffect(empire.houses[id], "yield", s), s));
    const r = extract(dep.stock, rates, hours);
    dep.stock = r.left;
    dep.teams.forEach((id, i) => {
      const h = empire.houses[id];
      const qty = r.taken[i] ?? 0;
      if (!h || qty <= 0) return;
      // Into the house's counter in the deposit's region (the map that grows).
      putAt(tx, h, id, wherePut(h, s, dep.region), dep.good, qty, "empire_extract", dep.id);
      const found = h.found?.[dep.good] ?? [];
      if (!found.includes(dep.region))
        h.found = { ...(h.found ?? {}), [dep.good]: [...found, dep.region] };
    });
  }
  const spent = empire.deposits.filter((d) => d.stock <= 0);
  for (const dep of spent)
    for (const id of dep.teams) {
      const h = empire.houses[id];
      if (h) h.teams = (h.teams ?? []).filter((x) => x !== dep.id);
    }
  empire.deposits = empire.deposits.filter((d) => d.stock > 0);
}

/** The deposits' day: drawn, then worked up to now. At the start of each command of the empire. */
export function settleDeposits(tx: Tx): void {
  settleExtraction(tx);
  drawDeposits(tx);
}

/**
 * Sends a team to a deposit: of a region where the house is, or anywhere with the remote
 * concession; within its teams.
 */
export function sendTeam(tx: Tx, playerId: PlayerId, depositId: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const dep: EmpireDeposit | undefined = tx.s.empire?.deposits?.find((d) => d.id === depositId);
  if (!dep) fail("unknown_target");
  const teams = extractionTeams(h, s);
  if (teams === 0) fail("requirement_unmet");
  if (counterLevel(h, dep.region) <= 0 && houseEffect(h, "range", s) <= 0) fail("unknown_region");
  if ((h.teams ?? []).length >= teams || dep.teams.includes(playerId)) fail("no_build_slot");
  dep.teams.push(playerId);
  h.teams = [...(h.teams ?? []), dep.id];
}
