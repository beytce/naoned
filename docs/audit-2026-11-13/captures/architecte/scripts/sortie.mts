import { plancheSortieDuel, venice1450Lagune as S, venice1450Passe as X } from "/home/user/naoned/packages/engine/src/index.ts";
for (const p of S.passages) {
  const b = (X.boards as any)[p.board];
  const a = performance.now();
  const won = plancheSortieDuel(S, { id: "x", target: p.id, at: 0, captain: "c", style: undefined } as any, { ...X.rules, ...b, cells: [...b.cells] } as any);
  console.log(p.id, p.board, `${b.width}x${b.height}`, (performance.now() - a).toFixed(0), "ms", won);
}
