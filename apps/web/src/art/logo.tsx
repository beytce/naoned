/**
 * Fondaco's official logo: the winged lion of Saint Mark gripping a gold ducat struck with a
 * galleon, on a brown tile. Source: brand/logo.webp; scripts/icons.mjs renders the app icons and
 * the in-game logo (public/icons/logo-256.webp) from it.
 */
const LOGO = "/icons/logo-256.webp";

/** The logo, on its rounded tile (as the app icon). */
export function Emblem({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={LOGO}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Logo and name, side by side: the logotype of the side bar. */
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
