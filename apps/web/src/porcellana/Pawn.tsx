/**
 * The units of the lands of Rome as turned porcelain pieces (docs/plan-porta-porcellana.md, P1):
 * the piece of its role (models/pawns.ts), on its cart or behind its bombard when it has one, its
 * crew beside it, its banner or its torch. The house's glazed white with the red sash, Rome's in
 * biscuit and ink. The caller tells it what it does; it moves by transforms only: it rocks as it
 * walks, leans into a blow, recoils when hit, topples when it dies, hops when it cheers.
 */
import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Group } from "three";
import type { Role } from "../empire/map3d/roster.js";
import { createPalette } from "./materials.js";
import { pawn } from "./models/pawns.js";
import { cart } from "./models/vehicles.js";
import { ball, box, cyl, dyn } from "./shapes.js";

/** What a unit does: the caller tells it (the battle's snapshots). */
export type Act = "stand" | "walk" | "strike" | "hit" | "die" | "cheer";

/** A pawn's handle: its group, and what it does now. */
export interface FigureHandle {
  group: Group | null;
  act(a: Act): void;
}

const HOUSE = createPalette();
const ROME = createPalette({ biscuit: true });

/** A piece's own height before it is scaled to its role's. */
const TALL = 1.45;

/** A pawn's group: its piece (the part that moves), its mount and its crew. */
function build(role: Role) {
  const P = role.side === "house" ? HOUSE : ROME;
  const root = new Group();
  const man = new Group();
  root.add(man);
  man.add(pawn(P, role.piece, role.side).group);
  if (role.mount === "cart") {
    const c = cart(P, { seed: 0, running: false });
    c.group.scale.setScalar(2.4);
    c.group.rotation.y = -Math.PI / 2;
    c.group.position.z = -0.9;
    root.add(dyn(c.group));
    (role.crew ?? []).forEach((k, i) => {
      const crew = pawn(P, k, role.side).group;
      crew.scale.setScalar(0.85);
      crew.position.set((i % 2 ? 1 : -1) * 0.5, 0, -1.2 - Math.floor(i / 2) * 0.5);
      root.add(crew);
    });
  } else if (role.mount === "bombard") {
    const b = new Group();
    cyl(b, 0.16, 0.22, 0.95, 0, 0.3, 0.3, P.ink, 24).rotation.x = Math.PI / 2 - 0.25;
    for (const s of [-1, 1])
      cyl(b, 0.28, 0.28, 0.08, s * 0.28, 0, 0.2, P.m("wood"), 24).rotation.z = Math.PI / 2;
    b.position.z = 0.7;
    root.add(b);
  }
  if (role.banner) {
    cyl(man, 0.022, 0.022, 2.0, -0.32, 0.18, -0.08, P.m("wood"), 10);
    box(man, 0.46, 0.32, 0.025, -0.08, 1.78, -0.08, P.ink, 0.01);
  }
  if (role.torch) {
    cyl(man, 0.03, 0.03, 0.5, 0.3, 0.6, 0.08, P.m("wood"), 8);
    ball(man, 0.09, 0.3, 1.16, 0.08, P.glow, 12);
  }
  root.scale.setScalar(role.height / TALL);
  return { root, man };
}

/** A unit's piece as a still group (a board's tile): its mount and crew with it. */
export function figureOf(role: Role): Group {
  return build(role).root;
}

export const Pawn = forwardRef<FigureHandle, { role: Role; live: boolean }>(function Pawn(
  { role, live },
  ref,
) {
  const parts = useMemo(() => build(role), [role]);
  const state = useRef<{ act: Act; at: number }>({ act: "stand", at: 0 });
  const clock = useRef(0);
  useImperativeHandle(ref, () => ({
    group: parts.root,
    act(a: Act) {
      const once = a === "strike" || a === "hit" || a === "die" || a === "cheer";
      if (a === state.current.act && !once) return;
      if (state.current.act === "die") return;
      state.current = { act: a, at: clock.current };
    },
  }));
  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.1);
    const { act, at } = state.current;
    const u = clock.current - at;
    const { man } = parts;
    man.rotation.set(0, 0, 0);
    man.position.set(0, 0, 0);
    if (act === "die") {
      // It topples backward, and stays down.
      const k = Math.min(1, u / 0.5);
      man.rotation.x = -k * Math.PI * 0.48;
      return;
    }
    if (!live) return;
    if (act === "walk") {
      // A piece moved on the board: it rocks on its foot.
      man.rotation.z = Math.sin(clock.current * 9) * 0.07;
      man.position.y = Math.abs(Math.sin(clock.current * 9)) * 0.05;
    } else if (act === "strike" && u < 0.45) {
      man.rotation.x = Math.sin((u / 0.45) * Math.PI) * 0.35;
    } else if (act === "hit" && u < 0.35) {
      man.rotation.x = -Math.sin((u / 0.35) * Math.PI) * 0.3;
    } else if (act === "cheer" && u < 0.8) {
      man.position.y = Math.abs(Math.sin(u * 12)) * 0.25;
    }
  });
  return <primitive object={parts.root} />;
});
