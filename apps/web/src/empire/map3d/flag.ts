/**
 * Whether the map is drawn in 3D (docs/plateau-reprise.md, § 7 and 8; decision of the owner,
 * 3 November 2026: the 3D board by default). The SVG board stays only as a fallback: on a device
 * without WebGL, asked by « ?map=svg » in the address (or a build with VITE_MAP=svg), or once the 3D
 * board has failed in this tab (`give3dUp`). Kept apart from the 3D code, so that the game's bundle
 * does not pull it.
 */
const FAILED = "fondaco:map3d-failed";
const SVG = "fondaco:map-svg";

/** The device draws in software (SwiftShader, llvmpipe…): the board starts at its lowest. */
export let SOFTWARE_GL = false;

function webgl(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (!gl) return false;
    // Its renderer's name, when told (audit of 4 November, 3D M4).
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    SOFTWARE_GL = /swiftshader|llvmpipe|software|softpipe|mali-4\d\d/i.test(name);
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

/** « ?map=svg » asked once: kept for the tab (a reload, a redirect keep it). */
function askedSvg(): boolean {
  const asked = new URLSearchParams(window.location.search).get("map");
  try {
    if (asked === "svg") window.sessionStorage.setItem(SVG, "1");
    if (asked === "3d") window.sessionStorage.removeItem(SVG);
    return window.sessionStorage.getItem(SVG) === "1";
  } catch {
    return asked === "svg";
  }
}

export const MAP_3D =
  typeof window !== "undefined" &&
  !askedSvg() &&
  (import.meta.env as Record<string, string | undefined>).VITE_MAP !== "svg" &&
  !failed() &&
  webgl();

/**
 * The 3D board failed (its code or its models not fetched, its context refused or lost again and
 * again): the tab goes on with the SVG board, drawn again at once.
 */
/** The 3D failed: the next start goes to SVG, this tab carries on as it stands. */
export function mark3dFailed(why: unknown): void {
  console.warn("3D given up for the next start:", why);
  try {
    window.sessionStorage.setItem(FAILED, "1");
  } catch {
    // Without storage, the next start tries the 3D again.
  }
}

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
