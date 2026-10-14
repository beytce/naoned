import { useId } from "react";
import { EMBLEM_COLOURS, EmblemArt, type EmblemColours } from "./emblemArt.js";

/**
 * Fondaco's emblem: the winged lion of Saint Mark rearing, a ducat struck with a galley in its
 * paws. Drawn by scripts/emblem.mjs, which also writes the app icon (public/icons/icon.svg).
 */

/** The seal's mask: the lion's parts in white, its lines and the galley cut out in black. */
const SEAL: EmblemColours = {
  ink: "#000",
  fur: "#fff",
  furShade: "#fff",
  mane: "#fff",
  far1: "#fff",
  far2: "#fff",
  far3: "#fff",
  near1: "#fff",
  near2: "#fff",
  near3: "#fff",
  goldDeep: "#000",
  sea: "#000",
  glow: "none",
  coin: "#fff",
};

/** A safe id for url(#…) references, unique to each drawing. */
function useSvgId(): string {
  return `e${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** The lion in one colour (a seal), on the 120 grid: for small sizes and coloured grounds. */
export function SignPaths({ color }: { color: string }) {
  const id = useSvgId();
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
        <EmblemArt c={SEAL} />
      </mask>
      <rect width="120" height="120" fill={color} mask={`url(#${id})`} />
    </g>
  );
}

export function Sign({
  size = 28,
  color = "rgb(var(--gold))",
  className = "",
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="8 6 104 104" width={size} height={size} className={className} aria-hidden="true">
      <SignPaths color={color} />
    </svg>
  );
}

/** The emblem in colour, on its walnut tile with rounded corners (as the app icon). */
export function Emblem({ size = 64, className = "" }: { size?: number; className?: string }) {
  const id = useSvgId();
  const c = { ...EMBLEM_COLOURS, glow: `url(#${id}-glow)`, coin: `url(#${id}-coin)` };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx="0.5" cy="0.38" r="0.78">
          <stop offset="0" stopColor="#6A4B32" />
          <stop offset="0.55" stopColor="#3A2A1E" />
          <stop offset="1" stopColor="#1E1611" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#F6D896" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F6D896" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-coin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6CE6E" />
          <stop offset="1" stopColor="#D99A32" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="27" fill={`url(#${id}-bg)`} />
      <rect
        x="0.75"
        y="0.75"
        width="118.5"
        height="118.5"
        rx="26.3"
        fill="none"
        stroke="#F6D896"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <EmblemArt c={c} />
    </svg>
  );
}

/** Emblem and name, side by side: the logotype of the side bar. */
export function Logotype({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Emblem size={size * 1.25} className="shrink-0" />
      <span
        className="font-display font-extrabold uppercase leading-none tracking-tight text-cream"
        style={{ fontSize: size * 0.82 }}
      >
        Fondaco
      </span>
    </span>
  );
}
