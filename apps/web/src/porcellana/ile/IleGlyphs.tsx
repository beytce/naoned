/**
 * The small drawings of the island's cards (docs/plan-celadon.md C3): a line glyph for each
 * building of the tray, a coloured token for each good of a workshop's « entrée → sortie ».
 */
import type { ReactNode } from "react";
import { CELADON } from "../tokens.js";

const WORKSHOP: Record<string, ReactNode> = {
  farm: (
    <path d="M12 21V9M12 13c-3 0-4-2-4-4 3 0 4 2 4 4zm0-2c3 0 4-2 4-4-3 0-4 2-4 4zM12 9c-1.5-2-1-4 0-6 1 2 1.5 4 0 6z" />
  ),
  clay_pit: <path d="M3 8h18M5 8l2 5h10l2-5M8 13l1.5 5h5l1.5-5" />,
  lumber_camp: <path d="M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5" />,
  sand_pit: <path d="M3 19c2-6 5-9 9-9s7 3 9 9zM8 7h.01M15 5h.01M12 7.5h.01" />,
  salt_pans: <path d="M3 18h18M5 18l3-6 3 6M12 18l3.5-8 3.5 8" />,
  hemp_field: (
    <path d="M6 21V8M12 21V4M18 21V8M6 12l-3-3M6 12l3-3M12 9L9 6M12 9l3-3M18 12l-3-3M18 12l3-3" />
  ),
  mill: <path d="M9 21l1-9h4l1 9zM12 8L5 4M12 8l7-4M12 8l-4 6M12 8l4 6" />,
  sawmill: (
    <>
      <circle cx="12" cy="13" r="6" />
      <path d="M12 5V3M18 13h3M3 13h3M12 13h.01M4 20h16" />
    </>
  ),
  brickworks: <path d="M3 8h18v10H3zM3 13h18M9 8v5M15 13v5" />,
  glassworks: <path d="M5 20v-7a7 7 0 0114 0v7zM10 20v-4a2 2 0 014 0v4M12 6V3" />,
  rope_walk: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M17 17l4 3" />
    </>
  ),
  arsenal: <path d="M3 15h18l-2.5 5h-13zM12 15V4l6 8M12 6L7 12" />,
  fontaine: <path d="M4 20h16M6 20v-3h12v3M12 17V8M8 8h8M12 8c-2-3-4-2-4 0M12 8c2-3 4-2 4 0" />,
  loggia: <path d="M3 20h18M4 9h16M5 9v11M12 9v11M19 9v11M4 9l8-5 8 5" />,
  campanile: <path d="M9 21V8h6v13M9 8l3-5 3 5M11 12h2M7 21h10" />,
  scuola: <path d="M3 20h18M5 20V10M19 20V10M3 10l9-6 9 6zM10 20v-5h4v5" />,
  basilique: (
    <path d="M3 20h18M5 20v-8h14v8M8 12a4 4 0 018 0M12 8V4M10 5.5h4M10 20v-4a2 2 0 014 0v4" />
  ),
};

/** The glyph of a building in the tray. */
export function WorkshopGlyph({ type, size = 24 }: { type: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {Object.hasOwn(WORKSHOP, type) ? WORKSHOP[type] : <path d="M4 20h16M6 20V9l6-5 6 5v11" />}
    </svg>
  );
}

const D = CELADON;
const GOOD: Record<string, ReactNode> = {
  wheat: (
    <path
      d="M12 21V8M12 12c-3 0-4-2-4-4 3 0 4 2 4 4zm0 0c3 0 4-2 4-4-3 0-4 2-4 4zm0-5c-1.5-2-1-3.5 0-5 1 1.5 1.5 3 0 5z"
      fill={D.wheat}
      stroke={D.blond2}
      strokeWidth="1"
    />
  ),
  clay: <path d="M4 18c1-5 4-8 8-8s7 3 8 8z" fill={D.brick} />,
  wood: (
    <>
      <rect x="3" y="9" width="18" height="7" rx="3.5" fill={D.blond2} />
      <circle cx="17.5" cy="12.5" r="2.2" fill={D.blond} />
    </>
  ),
  sand: <path d="M3 18c2-6 5-9 9-9s7 3 9 9z" fill={D.blond} />,
  salt: <path d="M12 5l7 13H5z" fill={D.trim} stroke={D.shade} strokeWidth="1" />,
  hemp: (
    <>
      <rect x="4" y="9" width="16" height="6" rx="3" fill={D.leaf2} />
      <path d="M9 9v6M15 9v6" stroke={D.blond2} strokeWidth="1.4" />
    </>
  ),
  flour: (
    <>
      <path
        d="M7 20c-2-4-1-9 1-11h8c2 2 3 7 1 11z"
        fill={D.trim}
        stroke={D.shade}
        strokeWidth="1"
      />
      <path d="M9 9l1-3h4l1 3" fill={D.trim} stroke={D.shade} strokeWidth="1" />
    </>
  ),
  planks: (
    <>
      <rect x="3" y="7" width="18" height="3" rx="1" fill={D.blond} />
      <rect x="3" y="11" width="18" height="3" rx="1" fill={D.blond2} />
      <rect x="3" y="15" width="18" height="3" rx="1" fill={D.blond} />
    </>
  ),
  bricks: (
    <>
      <rect x="3" y="12" width="8.5" height="5" rx="1" fill={D.brick} />
      <rect x="12.5" y="12" width="8.5" height="5" rx="1" fill={D.brick} />
      <rect x="7.5" y="6" width="9" height="5" rx="1" fill={D.brick} />
    </>
  ),
  glass: <path d="M10 3h4v5l2 3v8a2 2 0 01-2 2h-4a2 2 0 01-2-2v-8l2-3z" fill={D.celadon2} />,
  rope: (
    <>
      <circle cx="12" cy="12" r="7" fill="none" stroke={D.wheat} strokeWidth="3.4" />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke={D.blond2}
        strokeWidth="1"
        strokeDasharray="2 3"
      />
    </>
  ),
};

/** The token of a good. */
export function GoodGlyph({ good, size = 22 }: { good: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {Object.hasOwn(GOOD, good) ? (
        GOOD[good]
      ) : (
        <rect x="5" y="7" width="14" height="11" rx="2" fill={D.blond} />
      )}
    </svg>
  );
}
