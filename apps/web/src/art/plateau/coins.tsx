import { useId } from "react";

/**
 * The purse's pieces, struck in relief (the night board, docs/plan-plateau.md): the ducat with
 * its galley, the favour's star, the wax seal with its keys, the cart's wheel. Each has its own
 * gradients (an id per piece on the page).
 */
export function DucatCoin({ size = 30 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFF1B8" />
          <stop offset=".45" stopColor="#F2C24F" />
          <stop offset="1" stopColor="#9A6514" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#${id}g)`} stroke="#6E4510" strokeWidth="1.5" />
      <circle
        cx="20"
        cy="20"
        r="17"
        fill="none"
        stroke="#FFE7A0"
        strokeWidth="2.2"
        strokeDasharray="1 1.6"
        strokeOpacity=".7"
      />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="#8A5A0E" strokeWidth=".9" />
      <path d="M20 10 V24" stroke="#6E4510" strokeWidth="1.3" />
      <path d="M21 11 L27 21 H21 Z" fill="#B07A1C" stroke="#6E4510" strokeWidth=".7" />
      <path d="M12 24 H28 L25 28 H15 Z" fill="#8A5A0E" />
      <path
        d="M10 14 A11 11 0 0 1 17 9"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        className="coin-glint"
      />
    </svg>
  );
}

export function FavourCoin({ size = 30 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#C9F6E5" />
          <stop offset=".5" stopColor="#4FB894" />
          <stop offset="1" stopColor="#1F6B55" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#${id}g)`} stroke="#164E3E" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="13.5" fill="none" stroke="#164E3E" strokeWidth=".9" />
      <path
        d="M20 9 L23 16.4 L31 17 L24.9 22 L26.9 30 L20 25.6 L13.1 30 L15.1 22 L9 17 L17 16.4 Z"
        fill="#ECFBF5"
        stroke="#164E3E"
        strokeWidth=".9"
        strokeLinejoin="round"
      />
      <path
        d="M10 14 A11 11 0 0 1 17 9"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WaxSeal({ size = 30 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#F08A70" />
          <stop offset=".6" stopColor="#B53A24" />
          <stop offset="1" stopColor="#6E1C10" />
        </radialGradient>
      </defs>
      <path
        d="M20 3 C26 3 28 6 32 8 C36 11 37 15 37 20 C37 26 34 29 31 33 C27 36 24 37 20 37 C14 37 11 35 8 32 C5 28 3 25 3 20 C3 14 6 10 9 7 C12 4 15 3 20 3Z"
        fill={`url(#${id}g)`}
        stroke="#5A160C"
      />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke="#5A160C" strokeWidth="1.2" />
      <g stroke="#5A160C" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M14 26 L26 14 M26 26 L14 14" />
        <circle cx="13" cy="27" r="2" />
        <circle cx="27" cy="27" r="2" />
      </g>
    </svg>
  );
}

export function CartWheel({ size = 30 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#D79A5E" />
          <stop offset="1" stopColor="#7A4B2A" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="17" fill="none" stroke="#3B2414" strokeWidth="5" />
      <circle cx="20" cy="20" r="17" fill="none" stroke={`url(#${id}g)`} strokeWidth="3.4" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#9AA3AA" strokeDasharray="3 5" />
      <path
        d="M20 5 V35 M5 20 H35 M9.4 9.4 L30.6 30.6 M30.6 9.4 L9.4 30.6"
        stroke="#7A4B2A"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="5" fill={`url(#${id}g)`} stroke="#3B2414" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="1.6" fill="#9AA3AA" />
    </svg>
  );
}
