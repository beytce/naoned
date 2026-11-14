import fs from "node:fs";
import { createRequire } from "node:module";
import { req, players, stats, W } from "./lib.mjs";
const WS = createRequire(import.meta.url)("/home/user/naoned/node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js");
const N = Number(process.argv[2] ?? 48), G = Number(process.argv[3] ?? 60000), DUR = Number(process.argv[4] ?? 90000), POLL = Number(process.argv[5] ?? 20000);
const pid = Number(fs.readFileSync(`${W}/pid`, "utf8"));
const cpu = () => { const f = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" "); return (Number(f[11]) + Number(f[12])) * 10; };
const rss = () => Number(fs.readFileSync(`/proc/${pid}/status`, "utf8").match(/VmRSS:\s+(\d+)/)[1]) / 1024;
const P = players().slice(0, N);
let pushes = 0; const readMs = [], gestMs = [], health = []; const answers = {};
let stop = false;
const socks = await Promise.all(P.map((p) => new Promise((res) => {
  const s = new WS("ws://127.0.0.1:3699/api/live", { headers: { cookie: p.cookie }, localAddress: p.ip });
  s.on("open", () => res(s)); s.on("error", () => res(s));
  s.on("message", async (d) => { if (stop || process.env.NOPUSH) return; const m = JSON.parse(String(d)); if (m.type !== "planche") return; pushes++;
    const a = await req("GET", "/api/planche", null, p.cookie, p.ip, true); readMs.push(a.ms);
    const b = await req("GET", "/api/maison", null, p.cookie, p.ip, true); readMs.push(b.ms); });
})));
const c0 = cpu(), t0 = Date.now();
(async () => { while (!stop) { const r = await req("GET", "/api/health", null, null, "127.0.0.1"); health.push(r.ms); await new Promise((r) => setTimeout(r, 250)); } })();
await Promise.all(P.map(async (p, k) => {
  let on = false; let nextG = t0 + Math.random() * G, nextP = t0 + Math.random() * POLL;
  while (Date.now() - t0 < DUR) {
    const now = Date.now();
    if (now >= nextG) { const r = await req("POST", `/api/planche/${on ? "unthread" : "thread"}`, { city: "rialto", good: "sand" }, p.cookie, p.ip, true); on = !on; gestMs.push(r.ms); answers[r.status] = (answers[r.status] ?? 0) + 1; nextG += G; }
    if (now >= nextP) { const r = await req("GET", "/api/planche", null, p.cookie, p.ip, true); readMs.push(r.ms); nextP += POLL; }
    await new Promise((r) => setTimeout(r, 100));
  }
}));
const el = Date.now() - t0; stop = true; const c = cpu() - c0;
console.log(JSON.stringify({ players: N, gestureEveryS: G / 1000, pollS: POLL / 1000, gestures: gestMs.length, gps: +(gestMs.length / el * 1000).toFixed(2), answers, gesture: stats(gestMs), pushes, reads: readMs.length, read: stats(readMs), health: stats(health), cpuPct: +(100 * c / el).toFixed(0), rssMB: rss().toFixed(0) }));
socks.forEach((s) => s.close()); setTimeout(() => process.exit(0), 500);
