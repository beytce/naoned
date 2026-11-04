/**
 * Who plays whom in the lands of Rome (docs/plan-porta-3d.md, decisions of the owner of
 * 4 November 2026): each unit of the battle a figurine (minis.tsx) — its character, its side's
 * colours, the props it carries, its height, the animations of its stand, its walk and its blow,
 * and its mount. The house's combat vehicles carry their crew; Rome's soldiers in papal red and
 * white.
 */
import type { Anim, Character, Side } from "./minis.js";

export interface Role {
  character: Character;
  side: Side;
  /** Its props, by their node names in the pack. */
  show: string[];
  /** Its height standing, in chart units (a rider's, seated). */
  height: number;
  idle: Anim;
  move: Anim;
  attack: Anim;
  /** On a horse (the cavalier, the light horse), or on a cart pulled by the donkey. */
  mount?: "horse" | "cart" | "bombard";
  /** Its crew on the cart, beyond itself. */
  crew?: { character: Character; show: string[] }[];
  /** A banner on its back (the Gonfalonier), a torch in its hand (the incendiary). */
  banner?: boolean;
  torch?: boolean;
}

/** The chart's units a figurine stands, its base (a small tile is some 10 across). */
const MAN = 2.4;

export const ROLES: Record<string, Role> = {
  // The house's combat vehicles (docs/plan-porta.md § 4).
  cavaliere: {
    character: "Knight",
    side: "house",
    show: ["1H_Sword", "Badge_Shield", "Knight_Helmet", "Knight_Cape"],
    height: MAN,
    idle: "Sit_Chair_Idle",
    move: "Sit_Chair_Idle",
    attack: "1H_Melee_Attack_Chop",
    mount: "horse",
  },
  carro: {
    character: "Knight",
    side: "house",
    show: ["1H_Sword", "Round_Shield", "Knight_Helmet"],
    height: MAN,
    idle: "Idle",
    move: "Idle",
    attack: "1H_Melee_Attack_Chop",
    mount: "cart",
    crew: [{ character: "Rogue", show: ["2H_Crossbow", "Rogue_Cape"] }],
  },
  carro_grande: {
    character: "Knight",
    side: "house",
    show: ["2H_Sword", "Knight_Helmet", "Knight_Cape"],
    height: MAN,
    idle: "Idle",
    move: "Idle",
    attack: "2H_Melee_Attack_Chop",
    mount: "cart",
    crew: [
      { character: "Rogue", show: ["2H_Crossbow", "Rogue_Cape"] },
      { character: "Barbarian", show: ["Barbarian_Round_Shield", "1H_Axe", "Barbarian_Hat"] },
    ],
  },
  // Rome (docs/plan-porta.md § 6.4), in papal red and white.
  crossbowman: {
    character: "Rogue_Hooded",
    side: "rome",
    show: ["2H_Crossbow"],
    height: MAN,
    idle: "Idle",
    move: "Walking_A",
    attack: "2H_Ranged_Shoot",
  },
  halberdier: {
    character: "Barbarian",
    side: "rome",
    show: ["2H_Axe", "Barbarian_Hat", "Barbarian_Cape"],
    height: MAN * 1.05,
    idle: "Idle",
    move: "Walking_A",
    attack: "2H_Melee_Attack_Chop",
  },
  light_horse: {
    character: "Knight",
    side: "rome",
    show: ["1H_Sword", "Knight_Helmet", "Knight_Cape"],
    height: MAN,
    idle: "Sit_Chair_Idle",
    move: "Sit_Chair_Idle",
    attack: "1H_Melee_Attack_Chop",
    mount: "horse",
  },
  bombard: {
    character: "Barbarian",
    side: "rome",
    show: ["Barbarian_Hat"],
    height: MAN,
    idle: "Idle",
    move: "Walking_A",
    attack: "Block",
    mount: "bombard",
  },
  gonfalonier: {
    character: "Knight",
    side: "rome",
    show: ["2H_Sword", "Knight_Helmet", "Knight_Cape"],
    height: MAN * 1.8,
    idle: "Idle",
    move: "Walking_A",
    attack: "2H_Melee_Attack_Chop",
    banner: true,
  },
  incendiary: {
    character: "Mage",
    side: "rome",
    show: ["Mage_Hat", "Mage_Cape"],
    height: MAN,
    idle: "Idle",
    move: "Walking_A",
    attack: "Spellcast_Shoot",
    torch: true,
  },
};

/** The role of a unit of the battle: Rome's by its kind, the house's by its vehicle's model. */
export function roleOf(
  unit: { side: "rome"; kind: string } | { side: "player"; model?: string },
): Role {
  const fallback = (ROLES.cavaliere ?? Object.values(ROLES)[0]) as Role;
  if (unit.side === "rome") return ROLES[unit.kind] ?? ROLES.crossbowman ?? fallback;
  return ROLES[unit.model ?? "cavaliere"] ?? fallback;
}
