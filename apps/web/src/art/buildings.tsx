import { P } from "./palette.js";

/** Illustrations of the buildings, 120 × 90. `active` animates what turns. */
export function BuildingArt({
  type,
  active = false,
  className = "",
}: { type: string; active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${type}`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={active ? P.gold : P.lagoon} stopOpacity="0.35" />
          <stop offset="100%" stopColor={P.night} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="62" rx="58" ry="34" fill={`url(#glow-${type})`} />
      <path d="M4 80 H116" stroke={P.line} strokeWidth="2" strokeLinecap="round" />
      {(ART[type] ?? ART.palazzo)?.(active)}
    </svg>
  );
}

/** The drawing alone, in the 120 × 90 box with the ground at y = 80 (to place in a scene). */
export function BuildingShape({ type, active = false }: { type: string; active?: boolean }) {
  return (ART[type] ?? ART.palazzo)?.(active) ?? null;
}

const spin = (cx: number, cy: number, active: boolean, seconds = 6) =>
  active ? (
    <animateTransform
      attributeName="transform"
      type="rotate"
      from={`0 ${cx} ${cy}`}
      to={`360 ${cx} ${cy}`}
      dur={`${seconds}s`}
      repeatCount="indefinite"
    />
  ) : null;

const smoke = (x: number, y: number, active: boolean) =>
  active ? (
    <g fill={P.cream} opacity="0.5">
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x} cy={y} r={3 + i}>
          <animate
            attributeName="cy"
            from={y}
            to={y - 24}
            dur="3s"
            begin={`${i}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="3s"
            begin={`${i}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  ) : null;

const TEETH = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/**
 * Flat volumes in three tones (top lit, front, side in shade), outlined in ink, seen a little from
 * above and to the left: the depth runs up and to the right.
 */
type Tones = readonly [top: string, front: string, side: string];
const T = {
  brick: ["#E89A72", P.clay, "#8E4426"],
  wood: [P.woodLight, P.wood, "#6B4022"],
  stone: ["#FFF6E2", P.cream, "#CDB993"],
  roof: ["#F08A6A", P.vermilion, P.vermilionDeep],
  field: ["#B9D58A", "#7FA052", "#56743A"],
  gold: [P.goldSoft, P.gold, P.goldDeep],
} as const satisfies Record<string, Tones>;
const outline = { stroke: P.night, strokeWidth: 1.6, strokeLinejoin: "round" as const };

/** A box: front face at (x, y), w × h, `d` deep. */
function block(x: number, y: number, w: number, h: number, d: number, c: Tones) {
  const k = d / 2;
  return (
    <g {...outline}>
      <path d={`M${x} ${y} L${x + d} ${y - k} H${x + w + d} L${x + w} ${y} Z`} fill={c[0]} />
      <path
        d={`M${x + w} ${y} L${x + w + d} ${y - k} V${y + h - k} L${x + w} ${y + h} Z`}
        fill={c[2]}
      />
      <rect x={x} y={y} width={w} height={h} fill={c[1]} />
    </g>
  );
}

/** A gabled roof on a box of the same front: ridge `rh` high, gable wall in `wall`. */
function gable(x: number, y: number, w: number, d: number, rh: number, wall: Tones, c: Tones) {
  const k = d / 2;
  const mx = x + w / 2;
  return (
    <g {...outline}>
      <path
        d={`M${x} ${y} L${x + d} ${y - k} L${mx + d} ${y - rh - k} L${mx} ${y - rh} Z`}
        fill={c[0]}
      />
      <path
        d={`M${mx} ${y - rh} L${mx + d} ${y - rh - k} L${x + w + d} ${y - k} L${x + w} ${y} Z`}
        fill={c[2]}
      />
      <path d={`M${x} ${y} L${mx} ${y - rh} L${x + w} ${y} Z`} fill={wall[1]} />
    </g>
  );
}

/** An arched opening, dark. */
const door = (x: number, y: number, w: number, h: number) => (
  <path
    d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`}
    fill={P.night3}
    {...outline}
  />
);

/** A small stack of bricks (or planks) on the ground. */
const stack = (x: number, y: number, c: Tones, rows = 2, w = 12, h = 4) => (
  <g>
    {[0, 1, 2, 3].slice(0, rows).map((row) => (
      <g key={row}>{block(x + (row % 2) * 3, y - (row + 1) * h, w, h, 6, c)}</g>
    ))}
  </g>
);

const ART: Record<string, (active: boolean) => JSX.Element> = {
  farm: () => (
    <g>
      {block(8, 66, 58, 12, 26, T.field)}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${14 + i * 10} 64 l12 -6`}
          stroke={P.gold}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      {block(70, 52, 28, 26, 14, T.roof)}
      {gable(70, 52, 28, 14, 14, T.roof, T.wood)}
      {door(79, 62, 10, 16)}
    </g>
  ),
  clay_pit: () => (
    <g>
      {block(12, 60, 72, 18, 30, T.brick)}
      <path d="M24 58 L36 52 H76 L66 58 Z" fill="#6B3420" {...outline} />
      {stack(40, 58, T.brick, 2, 12, 3)}
      <path d="M92 64 L104 30" stroke={P.wood} strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M92 30 Q102 22 114 30"
        stroke={P.cream}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  lumber_camp: () => (
    <g>
      {[
        [30, 18],
        [52, 10],
      ].map(([x = 0, top = 0]) => (
        <g key={x} {...outline}>
          <rect x={x - 3} y={top + 44} width="6" height={76 - top - 44} fill={P.wood} />
          <path d={`M${x} ${top} L${x - 16} ${top + 28} H${x + 16} Z`} fill={P.lagoonDeep} />
          <path d={`M${x} ${top + 14} L${x - 19} ${top + 46} H${x + 19} Z`} fill={P.lagoon} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i} {...outline}>
          <rect
            x={68 + (i === 2 ? 7 : i * 14)}
            y={i === 2 ? 56 : 66}
            width="26"
            height="11"
            fill={P.wood}
          />
          <ellipse
            cx={68 + (i === 2 ? 7 : i * 14)}
            cy={i === 2 ? 61.5 : 71.5}
            rx="4"
            ry="5.5"
            fill={P.woodLight}
          />
        </g>
      ))}
    </g>
  ),
  mill: (active) => (
    <g>
      {block(46, 40, 22, 38, 12, T.stone)}
      <path
        d="M44 40 L57 20 L70 40 Z M57 20 L69 14 L80 34 L70 40"
        fill={P.vermilion}
        {...outline}
      />
      {door(52, 62, 10, 16)}
      <g>
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r} 60 32)`}>
            <path d="M60 32 L62 4 H73 L64 32 Z" fill={P.gold} {...outline} />
          </g>
        ))}
        {spin(60, 32, active, 6)}
      </g>
      <circle cx="60" cy="32" r="3" fill={P.night} />
    </g>
  ),
  bakery: (active) => (
    <g>
      {smoke(86, 22, active)}
      {block(80, 24, 10, 22, 6, T.brick)}
      {block(16, 46, 70, 32, 20, T.brick)}
      <path d="M30 78 V64 A16 16 0 0 1 62 64 V78 Z" fill={P.night3} {...outline} />
      <path d="M36 78 V66 A10 10 0 0 1 56 66 V78 Z" fill={active ? P.gold : "#5A3D22"} />
      <ellipse cx="46" cy="74" rx="7" ry="3" fill={P.goldSoft} stroke={P.night} strokeWidth="1" />
    </g>
  ),
  brickworks: (active) => (
    <g>
      {smoke(38, 12, active)}
      {smoke(56, 18, active)}
      {block(32, 14, 10, 34, 6, T.brick)}
      {block(50, 20, 10, 28, 6, T.brick)}
      {block(14, 46, 62, 32, 18, T.brick)}
      {door(24, 60, 12, 18)}
      <rect x="44" y="54" width="22" height="8" fill={P.night3} {...outline} />
      <path d="M78 76 H112" stroke={P.night} strokeWidth="3" strokeLinecap="round" />
      {[84, 94, 104].map((x) => (
        <circle key={x} cx={x} cy="76" r="2.4" fill={P.cream} stroke={P.night} strokeWidth="1" />
      ))}
      {stack(86, 74, T.brick, 2, 12, 4)}
    </g>
  ),
  sawmill: (active) => (
    <g>
      {block(10, 50, 48, 28, 18, T.wood)}
      {gable(10, 50, 48, 18, 18, T.wood, T.roof)}
      {door(26, 60, 14, 18)}
      <g transform="translate(84 46)">
        <circle r="16" fill={P.cream} {...outline} />
        {TEETH.map((a) => (
          <path
            key={a}
            d="M-3 -16 L0 -21 L3 -16 Z"
            fill={P.cream}
            transform={`rotate(${a})`}
            {...outline}
          />
        ))}
        <circle r="4" fill={P.night} />
        {spin(0, 0, active, 2)}
      </g>
      {stack(66, 78, T.wood, 2, 30, 4)}
    </g>
  ),
  palazzo: () => (
    <g>
      {block(10, 30, 88, 48, 16, T.stone)}
      <path d="M10 30 L18 26 H106 L98 30 Z" fill={P.gold} {...outline} />
      <rect x="10" y="44" width="88" height="3" fill={P.gold} {...outline} />
      {[18, 34, 50, 66, 82].map((x) => (
        <g key={x}>
          {door(x, 32, 8, 10)}
          {door(x, 56, 8, 22)}
        </g>
      ))}
    </g>
  ),
};
