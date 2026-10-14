import { P } from "./palette.js";

/**
 * The works of the campaign as small flat glyphs: the rocca a tower, the campo a tent with its
 * pennant, the dogana a gate with its chain. Drawn in the family's colour; a work still being
 * built is shown in outline only.
 */
export function WorkGlyph({
  kind,
  color,
  ready = true,
  size = 16,
}: {
  kind: string;
  color: string;
  ready?: boolean;
  size?: number;
}) {
  const fill = ready ? color : "none";
  const stroke = ready ? P.night : color;
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <WorkShape kind={kind} fill={fill} stroke={stroke} dashed={!ready} />
    </svg>
  );
}

/** The glyph's shapes in a 20 × 20 box centred on (10, 10), for use inside another SVG. */
export function WorkShape({
  kind,
  fill,
  stroke,
  dashed = false,
}: {
  kind: string;
  fill: string;
  stroke: string;
  dashed?: boolean;
}) {
  const line = {
    stroke,
    strokeWidth: 1.4,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashed ? "2 1.5" : undefined,
  };
  switch (kind) {
    case "campo":
      return (
        <g>
          <path d="M2.5 17 L10 4.5 L17.5 17 Z" fill={fill} {...line} />
          <path d="M10 17 L10 9.5" stroke={stroke} strokeWidth="1.4" />
          <path d="M10 4.5 L10 1.5 L14 2.6 L10 3.7" fill={P.vermilion} stroke="none" />
        </g>
      );
    case "dogana":
      return (
        <g>
          <path
            d="M2.5 17.5 V7 L10 2.5 L17.5 7 V17.5 H12.5 V12 A2.5 2.5 0 0 0 7.5 12 V17.5 Z"
            fill={fill}
            {...line}
          />
          <circle cx="10" cy="7.4" r="1.6" fill={P.gold} stroke="none" />
        </g>
      );
    default:
      // The rocca: a tower with its crenellations.
      return (
        <path
          d="M4 17.5 V6 H6.5 V3 H8.5 V5 H11.5 V3 H13.5 V6 H16 V17.5 H12 V13.5 H8 V17.5 Z"
          fill={fill}
          {...line}
        />
      );
  }
}
