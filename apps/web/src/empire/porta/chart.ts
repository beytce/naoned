/**
 * The battle's chart (its cases on the island's square): kept apart from
 * Battle3D so that the 2D screen and the Porta's place need not load three.js with it (audit of
 * 4 November, 3D B1). The island is turned an eighth of a turn on the chart (docs/plan-porta-
 * porcellana.md, P4): seen by the map's camera, its square tiles stand as the Carte's diamonds.
 * Every place of the battle goes through here, the 3D, the HTML over it and the touches alike.
 */

/** Chart units a case of the battle's map (a small tile is about one case across). */
export const CASE = 10;

/** The eighth of a turn: the Carte's azimuth. */
const C = Math.cos(Math.PI / 4);
const S = Math.sin(Math.PI / 4);
/** How the island's tiles turn in the 3D world (three.js, about y). */
export const TURN = -Math.PI / 4;

/** The battle's points (cases, around the disc's middle) on the chart (units, from its corner). */
export const toChart = (b: { radius: number }, x: number, y: number): [number, number] => [
  (x * C - y * S + b.radius + 1.5) * CASE,
  (x * S + y * C + b.radius + 1.5) * CASE,
];
export const fromChart = (b: { radius: number }, X: number, Y: number): [number, number] => {
  const rx = X / CASE - b.radius - 1.5;
  const ry = Y / CASE - b.radius - 1.5;
  return [rx * C + ry * S, -rx * S + ry * C];
};
/** The island's chart, its whole square. */
export const extentOf = (b: { radius: number }) => {
  const w = (2 * b.radius + 3) * CASE;
  return { w, h: w };
};
