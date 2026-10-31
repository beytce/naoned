import type { ReactNode } from "react";
import { RASTER } from "./raster.js";

/** The casa family's four tiers (docs/commandes-images.md): a level shows its tier's palace. */
export const CASA_TIERS = [12, 8, 4, 1] as const;

/** The casa image of a level: casa-12, casa-8, casa-4 or casa-1. */
export function casaArt(level: number): string {
  return `casa-${CASA_TIERS.find((t) => level >= t) ?? 1}`;
}

/**
 * Where a generated illustration is served, if it was integrated (scripts/art.mjs lists it in
 * raster.ts); null, and the game keeps its drawing.
 */
export function artSource(
  family: string,
  name: string,
  list: Record<string, Record<string, "webp" | "svg">> = RASTER,
): { src: string; srcSet?: string } | null {
  const kind = list[family]?.[name];
  if (!kind) return null;
  const base = `/art/${family}/${name}`;
  return kind === "svg"
    ? { src: `${base}.svg` }
    : { src: `${base}.webp`, srcSet: `${base}.webp 1x, ${base}@2x.webp 2x` };
}

/**
 * A generated illustration (lot D of the UX audit) in place of the SVG drawing, which stays while
 * the image is not there: the game never asks for a file that does not exist.
 */
export function Illustration({
  family,
  name,
  className = "",
  fallback,
}: {
  family: string;
  name: string;
  className?: string;
  fallback: ReactNode;
}) {
  const at = artSource(family, name);
  if (!at) return <>{fallback}</>;
  return (
    <img
      src={at.src}
      srcSet={at.srcSet}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`object-contain ${className}`}
      data-art={`${family}/${name}`}
    />
  );
}
