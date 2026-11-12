/**
 * The shared board at the bench (docs/plan-planche.md, CADRAGE-v4 § 17 step 2): Venice's eight
 * houses, all held by the computer, over a tide of six weeks. Do the threads move? Does one way of
 * playing take everything? Does visiting eight times a day bring more than three? Is every denier
 * accounted for? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator planche-bench [seeds]
 */
import {
  type PlancheSetup,
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheIsCorsair,
  plancheLaurel,
  planchePrice,
  plancheRobot,
  plancheStanding,
  venice1450Lagune,
  venice1450Planche,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const WEEKS = 6;
const SEEDS = Number(process.argv[2]) || 5;
const T0 = Date.parse("2026-11-16T06:00:00Z");

interface Run {
  s: PlancheState;
  moves: Record<string, number>;
  low: Record<string, number>;
  mean: Record<string, number>;
  /** Each week's rivals, every house counted as a person's (docs/plan-classement.md R2). */
  rivals: Record<string, string>[];
}

/**
 * A tide. Each house visits every `every[id]` hours (8 by default: three visits a day), at its own
 * minute. Once a day a house may try a corsair's passage; the duel is not played here, its outcome
 * is drawn (`force`: the chance it wins).
 */
function tide(S: PlancheSetup, seed: number, every: Record<string, number> = {}, force = 0.4): Run {
  const rng = new Rng(seed);
  let s = plancheInit(S, T0);
  for (const h of S.houses) s = plancheClaim(S, s, h.id);
  const rivals: Record<string, string>[] = [];
  const moves: Record<string, number> = {};
  const low: Record<string, number> = {};
  const sum: Record<string, number> = {};
  const offset: Record<string, number> = {};
  for (const h of S.houses) {
    moves[h.id] = 0;
    offset[h.id] = rng.int(0, 7);
  }
  for (let hour = 0; hour < WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    const week = s.rank.week;
    s = plancheAdvance(S, s, now);
    if (s.rank.week !== week || hour === 0) rivals.push({ ...s.rank.rivals });
    for (const h of S.houses) {
      const gap = every[h.id] ?? 8;
      if ((hour + (offset[h.id] ?? 0)) % gap !== 0) continue;
      const before = JSON.stringify(s.houses[h.id]?.threads.map((t) => `${t.to}|${t.good}`));
      s = plancheRobot(S, s, h.id, now);
      const after = JSON.stringify(s.houses[h.id]?.threads.map((t) => `${t.to}|${t.good}`));
      if (before !== after) moves[h.id] = (moves[h.id] ?? 0) + 1;
      // once a day, from the second week: a corsair's passage is tried
      if (hour >= 7 * 24 && (hour + (offset[h.id] ?? 0)) % 24 === 0)
        for (const p of S.passages) {
          const st = s.passages[p.id];
          if (st && plancheIsCorsair(st.holder) && rng.chance(0.5) && rng.chance(force))
            s = plancheForced(S, s, h.id, p.id, now);
        }
    }
    for (const c of S.cities)
      for (const good of Object.keys(c.wants)) {
        const k = `${c.id}|${good}`;
        const p = planchePrice(S, s, c.id, good);
        low[k] = Math.min(low[k] ?? p, p);
        sum[k] = (sum[k] ?? 0) + p;
      }
  }
  for (const k of Object.keys(sum)) sum[k] = (sum[k] ?? 0) / (WEEKS * 7 * 24);
  return { s, moves, low, mean: sum, rivals };
}

// `BOARD=lagune`: the lagoon of 48 houses (docs/plan-lagunes.md G3); Venice's board of 8 otherwise.
const S0 = process.env.BOARD === "lagune" ? venice1450Lagune : venice1450Planche;
// Trials at the bench: `RULES='{"rewindMsPerTile":240000}'` over the board's rules, `DEMAND=1.5` to
// multiply what every town asks and grows back.
const demand = Number(process.env.DEMAND) || 1;
const S: typeof S0 = {
  ...S0,
  rules: { ...S0.rules, ...(JSON.parse(process.env.RULES ?? "{}") as Partial<typeof S0.rules>) },
  cities: S0.cities.map((c) => ({
    ...c,
    wants: Object.fromEntries(
      Object.entries(c.wants).map(([g, w]) => [
        g,
        {
          ...w,
          cap: Math.round(w.cap * demand),
          regenPerHour: Math.round(w.regenPerHour * demand),
        },
      ]),
    ),
  })),
};
/** Three houses of different sestieri (or of the board), for the visits' test. */
const WATCH = Number(process.env.WATCH) || 3;
const WATCHED = Array.from({ length: WATCH }, (_, k) =>
  Math.floor((k * S.houses.length) / WATCH),
).map((k) => S.houses[k]?.id ?? "");
const days = WEEKS * 7;
const ducats = (n: bigint) => Math.round(Number(n) / 1000).toLocaleString("fr-FR");

console.log(
  `### ${S.houses.length > 8 ? "La lagune de Venise" : "La planche de Venise"} (${S.houses.length} Maisons) : une marée de ${WEEKS} semaines, ${SEEDS} graines, trois visites par jour\n`,
);
/** What a house builds, in words: its plan's first three workshops. */
const planOf = (h: (typeof S.houses)[number]) =>
  (h.plan ?? Object.keys(h.makes))
    .slice(0, 3)
    .map((t) => S.ile?.workshops[t]?.name ?? t)
    .join(", ");
// A lagoon's 48 houses are read by what they build (a row per plan); a board of 8, house by house.
const groups: { label: string; ids: string[] }[] =
  S.houses.length > 8
    ? [...new Set(S.houses.map(planOf))].map((label) => ({
        label,
        ids: S.houses.filter((h) => planOf(h) === label).map((h) => h.id),
      }))
    : S.houses.map((h) => ({ label: `${h.name} | ${planOf(h)}`, ids: [h.id] }));
console.log(
  `| ${S.houses.length > 8 ? "Ce qu'elles font (Maisons)" : "Maison | Ce qu'elle fait"} | Gagné (milliers de deniers, médiane) | Fils déplacés par jour | Livré par jour |`,
);
console.log(`| --- |${S.houses.length > 8 ? "" : " --- |"} --- | --- | --- |`);
const started = performance.now();
const runs = Array.from({ length: SEEDS }, (_, k) => tide(S, k + 1));
const tideMs = (performance.now() - started) / SEEDS;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
for (const g of groups) {
  const all = (f: (r: Run, id: string) => number) =>
    median(runs.flatMap((r) => g.ids.map((id) => f(r, id))));
  const earned = all((r, id) => Number(r.s.houses[id]?.earned ?? 0n));
  const moved = all((r, id) => (r.moves[id] ?? 0) / days);
  const sent = all((r, id) => (r.s.houses[id]?.delivered ?? 0) / days);
  console.log(
    `| ${g.label}${g.ids.length > 1 ? ` (${g.ids.length})` : ""} | ${ducats(BigInt(Math.round(earned)))} | ${moved.toFixed(2)} | ${Math.round(sent)} |`,
  );
}
const sestieri = [...new Set(S.houses.map((h) => h.sestiere).filter(Boolean))] as string[];
if (sestieri.length) {
  console.log("\n| Sestiere | Gagné par Maison (milliers de deniers, médiane) |\n| --- | --- |");
  for (const sest of sestieri) {
    const ids = S.houses.filter((h) => h.sestiere === sest).map((h) => h.id);
    const earned = median(
      runs.flatMap((r) => ids.map((id) => Number(r.s.houses[id]?.earned ?? 0n))),
    );
    console.log(`| ${sest} | ${ducats(BigInt(Math.round(earned)))} |`);
  }
}
console.log(
  `\nCalcul : une marée de ${WEEKS} semaines en ${(tideMs / 1000).toFixed(1)} s, soit ${(tideMs / (WEEKS * 7)).toFixed(0)} ms par jour de jeu pour ${S.houses.length} Maisons (robots compris).`,
);
const totals = runs.map((r) => S.houses.map((h) => Number(r.s.houses[h.id]?.earned ?? 0n)));
const spread = median(totals.map((t) => Math.max(...t) / Math.max(1, Math.min(...t))));
console.log(
  `\nL'écart entre la Maison la plus riche et la plus pauvre : ×${spread.toFixed(2)} (médiane).`,
);
console.log(
  `Chaque denier est compté dans les ${SEEDS} marées : ${runs.every((r) => plancheInvariant(r.s)) ? "oui" : "NON"}.`,
);

console.log("\n### Les îles à la fin de la marée (médiane des graines)\n");
console.log(
  `| ${S.houses.length > 8 ? "Ce qu'elles font" : "Maison | Ce qu'elle fait"} | Cases | Ateliers | Niveau moyen | Dépensé sur l'île (milliers de deniers) |`,
);
console.log(`| --- |${S.houses.length > 8 ? "" : " --- |"} --- | --- | --- | --- |`);
for (const g of groups) {
  const isle = (r: Run, id: string) => Object.values(r.s.houses[id]?.ile?.tiles ?? {});
  const shops = (r: Run, id: string) =>
    isle(r, id).filter((t) => t.building && t.building.type !== "fondaco");
  const all = (f: (r: Run, id: string) => number) =>
    median(runs.flatMap((r) => g.ids.map((id) => f(r, id))));
  const tiles = all((r, id) => isle(r, id).length);
  const count = all((r, id) => shops(r, id).length);
  const level = all((r, id) => {
    const b = shops(r, id);
    return b.length ? b.reduce((n, t) => n + (t.building?.level ?? 0), 0) / b.length : 0;
  });
  const spent = all((r, id) => Number(r.s.houses[id]?.book.isle ?? 0n));
  console.log(
    `| ${g.label} | ${tiles} | ${count} | ${level.toFixed(1)} | ${ducats(BigInt(Math.round(spent)))} |`,
  );
}

console.log("\n### Les passages à la fin de la marée\n");
console.log("| Passage | Tenu par (une ligne par graine) |");
console.log("| --- | --- |");
for (const p of S.passages)
  console.log(
    `| ${p.name} | ${runs.map((r) => (r.s.passages[p.id]?.holder ?? "?").replace("corsair:", "le corsaire ")).join(" · ")} |`,
  );

console.log("\n### Le prix payé dans chaque ville (part du plein prix, médiane des graines)\n");
console.log("| Ville | Marchandise | Plein prix | En moyenne sur la marée | Au plus bas |");
console.log("| --- | --- | --- | --- | --- |");
for (const c of S.cities)
  for (const [good, w] of Object.entries(c.wants)) {
    const k = `${c.id}|${good}`;
    const lowest = median(runs.map((r) => r.low[k] ?? w.price));
    const mean = median(runs.map((r) => r.mean[k] ?? w.price));
    console.log(
      `| ${c.name} | ${S.goods[good]} | ${w.price} | ${Math.round((mean / w.price) * 100)} % | ${Math.round((lowest / w.price) * 100)} % |`,
    );
  }

console.log("\n### Venir huit fois par jour rapporte-t-il plus que trois ?\n");
console.log("| Maison | Trois visites par jour | Huit visites par jour (elle seule) | Écart |");
console.log("| --- | --- | --- | --- |");
for (const id of WATCHED) {
  const three = median(runs.map((r) => Number(r.s.houses[id]?.earned ?? 0n)));
  const eight = median(
    Array.from({ length: SEEDS }, (_, k) =>
      Number(tide(S, k + 1, { [id]: 3 }).s.houses[id]?.earned ?? 0n),
    ),
  );
  const name = S.houses.find((h) => h.id === id)?.name ?? id;
  console.log(
    `| ${name} | ${ducats(BigInt(Math.round(three)))} | ${ducats(BigInt(Math.round(eight)))} | ${(((eight - three) / Math.max(1, three)) * 100).toFixed(1)} % |`,
  );
}

console.log("\n### Le rang à la veille de la fin de la marée (docs/plan-classement.md R2)\n");
console.log(
  "Toutes les Maisons comptées comme tenues par des joueurs ; pas de duel de la Passe au banc (la cote reste à son départ).\n",
);
console.log(
  "| Maison | Place au Négoce (médiane) | Place à la Garde | Place au Doge | Fois Doge |",
);
console.log("| --- | --- | --- | --- | --- |");
for (const h of S.houses) {
  const at = (r: Run, w: "negoce" | "garde") =>
    plancheLaurel(S, r.s, w).find((x) => x.house === h.id)?.place ?? 0;
  const doge = (r: Run) => plancheStanding(S, r.s).find((x) => x.house === h.id)?.place ?? 0;
  const crowned = runs.filter((r) => plancheStanding(S, r.s)[0]?.house === h.id).length;
  console.log(
    `| ${h.name} | ${median(runs.map((r) => at(r, "negoce")))} | ${median(runs.map((r) => at(r, "garde")))} | ${median(runs.map(doge))} | ${crowned} / ${SEEDS} |`,
  );
}
const richest = (r: Run) =>
  S.houses.reduce((a, b) =>
    (r.s.houses[b.id]?.earned ?? 0n) > (r.s.houses[a.id]?.earned ?? 0n) ? b : a,
  ).id;
const sameTop = runs.filter((r) => plancheLaurel(S, r.s, "negoce")[0]?.house === richest(r)).length;
console.log(
  `\nLe premier du Négoce est aussi la Maison qui a le plus gagné : ${sameTop} marée(s) sur ${SEEDS}.`,
);
const biggest = (r: Run) =>
  S.houses.reduce((a, b) =>
    Object.keys(r.s.houses[b.id]?.ile?.tiles ?? {}).length >
    Object.keys(r.s.houses[a.id]?.ile?.tiles ?? {}).length
      ? b
      : a,
  ).id;
const sameBig = runs.filter((r) => plancheLaurel(S, r.s, "negoce")[0]?.house === biggest(r)).length;
console.log(
  `Le premier du Négoce a aussi la plus grande île : ${sameBig} marée(s) sur ${SEEDS}. Chaque Maison de l'ordinateur tient ses cinq bobines toute la marée : entre elles, le Négoce suit donc le gain.`,
);
let named = 0;
let weeks = 0;
let repeats = 0;
for (const r of runs)
  r.rivals.forEach((w, i) => {
    for (const h of S.houses) {
      weeks += 1;
      if (w[h.id]) named += 1;
      if (i > 0 && w[h.id] && r.rivals[i - 1]?.[h.id] === w[h.id]) repeats += 1;
    }
  });
console.log(
  `Un rival chaque semaine : ${named} semaines-Maisons sur ${weeks} ; le même rival deux semaines de suite : ${repeats} fois.`,
);
const flags = runs.map((r) => Object.values(r.s.rank.flags).reduce((n, f) => n + f.length, 0));
console.log(`Pavillons accrochés le dernier dimanche (médiane des graines) : ${median(flags)}.`);

console.log("\n### Venir huit fois par jour fait-il monter au rang ?\n");
console.log("| Maison | Place au Doge, trois visites | Huit visites (elle seule) |");
console.log("| --- | --- | --- |");
for (const id of WATCHED) {
  const place = (r: Run) => plancheStanding(S, r.s).find((x) => x.house === id)?.place ?? 0;
  const eight = Array.from({ length: SEEDS }, (_, k) => tide(S, k + 1, { [id]: 3 }));
  const name = S.houses.find((h) => h.id === id)?.name ?? id;
  console.log(`| ${name} | ${median(runs.map(place))} | ${median(eight.map(place))} |`);
}
