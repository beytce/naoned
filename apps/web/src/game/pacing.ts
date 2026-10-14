/**
 * How often the 3D scenes are drawn and how sharply: every frame while the player moves the view,
 * 30 images a second while only the scene lives (flags, carts, workers), once a second when it is
 * still; and a resolution that keeps within a budget of pixels and steps down when frames come
 * late. Pure: the loop (sceneLoop.ts) gives the times.
 */

/** What a scene needs: the player moves it, it lives on its own, or nothing moves. */
export type Motion = "busy" | "anim" | "still";

const ANIM_MS = 1000 / 30;
const STILL_MS = 1000;
/** A frame comes this early at most: rAF times jitter by a few milliseconds. */
const SLACK_MS = 4;

export class Pacer {
  private last = Number.NEGATIVE_INFINITY;
  private dirty = true;

  /** Something changed: the next frame is drawn whatever the pace. */
  poke(): void {
    this.dirty = true;
  }

  /** Whether to draw at time t (ms); a drawn frame counts from t. */
  due(t: number, motion: Motion): boolean {
    const gap = t - this.last;
    const ok =
      this.dirty || motion === "busy" || gap >= (motion === "anim" ? ANIM_MS : STILL_MS) - SLACK_MS;
    if (ok) {
      this.last = t;
      this.dirty = false;
    }
    return ok;
  }
}

/** Pixels drawn at most, about a 1600 × 1000 screen at full sharpness. */
const PIXEL_BUDGET = 2_600_000;

/** The pixel ratio for a canvas of w × h css pixels: the screen's, at most 2, within the budget. */
export function pixelBudget(w: number, h: number, dpr: number): number {
  if (dpr <= 1) return dpr;
  const fit = Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h));
  return Math.round(Math.min(dpr, 2, Math.max(1, fit)) * 100) / 100;
}

/** Late frames in a row (net of good ones) before the resolution steps down. */
const SLOW_FRAMES = 20;
/** Good frames in a row before it steps back up. */
const FAST_FRAMES = 240;

export class Resolution {
  ratio: number;
  private slow = 0;
  private fast = 0;

  constructor(
    private max: number,
    private readonly min = 0.75,
  ) {
    this.ratio = max;
  }

  /** A new budget (the canvas or the screen changed); true when the ratio changed. */
  setMax(max: number): boolean {
    if (max === this.max) return false;
    const before = this.ratio;
    // A larger budget starts at its top again; a smaller one caps the ratio.
    this.ratio = max > this.max ? max : Math.min(this.ratio, max);
    this.max = max;
    return this.ratio !== before;
  }

  /** A frame drawn `ms` after the one before, when `aim` ms were hoped for; true on a change. */
  sample(ms: number, aim: number): boolean {
    // A hiccup (a tab coming back, a screen being built) says nothing of the drawing.
    if (ms > 250) return false;
    if (ms > aim * 1.5) {
      this.slow++;
      this.fast = 0;
    } else {
      this.slow = Math.max(0, this.slow - 1);
      if (ms < aim * 1.2) this.fast++;
    }
    if (this.slow >= SLOW_FRAMES && this.ratio > this.min) {
      this.slow = 0;
      this.ratio = Math.max(this.min, this.ratio * 0.8);
      return true;
    }
    if (this.fast >= FAST_FRAMES && this.ratio < this.max) {
      this.fast = 0;
      this.ratio = Math.min(this.max, this.ratio * 1.15);
      return true;
    }
    return false;
  }
}

/** How long the last moves of a drag count for its throw (ms). */
const THROW_WINDOW_MS = 80;
/** Speed lost per second of glide (exponential). */
const FRICTION = 5;

/** The map carried on by a throw of the finger or the mouse, slowing down. */
export class Glide {
  private moves: { dx: number; dy: number; t: number }[] = [];
  private last: { x: number; y: number } | null = null;
  private vx = 0;
  private vy = 0;
  active = false;

  /** The pointer is at (x, y) at time t (ms). */
  track(x: number, y: number, t: number): void {
    this.active = false;
    if (this.last) this.moves.push({ dx: x - this.last.x, dy: y - this.last.y, t });
    this.last = { x, y };
    while (this.moves.length > 0 && t - (this.moves[0]?.t ?? t) > THROW_WINDOW_MS)
      this.moves.shift();
  }

  /** The pointer lets go at time t: the glide takes the speed of the last moves. */
  release(t: number): void {
    const recent = this.moves.filter((m) => t - m.t <= THROW_WINDOW_MS);
    const first = recent[0];
    const span = first ? Math.max(16, t - first.t + 16) : 0;
    this.vx = span ? recent.reduce((s, m) => s + m.dx, 0) / span : 0;
    this.vy = span ? recent.reduce((s, m) => s + m.dy, 0) / span : 0;
    this.active = Math.hypot(this.vx, this.vy) > 0.05;
    this.moves = [];
    this.last = null;
  }

  stop(): void {
    this.active = false;
    this.moves = [];
    this.last = null;
  }

  /** The move of the next dt ms of glide, or null when it has stopped. */
  step(dt: number): { dx: number; dy: number } | null {
    if (!this.active) return null;
    const k = Math.exp((-FRICTION * dt) / 1000);
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.vx *= k;
    this.vy *= k;
    if (Math.hypot(this.vx, this.vy) < 0.02) this.active = false;
    return { dx, dy };
  }
}

/**
 * The zoom of one wheel event: > 1 zooms out. A line is 16 pixels, a page 800; a trackpad pinch
 * (ctrlKey) comes in small steps and is read more finely; one event moves 1.5 times at most.
 */
export function wheelFactor(delta: number, mode: number, pinch: boolean): number {
  const px = delta * (mode === 1 ? 16 : mode === 2 ? 800 : 1);
  const k = pinch ? 0.01 : 0.0015;
  const f = Math.exp(px * k);
  return Math.max(1 / 1.5, Math.min(1.5, f));
}
