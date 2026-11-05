/**
 * The motion's grammar (docs/design.md, Mouvement; audit of 4 November, motion § 6): one source
 * of durations (ms) and curves for the scripts, the 3D and the CSS (index.css carries the same
 * values as custom properties, a test keeps both alike). What arrives decelerates, what leaves
 * accelerates and is shorter, what lands springs; asking for less motion keeps only fades.
 */
export const T = {
  tap: 90,
  quick: 160,
  base: 260,
  camera: 450,
  cameraFar: 700,
  travel: 680,
  impact: 90,
  moment: 900,
  sequence: 3200,
  fadeReduced: 120,
} as const;

export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  in: "cubic-bezier(0.55, 0, 0.75, 0.4)",
  inout: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.45, 0.64, 1)",
  travel: "cubic-bezier(0.5, 0, 0.2, 1)",
} as const;

/** The CSS custom property of each duration and curve. */
export const CSS_VARS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(T).map(([k, v]) => [
      `--t-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      `${v}ms`,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(EASE).map(([k, v]) => [k === "spring" ? "--spring" : `--ease-${k}`, v]),
  ),
};

/** Whether the device asks for less motion, read now. */
export function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
  );
}

/** A cubic ease out (what arrives), for the scripts' own glides: t in [0, 1]. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A value brought toward its aim, independent of the frame rate (a critically damped approach):
 * `lambda` larger, faster (12 for a turn, 8 for a camera following).
 */
export function damp(current: number, aim: number, lambda: number, dt: number): number {
  return aim + (current - aim) * Math.exp(-lambda * dt);
}

/** An angle brought toward its aim by the shortest way round (radians). */
export function dampAngle(current: number, aim: number, lambda: number, dt: number): number {
  let d = (aim - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return damp(current, current + d, lambda, dt);
}
