/**
 * The arrival (docs/plan-porcellana.md § 1, « even the animation at the start is perfect », the
 * owner): each tile drops into place with a slight overshoot, one after the other along the
 * diagonal, the water a beat later; then the roads draw themselves, then what lives appears, then
 * the pins. Pure: times in seconds since the scene opened.
 */
import { ARRIVAL } from "./tokens.js";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;

/** Out with an overshoot (« back »): above 1 a little before settling on it. */
export function easeOutBack(x: number, c1: number = ARRIVAL.overshoot): number {
  const t = clamp01(x);
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** When a tile starts to drop: by its rank along the diagonal (i + j), the water after the land. */
export function tileDelay(i: number, j: number, water = false): number {
  return (i + j) * ARRIVAL.step + (water ? ARRIVAL.waterLag : 0);
}

/** A tile's height above its place at a time (0 once landed); hidden before its turn. */
export function tileDrop(t: number, delay: number): { y: number; visible: boolean } {
  const k = easeOutBack((t - delay) / ARRIVAL.duration);
  return { y: (1 - k) * ARRIVAL.drop, visible: t > delay };
}

/** The share of every road drawn at a time. */
export function routesDrawn(t: number): number {
  return easeOutCubic((t - ARRIVAL.routesFrom) / ARRIVAL.routesFor);
}

/** Whether what lives on the board (carts, ships) is out yet. */
export const lifeOut = (t: number) => t > ARRIVAL.lifeFrom;

/** Whether a tile's pin is shown yet. */
export const pinOut = (t: number, delay: number) => t >= ARRIVAL.pinsAfter + delay;

/** When the whole board has landed, for a board whose largest diagonal rank is `rank`. */
export const arrivalEnd = (rank: number) =>
  Math.max(
    rank * ARRIVAL.step + ARRIVAL.waterLag + ARRIVAL.duration,
    ARRIVAL.routesFrom + ARRIVAL.routesFor,
  );
