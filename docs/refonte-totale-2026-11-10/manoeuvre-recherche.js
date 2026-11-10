// Searches for guards that are solvable but that neither haste nor short-sighted caution can pass.
const ENG = require('./eng.js');
const ORDERS = [['escorte','cale','cale'], ['cale','escorte','cale'], ['cale','cale','escorte']];
function rnd(seed){ let a = seed>>>0; return () => { a = (a + 0x6D2B79F5)|0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function paths(s){ const out=[]; const rec = p => { if (p.length) out.push(p.slice()); if (p.length===3) return;
  const last = p.length ? p[p.length-1] : s.pcs[0];
  for (const v of ENG.D){ const x=last.x+v[0], y=last.y+v[1]; if (ENG.canStep(s,p,x,y)){ p.push({x,y}); rec(p); p.pop(); } } };
  rec([]); return out; }
const keyOf = s => s.bell+'|'+s.pcs.map(p=>p.t[0]+p.x+p.y+p.hp).join('')+'|'+s.g.map(q=>q.alive?q.x+''+q.y+q.d+q.armed:'-').join('');
const cargo = r => r.pcs.filter(q=>q.t==='cale').length;
// number of complete lines that pass with 2, 1, 0 holds, and total lines
function count(s, memo){ const k = keyOf(s); if (memo.has(k)) return memo.get(k);
  const c = [0,0,0,0]; // fail, 0, 1, 2
  if ((s.limit - s.bell + 1) * 3 < s.pcs[0].y) c[0] = 1;
  else { const ps = paths(s); if (!ps.length) c[0] = 1;
    for (const p of ps){ const r = ENG.step(s,p).s;
      if (r.res==='passe') c[1+cargo(r)]++; else if (r.res) c[0]++; else { const d = count(r, memo); for (let i=0;i<4;i++) c[i] += d[i]; } } }
  memo.set(k, c); return c; }
// a player who looks k bells ahead and only tries not to be hit, then to advance
function look(s, k){ let bv = 1e9, bp = null;
  for (const p of paths(s)){ const r = ENG.step(s,p); let v = r.ev.filter(e => e.hit).length*100 + (r.s.res==='coule' ? 1e6 : 0);
    if (!r.s.res && k>1){ const n = look(r.s, k-1); v += n ? n.v : 1e5; } else v += r.s.pcs[0] ? r.s.pcs[0].y : 9;
    if (v < bv){ bv = v; bp = p; } }
  return bp ? {v:bv, p:bp} : null; }
function play(s0, k){ let s = s0; while (!s.res){ const n = look(s, k); if (!n) return -1; s = ENG.step(s, n.p).s; } return s.res==='passe' ? cargo(s) : -1; }

function gen(R){ const W=7, H=10, used = new Set(['3,6','3,7','3,8','3,9','3,5']);
  const cell = (ymin,ymax) => { for (let n=0;n<50;n++){ const x=Math.floor(R()*W), y=ymin+Math.floor(R()*(ymax-ymin+1)); if (!used.has(x+','+y)){ used.add(x+','+y); return [x,y]; } } return null; };
  const rocks = ['3,4']; used.add('3,4');
  for (let n=0, m=3+Math.floor(R()*3); n<m; n++){ const c = cell(1,7); if (c) rocks.push(c[0]+','+c[1]); }
  const guard = [];
  for (let n=0, m=1+Math.floor(R()*2); n<m; n++){ const side = R()<.5, y = 1+Math.floor(R()*5); const x = side?0:6; if (used.has(x+','+y)) continue; used.add(x+','+y); guard.push({k:'bombarde',x,y,d:side?1:3,ph:Math.floor(R()*2)}); }
  for (let n=0, m=1+Math.floor(R()*2); n<m; n++){ const c = cell(0,4); if (c) guard.push({k:'sentinelle',x:c[0],y:c[1],d:Math.floor(R()*4)}); }
  for (let n=0, m=1+Math.floor(R()*2); n<m; n++){ const c = R()<.5 ? cell(0,3) : cell(7,9); if (c) guard.push({k:'galere',x:c[0],y:c[1]}); }
  if (R()<.8){ const c = cell(0,4); if (c) guard.push({k:'brulot',x:c[0],y:c[1]}); }
  return {W,H,start:[3,6],limit:6,rocks,guard}; }

const R = rnd(+process.argv[2] || 1), found = [], t0 = Date.now();
let tried = 0;
while (Date.now() - t0 < (+process.argv[3] || 150) * 1000){ tried++; const L = gen(R);
  const per = ORDERS.map(o => { const s0 = ENG.init(L,o); const c = count(s0, new Map()); return {o, c, k1:play(s0,1), k2:play(s0,2)}; });
  const twos = per.filter(x => x.c[3] > 0);
  if (!twos.length) continue;                                   // must be solvable with the full cargo
  if (per.some(x => x.k1 >= 1 || x.k2 >= 2)) continue;          // caution one bell ahead saves nothing; two bells ahead never saves all
  const tot = x => x.c[0]+x.c[1]+x.c[2]+x.c[3];
  const rare = Math.min(...twos.map(x => x.c[3]/tot(x)));
  found.push({L, per:per.map(x => ({o:x.o.join(' '), lines:tot(x), two:x.c[3], one:x.c[2], k1:x.k1, k2:x.k2})), orders:twos.length, rare}); }
found.sort((a,b) => a.orders - b.orders || a.rare - b.rare);
console.log('essais', tried, 'retenus', found.length);
for (const f of found.slice(0,6)) console.log(JSON.stringify(f));
