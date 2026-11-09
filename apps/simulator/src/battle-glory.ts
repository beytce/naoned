import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { type TerraResult, runTerra } from "./terra.js";

/**
 * `pnpm --filter @comptoirs/simulator battle-glory`: what the Battle's Glory (lot T6b, B5) weighs
 * in a week of the new Terraferma (the square grid, the war chest, the territory that makes the
 * army). The Battle pays as the skirmishes did, one ranked a day; the same weeks with the ranks
 * among the merchants, first each day (the ceiling), and without; the report goes to
 * out/bataille-gloire.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5,6,7,8,9,10" },
    out: { type: "string", default: join(here, "..", "out") },
  },
});
const seeds = (values.seeds ?? "1").split(",").map(Number);
const cfg = parseSettings(venice1450Settings).terraferma;
if (!cfg?.skirmish) throw new Error("Venice has no Battle");
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length === 0 ? 0 : (v[Math.floor((v.length - 1) / 2)] as number);
};
const of = (r: TerraResult, profile: string) =>
  r.players.filter((p) => p.profile === profile && p.placed);
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a * 100) / b)} %` : "—");

const ceiling = 7 * Math.max(...cfg.skirmish.glory);
const rows: string[] = [];
const shares = { merchants: [] as number[], first: [] as number[], ceiling: [] as number[] };
let signoreChanged = 0;
for (const seed of seeds) {
  const off = runTerra(cfg, seed, undefined, undefined, "off");
  const mer = runTerra(cfg, seed, undefined, undefined, "merchants");
  const first = runTerra(cfg, seed, undefined, undefined, "first");
  const week = median(of(off, "regular").map((p) => p.glory));
  const sk = (r: TerraResult, profile: string) =>
    median(of(r, profile).map((p) => p.skirmishGlory));
  const total = (r: TerraResult, profile: string) => median(of(r, profile).map((p) => p.glory));
  const m = (sk(mer, "regular") * 10_000) / Math.max(1, total(mer, "regular"));
  const f = (sk(first, "regular") * 10_000) / Math.max(1, total(first, "regular"));
  shares.merchants.push(m);
  shares.first.push(f);
  shares.ceiling.push((ceiling * 10_000) / Math.max(1, week));
  if (mer.signore.id !== off.signore.id) signoreChanged++;
  rows.push(
    `| ${seed} | ${week} | ${sk(mer, "regular")} · ${sk(mer, "active")} | ${(m / 100).toFixed(1)} % | ${(f / 100).toFixed(1)} % | ${pct(ceiling, week)} | ${off.signore.profile ?? "—"} → ${mer.signore.profile ?? "—"} |`,
  );
}
const out = [
  "# La Gloire de la Bataille (lot T6b, B5)",
  "",
  `Barème ${cfg.skirmish.glory.join(" / ")} (rang parmi les marchands), ${cfg.skirmish.rankedPerDay} Bataille classée par jour, ${cfg.skirmish.minHumans} marchands au moins, heures ouvertes ${cfg.openHours.from} h à ${cfg.openHours.to} h ; plafond ${ceiling} de Gloire par semaine.`,
  "",
  "| Graine | Gloire médiane d'un régulier, semaine sans Bataille | Gloire des Batailles, rang parmi les marchands (régulier · assidu) | Part, rang parmi les marchands (régulier) | Part, premier chaque jour (régulier) | Plafond contre la semaine d'un régulier | Signore (sans → avec) |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows,
  "",
  `Médianes des graines : part ${(median(shares.merchants) / 100).toFixed(1)} % (rang parmi les marchands), ${(median(shares.first) / 100).toFixed(1)} % (premier chaque jour), plafond ${(median(shares.ceiling) / 100).toFixed(1)} % ; Signore changé ${signoreChanged} / ${seeds.length}.`,
  "",
];
mkdirSync(values.out ?? ".", { recursive: true });
writeFileSync(join(values.out ?? ".", "bataille-gloire.md"), out.join("\n"));
console.log(out.join("\n"));
