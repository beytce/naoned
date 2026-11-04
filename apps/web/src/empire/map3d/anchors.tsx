/**
 * Labels in HTML over a scene of their own (the Porta's, the Remise's): each element of a layer
 * marked `data-anchor="<id>"` is moved, each frame, to the screen's point of its anchor, a point of
 * the scene set by the scene as it lays its parts out (`anchors.set`).
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";

export type Anchors = Map<string, [number, number, number]>;

export function AnchorLayer({
  root,
  anchors,
}: {
  root: React.RefObject<HTMLDivElement>;
  anchors: Anchors;
}) {
  const { camera, size } = useThree();
  const p = useMemo(() => new Vector3(), []);
  useFrame(() => {
    for (const el of root.current?.querySelectorAll<HTMLElement>("[data-anchor]") ?? []) {
      const at = anchors.get(el.dataset.anchor ?? "");
      if (!at) continue;
      p.set(...at).project(camera);
      el.style.transform = `translate(${((p.x + 1) / 2) * size.width}px, ${((1 - p.y) / 2) * size.height}px)`;
    }
  });
  return null;
}
