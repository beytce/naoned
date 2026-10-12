import { type SkyPhase, skyPhase } from "../art/domain.js";
import { store as prefs } from "./store.js";

/** Whether the scenes are drawn in 3D: WebGL there, and the drawn scenes not asked for. */
export const use3d = (() => {
  try {
    if (prefs.get("domain2d") === "1") return false;
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
})();

export function parisHour(now: number): number {
  return Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Paris",
    })
      .formatToParts(new Date(now))
      .find((p) => p.type === "hour")?.value ?? 12,
  );
}

/** The hour's light for a scene (or the one forced by the `domainPhase` preference). */
export function scenePhase(now: number): SkyPhase {
  return (prefs.get("domainPhase") as SkyPhase | null) ?? skyPhase(parisHour(now));
}
