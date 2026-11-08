/**
 * The guided start (the owner's decision of 8 November 2026): until the Fondaco's level 2, the game
 * leads the new house gesture by gesture, the rest of the screen veiled, nothing to touch but the
 * one thing lit. Pure: from the payload, the step now and what to light, deepest gesture first (the
 * build button of the open sheet before the card's door, before the tile's pin), Lorenzo's own
 * button last, when nothing else is in sight.
 */
import { welcomeStep } from "../next.js";
import type { EmpirePayload } from "../types.js";

export type TutorId =
  | "build"
  | "launch"
  | "making"
  | "collect"
  | "deliver"
  | "onWay"
  | "sawmill"
  | "market"
  | "casa"
  | "rising";

export interface TutorStep {
  id: TutorId;
  /** What to light, tried in order: the first in sight is the gesture to make. */
  chain: string[];
  /** The good to buy (the Market's step), the workshop's type (a build), the town (a delivery). */
  good?: string;
  type?: string;
  city?: string;
  workshopId?: string;
  /** A step that waits (a lot under way, a mule on the road, the Fondaco rising): until when. */
  until?: number;
  from?: number;
}

/** Lorenzo's own button: the last resort, when nothing of the chain is in sight. */
export const LORENZO = "[data-next-step] [data-slab=gold]";

/** Back out of what hides the gesture: a sheet's close, a card's, the map. */
export const CLOSERS = [
  ".glass-chip[aria-label='Fermer']",
  ".pc-x",
  "[data-domain-back]",
  "[data-place-tab=map]:not([aria-current])",
];

const pin = (id: string) => `.pc-pin[data-place='${id}']`;
const cardGo = (id: string) => `.pc-card[data-card-place='${id}'] .pc-go`;
const SAWMILL = { type: "sawmill", recipe: "saw_planks" };

/** Whether the guided start leads this house: a new house, its Fondaco not yet at level 2. */
export function tutorActive(p: EmpirePayload): boolean {
  const v = p.view;
  if (!v?.welcome || !v.house.welcome) return false;
  return v.house.casa < 2;
}

/** The guided start's step now, or null when it does not lead (any more). */
export function tutorStep(p: EmpirePayload, now: number): TutorStep | null {
  if (!tutorActive(p)) return null;
  const v = p.view;
  if (!v) return null;
  const w = welcomeStep(p, now);
  if (w) {
    const ws = w.workshopId;
    switch (w.phase) {
      case "build":
        return {
          id: "build",
          type: w.type,
          chain: [
            `[data-build-recipe='${w.recipe}'] button`,
            ".pc-card[data-card-place^='free:'] .pc-go",
            ".pc-pin[data-place^='free:']",
            LORENZO,
          ],
        };
      case "launch":
      case "collect":
        return {
          id: w.phase,
          type: w.type,
          ...(ws ? { workshopId: ws } : {}),
          chain: ws
            ? [
                "[data-interior-relaunch]:not([data-interior-relaunch=running])",
                "button:has([data-map-action=collect])",
                "button:has([data-map-action=relaunch])",
                cardGo(`workshop:${ws}`),
                pin(`workshop:${ws}`),
                LORENZO,
              ]
            : [LORENZO],
        };
      case "deliver":
        return {
          id: "deliver",
          ...(w.city ? { city: w.city } : {}),
          chain: w.city
            ? ["[data-deliver] button", cardGo(`city:${w.city}`), pin(`city:${w.city}`), LORENZO]
            : [LORENZO],
        };
      case "making":
      case "onWay":
        return {
          id: w.phase,
          ...(w.city ? { city: w.city } : {}),
          ...(w.at ? { until: w.at } : {}),
          ...(w.from ? { from: w.from } : {}),
          chain: [],
        };
    }
  }
  const house = v.house;
  const builds = house.builds ?? [];
  // The Fondaco rising to its level 2: the guided start is over, its last card says so.
  const rising = builds.find((b) => b.kind === "casa");
  if (rising) return { id: "rising", until: rising.endsAt, from: rising.startedAt, chain: [] };
  // A second workshop, the sawmill: the wood's planks, and the Fondaco's two workshops.
  const hasSawmill =
    house.workshops.some((x) => x.type === SAWMILL.type) ||
    builds.some((b) => b.kind === "newWorkshop" && b.workshopType === SAWMILL.type);
  if (!hasSawmill)
    return {
      id: "sawmill",
      type: SAWMILL.type,
      chain: [
        `[data-build-recipe='${SAWMILL.recipe}'] button`,
        ".pc-card[data-card-place^='free:'] .pc-go",
        ".pc-pin[data-place^='free:']",
      ],
    };
  // The materials of the level 2 that are short, bought at San Marco.
  const need = v.nextCasa?.materials ?? {};
  const short = Object.keys(need)
    .sort()
    .find((g) => (p.stock[g] ?? 0) < (need[g] ?? 0));
  if (short)
    return {
      id: "market",
      good: short,
      chain: [
        `[data-market-buy='${short}'] button:not(:disabled)`,
        "[data-dogana]",
        cardGo("city:venezia"),
        pin("city:venezia"),
      ],
    };
  return {
    id: "casa",
    chain: [
      "[data-map-action=casa]:not(:disabled)",
      ".pc-card[data-card-place^='fondaco:'] .pc-go",
      ".pc-pin[data-place^='fondaco:']",
      LORENZO,
    ],
  };
}
