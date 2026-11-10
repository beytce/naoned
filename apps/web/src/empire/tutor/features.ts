/**
 * The first times (the owner's decision of 8 November 2026): the first time a new place opens, a
 * short tutorial under the spotlight shows what it is and how it is played, step by step, before
 * the player is let free in it. Each starts when its place stands on the screen (`when`, a
 * selector), plays once on the device, and is passed with the others from the profile. A step
 * lights the first of its `chain` in sight, or none (Lorenzo speaks over the veil).
 *
 * The Terraferma's three (9 November 2026, the new Terraferma): its overview when its stage first
 * opens; its board's pieces (troops, chest, a front, the place, the supply) at the first sight of
 * the board of the week (not the Battle's); the Battle's when its card first shows.
 */
import { fr } from "../../i18n.js";

export interface FeatureStep {
  chain: string[];
  what: string;
  why: string;
}

export interface FeatureTutor {
  id: "porta" | "portaFight" | "remise" | "interior" | "terra" | "terraBoard" | "battle";
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
    // The battle in the lands of Rome (docs/plan-porta-jeu.md): the convoy, a town, the closing,
    // the way home. Short: the battle's clock runs meanwhile.
    id: "portaFight",
    when: "[data-battle-convoy]",
    steps: () =>
      zip(T().portaFight, [
        ["[data-battle-convoy]"],
        ["[data-battle-city]"],
        ["[data-battle-timer]"],
        ["[data-coach=battle-home]", "[data-battle-gate]"],
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
    when: "[data-terra-stage=open]",
    steps: () => zip(T().terra, [["[data-terra-board]"], [], ["[data-battle-entry]"]]),
  },
  {
    id: "terraBoard",
    // The week's board, inside its stage: the Battle's board has its own.
    when: "[data-terra-stage=open] [data-terra-play]",
    steps: () =>
      zip(T().terraBoard, [
        ["[data-terra-troops]"],
        ["[data-terra-chest]"],
        ["[data-terra-board]"],
        ["[data-terra-rank]"],
        ["[data-terra-nav]"],
      ]),
  },
  {
    id: "battle",
    when: "[data-battle-stage=none] [data-battle-card]",
    steps: () => zip(T().battle, [["[data-battle-card]"], ["[data-battle-rating]"], []]),
  },
];
