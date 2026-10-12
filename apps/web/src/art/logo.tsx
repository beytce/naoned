/**
 * Fondaco's emblem: a galley's lateen sail whose mast, yard and boom draw an F, over its hull,
 * a red pennant at the masthead. The same drawing as the app icon (public/icons/icon.svg).
 */
export function SignPaths({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M46 34 L92 24 C89 50 72 72 46 86 Z"
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g fill={color}>
        <rect x="37" y="18" width="10.5" height="74" rx="2" />
        <path d="M30 33.5 L97 19 L98.8 26.5 L31.8 41 Z" />
        <path d="M37 60 H72 L69 69 H37 Z" />
        <path d="M17 90 H103 C99 103 87 109 73 109 H47 C33 109 21 103 17 90 Z" />
      </g>
      <path d="M42.5 19 V7 L59 12.5 Z" fill="rgb(var(--vermilion))" />
    </g>
  );
}

export function Sign({
  size = 28,
  color = "rgb(var(--gold))",
  className = "",
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="10 2 100 112" width={size} height={size} className={className} aria-hidden="true">
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
