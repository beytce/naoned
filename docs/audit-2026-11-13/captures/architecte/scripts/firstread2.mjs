import { req, players, stats } from "./lib.mjs";
const P = players(); const health = []; let stop = false;
(async () => { await new Promise((r) => setTimeout(r, 50)); while (!stop) { const r = await req("GET", "/api/health", null, null, "127.0.0.1"); health.push(r.ms); await new Promise((r) => setTimeout(r, 100)); } })();
const r = await req("GET", "/api/planche", null, P[0].cookie, P[0].ip);
const j = JSON.parse(r.body).planche;
stop = true;
console.log("first read Murano", r.ms.toFixed(0), "ms; raw", r.bytes, "B; sorties", JSON.stringify(j.state.sorties?.done), "tower", JSON.stringify(j.state.passages["bouche-cannaregio"]));
console.log("health during", stats(health));
const b = await req("GET", "/api/planche", null, P[50].cookie, P[50].ip); console.log("first read Burano", b.ms.toFixed(0), "ms");
