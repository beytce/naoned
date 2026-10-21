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

/**
 * A seed's week: `r` with the merchants ranked among themselves in their skirmishes, `first`
 * the same week each of them first every day (the ceiling), `off` without any skirmish.
 */
function section(r: TerraResult, first: TerraResult, off: TerraResult): string {
  const placed = r.players.filter((p) => p.placed);
  const land = placed.reduce((n, p) => n + p.cells, 0);
  const top = [...placed].sort((a, b) => b.cells - a.cells);
  const out = placed.filter((p) => p.cells === 0).length;
  const byProfile = Object.keys(TERRA_PROFILES).map((k) => {
    const ps = placed.filter((p) => p.profile === k);
    return { k, cells: median(ps.map((p) => p.cells)), glory: median(ps.map((p) => p.glory)) };
  });
  // The share of the skirmishes in a regular's and an active's median week, and the ceiling: a
  // merchant first every day, against a regular's median week without skirmishes.
  const regularGlory = (x: TerraResult) =>
    median(x.players.filter((p) => p.placed && p.profile === "regular").map((p) => p.glory));
  const share = (x: TerraResult, profile: string) => {
    const ps = x.players.filter((p) => p.placed && p.profile === profile);
    const week = median(ps.map((p) => p.glory));
    return pct(Math.round((median(ps.map((p) => p.skirmishGlory)) * 10_000) / Math.max(1, week)));
  };
  const ceiling = Math.max(0, ...first.players.map((p) => p.skirmishGlory));
  // The same week ranked on its glory less what the skirmishes brought (a conquest stands).
  const lessSkirmishes = (x: TerraResult) => {
    const id = x.signore.conquest
      ? x.signore.id
      : ([...x.players]
          .filter((p) => p.placed)
          .map((p) => ({ id: p.id, glory: p.glory - p.skirmishGlory }))
          .filter((p) => p.glory > 0)
          .sort((a, b) => b.glory - a.glory || (a.id < b.id ? -1 : 1))[0]?.id ?? null);
    return id === x.signore.id ? "le même" : `${id ?? "aucun"} (les escarmouches ont décidé)`;
  };
  const sameSignore = (x: TerraResult) =>
    `${x.signore.id ?? "aucun"}${x.signore.id === off.signore.id ? " (le même)" : " (un autre)"}`;
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
    `| Marchands posés | ${placed.length} / ${r.players.length} ; éliminés (sans terre en fin de semaine) : ${out} |`,
    `| Le premier tient | ${top[0]?.cells ?? 0} cases (${pct(Math.round(((top[0]?.cells ?? 0) * 10_000) / r.cells))} de la carte) ; les trois premiers ${pct(Math.round((top.slice(0, 3).reduce((n, p) => n + p.cells, 0) * 10_000) / r.cells))} |`,
    `| Cases médianes par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${x.cells}`).join(" · ")} |`,
    `| Gloire médiane par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${x.glory}`).join(" · ")} |`,
    `| Assidus devant occasionnels (Gloire médiane) | ${((active / Math.max(1, casual)) * 100).toFixed(0)} % |`,
    `| Terre tenue par les marchands en fin de semaine | ${pct(Math.round((land * 10_000) / r.cells))} |`,
    `| Alliés en fin de semaine | ${placed.filter((p) => p.allies > 0).length} marchands sur ${placed.length} ont au moins un allié |`,
    `| Signore | ${r.signore.id ?? "aucun"} (${r.signore.profile ? TERRA_PROFILES[r.signore.profile]?.name : "—"})${r.signore.conquest ? ", par conquête" : ""} ; décret : ${r.signore.decree ?? "aucun"} |`,
    `| Influence médiane par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${median(placed.filter((p) => p.profile === x.k).map((p) => p.influence))}`).join(" · ")} |`,
    `| Gloire médiane des escarmouches par profil | ${byProfile.map((x) => `${TERRA_PROFILES[x.k]?.name} ${median(placed.filter((p) => p.profile === x.k).map((p) => p.skirmishGlory))}`).join(" · ")} |`,
    `| Part des escarmouches dans la Gloire médiane, rang parmi les marchands | réguliers ${share(r, "regular")} · assidus ${share(r, "active")} |`,
    `| Part des escarmouches, chaque marchand premier chaque jour | réguliers ${share(first, "regular")} · assidus ${share(first, "active")} |`,
    `| Plafond : premier chaque jour, contre la semaine médiane d'un régulier sans escarmouches | ${ceiling} / ${regularGlory(off)} = ${pct(Math.round((ceiling * 10_000) / Math.max(1, regularGlory(off))))} |`,
    `| Signore de la même semaine, sa Gloire moins celle des escarmouches | rang parmi les marchands : ${lessSkirmishes(r)} ; premier chaque jour : ${lessSkirmishes(first)} |`,
    `| Signore de la semaine rejouée sans escarmouches | ${off.signore.id ?? "aucun"} ; avec, rang parmi les marchands : ${sameSignore(r)} ; premier chaque jour : ${sameSignore(first)} |`,
    `| Ducats dépensés sur la Terraferme | ${(Number(r.spent) / 100 / Math.max(1, placed.length) / 7).toFixed(0)} d par marchand et par jour |`,
    "",
  ];
  return lines.join("\n");
}

const results = seeds.map((seed) => {
  const t = Date.now();
  const runs = [
    runTerra(cfg, seed),
    runTerra(cfg, seed, undefined, undefined, "first"),
    runTerra(cfg, seed, undefined, undefined, "off"),
  ] as const;
  console.log(`seed ${seed}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
  return runs;
});
const report = [
  "# La Terraferme : rapport du prototype",
  "",
  ...results.map((runs) => section(...runs)),
].join("\n");
const out = values.out ?? join(here, "..", "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "terraferma.md"), report);
console.log(report);
