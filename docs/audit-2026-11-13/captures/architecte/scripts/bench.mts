import { plancheTheme, plancheDocInit, plancheDocAdvance, plancheDocApply, PlancheHub } from "/home/user/naoned/apps/server/src/game/planche.ts";
import { encode, toJson } from "/home/user/naoned/apps/server/src/game/serialize.ts";
const H = 3_600_000, D = 24 * H;
const theme = plancheTheme();
const t0 = Date.parse("2026-11-16T10:00:00Z");
let doc = plancheDocInit(theme, t0);
// seat 20 players like newcomers
for (let i = 0; i < 20; i++) doc = plancheDocApply(theme, doc, { type: "seat", player: `p${i}`, name: `Ca' P${i}`, t: t0 }).doc;
const time = (label: string, f: () => void) => { const a = performance.now(); f(); const ms = performance.now() - a; console.log(label, ms.toFixed(1), "ms"); return ms; };
let d = doc;
time("advance 1 h", () => { d = plancheDocAdvance(theme, doc, t0 + H); });
time("advance 1 day", () => { d = plancheDocAdvance(theme, doc, t0 + D); });
let wk = doc;
time("advance 1 week", () => { wk = plancheDocAdvance(theme, doc, t0 + 7 * D); });
time("advance 6 weeks (a tide)", () => { d = plancheDocAdvance(theme, doc, t0 + 42 * D); });
const tide = d;
const sz = (x: any) => JSON.stringify(toJson(x)).length;
console.log("state bytes: t0", sz(doc.state), "1 week", sz(wk.state), "6 weeks", sz(tide.state));
console.log("snapshot (encode) bytes 6 weeks", JSON.stringify(encode(tide)).length);
const parts = (s: any) => Object.fromEntries(Object.keys(s).map((k) => [k, JSON.stringify(toJson(s[k]))?.length ?? 0]).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8));
console.log("parts 6w", parts(tide.state));
// cost of a read: toJson + stringify of the state
time("toJson+stringify of a 6-week state", () => { JSON.stringify(toJson(tide.state)); });
time("x100 toJson+stringify", () => { for (let i = 0; i < 100; i++) JSON.stringify(toJson(tide.state)); });
// a gesture right after the board is current
time("one command (seat) on a current board x100", () => { for (let i = 0; i < 100; i++) plancheDocApply(theme, tide, { type: "seat", player: `q${i}`, name: "x", t: tide.state.now }); });
// memory per hub
(globalThis as any).gc?.();
const m0 = process.memoryUsage().heapUsed;
const keep: any[] = [];
for (let i = 0; i < 20; i++) keep.push(structuredClone(tide));
(globalThis as any).gc?.();
console.log("heap per 6-week doc (MB)", ((process.memoryUsage().heapUsed - m0) / 20 / 1e6).toFixed(2));
