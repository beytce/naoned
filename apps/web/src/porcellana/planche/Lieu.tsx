/**
 * The head of a place's sheet (docs/plan-celadon.md § 7, S2): its scene, then where one stands
 * there in a line, not the place's name. Every place of the board opens the same way.
 */
import { type ReactNode, useMemo } from "react";
import { type VignetteScene, vignette } from "../celadon/vignette.js";

export function LieuHead({
  scene,
  build,
  eyebrow,
  title,
  sub,
  subData,
  close,
}: {
  /** The scene's key: the picture is drawn again only when it changes. */
  scene: string;
  build: () => VignetteScene;
  /** The place and its level, small. */
  eyebrow: string;
  /** Where one stands there. */
  title: string;
  sub?: string;
  /** Marks on the line under the title (what a walk-through reads). */
  subData?: Record<string, string | number>;
  close: ReactNode;
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key stands for what the scene shows.
  const src = useMemo(() => vignette(scene, build), [scene]);
  return (
    <>
      {src ? <img className="pc-lieu-scene" src={src} alt="" width={780} height={440} /> : null}
      <div className="pc-pl-head pc-lieu-head">
        <div>
          <small className="pc-lieu-eyebrow">{eyebrow}</small>
          <h2>{title}</h2>
          {sub ? <span {...subData}>{sub}</span> : null}
        </div>
        {close}
      </div>
    </>
  );
}
