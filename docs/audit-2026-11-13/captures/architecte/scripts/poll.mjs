import fs from "node:fs";
import { req, players, stats, W } from "./lib.mjs";
const N = Number(process.argv[2] ?? 20), EVERY = Number(process.argv[3] ?? 2000), DUR = Number(process.argv[4] ?? 60000);
const withMaison = process.argv[5] === "maison";
const pid = Number(fs.readFileSync(`${W}/pid`, "utf8"));
const cpu = () => { const f = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" "); return (Number(f[11]) + Number(f[12])) * 10; };
const rss = () => Number(fs.readFileSync(`/proc/${pid}/status`, "utf8").match(/VmRSS:\s+(\d+)/)[1]) / 1024;
const P = players().slice(0, N); const ms = []; let bytes = 0, errs = 0;
const c0 = cpu(), t0 = Date.now();
await Promise.all(P.map(async (p, k) => {
  await new Promise((r) => setTimeout(r, (k * EVERY) / N));
  while (Date.now() - t0 < DUR) {
    const a = Date.now();
    const r = await req("GET", "/api/planche", null, p.cookie, p.ip, true);
    if (r.status !== 200) errs++; ms.push(r.ms); bytes += r.bytes;
    if (withMaison) { const m = await req("GET", "/api/maison", null, p.cookie, p.ip, true); ms.push(m.ms); }
    await new Promise((r) => setTimeout(r, Math.max(0, EVERY - (Date.now() - a))));
  }
}));
const el = Date.now() - t0, c = cpu() - c0;
console.log(JSON.stringify({ players: N, everyMs: EVERY, reqs: ms.length, rps: +(ms.length / el * 1000).toFixed(1), lat: stats(ms), errs, cpuPct: +(100 * c / el).toFixed(1), cpuMsPerReq: +(c / ms.length).toFixed(2), kBps: +(bytes / el).toFixed(1), rssMB: rss().toFixed(0) }));
