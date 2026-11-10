/*ENGINE*/
// The Manoeuvre rules, pure and deterministic: the same code plays the page and feeds the solver.
const ENG = (() => {
  const D = [[0,-1],[1,0],[0,1],[-1,0]]; // 0 north (towards the exit), 1 east, 2 south, 3 west
  const key = (x,y) => x+','+y;
  function init(L, order){
    const pcs = [{t:'tete',hp:2}].concat(order.map(t => ({t, hp: t==='escorte' ? 2 : 1})));
    pcs.forEach((p,k) => { p.x = L.start[0]; p.y = L.start[1]+k; });
    return { W:L.W, H:L.H, rocks:new Set(L.rocks), bell:1, limit:L.limit, pcs, lost:0, res:null,
      g: L.guard.map(q => ({k:q.k, x:q.x, y:q.y, d:q.d||0, ph:q.ph||0, alive:true, armed:-1})) };
  }
  const clone = s => ({...s, pcs:s.pcs.map(p => ({...p})), g:s.g.map(q => ({...q}))});
  const inb = (s,x,y) => x>=0 && y>=0 && x<s.W && y<s.H;
  const rock = (s,x,y) => s.rocks.has(key(x,y));
  const gAt = (s,x,y) => s.g.find(q => q.alive && q.x===x && q.y===y);
  const pAt = (s,x,y) => s.pcs.find(p => p.x===x && p.y===y);
  function ray(s,x,y,d,max){ const out=[]; for (let n=0;n<max;n++){ x+=D[d][0]; y+=D[d][1]; if (!inb(s,x,y) || rock(s,x,y)) break; out.push([x,y]); } return out; }
  // what the guard announces for the coming bell
  function threats(s){ const out=[];
    s.g.forEach((q,i) => { if (!q.alive) return;
      if (q.k==='bombarde'){ if (s.bell%2===q.ph) ray(s,q.x,q.y,q.d,99).forEach(c => out.push({x:c[0],y:c[1],from:i})); }
      else if (q.k==='sentinelle') ray(s,q.x,q.y,q.d,2).forEach(c => out.push({x:c[0],y:c[1],from:i}));
      else if (q.k==='galere') D.forEach(v => { const x=q.x+v[0], y=q.y+v[1]; if (inb(s,x,y) && !rock(s,x,y)) out.push({x,y,from:i}); });
      else if (q.k==='brulot' && q.armed>=0) ray(s,q.x,q.y,q.armed,99).forEach(c => out.push({x:c[0],y:c[1],from:i}));
    }); return out; }
  function canStep(s,path,x,y){ const h=s.pcs[0], last=path.length ? path[path.length-1] : h;
    return Math.abs(x-last.x)+Math.abs(y-last.y)===1 && path.length<3 && inb(s,x,y) && !rock(s,x,y) && !gAt(s,x,y) && !pAt(s,x,y) && !path.some(p => p.x===x && p.y===y); }
  function step(s0,path){ const s=clone(s0), ev=[], L=path.length, old=s.pcs.map(p => ({x:p.x,y:p.y}));
    s.pcs.forEach((p,k) => { const q = k<L ? path[L-1-k] : old[k-L]; p.x=q.x; p.y=q.y; });
    const hit = (p,by) => { p.hp--; ev.push({hit:p.t, x:p.x, y:p.y, by}); };
    const kill = (q,by) => { q.alive=false; ev.push({sunk:q.k, x:q.x, y:q.y, by}); };
    const live = p => p.hp>0;
    const occP = (x,y) => s.pcs.find(p => live(p) && p.x===x && p.y===y);
    // 1. the escort rams a galley it touches
    const esc = s.pcs.find(p => p.t==='escorte');
    if (esc) s.g.forEach(q => { if (q.alive && q.k==='galere' && Math.abs(q.x-esc.x)+Math.abs(q.y-esc.y)===1) kill(q,'escorte'); });
    // 2. an armed fireship runs until something stops it, then blows up everything it touches, friend or foe
    s.g.forEach(q => { if (!q.alive || q.k!=='brulot' || q.armed<0) return; const d=q.armed;
      for (;;){ const x=q.x+D[d][0], y=q.y+D[d][1]; if (!inb(s,x,y) || rock(s,x,y) || occP(x,y) || gAt(s,x,y)) break; q.x=x; q.y=y; }
      ev.push({boom:1, x:q.x, y:q.y}); q.alive=false;
      D.forEach(v => { const x=q.x+v[0], y=q.y+v[1], p=occP(x,y), o=gAt(s,x,y); if (p) hit(p,'brulot'); if (o) kill(o,'brulot'); }); });
    // 3. a shot stops at the first piece on its line, whoever it belongs to
    const shot = (q,max) => { for (const c of ray(s,q.x,q.y,q.d,max)){ const p=occP(c[0],c[1]); if (p){ hit(p,q.k); return; } const o=gAt(s,c[0],c[1]); if (o){ kill(o,q.k); return; } } };
    s.g.forEach(q => { if (q.alive && q.k==='bombarde' && s.bell%2===q.ph) shot(q,99); });
    s.g.forEach(q => { if (q.alive && q.k==='sentinelle') shot(q,2); });
    s.g.forEach(q => { if (q.alive && q.k==='galere') D.forEach(v => { const p=occP(q.x+v[0],q.y+v[1]); if (p) hit(p,'galere'); }); });
    const head = s.pcs[0], headDead = head.hp<=0;
    s.lost += s.pcs.filter(p => p.hp<=0 && p.t==='cale').length; s.pcs = s.pcs.filter(live);
    if (headDead){ s.res='coule'; return {s,ev}; }
    if (head.y===0){ s.res='passe'; return {s,ev}; }
    // 4. the guard reacts, each piece by its own fixed rule
    s.g.forEach(q => { if (!q.alive) return;
      if (q.k==='galere'){ const dx=Math.sign(head.x-q.x), dy=Math.sign(head.y-q.y), hz=Math.abs(head.x-q.x)>=Math.abs(head.y-q.y);
        for (const [mx,my] of hz ? [[dx,0],[0,dy]] : [[0,dy],[dx,0]]){ if (!mx && !my) continue; const x=q.x+mx, y=q.y+my;
          if (inb(s,x,y) && !rock(s,x,y) && !gAt(s,x,y) && !pAt(s,x,y)){ q.x=x; q.y=y; break; } } }
      else if (q.k==='sentinelle') q.d=(q.d+1)%4;
      else if (q.k==='brulot' && q.armed<0){ for (let d=0; d<4 && q.armed<0; d++){ let x=q.x, y=q.y;
        for (;;){ x+=D[d][0]; y+=D[d][1]; if (!inb(s,x,y) || rock(s,x,y) || gAt(s,x,y)) break; if (pAt(s,x,y)){ q.armed=d; break; } } } } });
    s.bell++; if (s.bell>s.limit) s.res='chaine';
    return {s,ev}; }
  return {D, init, clone, threats, canStep, step};
})();
/*END*/
if (typeof module !== 'undefined') module.exports = ENG;
