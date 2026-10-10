import type { SimulationResult } from "./sim.js";

export interface Check {
  name: string;
  target: string;
  value: string;
  pass: boolean;
  /** Diagnostics are reported but do not decide whether the milestone is done. */
  blocking: boolean;
}

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const ducats = (d: bigint) => `${(Number(d) / 100).toFixed(0)} ducats`;

/** Daily growth of money per active player, averaged over the previous 7 days. */
export function rollingMoneyGrowth(r: SimulationResult): { day: number; growth: number }[] {
  const out: { day: number; growth: number }[] = [];
  for (let i = 7; i < r.daily.length; i++) {
    const now = Number(r.daily[i]?.moneyPerActive ?? 0n);
    const before = Number(r.daily[i - 7]?.moneyPerActive ?? 0n);
    if (before > 0) out.push({ day: i, growth: (now / before) ** (1 / 7) - 1 });
  }
  return out;
}

export function evaluate(r: SimulationResult): Check[] {
  const checks: Check[] = [];
  const last = r.daily.length - 1;

  checks.push({
    name: "Invariants",
    target: "0 écart à chaque pas",
    value: `${r.violations.length} écart(s)`,
    pass: r.violations.length === 0,
    blocking: true,
  });

  // Money is not inflation by itself: players save for growing investments. The blocking checks
  // are the price index (below) and a hard cap on money per active player.
  const capital = BigInt(r.options.settings.startingCapital);
  const peak = r.daily.reduce((m, d) => (d.moneyPerActive > m ? d.moneyPerActive : m), 0n);
  checks.push({
    name: "Masse monétaire par joueur actif (plafond)",
    target: "≤ 2,5 × le capital de départ, toute la saison",
    value: `max ${ducats(peak)} (${(Number(peak) / Number(capital)).toFixed(2)} ×)`,
    pass: peak * 2n <= capital * 5n,
    blocking: true,
  });

  // Windows of 7 days that start at J+14 or later.
  const growth = rollingMoneyGrowth(r).filter((g) => g.day >= 21);
  const worst = growth.reduce((w, g) => (Math.abs(g.growth) > Math.abs(w.growth) ? g : w), {
    day: 0,
    growth: 0,
  });
  const meanGrowth = growth.reduce((a, g) => a + g.growth, 0) / Math.max(1, growth.length);
  checks.push({
    name: "Croissance de la monnaie par joueur actif",
    target: "diagnostic : moyenne glissante sur 7 jours dans ±2 %/jour, de J+14 à la fin",
    value: `moyenne ${pct(meanGrowth)}/jour, pire ${pct(worst.growth)}/jour à J+${worst.day}`,
    pass: growth.every((g) => Math.abs(g.growth) <= 0.02),
    blocking: false,
  });

  const indices = r.daily.map((d) => d.priceIndex);
  const minI = Math.min(...indices);
  const maxI = Math.max(...indices);
  checks.push({
    name: "Indice des prix du panier",
    target: "entre 80 et 130 chaque jour",
    value: `${minI.toFixed(0)} à ${maxI.toFixed(0)}`,
    pass: minI >= 80 && maxI <= 130,
    blocking: true,
  });

  const g21 = r.daily[21]?.gini ?? Number.NaN;
  checks.push({
    name: "Gini du patrimoine à J+21",
    target: "< 0,6",
    value: g21.toFixed(2),
    pass: g21 < 0.6,
    blocking: true,
  });

  const week3 = r.daily.slice(14, 21);
  const share = week3.reduce((a, d) => a + d.playerShareOfValue, 0) / Math.max(1, week3.length);
  checks.push({
    name: "Part du volume échangé entre joueurs",
    target: "> 50 % (moyenne J+14 à J+20)",
    value: pct(share),
    pass: share > 0.5,
    blocking: true,
  });

  const ratios = r.daily
    .slice(7)
    .map((d) =>
      d.destroyed > 0n ? Number(d.created) / Number(d.destroyed) : Number.POSITIVE_INFINITY,
    );
  const outside = ratios.filter((x) => x < 0.8 || x > 1.3).length;
  checks.push({
    name: "Ratio monnaie créée / détruite",
    target: "diagnostic : entre 0,8 et 1,3 (J+7 à la fin)",
    value: `${outside} jour(s) hors plage sur ${ratios.length}`,
    pass: outside <= ratios.length * 0.2,
    blocking: false,
  });

  const lastDay = r.daily[last];
  checks.push({
    name: "Joueurs actifs en fin de saison",
    target: "diagnostic",
    value: `${lastDay?.active ?? 0} / ${lastDay?.registered ?? 0}`,
    pass: true,
    blocking: false,
  });
  checks.push({
    name: "Masse monétaire par joueur actif en fin de saison",
    target: "diagnostic",
    value: ducats(lastDay?.moneyPerActive ?? 0n),
    pass: true,
    blocking: false,
  });
  return checks;
}

export function allBlockingPass(checks: Check[]): boolean {
  return checks.every((c) => c.pass || !c.blocking);
}

export function checksTable(checks: Check[]): string {
  const rows = checks.map(
    (c) => `| ${c.pass ? "✅" : c.blocking ? "❌" : "⚠️"} | ${c.name} | ${c.target} | ${c.value} |`,
  );
  return ["| | Indicateur | Cible | Valeur |", "| --- | --- | --- | --- |", ...rows].join("\n");
}
