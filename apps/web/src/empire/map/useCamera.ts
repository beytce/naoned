import { type RefObject, useCallback, useEffect, useRef } from "react";
import { type Camera, type Point, type Viewport, blend, zoomAt } from "../../game/map/geometry.js";
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
}: {
  root: RefObject<HTMLElement | null>;
  initial: (view: Viewport) => Camera;
  onPaint: (cam: Camera, view: Viewport) => void;
  onDoubleTap?: () => void;
}) {
  const cam = useRef<Camera | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; t0: number; ms: number } | null>(null);
  const velocity = useRef<Point | null>(null);
  const frame = useRef(0);
  const live = useRef({ onPaint, onDoubleTap, initial });
  live.current = { onPaint, onDoubleTap, initial };

  const view = useCallback((): Viewport => {
    const el = root.current;
    return { w: el?.clientWidth || window.innerWidth, h: el?.clientHeight || window.innerHeight };
  }, [root]);

  const set = useCallback(
    (c: Camera) => {
      const v = view();
      const { min, max } = scaleBounds(v);
      const s = Math.min(max, Math.max(min, c.s));
      // A scale clamped keeps the screen's middle where it was.
      const k = s / c.s;
      const kept = { s, tx: v.w / 2 - (v.w / 2 - c.tx) * k, ty: v.h / 2 - (v.h / 2 - c.ty) * k };
      cam.current = coverClamp(kept, v);
      live.current.onPaint(cam.current, v);
    },
    [view],
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
        set(blend(a.from, a.to, k));
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
  }, [set, current]);

  /** Glides to a camera (or the one a function of the screen gives). */
  const easeTo = useCallback(
    (to: Camera | ((v: Viewport) => Camera), ms = 520) => {
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
    const sizes = new ResizeObserver(() => set(current()));
    sizes.observe(el);
    return () => sizes.disconnect();
  }, [root, set, current]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pointers = new Map<number, Point>();
    let moved = 0;
    let last: { p: Point; t: number } | null = null;
    let pinch: { d: number; mid: Point } | null = null;
    let lastTap = 0;
    const local = (e: PointerEvent | WheelEvent): Point => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const bounds = () => scaleBounds(view());
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
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
      el.dataset.dragging = "1";
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
  }, [root, set, current, run, view]);

  return { cam: current, easeTo, view, repaint: () => set(current()) };
}
