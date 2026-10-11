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

export function evaluate(r: SimulationResult, twin?: SimulationResult): Check[] {
  const checks: Check[] = [];
  const dep = r.interdependence;
  if (dep) {
    checks.push({
      name: "Marchands qui achètent une matière première",
      target: "diagnostic : interdépendance des régions",
      value: `${dep.rawBuyers} / ${dep.merchants}`,
      pass: true,
      blocking: false,
    });
    checks.push({
      name: "Types d'ateliers par marchand (fin de saison)",
      target: "diagnostic : spécialisation",
      value: dep.typesPerMerchant.toFixed(1),
      pass: true,
      blocking: false,
    });
    checks.push({
      name: "Niveau moyen des ateliers (fin de saison)",
      target: "diagnostic : progression",
      value: `${dep.avgLevel.toFixed(2)} · ${(dep.topLevelShare * 100).toFixed(0)} % au niveau maximal`,
      pass: true,
      blocking: false,
    });
    checks.push({
      name: "Niveaux d'ateliers par marchand (fin de saison)",
      target: "diagnostic : développement (un atelier neuf compte 1)",
      value: dep.levelsPerMerchant.toFixed(1),
      pass: true,
      blocking: false,
    });
  }
  const last = r.daily.length - 1;
  // Milestones scale with the length of the season (a calendar month): a third, a half.
  const days = r.options.days;
  const third = Math.round(days / 3);
  const half = Math.round(days / 2);

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

  // Windows of 7 days that start a third of the way into the season or later.
  const growth = rollingMoneyGrowth(r).filter((g) => g.day >= third + 7);
  const worst = growth.reduce((w, g) => (Math.abs(g.growth) > Math.abs(w.growth) ? g : w), {
    day: 0,
    growth: 0,
  });
  const meanGrowth = growth.reduce((a, g) => a + g.growth, 0) / Math.max(1, growth.length);
  checks.push({
    name: "Croissance de la monnaie par joueur actif",
    target: `diagnostic : moyenne glissante sur 7 jours dans ±2 %/jour, de J+${third} à la fin`,
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

  const gHalf = r.daily[half]?.gini ?? Number.NaN;
  checks.push({
    name: `Gini du patrimoine à J+${half}`,
    target: "< 0,6",
    value: gHalf.toFixed(2),
    pass: gHalf < 0.6,
    blocking: true,
  });

  const week3 = r.daily.slice(third, half);
  const share = week3.reduce((a, d) => a + d.playerShareOfValue, 0) / Math.max(1, week3.length);
  checks.push({
    name: "Part du volume échangé entre joueurs",
    target: `> 50 % (moyenne J+${third} à J+${half - 1})`,
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

  const fam = r.families;
  if (fam && Object.keys(fam.members).length > 0) {
    const destroyed = r.daily.reduce((a, d) => a + d.destroyed, 0n);
    checks.push({
      name: "Familles : membres en fin de saison",
      target: "diagnostic : aucune famille vide",
      value: Object.entries(fam.members)
        .map(([f, n]) => `${f} ${n}`)
        .join(" · "),
      pass: true,
      blocking: false,
    });
    checks.push({
      name: "Familles : au pouvoir chaque semaine",
      target: "diagnostic : le pouvoir change de mains",
      value: fam.winners.map((w) => w ?? "—").join(", "),
      pass: true,
      blocking: false,
    });
    checks.push({
      name: "Familles : commandes livrées et mécénat",
      target: "diagnostic : le mécénat est un puits",
      value: `${fam.orders} commandes · mécénat ${ducats(fam.patronage)} (${pct(
        Number(fam.patronage) / Math.max(1, Number(destroyed)),
      )} des destructions)`,
      pass: true,
      blocking: false,
    });
  }

  checks.push(...passChecks(r, twin));

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

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length === 0
    ? Number.NaN
    : s.length % 2
      ? (s[m] ?? 0)
      : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

/** Final net worth of the bots that started the season and were still active at its end. */
function finalWorth(r: SimulationResult) {
  const lastDay = Math.max(...r.players.map((p) => p.day));
  return r.players.filter((p) => p.day === lastDay && p.active && !p.playerId.startsWith("late"));
}

/**
 * Guard rails of the Pass Négociant (with `passShare` > 0): light, never crushing.
 * `twin` is the same season replayed with the Pass's perks off: each merchant is compared with
 * itself, and the Pass's effect is what holders gain beyond what everyone else gains.
 */
export function passChecks(r: SimulationResult, twin?: SimulationResult): Check[] {
  const holders = new Set(r.passHolders ?? []);
  if (holders.size === 0) return [];
  const final = finalWorth(r);
  const checks: Check[] = [];
  if (twin) {
    const before = new Map(finalWorth(twin).map((p) => [p.playerId, Number(p.netWorth)]));
    const ratios = (paid: boolean) =>
      final
        .filter((p) => holders.has(p.playerId) === paid && (before.get(p.playerId) ?? 0) > 0)
        .map((p) => Number(p.netWorth) / (before.get(p.playerId) ?? 1));
    const gap = median(ratios(true)) / median(ratios(false)) - 1;
    checks.push({
      name: "Pass : avance des abonnés (même saison rejouée sans Pass)",
      target: "≤ +5 % (médiane, au-delà de l'effet sur les non-abonnés)",
      value: Number.isNaN(gap) ? "—" : pct(gap),
      pass: Number.isNaN(gap) || gap <= 0.05,
      blocking: true,
    });
  }
  const frequent = new Set(["producer", "artisan", "builder", "speculator"]);
  const top = [...final].sort((a, b) => Number(b.netWorth - a.netWorth)).slice(0, 10);
  const topShare = top.filter((p) => holders.has(p.playerId)).length / Math.max(1, top.length);
  const share = final.filter((p) => holders.has(p.playerId)).length / Math.max(1, final.length);
  const freeFrequent = median(
    final
      .filter((p) => frequent.has(p.profile) && !holders.has(p.playerId))
      .map((p) => Number(p.netWorth)),
  );
  const paidCasual = median(
    final
      .filter((p) => p.profile === "casual" && holders.has(p.playerId))
      .map((p) => Number(p.netWorth)),
  );
  checks.push(
    {
      name: "Pass : part des abonnés dans le top 10",
      target: `≤ 35 % (ils sont ${pct(share)} des marchands)`,
      value: pct(topShare),
      pass: topShare <= 0.35,
      blocking: true,
    },
    {
      name: "Pass : un gratuit assidu devant un abonné occasionnel",
      target: "patrimoine médian supérieur",
      value: Number.isNaN(paidCasual)
        ? "pas d'abonné occasionnel"
        : `${ducats(BigInt(Math.round(freeFrequent)))} contre ${ducats(BigInt(Math.round(paidCasual)))}`,
      pass: Number.isNaN(paidCasual) || freeFrequent > paidCasual,
      blocking: true,
    },
  );
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
