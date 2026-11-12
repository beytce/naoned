/**
 * The assault at the bench (docs/plan-guerre.md W2; 01-audit-guerre.md § 5): fleets and ports as
 * the lagoon's houses arm them (levels 6 to 15: 3 to 5 ships, two places a pass), every ruse.
 * An assailant who lays its ships at random, and one who thinks (it tries every placement of the
 * round, without knowing the ruses not yet shown). Does any fleet win always? Does thinking pay?
 * How many seals? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator assaut-bench [ports]
 */
import {
  type AssautFleetShip,
  type AssautPort,
  type AssautRuse,
  type AssautState,
  Rng,
  assautInit,
  assautPlay,
  assautResult,
  venice1450Lagune,
} from "@comptoirs/engine";

const PORTS = Number(process.argv[2]) || 300;
const G = venice1450Lagune.guerre;
const A = venice1450Lagune.arsenal;
if (!G || !A) throw new Error("the lagoon has no War");
// Knobs for the calibration: a tower's fire and hull, a battery's hull, the fleet's size.
const knob = (k: string) => (process.env[k] ? Number(process.env[k]) : null);
const R = {
  ...G.assaut,
  tower: { fire: knob("FIRE") ?? G.assaut.tower.fire },
  hulls: {
    ...G.assaut.hulls,
    tour: knob("THULL") ?? G.assaut.hulls.tour ?? 6,
    batterie: knob("BHULL") ?? G.assaut.hulls.batterie ?? 4,
  },
};
const SHIPS = knob("SHIPS") ?? 4;
Object.assign(R, {
  hiddenFire: knob("HIDDEN") ?? G.assaut.hiddenFire,
  fireshipTower: knob("FIRESHIP") ?? G.assaut.fireshipTower,
  reinforcements: {
    ...G.assaut.reinforcements,
    force: knob("RFORCE") ?? G.assaut.reinforcements.force,
  },
});
/** A ship's hull, by the knob (BRIG: the brigantine's). */
const hullOf = (kind: string, base: number) =>
  kind === "brigantin" ? (knob("BRIG") ?? base) : base;
const RUSE = knob("RUSE") ?? 1;
const PASSES = A.port.passes;
const RUSES: AssautRuse[] = ["chaine", "brulot", "renforts"];

/** The fleets compared: what an island of each kind arms (docs/plan-arsenal.md A2). */
const FLEETS: Record<string, string[]> = {
  "galères (bois)": ["galere", "galere", "galere", "galere"],
  "brigantins (chanvre)": ["brigantin", "brigantin", "brigantin", "brigantin"],
  "brigantins et brûlots": ["brigantin", "brigantin", "brulot", "brulot"],
  "galères et brûlots": ["galere", "galere", "brulot", "brulot"],
  "galères et galéasse": ["galere", "galere", "galeasse", "galere"],
  mêlée: ["galere", "brigantin", "brulot", "galeasse"],
  "galères et nef": ["galere", "galere", "galere", "escorte"],
};
const fleetOf = (kinds0: string[]): AssautFleetShip[] =>
  Array.from({ length: SHIPS }, (_, k) => kinds0[k % kinds0.length] as string).map((kind, k) => {
    const r = A.ships[kind];
    return {
      id: k + 1,
      kind,
      force: r?.force ?? 0,
      hull: hullOf(kind, r?.hull ?? 0),
      keyword: r?.keyword ?? "",
    };
  });

/** A port: two places a pass, each a tower, a chain, a battery or nothing; a ruse on each pass. */
function portOf(rng: Rng): AssautPort {
  const passes: AssautPort["passes"] = {};
  for (const p of PASSES) {
    const defenses: string[] = [];
    for (let k = 0; k < 2; k++) {
      const d = rng.pick(["tour", "tour", "chaine", "batterie", ""]);
      if (d) defenses.push(d);
    }
    // A ruse on a pass, as often as the knob says (all of them, by default: the defender sets one each).
    const r = rng.pick(RUSES);
    passes[p] = rng.chance(RUSE) ? { defenses, ruse: r } : { defenses };
  }
  return { passes };
}

/** What the assailant knows of the port: the ruses not yet shown are hidden from it. */
function seen(s: AssautState): AssautState {
  const v = structuredClone(s);
  for (const [id, p] of Object.entries(v.passes))
    if (!p.ruseDone) {
      const { ruse: _hidden, ...rest } = p;
      v.passes[id] = rest;
    }
  return v;
}

const score = (s: AssautState) => {
  const r = assautResult(R, s);
  return r.seals * 10_000 + r.damageBps;
};

/** Every placement of this round: each ship that may move goes to a pass or stays. */
function placements(s: AssautState): Record<number, string>[] {
  const free = Object.entries(s.ships)
    .filter(([, x]) => !x.sunk && (x.at === null || x.keyword === "rapide"))
    .map(([id, x]) => ({ id: Number(id), at: x.at }));
  let out: Record<number, string>[] = [{}];
  for (const f of free) {
    const next: Record<number, string>[] = [];
    for (const m of out) {
      next.push(m);
      for (const p of PASSES) if (p !== f.at) next.push({ ...m, [f.id]: p });
    }
    out = next;
  }
  return out;
}

/** The thinking assailant: the placement whose end (nothing more laid after) is best as it sees it. */
function think(s: AssautState): Record<number, string> {
  let best: Record<number, string> = {};
  let top = -1;
  for (const m of placements(s)) {
    let t = assautPlay(R, seen(s), m);
    while (t.manche <= R.manches) t = assautPlay(R, t, {});
    const v = score(t);
    if (v > top) {
      top = v;
      best = m;
    }
  }
  return best;
}

/** The careless assailant: every ship on a pass drawn at random, at the first round. */
function careless(s: AssautState, rng: Rng): Record<number, string> {
  if (s.manche > 1) return {};
  return Object.fromEntries(Object.keys(s.ships).map((id) => [Number(id), rng.pick(PASSES)]));
}

function assault(
  port: AssautPort,
  fleet: AssautFleetShip[],
  how: (s: AssautState) => Record<number, string>,
) {
  let s = assautInit(R, port, fleet);
  while (s.manche <= R.manches) s = assautPlay(R, s, how(s));
  return assautResult(R, s);
}

const rng = new Rng(7);
const ports = Array.from({ length: PORTS }, () => portOf(rng));
const pct = (x: number) => `${Math.round(x * 100)} %`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(
  `### L'assaut au banc : ${PORTS} ports, ${Object.keys(FLEETS).length} flottes de ${SHIPS} navires, tour ${R.tower.fire} · ${R.hulls.tour}\n`,
);
console.log(
  "Ports : deux places par passe (tour, tour, chaîne, batterie ou rien), une ruse par passe. « Gagner » : briser au moins deux sceaux.\n",
);
console.log(
  "| Flotte | Gagne (réfléchi) | Sceaux (réfléchi) | Trois sceaux | Sceaux (au hasard) | Coulés par assaut |",
);
console.log("| --- | --- | --- | --- | --- | --- |");
const all: { seals: number }[] = [];
const byPort: number[][] = ports.map(() => []);
for (const [name, kinds] of Object.entries(FLEETS)) {
  const fleet = fleetOf(kinds);
  const smart = ports.map((p) => assault(p, fleet, think));
  const r2 = new Rng(11);
  const rand = ports.map((p) => assault(p, fleet, (s) => careless(s, r2)));
  all.push(...smart);
  smart.forEach((r, k) => byPort[k]?.push(r.seals * 10_000 + r.damageBps));
  console.log(
    `| ${name} | ${pct(mean(smart.map((r) => (r.seals >= 2 ? 1 : 0))))} | ${mean(smart.map((r) => r.seals)).toFixed(2)} | ${pct(mean(smart.map((r) => (r.seals === 3 ? 1 : 0))))} | ${mean(rand.map((r) => r.seals)).toFixed(2)} | ${mean(smart.map((r) => r.damaged.length)).toFixed(1)} |`,
  );
}
console.log(
  `\nEn tout (réfléchi) : ${mean(all.map((r) => r.seals)).toFixed(2)} sceau par assaut, ${pct(mean(all.map((r) => (r.seals === 3 ? 1 : 0))))} d'assauts à trois sceaux (cibles : 1,6 et 30 %).`,
);
// Which fleet does best on each port (ties shared): none should be best everywhere.
const names = Object.keys(FLEETS);
const best = names.map(() => 0);
for (const scores of byPort) {
  const top = Math.max(...scores);
  const winners = scores.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
  for (const i of winners) best[i] = (best[i] ?? 0) + 1 / winners.length;
}
console.log(
  `\nLa meilleure flotte, port par port : ${names.map((n, i) => `${n} ${pct((best[i] ?? 0) / PORTS)}`).join(", ")}.`,
);
