import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** After the last touch, the scene keeps its full pace this long (ms), then a calmer one. */
const BUSY_MS = 15_000;

/**
 * The frames of a scene drawn on demand (audit of 4 November, 3D B3): `fps` a second while the
 * player touches it, `rest` a second once they have stopped (its life goes on, slower: never a
 * frozen pose), none while the page is hidden or `fps` is 0 (less motion asked). Only this
 * scene's root is asked, never the other canvases.
 */
export function Pace({ fps, rest = 12 }: { fps: number; rest?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (fps <= 0) return;
    let busyUntil = Date.now() + BUSY_MS;
    const touched = () => {
      busyUntil = Date.now() + BUSY_MS;
    };
    window.addEventListener("pointerdown", touched, { passive: true });
    window.addEventListener("wheel", touched, { passive: true });
    let id = 0;
    const tick = () => {
      if (!document.hidden) invalidate();
      const rate = Date.now() < busyUntil ? fps : Math.min(fps, rest);
      id = window.setTimeout(tick, 1000 / rate);
    };
    tick();
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("wheel", touched);
    };
  }, [fps, rest, invalidate]);
  return null;
}
