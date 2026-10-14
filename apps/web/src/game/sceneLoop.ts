import { type Motion, Pacer, Resolution, pixelBudget } from "./pacing.js";

/** What the loop needs of a 3D scene (the domain, the roads, the campaign). */
export interface SceneWorld {
  setSize(width: number, height: number): void;
  setRatio(ratio: number): void;
  /** Whether the scene lives on its own now (see pacing.ts). */
  motion(): Motion;
  frame(t: number): void;
  anchors(): { key: string; x: number; y: number }[];
}

export interface SceneLoop {
  /** Something changed: draw at the next frame. */
  poke(): void;
  stop(): void;
}

/** A mark this far out of the canvas (css px) is hidden rather than moved. */
const OFF_MARGIN = 80;

/**
 * Runs a scene in its host: sized to it, paused off screen and in a hidden tab, drawn at the pace
 * of what moves (pacing.ts), at a resolution within a budget that steps down on a slow device;
 * the marks laid over it follow their anchors, written only when they move.
 */
export function runScene(
  host: HTMLElement,
  world: SceneWorld,
  opts: {
    marks: Map<string, HTMLElement>;
    /** Where each anchor was drawn last, for drags. */
    anchorsAt?: Map<string, { x: number; y: number }>;
    /** The player is moving the view (drag, glide, zoom). */
    busy?: () => boolean;
    /** Called on each animation frame before the pace is decided (to move the view). */
    tick?: (t: number) => void;
  },
): SceneLoop {
  const pacer = new Pacer();
  let size = { w: 1, h: 1 };
  const resolution = new Resolution(pixelBudget(1, 1, window.devicePixelRatio || 1));
  const placed = new WeakMap<HTMLElement, { x: number; y: number; off: boolean }>();
  let visible = true;
  let raf = 0;
  let lastDrawn: number | null = null;

  const fit = () => {
    const box = host.getBoundingClientRect();
    size = { w: box.width, h: box.height };
    world.setSize(box.width, box.height);
    resolution.setMax(pixelBudget(box.width, box.height, window.devicePixelRatio || 1));
    world.setRatio(resolution.ratio);
    pacer.poke();
  };
  fit();
  const resize = new ResizeObserver(fit);
  resize.observe(host);
  const observer = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    if (visible) pacer.poke();
  });
  observer.observe(host);

  const place = () => {
    for (const a of world.anchors()) {
      opts.anchorsAt?.set(a.key, { x: a.x, y: a.y });
      const el = opts.marks.get(a.key);
      if (!el) continue;
      const was = placed.get(el);
      const off =
        a.x < -OFF_MARGIN ||
        a.y < -OFF_MARGIN ||
        a.x > size.w + OFF_MARGIN ||
        a.y > size.h + OFF_MARGIN;
      if (!was || was.off !== off) el.style.visibility = off ? "hidden" : "";
      if (!off && (!was || Math.abs(was.x - a.x) > 0.1 || Math.abs(was.y - a.y) > 0.1)) {
        el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        placed.set(el, { x: a.x, y: a.y, off });
      } else if (was) was.off = off;
      else placed.set(el, { x: a.x, y: a.y, off });
    }
  };

  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) {
      lastDrawn = null;
      return;
    }
    opts.tick?.(t);
    const motion: Motion = opts.busy?.() ? "busy" : world.motion();
    if (!pacer.due(t, motion)) return;
    world.frame(t);
    if (lastDrawn !== null && motion !== "still") {
      const aim = motion === "busy" ? 1000 / 60 : 1000 / 30;
      if (resolution.sample(t - lastDrawn, aim)) world.setRatio(resolution.ratio);
    }
    lastDrawn = motion === "still" ? null : t;
    place();
  };
  raf = requestAnimationFrame(loop);

  return {
    poke: () => pacer.poke(),
    stop: () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
    },
  };
}

/**
 * Stable ref callbacks for the marks (one per key), so that a render of the screen does not
 * detach and reattach them; a new mark asks for a frame to be placed.
 */
export function markRefs(marks: Map<string, HTMLElement>, poke: () => void) {
  const refs = new Map<string, (el: HTMLElement | null) => void>();
  return (key: string) => {
    let r = refs.get(key);
    if (!r) {
      r = (el) => {
        if (el) {
          marks.set(key, el);
          poke();
        } else {
          marks.delete(key);
          refs.delete(key);
        }
      };
      refs.set(key, r);
    }
    return r;
  };
}
