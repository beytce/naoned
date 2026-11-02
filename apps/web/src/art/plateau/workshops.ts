/**
 * The workshops on their tiles (docs/plan-plateau.md, lot 3): each one a small tile of the board
 * with its own model, for the fondaco seen up close.
 */
import { type Shape, box, cone, faceQuad, prism, project, rng } from "./geom.js";
import { C, Scene, barn, house, kiln, pine, plots, rock, tile } from "./props.js";

function windmill(sc: Scene, x: number, y: number, s = 1) {
  const out = prism(x, y, 0, 3 * s, 9 * s, 8, C.wall, { r2: 2.1 * s });
  out.push(...cone(x, y, 9 * s, 2.5 * s, 3 * s, 8, C.roof));
  const [hx, hy] = project([x, y + 2.5 * s, 8 * s]);
  const len = 6.5 * s;
  for (const deg of [20, 110, 200, 290]) {
    const a = (deg * Math.PI) / 180;
    const ex = hx + len * Math.cos(a);
    const ey = hy + len * Math.sin(a) * 0.9;
    const px = -Math.sin(a) * 1.5 * s;
    const py = Math.cos(a) * 1.5 * s;
    out.push({
      points: `${hx.toFixed(1)},${hy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} ${(ex + px).toFixed(1)},${(ey + py).toFixed(1)} ${(hx + px * 0.3).toFixed(1)},${(hy + py * 0.3).toFixed(1)}`,
      fill: C.plot,
      stroke: "#8A6A3A",
      strokeWidth: 0.25,
      cls: "plateau-sail",
    });
  }
  sc.add(y, out);
}

function logs(sc: Scene, x: number, y: number, s = 1) {
  const out: Shape[] = [];
  for (const [dx, dz] of [
    [-2, 0],
    [0, 0],
    [2, 0],
    [-1, 1.6],
    [1, 1.6],
    [0, 3.2],
  ] as const)
    out.push(...box(x + dx * s, y, dz * s, 1.7 * s, 6 * s, 1.6 * s, 0, C.wood));
  sc.add(y, out);
}

function mine(sc: Scene, x: number, y: number, s = 1) {
  const r = rng(11);
  const j = Array.from({ length: 7 }, () => 0.8 + 0.4 * r());
  sc.add(y - 2 * s, [
    ...prism(x, y - 2 * s, 0, 9 * s, 7 * s, 7, C.rock2, { r2: 4.5 * s, a: 0.3, jit: j }),
    ...prism(x + s, y - 3 * s, 7 * s, 4.5 * s, 3.5 * s, 6, C.rock, { r2: 2 * s, a: 0.7 }),
  ]);
  const out = box(x + s, y + 4.5 * s, 0, 5 * s, 2 * s, 4 * s, 0.1, C.wood);
  out.push(faceQuad(x + s, y + 4.5 * s, 0, 2 * s, 0.1, -1.5 * s, 1.5 * s, 0, 3 * s, C.door));
  out.push(...box(x + s, y + 4.5 * s, 4 * s, 6.5 * s, 3 * s, 0.8 * s, 0.1, C.wood));
  sc.add(y + 4.5 * s, out);
  for (const [dx, dy] of [
    [-6, 5],
    [-4, 7],
  ] as const)
    sc.add(
      y + dy * s,
      prism(x + dx * s, y + dy * s, 0, 1.7 * s, 1.5 * s, 6, C.brick, { r2: 0.6 * s }),
    );
}

/** A workshop's model, by its type, on a tile at (x, y). */
export function workshopModel(sc: Scene, type: string, x: number, y: number) {
  switch (type) {
    case "brickworks":
      kiln(sc, x - 2, y, 0.9);
      return;
    case "clay_pit":
    case "sand_pit":
      mine(sc, x, y, 0.9);
      return;
    case "lumber_camp":
      for (const [dx, dy] of [
        [-5, -3],
        [2, -5],
        [-3, 3],
      ] as const)
        pine(sc, x + dx, y + dy, 0.9);
      logs(sc, x + 5, y + 3, 0.9);
      return;
    case "sawmill":
      barn(sc, x - 2, y - 1, 0.75);
      logs(sc, x + 6, y + 3, 0.8);
      return;
    case "farm":
      plots(sc, x - 3, y + 1, 0.8);
      house(sc, x + 5, y - 3, 0.7, 0.6);
      return;
    case "mill":
      windmill(sc, x, y, 1);
      return;
    case "sheepfold":
      house(sc, x - 3, y - 2, 0.7, 0.4, C.roof, false);
      for (const [dx, dy] of [
        [4, 2],
        [1, 4],
        [5, -1],
      ] as const)
        rock(sc, x + dx, y + dy, 0.35, 5, false);
      return;
    case "palazzo":
      house(sc, x, y, 1.1, 0.4, C.roofGold, false);
      return;
    default:
      house(sc, x - 1, y, 0.85, 0.5, C.roof, true);
  }
}

/** A workshop on its own small tile, with the box it fits in (for an <svg viewBox>). */
export function workshopTile(type: string, r = 12): { shapes: Shape[]; viewBox: string } {
  const sc = new Scene();
  tile(sc, 0, 0, r, "own");
  workshopModel(sc, type, 0, 0);
  const top = -r * 0.58 - 22;
  const h = r * 0.58 + 2 * 4.2 + 2 - top;
  return { shapes: sc.shapes(), viewBox: `${-r - 2} ${top} ${2 * r + 4} ${h}` };
}
