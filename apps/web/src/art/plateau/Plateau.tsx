import { memo } from "react";
import type { Shape } from "./geom.js";

/** The board's shapes, drawn as they come (docs/plan-plateau.md). */
export const PlateauShapes = memo(function PlateauShapes({ shapes }: { shapes: Shape[] }) {
  return (
    <g data-plateau>
      {shapes.map((s, i) =>
        s.path ? (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: the board is drawn whole, in its order
            key={i}
            d={s.points}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
            opacity={s.opacity}
            strokeOpacity={s.strokeOpacity}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={s.cls}
          />
        ) : (
          <polygon
            // biome-ignore lint/suspicious/noArrayIndexKey: the board is drawn whole, in its order
            key={i}
            points={s.points}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
            opacity={s.opacity}
            strokeOpacity={s.strokeOpacity}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            className={s.cls}
          />
        ),
      )}
    </g>
  );
});
