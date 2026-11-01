import { median } from "./metrics.js";
import { DAY, MONTH, type Trade } from "./model.js";
import type { EmpireResult } from "./run.js";
import { power } from "./world.js";

/**
 * The days a median house of the first cohort should take to reach each Casa level (CADRAGE-v3
 * § 3.1), the calendar the calibration aims at.
 */
export const CASA_TARGET_DAYS: Record<number, number> = {
  2: 1,
  3: 1,
  4: 3,
  5: 7,
  6: 14,
  7: 21,
  8: 30,
  9: 45,
  10: 75,
  11: 90,
  12: 120,
  13: 150,
  14: 210,
  15: 270,
  16: 360,
  17: 390,
  18: 480,
  19: 600,
  20: 750,
};

export interface Check {
  code: string;
  label: string;
  target: string;
  value: string;
  pass: boolean;
}

/** The median days the houses of a cohort took to reach a Casa level, null if half never did. */
export function daysToCasa(r: EmpireResult, cohort: number, level: number): number | null {
  const hs = r.world.houses.filter((h) => h.cohort === cohort);
  if (hs.length === 0) return null;
  const reached = hs
    .map((h) => h.casaAt[level - 1])
    .filter((t): t is number => t !== undefined)
    .map((t) => (t - cohort * MONTH) / DAY);
  if (reached.length < hs.length / 2) return null;
  // The median of all, the ones that never reached it counting as last.
  const all = [...reached, ...Array(hs.length - reached.length).fill(Number.POSITIVE_INFINITY)];
  return median(all);
}

const pct = (bps: number) => `${(bps / 100).toFixed(1)} %`;
const fmt = (x: number | null) => (x === null ? "—" : x.toFixed(1));

/** The targets of CADRAGE-v3 § 13 and § 12 bis, each with its value and verdict. */
export function evaluate(r: EmpireResult): Check[] {
  const w = r.world;
  const hs = w.houses;
  const checks: Check[] = [];

  // 1. The Casa's calendar, and the later cohorts quicker.
  const reached = Object.entries(CASA_TARGET_DAYS)
    .map(([l, target]) => ({ level: Number(l), target, days: daysToCasa(r, 0, Number(l)) }))
    .filter((x) => x.days !== null || x.target <= (r.options.months * MONTH) / DAY);
  // Within half and double the target; the first days, within two days either way.
  const off = reached.filter((x) => {
    if (x.days === null) return true;
    if (x.target <= 3) return Math.abs(x.days - x.target) > 2;
    return x.days < x.target / 2 || x.days > x.target * 2;
  });
  checks.push({
    code: "casa",
    label:
      "Calendrier de la Casa (cohorte 0), entre la moitié et le double de la cible (à 2 jours près au début)",
    target: "0 palier hors bornes",
    value:
      off.length === 0
        ? "tous dans les bornes"
        : `${off.length} hors bornes (${off.map((x) => x.level).join(", ")})`,
    pass: off.length === 0,
  });
  // 2. An objective in sight within 24 h.
  const sessions = hs.reduce((n, h) => n + h.sessions, 0);
  const inSight = hs.reduce((n, h) => n + h.sessionsInSight, 0);
  const sight = sessions > 0 ? (inSight * 10_000) / sessions : 0;
  checks.push({
    code: "sight",
    label: "Tournées avec un objectif à moins de 24 h",
    target: "≥ 90 %",
    value: pct(sight),
    pass: sight >= 9_000,
  });

  // 3. The next Casa in days of income.
  const steps = r.monthly.map((m) => m.nextCasaDays).filter((x) => x > 0);
  const stepsOut = steps.filter((x) => x < 2 || x > 7);
  checks.push({
    code: "step",
    label: "Prochain palier de Casa, en jours de revenu (médiane de chaque mois)",
    target: "2 à 7 chaque mois",
    value: steps.length > 0 ? `${fmt(Math.min(...steps))} à ${fmt(Math.max(...steps))}` : "—",
    pass: steps.length > 0 && stepsOut.length === 0,
  });

  // 4. A newcomer leaves the first band of Power (the owner's target of 30 October 2026).
  const last = Math.max(...r.options.cohortMonths.filter((m) => m <= r.options.months - 1));
  const newcomers = hs.filter((h) => h.cohort === last);
  const monthsTo = (at: (h: (typeof hs)[number]) => number | undefined) => {
    const caughtIn = newcomers.map((h) => {
      const t = at(h);
      return t === undefined ? Number.POSITIVE_INFINITY : (t - h.joinedAt) / MONTH;
    });
    const reached = caughtIn.filter(Number.isFinite).length;
    return newcomers.length > 0 && reached >= newcomers.length / 2 ? median(caughtIn) : null;
  };
  const months = monthsTo((h) => h.bandCaughtAt);
  checks.push({
    code: "newcomer",
    label: `Cohorte du mois ${last} hors de la première bande de Puissance`,
    target: "en 4 à 6 mois",
    value: months === null ? "jamais dans la simulation" : `${months.toFixed(1)} mois`,
    pass: months !== null && months >= 4 && months <= 6,
  });

  // 5. The price index.
  const idx = r.daily.map((x) => x.priceIndex);
  const lo = Math.min(...idx);
  const hi = Math.max(...idx);
  checks.push({
    code: "prices",
    label: "Indice des prix",
    target: "80 à 130",
    value: `${(lo / 100).toFixed(0)} à ${(hi / 100).toFixed(0)}`,
    pass: lo >= 8_000 && hi <= 13_000,
  });

  // 6. Sinks against sources, by age.
  const young = r.monthly.map((m) => m.ratioYoung).filter((x) => x > 0);
  const old = r.monthly
    .slice(3)
    .map((m) => m.ratioOld)
    .filter((x) => x > 0);
  const yMed = median(young);
  const oMed = median(old);
  checks.push({
    code: "sinks",
    label: "Puits ÷ sources (médiane des mois), Maisons de moins de 3 mois puis plus anciennes",
    target: "0,6–0,8 puis 0,9–1,0",
    value: `${(yMed / 10_000).toFixed(2)} puis ${(oMed / 10_000).toFixed(2)}`,
    pass: yMed >= 6_000 && yMed <= 8_000 && oMed >= 9_000 && oMed <= 10_000,
  });

  // 7. The Terraferma's share of the progression.
  const terra = hs.reduce((a, h) => a + h.terraValue, 0n);
  const earned = hs.reduce((a, h) => a + h.earned, 0n);
  const terraBps = terra + earned > 0n ? Number((terra * 10_000n) / (terra + earned)) : 0;
  checks.push({
    code: "terra",
    label: "Part de la Terraferme dans la progression",
    target: "≤ 15 %",
    value: pct(terraBps),
    pass: terraBps <= 1_500,
  });

  // 8. The young houses' raw goods find a buyer in the veterans' high recipes (§ 12 bis): measured
  // on the young side, the share of their receipts while young from raw goods sold in Venice. The
  // veterans' side (the share of their raw goods made by the young) follows, for information: the
  // cohorts come by bursts, too few and too briefly young to feed 800 houses.
  const youngs = hs.filter((h) => h.cohort > 0);
  const youngEarned = youngs.reduce((a, h) => a + h.youngEarned, 0n);
  const youngRaw = youngs.reduce((a, h) => a + h.youngRawSold, 0n);
  const youngRawBps = youngEarned > 0n ? Number((youngRaw * 10_000n) / youngEarned) : 0;
  const vets = hs.filter((h) => h.casa >= 12);
  const bought = vets.reduce((n, h) => n + h.rawBought, 0);
  const fromYoung = vets.reduce((n, h) => n + h.rawBoughtFromYoung, 0);
  const youngBps = bought > 0 ? Math.round((fromYoung * 10_000) / bought) : 0;
  checks.push({
    code: "raw",
    label:
      "Bruts des jeunes Maisons (Casa ≤ 8) vendus à Venise, part de leurs recettes ; part des bruts des vétérans venue d'elles",
    target: "≥ 10 % des recettes des jeunes (cible du porteur)",
    value: `${pct(youngRawBps)} ; vétérans ${pct(youngBps)}`,
    pass: youngRawBps >= 1_000,
  });

  // 9. The arbitrage pays the voyage, without making the orders useless.
  const income = (t: Trade) => hs.reduce((a, h) => a + h.income[t], 0n);
  const total = (["orders", "market", "voyages", "extraction", "expeditions"] as Trade[]).reduce(
    (a, t) => a + income(t),
    0n,
  );
  const orders = hs.reduce((a, h) => a + h.ordersValue, 0n);
  const ordersBps = total > 0n ? Number((orders * 10_000n) / total) : 0;
  // One trade, delivering (1 November): the cities' orders are the heart of the game.
  checks.push({
    code: "orders",
    label: "Part des commandes dans les recettes",
    target: "40 à 70 %",
    value: pct(ordersBps),
    pass: ordersBps >= 4_000 && ordersBps <= 7_000,
  });
  return checks;
}

/** The report in markdown: the targets, the calendar, the trades, the top against the median. */
export function reportMarkdown(results: EmpireResult[]): string {
  const lines: string[] = ["# Simulateur de 24 mois : l'empire persistant", ""];
  const o = results[0]?.options;
  if (o)
    lines.push(
      `${o.months} mois, cohortes de ${o.cohortSize} Maisons aux mois ${o.cohortMonths.join(", ")} ; graines ${results.map((r) => r.options.seed).join(", ")}.`,
      "",
    );
  lines.push("## Les cibles (CADRAGE-v3 § 13)", "");
  const all = results.map(evaluate);
  const first = all[0] ?? [];
  lines.push(`| Cible | Visée | ${results.map((r) => `Graine ${r.options.seed}`).join(" | ")} |`);
  lines.push(`| --- | --- | ${results.map(() => "---").join(" | ")} |`);
  first.forEach((c, i) => {
    const cells = all.map((checks) => {
      const x = checks[i];
      return x ? `${x.pass ? "✓" : "✗"} ${x.value}` : "—";
    });
    lines.push(`| ${c.label} | ${c.target} | ${cells.join(" | ")} |`);
  });
  const r = results[0];
  if (!r) return lines.join("\n");
  lines.push("", `## Le calendrier de la Casa (graine ${r.options.seed})`, "");
  const cohorts = r.options.cohortMonths.filter((m) => m < r.options.months);
  lines.push(`| Casa | Cible (jours) | ${cohorts.map((c) => `Cohorte ${c}`).join(" | ")} |`);
  lines.push(`| --- | --- | ${cohorts.map(() => "---").join(" | ")} |`);
  for (const [l, target] of Object.entries(CASA_TARGET_DAYS))
    lines.push(
      `| ${l} | ${target} | ${cohorts.map((c) => fmt(daysToCasa(r, c, Number(l)))).join(" | ")} |`,
    );
  lines.push("", `## Les métiers (graine ${r.options.seed})`, "");
  lines.push(
    "| Penchant | Maisons | Casa médiane | Recettes médianes (d) | Commandes | Marché | Voyages | Exploitation | Expéditions |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const bent of ["trader", "miner", "armourer", "mixed"] as const) {
    const hs = r.world.houses.filter((h) => h.bent === bent);
    const share = (t: Trade) => {
      const all = hs.reduce((a, h) => a + h.earned, 0n);
      const part = hs.reduce((a, h) => a + h.income[t], 0n);
      return all > 0n ? pct(Number((part * 10_000n) / all)) : "—";
    };
    lines.push(
      `| ${bent} | ${hs.length} | ${median(hs.map((h) => h.casa))} | ${median(hs.map((h) => Number(h.earned / 100n)))} | ${share("orders")} | ${share("market")} | ${share("voyages")} | ${share("extraction")} | ${share("expeditions")} |`,
    );
  }
  const w = r.world;
  const powers = w.houses.map((h) => power(w, h)).sort((a, b) => b - a);
  const top = powers.slice(0, 10);
  lines.push(
    "",
    "## L'écrasement",
    "",
    `Puissance des dix premières Maisons : ${top.join(", ")} ; médiane du monde : ${median(powers)} (rapport ${(median(top) / Math.max(1, median(powers))).toFixed(1)}).`,
    "",
    "## La monnaie",
    "",
    "| Créée par | Ducats | Détruite par | Ducats |",
    "| --- | --- | --- | --- |",
  );
  const made = Object.entries(w.createdBy).sort((a, b) => Number(b[1] - a[1]));
  const lost = Object.entries(w.destroyedBy).sort((a, b) => Number(b[1] - a[1]));
  for (let i = 0; i < Math.max(made.length, lost.length); i++) {
    const m = made[i];
    const l = lost[i];
    lines.push(
      `| ${m?.[0] ?? ""} | ${m ? Number(m[1] / 100n).toLocaleString("fr-FR") : ""} | ${l?.[0] ?? ""} | ${l ? Number(l[1] / 100n).toLocaleString("fr-FR") : ""} |`,
    );
  }
  lines.push(
    "",
    `Colleganza : ${Number(w.colleganza.total / 100n).toLocaleString("fr-FR")} d engagés, dont ${Number(w.colleganza.toYoung / 100n).toLocaleString("fr-FR")} d d'une grande Maison dans le voyage d'une plus jeune.`,
    "",
    `Muda : ${w.muda.places} places vendues pour ${Number(w.muda.paid / 100n).toLocaleString("fr-FR")} d ; ${w.muda.voyages} convois, dont ${w.muda.withColleganza} en colleganza (${Number(w.muda.stakes / 100n).toLocaleString("fr-FR")} d de mises).`,
    "",
    `Entraide : ${w.aid.asked} lots demandés, ${w.aid.supplied} fournis pour ${Number(w.aid.value / 100n).toLocaleString("fr-FR")} d, dont ${Number(w.aid.toYoung / 100n).toLocaleString("fr-FR")} d aux jeunes Maisons ; ${w.companies.length} compagnies.`,
    "",
    `Violations de la comptabilité : ${results.reduce((n, x) => n + x.violations.length, 0)}. Durée : ${results.map((x) => `${(x.durationMs / 1000).toFixed(0)} s`).join(", ")}.`,
  );
  return lines.join("\n");
}
