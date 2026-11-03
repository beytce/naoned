/**
 * Whether the map is drawn in 3D (docs/plateau-reprise.md, § 7): « ?map=3d » in the address, or a
 * build with VITE_MAP=3d. Kept apart from the 3D code, so that the game's bundle does not pull it.
 */
export const MAP_3D =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("map") === "3d" ||
    (import.meta.env as Record<string, string | undefined>).VITE_MAP === "3d");
