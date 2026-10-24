/**
 * Fondaco's official logo: the winged lion of Saint Mark roaring on the waves, struck on a gold
 * medal, on a dark tile. Source: brand/logo.webp; scripts/icons.mjs renders the app icons and
 * the in-game logo (public/icons/logo-256.webp) from it.
 */
const LOGO = "/icons/logo-256.webp";

/** The logo, on its rounded tile (as the app icon). */
/**
 * The winged lion's medal, round: the source's dark square cropped away by the circle (design.md:
 * the logo is never redrawn, only framed).
 */
export function Emblem({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={LOGO}
        width={size}
        height={size}
        alt=""
        draggable={false}
        className="h-full w-full scale-[1.18] select-none"
      />
    </span>
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
