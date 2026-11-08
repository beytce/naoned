/**
 * The first times (the owner's decision of 8 November 2026): the first time a new place opens, a
 * short tutorial under the spotlight shows what it is and how it is played, step by step, before
 * the player is let free in it. Each starts when its place stands on the screen (`when`, a
 * selector), plays once on the device, and is passed with the others from the profile. A step
 * lights the first of its `chain` in sight, or none (Lorenzo speaks over the veil).
 *
 * The Terraferma's (the new Terraferma is deployed by another session): its trigger is the
 * Company's pane; its steps say the rules that stay (a week, equal arms, one's band). Its screen's
 * own anchors are to be added to the chain once it lands (docs/plan-tutoriels.md).
 */
import { fr } from "../../i18n.js";

export interface FeatureStep {
  chain: string[];
  what: string;
  why: string;
}

export interface FeatureTutor {
  id: "porta" | "remise" | "interior" | "terra";
  /** Its place on the screen: the tutorial starts when this is in sight. */
  when: string;
  steps: () => FeatureStep[];
}

const T = () => fr.empire.tutorFeatures;

/** Lorenzo's words, each with what it lights. */
const zip = (texts: [string, string][], chains: string[][]): FeatureStep[] =>
  texts.map(([what, why], i) => ({ chain: chains[i] ?? [], what, why }));

export const FEATURE_TUTORS: FeatureTutor[] = [
  {
    id: "porta",
    when: "[data-porta-dock]",
    steps: () =>
      zip(T().porta, [
        ["[data-porta-dock]"],
        ["[data-porta-quay]"],
        ["[data-porta-tiers]"],
        ["[data-porta-go]", "[data-porta-next]"],
        [],
      ]),
  },
  {
    id: "remise",
    when: "[data-remise]",
    steps: () => zip(T().remise, [["[data-remise]"], ["[data-fleet]"], ["[data-model]"], []]),
  },
  {
    id: "interior",
    when: "[data-interior-scene]",
    steps: () =>
      zip(T().interior, [
        ["[data-interior-head]"],
        ["[data-interior-pin][data-hot]", "[data-interior-pin]"],
        ["[data-interior-relaunch]"],
        ["[data-interior-open-drawer]"],
        ["[data-interior-advice]"],
      ]),
  },
  {
    id: "terra",
    when: "[data-pane=terra][aria-selected=true]",
    steps: () => zip(T().terra, [["[data-pane=terra]"], [], []]),
  },
];
