import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { type TerraResult, runTerra } from "./terra.js";

/**
 * `pnpm --filter @comptoirs/simulator terra-chest`: what the equal war chest takes from a rich
 * merchant (the owner's decisions of 8 November 2026). The same weeks on the square grid, the
 * buildings and the cap paid in ducats (before) or in écus from the chest (now), with four rich
 * merchants (2 000 d a day) among 36 others; the report goes to out/terraferma-tresor.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5,6,7,8,9,10" },
    /** The chest, in JSON (start, perDay, cap, prices in écus); Venice's by default. */
    chest: { type: "string", default: "" },
    out: { type: "string", default: join(here, "..", "out") },
  },
});
const seeds = (values.seeds ?? "1").split(",").map(Number);
const config = (more: object) => {
  const cfg = parseSettings({
    ...venice1450Settings,
    terraferma: { ...venice1450Settings.terraferma, grid: "square", ...more },
  } as typeof venice1450Settings).terraferma;
  if (!cfg) throw new Error("Venice has no Terraferma");
  return cfg;
};
// Before: no chest, the ducats pay. Now: the chest (Venice's, or the one given).
const shut = config({ chest: undefined });
const open = config(values.chest ? { chest: JSON.parse(values.chest) } : {});
const MIX = { active: 12, regular: 12, casual: 10, late: 2, rich: 4 };

const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length === 0 ? 0 : (v[Math.floor((v.length - 1) / 2)] as number);
};
const of = (r: TerraResult, profile: string) => r.players.filter((p) => p.profile === profile);
/** The rank (1 = first) of the best of a profile in glory. */
const bestRank = (r: TerraResult, profile: string) => {
  const order = [...r.players].sort((a, b) => b.glory - a.glory);
  return order.findIndex((p) => p.profile === profile) + 1;
};

const rows: string[] = [];
const sum = { shut: { signore: 0, top3: 0 }, open: { signore: 0, top3: 0 } };
const glory = { shut: [] as number[], open: [] as number[], regular: [] as number[] };
const cells = { shut: [] as number[], open: [] as number[], regular: [] as number[] };
let spentShut = 0n;
let spentOpen = 0n;
for (const seed of seeds) {
  const a = runTerra(shut, seed, MIX);
  const b = runTerra(open, seed, MIX);
  for (const [k, r] of [
    ["shut", a],
    ["open", b],
  ] as const) {
    if (r.signore.profile === "rich") sum[k].signore++;
    if (bestRank(r, "rich") <= 3) sum[k].top3++;
    glory[k].push(median(of(r, "rich").map((p) => p.glory)));
    cells[k].push(median(of(r, "rich").map((p) => p.cells)));
  }
  glory.regular.push(median(of(b, "regular").map((p) => p.glory)));
  cells.regular.push(median(of(b, "regular").map((p) => p.cells)));
  spentShut += a.spent;
  spentOpen += b.spent;
  rows.push(
    `| ${seed} | ${median(of(a, "rich").map((p) => p.glory))} · ${median(of(a, "rich").map((p) => p.cells))} | ${median(of(b, "rich").map((p) => p.glory))} · ${median(of(b, "rich").map((p) => p.cells))} | ${median(of(b, "regular").map((p) => p.glory))} · ${median(of(b, "regular").map((p) => p.cells))} | ${a.signore.profile ?? "—"} → ${b.signore.profile ?? "—"} |`,
  );
}
const n = seeds.length;
const pct = (x: number, y: number) => (y > 0 ? `${Math.round((x * 100) / y)} %` : "—");
const days = 7 * 40 * n;
const report = [
  "# La Terraferme : le trésor de guerre égal",
  "",
  `Grille carrée ; ${n} graines ; 40 marchands dont 4 riches (2 000 d par jour pour la guerre, les sessions d'un régulier) ; trésor : \`${JSON.stringify(open.chest)}\` (écus).`,
  "",
  "| Graine | Riches, ducats (Gloire · cases, médianes) | Riches, trésor | Réguliers, trésor | Signore (ducats → trésor) |",
  "| --- | --- | --- | --- | --- |",
  ...rows,
  "",
  "| Indicateur | Ducats (avant) | Trésor (maintenant) |",
  "| --- | --- | --- |",
  `| Gloire médiane des riches (médiane des graines) | ${median(glory.shut)} | ${median(glory.open)} |`,
  `| Cases médianes des riches | ${median(cells.shut)} | ${median(cells.open)} |`,
  `| Riches devant les réguliers (Gloire) | — | ${pct(median(glory.open), median(glory.regular))} |`,
  `| Un riche Signore | ${sum.shut.signore} / ${n} | ${sum.open.signore} / ${n} |`,
  `| Un riche dans les trois premiers | ${sum.shut.top3} / ${n} | ${sum.open.top3} / ${n} |`,
  `| Ducats détruits par marchand et par jour | ${Number(spentShut / BigInt(days)) / 100} d | ${Number(spentOpen / BigInt(days)) / 100} d |`,
  "",
].join("\n");
mkdirSync(values.out ?? ".", { recursive: true });
writeFileSync(join(values.out ?? ".", "terraferma-tresor.md"), report);
console.log(report);
