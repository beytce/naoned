/*ENGINE*/
// "La Passe": the thread against the chain. Pure and deterministic; the page and the balance script share it.
// Cells: 0 empty, 1 thread (attacker), 2 chain (defender), 3 reef (the chain may hook onto it).
// The thread wins by linking the south bank to the north bank; the chain by linking the west bank to the east bank.
// Two pieces are linked side by side, or along the one diagonal the current runs (north-east / south-west).
// With these six neighbours the square board is a Hex board: once it is full exactly one side has linked, so no game is drawn.
const PASSE = (() => {
  const N6 = [
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const init = (L) => ({
    W: L.W,
    H: L.H,
    g: L.cells.slice(),
    turn: L.first || 1,
    moves: [0, 0, 0],
    fire: [0, L.fire ? L.fire[0] : 1, L.fire ? L.fire[1] : 1],
    win: 0,
  });
  const clone = (s) => ({ ...s, g: s.g.slice(), moves: s.moves.slice(), fire: s.fire.slice() });
  // fewest empty cells a side still has to take to link its two banks (99: cut off)
  function dist(s, side) {
    const { W, H, g } = s;
    const d = new Array(W * H).fill(99);
    const dq = [];
    const mine = (v) => (side === 1 ? v === 1 : v === 2 || v === 3);
    const cost = (v) => (mine(v) ? 0 : v === 0 ? 1 : 99);
    const push = (i, c) => {
      if (c < d[i]) {
        d[i] = c;
        if (cost(g[i]) === 0) dq.unshift(i);
        else dq.push(i);
      }
    };
    if (side === 1) {
      for (let x = 0; x < W; x++) {
        const i = (H - 1) * W + x;
        const c = cost(g[i]);
        if (c < 99) push(i, c);
      }
    } else
      for (let y = 0; y < H; y++) {
        const i = y * W;
        const c = cost(g[i]);
        if (c < 99) push(i, c);
      }
    let best = 99;
    while (dq.length) {
      const i = dq.shift();
      const x = i % W;
      const y = (i - x) / W;
      if (side === 1 ? y === 0 : x === W - 1) best = Math.min(best, d[i]);
      for (const v of N6) {
        const nx = x + v[0];
        const ny = y + v[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        const c = cost(g[j]);
        if (c < 99) push(j, d[i] + c);
      }
    }
    return best;
  }
  const lonely = (s, i) => {
    const x = i % s.W;
    const y = (i - x) / s.W;
    return !N6.some((v) => {
      const nx = x + v[0];
      const ny = y + v[1];
      return nx >= 0 && ny >= 0 && nx < s.W && ny < s.H && s.g[ny * s.W + nx] === 1;
    });
  };
  const touches = (s, i, val) => {
    const x = i % s.W;
    const y = (i - x) / s.W;
    return N6.some((v) => {
      const nx = x + v[0];
      const ny = y + v[1];
      return nx >= 0 && ny >= 0 && nx < s.W && ny < s.H && s.g[ny * s.W + nx] === val;
    });
  };
  // A move is {i} (lay a piece) or {i, fire:true}: the thread's fireship burns a chain post next to one of its barges;
  // the chain's bombard sinks a barge that stands alone.
  function legal(s) {
    const out = [];
    const me = s.turn;
    for (let i = 0; i < s.g.length; i++) {
      if (s.g[i] === 0) out.push({ i });
      else if (s.fire[me] > 0 && me === 1 && s.g[i] === 2 && touches(s, i, 1))
        out.push({ i, fire: true });
      else if (s.fire[me] > 0 && me === 2 && s.g[i] === 1 && lonely(s, i))
        out.push({ i, fire: true });
    }
    return out;
  }
  function play(s0, m) {
    const s = clone(s0);
    const me = s.turn;
    if (m.fire) {
      s.g[m.i] = 0;
      s.fire[me]--;
    } else s.g[m.i] = me;
    s.moves[me]++;
    s.turn = 3 - me;
    if (dist(s, 1) === 0) s.win = 1;
    else if (dist(s, 2) === 0) s.win = 2;
    return s;
  }
  // A plain opponent: looks one reply ahead and weighs how far each side still is from linking its banks.
  function think(s, rnd) {
    const me = s.turn;
    const other = 3 - me;
    const val = (t) => (t.win === me ? 500 : t.win === other ? -500 : dist(t, other) - dist(t, me));
    const first = legal(s)
      .map((m) => {
        const t = play(s, m);
        return { m, t, v: val(t) - (m.fire ? 1.5 : 0) };
      })
      .sort((a, b) => b.v - a.v)
      .slice(0, 12);
    let best = null;
    for (const c of first) {
      let w = c.v;
      if (!c.t.win) {
        w = 999;
        for (const r of legal(c.t)) {
          const u = play(c.t, r);
          const x = u.win === me ? 500 : u.win === other ? -500 : dist(u, other) - dist(u, me);
          if (x < w) w = x;
        }
      }
      const cx = (c.m.i % s.W) - (s.W - 1) / 2;
      const cy = Math.floor(c.m.i / s.W) - (s.H - 1) / 2;
      c.w = w - (Math.abs(cx) + Math.abs(cy)) * 0.01 + (rnd ? rnd() * 0.3 : 0);
      if (!best || c.w > best.w) best = c;
    }
    return best?.m;
  }
  return { N6, init, clone, dist, legal, play, think, lonely, touches };
})();
/*END*/
if (typeof module !== "undefined") module.exports = PASSE;
