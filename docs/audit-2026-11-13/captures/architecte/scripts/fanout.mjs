import fs from "node:fs";
import { createRequire } from "node:module";
import { req, players, stats, W } from "./lib.mjs";
const require = createRequire("/home/user/naoned/node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js");
const WS = require("/home/user/naoned/node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js");
const pid = Number(fs.readFileSync(`${W}/pid`, "utf8"));
const cpu = () => { const f = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" "); return (Number(f[11]) + Number(f[12])) * 10; };
const P = players().slice(0, 48);
const GESTURES = JSON.parse(process.argv[2] ?? '[["build",{"kind":"sand_pit","at":"1,0"}],["build",{"kind":"farm","at":"1,1"}]]');
let pushes = 0, reads = 0; const readMs = [], gestMs = [], health = [];
const socks = await Promise.all(P.map((p) => new Promise((res) => {
  const s = new WS("ws://127.0.0.1:3699/api/live", { headers: { cookie: p.cookie }, localAddress: p.ip });
  s.on("open", () => res(s));
  s.on("message", async (d) => {
    const m = JSON.parse(String(d)); if (m.type !== "planche") return; pushes++;
    const a = await req("GET", "/api/planche", null, p.cookie, p.ip, true); readMs.push(a.ms); reads++;
    const b = await req("GET", "/api/maison", null, p.cookie, p.ip, true); readMs.push(b.ms); reads++;
  });
  s.on("error", (e) => { console.log("ws err", e.message); res(s); });
})));
console.log("sockets open", socks.filter((s) => s.readyState === 1).length);
let stop = false;
(async () => { while (!stop) { const r = await req("GET", "/api/health", null, null, "127.0.0.1"); health.push(r.ms); await new Promise((r) => setTimeout(r, 200)); } })();
const c0 = cpu(), t0 = Date.now(); const answers = {};
for (const [path, body] of GESTURES) {
  await Promise.all(P.map(async (p) => {
    const r = await req("POST", `/api/planche/${path}`, body, p.cookie, p.ip, true); gestMs.push(r.ms);
    answers[r.status] = (answers[r.status] ?? 0) + 1;
  }));
}
await new Promise((r) => setTimeout(r, 1000));
let last = -1; while (last !== reads) { last = reads; await new Promise((r) => setTimeout(r, 1500)); }
const el = Date.now() - t0; stop = true;
console.log(JSON.stringify({ gestures: gestMs.length, answers, gesture: stats(gestMs), pushes, reads, read: stats(readMs), health: stats(health), wallMs: el, cpuMs: cpu() - c0 }));
socks.forEach((s) => s.close());
