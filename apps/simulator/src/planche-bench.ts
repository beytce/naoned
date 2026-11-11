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
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheIsCorsair,
  planchePrice,
  plancheRobot,
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
}

/**
 * A tide. Each house visits every `every[id]` hours (8 by default: three visits a day), at its own
 * minute. Once a day a house may try a corsair's passage; the duel is not played here, its outcome
 * is drawn (`force`: the chance it wins).
 */
function tide(S: PlancheSetup, seed: number, every: Record<string, number> = {}, force = 0.4): Run {
  const rng = new Rng(seed);
  let s = plancheInit(S, T0);
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
    s = plancheAdvance(S, s, now);
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
  return { s, moves, low, mean: sum };
}

const S = venice1450Planche;
const days = WEEKS * 7;
const ducats = (n: bigint) => Math.round(Number(n) / 1000).toLocaleString("fr-FR");

console.log(
  `### La planche de Venise : une marée de ${WEEKS} semaines, ${SEEDS} graines, trois visites par jour\n`,
);
console.log(
  "| Maison | Ce qu'elle fait | Gagné (milliers de deniers, médiane) | Fils déplacés par jour | Livré par jour |",
);
console.log("| --- | --- | --- | --- | --- |");
const runs = Array.from({ length: SEEDS }, (_, k) => tide(S, k + 1));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
for (const h of S.houses) {
  const earned = median(runs.map((r) => Number(r.s.houses[h.id]?.earned ?? 0n)));
  const moved = median(runs.map((r) => (r.moves[h.id] ?? 0) / days));
  const sent = median(runs.map((r) => (r.s.houses[h.id]?.delivered ?? 0) / days));
  console.log(
    `| ${h.name} | ${Object.keys(h.makes).join(", ")} | ${ducats(BigInt(Math.round(earned)))} | ${moved.toFixed(2)} | ${Math.round(sent)} |`,
  );
}
const totals = runs.map((r) => S.houses.map((h) => Number(r.s.houses[h.id]?.earned ?? 0n)));
const spread = median(totals.map((t) => Math.max(...t) / Math.max(1, Math.min(...t))));
console.log(
  `\nL'écart entre la Maison la plus riche et la plus pauvre : ×${spread.toFixed(2)} (médiane).`,
);
console.log(
  `Chaque denier est compté dans les ${SEEDS} marées : ${runs.every((r) => plancheInvariant(r.s)) ? "oui" : "NON"}.`,
);

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
for (const id of ["toi", "loredan", "morosini"]) {
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
