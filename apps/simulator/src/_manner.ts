import { PASSE_MANNER, Rng, passeInit, passePlay, passeThink, venice1450Passe as P } from "@comptoirs/engine";
const boards = ["lido", "segna", "chioggia", "otrante"] as const;
for (const w of [1, 2, 3, 4]) {
  PASSE_MANNER.weight = w;
  let differ = 0, total = 0;
  const wins: Record<string, number> = { none: 0, mur: 0, rives: 0, meute: 0 };
  let games = 0;
  for (const b of boards) {
    const B = (P.boards as any)[b];
    for (let seed = 1; seed <= 6; seed++) {
      for (const style of [undefined, "mur", "rives", "meute"] as const) {
        const rng = new Rng(seed * 31 + w);
        let s = passeInit({ ...P.rules, ...B, cells: [...B.cells], first: 1 });
        for (let n = 0; !s.winner && n < 200; n++) {
          if (s.turn === 1) s = passePlay(s, passeThink(s, { depth: 3 }, rng));
          else {
            const m = passeThink(s, { depth: 3, ...(style ? { style } : {}) });
            if (style) { total++; if (m.at !== passeThink(s, { depth: 3 }).at) differ++; }
            s = passePlay(s, m);
          }
        }
        if (s.winner === 2) wins[style ?? "none"]++;
        if (!style) games++;
      }
    }
  }
  console.log(`weight ${w}: moves that differ ${(100 * differ / total).toFixed(0)} % ; chain wins /${games}: ${JSON.stringify(wins)}`);
}
