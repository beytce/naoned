/**
 * The balance of the Passe (docs/plan-passe.md P4): the opponent against itself. How often the
 * thread passes on each of Venice's boards, how the posts laid in advance and the first move shift
 * it, and whether seeing further wins. Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator passe-bench [games]
 */
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  type PasseSetup,
  Rng,
  passeInit,
  passePlay,
  passeThink,
  venice1450Passe,
} from "@comptoirs/engine";

const GAMES = Number(process.argv[2]) || 60;
const { rules, boards } = venice1450Passe;

/** One game; the seed shakes the choices a little so that the games differ. */
function game(setup: PasseSetup, thread: number, chain: number, seed: number) {
  const rng = new Rng(seed);
  let s = passeInit(setup);
  while (!s.winner) s = passePlay(s, passeThink(s, { depth: s.turn === 1 ? thread : chain }, rng));
  return s;
}

function share(setup: PasseSetup, thread: number, chain: number): { wins: number; barges: number } {
  let wins = 0;
  let barges = 0;
  for (let n = 0; n < GAMES; n++) {
    const s = game(setup, thread, chain, n + 1);
    if (s.winner === 1) wins++;
    barges += s.laid[0];
  }
  return { wins: Math.round((wins / GAMES) * 100), barges: Math.round((barges / GAMES) * 10) / 10 };
}

console.log(`### Les passages de Venise (${GAMES} parties par ligne, l'adversaire contre lui-même)\n`);
console.log("| Passage | Damier | Force 2 contre 2 : le fil passe | Force 3 contre 3 : le fil passe | Barges posées |");
console.log("| --- | --- | --- | --- | --- |");
for (const b of Object.values(boards)) {
  const setup = { ...rules, ...b };
  const two = share(setup, 2, 2);
  const three = share(setup, 3, 3);
  console.log(`| ${b.name} | ${b.width} × ${b.height} | ${two.wins} % | ${three.wins} % | ${three.barges} |`);
}

console.log("\n### Les maillons posés d'avance (damier nu de 7 × 7, force 2 contre 2)\n");
console.log("| Maillons d'avance | Le fil commence | La chaîne commence |");
console.log("| --- | --- | --- |");
for (const posts of [0, 1, 2, 3]) {
  const row: string[] = [];
  for (const first of [1, 2] as const) {
    let wins = 0;
    for (let n = 0; n < GAMES; n++) {
      const rng = new Rng(5000 + posts * 100 + n);
      const cells = new Array(49).fill(PASSE_EMPTY);
      for (let k = 0; k < posts; k++) {
        let i = rng.int(7, 41);
        while (cells[i] !== PASSE_EMPTY) i = rng.int(7, 41);
        cells[i] = PASSE_CHAIN;
      }
      if (game({ ...rules, width: 7, height: 7, cells, first }, 2, 2, n + 1).winner === 1) wins++;
    }
    row.push(`${Math.round((wins / GAMES) * 100)} %`);
  }
  console.log(`| ${posts} | ${row.join(" | ")} |`);
}

console.log("\n### Voir plus loin fait-il gagner ? (Segna, chacun joue le fil puis la chaîne)\n");
console.log("| Le plus fort | Le plus faible | Parties gagnées par le plus fort |");
console.log("| --- | --- | --- |");
const segna = { ...rules, ...boards.segna };
for (const [strong, weak] of [
  [2, 1],
  [3, 1],
  [3, 2],
  [4, 2],
] as const) {
  let wins = 0;
  const half = Math.ceil(GAMES / 2);
  for (let n = 0; n < half; n++) {
    if (game(segna, strong, weak, n + 1).winner === 1) wins++;
    if (game(segna, weak, strong, n + 1).winner === 2) wins++;
  }
  console.log(`| ${strong} | ${weak} | ${Math.round((wins / (half * 2)) * 100)} % |`);
}
