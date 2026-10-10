import { P } from "./palette.js";

/** Venice at dusk: campanile, domes, palaces, a gondola on the lagoon. */
export function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={P.goldSoft} />
          <stop offset="60%" stopColor={P.gold} stopOpacity="0.7" />
          <stop offset="100%" stopColor={P.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={P.lagoonDeep} stopOpacity="0.55" />
          <stop offset="100%" stopColor={P.night} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="250" cy="70" r="70" fill="url(#sun)" />
      <circle cx="250" cy="70" r="26" fill={P.goldSoft} />
      <g fill={P.night3}>
        <rect x="40" y="40" width="22" height="100" />
        <path d="M38 40 L51 10 L64 40 Z" />
        <rect x="45" y="50" width="12" height="16" fill={P.gold} opacity="0.5" />
        <path d="M84 140 V96 Q104 66 124 96 V140 Z" />
        <path d="M120 140 V84 Q150 40 180 84 V140 Z" />
        <path d="M176 140 V96 Q196 66 216 96 V140 Z" />
        <rect x="146" y="44" width="8" height="14" />
        <rect x="214" y="104" width="70" height="36" />
        <rect x="290" y="92" width="56" height="48" />
        <rect x="0" y="110" width="40" height="30" />
      </g>
      <g fill={P.gold} opacity="0.7">
        {[222, 236, 250, 264, 298, 312, 326].map((x) => (
          <rect key={x} x={x} y="114" width="6" height="10" rx="3" />
        ))}
      </g>
      <rect x="0" y="140" width="360" height="60" fill="url(#water)" />
      {[150, 162, 176].map((y, i) => (
        <path
          key={y}
          d={`M${10 + i * 30} ${y} h${90 - i * 20} M${200 - i * 20} ${y + 4} h${120 - i * 30}`}
          stroke={P.lagoon}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.6 - i * 0.15}
        />
      ))}
      <g transform="translate(70 150)">
        <path d="M0 8 Q40 18 80 4 Q60 14 10 12 Z" fill={P.cream} />
        <path d="M58 6 L64 -22" stroke={P.cream} strokeWidth="2" />
        <path d="M2 8 L-6 -2" stroke={P.cream} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Small scene per region, for the region choice. */
export function RegionArt({ code, className = "" }: { code: string; className?: string }) {
  const sky = { terraferma: P.gold, lagoon: P.lagoon, dolomites: P.cream }[code] ?? P.gold;
  return (
    <svg viewBox="0 0 160 80" className={className} aria-hidden="true">
      <circle cx="120" cy="22" r="12" fill={sky} opacity="0.8" />
      {code === "terraferma" && (
        <g>
          <path d="M0 60 Q40 40 80 56 T160 50 V80 H0 Z" fill={P.goldDeep} opacity="0.7" />
          <path d="M0 68 Q50 52 100 66 T160 62 V80 H0 Z" fill={P.gold} />
          {[20, 34, 48, 62].map((x) => (
            <path key={x} d={`M${x} 80 L${x + 14} 62`} stroke={P.goldSoft} strokeWidth="2" />
          ))}
        </g>
      )}
      {code === "lagoon" && (
        <g>
          <path d="M10 60 V38 Q22 26 34 38 V60 Z M40 60 V44 H70 V60 Z" fill={P.clay} />
          <rect x="74" y="30" width="8" height="30" fill={P.vermilion} />
          {[64, 70, 76].map((y, i) => (
            <path
              key={y}
              d={`M0 ${y} Q40 ${y - 4} 80 ${y} T160 ${y}`}
              stroke={P.lagoon}
              strokeWidth="2.5"
              fill="none"
              opacity={1 - i * 0.25}
            />
          ))}
        </g>
      )}
      {code === "dolomites" && (
        <g>
          <path d="M0 80 L40 20 L64 52 L92 10 L130 64 L160 40 V80 Z" fill={P.night3} />
          <path d="M40 20 L48 32 L34 30 Z M92 10 L102 26 L84 24 Z" fill={P.cream} />
          {[20, 50, 120, 140].map((x) => (
            <path key={x} d={`M${x} 56 L${x - 8} 76 H${x + 8} Z`} fill={P.lagoonDeep} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Lorenzo, the player's agent (facteur), who guides the first steps. */
export function Lorenzo({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill={P.night3} stroke={P.gold} strokeWidth="2" />
      <path d="M14 60 Q16 44 32 44 Q48 44 50 60 Z" fill={P.vermilion} />
      <path d="M26 44 L32 52 L38 44 Z" fill={P.cream} />
      <circle cx="32" cy="32" r="11" fill="#E8B892" />
      <path
        d="M21 26 Q20 14 32 13 Q46 14 44 26 Q38 22 32 22 Q26 22 21 26 Z"
        fill={P.vermilionDeep}
      />
      <path d="M19 26 H45" stroke={P.gold} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="32" r="1.4" fill={P.night} />
      <circle cx="36" cy="32" r="1.4" fill={P.night} />
      <path
        d="M28 37 Q32 40 36 37"
        stroke={P.night}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M24 40 Q32 46 40 40" stroke="#B07A55" strokeWidth="2" fill="none" />
    </svg>
  );
}
