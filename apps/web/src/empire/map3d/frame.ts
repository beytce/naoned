import { type RefObject, useEffect, useState } from "react";
import type { Camera } from "three";

/**
 * The height of a scene's head and foot (its HTML over the canvas), followed as they change
 * (audit of 4 November, 3D M8): the camera frames the band between them, not the whole screen.
 */
export function useCovers(head: RefObject<HTMLElement>, foot: RefObject<HTMLElement>) {
  const [covers, setCovers] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    const read = () =>
      setCovers({
        top: head.current?.getBoundingClientRect().height ?? 0,
        bottom: foot.current?.getBoundingClientRect().height ?? 0,
      });
    read();
    const ro = new ResizeObserver(read);
    if (head.current) ro.observe(head.current);
    if (foot.current) ro.observe(foot.current);
    return () => ro.disconnect();
  }, [head, foot]);
  return covers;
}

/**
 * The camera's view moved so that the screen's middle falls in the middle of the band left free
 * by a head `top` px high and a foot `bottom` px high (a view offset: nothing else moves).
 */
export function frameBand(
  camera: Camera & {
    setViewOffset?: (...a: number[]) => void;
    updateProjectionMatrix?: () => void;
  },
  w: number,
  h: number,
  top: number,
  bottom: number,
) {
  camera.setViewOffset?.(w, h, 0, (bottom - top) / 2, w, h);
  camera.updateProjectionMatrix?.();
}
