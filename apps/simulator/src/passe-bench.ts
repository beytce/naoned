/**
 * The balance of the Passe (docs/plan-passe.md P4): the opponent against itself. How often the
 * thread passes on each of Venice's boards, what shifts it on a bare board (reefs, posts or barges
 * laid in advance, the first move), and whether seeing further wins. Prints Markdown for
 * docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator passe-bench [games] [venise|reglage|force]
 */
import {
  PASSE_EMPTY,
  type PasseSetup,
  Rng,
  passeInit,
  passeLegal,
  passePlay,
  passeThink,
  venice1450Passe,
} from "@comptoirs/engine";

const GAMES = Number(process.argv[2]) || 40;
const ONLY = process.argv[3] ?? "";
const { rules, boards } = venice1450Passe;

/** One game; the seed draws the two opening pieces and shakes the choices a little. */
function game(setup: PasseSetup, thread: number, chain: number, seed: number) {
  const rng = new Rng(seed);
  let s = passeInit(setup);
  // One piece each at random first: without it two fixed minds replay the same game.
  for (let k = 0; k < 2 && !s.winner; k++) s = passePlay(s, rng.pick(passeLegal(s)));
  while (!s.winner) s = passePlay(s, passeThink(s, { depth: s.turn === 1 ? thread : chain }, rng));
  return s;
}

function share(setup: PasseSetup, depth: number): { wins: number; barges: string } {
  let wins = 0;
  let barges = 0;
  for (let n = 0; n < GAMES; n++) {
    const s = game(setup, depth, depth, n + 1);
    if (s.winner === 1) wins++;
    barges += s.laid[0];
  }
  return { wins: Math.round((wins / GAMES) * 100), barges: (barges / GAMES).toFixed(1) };
}

/** A square board from its rows: `.` empty, `o` a post, `x` a barge, `#` a reef. */
function rows(first: 1 | 2, lines: string[]): PasseSetup {
  const cells = lines.flatMap((r) =>
    [...r].map((c) => (c === "#" ? 3 : c === "o" ? 2 : c === "x" ? 1 : PASSE_EMPTY)),
  );
  return { ...rules, width: lines[0]?.length ?? 0, height: lines.length, cells, first };
}

if (!ONLY || ONLY === "venise") {
  console.log(
    `### Les passages de Venise (${GAMES} parties par case, l'adversaire contre lui-même)\n`,
  );
  console.log(
    "| Passage | Damier | Force 2 : le fil passe | Force 3 : le fil passe | Barges posées |",
  );
  console.log("| --- | --- | --- | --- | --- |");
  for (const b of Object.values(boards)) {
    const setup = { ...rules, ...b };
    const two = share(setup, 2);
    const three = b.width > 7 ? null : share(setup, 3);
    console.log(
      `| ${b.name} | ${b.width} × ${b.height} | ${two.wins} % | ${three ? `${three.wins} %` : "non mesuré"} | ${(three ?? two).barges} |`,
    );
  }
}

if (!ONLY || ONLY === "reglage") {
  console.log(`\n### Ce qui déplace l'équilibre (damier de 7 × 7, ${GAMES} parties par case)\n`);
  console.log("| Réglage | Force 2 : le fil passe | Force 3 : le fil passe |");
  console.log("| --- | --- | --- |");
  const bare = [".......", ".......", ".......", ".......", ".......", ".......", "......."];
  const withAt = (marks: [number, number, string][]) =>
    bare.map((r, y) =>
      [...r].map((c, x) => marks.find((m) => m[0] === x && m[1] === y)?.[2] ?? c).join(""),
    );
  const variants: [string, PasseSetup][] = [
    ["Damier nu, le fil commence", rows(1, bare)],
    ["Damier nu, la chaîne commence", rows(2, bare)],
    ["Un écueil au centre, le fil commence", rows(1, withAt([[3, 3, "#"]]))],
    ["Un écueil au bord, le fil commence", rows(1, withAt([[0, 3, "#"]]))],
    [
      "Deux écueils aux bords, le fil commence",
      rows(
        1,
        withAt([
          [0, 2, "#"],
          [6, 4, "#"],
        ]),
      ),
    ],
    [
      "Un écueil au centre, une barge d'avance",
      rows(
        1,
        withAt([
          [3, 3, "#"],
          [3, 5, "x"],
        ]),
      ),
    ],
    [
      "Un écueil au centre, deux barges d'avance",
      rows(
        1,
        withAt([
          [3, 3, "#"],
          [2, 5, "x"],
          [4, 1, "x"],
        ]),
      ),
    ],
    ["Un maillon d'avance, le fil commence", rows(1, withAt([[5, 2, "o"]]))],
  ];
  for (const [name, setup] of variants)
    console.log(`| ${name} | ${share(setup, 2).wins} % | ${share(setup, 3).wins} % |`);
}

if (!ONLY || ONLY === "force") {
  console.log(
    "\n### Voir plus loin fait-il gagner ? (damier nu, chacun joue le fil puis la chaîne)\n",
  );
  console.log("| Le plus fort | Le plus faible | Parties gagnées par le plus fort |");
  console.log("| --- | --- | --- |");
  const bare = rows(1, [
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
  ]);
  for (const [strong, weak] of [
    [2, 1],
    [3, 1],
    [3, 2],
  ] as const) {
    let wins = 0;
    const half = Math.ceil(GAMES / 2);
    for (let n = 0; n < half; n++) {
      if (game(bare, strong, weak, n + 1).winner === 1) wins++;
      if (game(bare, weak, strong, n + 1).winner === 2) wins++;
    }
    console.log(`| ${strong} | ${weak} | ${Math.round((wins / (half * 2)) * 100)} % |`);
  }
}
