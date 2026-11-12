/**
 * The Arsenal at the bench (docs/plan-arsenal.md A2): a lagoon of 48 over eight weeks, every house
 * played as a regular player (a visit every 8 hours, by the computer's careful merchant, who arms
 * once its level opens the Arsenal). Do two islands of the same Power have different fleets? Does
 * the ratio of sinks to sources reach its target (CADRAGE-v3 § 5.1: 0.6 to 0.8 before three months,
 * 0.9 to 1.0 after)? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator arsenal-bench [seeds] [weeks]
 */
import {
  type PlancheState,
  Rng,
  plancheAdvance,
  plancheClaim,
  plancheInit,
  planchePower,
  plancheRobot,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const SEEDS = Number(process.argv[2]) || 3;
const WEEKS = Number(process.argv[3]) || 8;
const S = venice1450Lagune;
const A = S.arsenal;
if (!A) throw new Error("the lagoon has no Arsenal");
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** What a unit of each good is worth: its full price, on average over the towns that want it. */
const worth: Record<string, number> = {};
for (const g of Object.keys(S.goods)) {
  const ps = S.cities.flatMap((c) => (c.wants[g] ? [c.wants[g].price] : []));
  worth[g] = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
}
const value = (goods: Record<string, number>) =>
  Object.entries(goods).reduce((v, [g, n]) => v + n * (worth[g] ?? 0), 0);

/** The goods a house has put in its fleet and its port, in deniers. */
function armed(s: PlancheState, id: string): number {
  const h = s.houses[id];
  let v = 0;
  for (const x of [...(h?.fleet?.ships ?? []), ...(h?.fleet?.yards ?? [])])
    v += value(A?.ships[x.kind]?.goods ?? {});
  for (const list of Object.values(h?.port ?? {}))
    for (const k of list) v += value(A?.port.defenses[k]?.goods ?? {});
  return v;
}

/** A house's island, named by what its plan works. */
const kindOf = (id: string) => {
  const plan = S.houses.find((h) => h.id === id)?.plan ?? [];
  const worked = plan.filter((w) => (S.ile?.workshops[w]?.tier ?? 1) >= 2);
  return [...new Set(worked)].sort().join("+") || "matières";
};

function run(seed: number) {
  const rng = new Rng(seed);
  let s: PlancheState = plancheInit(S, T0);
  for (const h of S.houses) s = plancheClaim(S, s, h.id);
  const offset = new Map(S.houses.map((h) => [h.id, rng.int(0, 7)]));
  const weeks: { ratio: number; armedShare: number; level: number }[] = [];
  let last = { minted: s.minted, spent: s.spent, burnt: s.burnt, armed: 0 };
  for (let hour = 1; hour <= WEEKS * 7 * 24; hour++) {
    const now = T0 + hour * HOUR;
    s = plancheAdvance(S, s, now);
    for (const h of S.houses)
      if ((hour + (offset.get(h.id) ?? 0)) % 8 === 0) s = plancheRobot(S, s, h.id, now);
    if (hour % (7 * 24) === 0) {
      const arm = S.houses.reduce((v, h) => v + armed(s, h.id), 0);
      const sources = Number(s.minted - last.minted);
      const sinks = Number(s.spent - last.spent + s.burnt - last.burnt) + (arm - last.armed);
      const levels = S.houses.map((h) => s.houses[h.id]?.level ?? 1).sort((a, b) => a - b);
      weeks.push({
        ratio: sinks / Math.max(1, sources),
        armedShare: (arm - last.armed) / Math.max(1, sources),
        level: levels[Math.floor(levels.length / 2)] ?? 1,
      });
      last = { minted: s.minted, spent: s.spent, burnt: s.burnt, armed: arm };
    }
  }
  return { s, weeks };
}

const runs = Array.from({ length: SEEDS }, (_, k) => run(k + 1));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (x: number) => `${Math.round(x * 100)} %`;

console.log(`### L'Arsenal : la lagune de Venise sur ${WEEKS} semaines, ${SEEDS} graines\n`);
console.log(
  "Toutes les Maisons jouées en régulières (une visite toutes les 8 h), qui arment dès que leur niveau ouvre l'Arsenal (niveau 6).\n",
);
console.log(`| Semaine | ${Array.from({ length: WEEKS }, (_, w) => w + 1).join(" | ")} |`);
console.log(`| --- |${" --- |".repeat(WEEKS)}`);
const row = (
  name: string,
  f: (w: { ratio: number; armedShare: number; level: number }) => string,
) =>
  console.log(
    `| ${name} | ${Array.from({ length: WEEKS }, (_, w) =>
      f({
        ratio: mean(runs.map((r) => r.weeks[w]?.ratio ?? 0)),
        armedShare: mean(runs.map((r) => r.weeks[w]?.armedShare ?? 0)),
        level: mean(runs.map((r) => r.weeks[w]?.level ?? 0)),
      }),
    ).join(" | ")} |`,
  );
row("niveau médian", (w) => w.level.toFixed(0));
row("puits / sources", (w) => w.ratio.toFixed(2));
row("dont l'Arsenal", (w) => pct(w.armedShare));

// The fleets at the end, by the island's kind.
console.log(
  "\n| Île (ce qu'elle travaille) | Maisons | Puissance (moyenne) | Flotte (navires, toutes graines) | Port |",
);
console.log("| --- | --- | --- | --- | --- |");
const kinds = [...new Set(S.houses.map((h) => kindOf(h.id)))].sort();
for (const k of kinds) {
  const ids = S.houses.filter((h) => kindOf(h.id) === k).map((h) => h.id);
  const ships: Record<string, number> = {};
  const port: Record<string, number> = {};
  const power: number[] = [];
  for (const r of runs)
    for (const id of ids) {
      const h = r.s.houses[id];
      for (const x of [...(h?.fleet?.ships ?? []), ...(h?.fleet?.yards ?? [])])
        ships[x.kind] = (ships[x.kind] ?? 0) + 1;
      for (const d of Object.values(h?.port ?? {}).flat()) port[d] = (port[d] ?? 0) + 1;
      power.push(planchePower(S, r.s, id));
    }
  const say = (o: Record<string, number>, names: Record<string, { name: string }>) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .map(([k2, n]) => `${n} ${names[k2]?.name.toLowerCase() ?? k2}`)
      .join(", ") || "—";
  console.log(
    `| ${k} | ${ids.length} | ${Math.round(mean(power))} | ${say(ships, A.ships)} | ${say(port, A.port.defenses)} |`,
  );
}

// Two houses of about the same Power, both armed: do they arm alike? Of the same kind of island,
// and of two kinds.
const pairs = { same: 0, sameUnlike: 0, other: 0, otherUnlike: 0 };
for (const r of runs) {
  const hs = S.houses.map((h) => {
    const f = r.s.houses[h.id]?.fleet;
    const all = [...(f?.ships ?? []), ...(f?.yards ?? [])];
    const mix = Object.keys(A.ships)
      .map((k) => all.filter((x) => x.kind === k).length)
      .join(",");
    return { p: planchePower(S, r.s, h.id), mix, kind: kindOf(h.id), armed: all.length > 0 };
  });
  for (let i = 0; i < hs.length; i++)
    for (let j = i + 1; j < hs.length; j++) {
      const a = hs[i];
      const b = hs[j];
      if (!a || !b || !a.armed || !b.armed || Math.abs(a.p - b.p) > 0.05 * a.p) continue;
      const unlike = a.mix !== b.mix ? 1 : 0;
      if (a.kind === b.kind) {
        pairs.same += 1;
        pairs.sameUnlike += unlike;
      } else {
        pairs.other += 1;
        pairs.otherUnlike += unlike;
      }
    }
}
console.log(
  `\nDeux Maisons armées de Puissance proche (5 % près) : de deux sortes d'île, ${pairs.other} paires, dont ${pct(pairs.otherUnlike / Math.max(1, pairs.other))} n'ont pas la même flotte ; de la même sorte, ${pairs.same} paires, ${pct(pairs.sameUnlike / Math.max(1, pairs.same))}.`,
);
