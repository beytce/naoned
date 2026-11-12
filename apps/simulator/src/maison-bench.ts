/**
 * The growth of the houses at the bench (docs/plan-progression-maison.md M2): a lagoon of 48 over
 * eight weeks, its houses played as players of three kinds: regular (a visit every 8 hours),
 * assiduous (every 3 hours), irregular (three days a week). Each day's trade and each week's
 * victories give Prestige, capped by the week; a house reaches its level on the board. When do
 * they reach level 10? Does the assiduous go twice as fast? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator maison-bench [seeds] [weeks]
 */
import {
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheForced,
  plancheInit,
  plancheIsCorsair,
  plancheRobot,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SEEDS = Number(process.argv[2]) || 3;
const WEEKS = Number(process.argv[3]) || 8;
const S = venice1450Lagune;
const M = S.maison;
if (!M) throw new Error("the lagoon has no growth");
const T0 = Date.parse("2026-11-16T00:00:00Z");

type Kind = "régulier" | "assidu" | "irrégulier";
/** A third of the houses of each kind, mixed through the sestieri. */
const kindOf = (k: number): Kind => (["régulier", "assidu", "irrégulier"] as const)[k % 3] as Kind;
/** Whether a house plays at this hour. */
const plays = (kind: Kind, hour: number, offset: number) => {
  const h = hour + offset;
  if (kind === "assidu") return h % 3 === 0;
  if (kind === "irrégulier") return [0, 2, 5].includes(Math.floor(hour / 24) % 7) && h % 8 === 0;
  return h % 8 === 0;
};

function run(seed: number) {
  const rng = new Rng(seed);
  let s: PlancheState = plancheInit(S, T0);
  // Every house counts as a person's: each rises by its own Prestige, as the board counts it.
  for (const h of S.houses) s = plancheClaim(S, s, h.id);
  const offset = new Map(S.houses.map((h) => [h.id, rng.int(0, 7)]));
  const reached10 = new Map<string, number>();
  const levels: Record<Kind, number[]>[] = [];
  for (let hour = 1; hour <= WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    s = plancheAdvance(S, s, now);
    S.houses.forEach((h, k) => {
      if (!plays(kindOf(k), hour, offset.get(h.id) ?? 0)) return;
      s = plancheRobot(S, s, h.id, now);
      // Once a day a corsair's passage is tried; the duel is drawn.
      if ((hour + (offset.get(h.id) ?? 0)) % 24 === 0)
        for (const p of S.passages) {
          const st = s.passages[p.id];
          if (st && plancheIsCorsair(st.holder) && rng.chance(0.2) && rng.chance(0.4))
            s = plancheForced(S, s, h.id, p.id, now);
        }
    });
    if (hour % (7 * 24) === 0) {
      const week = hour / (7 * 24);
      const per: Record<Kind, number[]> = { régulier: [], assidu: [], irrégulier: [] };
      S.houses.forEach((h, k) => {
        const level = s.houses[h.id]?.level ?? 1;
        if (level >= 10 && !reached10.has(h.id)) reached10.set(h.id, week);
        per[kindOf(k)].push(level);
      });
      levels.push(per);
    }
  }
  const me = new Map(
    S.houses.map((h) => [
      h.id,
      { prestige: s.houses[h.id]?.maison?.prestige ?? 0, reached10: reached10.get(h.id) ?? null },
    ]),
  );
  return { levels, me, s };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const runs = Array.from({ length: SEEDS }, (_, k) => run(k + 1));
const kinds: Kind[] = ["régulier", "assidu", "irrégulier"];

console.log(
  `### La progression des Maisons : la lagune de Venise sur ${WEEKS} semaines, ${SEEDS} graines\n`,
);
console.log(
  "Un tiers des Maisons de chaque sorte : régulière (une visite toutes les 8 h), assidue (toutes les 3 h), irrégulière (trois jours par semaine).\n",
);
console.log(`| Sorte | ${Array.from({ length: WEEKS }, (_, w) => `Sem. ${w + 1}`).join(" | ")} |`);
console.log(`| --- |${" --- |".repeat(WEEKS)}`);
for (const kind of kinds) {
  const row = Array.from({ length: WEEKS }, (_, w) =>
    median(runs.flatMap((r) => r.levels[w]?.[kind] ?? [])),
  );
  console.log(`| ${kind} (niveau médian) | ${row.join(" | ")} |`);
}
console.log("\n| Sorte | Niveau 10 atteint (semaine médiane) | Prestige à la fin (médiane) |");
console.log("| --- | --- | --- |");
for (const kind of kinds) {
  const ids = S.houses.filter((_, k) => kindOf(k) === kind).map((h) => h.id);
  const at = runs.flatMap((r) => ids.map((id) => r.me.get(id)?.reached10 ?? WEEKS + 1));
  const pr = runs.flatMap((r) => ids.map((id) => r.me.get(id)?.prestige ?? 0));
  const w = median(at);
  console.log(
    `| ${kind} | ${w > WEEKS ? `après la semaine ${WEEKS}` : `semaine ${w}`} | ${median(pr)} |`,
  );
}
const reg = median(
  runs.flatMap((r) =>
    S.houses.filter((_, k) => kindOf(k) === "régulier").map((h) => r.me.get(h.id)?.prestige ?? 0),
  ),
);
const ass = median(
  runs.flatMap((r) =>
    S.houses.filter((_, k) => kindOf(k) === "assidu").map((h) => r.me.get(h.id)?.prestige ?? 0),
  ),
);
console.log(
  `\nL'assidu gagne ${((ass / Math.max(1, reg) - 1) * 100).toFixed(0)} % de Prestige de plus que le régulier (le plafond : ${M.weeklyCap} par semaine).`,
);
