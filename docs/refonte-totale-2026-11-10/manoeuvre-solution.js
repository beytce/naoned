// Prints one line of play that saves the whole cargo, for each order, on a level given as JSON in argv[2].
const ENG = require('./eng.js');
const L = JSON.parse(process.argv[2]);
const ORDERS = [['escorte','cale','cale'], ['cale','escorte','cale'], ['cale','cale','escorte']];
function paths(s){ const out=[]; const rec = p => { if (p.length) out.push(p.slice()); if (p.length===3) return;
  const last = p.length ? p[p.length-1] : s.pcs[0];
  for (const v of ENG.D){ const x=last.x+v[0], y=last.y+v[1]; if (ENG.canStep(s,p,x,y)){ p.push({x,y}); rec(p); p.pop(); } } };
  rec([]); return out; }
const keyOf = s => s.bell+'|'+s.pcs.map(p=>p.t[0]+p.x+p.y+p.hp).join('')+'|'+s.g.map(q=>q.alive?q.x+''+q.y+q.d+q.armed:'-').join('');
function find(s, dead){ const k = keyOf(s); if (dead.has(k)) return null;
  for (const p of paths(s)){ const r = ENG.step(s,p).s;
    if (r.res==='passe' && r.pcs.filter(q=>q.t==='cale').length===2) return [p];
    if (!r.res){ const t = find(r, dead); if (t) return [p].concat(t); } }
  dead.add(k); return null; }
ORDERS.forEach((o,i) => { const sol = find(ENG.init(L,o), new Set()); console.log(i, o.join(' '), JSON.stringify(sol && sol.map(p => p.map(c => [c.x,c.y])))); });
