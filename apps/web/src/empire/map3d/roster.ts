/**
 * Who plays whom in the lands of Rome (docs/plan-porta-porcellana.md, P1): each unit of the battle
 * a turned porcelain piece (porcellana/models/pawns.ts) — its piece, its side, its height, its
 * mount, the crew on its cart. The house's pieces glazed white with the red sash; Rome's biscuit
 * and ink.
 */
import type { PawnKind } from "../../porcellana/models/pawns.js";

export type Side = "house" | "rome";

export interface Role {
  side: Side;
  /** Its piece (pawns.ts). */
  piece: PawnKind;
  /** Its height standing, in chart units. */
  height: number;
  /** On a cart pulled by a mule, or behind a bombard (the knight is a horse already). */
  mount?: "cart" | "bombard";
  /** Its crew on the cart, beyond itself. */
  crew?: PawnKind[];
  /** A banner held (the Gonfalonier), a torch in hand (the incendiary). */
  banner?: boolean;
  torch?: boolean;
}

/** The chart's units a piece stands. */
const MAN = 2.4;

export const ROLES: Record<string, Role> = {
  // The house's combat vehicles (docs/plan-porta.md § 4).
  cavaliere: { side: "house", piece: "knight", height: MAN },
  carro: { side: "house", piece: "soldier", height: MAN, mount: "cart", crew: ["crossbow"] },
  carro_grande: {
    side: "house",
    piece: "captain",
    height: MAN,
    mount: "cart",
    crew: ["crossbow", "soldier"],
  },
  // Rome (docs/plan-porta.md § 6.4), in biscuit and ink.
  crossbowman: { side: "rome", piece: "archer", height: MAN },
  halberdier: { side: "rome", piece: "legionary", height: MAN * 1.05 },
  light_horse: { side: "rome", piece: "knight", height: MAN },
  bombard: { side: "rome", piece: "legionary", height: MAN, mount: "bombard" },
  gonfalonier: { side: "rome", piece: "centurion", height: MAN * 1.5, banner: true },
  incendiary: { side: "rome", piece: "archer", height: MAN, torch: true },
};

/** The role of a unit of the battle: Rome's by its kind, the house's by its vehicle's model. */
export function roleOf(
  unit: { side: "rome"; kind: string } | { side: "player"; model?: string },
): Role {
  const fallback = (ROLES.cavaliere ?? Object.values(ROLES)[0]) as Role;
  if (unit.side === "rome") return ROLES[unit.kind] ?? ROLES.crossbowman ?? fallback;
  return ROLES[unit.model ?? "cavaliere"] ?? fallback;
}
