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
  // The luxury chains.
  sand: (
    <g>
      <path d="M6 38 Q24 14 42 38 Z" fill="#E9D3A0" stroke="#B89A5E" strokeWidth="1.5" />
      {[
        [16, 30],
        [22, 32],
        [28, 34],
        [32, 30],
        [20, 34],
        [26, 30],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="#B89A5E" />
      ))}
    </g>
  ),
  glass: (
    <g>
      <path
        d="M16 10 H32 L30 22 Q36 30 30 38 H18 Q12 30 18 22 Z"
        fill="#BFE3FF"
        fillOpacity="0.75"
        stroke="#5C8DB8"
        strokeWidth="1.5"
      />
      <path d="M20 26 Q19 32 22 35" stroke="#FFFFFF" strokeWidth="2" fill="none" />
    </g>
  ),
  mirrors: (
    <g>
      <ellipse
        cx="24"
        cy="22"
        rx="12"
        ry="15"
        fill={P.gold}
        stroke={P.goldDeep}
        strokeWidth="1.5"
      />
      <ellipse
        cx="24"
        cy="22"
        rx="8.5"
        ry="11"
        fill="#DCEFFF"
        stroke={P.goldDeep}
        strokeWidth="1"
      />
      <path d="M19 16 L25 12 M18 22 L27 15" stroke="#FFFFFF" strokeWidth="1.6" />
      <path d="M20 37 H28 L26 43 H22 Z" fill={P.gold} stroke={P.goldDeep} strokeWidth="1.2" />
    </g>
  ),
  wool: (
    <g fill="#F4EEE2" stroke="#BDB2A0" strokeWidth="1.4">
      <circle cx="18" cy="24" r="8" />
      <circle cx="30" cy="24" r="8" />
      <circle cx="24" cy="17" r="8" />
      <circle cx="24" cy="30" r="8" />
    </g>
  ),
  drape: (
    <g>
      <path d="M8 14 H40 V36 H8 Z" fill="#7A4E8E" stroke="#4E2E5E" strokeWidth="1.5" />
      <path d="M8 20 H40 M8 26 H40 M8 32 H40" stroke="#9C72B0" strokeWidth="1.2" />
      <path d="M40 14 Q44 25 40 36" fill="#5E3A70" stroke="#4E2E5E" strokeWidth="1.2" />
    </g>
  ),
  garments: (
    <g>
      <path
        d="M16 8 L24 12 L32 8 L42 16 L36 22 L33 19 V40 H15 V19 L12 22 L6 16 Z"
        fill={P.vermilion}
        stroke={P.vermilionDeep}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M24 12 V40" stroke={P.gold} strokeWidth="1.6" />
      <circle cx="24" cy="20" r="1.3" fill={P.gold} />
      <circle cx="24" cy="27" r="1.3" fill={P.gold} />
    </g>
  ),
  prepared_spices: (
    <g>
      <path d="M12 18 H36 L33 40 H15 Z" fill="#B9653A" stroke="#7C3E1E" strokeWidth="1.5" />
      <rect
        x="10"
        y="12"
        width="28"
        height="7"
        rx="2"
        fill={P.gold}
        stroke={P.goldDeep}
        strokeWidth="1.2"
      />
      <path d="M17 28 H31 M18 34 H30" stroke={P.goldSoft} strokeWidth="1.4" />
      <path d="M24 12 Q22 6 27 4" stroke="#7FA052" strokeWidth="2" fill="none" />
    </g>
  ),
  salt: (
    <g>
      <path d="M10 38 L24 12 L38 38 Z" fill={P.cream} stroke="#CFC2B0" strokeWidth="1.5" />
      <path d="M17 38 L24 24 L31 38 Z" fill="#E9DCC8" />
      <path d="M6 40 H42" stroke={P.wood} strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="16" r="2" fill={P.cream} />
      <circle cx="40" cy="22" r="1.4" fill={P.cream} />
    </g>
  ),
  wine: (
    <g>
      <ellipse cx="24" cy="24" rx="14" ry="16" fill={P.wood} />
      <path d="M10 18 H38 M10 30 H38" stroke={P.woodLight} strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="5" ry="16" fill="none" stroke="#7A4A26" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="3" fill={P.vermilionDeep} />
      <path d="M24 27 Q22 33 24 36 Q26 33 24 27" fill="#8E1F3A" />
    </g>
  ),
  furs: (
    <g>
      <path
        d="M10 16 Q16 8 24 12 Q32 8 38 16 Q42 26 36 36 Q30 42 24 38 Q18 42 12 36 Q6 26 10 16 Z"
        fill="#8A5A36"
      />
      <path d="M16 18 Q24 14 32 18 Q34 28 24 34 Q14 28 16 18 Z" fill="#B07A4C" />
      <path d="M18 22 l3 2 M26 20 l3 2 M22 28 l3 2" stroke="#6B4126" strokeWidth="1.6" />
    </g>
  ),
  cloth: (
    <g>
      <rect x="8" y="14" width="32" height="22" rx="3" fill={P.lagoonDeep} />
      <path d="M8 20 H40 M8 26 H40 M8 32 H40" stroke={P.lagoon} strokeWidth="1.5" />
      <path d="M16 14 V36 M24 14 V36 M32 14 V36" stroke="#0F6E64" strokeWidth="1.2" />
      <circle cx="40" cy="25" r="5" fill={P.gold} />
      <circle cx="40" cy="25" r="2" fill={P.goldDeep} />
    </g>
  ),
  spices: (
    <g>
      <path d="M8 30 Q24 44 40 30 L36 40 Q24 46 12 40 Z" fill={P.vermilionDeep} />
      <path d="M8 30 Q24 38 40 30 Q24 22 8 30 Z" fill={P.vermilion} />
      <path d="M14 30 Q24 16 34 30 Z" fill="#E8913C" />
      <path d="M18 27 Q24 18 30 27" fill={P.gold} />
      {[
        [17, 22],
        [26, 18],
        [31, 24],
      ].map(([x = 0, y = 0]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={P.goldSoft} />
      ))}
    </g>
  ),
  silk: (
    <g>
      <path d="M8 14 Q24 6 40 14 V36 Q24 28 8 36 Z" fill={P.violet} />
      <path d="M8 14 Q24 22 40 14" fill="none" stroke="#B9A3EC" strokeWidth="2" />
      <path
        d="M8 24 Q24 32 40 24 M8 31 Q24 39 40 31"
        fill="none"
        stroke="#5E44A0"
        strokeWidth="1.5"
      />
      <path
        d="M30 8 L34 4 L38 8"
        fill="none"
        stroke={P.gold}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  ),
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
