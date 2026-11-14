/**
 * The economy at the bench (docs/plan-economie.md, after the economist of the audit of 13 November
 * 2026, `docs/audit-2026-11-13/07-economiste.md`): the lagoon of Venice, its 48 houses played by
 * four kinds of players, hour by hour. Each week: the ducats created by the towns, what the islands
 * and the works took, the money held; the open sea's share of the sales; the level of each kind.
 * `avant` plays the lagoon as it was before lot C (the open sea at its old prices, the detour at
 * 60 % from the first level), to measure both. Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator eco-bench [seeds] [weeks] [avant]
 */
import {
  type PlancheSetup,
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheDailyTry,
  plancheForceTry,
  plancheForced,
  plancheInit,
  plancheIsCorsair,
  plancheRobot,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const DUCAT = 100n;
const SEEDS = Number(process.argv[2]) || 2;
const WEEKS = Number(process.argv[3]) || 6;
const BEFORE = process.argv[4] === "avant";
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** The lagoon as it was before lot C: the open sea's old prices and floor, the detour for all. */
function before(S0: PlancheSetup): PlancheSetup {
  const S = structuredClone(S0);
  for (const c of S.cities) {
    if (c.ring !== "large") continue;
    c.detourBps = 6_000;
    for (const w of Object.values(c.wants)) {
      w.price = Math.round((w.price * 10) / 6);
      w.floorBps = 5_000;
    }
  }
  if (S.maison) S.maison.unlocks = S.maison.unlocks.map(({ detour: _, ...u }) => u);
  return S;
}
const S = BEFORE ? before(venice1450Lagune) : venice1450Lagune;

type Kind = "ordinateur" | "occasionnel" | "régulier" | "assidu";
const KINDS: Kind[] = ["ordinateur", "occasionnel", "régulier", "assidu"];
/** Whether a house of a kind plays at this hour of the week (an offset spreads them). */
function plays(kind: Kind, hour: number): boolean {
  const h = hour % 24;
  const day = Math.floor(hour / 24) % 7;
  if (kind === "ordinateur") return hour % 8 === 0;
  if (kind === "occasionnel") return [0, 2, 3, 5].includes(day) && h === 19;
  if (kind === "régulier") return h === 8 || h === 13 || h === 20;
  return h >= 7 && h <= 23 && h % 2 === 1;
}

interface Week {
  created: bigint;
  isle: bigint;
  held: bigint;
  /** The open sea's share of each kind's sales this week (points of base). */
  large: Record<Kind, number>;
  level: Record<Kind, number>;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);

function run(seed: number): Week[] {
  const rng = new Rng(seed);
  // The kind of each house turns with the seed, so that the map's place does not decide.
  const kindOf = new Map(S.houses.map((h, k) => [h.id, KINDS[(k + seed) % 4] as Kind]));
  let s: PlancheState = plancheInit(S, T0);
  for (const h of S.houses) if (kindOf.get(h.id) !== "ordinateur") s = plancheClaim(S, s, h.id);
  const large = new Set(S.cities.filter((c) => c.ring === "large").map((c) => c.id));
  const weeks: Week[] = [];
  let soldBefore = 0n;
  let isleBefore = 0n;
  for (let hour = 1; hour <= WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    // The week's sales by town, read just before the week turns (the rank starts it again).
    const turning = hour % (7 * 24) === 0;
    if (turning) {
      const share = {} as Record<Kind, number>;
      const level = {} as Record<Kind, number>;
      for (const kind of KINDS) {
        const ids = S.houses.filter((h) => kindOf.get(h.id) === kind).map((h) => h.id);
        const all = sum(ids.flatMap((id) => Object.values(s.houses[id]?.rank.week ?? {})));
        const far = sum(
          ids.flatMap((id) =>
            Object.entries(s.houses[id]?.rank.week ?? {})
              .filter(([c]) => large.has(c))
              .map(([, v]) => v),
          ),
        );
        share[kind] = all > 0n ? Number((far * 10_000n) / all) : 0;
        level[kind] = median(ids.map((id) => s.houses[id]?.level ?? 1));
      }
      const houses = Object.values(s.houses);
      const sold = sum(houses.map((h) => h.book.sold));
      const isle = sum(houses.map((h) => h.book.isle));
      weeks.push({
        created: sold - soldBefore,
        isle: isle - isleBefore,
        held: sum(houses.map((h) => h.ducats)),
        large: share,
        level,
      });
      soldBefore = sold;
      isleBefore = isle;
    }
    s = plancheAdvance(S, s, now);
    for (const h of S.houses) {
      const kind = kindOf.get(h.id) as Kind;
      if (!plays(kind, hour)) continue;
      // A player takes the detour where its level opens it; the computer never does.
      s = plancheRobot(S, s, h.id, now, 2_500, { detour: kind !== "ordinateur" });
      if (kind === "ordinateur") continue;
      const day = Math.floor(now / DAY);
      // The problem of the day, at the first visit of the day: solved six times in ten.
      if (S.daily && !s.daily?.[day]?.[h.id])
        try {
          s = plancheDailyTry(S, s, h.id, now, rng.chance(0.6), 2);
        } catch {
          // Tried already.
        }
      // A tower: the regular every other day, the assiduous every day; won four times in ten.
      const tries = kind === "assidu" ? 1 : kind === "régulier" ? 0.5 : 0;
      if (hour % 24 !== (kind === "assidu" ? 9 : 13) || !rng.chance(tries)) continue;
      const p = S.passages.find((q) => plancheIsCorsair(s.passages[q.id]?.holder ?? ""));
      if (!p) continue;
      try {
        s = plancheForceTry(S, s, h.id, p.id, now);
        if (rng.chance(0.4)) s = plancheForced(S, s, h.id, p.id, now);
      } catch {
        // Tried today, or held.
      }
    }
  }
  return weeks;
}

const runs = Array.from({ length: SEEDS }, (_, k) => run(k + 1));
const at = (w: number, f: (x: Week) => number) => median(runs.map((r) => f(r[w] as Week)));
const ducats = (d: bigint) => Math.round(Number(d / DUCAT)).toLocaleString("fr-FR");

console.log(
  `### L'économie de la lagune de Venise (${BEFORE ? "avant le lot C" : "après le lot C"}) : ${WEEKS} semaines, ${SEEDS} graines, 48 Maisons\n`,
);
console.log(
  "Quatre sortes de Maisons, 12 de chaque : l'ordinateur (toutes les 8 h, sans détour), l'occasionnel (4 soirs par semaine), le régulier (8 h, 13 h, 20 h ; une tour un jour sur deux), l'assidu (toutes les 2 h de 7 h à 23 h ; une tour par jour). Problème du jour réussi 6 fois sur 10, tours gagnées 4 fois sur 10. Médianes des graines.\n",
);
console.log(
  "| Semaine | Ducats créés | Dépensés sur l'île | Détenus | Part du Large : occasionnel · régulier · assidu | Niveau : occasionnel · régulier · assidu |",
);
console.log("| --- | --- | --- | --- | --- | --- |");
for (let w = 0; w < WEEKS; w++) {
  const pick = (f: (x: Week) => bigint) =>
    ducats(BigInt(median(runs.map((r) => Number(f(r[w] as Week))))));
  const share = (["occasionnel", "régulier", "assidu"] as Kind[])
    .map((k) => `${Math.round(at(w, (x) => x.large[k]) / 100)} %`)
    .join(" · ");
  const level = (["occasionnel", "régulier", "assidu"] as Kind[])
    .map((k) => at(w, (x) => x.level[k]))
    .join(" · ");
  console.log(
    `| ${w + 1} | ${pick((x) => x.created)} | ${pick((x) => x.isle)} | ${pick((x) => x.held)} | ${share} | ${level} |`,
  );
}
