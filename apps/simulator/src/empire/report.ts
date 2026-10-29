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

/** The ten targets of CADRAGE-v3 § 13, each with its value and verdict. */
export function evaluate(r: EmpireResult): Check[] {
  const w = r.world;
  const hs = w.houses;
  const checks: Check[] = [];

  // 1. The Casa's calendar, and the later cohorts quicker.
  const reached = Object.entries(CASA_TARGET_DAYS)
    .map(([l, target]) => ({ level: Number(l), target, days: daysToCasa(r, 0, Number(l)) }))
    .filter((x) => x.days !== null || x.target <= (r.options.months * MONTH) / DAY);
  const off = reached.filter(
    (x) => x.days === null || x.days < x.target / 2 || x.days > x.target * 2,
  );
  checks.push({
    code: "casa",
    label:
      "Calendrier de la Casa (cohorte 0), chaque palier entre la moitié et le double de la cible",
    target: "0 palier hors bornes",
    value:
      off.length === 0
        ? "tous dans les bornes"
        : `${off.length} hors bornes (${off.map((x) => x.level).join(", ")})`,
    pass: off.length === 0,
  });
  const late = r.options.cohortMonths.find((m) => m >= 3 && m <= r.options.months - 4);
  const level = 10;
  const first = daysToCasa(r, 0, level);
  const later = late !== undefined ? daysToCasa(r, late, level) : null;
  const ratio = first && later ? later / first : null;
  checks.push({
    code: "catchup",
    label: `Cohorte du mois ${late ?? "—"} plus rapide jusqu'à la Casa ${level}`,
    target: "20 à 40 % plus vite",
    value: ratio === null ? "—" : `${Math.round((1 - ratio) * 100)} % plus vite`,
    pass: ratio !== null && ratio >= 0.6 && ratio <= 0.8,
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

  // 4. A newcomer at the median Power.
  const last = Math.max(...r.options.cohortMonths.filter((m) => m <= r.options.months - 1));
  const caught = r.daily.find(
    (row) => row.day >= last * 30 && (row.cohorts[last]?.power ?? 0) >= row.worldPower,
  );
  const months = caught ? (caught.day - last * 30) / 30 : null;
  checks.push({
    code: "newcomer",
    label: `Cohorte du mois ${last} à la Puissance médiane du monde`,
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

  // 8. The vétérans buy the young houses' raw goods.
  const vets = hs.filter((h) => h.casa >= 12);
  const bought = vets.reduce((n, h) => n + h.rawBought, 0);
  const fromYoung = vets.reduce((n, h) => n + h.rawBoughtFromYoung, 0);
  const youngBps = bought > 0 ? Math.round((fromYoung * 10_000) / bought) : 0;
  checks.push({
    code: "raw",
    label: "Bruts achetés par les Maisons de Casa ≥ 12, venus de jeunes Maisons",
    target: "≥ 30 %",
    value: pct(youngBps),
    pass: youngBps >= 3_000,
  });

  // 9. The arbitrage pays the voyage, without making the orders useless.
  const voyages = hs.reduce((n, h) => n + h.voyagesDone, 0);
  const margin = hs.reduce((a, h) => a + h.voyageMargin, 0n);
  const income = (t: Trade) => hs.reduce((a, h) => a + h.income[t], 0n);
  const total = (["orders", "market", "voyages", "extraction", "expeditions"] as Trade[]).reduce(
    (a, t) => a + income(t),
    0n,
  );
  const ordersBps = total > 0n ? Number((income("orders") * 10_000n) / total) : 0;
  const perVoyage = voyages > 0 ? Number(margin / BigInt(voyages) / 100n) : 0;
  checks.push({
    code: "arbitrage",
    label: "Marge moyenne d'un voyage, et part des commandes dans les recettes",
    target: "marge > 0, commandes ≥ 25 %",
    value: `${perVoyage} d par voyage, commandes ${pct(ordersBps)}`,
    pass: perVoyage > 0 && ordersBps >= 2_500,
  });

  // 10. One trade is enough to live.
  const mono = hs.filter((h) => {
    const parts = [
      h.income.orders + h.income.market,
      h.income.voyages,
      h.income.extraction,
      h.income.expeditions,
    ];
    const sum = parts.reduce((a, x) => a + x, 0n);
    return sum > 0n && parts.some((x) => x * 10n > sum * 6n);
  }).length;
  const monoBps = hs.length > 0 ? Math.round((mono * 10_000) / hs.length) : 0;
  checks.push({
    code: "trades",
    label: "Maisons qui tirent plus de 60 % de leurs recettes d'un seul métier",
    target: "≥ 30 %",
    value: pct(monoBps),
    pass: monoBps >= 3_000,
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
    `Violations de la comptabilité : ${results.reduce((n, x) => n + x.violations.length, 0)}. Durée : ${results.map((x) => `${(x.durationMs / 1000).toFixed(0)} s`).join(", ")}.`,
  );
  return lines.join("\n");
}
