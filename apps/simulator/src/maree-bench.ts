/**
 * The ink tide, the sorties and the leagues at the bench (docs/plan-maree.md T4).
 *
 * 1. A tide of the lagoon of 48 (six weeks), every house a player visiting every 8 hours and
 *    trading as the computer does. A share of them (`TENANTS`, a third by default) try once a day a
 *    tower still a corsair's (won `WIN` times in 10), as at the bench of the Passe in trade. The
 *    sorties are played at their hour against the towers' guard. Does the ink reach the towers when
 *    no one holds any, and not when the lagoon plays? How many sorties are repelled? Stones?
 * 2. The leagues over eight tides: players of every strength, lagoons of 48 (the computer filling
 *    them), the top sixth of each lagoon going up a league, the bottom sixth down (never below a
 *    rung reached). How many lagoons in each league, how long for the strongest to reach the
 *    Sérénissime?
 * Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator maree-bench [seeds]
 */
import {
  type PasseSetup,
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheEncreLine,
  plancheForced,
  plancheInit,
  plancheIsCorsair,
  plancheRobot,
  plancheSortiesSettle,
  venice1450Lagune,
  venice1450Passe,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SEEDS = Number(process.argv[2]) || 3;
const TENANTS = Number(process.env.TENANTS ?? 1 / 3);
const WIN = Number(process.env.WIN ?? 0.4);
const S = venice1450Lagune;
const R = S.rank;
if (!R || !S.encre) throw new Error("the lagoon has no tide or no ink");
const T0 = Date.parse("2026-11-16T00:00:00Z");
const boards = venice1450Passe.boards as Record<string, Omit<PasseSetup, "fire" | "cargo">>;
const boardOf = (passage: string): PasseSetup | undefined => {
  const p = S.passages.find((q) => q.id === passage);
  const b = p ? boards[p.board] : undefined;
  return b ? { ...venice1450Passe.rules, ...b, cells: [...b.cells] } : undefined;
};

const attempt = (s: PlancheState, f: () => PlancheState) => {
  try {
    return f();
  } catch {
    return s;
  }
};

function tide(seed: number, tenants: number) {
  const rng = new Rng(seed);
  let s = plancheInit(S, T0);
  for (const h of S.houses) s = plancheClaim(S, s, h.id);
  const tenant = new Set(S.houses.filter(() => rng.chance(tenants)).map((h) => h.id));
  const offset = new Map(S.houses.map((h) => [h.id, rng.int(0, 7)]));
  const lines: number[] = [];
  let retaken = 0;
  const sorties = { played: 0, lost: 0 };
  const weeks = R?.tideWeeks ?? 6;
  for (let hour = 1; hour <= weeks * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    s = plancheAdvance(S, s, now);
    if (s.encre?.last && hour % (7 * 24) === 0) {
      lines.push(plancheEncreLine(S, s) / 100);
      retaken += s.encre.last.retaken.length;
    }
    const before = Object.keys(s.sorties?.done ?? {}).length;
    s = plancheSortiesSettle(S, s, now, boardOf);
    const done = s.sorties?.done ?? {};
    if (Object.keys(done).length > before)
      for (const d of Object.values(done).slice(before)) {
        sorties.played += 1;
        if (d.won) sorties.lost += 1;
      }
    for (const h of S.houses) {
      const off = offset.get(h.id) ?? 0;
      if ((hour + off) % 8 !== 0) continue;
      if (tenant.has(h.id) && (hour + off) % 24 === 0) {
        const shut = S.passages.filter((p) => plancheIsCorsair(s.passages[p.id]?.holder ?? ""));
        const p = shut.length ? rng.pick(shut) : undefined;
        if (p && rng.chance(WIN)) s = attempt(s, () => plancheForced(S, s, h.id, p.id, now));
      }
      s = plancheRobot(S, s, h.id, now, 2_500, {});
    }
  }
  const stones = Object.values(s.houses).reduce((n, h) => n + (h.stones?.length ?? 0), 0);
  return { lines, retaken, sorties, stones };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(
  `### La marée d'encre et les sorties : une marée de la lagune de Venise, ${SEEDS} graines\n`,
);
console.log(
  `Toutes les Maisons jouées, une visite toutes les 8 h. « Tenants » : une tour tentée par jour, gagnée ${WIN * 10} fois sur 10. L'encre part de la rangée ${S.encre.start}, monte d'une rangée par semaine ; une tour tenue la repousse de ${S.encre.push.tower / 100} rangée.\n`,
);
console.log(
  "| Tenants | Ligne d'encre, semaine par semaine | Tours reprises par l'encre | Sorties jouées, tours qui y perdent un sceau | Pierres gravées |",
);
console.log("| --- | --- | --- | --- | --- |");
for (const share of [0, TENANTS, 2 * TENANTS]) {
  const runs = Array.from({ length: SEEDS }, (_, k) => tide(k + 1, share));
  const weeks = runs[0]?.lines.length ?? 0;
  const line = Array.from({ length: weeks }, (_, w) =>
    mean(runs.map((r) => r.lines[w] ?? 0)).toFixed(1),
  );
  console.log(
    `| ${Math.round(share * 100)} % | ${line.join(" → ")} | ${mean(runs.map((r) => r.retaken)).toFixed(1)} | ${mean(runs.map((r) => r.sorties.played)).toFixed(1)}, ${mean(runs.map((r) => r.sorties.lost)).toFixed(1)} | ${mean(runs.map((r) => r.stones)).toFixed(1)} |`,
  );
}

// 2. The leagues, abstract: a player's strength, a lagoon's sixth up, a sixth down.
const LEAGUES = Number(process.env.LEAGUES ?? 4);
const PLAYERS = Number(process.env.PLAYERS ?? 1_200);
const SHARE = Number(process.env.SHARE ?? 1 / 6);
const rng = new Rng(7);
const players = Array.from({ length: PLAYERS }, (_, id) => ({
  id,
  strength: rng.int(0, 1_000),
  league: 1,
  floor: 1,
  top: -1,
}));
const tides = 8;
const rows: string[] = [];
for (let t = 1; t <= tides; t++) {
  const next = new Map<number, number>();
  for (let l = 1; l <= LEAGUES; l++) {
    const here = players.filter((p) => p.league === l);
    // Lagoons of 48, the Sérénissime one alone (its best 48).
    const size = 48;
    const lagoons: (typeof here)[] = [];
    const shuffled = [...here].sort(
      (a, b) => ((a.id * 7919 + t) % 997) - ((b.id * 7919 + t) % 997),
    );
    for (let k = 0; k < shuffled.length; k += size) lagoons.push(shuffled.slice(k, k + size));
    for (const lag of lagoons) {
      const ranked = [...lag].sort(
        (a, b) => b.strength + rng.int(0, 300) - (a.strength + rng.int(0, 300)),
      );
      const n = Math.max(1, Math.round(ranked.length * SHARE));
      ranked.forEach((p, k) => {
        if (k < n && l < LEAGUES) next.set(p.id, l + 1);
        else if (k >= ranked.length - n && l > p.floor) next.set(p.id, l - 1);
      });
    }
  }
  // The Sérénissime is one lagoon: those going up take the seats left free, the strongest first.
  const staying = players.filter(
    (p) => p.league === LEAGUES && next.get(p.id) === undefined,
  ).length;
  const rising = players
    .filter((p) => next.get(p.id) === LEAGUES)
    .sort((a, b) => b.strength - a.strength);
  for (const p of rising.slice(Math.max(0, 48 - staying))) next.delete(p.id);
  for (const p of players) {
    const to = next.get(p.id);
    if (to !== undefined) p.league = to;
    p.floor = Math.max(p.floor, p.league - 1 >= 1 ? p.league - 1 : 1);
    if (p.league === LEAGUES && p.top < 0) p.top = t;
  }
  const counts = Array.from(
    { length: LEAGUES },
    (_, k) => players.filter((p) => p.league === k + 1).length,
  );
  rows.push(`| ${t} | ${counts.map((c) => `${c} (${Math.ceil(c / 48)})`).join(" | ")} |`);
}
console.log(
  `\n### Les ligues : ${PLAYERS} joueurs, ${LEAGUES} ligues, le ${Math.round(SHARE * 100)} % du haut de chaque lagune monte, celui du bas descend (jamais sous un palier atteint)\n`,
);
console.log(
  `| Marée | ${Array.from({ length: LEAGUES }, (_, k) => (k + 1 === LEAGUES ? "Sérénissime" : `Ligue ${k + 1}`)).join(" | ")} |`,
);
console.log(`| --- | ${Array.from({ length: LEAGUES }, () => "---").join(" | ")} |`);
for (const r of rows) console.log(r);
const strong = players.filter((p) => p.strength >= 900);
const reached = strong.filter((p) => p.top > 0);
console.log(
  `\nLes plus forts (le dixième du haut) : ${Math.round((reached.length / Math.max(1, strong.length)) * 100)} % atteignent la Sérénissime en ${tides} marées, au bout de ${mean(reached.map((p) => p.top)).toFixed(1)} marées en moyenne. Joueurs par lagune et par ligue entre parenthèses : le nombre de lagunes.`,
);
