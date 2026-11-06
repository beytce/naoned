import { useId } from "react";

/**
 * The house's money, drawn as objects (the playful Porcellana, proposal D, 6 November 2026): the
 * ducat a gold piece struck with the fondaco, standing on its rim; the Favour a town's red pennant;
 * the Seal a red wax with its star; the pearl nacre. Each is recognised without reading: the
 * figure always goes with it, never instead (rule 8).
 */
export function DucatCoin({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="22" r="16" fill="#A8761F" />
      <circle cx="20" cy="20" r="16" fill="#E2AE45" />
      <circle
        cx="20"
        cy="20"
        r="12"
        fill="none"
        stroke="#B4832A"
        strokeWidth="1.4"
        strokeDasharray="1.5 2.2"
      />
      <path
        d="M14.5 25.5h11M16 25.5v-6.5l4-3.2 4 3.2v6.5"
        fill="none"
        stroke="#7E571A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx="13.5"
        cy="11.5"
        rx="4"
        ry="1.8"
        fill="#fff"
        opacity="0.5"
        transform="rotate(-35 13.5 11.5)"
        className="coin-glint"
      />
    </svg>
  );
}

/** The Favour: a town's pennant, hoisted a little higher with each order delivered. */
export function FavourCoin({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="9" y="4" width="3" height="32" rx="1.5" fill="#7A5A3A" />
      <path
        d="M12 7h20l-4.5 7 4.5 7H12Z"
        fill="#C23B2E"
        stroke="#8F2820"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="19.5" cy="14" r="3.2" fill="#F6DAD5" />
      <circle cx="10.5" cy="4.5" r="2.6" fill="#E2AE45" />
    </svg>
  );
}

const SEAL =
  "20,3 23.8,5.9 28.5,5.3 30.3,9.7 34.7,11.5 34.1,16.2 37,20 34.1,23.8 34.7,28.5 30.3,30.3 28.5,34.7 23.8,34.1 20,37 16.2,34.1 11.5,34.7 9.7,30.3 5.3,28.5 5.9,23.8 3,20 5.9,16.2 5.3,11.5 9.7,9.7 11.5,5.3 16.2,5.9";
const STAR =
  "20,14 21.6,18.2 26.2,18.5 22.7,21.4 23.8,25.8 20,23.3 16.2,25.8 17.3,21.4 13.8,18.5 18.4,18.2";

/** The Seal: red wax with its star, set down like a stamp. */
export function WaxSeal({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <polygon points={SEAL} fill="#C23B2E" />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke="#8F2820" strokeWidth="1.5" />
      <polygon points={STAR} fill="#F6DAD5" />
    </svg>
  );
}

/** The pearl: nacre, precious; it hastens a site or a study, never power (rule 4). */
export function PearlCoin({ size = 30 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}p`} cx="0.36" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#EEE9F1" />
          <stop offset="1" stopColor="#B7AEC4" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="21" r="15" fill={`url(#${id}p)`} stroke="#D8D1DE" strokeWidth="0.8" />
      <ellipse cx="14.5" cy="14" rx="4" ry="2.4" fill="#fff" transform="rotate(-35 14.5 14)" />
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
