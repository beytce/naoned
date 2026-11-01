import { type RefObject, useCallback, useEffect, useRef } from "react";
import { type Camera, type Point, type Viewport, zoomAt } from "../../game/map/geometry.js";
import { coverClamp, scaleBounds } from "./logic.js";

/** A finger that moved less than this (px) touched; more, it dragged. */
const TAP_SLOP = 8;

/**
 * The camera of the empire's map (the map at the centre, step 1), on the gestures of the monthly
 * map (game/map/WorldMap.tsx): one finger pans with a glide on release, two pinch, the wheel
 * zooms, a double touch on the sea calls `onDoubleTap`. The camera lives in a ref and `onPaint`
 * draws it straight into the DOM, at every frame of a gesture, without a React render.
 */
export function useCamera({
  root,
  initial,
  onPaint,
  onDoubleTap,
  onTap,
  onRest,
  bounds,
}: {
  root: RefObject<HTMLElement | null>;
  initial: (view: Viewport) => Camera;
  onPaint: (cam: Camera, view: Viewport) => void;
  onDoubleTap?: () => void;
  /** A touch on the sea, not on a place. */
  onTap?: () => void;
  /** The camera at rest again, after a gesture or a glide. */
  onRest?: (cam: Camera, view: Viewport) => void;
  /** The zoom's range on this screen, when not the chart's own (`scaleBounds`). */
  bounds?: (view: Viewport) => { min: number; max: number };
}) {
  const cam = useRef<Camera | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; t0: number; ms: number } | null>(null);
  const velocity = useRef<Point | null>(null);
  const frame = useRef(0);
  const live = useRef({ onPaint, onDoubleTap, onTap, onRest, initial, bounds });
  live.current = { onPaint, onDoubleTap, onTap, onRest, initial, bounds };
  const rangeOf = useCallback((v: Viewport) => live.current.bounds?.(v) ?? scaleBounds(v), []);
  // The screen's size, read when it changes (never in a frame), and one paint per frame.
  const size = useRef<Viewport | null>(null);
  const painting = useRef(0);
  const resting = useRef(0);

  const view = useCallback((): Viewport => {
    if (size.current) return size.current;
    const el = root.current;
    size.current = {
      w: el?.clientWidth || window.innerWidth,
      h: el?.clientHeight || window.innerHeight,
    };
    return size.current;
  }, [root]);

  const paintSoon = useCallback(() => {
    if (painting.current) return;
    painting.current = requestAnimationFrame(() => {
      painting.current = 0;
      const c = cam.current;
      if (!c) return;
      const v = view();
      live.current.onPaint(c, v);
      // At rest a moment after the last move: the chart drawn sharp at its scale.
      clearTimeout(resting.current);
      resting.current = window.setTimeout(() => {
        if (!anim.current && !velocity.current && cam.current)
          live.current.onRest?.(cam.current, view());
      }, 150);
    });
  }, [view]);

  const set = useCallback(
    (c: Camera) => {
      const v = view();
      const { min, max } = rangeOf(v);
      const s = Math.min(max, Math.max(min, c.s));
      // A scale clamped keeps the screen's middle where it was.
      const k = s / c.s;
      const kept = { s, tx: v.w / 2 - (v.w / 2 - c.tx) * k, ty: v.h / 2 - (v.h / 2 - c.ty) * k };
      cam.current = coverClamp(kept, v);
      paintSoon();
    },
    [view, paintSoon, rangeOf],
  );

  const current = useCallback((): Camera => {
    if (!cam.current) cam.current = live.current.initial(view());
    return cam.current;
  }, [view]);

  const run = useCallback(() => {
    if (frame.current) return;
    const step = (t: number) => {
      frame.current = 0;
      const a = anim.current;
      if (a) {
        const k = Math.min(1, (t - a.t0) / a.ms);
        set(glide(a.from, a.to, k, view()));
        if (k >= 1) anim.current = null;
      } else if (velocity.current) {
        const v = velocity.current;
        const c = current();
        set({ ...c, tx: c.tx + v.x * 16, ty: c.ty + v.y * 16 });
        velocity.current = { x: v.x * 0.92, y: v.y * 0.92 };
        if (Math.hypot(v.x, v.y) < 0.02) velocity.current = null;
      }
      if (anim.current || velocity.current) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [set, current, view]);

  /** Glides to a camera (or the one a function of the screen gives). */
  const easeTo = useCallback(
    (to: Camera | ((v: Viewport) => Camera), ms = 450) => {
      const target = typeof to === "function" ? to(view()) : to;
      velocity.current = null;
      anim.current = { from: current(), to: target, t0: performance.now(), ms };
      run();
    },
    [current, run, view],
  );

  // The first paint, and again when the screen changes size.
  useEffect(() => {
    set(current());
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sizes = new ResizeObserver(() => {
      size.current = null;
      set(current());
    });
    sizes.observe(el);
    return () => sizes.disconnect();
  }, [root, set, current]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(painting.current);
      clearTimeout(resting.current);
    },
    [],
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pointers = new Map<number, Point>();
    let moved = 0;
    let last: { p: Point; t: number } | null = null;
    let pinch: { d: number; mid: Point } | null = null;
    let lastTap = 0;
    // The map's frame, read when a gesture starts, not at each move.
    let rect = el.getBoundingClientRect();
    const local = (e: PointerEvent | WheelEvent): Point => ({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const bounds = () => rangeOf(view());
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      // A vehicle dragged to a place: its own gesture, the camera stays (the hops).
      if ((e.target as HTMLElement | null)?.closest?.("[data-drag-handle]")) return;
      if (pointers.size === 0) rect = el.getBoundingClientRect();
      pointers.set(e.pointerId, local(e));
      anim.current = null;
      velocity.current = null;
      if (pointers.size === 1) {
        moved = 0;
        last = { p: local(e), t: performance.now() };
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const { min, max } = bounds();
        const c = zoomAt(current(), d / Math.max(1, pinch.d), mid, min, max);
        set({ ...c, tx: c.tx + mid.x - pinch.mid.x, ty: c.ty + mid.y - pinch.mid.y });
        pinch = { d, mid };
        moved += TAP_SLOP + 1;
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved <= TAP_SLOP) return;
      if (!el.dataset.dragging) el.dataset.dragging = "1";
      const c = current();
      set({ ...c, tx: c.tx + dx, ty: c.ty + dy });
      const t = performance.now();
      if (last) {
        const dt = Math.max(1, t - last.t);
        velocity.current = { x: (p.x - last.p.x) / dt, y: (p.y - last.p.y) / dt };
      }
      last = { p, t };
    };
    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      const tapped = moved <= TAP_SLOP;
      const sinceMove = last ? performance.now() - last.t : 999;
      if (!tapped && velocity.current && sinceMove < 60) run();
      else velocity.current = null;
      setTimeout(() => {
        delete el.dataset.dragging;
      }, 0);
      if (!tapped) return;
      // A double touch on the sea, not on a place.
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      const t = performance.now();
      if (t - lastTap < 300) live.current.onDoubleTap?.();
      else live.current.onTap?.();
      lastTap = t;
    };
    // A drag that started on a place is not a touch on it.
    const click = (e: MouseEvent) => {
      if (el.dataset.dragging === "1") {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      rect = el.getBoundingClientRect();
      const { min, max } = bounds();
      anim.current = null;
      set(zoomAt(current(), Math.exp(-e.deltaY * 0.0015), local(e), min, max));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [root, set, current, run, view, rangeOf]);

  return { cam: current, easeTo, view, repaint: () => set(current()) };
}

/**
 * A step of a glide between two cameras (t from 0 to 1, eased out): the scale in log space, so
 * that a zoom feels even, and the point at the screen's middle moving straight between the two.
 */
export function glide(a: Camera, b: Camera, t: number, v: Viewport): Camera {
  const k = 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
  const s = a.s * (b.s / a.s) ** k;
  const ax = (v.w / 2 - a.tx) / a.s;
  const ay = (v.h / 2 - a.ty) / a.s;
  const bx = (v.w / 2 - b.tx) / b.s;
  const by = (v.h / 2 - b.ty) / b.s;
  const x = ax + (bx - ax) * k;
  const y = ay + (by - ay) * k;
  return { s, tx: v.w / 2 - x * s, ty: v.h / 2 - y * s };
}
