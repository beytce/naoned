/**
 * The War at the bench (docs/plan-guerre.md W5): a season of weeks, players of levels 6 to 15
 * armed by their island's kind (fleets and ports as docs/plan-arsenal.md A2 found them), formed in
 * flotillas of six by bands of Power each Monday; each plays its assault 7 days in 10 (Tuesday to
 * Saturday) with the thinking assailant of the assault's bench, on the port of the other flotilla
 * that has lost the fewest seals; each defender sets new ruses each day. Is a war between equal
 * bands close to even? How many seals, what Prestige? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator guerre-bench [players] [weeks]
 */
import {
  type AssautFleetShip,
  type AssautPort,
  type AssautRuse,
  type AssautState,
  type GuerreAssaultDone,
  Rng,
  assautInit,
  assautPlay,
  assautResult,
  guerreForm,
  guerrePrestige,
  guerreScore,
  venice1450Lagune,
} from "@comptoirs/engine";

const PLAYERS = Number(process.argv[2]) || 120;
/**
 * The peaceful member (docs/plan-compagnie.md K4): half the players in companies of six, two of
 * whom never assault; with PHARE=1 they feed the beacon to level 4 (two places of port more a
 * pass for every member), with PHARE=0 they do nothing. Does the peaceful member count?
 */
const COMPANIES = process.env.COMPANIES === "1";
const PHARE = process.env.PHARE === "1";
const WEEKS = Number(process.argv[3]) || 8;
const G = venice1450Lagune.guerre;
const A = venice1450Lagune.arsenal;
if (!G || !A) throw new Error("the lagoon has no War");
const R = G.assaut;
const PASSES = A.port.passes;
const RUSES: AssautRuse[] = ["chaine", "brulot", "renforts"];

/** The islands' kinds: what they arm and what they lay in their port (A2). */
const KINDS = [
  { ships: ["galere"], extra: ["galeasse"], defense: "tour" },
  { ships: ["galere", "brulot"], extra: ["escorte"], defense: "batterie" },
  { ships: ["brigantin", "brulot"], extra: [], defense: "chaine" },
  { ships: ["brigantin"], extra: [], defense: "chaine" },
];

interface Player {
  group?: string;
  peaceful?: boolean;
  key: string;
  level: number;
  fleet: AssautFleetShip[];
  defenses: Record<string, string[]>;
  power: number;
}

function player(rng: Rng, k: number): Player {
  const level = rng.int(6, 15);
  const kind = KINDS[k % KINDS.length] ?? KINDS[0];
  const n = level >= 10 ? 5 : 3 + (level >= 8 ? 1 : 0);
  const kinds = [...(kind?.ships ?? []), ...(level >= 11 ? (kind?.extra ?? []) : [])];
  const fleet = Array.from({ length: n }, (_, i) => {
    const s = kinds[i % kinds.length] ?? "galere";
    const r = A?.ships[s];
    return {
      id: i + 1,
      kind: s,
      force: r?.force ?? 0,
      hull: r?.hull ?? 0,
      keyword: r?.keyword ?? "",
    };
  });
  // Two places a pass (four with the beacon at 4), filled 3 times in 4, with the island's defense or a tower.
  const inCompany = COMPANIES && k % 2 === 0;
  const slots = inCompany && PHARE ? [0, 1, 2, 3] : [0, 1];
  const defenses: Record<string, string[]> = {};
  for (const p of PASSES)
    defenses[p] = slots.flatMap(() =>
      rng.chance(0.75) ? [rng.chance(0.5) ? (kind?.defense ?? "tour") : "tour"] : [],
    );
  const shipsPower = fleet.reduce((v, x) => v + 5 * (x.force + x.hull + 1), 0);
  const portPower = Object.values(defenses).flat().length * 15;
  // Its workshops weigh as a house of its level would have (A2: about 10 a level).
  const power = shipsPower + portPower + 20 + level * 12;
  return {
    key: `h${k}`,
    level,
    fleet,
    defenses,
    power,
    ...(inCompany ? { group: `c${Math.floor(k / 12)}`, peaceful: Math.floor(k / 2) % 6 < 2 } : {}),
  };
}

const seen = (s: AssautState): AssautState => {
  const v = structuredClone(s);
  for (const [id, p] of Object.entries(v.passes))
    if (!p.ruseDone) {
      const { ruse: _hidden, ...rest } = p;
      v.passes[id] = rest;
    }
  return v;
};
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
function think(s: AssautState): Record<number, string> {
  let best: Record<number, string> = {};
  let top = -1;
  for (const m of placements(s)) {
    let t = assautPlay(R, seen(s), m);
    while (t.manche <= R.manches) t = assautPlay(R, t, {});
    const r = assautResult(R, t);
    const v = r.seals * 10_000 + r.damageBps;
    if (v > top) {
      top = v;
      best = m;
    }
  }
  return best;
}

const rng = new Rng(3);
const players = Array.from({ length: PLAYERS }, (_, k) => player(rng, k));
const byKey = new Map(players.map((p) => [p.key, p]));
const wars: {
  stronger: boolean | null;
  gap: number;
  seals: number;
  company: "won" | "lost" | "tie" | null;
}[] = [];
const prestige: number[] = [];
let assaults = 0;
/** The seals lost by a company's ports, and the assaults they bore. */
const companyPorts = { seals: 0, assaults: 0 };
let seals = 0;
for (let week = 0; week < WEEKS; week++) {
  const { wars: formed } = guerreForm(
    players.map((p) => ({
      key: p.key,
      power: p.power,
      person: true,
      ...(p.group ? { group: p.group } : {}),
    })),
    6,
  );
  for (const war of formed) {
    const done: GuerreAssaultDone[] = [];
    for (let day = 0; day < 5; day++) {
      // Each port's ruses for the day.
      const portOf = (k: string): AssautPort => {
        const p = byKey.get(k);
        const passes: AssautPort["passes"] = {};
        for (const pass of PASSES)
          passes[pass] = { defenses: p?.defenses[pass] ?? [], ruse: rng.pick(RUSES) };
        return { passes };
      };
      for (const side of ["a", "b"] as const) {
        const foes = war[side === "a" ? "b" : "a"];
        for (const k of war[side]) {
          if (!rng.chance(0.7) || byKey.get(k)?.peaceful) continue;
          // The port of the other flotilla that has lost the fewest seals.
          const best = guerreScore(war, done).best;
          const target = [...foes].sort(
            (x, y) => (best[x] ?? 0) - (best[y] ?? 0) || rng.int(0, 1) - 0.5,
          )[0];
          const me = byKey.get(k);
          if (!target || !me) continue;
          let s = assautInit(R, portOf(target), me.fleet);
          while (s.manche <= R.manches) s = assautPlay(R, s, think(s));
          const r = assautResult(R, s);
          done.push({ by: k, target, seals: r.seals, damageBps: r.damageBps });
          if (byKey.get(target)?.group) {
            companyPorts.seals += r.seals;
            companyPorts.assaults += 1;
          }
          assaults += 1;
          seals += r.seals;
        }
      }
    }
    const score = guerreScore(war, done);
    const mean = (ks: string[]) =>
      ks.reduce((v, k) => v + (byKey.get(k)?.power ?? 0), 0) / ks.length;
    const pa = mean(war.a);
    const pb = mean(war.b);
    // A company's flotilla against players alone: did the company win?
    const ca = war.a.some((k) => byKey.get(k)?.group);
    const cb = war.b.some((k) => byKey.get(k)?.group);
    const company =
      ca === cb
        ? null
        : score.winner === null
          ? "tie"
          : (score.winner === "a") === ca
            ? "won"
            : "lost";
    wars.push({
      company,
      stronger: score.winner === null ? null : (score.winner === "a") === pa >= pb,
      gap: Math.abs(score.a - score.b),
      seals: score.a + score.b,
    });
    for (const v of Object.values(guerrePrestige(G.prestige, war, done))) prestige.push(v);
    for (const k of [...war.a, ...war.b])
      if (!guerrePrestige(G.prestige, war, done)[k]) prestige.push(0);
  }
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const decided = wars.filter((w) => w.stronger !== null);
console.log(
  `### La Guerre au banc : ${PLAYERS} joueurs, ${WEEKS} semaines, ${wars.length} guerres\n`,
);
console.log(
  "Joueurs des niveaux 6 à 15, armés selon leur île ; flottilles de six par bandes de Puissance ; un assaut 7 jours sur 10, sur le port adverse qui a perdu le moins de sceaux ; des ruses nouvelles chaque jour.\n",
);
console.log("| Mesure | Valeur |");
console.log("| --- | --- |");
console.log(
  `| La flottille la plus puissante gagne | ${pct(decided.filter((w) => w.stronger).length / Math.max(1, decided.length))} des guerres décidées |`,
);
console.log(
  `| Guerres à égalité | ${pct((wars.length - decided.length) / Math.max(1, wars.length))} |`,
);
console.log(
  `| Écart de sceaux (médiane) | ${median(wars.map((w) => w.gap))} sur ${median(wars.map((w) => w.seals))} brisés en tout |`,
);
console.log(
  `| Guerres jouées à 3 sceaux près ou moins | ${pct(wars.filter((w) => w.gap <= 3).length / Math.max(1, wars.length))} |`,
);
console.log(`| Sceaux par assaut | ${(seals / Math.max(1, assaults)).toFixed(2)} |`);
console.log(
  `| Prestige de guerre par joueur et par semaine (médiane, plus haut 10 %) | ${median(prestige)}, ${[...prestige].sort((a, b) => a - b)[Math.floor(prestige.length * 0.9)] ?? 0} |`,
);
if (COMPANIES) {
  const mixed = wars.filter((w) => w.company);
  console.log(
    `| Compagnies (deux membres paisibles sur six${PHARE ? ", phare au niveau 4" : ", sans phare"}) contre joueurs seuls | ${pct(mixed.filter((w) => w.company === "won").length / Math.max(1, mixed.length))} de victoires sur ${mixed.length} guerres |`,
  );
  console.log(
    `| Sceaux perdus par un port de compagnie, par assaut subi | ${(companyPorts.seals / Math.max(1, companyPorts.assaults)).toFixed(2)} (${companyPorts.assaults} assauts) |`,
  );
}
