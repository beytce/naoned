/**
 * The Muda and the black straits at the bench (docs/plan-muda.md N3): a lagoon of 48 over a few
 * weeks, every house a player visiting every 8 hours and trading as the computer does. Of them:
 *  - « Muda » (a share, `MUDA`, 20 % by default): from Wednesday to Friday one bobbin is a thread to
 *    the pier, of what it has most; on Saturday it plays each strait of the convoy (won `WIN` times
 *    in 10);
 *  - « détroits noirs » (a share, `NOIR`, 10 %): a house of level 11 that twice a day risks a cargo
 *    of its dearest good at a black strait (won `NOIRWIN` times in 10);
 *  - « commerce »: trade only.
 * Does the hold fill with a fifth of the lagoon at it? Does the Muda pay the thread it takes,
 * without crushing trade? What do the black straits bring a level 11 house?
 * Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator muda-bench [seeds] [weeks]
 */
import {
  type PlancheSetup,
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheFreeBobbins,
  plancheInit,
  plancheMudaForce,
  plancheMudaHold,
  plancheMudaLoaded,
  plancheMudaPhase,
  plancheMudaPrice,
  plancheNoirCargoCap,
  plancheNoirPrice,
  plancheNoirTry,
  plancheRobot,
  plancheSetLevel,
  plancheThread,
  plancheUnthread,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SEEDS = Number(process.argv[2]) || 4;
const WEEKS = Number(process.argv[3]) || 2;
const MUDA = Number(process.env.MUDA ?? 0.2);
const NOIR = Number(process.env.NOIR ?? 0.1);
const WIN = Number(process.env.WIN ?? 0.5);
const NOIRWIN = Number(process.env.NOIRWIN ?? 0.35);
const HOLD = process.env.HOLD ? Number(process.env.HOLD) : null;
const PRICE = process.env.PRICE ? Number(process.env.PRICE) : null;
const STEP = process.env.STEP ? Number(process.env.STEP) : null;
const CAP = process.env.CAP ? Number(process.env.CAP) : null;
const L = venice1450Lagune;
const S: PlancheSetup = {
  ...L,
  ...(L.muda
    ? {
        muda: {
          ...L.muda,
          ...(HOLD !== null ? { holdPerHouse: HOLD } : {}),
          ...(STEP !== null ? { stepBps: STEP } : {}),
          ...(CAP !== null ? { dailyCap: CAP } : {}),
        },
      }
    : {}),
  ...(L.noir && PRICE !== null ? { noir: { ...L.noir, priceBps: PRICE } } : {}),
};
if (!S.muda || !S.noir) throw new Error("the lagoon has no Muda or no black straits");
const M = S.muda;
const N = S.noir;
// A Monday.
const T0 = Date.parse("2026-11-16T00:00:00Z");

type Kind = "Muda" | "détroits noirs" | "commerce";
const KINDS: Kind[] = ["Muda", "détroits noirs", "commerce"];

const attempt = (s: PlancheState, f: () => PlancheState) => {
  try {
    return f();
  } catch {
    return s;
  }
};

function run(seed: number) {
  const rng = new Rng(seed);
  let s: PlancheState = plancheInit(S, T0);
  const kind = new Map<string, Kind>();
  // A house's kind turns from seed to seed: no place on the map is any kind's.
  const order = [...S.houses].sort(
    (a, b) => ((rng.int(0, 999) + a.x) % 7) - ((rng.int(0, 999) + b.x) % 7),
  );
  order.forEach((h, k) => {
    s = plancheClaim(S, s, h.id);
    const f = k / order.length;
    kind.set(h.id, f < MUDA ? "Muda" : f < MUDA + NOIR ? "détroits noirs" : "commerce");
  });
  // The black straits' players are of the level that opens them.
  for (const [id, k] of kind) if (k === "détroits noirs") s = plancheSetLevel(S, s, id, 11);
  const offset = new Map(S.houses.map((h) => [h.id, rng.int(0, 7)]));
  const noir = new Map<string, { won: number; lost: number; gain: bigint; sunk: bigint }>();
  const weeks: { loaded: number; passed: number }[] = [];
  for (let hour = 1; hour <= WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    s = plancheAdvance(S, s, now);
    if (hour % (7 * 24) === 7 * 24 - 1)
      weeks.push({
        loaded: plancheMudaLoaded(s, now),
        passed: Object.values(s.muda?.straits ?? {}).filter((x) => x.by).length,
      });
    for (const h of S.houses) {
      const off = offset.get(h.id) ?? 0;
      if ((hour + off) % 8 !== 0) continue;
      const k = kind.get(h.id);
      const me = s.houses[h.id];
      if (!me) continue;
      const pier = me.threads.find((t) => t.to === M.pier);
      const phase = plancheMudaPhase(S, now);
      if (k === "Muda" && phase === "loading" && !pier) {
        // One bobbin to the pier: the poorest thread is taken back if none is free.
        if (plancheFreeBobbins(S, s, h.id) < 1 && me.threads.length) {
          const t = me.threads[me.threads.length - 1];
          if (t) s = attempt(s, () => plancheUnthread(S, s, h.id, t.to, t.good, now));
        }
        const best = Object.entries(s.houses[h.id]?.stock ?? {})
          .filter(([g, n]) => n > 0 && plancheMudaPrice(S, g) > 0)
          .sort((a, b) => b[1] - a[1])[0];
        if (best) s = attempt(s, () => plancheThread(S, s, h.id, M.pier, best[0], now));
      }
      if (pier && phase !== "loading")
        s = attempt(s, () => plancheUnthread(S, s, h.id, pier.to, pier.good, now));
      s = plancheRobot(S, s, h.id, now, 2_500, {});
      if (k === "Muda" && phase === "sailing")
        for (const x of M.straits)
          s = attempt(s, () => plancheMudaForce(S, s, h.id, x.id, rng.chance(WIN), now));
      if (k === "détroits noirs") {
        const cap = plancheNoirCargoCap(S, me);
        const good = Object.entries(me.stock)
          .filter(([g, n]) => n >= Math.min(cap, 10) && plancheNoirPrice(S, g) > 0)
          .sort((a, b) => plancheNoirPrice(S, b[0]) - plancheNoirPrice(S, a[0]))[0];
        if (!good) continue;
        const n = Math.min(cap, good[1]);
        const won = rng.chance(NOIRWIN);
        const strait = rng.pick(N.straits).id;
        const before = me.ducats;
        const next = attempt(s, () =>
          plancheNoirTry(S, s, h.id, strait, { good: good[0], n }, won, now),
        );
        if (next === s) continue;
        s = next;
        const r = noir.get(h.id) ?? { won: 0, lost: 0, gain: 0n, sunk: 0n };
        // What the cargo would have sold for at the board's best price, to weigh the loss.
        const worth = BigInt(plancheMudaPrice(S, good[0])) * BigInt(n);
        if (won) {
          r.won++;
          r.gain += (s.houses[h.id]?.ducats ?? 0n) - before;
        } else {
          r.lost++;
          r.sunk += worth;
        }
        noir.set(h.id, r);
      }
    }
  }
  return { s, kind, noir, weeks };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const ducats = (d: bigint) => Number(d / 100n);
const runs = Array.from({ length: SEEDS }, (_, k) => run(k + 1));

console.log(
  `### La Muda et les détroits noirs : la lagune de Venise sur ${WEEKS} semaines, ${SEEDS} graines\n`,
);
console.log(
  `${Math.round(MUDA * 100)} % de joueurs de la Muda (un fil vers le môle du mercredi au vendredi, chaque détroit tenté le samedi, gagné ${WIN * 10} fois sur 10), ${Math.round(NOIR * 100)} % de joueurs des détroits noirs (niveau 11, deux cargaisons par jour, gagnées ${NOIRWIN * 10} fois sur 10), le reste au commerce seul ; une visite toutes les 8 h, le commerce de l'ordinateur pour tous.\n`,
);
console.log("| Sorte | Gagné en tout (médiane, ducats) | Moyenne |");
console.log("| --- | --- | --- |");
const avg: Record<Kind, number> = { Muda: 0, "détroits noirs": 0, commerce: 0 };
for (const k of KINDS) {
  const xs = runs.flatMap((r) =>
    [...r.kind].filter(([, x]) => x === k).map(([id]) => ducats(r.s.houses[id]?.earned ?? 0n)),
  );
  avg[k] = mean(xs);
  console.log(`| ${k} | ${median(xs)} | ${Math.round(mean(xs))} |`);
}
const weeks = runs.flatMap((r) => r.weeks);
console.log(
  `\nLa cale (${plancheMudaHold(S)} unités) : remplie en moyenne à ${Math.round((mean(weeks.map((w) => w.loaded)) / plancheMudaHold(S)) * 100)} % ; détroits passés en moyenne : ${mean(weeks.map((w) => w.passed)).toFixed(1)} sur ${M.straits.length}.`,
);
const nr = runs.flatMap((r) => [...r.noir.values()]);
const won = mean(nr.map((x) => x.won));
const lost = mean(nr.map((x) => x.lost));
console.log(
  `\nDétroits noirs, par Maison : ${won.toFixed(1)} forcés, ${lost.toFixed(1)} perdus ; vendu au port lointain ${Math.round(mean(nr.map((x) => ducats(x.gain))))} ducats, cargaisons coulées ${Math.round(mean(nr.map((x) => ducats(x.sunk))))} ducats (au prix de Venise) ; reliques : ${won.toFixed(1)}, soit ${(won / N.relicsPerPlan).toFixed(1)} plans.`,
);
console.log(
  `\nLa Muda : ${((avg.Muda / Math.max(1, avg.commerce) - 1) * 100).toFixed(0)} % par rapport au commerce seul ; les détroits noirs : ${((avg["détroits noirs"] / Math.max(1, avg.commerce) - 1) * 100).toFixed(0)} %.`,
);
