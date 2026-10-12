import type { ReactNode } from "react";

/**
 * Isometric drawing kit for the domain: a 2:1 projection of a grid of cells, and boxes, roofs and
 * tiles drawn in it with three shades (lit top, front-left face, darker front-right face).
 *
 * x runs down to the right on screen, y down to the left; z rises. The viewer stands on the side
 * of large x and y: the faces at x + w and y + d are the visible ones.
 */
export const TW = 30;
export const TH = 15;

export type Pt = readonly [number, number];

export function iso(x: number, y: number, z = 0): Pt {
  return [((x - y) * TW) / 2, ((x + y) * TH) / 2 - z];
}

export function pts(...p: Pt[]): string {
  return p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

/** A colour lightened (amount > 0) or darkened (amount < 0), for the shades of a face. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

const EDGE = "#0F1B1E";

/** A flat tile on the ground (or at height z). */
export function IsoTile(props: {
  x: number;
  y: number;
  w: number;
  d: number;
  z?: number;
  fill: string;
  stroke?: string;
  opacity?: number;
  dash?: string;
}) {
  const { x, y, w, d, z = 0 } = props;
  return (
    <polygon
      points={pts(iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z))}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.stroke ? 1 : undefined}
      strokeDasharray={props.dash}
      opacity={props.opacity}
    />
  );
}

/** A box on its footprint (x, y, w, d), from z to z + h, in one colour shaded per face. */
export function IsoBox(props: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  color: string;
  top?: string;
}) {
  const { x, y, w, d, h, z = 0, color } = props;
  const t = z + h;
  return (
    <g stroke={EDGE} strokeWidth="0.6" strokeLinejoin="round">
      {/* Front-left face (y + d). */}
      <polygon
        points={pts(iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x, y + d, t))}
        fill={shade(color, -0.12)}
      />
      {/* Front-right face (x + w). */}
      <polygon
        points={pts(iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x + w, y, t))}
        fill={shade(color, -0.32)}
      />
      <polygon
        points={pts(iso(x, y, t), iso(x + w, y, t), iso(x + w, y + d, t), iso(x, y + d, t))}
        fill={props.top ?? shade(color, 0.12)}
      />
    </g>
  );
}

/** A gable roof over a box, its ridge along x; the gable end shows on the right face. */
export function IsoRoof(props: {
  x: number;
  y: number;
  w: number;
  d: number;
  z: number;
  rise: number;
  color: string;
  wall: string;
}) {
  const { x, y, w, d, z, rise, color } = props;
  const o = 0.12;
  const ridge = z + rise;
  const m = y + d / 2;
  return (
    <g stroke={EDGE} strokeWidth="0.6" strokeLinejoin="round">
      {/* Back slope, its top edge seen above the ridge line. */}
      <polygon
        points={pts(
          iso(x - o, y - o, z),
          iso(x + w + o, y - o, z),
          iso(x + w + o, m, ridge),
          iso(x - o, m, ridge),
        )}
        fill={shade(color, 0.1)}
      />
      <polygon
        points={pts(iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, m, ridge))}
        fill={shade(props.wall, -0.32)}
      />
      <polygon
        points={pts(
          iso(x - o, m, ridge),
          iso(x + w + o, m, ridge),
          iso(x + w + o, y + d + o, z),
          iso(x - o, y + d + o, z),
        )}
        fill={color}
      />
    </g>
  );
}

/** A four-sided pyramid roof, apex over the middle (towers, the mill). */
export function IsoPyramid(props: {
  x: number;
  y: number;
  w: number;
  d: number;
  z: number;
  rise: number;
  color: string;
}) {
  const { x, y, w, d, z, rise, color } = props;
  const apex = iso(x + w / 2, y + d / 2, z + rise);
  return (
    <g stroke={EDGE} strokeWidth="0.6" strokeLinejoin="round">
      <polygon points={pts(iso(x, y + d, z), iso(x + w, y + d, z), apex)} fill={color} />
      <polygon
        points={pts(iso(x + w, y, z), iso(x + w, y + d, z), apex)}
        fill={shade(color, -0.25)}
      />
    </g>
  );
}

/** A window or door painted on the front-left face (y + d) of a box: u along x, v up. */
export function FaceLeft(props: {
  x: number;
  y: number;
  u: number;
  v: number;
  w: number;
  h: number;
  fill: string;
}) {
  const { x, y, u, v, w, h } = props;
  return (
    <polygon
      points={pts(
        iso(x + u, y, v),
        iso(x + u + w, y, v),
        iso(x + u + w, y, v + h),
        iso(x + u, y, v + h),
      )}
      fill={props.fill}
    />
  );
}

/** The same on the front-right face (x + w): u along y. */
export function FaceRight(props: {
  x: number;
  y: number;
  u: number;
  v: number;
  w: number;
  h: number;
  fill: string;
}) {
  const { x, y, u, v, w, h } = props;
  return (
    <polygon
      points={pts(
        iso(x, y + u, v),
        iso(x, y + u + w, v),
        iso(x, y + u + w, v + h),
        iso(x, y + u, v + h),
      )}
      fill={props.fill}
    />
  );
}

/** An evergreen: a cone of two tiers on a trunk, its shadow on the ground. */
export function IsoTree({
  x,
  y,
  s = 1,
  color = "#2F6B4A",
}: { x: number; y: number; s?: number; color?: string }) {
  const [cx, cy] = iso(x, y);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse cx="2" cy="1" rx="9" ry="4" fill="#000" opacity="0.18" />
      <rect x="-1.5" y="-6" width="3" height="7" fill="#6B4426" />
      <path d="M0 -30 L9 -12 L-9 -12 Z" fill={shade(color, 0.1)} stroke={EDGE} strokeWidth="0.6" />
      <path d="M0 -21 L11 -4 L-11 -4 Z" fill={color} stroke={EDGE} strokeWidth="0.6" />
      <path d="M0 -21 L11 -4 L2 -4 Z" fill={shade(color, -0.25)} />
    </g>
  );
}

/** Something placed at a grid point: its children drawn around (0, 0) on screen. */
export function At({
  x,
  y,
  z = 0,
  children,
}: { x: number; y: number; z?: number; children: ReactNode }) {
  const [a, b] = iso(x, y, z);
  return <g transform={`translate(${a} ${b})`}>{children}</g>;
}
