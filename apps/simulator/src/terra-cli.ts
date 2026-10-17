import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { TERRA_PROFILES, type TerraResult, runTerra } from "./terra.js";

/**
 * `pnpm --filter @comptoirs/simulator terra`: a week of the Terraferma prototype per seed, played
 * by 40 merchants of the computer; the report goes to out/terraferma.md.
 */

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5" },
    out: { type: "string", default: join(here, "..", "out") },
  },
});
const cfg = parseSettings(venice1450Settings).terraferma;
if (!cfg) throw new Error("Venice has no Terraferma");
const seeds = (values.seeds ?? "1").split(",").map(Number);

const pct = (bps: number) => `${(bps / 100).toFixed(0)} %`;
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length === 0 ? 0 : (v[Math.floor((v.length - 1) / 2)] as number);
};

function section(r: TerraResult): string {
  const placed = r.players.filter((p) => p.placed);
  const land = placed.reduce((n, p) => n + p.cells, 0);
  const top = [...placed].sort((a, b) => b.cells - a.cells);
  const out = placed.filter((p) => p.cells === 0).length;
  const byProfile = Object.keys(TERRA_PROFILES).map((k) => {
    const ps = placed.filter((p) => p.profile === k);
    return { k, cells: median(ps.map((p) => p.cells)), glory: median(ps.map((p) => p.glory)) };
  });
  const active = byProfile.find((x) => x.k === "active")?.glory ?? 0;
  const casual = byProfile.find((x) => x.k === "casual")?.glory ?? 1;
  const lines = [
    `## Graine ${r.seed} — ${r.cells} cases`,
    "",
    "| Indicateur | Valeur |",
    "| --- | --- |",
    `| Terre neutre à 22 h, jour par jour | ${r.daily.map((d) => pct(d.neutralBps)).join(" · ")} |`,
    `| Milan à 22 h, jour par jour | ${r.daily.map((d) => pct(d.milanBps)).join(" · ")} |`,
    `| Premier front entre marchands | ${r.firstContactHours === null ? "jamais" : `${r.firstContactHours} h après l'ouverture`} |`,
    `| Fronts lancés | ${r.fronts.launched} (contre des marchands ${r.fronts.againstMerchants}, de Milan ${r.fronts.byMilan}) |`,
    `| Marchands posés | ${placed.length} / ${r.players.length} ; sans terre en fin de semaine : ${out} |`,
    `| Le premier tient | ${top[0]?.cells ?? 0} cases (${pct(Math.round(((top[0]?.cells ?? 0) * 10_000) / r.cells))} de la carte) ; les trois premiers ${pct(Math.round((top.slice(0, 3).reduce((n, p) => n + p.cells, 0) * 10_000) / r.cells))} |`,
    `| Cases médianes par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${x.cells}`).join(" · ")} |`,
    `| Gloire médiane par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${x.glory}`).join(" · ")} |`,
    `| Assidus devant occasionnels (Gloire médiane) | ${((active / Math.max(1, casual)) * 100).toFixed(0)} % |`,
    `| Terre tenue par les marchands en fin de semaine | ${pct(Math.round((land * 10_000) / r.cells))} |`,
    "",
  ];
  return lines.join("\n");
}

const results = seeds.map((seed) => {
  const t = Date.now();
  const r = runTerra(cfg, seed);
  console.log(`seed ${seed}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
  return r;
});
const report = ["# La Terraferme : rapport du prototype", "", ...results.map(section)].join("\n");
const out = values.out ?? join(here, "..", "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "terraferma.md"), report);
console.log(report);
