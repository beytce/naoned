import { readFileSync } from "node:fs";
import { venice1450Empire } from "@comptoirs/engine";
import { DEFAULT_EMPIRE_OPTIONS, runEmpire } from "./empire/run.js";
const sc = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : {};
const t0 = Date.now();
const r = runEmpire({
  ...DEFAULT_EMPIRE_OPTIONS,
  seed: 1,
  cohortSize: 30,
  months: Number(process.env.MONTHS ?? 24),
  settings: { ...venice1450Empire, ...sc.settings },
  model: sc.model,
});
const w = r.world;
const arm = w.houses.filter((h) => h.bent === "armourer");
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const share = (hs: typeof arm) => {
  const all = hs.reduce((a, h) => a + h.earned, 0n);
  const p = hs.reduce((a, h) => a + h.income.expeditions, 0n);
  return all > 0n ? Number((p * 1000n) / all) / 10 : 0;
};
console.log(
  `${((Date.now() - t0) / 1000).toFixed(0)} s; armourers ${arm.length}; casa median ${med(arm.map((h) => h.casa))}; porta ${arm.filter((h) => h.porta).length}`,
);
console.log(
  `expeditions share armourer ${share(arm)} %; mixed ${share(w.houses.filter((h) => h.bent === "mixed"))} %`,
);
for (const h of arm.filter((x) => x.porta).slice(0, 8)) {
  const p = h.porta!;
  console.log(
    `casa ${h.casa} earned/d ${Number(h.earned / 100n) / (24 * 30)} | battles ${p.battles} won ${p.won} best ${p.best} lvl ${p.level} combat ${p.combat?.model}:${p.combat?.level} lostC ${p.lostCombat} lostT ${p.lostTransport} relics ${JSON.stringify(p.relics)} exp ${Number(h.income.expeditions / 100n)}`,
  );
}
console.log(
  "created relics",
  Number((w.createdBy.relics ?? 0n) / 100n),
  "destroyed porta/arms/victuals",
  ["porta", "arms", "victuals"].map((k) => Number((w.destroyedBy[k] ?? 0n) / 100n)),
);
const byCasa = new Map<number, number[]>();
for (const h of w.houses) {
  const days = h.recent.slice(-30);
  const per = days.length ? Number(days.reduce((a, x) => a + x, 0n) / 100n) / days.length : 0;
  byCasa.set(h.casa, [...(byCasa.get(h.casa) ?? []), per]);
}
console.log(
  [...byCasa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([c, xs]) => `casa ${c}: ${Math.round(med(xs))} d/j (${xs.length})`)
    .join("\n"),
);
for (const h of arm.slice(0, 6))
  console.log(h.casa, h.vehicles.map((v) => v.type).join(","), JSON.stringify(h.levels));
