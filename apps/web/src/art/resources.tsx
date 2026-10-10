import { P } from "./palette.js";

/** Icons of the seven resources, 48 × 48. */
export function ResourceIcon({ code, size = 32 }: { code: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {ICONS[code] ?? <circle cx="24" cy="24" r="14" fill={P.line} />}
    </svg>
  );
}

const grain = (x: number, y: number, r: number) => (
  <ellipse
    key={`${x}-${y}`}
    cx={x}
    cy={y}
    rx="3.4"
    ry="6"
    transform={`rotate(${r} ${x} ${y})`}
    fill={P.gold}
    stroke={P.goldDeep}
    strokeWidth="1"
  />
);

const ICONS: Record<string, JSX.Element> = {
  wheat: (
    <g>
      <path d="M24 44 V14" stroke={P.goldDeep} strokeWidth="2.5" strokeLinecap="round" />
      {grain(24, 10, 0)}
      {grain(19, 17, -30)}
      {grain(29, 17, 30)}
      {grain(19, 25, -30)}
      {grain(29, 25, 30)}
      {grain(19, 33, -30)}
      {grain(29, 33, 30)}
    </g>
  ),
  flour: (
    <g>
      <path
        d="M14 18 Q12 40 16 42 H32 Q36 40 34 18 Z"
        fill={P.cream}
        stroke={P.goldDeep}
        strokeWidth="1.5"
      />
      <path d="M16 18 Q24 10 32 18" fill={P.cream} stroke={P.goldDeep} strokeWidth="1.5" />
      <rect x="15" y="17" width="18" height="4" rx="2" fill={P.gold} />
      <path d="M20 28 Q24 24 28 28 Q24 34 20 28" fill={P.goldSoft} />
    </g>
  ),
  bread: (
    <g>
      <ellipse
        cx="24"
        cy="28"
        rx="18"
        ry="11"
        fill={P.woodLight}
        stroke={P.wood}
        strokeWidth="1.5"
      />
      <ellipse cx="24" cy="25" rx="15" ry="7" fill={P.gold} opacity="0.55" />
      {[14, 21, 28].map((x) => (
        <path key={x} d={`M${x} 22 l5 8`} stroke={P.wood} strokeWidth="2" strokeLinecap="round" />
      ))}
    </g>
  ),
  clay: (
    <g>
      <path
        d="M8 34 Q6 22 18 18 Q24 10 34 16 Q44 20 40 32 Q36 40 22 40 Q10 40 8 34 Z"
        fill={P.clay}
        stroke={P.vermilionDeep}
        strokeWidth="1.5"
      />
      <path
        d="M16 24 Q22 18 30 20"
        stroke="#E89A72"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  bricks: (
    <g stroke={P.vermilionDeep} strokeWidth="1.2">
      <rect x="6" y="30" width="17" height="9" rx="1" fill={P.vermilion} />
      <rect x="25" y="30" width="17" height="9" rx="1" fill={P.vermilion} />
      <rect x="15" y="20" width="17" height="9" rx="1" fill="#F07A6E" />
      <rect x="10" y="10" width="17" height="9" rx="1" fill={P.vermilion} />
      <rect x="29" y="20" width="12" height="9" rx="1" fill={P.vermilion} />
    </g>
  ),
  wood: (
    <g>
      <rect
        x="8"
        y="16"
        width="28"
        height="18"
        rx="2"
        fill={P.wood}
        stroke="#6B4122"
        strokeWidth="1.5"
      />
      <ellipse
        cx="36"
        cy="25"
        rx="6"
        ry="9"
        fill={P.woodLight}
        stroke="#6B4122"
        strokeWidth="1.5"
      />
      <ellipse cx="36" cy="25" rx="3" ry="5" fill="none" stroke={P.wood} strokeWidth="1.2" />
      <path d="M12 21 H28 M14 29 H30" stroke="#6B4122" strokeWidth="1.2" />
    </g>
  ),
  planks: (
    <g stroke="#6B4122" strokeWidth="1.2">
      <rect
        x="6"
        y="12"
        width="36"
        height="7"
        rx="1"
        fill={P.woodLight}
        transform="rotate(-6 24 15)"
      />
      <rect x="6" y="21" width="36" height="7" rx="1" fill="#D9A46A" />
      <rect
        x="6"
        y="30"
        width="36"
        height="7"
        rx="1"
        fill={P.woodLight}
        transform="rotate(5 24 33)"
      />
    </g>
  ),
};
