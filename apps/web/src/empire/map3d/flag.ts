/**
 * Whether the map is drawn in 3D (docs/plateau-reprise.md, § 7 and 8; decision of the owner,
 * 3 November 2026: the 3D board by default). The SVG board stays only as a fallback: on a device
 * without WebGL, asked by « ?map=svg » in the address (or a build with VITE_MAP=svg), or once the 3D
 * board has failed in this tab (`give3dUp`). Kept apart from the 3D code, so that the game's bundle
 * does not pull it.
 */
const FAILED = "fondaco:map3d-failed";

function webgl(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (!gl) return false;
    // The probe's context given back at once: a phone's browser keeps only a few of them.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function failed(): boolean {
  try {
    return window.sessionStorage.getItem(FAILED) === "1";
  } catch {
    return false;
  }
}

export const MAP_3D =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("map") !== "svg" &&
  (import.meta.env as Record<string, string | undefined>).VITE_MAP !== "svg" &&
  !failed() &&
  webgl();

/**
 * The 3D board failed (its code or its models not fetched, its context refused or lost again and
 * again): the tab goes on with the SVG board, drawn again at once.
 */
export function give3dUp(why: unknown): void {
  console.warn("3D board given up:", why);
  try {
    window.sessionStorage.setItem(FAILED, "1");
  } catch {
    // Without storage, the address says it.
    const u = new URL(window.location.href);
    u.searchParams.set("map", "svg");
    window.location.replace(u.toString());
    return;
  }
  window.location.reload();
}
