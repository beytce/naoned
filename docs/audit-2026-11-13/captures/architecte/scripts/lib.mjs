import http from "node:http";
import fs from "node:fs";
export const W = "/tmp/claude-0/-home-user-naoned/cabcd3da-95f1-5456-b8d1-734e5fa37f88/scratchpad/audit-archi";
export const agent = new http.Agent({ keepAlive: true, maxSockets: 200 });
export const req = (method, path, body, cookie, ip, gzip = false) => new Promise((res, rej) => {
  const data = body ? JSON.stringify(body) : undefined;
  const t0 = performance.now();
  const r = http.request({ host: "127.0.0.1", port: 3699, path, method, localAddress: ip, agent,
    headers: { ...(data ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...(gzip ? { "accept-encoding": "gzip" } : {}) } }, (s) => {
    const chunks = []; s.on("data", (c) => chunks.push(c)); s.on("end", () => {
      const buf = Buffer.concat(chunks);
      res({ status: s.statusCode, bytes: buf.length, body: gzip ? null : buf.toString(), ms: performance.now() - t0, headers: s.headers });
    });
  });
  r.on("error", (e) => res({ status: 0, bytes: 0, ms: performance.now() - t0, err: e.code })); if (data) r.write(data); r.end();
});
export const players = () => JSON.parse(fs.readFileSync(`${W}/cookies.json`));
export const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export const stats = (a) => !a.length ? {n:0} : ({ n: a.length, p50: +q(a, 0.5).toFixed(1), p95: +q(a, 0.95).toFixed(1), max: +Math.max(...a).toFixed(1), mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) });
