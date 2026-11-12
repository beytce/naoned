/**
 * The Passe in trade at the bench (docs/plan-hex-commerce.md H6): a lagoon of 48 over a few weeks,
 * its houses played as players of three kinds, a third each, all visiting every 8 hours:
 *  - « Passe »: once a day it tries a shut tower on its way (won 4 times in 10), each sealed order of
 *    its sestiere open at its visit (solved 6 times in 10), and the problem of the day (6 in 10);
 *    it takes the detour where a tower is still shut;
 *  - « détour »: never a Passe, but the detour where a tower is shut;
 *  - « ni l'un ni l'autre »: never a Passe nor a detour (the computer's houses as they were).
 * Does the one who plays the Passe earn more, but not more than a quarter? Does the detour pay?
 * Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator hex-bench [seeds] [weeks]
 */
import {
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheDaily,
  plancheDailyTry,
  plancheForced,
  plancheInit,
  plancheIsCorsair,
  plancheOrderTry,
  plancheOrders,
  plancheRobot,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SEEDS = Number(process.argv[2]) || 6;
const WEEKS = Number(process.argv[3]) || 2;
// Knobs for the calibration: the units of an order, how eager a house is to move a thread, and
// whether the Passe's players force towers and play the orders (to tell apart what each gives).
const UNITS = Number(process.env.UNITS) || 0;
const EAGER = Number(process.env.EAGER) || 2_500;
const FORCE = process.env.FORCE !== "0";
const ORDERS = process.env.ORDERS !== "0";
/** The Passe's players also force the towers other houses hold (else only the corsairs'). */
const RIVALS = process.env.RIVALS !== "0";
/** Hours a won seal lets one through free; the toll of every tower (bps). */
const FREE = process.env.FREE ? Number(process.env.FREE) : null;
const TOLL = process.env.TOLL ? Number(process.env.TOLL) : null;
const L = venice1450Lagune;
const S = {
  ...L,
  ...(UNITS && L.orders ? { orders: { ...L.orders, units: UNITS } } : {}),
  rules: { ...L.rules, ...(FREE !== null ? { freeAfterForceMs: FREE * 3_600_000 } : {}) },
  passages: TOLL !== null ? L.passages.map((p) => ({ ...p, tollBps: TOLL })) : L.passages,
};
const T0 = Date.parse("2026-11-16T00:00:00Z");

type Kind = "Passe" | "détour" | "ni l'un ni l'autre";
const KINDS: Kind[] = ["Passe", "détour", "ni l'un ni l'autre"];
/** A house's kind turns from seed to seed: no place on the map is any kind's (seeds by three). */
const kindOf = (k: number, seed: number): Kind => KINDS[(k + seed) % 3] as Kind;

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
  for (const h of S.houses) s = plancheClaim(S, s, h.id);
  const offset = new Map(S.houses.map((h) => [h.id, rng.int(0, 7)]));
  const fromOrders = new Map<string, bigint>();
  const counts = { orders: 0, ordersWon: 0, daily: 0, forced: 0 };
  for (let hour = 1; hour <= WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    s = plancheAdvance(S, s, now);
    S.houses.forEach((h, k) => {
      const kind = kindOf(k, seed);
      const off = offset.get(h.id) ?? 0;
      if ((hour + off) % 8 !== 0) return;
      if (kind === "Passe") {
        // Once a day: a shut tower on the way to one of its towns, the problem of the day.
        if ((hour + off) % 24 === 0) {
          // A corsair's tower, or another house's: towers change hands between those who play.
          const shut = S.passages.filter((p) => {
            const holder = s.passages[p.id]?.holder ?? "";
            return plancheIsCorsair(holder) || (RIVALS && holder !== h.id);
          });
          const p = shut.length ? rng.pick(shut) : undefined;
          if (FORCE && p && rng.chance(0.4)) {
            s = attempt(s, () => plancheForced(S, s, h.id, p.id, now));
            counts.forced += 1;
          }
          if (plancheDaily(S, Math.floor(now / DAY))) {
            const won = rng.chance(0.6);
            s = attempt(s, () => plancheDailyTry(S, s, h.id, now, won, 2));
            if (won) counts.daily += 1;
          }
        }
        // The sealed orders of its sestiere open now.
        for (const o of ORDERS ? plancheOrders(S, Math.floor(now / DAY)) : []) {
          if (o.sestiere !== h.sestiere || now < o.from || now > o.to) continue;
          const before = s.houses[h.id]?.ducats ?? 0n;
          const won = rng.chance(0.6);
          const next = attempt(s, () => plancheOrderTry(S, s, h.id, o.id, now, won));
          if (next === s) continue;
          counts.orders += 1;
          s = next;
          const gain = (s.houses[h.id]?.ducats ?? 0n) - before;
          if (gain > 0n) {
            counts.ordersWon += 1;
            fromOrders.set(h.id, (fromOrders.get(h.id) ?? 0n) + gain);
          }
        }
      }
      s = plancheRobot(
        S,
        s,
        h.id,
        now,
        EAGER,
        kind === "ni l'un ni l'autre" ? {} : { detour: true },
      );
    });
  }
  return { s, fromOrders, counts, seed };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const runs = Array.from({ length: SEEDS }, (_, k) => run(k + 1));
const ids = (kind: Kind, seed: number) =>
  S.houses.filter((_, k) => kindOf(k, seed) === kind).map((h) => h.id);
const ducats = (d: bigint) => Number(d / 100n);
const of = (kind: Kind, f: (r: (typeof runs)[number], id: string) => number) =>
  runs.flatMap((r) => ids(kind, r.seed).map((id) => f(r, id)));

console.log(
  `### La Passe dans le commerce : la lagune de Venise sur ${WEEKS} semaines, ${SEEDS} graines\n`,
);
console.log(
  "Un tiers des Maisons de chaque sorte, une visite toutes les 8 h. « Passe » : une tour fermée tentée par jour (gagnée 4 fois sur 10), chaque commande scellée ouverte à sa visite et le problème du jour (réussis 6 fois sur 10), le détour où la tour est encore fermée ; « détour » : jamais de Passe, le détour ; « ni l'un ni l'autre » : ni Passe ni détour.\n",
);
console.log(
  "| Sorte | Gagné par les fils (médiane, ducats) | Moyenne | Dont commandes scellées (moyenne) | Prestige (médiane) |",
);
console.log("| --- | --- | --- | --- | --- |");
const row: Record<Kind, number> = { Passe: 0, détour: 0, "ni l'un ni l'autre": 0 };
for (const kind of KINDS) {
  const earned = of(kind, (r, id) => ducats(r.s.houses[id]?.earned ?? 0n));
  const orders = of(kind, (r, id) => ducats(r.fromOrders.get(id) ?? 0n));
  const prestige = of(kind, (r, id) => {
    const m = r.s.houses[id]?.maison;
    return (m?.prestige ?? 0) + (m?.week ?? 0);
  });
  row[kind] = mean(earned);
  console.log(
    `| ${kind} | ${median(earned)} | ${Math.round(mean(earned))} | ${Math.round(mean(orders))} | ${median(prestige)} |`,
  );
}
const c = runs.map((r) => r.counts);
console.log(
  `\nPar graine (moyenne) : ${Math.round(mean(c.map((x) => x.forced)))} tours tentées et gagnées, ${Math.round(mean(c.map((x) => x.orders)))} commandes scellées jouées dont ${Math.round(mean(c.map((x) => x.ordersWon)))} livrées, ${Math.round(mean(c.map((x) => x.daily)))} problèmes du jour réussis.`,
);
const passe = row.Passe / Math.max(1, row.détour) - 1;
const detour = row.détour / Math.max(1, row["ni l'un ni l'autre"]) - 1;
console.log(
  `\nCelui qui joue la Passe gagne ${(passe * 100).toFixed(0)} % de plus que celui qui prend le détour (cible : plus, mais pas plus de 25 %) ; le détour rapporte ${(detour * 100).toFixed(0)} % de plus que de ne rien faire.`,
);
