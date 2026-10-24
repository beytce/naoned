import type { ReactNode } from "react";

/** Line icons of the map's panel and HUD, one weight, drawn on a 24 grid. */
function I({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  harvest: () => (
    <I>
      <path d="M4 11 H20 L18 20 H6 Z" />
      <path d="M8 11 Q8 5 12 4 Q16 5 16 11" />
      <path d="M9.5 15 H14.5" />
    </I>
  ),
  restart: () => (
    <I>
      <path d="M20 12 A8 8 0 1 1 17.7 6.3" />
      <path d="M20 4 V9 H15" />
    </I>
  ),
  workshops: () => (
    <I>
      <circle cx="9" cy="10" r="3" />
      <path d="M9 4 V5.5 M9 14.5 V16 M3 10 H4.5 M13.5 10 H15 M4.8 5.8 L5.9 6.9 M12.1 13.1 L13.2 14.2 M4.8 14.2 L5.9 13.1 M12.1 6.9 L13.2 5.8" />
      <circle cx="17" cy="17" r="2.2" />
      <path d="M17 13 V14 M17 20 V21 M13 17 H14 M20 17 H21" />
    </I>
  ),
  /** The counter's store: crates stacked. */
  crates: () => (
    <I>
      <rect x="3" y="12" width="8" height="8" />
      <rect x="13" y="12" width="8" height="8" />
      <rect x="8" y="4" width="8" height="8" />
      <path d="M7 12 V15 M17 12 V15 M12 4 V7" />
    </I>
  ),
  /** A city's warehouse: an arcade shut, its key. */
  vault: () => (
    <I>
      <path d="M4 21 V10 A8 8 0 0 1 20 10 V21 Z" />
      <circle cx="12" cy="12.5" r="2" />
      <path d="M12 14.5 V18.5 M12 17 H13.8" />
    </I>
  ),
  /** The official suppliers: the banner their crest flies on. */
  banner: () => (
    <I>
      <path d="M5 3 V21" />
      <path d="M5 4.5 H19 L16 8.5 L19 12.5 H5" />
    </I>
  ),
  /** Selling: a hand holding out a coin. */
  sell: () => (
    <I>
      <circle cx="16" cy="6" r="3" />
      <path d="M2 14 H6 L9.5 12.5 H13.5 A1.5 1.5 0 0 1 13.5 15.5 H10" />
      <path d="M6 14 V20 H13 L21 15 A1.6 1.6 0 0 0 18.6 13.2 L14.8 15.4" />
    </I>
  ),
  /** A decree: a sheet sealed. */
  decree: () => (
    <I>
      <path d="M18 11 V3 H5 V21 H12" />
      <path d="M8.5 7 H14.5 M8.5 10.5 H14.5 M8.5 14 H11" />
      <circle cx="17" cy="17" r="3.5" />
    </I>
  ),
  build: () => (
    <I>
      <path d="M14 4 L20 10 L17 13 L11 7 Z" />
      <path d="M12.5 8.5 L4 17 L7 20 L15.5 11.5" />
    </I>
  ),
  cargo: () => (
    <I>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9 H16 M8 12.5 H16 M8 16 H13" />
    </I>
  ),
  send: () => (
    <I>
      <path d="M4 12 H19 M13 6 L19 12 L13 18" />
    </I>
  ),
  check: () => (
    <I>
      <path d="M5 12.5 L10 17.5 L19 7" />
    </I>
  ),
  cross: () => (
    <I>
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </I>
  ),
  follow: () => (
    <I>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22" />
    </I>
  ),
  rialto: () => (
    <I>
      <path d="M12 3 V21 M7 21 H17 M4 7 H20" />
      <path d="M4 7 L1.5 13 Q4 15.5 6.5 13 Z M20 7 L17.5 13 Q20 15.5 22.5 13 Z" />
    </I>
  ),
  port: () => (
    <I>
      <path d="M12 3 V15 M12 4 L18 13 H12" />
      <path d="M3 16 H21 L18.5 20 H5.5 Z" />
    </I>
  ),
  criee: () => (
    <I>
      <path d="M4 10 V14 H7 L15 19 V5 L7 10 Z" />
      <path d="M18 9 Q20 12 18 15" />
    </I>
  ),
  bandits: () => (
    <I>
      <path d="M4 4 L15 15 M15 15 L13 17 M15 15 L17 13 M16 18 L19 21" />
      <path d="M20 4 L9 15 M9 15 L11 17 M9 15 L7 13 M8 18 L5 21" />
    </I>
  ),
  /** The troops: a helmet (never the crossed swords, which are the bandits'). */
  troops: () => (
    <I>
      <path d="M6 16 V11 Q6 5 12 5 Q18 5 18 11 V16 L15 19 V13 H9 V19 Z" />
      <path d="M12 13 V18 M12 5 Q14 2.5 18 3" />
    </I>
  ),
  /** A skirmish: a sword and its pennant. */
  skirmish: () => (
    <I>
      <path d="M6 21 L18 9 M15.5 6.5 L20 3 L17.5 7.5 M8 15 L10 17" />
      <path d="M6 3 V12 M6 3 L12 5 L6 7" />
    </I>
  ),
  /** The week again: a page of the calendar and its turn. */
  week: () => (
    <I>
      <path d="M5 6 H15 V15 H5 Z M8 4 V7 M12 4 V7 M5 9.5 H15" />
      <path d="M19 12 A7 7 0 0 1 9.5 20 M19 12 L21 14.5 M19 12 L16.5 13.5" />
    </I>
  ),
  /** Back onto the merchant's own land: a sight. */
  locate: () => (
    <I>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5" />
    </I>
  ),
  trophy: () => (
    <I>
      <path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z" />
      <path d="M7 6 H4 Q4 10 7.5 11 M17 6 H20 Q20 10 16.5 11 M12 14 V18 M8 21 H16 M9 18 H15" />
    </I>
  ),
  family: () => (
    <I>
      <path d="M5 4 H19 V12 Q19 18 12 21 Q5 18 5 12 Z" />
      <path d="M12 7 V16 M8.5 10.5 H15.5" />
    </I>
  ),
  help: () => (
    <I>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5 Q9.5 7 12 7 Q14.5 7 14.5 9.5 Q14.5 11.5 12 12 V13.5 M12 17 v0.01" />
    </I>
  ),
  bell: () => (
    <I size={22}>
      <path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z M10 21 H14" />
    </I>
  ),
  upgrade: () => (
    <I size={22}>
      <path d="M12 19 V6 M6 11 L12 5 L18 11 M6 19 H18" />
    </I>
  ),
  /** The counter: the merchant's house with its awning, the way back to the trade. */
  home: () => (
    <I>
      <path d="M3 10 L12 4 L21 10" />
      <path d="M5 10 V20 H19 V10" />
      <path d="M10 20 V14 H14 V20" />
    </I>
  ),
  lock: () => (
    <I size={14}>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" />
    </I>
  ),
  plus: () => (
    <I size={22}>
      <path d="M12 5 V19 M5 12 H19" />
    </I>
  ),
  chevronLeft: () => (
    <I size={22}>
      <path d="M15 5 L8 12 L15 19" />
    </I>
  ),
  chevronRight: () => (
    <I size={22}>
      <path d="M9 5 L16 12 L9 19" />
    </I>
  ),
  anchor: () => (
    <I size={20}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7 V20 M8 10 H16 M4 13 Q5 20 12 20 Q19 20 20 13" />
    </I>
  ),
  cart: () => (
    <I size={18}>
      <path d="M3 13 H17 V8 H3 Z M17 10 L21 11 V13 H17" />
      <circle cx="7" cy="16.5" r="2" />
      <circle cx="15" cy="16.5" r="2" />
    </I>
  ),
};
