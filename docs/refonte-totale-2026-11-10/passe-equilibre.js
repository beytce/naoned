// Balance of "la Passe": the plain opponent plays itself, with more or fewer chain posts laid in advance.
// node passe-equilibre.js [games]
const P = require('./passe-moteur.js');
function rnd(seed){ let a = seed>>>0; return () => { a = (a + 0x6D2B79F5)|0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
const GAMES = +process.argv[2] || 60, W = 7, H = 7;
for (const reefs of [0, 2]) for (const posts of [0, 2, 3, 4, 5]) for (const first of [1, 2]){
  let wins = 0, len = 0;
  for (let n = 0; n < GAMES; n++){ const R = rnd(1000*posts + 10*reefs + n + 1), cells = new Array(W*H).fill(0);
    const free = () => { for (;;){ const x = Math.floor(R()*W), y = 1 + Math.floor(R()*(H-2)); if (!cells[y*W+x]) return y*W+x; } };
    for (let k = 0; k < reefs; k++) cells[free()] = 3;
    for (let k = 0; k < posts; k++) cells[free()] = 2;
    let s = P.init({W, H, cells, first});
    while (!s.win) s = P.play(s, P.think(s, R));
    if (s.win === 1) wins++; len += s.moves[1]; }
  console.log(`ecueils ${reefs} | maillons poses d'avance ${posts} | ${first===1?'le fil':'la chaine'} commence | le fil gagne ${(wins/GAMES*100).toFixed(0)} % | ${(len/GAMES).toFixed(1)} barges par partie`);
}
