/**
 * The sign of four, Fondaco's mark: the Quattrocento merchants' mark redrawn in simple geometry
 * (grid 120, stroke 12, round ends, filled pennant). Readable from the title screen to the favicon.
 */
export function SignPaths({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
      {/* Pennant, filled. */}
      <path d="M60 18 L88 50 L60 50 Z" fill={color} />
      {/* Mast, cross-bar and short bar. */}
      <path d="M60 18 V98 M34 50 H88 M60 74 H80" />
      {/* Feet. */}
      <path d="M60 98 L43 111 M60 98 L77 111" />
    </g>
  );
}

export function Sign({
  size = 28,
  color = "rgb(var(--gold))",
  className = "",
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 124" width={size} height={size} className={className} aria-hidden="true">
      <SignPaths color={color} />
    </svg>
  );
}

/** Sign and name, side by side: the logotype of the header and the title screen. */
export function Logotype({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Sign size={size} />
      <span
        className="font-display font-extrabold uppercase leading-none tracking-tight text-cream"
        style={{ fontSize: size * 0.82 }}
      >
        Fondaco
      </span>
    </span>
  );
}
