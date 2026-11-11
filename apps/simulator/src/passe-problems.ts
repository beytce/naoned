/**
 * Finds the problems of the Passe (docs/plan-passe.md P3): positions from games the opponent plays
 * against itself, where the thread, to play, passes in two or three pieces by one key alone.
 * Writes packages/engine/src/themes/venice1450.passe.problems.ts.
 *
 *   pnpm --filter @comptoirs/simulator passe-problems
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PASSE_EMPTY,
  PASSE_REEF,
  type PasseProblem,
  type PasseState,
  Rng,
  passeDistance,
  passeForcedWin,
  passeInit,
  passeKeys,
  passeLegal,
  passePlay,
  passeThink,
} from "@comptoirs/engine";

const WANT = { 2: 12, 3: 8 } as const;
const found: PasseProblem[] = [];
const seen = new Set<string>();
const count = (moves: number) => found.filter((p) => p.moves === moves).length;
const full = () => count(2) >= WANT[2] && count(3) >= WANT[3];

function look(s: PasseState): void {
  if (s.turn !== 1 || s.winner) return;
  const pieces = s.cells.filter((v) => v !== PASSE_EMPTY && v !== PASSE_REEF).length;
  const d = passeDistance(s, 1);
  if (pieces < 6 || d > 3 || d < 2) return;
  const sig = `${s.width}:${s.cells.join("")}`;
  if (seen.has(sig)) return;
  seen.add(sig);
  if (passeForcedWin(s, 1)) return;
  const two = passeKeys(s, 2);
  let moves = 0;
  let key = two[0];
  if (two.length === 1) moves = 2;
  else if (two.length === 0 && count(3) < WANT[3]) {
    const three = passeKeys(s, 3);
    if (three.length === 1) {
      moves = 3;
      key = three[0];
    }
  }
  if (!moves || !key || count(moves) >= WANT[moves as 2 | 3]) return;
  found.push({ id: "", width: s.width, height: s.height, cells: s.cells.slice(), moves, key });
}

for (let seed = 1; !full() && seed < 4000; seed++) {
  const rng = new Rng(seed);
  const size = rng.pick([6, 6, 7, 7, 7]);
  const cells = new Array(size * size).fill(PASSE_EMPTY);
  for (let k = rng.int(0, 2); k > 0; k--) cells[rng.int(size, size * (size - 1) - 1)] = PASSE_REEF;
  let s = passeInit({
    width: size,
    height: size,
    cells,
    first: rng.pick([1, 2] as const),
    fire: { thread: 0, chain: 0 },
    cargo: { holds: 3, full: 8, step: 2 },
  });
  // a few pieces at random, then the opponent against itself, unevenly matched so that positions tilt
  for (let k = 0; k < 4 && !s.winner; k++) s = passePlay(s, rng.pick(passeLegal(s)));
  while (!s.winner) {
    look(s);
    s = passePlay(s, passeThink(s, { depth: s.turn === 1 ? 2 : 1 }, rng));
  }
}

found.sort((a, b) => a.moves - b.moves || a.width - b.width);
found.forEach((p, i) => {
  p.id = `${p.moves === 2 ? "deux" : "trois"}-${String(i + 1).padStart(2, "0")}`;
});
const body = found
  .map(
    (p) =>
      `  { id: ${JSON.stringify(p.id)}, width: ${p.width}, height: ${p.height}, moves: ${p.moves}, key: { at: ${p.key.at} }, cells: [${p.cells.join(", ")}] },`,
  )
  .join("\n");
const out = fileURLToPath(
  new URL("../../../packages/engine/src/themes/venice1450.passe.problems.ts", import.meta.url),
);
writeFileSync(
  out,
  `// Written by \`pnpm --filter @comptoirs/simulator passe-problems\` (docs/plan-passe.md P3). Do not edit by hand.
import type { PasseProblem } from "../passe/problems.js";

// biome-ignore format: one problem a line.
export const venice1450PasseProblems: PasseProblem[] = [
${body}
];
`,
);
console.log(`${count(2)} problems in two pieces, ${count(3)} in three, written to ${out}`);
