import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { type TerraResult, runTerra } from "./terra.js";

/**
 * `pnpm --filter @comptoirs/simulator terra-buy`: what troops bought with ducats give a rich
 * merchant (decision of the owner, 7 November 2026, which amends golden rule 4). The same weeks
 * on the square grid, troops for sale or not, with four rich merchants (2 000 d a day) among 36
 * others; the report goes to out/terraferma-achat.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5,6,7,8,9,10" },
    /** The troops for sale, in JSON (amount, price in deniers, times a day). */
    buy: { type: "string", default: '{"amount":20,"price":10000,"perDay":3}' },
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
const shut = config({});
const open = config({ troopBuy: JSON.parse(values.buy ?? "{}") });
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
  "# La Terraferme : des troupes achetées avec les ducats",
  "",
  `Grille carrée ; ${n} graines ; 40 marchands dont 4 riches (2 000 d par jour pour la guerre, les sessions d'un régulier) ; vente : \`${values.buy}\` (prix en deniers).`,
  "",
  "| Graine | Riches, sans vente (Gloire · cases, médianes) | Riches, avec vente | Réguliers, avec vente | Signore (sans → avec) |",
  "| --- | --- | --- | --- | --- |",
  ...rows,
  "",
  "| Indicateur | Sans vente | Avec vente |",
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
writeFileSync(join(values.out ?? ".", "terraferma-achat.md"), report);
console.log(report);
