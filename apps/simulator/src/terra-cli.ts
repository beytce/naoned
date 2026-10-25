import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseSettings, venice1450Settings } from "@comptoirs/engine";
import { TERRA_PROFILES, type TerraResult, humansOf, runTerra } from "./terra.js";

/** The placebo controls: other draws of the skirmish ranks, and of the minutes of the sessions. */
const DRAWS = ["b", "c", "d"];

interface Runs {
  r: TerraResult;
  first: TerraResult;
  off: TerraResult;
  /** The same week, the ranks of the skirmishes drawn with another key. */
  draws: TerraResult[];
  /** Without skirmishes, the sessions shifted by another draw of their minutes. */
  shifted: TerraResult[];
  /** The ranks of `r`, the merchants leaving the glory of the skirmishes out of their alliances. */
  blind: TerraResult;
}

/**
 * `pnpm --filter @comptoirs/simulator terra`: a week of the Terraferma prototype per seed, played
 * by 40 merchants of the computer; the report goes to out/terraferma.md.
 */

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5" },
    /** Only the Signore among n people and the computer's houses (the 24 October 2026 fix). */
    humans: { type: "string" },
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
 * the same week each of them first every day (the ceiling), `off` without any skirmish, and the
 * controls of the Signore.
 */
function section({ r, first, off, draws, shifted, blind }: Runs): string {
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
  const others = (xs: TerraResult[], than: TerraResult) =>
    `${xs.map((x) => x.signore.id ?? "aucun").join(" · ")} (${xs.filter((x) => x.signore.id !== than.signore.id).length} / ${xs.length} différents)`;
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
    `| Placebo : Signore de la semaine, les rangs tirés d'une autre clé | ${others(draws, r)} de ${r.signore.id ?? "aucun"} ; ${draws.filter((x) => x.signore.id !== off.signore.id).length} / ${draws.length} de la semaine sans escarmouches |`,
    `| Placebo hors escarmouches : sans escarmouches, les sessions décalées d'un autre tirage | ${others(shifted, off)} de la semaine sans escarmouches |`,
    `| Marchands aveugles à la Gloire des escarmouches pour choisir un allié | ${sameSignore(blind)} |`,
    `| Ducats dépensés sur la Terraferme | ${(Number(r.spent) / 100 / Math.max(1, placed.length) / 7).toFixed(0)} d par marchand et par jour |`,
    "",
  ];
  return lines.join("\n");
}

if (values.humans) {
  // The week as it is, then the same week with the others marked as the computer's houses: the
  // marks only change the close, so the week played is the same.
  const n = Number(values.humans);
  const rows = seeds.map((seed) => {
    const humans = humansOf(seed, n);
    const before = runTerra(cfg, seed);
    const after = runTerra(cfg, seed, undefined, undefined, "merchants", { humans });
    const influence = (x: TerraResult) =>
      x.players.filter((p) => humans.has(p.id)).reduce((t, p) => t + p.influence, 0);
    const npc = (x: TerraResult) => x.signore.id !== null && !humans.has(x.signore.id);
    console.log(`seed ${seed}: done`);
    return { seed, before, after, influence, npc };
  });
  const lines = [
    `# Le Signore parmi ${n} marchands et ${40 - n} maisons du PNJ`,
    "",
    "| Graine | Signore avant | PNJ ? | Signore après | PNJ ? | Influence des marchands avant → après |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.seed} | ${r.before.signore.id ?? "aucun"} | ${r.npc(r.before) ? "oui" : "non"} | ${r.after.signore.id ?? "aucun"} | ${r.npc(r.after) ? "oui" : "non"} | ${r.influence(r.before)} → ${r.influence(r.after)} |`,
    ),
    "",
    `Semaines avec un Signore PNJ : avant ${rows.filter((r) => r.npc(r.before)).length} / ${rows.length}, après ${rows.filter((r) => r.npc(r.after)).length} / ${rows.length}.`,
  ].join("\n");
  const out = values.out ?? join(here, "..", "out");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "terraferma-humans.md"), lines);
  console.log(lines);
  process.exit(0);
}

const results = seeds.map((seed): Runs => {
  const t = Date.now();
  const runs: Runs = {
    r: runTerra(cfg, seed),
    first: runTerra(cfg, seed, undefined, undefined, "first"),
    off: runTerra(cfg, seed, undefined, undefined, "off"),
    draws: DRAWS.map((draw) => runTerra(cfg, seed, undefined, undefined, "merchants", { draw })),
    shifted: DRAWS.map((sessions) =>
      runTerra(cfg, seed, undefined, undefined, "off", { sessions }),
    ),
    blind: runTerra(cfg, seed, undefined, undefined, "merchants", { blind: true }),
  };
  console.log(`seed ${seed}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
  return runs;
});
// Over every seed: how often the Signore changes with the skirmishes, with another draw of their
// ranks, and with a gap that owes nothing to them.
const count = (pairs: [TerraResult, TerraResult][]) =>
  `${pairs.filter(([a, b]) => a.signore.id !== b.signore.id).length} / ${pairs.length}`;
const summary = [
  "## Le Signore et les escarmouches, toutes graines",
  "",
  "| Comparaison | Signore différent |",
  "| --- | --- |",
  `| Avec escarmouches (rang parmi les marchands) contre sans | ${count(results.map((x) => [x.r, x.off]))} |`,
  `| Autres tirages des rangs contre le premier tirage | ${count(results.flatMap((x) => x.draws.map((d): [TerraResult, TerraResult] => [d, x.r])))} |`,
  `| Autres tirages des rangs contre sans escarmouches | ${count(results.flatMap((x) => x.draws.map((d): [TerraResult, TerraResult] => [d, x.off])))} |`,
  `| Sans escarmouches, sessions décalées contre sans escarmouches | ${count(results.flatMap((x) => x.shifted.map((d): [TerraResult, TerraResult] => [d, x.off])))} |`,
  `| Marchands aveugles à la Gloire des escarmouches contre sans escarmouches | ${count(results.map((x) => [x.blind, x.off]))} |`,
  `| Premier chaque jour contre sans escarmouches | ${count(results.map((x) => [x.first, x.off]))} |`,
  "",
];
const report = [
  "# La Terraferme : rapport du prototype",
  "",
  ...summary,
  ...results.map(section),
].join("\n");
const out = values.out ?? join(here, "..", "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "terraferma.md"), report);
console.log(report);
