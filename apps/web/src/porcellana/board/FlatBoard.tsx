/**
 * The Carte without WebGL (docs/plan-porcellana.md lot 3): the same board seen from above, flat, in
 * the porcelain's paper — the tiles, the sea, the « + » plots, the roads of accent, each place a
 * round pin with its name. A place touched opens the same card. For the devices that refuse the 3D
 * (flag.ts, MAP_3D).
 */
import { useEffect, useRef, useState } from "react";
import type { PlaceCardHandle } from "../PlaceCard.js";
import { COL, PAPER } from "../tokens.js";
import type { BoardScene } from "./scene.js";

const T = 40;

export function FlatBoard({
  scene,
  chosen,
  onPick,
  card,
  pins,
}: {
  scene: BoardScene;
  chosen: string | null;
  onPick: (id: string | null) => void;
  card: PlaceCardHandle | null;
  /** The pins (HTML buttons, PorcellanaMap's): set on each place's mark, on the screen. */
  pins: Map<string, HTMLButtonElement>;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const is = scene.tiles.map((t) => t.i);
  const js = scene.tiles.map((t) => t.j);
  const [x0, x1] = [Math.min(...is) - 1, Math.max(...is) + 2];
  const [y0, y1] = [Math.min(...js) - 1, Math.max(...js) + 2];
  const k = T / scene.tileSize;
  // The pins on their places' marks, and the card beside the chosen one, on the screen: after the
  // commit (the pins are the next sibling's), and again when the window changes.
  const [, redraw] = useState(0);
  useEffect(() => {
    const on = () => redraw((n) => n + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  useEffect(() => {
    const at = (id: string) => {
      const el = ref.current?.querySelector(`[data-place-id="${id}"] circle`);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [b.x + b.width / 2, b.y + b.height / 2] as const;
    };
    for (const [id, pin] of pins) {
      const p = at(id);
      if (!p) continue;
      pin.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`;
      pin.dataset.out = "true";
    }
    const c = chosen ? at(chosen) : null;
    if (c && card) card.place(c[0], c[1], window.innerWidth, window.innerHeight);
  });
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the places are reached by their pins, buttons; Escape lets go.
    <svg
      ref={ref}
      className="absolute inset-0 h-full w-full"
      viewBox={`${x0 * T} ${y0 * T} ${(x1 - x0) * T} ${(y1 - y0) * T}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={() => onPick(null)}
      data-flat-board
      aria-hidden="true"
    >
      {scene.tiles.map((t) => (
        <rect
          key={t.key}
          x={t.i * T + 1.5}
          y={t.j * T + 1.5}
          width={T - 3}
          height={T - 3}
          rx={t.water ? 0 : 5}
          fill={
            t.water ? COL.water : t.model === "plot" || t.model === "locked" ? COL.soil : COL.ground
          }
          stroke={t.place?.id === chosen ? "var(--pc-accent)" : PAPER.hair}
          strokeWidth={t.place?.id === chosen ? 2.5 : 1}
          strokeDasharray={t.model === "plot" ? "4 3" : undefined}
        />
      ))}
      {scene.roads.map((r) => (
        <polyline
          key={`${r.from}>${r.to}`}
          points={r.pts.map(([x, y]) => `${x * k},${y * k}`).join(" ")}
          fill="none"
          stroke="var(--pc-accent)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {scene.tiles.map((t) =>
        t.place ? (
          <g key={`p${t.key}`} data-place-id={t.place.id}>
            <circle cx={t.i * T + T / 2} cy={t.j * T + T / 2 - 4} r={1} fill="none" />
            {!t.place.plus && (
              <text
                x={t.i * T + T / 2}
                y={t.j * T + T - 6}
                textAnchor="middle"
                fontSize={6.5}
                fill={PAPER.ink}
              >
                {t.place.name.length > 16 ? `${t.place.name.slice(0, 15)}…` : t.place.name}
              </text>
            )}
          </g>
        ) : null,
      )}
    </svg>
  );
}
