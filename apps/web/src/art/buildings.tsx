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

const ART: Record<string, (active: boolean) => JSX.Element> = {
  farm: () => (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${10 + i * 6} 80 L${40 + i * 4} ${58 + i * 5}`}
          stroke={P.gold}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.9 - i * 0.15}
        />
      ))}
      <rect x="62" y="46" width="40" height="34" fill={P.vermilion} />
      <path d="M58 48 L82 28 L106 48 Z" fill={P.vermilionDeep} />
      <rect x="76" y="58" width="12" height="22" fill={P.night3} />
      <path d="M76 58 L88 80 M88 58 L76 80" stroke={P.cream} strokeWidth="1.5" />
      <circle cx="82" cy="40" r="3" fill={P.cream} />
    </g>
  ),
  clay_pit: () => (
    <g>
      <path d="M8 80 L22 62 H44 L52 52 H78 L88 64 H104 L114 80 Z" fill={P.clay} />
      <path d="M22 62 H44 L52 52 H78" stroke="#E89A72" strokeWidth="2" fill="none" />
      <path d="M30 72 Q40 66 50 72" stroke={P.vermilionDeep} strokeWidth="2" fill="none" />
      <path d="M86 34 L98 62" stroke={P.wood} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M78 38 Q88 28 100 32"
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
        [26, 22],
        [48, 14],
        [70, 24],
      ].map(([x = 0, top = 0]) => (
        <g key={x}>
          <path d={`M${x} ${top} L${x - 14} ${top + 30} H${x + 14} Z`} fill={P.lagoonDeep} />
          <path
            d={`M${x} ${top + 14} L${x - 17} ${top + 46} H${x + 17} Z`}
            fill={P.lagoon}
            opacity="0.85"
          />
          <rect x={x - 3} y={top + 46} width="6" height={80 - top - 46} fill={P.wood} />
        </g>
      ))}
      <rect x="86" y="66" width="22" height="14" rx="3" fill={P.wood} />
      <ellipse cx="108" cy="73" rx="4" ry="7" fill={P.woodLight} />
      <path d="M94 66 L100 48" stroke={P.wood} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 50 Q104 44 106 52 Z" fill={P.cream} />
    </g>
  ),
  mill: (active) => (
    <g>
      <path d="M46 80 L52 36 H68 L74 80 Z" fill={P.cream} />
      <path d="M48 38 L60 24 L72 38 Z" fill={P.vermilion} />
      <rect x="56" y="62" width="8" height="18" rx="4" fill={P.night3} />
      <g>
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r} 60 36)`}>
            <path
              d="M60 36 L62 6 H74 L64 36 Z"
              fill={P.gold}
              stroke={P.goldDeep}
              strokeWidth="1"
              opacity="0.95"
            />
          </g>
        ))}
        {spin(60, 36, active)}
      </g>
      <circle cx="60" cy="36" r="4" fill={P.goldDeep} />
    </g>
  ),
  bakery: (active) => (
    <g>
      <path d="M20 80 V52 Q60 14 100 52 V80 Z" fill={P.clay} />
      <path d="M38 80 V62 Q60 42 82 62 V80 Z" fill={P.night} />
      <ellipse cx="60" cy="74" rx="16" ry="5" fill={active ? P.vermilion : P.line}>
        {active && (
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
        )}
      </ellipse>
      <ellipse cx="54" cy="70" rx="7" ry="3.5" fill={P.woodLight} />
      <ellipse cx="66" cy="69" rx="6" ry="3" fill={P.gold} />
      <rect x="84" y="20" width="9" height="22" fill={P.vermilionDeep} />
      {smoke(88, 18, active)}
    </g>
  ),
  brickworks: (active) => (
    <g>
      <rect x="24" y="44" width="48" height="36" fill={P.vermilionDeep} />
      <path d="M24 44 Q48 26 72 44 Z" fill={P.vermilion} />
      <rect x="38" y="60" width="20" height="20" rx="10" fill={P.night} />
      <rect x="42" y="66" width="12" height="10" rx="5" fill={active ? P.gold : P.line} />
      <rect x="76" y="14" width="10" height="66" fill={P.clay} />
      <path d="M76 22 H86 M76 34 H86 M76 46 H86" stroke={P.vermilionDeep} strokeWidth="1.5" />
      {smoke(81, 12, active)}
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={92 + (i % 2) * 4}
          y={72 - i * 7}
          width="18"
          height="6"
          fill={P.vermilion}
          stroke={P.vermilionDeep}
        />
      ))}
    </g>
  ),
  sawmill: (active) => (
    <g>
      <path d="M14 80 V46 L44 30 L74 46 V80 Z" fill={P.wood} />
      <path d="M14 46 L44 30 L74 46" stroke={P.woodLight} strokeWidth="3" fill="none" />
      <rect x="34" y="56" width="20" height="24" fill={P.night3} />
      <g>
        <circle cx="94" cy="56" r="16" fill={P.cream} stroke={P.line} strokeWidth="2" />
        {TEETH.map((deg) => (
          <path key={deg} d="M94 38 l3 4 h-6 z" fill={P.cream} transform={`rotate(${deg} 94 56)`} />
        ))}
        <circle cx="94" cy="56" r="4" fill={P.gold} />
        {spin(94, 56, active, 1.5)}
      </g>
      <rect x="76" y="72" width="40" height="8" fill={P.woodLight} />
    </g>
  ),
  palazzo: () => (
    <g>
      <rect x="18" y="26" width="84" height="54" fill={P.cream} />
      <rect x="18" y="20" width="84" height="8" fill={P.gold} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <path
            d={`M${26 + i * 15} 50 V40 Q${31 + i * 15} 32 ${36 + i * 15} 40 V50 Z`}
            fill={P.lagoonDeep}
          />
          <path
            d={`M${26 + i * 15} 76 V64 Q${31 + i * 15} 56 ${36 + i * 15} 64 V76 Z`}
            fill={P.night3}
          />
        </g>
      ))}
      <path d="M18 53 H102" stroke={P.gold} strokeWidth="2" />
      <path
        d="M4 84 Q20 80 36 84 T68 84 T100 84 T116 84"
        stroke={P.lagoon}
        strokeWidth="2"
        fill="none"
      />
    </g>
  ),
};
