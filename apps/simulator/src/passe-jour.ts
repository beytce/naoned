/**
 * The problems of the day (docs/plan-duels.md B5): a year of positions where the thread, to play,
 * passes in exactly two, three or four pieces by one key alone, whatever the chain answers; found
 * in games the opponent plays against itself, on boards of the lagoon's sizes, each checked by the
 * solver. Writes packages/engine/src/themes/venice1450.passe.jour.ts.
 *
 *   pnpm --filter @comptoirs/simulator passe-jour            (all at once, on one core)
 *   pnpm --filter @comptoirs/simulator passe-jour 1/3 a.json (a third of the games, kept aside)
 *   pnpm --filter @comptoirs/simulator passe-jour a.json b.json c.json (the thirds, merged)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PASSE_EMPTY,
  PASSE_REEF,
  type PasseProblem,
  type PasseState,
  Rng,
  passeDistance,
  passeInit,
  passeKeys,
  passeLegal,
  passePlay,
  passeThink,
} from "@comptoirs/engine";

const args = process.argv.slice(2);
const shard = /^(\d+)\/(\d+)$/.exec(args[0] ?? "");
const [part, parts] = shard ? [Number(shard[1]), Number(shard[2])] : [1, 1];
const merging = !shard && args.length > 0;
/** A year: most in two and three pieces, a fifth in four (the Sundays and a few more). */
const YEAR: Record<number, number> = { 2: 150, 3: 140, 4: 75 };
const WANT: Record<number, number> = Object.fromEntries(
  Object.entries(YEAR).map(([m, n]) => [m, Math.ceil(n / parts)]),
);
const found: PasseProblem[] = [];
const seen = new Set<string>();
const count = (moves: number) => found.filter((p) => p.moves === moves).length;
const full = () => [2, 3, 4].every((m) => count(m) >= (WANT[m] ?? 0));

/** The fewest pieces that win by one key alone, none fewer: the problem's length, or 0. */
function length(s: PasseState): { moves: number; key: PasseProblem["key"] } | null {
  const d = passeDistance(s, 1);
  // Four pieces only where the thread is four cells away on a small board: the search is long.
  const most = d === 4 ? (s.width === 6 ? 4 : 0) : 3;
  for (let moves = Math.max(1, d - 1); moves <= most; moves++) {
    if (moves > 2 && count(moves) >= (WANT[moves] ?? 0)) return null;
    const keys = passeKeys(s, moves);
    if (keys.length > 1) return null;
    const key = keys[0];
    if (key) return moves === 1 || count(moves) >= (WANT[moves] ?? 0) ? null : { moves, key };
  }
  return null;
}

function look(s: PasseState): void {
  if (s.turn !== 1 || s.winner) return;
  const pieces = s.cells.filter((v) => v !== PASSE_EMPTY && v !== PASSE_REEF).length;
  const d = passeDistance(s, 1);
  if (pieces < 6 || d > 4 || d < 2) return;
  const sig = `${s.width}:${s.cells.join("")}`;
  if (seen.has(sig)) return;
  seen.add(sig);
  const p = length(s);
  if (p) found.push({ id: "", width: s.width, height: s.height, cells: s.cells.slice(), ...p });
}

const started = Date.now();
if (merging) {
  const all = args.flatMap((f) => JSON.parse(readFileSync(f, "utf8")) as PasseProblem[]);
  const sigs = new Set<string>();
  for (const p of all) {
    const sig = `${p.width}:${p.cells.join("")}`;
    if (sigs.has(sig) || found.filter((q) => q.moves === p.moves).length >= (YEAR[p.moves] ?? 0))
      continue;
    sigs.add(sig);
    found.push(p);
  }
}
for (let seed = part; !merging && !full() && seed < 40_000; seed += parts) {
  const rng = new Rng(90_000 + seed);
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
  for (let k = 0; k < 4 && !s.winner; k++) s = passePlay(s, rng.pick(passeLegal(s)));
  while (!s.winner) {
    look(s);
    s = passePlay(s, passeThink(s, { depth: s.turn === 1 ? 2 : 1 }, rng));
  }
  if (seed % 20 === 0)
    console.log(
      `${seed} games, ${count(2)}/${count(3)}/${count(4)}, ${Math.round((Date.now() - started) / 1000)} s`,
    );
}

if (shard) {
  writeFileSync(args[1] ?? `jour-${part}.json`, JSON.stringify(found));
  console.log(`${found.length} problems kept aside`);
  process.exit(0);
}

// The year, mixed: a fixed order where the four-piece ones fall apart from each other.
const rng = new Rng(2026);
const year = [...found];
for (let i = year.length - 1; i > 0; i--) {
  const j = rng.int(0, i);
  [year[i], year[j]] = [year[j] as PasseProblem, year[i] as PasseProblem];
}
year.forEach((p, i) => {
  p.id = `jour-${String(i + 1).padStart(3, "0")}`;
});
const body = year
  .map(
    (p) =>
      `  { id: ${JSON.stringify(p.id)}, width: ${p.width}, height: ${p.height}, moves: ${p.moves}, key: { at: ${p.key.at} }, cells: [${p.cells.join(", ")}] },`,
  )
  .join("\n");
const out = fileURLToPath(
  new URL("../../../packages/engine/src/themes/venice1450.passe.jour.ts", import.meta.url),
);
writeFileSync(
  out,
  `// Written by \`pnpm --filter @comptoirs/simulator passe-jour\` (docs/plan-duels.md B5). Do not edit by hand.
import type { PasseProblem } from "../passe/problems.js";

// biome-ignore format: one problem a line.
export const venice1450PasseJour: PasseProblem[] = [
${body}
];
`,
);
console.log(
  `${year.length} problems of the day (${count(2)} in two, ${count(3)} in three, ${count(4)} in four), written to ${out}`,
);
