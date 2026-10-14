import type { ReactNode } from "react";
import { SignPaths } from "./logo.js";
import { P } from "./palette.js";

function Line({ children, size = 24 }: { children: ReactNode; size?: number }) {
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

export const NavIcon = {
  comptoir: () => (
    <Line>
      <path d="M3 10 L5 4 H19 L21 10" />
      <path d="M3 10 Q4.5 12.5 6 10 Q7.5 12.5 9 10 Q10.5 12.5 12 10 Q13.5 12.5 15 10 Q16.5 12.5 18 10 Q19.5 12.5 21 10" />
      <path d="M5 12 V20 H19 V12 M10 20 V15 H14 V20" />
    </Line>
  ),
  marche: () => (
    <Line>
      <path d="M12 3 V21 M7 21 H17 M4 7 H20" />
      <path d="M4 7 L1.5 13 Q4 15.5 6.5 13 Z M20 7 L17.5 13 Q20 15.5 22.5 13 Z" />
    </Line>
  ),
  chantiers: () => (
    <Line>
      <path d="M6 21 V4 H20 M6 4 L3 7 M12 4 V9 M12 9 h-2 v3 h4 v-3 z M2 21 H11" />
      <path d="M6 9 L10 4 M6 14 L13 4" />
    </Line>
  ),
  famille: () => (
    <Line>
      <path d="M5 4 H19 V12 Q19 18 12 21 Q5 18 5 12 Z" />
      <path d="M12 7 V16 M8.5 10.5 H15.5" />
    </Line>
  ),
  contrats: () => (
    <Line>
      <path d="M6 3 H16 L19 6 V21 H6 Z" />
      <path d="M9 9 H16 M9 12.5 H16 M9 16 H12" />
      <circle cx="16" cy="17.5" r="2.5" />
    </Line>
  ),
  routes: () => (
    <Line>
      <path d="M4 21 C8 15 6 11 11 9 S17 5 20 3" strokeDasharray="3 2.5" />
      <circle cx="5" cy="19" r="2" />
      <path d="M17 3 H21 V7" />
    </Line>
  ),
  port: () => (
    <Line>
      <path d="M12 3 V15 M12 4 L18 13 H12" />
      <path d="M3 16 H21 L18.5 20 H5.5 Z" />
    </Line>
  ),
  top: () => (
    <Line>
      <path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z" />
      <path d="M7 6 H4 Q4 10 7.5 11 M17 6 H20 Q20 10 16.5 11 M12 14 V18 M8 21 H16 M9 18 H15" />
    </Line>
  ),
  profil: () => (
    <Line>
      <path d="M12 3 L19 6 V11 Q19 17 12 21 Q5 17 5 11 V6 Z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16 Q12 12.5 15.5 16" />
    </Line>
  ),
  help: () => (
    <Line size={22}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5 Q9.5 7 12 7 Q14.5 7 14.5 9.5 Q14.5 11.5 12 12 V13.5 M12 17 v0.01" />
    </Line>
  ),
  bell: () => (
    <Line size={22}>
      <path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z M10 21 H14" />
    </Line>
  ),
};

/** The ducat: a gold coin struck with the winged lion of Saint Mark. */
export function Coin({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={P.gold} />
      <circle cx="16" cy="16" r="12.2" fill="none" stroke={P.goldDeep} strokeWidth="1.2" />
      <g transform="translate(4.6 4.4) scale(0.19)">
        <SignPaths color={P.night} />
      </g>
    </svg>
  );
}

/** Trophy medal: gold when earned, dim otherwise. */
export function Medal({ earned, size = 44 }: { earned: boolean; size?: number }) {
  const main = earned ? P.gold : P.line;
  const ribbonA = earned ? P.lagoon : P.night3;
  const ribbonB = earned ? P.vermilion : P.night3;
  return (
    <svg viewBox="0 0 40 48" width={size} height={size * 1.2} aria-hidden="true">
      <path d="M12 2 L20 18 L14 20 L6 4 Z" fill={ribbonA} />
      <path d="M28 2 L20 18 L26 20 L34 4 Z" fill={ribbonB} />
      <circle cx="20" cy="30" r="14" fill={main} />
      <circle
        cx="20"
        cy="30"
        r="10"
        fill="none"
        stroke={earned ? P.goldDeep : P.night3}
        strokeWidth="2"
      />
      <path
        d="M20 23 L22 28 H27 L23 31 L24.5 36 L20 33 L15.5 36 L17 31 L13 28 H18 Z"
        fill={earned ? P.goldDeep : P.night3}
      />
    </svg>
  );
}
