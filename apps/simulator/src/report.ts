import type { PlayerRow } from "./metrics.js";
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

export function evaluate(
  r: SimulationResult,
  twin?: SimulationResult,
  houseTwin?: SimulationResult,
): Check[] {
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

  checks.push(...venetoPrices(r));

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
  if (fam) {
    checks.push({
      name: "Familles : membres en fin de saison",
      target: "diagnostic : quatre familles vivantes, d'une taille proche",
      value: `${
        Object.entries(fam.members)
          .map(([f, n]) => `${f} ${n}`)
          .join(" · ") || "aucune"
      } · sans famille ${fam.unaffiliated}`,
      pass: true,
      blocking: false,
    });
    const days = Math.max(1, r.daily.length);
    const playerDays = r.daily.reduce((a, d) => a + d.active, 0);
    checks.push({
      name: "Campagne : lances et batailles",
      target: "diagnostic : la carte bouge toute la semaine",
      value: `${fam.levied} levées · ${fam.hired} engagées (${ducats(fam.hireCost)}, ${ducats(
        fam.hireCost / BigInt(Math.max(1, playerDays)),
      )} par marchand actif et par jour) · ${fam.marches} marches · ${fam.taken} terres prises · ${
        fam.held
      } assauts repoussés · ${fam.milanRides} chevauchées de Milan (${(fam.milanRides / days).toFixed(1)} par jour)`,
      pass: fam.taken >= days,
      blocking: false,
    });
    checks.push({
      name: "Campagne : ouvrages",
      target: "diagnostic : les familles consolident, les ouvrages tombent aussi",
      value: `${fam.worksBuilt} bâtis (${ducats(fam.worksCost)}, ${ducats(
        fam.worksCost / BigInt(Math.max(1, playerDays)),
      )} par marchand actif et par jour) · ${fam.worksRazed} rasés`,
      pass: fam.worksBuilt > 0,
      blocking: false,
    });
    const wins: Record<string, number> = {};
    for (const w of fam.weeks) if (w.winner) wins[w.winner] = (wins[w.winner] ?? 0) + 1;
    const most = Math.max(0, ...Object.values(wins));
    checks.push({
      name: "Campagne : vainqueurs des semaines",
      target: "le pouvoir change de mains (aucune famille ne gagne toutes les semaines)",
      value:
        fam.weeks
          .map(
            (w) =>
              `S${w.week + 1} ${w.winner ?? "personne"} (${Object.entries(w.glory)
                .map(([f, g]) => `${f} ${g}`)
                .join(", ")})${w.decrees.length > 0 ? ` → ${w.decrees.join(", ")}` : ""}`,
          )
          .join(" · ") || "aucune semaine close",
      pass: fam.weeks.length < 3 || most < fam.weeks.length,
      blocking: false,
    });
    checks.push({
      name: "Décrets : argent déplacé",
      target: "diagnostic : gabelle et péage partagés, faveur bornée",
      value:
        Object.entries(fam.decreeMoney)
          .map(([k, v]) => `${k.replace("decree_", "")} ${ducats(v)}`)
          .join(" · ") || "aucun",
      pass: true,
      blocking: false,
    });
  }

  checks.push(...budgetChecks(r));
  checks.push(...baleChecks(r));
  checks.push(...roadChecks(r));
  checks.push(...mudaChecks(r));
  checks.push(...masteryChecks(r));
  checks.push(...actChecks(r));
  const a = r.activity;
  if (a) {
    checks.push({
      name: "Activité : commandes livrables depuis le stock, à chaque session",
      target: "diagnostic : plus de la moitié du tableau ouvert",
      value: `${pct(a.fillableShare)} · première livraison après ${a.firstDeliveryHours.toFixed(1)} h (médiane, ${a.neverDelivered} jamais) · ${a.harvestsPerDay.toFixed(1)} récoltes et ${a.deliveriesPerDay.toFixed(1)} livraisons par joueur actif et par jour`,
      pass: true,
      blocking: false,
    });
  }
  const b = r.board;
  if (b) {
    checks.push({
      name: "Tableau commun : commandes prises",
      target: "diagnostic : la demande est disputée sans rester sur la table",
      value: `${pct(b.takenShare)} des ${b.orders} commandes en ${b.days} jours · ${pct(b.firstHourShare)} des prises dans l'heure de l'ouverture · ${b.lostPerSession.toFixed(2)} commande(s) perdue(s) au profit d'un autre par session (stock suffisant)`,
      pass: true,
      blocking: false,
    });
  }
  checks.push(...passChecks(r, twin));
  checks.push(...houseChecks(r, houseTwin));

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

/** Sources of money paid by the cities and the Doge: the budget that deliveries take over. */
export const ORDER_SOURCES = [
  "city_sale",
  "contract_reward",
  "family_order_reward",
  "criee_sale",
  "delivery",
] as const;

/** Money created per active merchant and per day, by source (J+1 to the end). */
export function createdPerActiveDay(r: SimulationResult): Record<string, number> {
  const days = r.daily.slice(1);
  const activeDays = days.reduce((a, d) => a + d.active, 0);
  const out: Record<string, number> = {};
  for (const d of days) {
    for (const [k, v] of Object.entries(d.createdBy)) out[k] = (out[k] ?? 0) + Number(v);
  }
  for (const k of Object.keys(out)) out[k] = (out[k] ?? 0) / Math.max(1, activeDays) / 100;
  return out;
}

/**
 * The goods of the Veneto at the Rialto: each one's lowest, highest and last traded price of the
 * season (in % of its reference), and the range of the Dogana's price.
 */
function venetoPrices(r: SimulationResult): Check[] {
  const refs = r.referencePrices ?? {};
  const goods = ["wheat", "flour", "bread", "clay", "bricks", "wood", "planks"].filter(
    (g) => refs[g],
  );
  const lines: string[] = [];
  let low = Number.POSITIVE_INFINITY;
  let high = 0;
  for (const g of goods) {
    const ref = Number(refs[g] ?? 1n);
    const series = r.prices
      .filter((p) => p.resource === g && p.vwap !== undefined)
      .sort((a, b) => a.day - b.day)
      .map((p) => (Number(p.vwap) * 100) / ref);
    if (series.length === 0) continue;
    const min = Math.min(...series);
    const max = Math.max(...series);
    low = Math.min(low, min);
    high = Math.max(high, max);
    lines.push(`${g} ${min.toFixed(0)}–${max.toFixed(0)} (fin ${(series.at(-1) ?? 0).toFixed(0)})`);
  }
  const dogana = Object.entries(r.doganaRange ?? {})
    .filter(([g]) => goods.includes(g))
    .map(([, [a, b]]) => [a / 100, b / 100]);
  const dLow = Math.min(...dogana.map(([a]) => a ?? 100));
  const dHigh = Math.max(...dogana.map(([, b]) => b ?? 100));
  return [
    {
      name: "Cours du Veneto au Rialto (% de la référence)",
      target: "diagnostic : des prix qui bougent, dans 80 à 130 de préférence",
      value: `${lines.join(" · ")} ; Dogana ${dLow.toFixed(0)} à ${dHigh.toFixed(0)}`,
      pass: low >= 80 && high <= 130,
      blocking: false,
    },
  ];
}

/** The galleys of the Muda: the only source of goods from overseas since the sea was removed. */
export function mudaChecks(r: SimulationResult): Check[] {
  const m = r.muda;
  if (!m || m.arrivals === 0) return [];
  const merchants = Object.keys(r.finalState?.players ?? {}).length;
  return [
    {
      name: "Galères de la Muda : lots vendus",
      target: "50 à 100 % de ce qu'elles apportent",
      value: `${pct(m.sold / Math.max(1, m.brought))} (${m.sold} sur ${m.brought} unités, ${m.arrivals} arrivées, ${(Number(m.takings) / 100).toFixed(0)} ducats)`,
      pass: m.sold >= 0.5 * m.brought,
      blocking: false,
    },
    {
      name: "Acheteurs à la Muda",
      target: "au moins un marchand sur deux",
      value: `${m.buyers} sur ${merchants}`,
      pass: m.buyers * 2 >= merchants,
      blocking: false,
    },
    {
      name: "Commandes d'exotiques",
      target: "diagnostic : prises, et part de l'argent des livraisons",
      value: `${m.exoticTaken} prises sur ${m.exoticOrders} (${pct(m.exoticTaken / Math.max(1, m.exoticOrders))}), ${pct(m.exoticPaidShare)} de l'argent des livraisons`,
      pass: true,
      blocking: false,
    },
  ];
}

/** The road (deliveries and vehicles), with the targets of docs/plan-livraisons.md § 7. */
export function roadChecks(r: SimulationResult): Check[] {
  const road = r.road;
  if (!road || road.dispatched === 0) return [];
  const destroyed = r.daily.reduce(
    (acc, d) => {
      for (const k of ["vehicle"]) acc[k] = (acc[k] ?? 0) + Number(d.destroyedBy[k] ?? 0n);
      return acc;
    },
    {} as Record<string, number>,
  );
  const allDestroyed = r.daily.reduce((a, d) => a + Number(d.destroyed), 0);
  const transport = Object.values(destroyed).reduce((a, b) => a + b, 0);
  return [
    {
      name: "Livraisons",
      target: "diagnostic",
      value: `${road.dispatched} parties, ${road.perMerchantDay.toFixed(1)} par marchand et par jour, ${road.vehiclesPerMerchant.toFixed(1)} véhicule(s) par marchand`,
      pass: true,
      blocking: false,
    },
    {
      name: "Utilisation des véhicules (assidus)",
      target: "50 à 80 % de la journée (8 h – 22 h)",
      value: `${pct(road.utilization)} (occasionnels ${pct(road.utilizationCasual)})`,
      pass: road.utilization >= 0.5 && road.utilization <= 0.8,
      blocking: false,
    },
    {
      name: "Marge d'un livreur (gain par heure de route)",
      target: "diagnostic",
      value: `${(road.deliveryMarginPerHour / 100).toFixed(1)} ducats par heure`,
      pass: true,
      blocking: false,
    },
    {
      name: "Monnaie détruite par le transport",
      target: "diagnostic : achats et améliorations de véhicules",
      value: `${(transport / 100).toFixed(0)} ducats (${pct(transport / Math.max(1, allDestroyed))} des destructions) : ${Object.entries(
        destroyed,
      )
        .map(([k, v]) => `${k} ${(v / 100).toFixed(0)}`)
        .join(" · ")}`,
      pass: true,
      blocking: false,
    },
  ];
}

/**
 * Masteries: how many houses chose each one, and their median net worth at the close, compared
 * within each play style (a mastery should not crush the others).
 */
export function masteryChecks(r: SimulationResult): Check[] {
  const state = r.finalState;
  if (!state) return [];
  const final = finalWorth(r);
  const byProfile = new Map<string, Map<string, number[]>>();
  const counts = new Map<string, number>();
  for (const p of final) {
    const m = state.players[p.playerId]?.specialty ?? "aucune";
    counts.set(m, (counts.get(m) ?? 0) + 1);
    const line = byProfile.get(p.profile) ?? new Map<string, number[]>();
    line.set(m, [...(line.get(m) ?? []), Number(p.netWorth)]);
    byProfile.set(p.profile, line);
  }
  if (counts.size === 0 || (counts.size === 1 && counts.has("aucune"))) return [];
  // Largest lead of one mastery over another, within a play style, among groups of 2 or more.
  let lead = 0;
  let where = "";
  const detail: string[] = [];
  for (const [profile, line] of byProfile) {
    const groups = [...line.entries()]
      .filter(([m, v]) => m !== "aucune" && v.length >= 2)
      .map(([m, v]) => ({ m, n: v.length, worth: median(v) }))
      .sort((a, b) => b.worth - a.worth);
    if (groups.length >= 2) {
      detail.push(
        `${profile} : ${groups.map((g) => `${g.m} ${Math.round(g.worth / 100)} (${g.n})`).join(", ")}`,
      );
      const top = groups[0];
      const low = groups[groups.length - 1];
      if (top && low && top.worth / low.worth - 1 > lead) {
        lead = top.worth / low.worth - 1;
        where = `${profile} : ${top.m} devant ${low.m}`;
      }
    }
  }
  return [
    {
      name: "Maîtrises choisies (marchands présents en fin de saison)",
      target: "diagnostic",
      value: [...counts.entries()].map(([m, n]) => `${m} ${n}`).join(" · "),
      pass: true,
      blocking: false,
    },
    {
      name: "Avance d'une maîtrise sur une autre, à profil égal",
      target: "≤ 15 % (patrimoine médian)",
      value: `${pct(lead)}${where ? ` (${where})` : ""}${detail.length ? ` — ${detail.join(" ; ")}` : ""}`,
      pass: lead <= 0.15,
      blocking: false,
    },
  ];
}

/** The season in acts: money paid for goods (deliveries and worksites) per active merchant and day, act by act. */
export function actChecks(r: SimulationResult): Check[] {
  const acts = [...(r.options.settings.acts ?? [])].sort((a, b) => a.week - b.week);
  if (acts.length === 0) return [];
  const sources = [...ORDER_SOURCES, "project_delivery"];
  const parts = acts.map((a, i) => {
    const from = a.week * 7;
    const to = acts[i + 1] ? (acts[i + 1]?.week ?? 0) * 7 : r.options.days;
    const days = r.daily.filter((d) => d.day >= Math.max(1, from) && d.day < to);
    const active = days.reduce((n, d) => n + d.active, 0);
    const paid = days.reduce(
      (n, d) => n + sources.reduce((m, k) => m + Number(d.createdBy[k] ?? 0n), 0),
      0,
    );
    return `${a.code} ${(paid / Math.max(1, active) / 100).toFixed(1)}`;
  });
  return [
    {
      name: "Monnaie payée par acte (ducats / joueur actif / jour)",
      target: "diagnostic : les actes se sentent",
      value: parts.join(" · "),
      pass: true,
      blocking: false,
    },
  ];
}

/** Diagnostics of the money paid for goods (cities, Doge, Criées, deliveries). */
export function budgetChecks(r: SimulationResult): Check[] {
  const per = createdPerActiveDay(r);
  const total = ORDER_SOURCES.reduce((a, k) => a + (per[k] ?? 0), 0);
  const final = finalWorth(r);
  const frequent = new Set(["producer", "artisan", "builder", "speculator"]);
  const mFrequent = median(
    final.filter((p) => frequent.has(p.profile)).map((p) => Number(p.netWorth)),
  );
  const mCasual = median(
    final.filter((p) => p.profile === "casual").map((p) => Number(p.netWorth)),
  );
  const sFrequent = median(
    final.filter((p) => frequent.has(p.profile)).map((p) => Number(p.turnover)),
  );
  const sCasual = median(
    final.filter((p) => p.profile === "casual").map((p) => Number(p.turnover)),
  );
  const sales = final.map((p) => Number(p.turnover));
  return [
    {
      name: "Monnaie payée pour les marchandises, par joueur actif et par jour",
      target: "diagnostic : budget des villes, du Doge et des Criées (ou des livraisons)",
      value: `${total.toFixed(1)} ducats (${ORDER_SOURCES.filter((k) => per[k])
        .map((k) => `${k} ${(per[k] ?? 0).toFixed(1)}`)
        .join(" · ")})`,
      pass: true,
      blocking: false,
    },
    {
      name: "Assidus devant occasionnels (patrimoine médian en fin de saison)",
      target: "diagnostic : +5 à +10 %",
      value: Number.isNaN(mCasual) ? "—" : pct(mFrequent / mCasual - 1),
      pass: true,
      blocking: false,
    },
    {
      name: "Assidus devant occasionnels (ventes nettes médianes en fin de saison)",
      target: "diagnostic : le classement récompense l'activité",
      value: Number.isNaN(sCasual) ? "—" : pct(sFrequent / sCasual - 1),
      pass: true,
      blocking: false,
    },
    {
      name: "Ventes nettes de la saison par marchand actif (titres)",
      target: "diagnostic : médiane, 75e et 90e centiles, meilleur",
      value: [0.5, 0.75, 0.9, 1]
        .map((q) => ducats(BigInt(Math.round(quantile(sales, q)))))
        .join(" · "),
      pass: true,
      blocking: false,
    },
  ];
}

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : (s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0);
}

/**
 * Faraj's bales: value at reference prices per merchant and per day present, frequent players
 * against casual ones, next to the money paid for goods (docs/calibration.md).
 */
export function baleChecks(r: SimulationResult): Check[] {
  const b = r.bales;
  if (!b || b.opened === 0) return [];
  const per = createdPerActiveDay(r);
  const paid = ORDER_SOURCES.reduce((a, k) => a + (per[k] ?? 0), 0);
  const frequent = new Set(["producer", "artisan", "builder", "speculator"]);
  // Days present per merchant (one row per day from joining), and the profile of each.
  const days: Record<string, number> = {};
  const profile: Record<string, string> = {};
  for (const p of r.players) {
    if (!p.active) continue;
    days[p.playerId] = (days[p.playerId] ?? 0) + 1;
    profile[p.playerId] = p.profile;
  }
  const perDay = (keep: (profile: string) => boolean) => {
    let value = 0;
    let n = 0;
    for (const [id, d] of Object.entries(days)) {
      if (!keep(profile[id] ?? "")) continue;
      value += b.valueBy[id] ?? 0;
      n += d;
    }
    return n > 0 ? value / n / 100 : Number.NaN;
  };
  const all = perDay(() => true);
  const assidus = perDay((p) => frequent.has(p));
  const casual = perDay((p) => p === "casual");
  const cards = Object.values(b.cards).reduce((a, n) => a + n, 0);
  const share = (code: string) => pct((b.cards[code] ?? 0) / Math.max(1, cards));
  return [
    {
      name: "Ballots de Faraj, valeur par marchand actif et par jour",
      target: "diagnostic : environ 15 % de la monnaie payée pour les marchandises",
      value: `${all.toFixed(1)} ducats (${pct(all / Math.max(1, paid))} de ${paid.toFixed(1)}) ; assidus ${assidus.toFixed(1)}, occasionnels ${Number.isNaN(casual) ? "—" : casual.toFixed(1)}`,
      pass: true,
      blocking: false,
    },
    {
      name: "Ballots de Faraj, cartes tirées",
      target: "diagnostic : légendaires vraiment rares",
      value: `${b.opened} ballots, ${cards} cartes : commune ${share("common")}, peu commune ${share("uncommon")}, rare ${share("rare")}, épique ${share("epic")}, légendaire ${share("legendary")} (${b.cards.legendary ?? 0})`,
      pass: true,
      blocking: false,
    },
  ];
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
  return [
    ...passChecksOn(r, twin, "patrimoine", (p) => p.netWorth),
    ...passChecksOn(r, twin, "ventes nettes", (p) => p.turnover),
  ];
}

/** The same three guard rails on one measure: net worth (the rule) or net sales (the ranking). */
function passChecksOn(
  r: SimulationResult,
  twin: SimulationResult | undefined,
  measure: string,
  value: (p: PlayerRow) => bigint,
): Check[] {
  const holders = new Set(r.passHolders ?? []);
  if (holders.size === 0) return [];
  const final = finalWorth(r);
  const checks: Check[] = [];
  if (twin) {
    const before = new Map(finalWorth(twin).map((p) => [p.playerId, Number(value(p))]));
    const ratios = (paid: boolean) =>
      final
        .filter(
          (p) =>
            holders.has(p.playerId) === paid && (before.get(p.playerId) ?? 0) > 0 && value(p) > 0n,
        )
        .map((p) => Number(value(p)) / (before.get(p.playerId) ?? 1));
    const gap = median(ratios(true)) / median(ratios(false)) - 1;
    checks.push({
      name: `Pass : avance des abonnés en ${measure} (même saison rejouée sans Pass)`,
      target: "≤ +5 % (médiane, au-delà de l'effet sur les non-abonnés)",
      value: Number.isNaN(gap) ? "—" : pct(gap),
      pass: Number.isNaN(gap) || gap <= 0.05,
      blocking: true,
    });
  }
  const frequent = new Set(["producer", "artisan", "builder", "speculator"]);
  const top = [...final].sort((a, b) => Number(value(b) - value(a))).slice(0, 10);
  const topShare = top.filter((p) => holders.has(p.playerId)).length / Math.max(1, top.length);
  const share = final.filter((p) => holders.has(p.playerId)).length / Math.max(1, final.length);
  const freeFrequent = median(
    final
      .filter((p) => frequent.has(p.profile) && !holders.has(p.playerId))
      .map((p) => Number(value(p))),
  );
  const paidCasual = median(
    final
      .filter((p) => p.profile === "casual" && holders.has(p.playerId))
      .map((p) => Number(value(p))),
  );
  checks.push(
    {
      name: `Pass : part des abonnés dans le top 10 (${measure})`,
      target: `≤ 35 % (ils sont ${pct(share)} des marchands)`,
      value: pct(topShare),
      pass: topShare <= 0.35,
      blocking: true,
    },
    {
      name: `Pass : un gratuit assidu devant un abonné occasionnel (${measure})`,
      target: `${measure} médian supérieur`,
      value: Number.isNaN(paidCasual)
        ? "pas d'abonné occasionnel"
        : `${ducats(BigInt(Math.round(freeFrequent)))} contre ${ducats(BigInt(Math.round(paidCasual)))}`,
      pass: Number.isNaN(paidCasual) || freeFrequent > paidCasual,
      blocking: true,
    },
  );
  return checks;
}

/** Influence the plan's whole catalogue costs (docs/plan-progression.md), cosmetics aside. */
const CATALOGUE = 615;

/** What patents bring in a season, against the same season replayed without (medians). */
export function houseGaps(
  r: SimulationResult,
  twin: SimulationResult,
): { lead: number; others: number } | undefined {
  const holders = new Set(r.patentHolders ?? []);
  if (holders.size === 0) return undefined;
  const before = new Map(finalWorth(twin).map((p) => [p.playerId, Number(p.turnover)]));
  const ratios = (held: boolean) =>
    finalWorth(r)
      .filter(
        (p) =>
          holders.has(p.playerId) === held && (before.get(p.playerId) ?? 0) > 0 && p.turnover > 0n,
      )
      .map((p) => Number(p.turnover) / (before.get(p.playerId) ?? 1));
  const held = median(ratios(true));
  const others = median(ratios(false));
  return { lead: held / others - 1, others: others - 1 };
}

/**
 * The house between seasons (with `patentShare` > 0, docs/plan-progression.md). One season
 * replayed without patents diverges from the original: its gaps swing by ±20 %, so the seed only
 * reports them, and the rule (at most 15 % ahead, the others losing nothing) is judged on the
 * median over the seeds (`houseVerdict`).
 */
export function houseChecks(r: SimulationResult, twin?: SimulationResult): Check[] {
  const checks: Check[] = [];
  const gaps = twin ? houseGaps(r, twin) : undefined;
  if (gaps) {
    checks.push(
      {
        name: "Maison : avance des patentes en ventes nettes (même saison rejouée sans patente)",
        target: "≤ +15 % en médiane des graines (voir la synthèse)",
        value: Number.isNaN(gaps.lead) ? "—" : pct(gaps.lead),
        pass: true,
        blocking: false,
      },
      {
        name: "Maison : ventes nettes des marchands sans patente (même saison rejouée sans patente)",
        target: "≥ −5 % en médiane des graines (voir la synthèse)",
        value: Number.isNaN(gaps.others) ? "—" : pct(gaps.others),
        pass: true,
        blocking: false,
      },
    );
  }
  if (r.influence) {
    const ids = finalWorth(r).map((p) => p.playerId);
    const of = (id: string, k: "mission" | "commerce" | "campaign" | "season") =>
      r.influence?.[id]?.[k] ?? 0;
    const all = ids.map(
      (id) => of(id, "mission") + of(id, "commerce") + of(id, "campaign") + of(id, "season"),
    );
    const missions = median(ids.map((id) => of(id, "mission")));
    const sorted = [...all].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    checks.push({
      name: "Maison : Influence gagnée dans la saison (marchands actifs)",
      target: "par les missions seules ; le catalogue du plan (≈ 615) en plusieurs saisons",
      value: `médiane ${median(all)} (missions ${missions}), 9e décile ${p90}, catalogue en ${median(all) > 0 ? Math.ceil(CATALOGUE / median(all)) : "—"} saisons`,
      pass: true,
      blocking: false,
    });
  }
  return checks;
}

/** The rule on the median over the seeds: patents at most 15 % ahead, the others losing nothing. */
export function houseVerdict(gaps: { lead: number; others: number }[]): Check[] {
  if (gaps.length === 0) return [];
  const lead = median(gaps.map((g) => g.lead));
  const others = median(gaps.map((g) => g.others));
  return [
    {
      name: `Maison : avance des patentes, médiane de ${gaps.length} graines`,
      target: "≤ +15 %",
      value: pct(lead),
      pass: lead <= 0.15,
      blocking: true,
    },
    {
      name: `Maison : marchands sans patente, médiane de ${gaps.length} graines`,
      target: "≥ −5 %",
      value: pct(others),
      pass: others >= -0.05,
      blocking: true,
    },
  ];
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
