/**
 * Whether the map is drawn in 3D (docs/plateau-reprise.md, § 7 and 8; decision of the owner,
 * 3 November 2026: the 3D board by default). The SVG board stays only as a fallback: on a device
 * without WebGL, or asked by « ?map=svg » in the address (or a build with VITE_MAP=svg). Kept apart
 * from the 3D code, so that the game's bundle does not pull it.
 */
function webgl(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export const MAP_3D =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("map") !== "svg" &&
  (import.meta.env as Record<string, string | undefined>).VITE_MAP !== "svg" &&
  webgl();
