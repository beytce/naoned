import { P } from "./palette.js";

const FIELD: Record<string, string> = {
  master: P.vermilion,
  carter: P.woodLight,
  trader: P.gold,
  levant: P.lagoon,
};

/** The sign of each mastery: hammer and anvil, wheel, scales, a sack of spices. */
const SIGN: Record<string, JSX.Element> = {
  master: (
    <g>
      <path d="M14 34 H34 L31 28 H17 Z" />
      <rect x="20" y="34" width="8" height="5" />
      <rect x="16" y="39" width="16" height="3" rx="1" />
      <path d="M26 10 L36 20 L33 23 L23 13 Z" />
      <path d="M28 18 L17 29" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    </g>
  ),
  carter: (
    <g fill="none" strokeWidth="2.6">
      <circle cx="24" cy="24" r="13" />
      <circle cx="24" cy="24" r="3" />
      {[0, 45, 90, 135].map((r) => (
        <path key={r} d="M24 11 V37" transform={`rotate(${r} 24 24)`} />
      ))}
    </g>
  ),
  trader: (
    <g>
      <path d="M24 9 V38" strokeWidth="2.4" fill="none" />
      <path d="M12 15 H36" strokeWidth="2.4" fill="none" />
      <path d="M12 15 L7 27 H17 Z M36 15 L31 27 H41 Z" fillOpacity="0.85" />
      <rect x="17" y="37" width="14" height="3" rx="1" />
    </g>
  ),
  levant: (
    <g>
      <path d="M17 17 Q12 25 13 33 Q14 39 24 39 Q34 39 35 33 Q36 25 31 17 Z" />
      <path d="M17 17 L15 11 Q20 13 24 11 Q28 13 33 11 L31 17" fill="none" strokeWidth="2.4" />
      <path d="M16 17 H32" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </g>
  ),
};

export function MasteryEmblem({ code, size = 40 }: { code: string; size?: number }) {
  const field = FIELD[code] ?? P.gold;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill={P.night} stroke={field} strokeWidth="2.5" />
      <g fill={field} stroke={field}>
        {SIGN[code] ?? SIGN.master}
      </g>
    </svg>
  );
}
