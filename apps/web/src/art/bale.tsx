import { P } from "./palette.js";

/**
 * Faraj's mark, sister of the sign of four: the same grid of 120 and stroke of 12, a pennant on
 * the mast, with a crescent over it and an orb at its foot.
 */
export function FarajMark({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 120 124" width={size} height={size} aria-hidden="true">
      <FarajPaths color={color} />
    </svg>
  );
}

function FarajPaths({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
      {/* Crescent, mast and pennant, orb at the foot. */}
      <path d="M38 14 A22 22 0 0 0 82 14" />
      <path d="M60 36 V90" />
      <path d="M60 42 L86 56 L60 70 Z" fill={color} />
      <circle cx="60" cy="104" r="9" fill={color} />
    </g>
  );
}

const TOILE = "#D9C29A";
const TOILE_DEEP = "#B89D70";
const TOILE_LIGHT = "#E8D6B2";
const WAX = "#B23A2A";
const WAX_DEEP = "#7E2318";

/** The bale: canvas tied with rope, sealed with red wax stamped with Faraj's mark. */
export function BaleArt({
  size = 160,
  open = false,
  className = "",
}: { size?: number; open?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {/* Shadow on the quay. */}
      <ellipse cx="80" cy="146" rx="56" ry="8" fill="#000" opacity="0.28" />
      {/* The canvas, puffed at the corners. */}
      <path
        d="M26 46 Q22 40 30 36 L130 36 Q138 40 134 46 L138 128 Q140 138 128 138 L32 138 Q20 138 22 128 Z"
        fill={TOILE}
        stroke={TOILE_DEEP}
        strokeWidth="2.5"
      />
      {/* Weave and seams. */}
      <g stroke={TOILE_DEEP} strokeWidth="1" opacity="0.45">
        {[52, 66, 80, 94, 108, 122].map((y) => (
          <path key={y} d={`M28 ${y} Q80 ${y + 3} 134 ${y}`} fill="none" />
        ))}
      </g>
      <path
        d="M30 36 Q80 28 130 36"
        fill="none"
        stroke={TOILE_LIGHT}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M34 132 L40 126 M50 134 L54 128 M106 134 L110 128 M122 132 L126 126"
        stroke={TOILE_DEEP}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Rope, crossed; it falls away once the bale is cut open. */}
      {!open && (
        <g stroke={P.wood} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M80 34 V140" />
          <path d="M22 88 Q80 94 138 88" />
          <g stroke={P.woodLight} strokeWidth="2" strokeDasharray="3 5">
            <path d="M80 34 V140" />
            <path d="M22 88 Q80 94 138 88" />
          </g>
        </g>
      )}
      {/* The seal of red wax, where the ropes cross. */}
      {!open && (
        <g>
          <path
            d="M80 66 q10 -2 16 6 q8 6 4 16 q2 10 -8 15 q-6 8 -16 4 q-10 2 -15 -8 q-8 -6 -3 -16 q-1 -10 9 -14 q6 -6 13 -3 Z"
            fill={WAX}
            stroke={WAX_DEEP}
            strokeWidth="2"
          />
          <circle cx="80" cy="89" r="15" fill="none" stroke={WAX_DEEP} strokeWidth="1.5" />
          <g transform="translate(68 76) scale(0.2)">
            <FarajPaths color="#F1C9B8" />
          </g>
        </g>
      )}
    </svg>
  );
}

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Frame of each rarity: parchment, lagoon, lapis, purple, gold. Same in every palette. */
export const RARITY: Record<Rarity, { frame: string; deep: string; glow: string }> = {
  common: { frame: "#CFC2B0", deep: "#8F8270", glow: "rgba(207,194,176,0.35)" },
  uncommon: { frame: P.lagoon, deep: P.lagoonDeep, glow: "rgba(109,179,162,0.5)" },
  rare: { frame: "#5B8FD6", deep: "#2D5486", glow: "rgba(91,143,214,0.6)" },
  epic: { frame: "#A57BE6", deep: "#5E3FA3", glow: "rgba(165,123,230,0.65)" },
  legendary: { frame: P.gold, deep: P.goldDeep, glow: "rgba(224,173,75,0.8)" },
};

export function rarityOf(code: string): (typeof RARITY)[Rarity] {
  return RARITY[code as Rarity] ?? RARITY.common;
}

const CORNERS = [
  { x: 14, y: 14 },
  { x: 86, y: 14 },
  { x: 14, y: 126 },
  { x: 86, y: 126 },
];

/** Back of a bill of lading: parchment, a fine border and Faraj's mark. */
export function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="98" height="138" rx="9" fill="#EADBBE" stroke="#B89D70" />
      <rect
        x="7"
        y="7"
        width="86"
        height="126"
        rx="6"
        fill="none"
        stroke={P.lagoonDeep}
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="78"
        height="118"
        rx="4"
        fill="none"
        stroke={P.lagoonDeep}
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
      {CORNERS.map(({ x, y }) => (
        <path
          key={`${x}-${y}`}
          d={`M${x - 4} ${y} L${x} ${y - 4} L${x + 4} ${y} L${x} ${y + 4} Z`}
          fill={P.lagoonDeep}
        />
      ))}
      <g transform="translate(26 40) scale(0.4)">
        <FarajPaths color="#3A2A1A" />
      </g>
      <path d="M30 104 H70" stroke="#B89D70" strokeWidth="1" />
      <path d="M36 110 H64" stroke="#B89D70" strokeWidth="1" />
    </svg>
  );
}
