import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  type WorldSettingsInput,
  advanceCondotta,
  createCondotta,
  parseSettings,
  venice1450Settings,
} from "@comptoirs/engine";

/**
 * `pnpm --filter @comptoirs/simulator condotta`: the Condotta (E2-5 of the experts) played by the
 * computer for 1, 2 and 3 merchants at every level; the report goes to out/condotta.md. Every
 * level is the same field (map and nations), so a seed is a player's style: the share of its troops
 * it sends a front, from 40 % to 60 %. The aim (calibration.md): alone, the median player wins
 * level 8 and loses level 10; levels 9 to 12 for 2 or 3.
 */
const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5" },
    /** Overrides of `condotta.nationTroops` and of the nations' count, for the calibration. */
    troops: { type: "string" },
    nations: { type: "string" },
    out: { type: "string", default: join(here, "..", "out") },
  },
});
const settings = parseSettings(venice1450Settings as WorldSettingsInput);
const base = settings.terraferma;
if (!base?.condotta) throw new Error("Venice has no Condotta");
const [min, max] = (values.nations ?? "").split("-").map(Number);
const cfg = {
  ...base,
  condotta: {
    ...base.condotta,
    ...(values.troops ? { nationTroops: Number(values.troops) } : {}),
    ...(min ? { nations: { min, max: max ?? min } } : {}),
  },
};
const seeds = (values.seeds ?? "1").split(",").map(Number);
const levels = Array.from({ length: cfg.condotta?.levels ?? 12 }, (_, k) => k + 1);
const START = Date.UTC(2026, 10, 2, 9, 0);

/** A seed's player style: the share of troops sent a front, 40 % to 60 %. */
const styleOf = (seed: number) => 4_000 + ((seed - 1) % 5) * 500;

function play(seed: number, players: number, level: number) {
  const humans = Array.from({ length: players }, (_, k) => `m${k + 1}`);
  const c = createCondotta(cfg, `sim:${seed}`, humans, level, START, humans, styleOf(seed));
  advanceCondotta(c, c.endsAt + 1);
  return c.result ?? { won: false, shareBps: 0, holdsCity: false, cells: 0 };
}

const lines = [
  "# Condotta: simulation",
  "",
  `nationTroops = ${cfg.condotta?.nationTroops}, nations ${cfg.condotta?.nations.min}–${cfg.condotta?.nations.max}, seeds ${seeds.join(", ")}. A cell: wins / seeds (median share of the land).`,
  "",
  `| Merchants | ${levels.map((l) => `N${l}`).join(" | ")} |`,
  `| --- | ${levels.map(() => "---").join(" | ")} |`,
];
const verdict: string[] = [];
for (const players of [1, 2, 3]) {
  const row: string[] = [];
  for (const level of levels) {
    const runs = seeds.map((seed) => play(seed, players, level));
    const wins = runs.filter((r) => r.won).length;
    const shares = runs.map((r) => r.shareBps).sort((a, b) => a - b);
    const median = shares[Math.floor(shares.length / 2)] ?? 0;
    row.push(`${wins}/${runs.length} (${Math.round(median / 100)} %)`);
    const target = cfg.condotta?.holdShareBps ?? 3_500;
    const side = median >= target ? "won" : "lost";
    if (players === 1 && (level === 8 || level === 10))
      verdict.push(
        `alone, level ${level}: ${wins}/${runs.length} won, the median player (${Math.round(median / 100)} %) ${side}`,
      );
  }
  lines.push(`| ${players} | ${row.join(" | ")} |`);
}
lines.push("", ...verdict.map((v) => `- ${v}`));
const report = lines.join("\n");
mkdirSync(values.out ?? ".", { recursive: true });
writeFileSync(join(values.out ?? ".", "condotta.md"), `${report}\n`);
console.log(report);
