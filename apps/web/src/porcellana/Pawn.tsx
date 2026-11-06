/**
 * The units of the lands of Rome as porcelain pawns (docs/plan-porcellana.md lot 6, D6): a bevelled
 * base, a body in a spindle, a round head, the silhouette of its arm (a crossbow, a sword, an axe,
 * a halberd, a shield), on its mount when it has one (a horse, a cart, a bombard), its banner or its
 * torch. The house's in white and accent, Rome's in biscuit and ink. The same handle as the
 * figurines of before (figure.tsx): the caller tells it what it does; it moves by transforms, no
 * skeleton, no mixer.
 */
import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Group, type Material } from "three";
import type { Act, FigureHandle } from "../empire/map3d/figure.js";
import type { Role } from "../empire/map3d/roster.js";
import { type Palette, createPalette } from "./materials.js";
import { cart, mule } from "./models/vehicles.js";
import { ball, box, cone, cyl, dyn } from "./shapes.js";

const HOUSE = createPalette();
const ROME = createPalette({ biscuit: true });

/** The pawn's own height before it is scaled to its role's. */
const TALL = 1.3;

function arms(P: Palette, g: Group, show: string[], ink: Material, side: Material) {
  const has = (k: string) => show.some((s) => s.includes(k));
  const hand = new Group();
  hand.position.set(0.24, 0.62, 0.05);
  g.add(hand);
  if (has("Crossbow")) {
    box(hand, 0.07, 0.07, 0.5, 0, 0, 0.18, P.m("wood"), 0.015);
    box(hand, 0.46, 0.04, 0.05, 0, 0.02, 0.38, ink, 0.01);
  } else if (has("Halberd") || has("Spear") || has("Staff")) {
    cyl(hand, 0.025, 0.025, 1.3, 0, -0.35, 0.05, P.m("wood"), 8);
    box(hand, 0.05, 0.22, 0.16, 0, 0.82, 0.1, ink, 0.01);
  } else if (has("Axe")) {
    cyl(hand, 0.025, 0.025, 0.6, 0, -0.1, 0.05, P.m("wood"), 8);
    box(hand, 0.04, 0.18, 0.2, 0, 0.42, 0.12, ink, 0.01);
  } else if (has("Bomb") || has("Torch")) {
    cyl(hand, 0.03, 0.03, 0.45, 0, -0.05, 0.05, P.m("wood"), 8);
  } else {
    // A sword by default.
    box(hand, 0.05, 0.62, 0.03, 0, 0.0, 0.1, P.m("metal"), 0.01);
    box(hand, 0.2, 0.04, 0.05, 0, -0.02, 0.1, ink, 0.01);
  }
  if (has("Shield")) {
    const s = cyl(g, 0.22, 0.22, 0.05, -0.27, 0.42, 0.12, side, 24);
    s.rotation.z = Math.PI / 2;
    s.rotation.y = 0.3;
  }
  return hand;
}

/** A pawn's group: its base, body, head and arm; its mount below. */
function build(role: Role) {
  const house = role.side === "house";
  const P = house ? HOUSE : ROME;
  const body = P.m(house ? "trim" : "wall2");
  const mark = house ? P.accent : P.ink;
  const root = new Group();
  const man = new Group();
  root.add(man);
  let seat = 0;
  if (role.mount === "horse") {
    const m = mule(P, { seed: 0, running: false });
    m.group.scale.setScalar(2.1);
    m.group.rotation.y = -Math.PI / 2;
    root.add(dyn(m.group));
    seat = 0.95;
  } else if (role.mount === "cart") {
    const c = cart(P, { seed: 0, running: false });
    c.group.scale.setScalar(2.2);
    c.group.rotation.y = -Math.PI / 2;
    root.add(dyn(c.group));
    seat = 0.55;
  } else if (role.mount === "bombard") {
    const b = new Group();
    cyl(b, 0.18, 0.24, 1.0, 0, 0.3, 0.3, P.ink, 20).rotation.x = Math.PI / 2 - 0.25;
    for (const s of [-1, 1])
      cyl(b, 0.3, 0.3, 0.08, s * 0.3, 0, 0.2, P.m("wood"), 20).rotation.z = Math.PI / 2;
    b.position.z = 0.5;
    root.add(b);
  }
  man.position.y = seat;
  cyl(man, 0.3, 0.34, 0.1, 0, 0, 0, body, 28);
  cyl(man, 0.17, 0.27, 0.62, 0, 0.1, 0, body, 28);
  // The cape or the tabard: the side's mark.
  cyl(man, 0.2, 0.275, 0.22, 0, 0.3, -0.02, mark, 28);
  ball(man, 0.2, 0, 0.82, 0, body, 22);
  ball(man, 0.15, 0, 1.0, 0, P.m("trim"), 20);
  // A helmet or a hood.
  cone(man, 0.17, 0.2, 0, 1.08, 0, house ? P.m("metal") : P.ink, 18);
  const hand = arms(P, man, role.show, P.ink, mark);
  if (role.banner) {
    cyl(man, 0.02, 0.02, 1.1, -0.15, 0.6, -0.18, P.m("wood"), 8);
    box(man, 0.4, 0.28, 0.02, 0.05, 1.42, -0.18, mark, 0.01);
  }
  if (role.torch) {
    cyl(hand, 0.03, 0.03, 0.4, 0, 0.2, 0.05, P.m("wood"), 8);
    ball(hand, 0.08, 0, 0.66, 0.05, P.glow, 12);
  }
  root.scale.setScalar(role.height / TALL);
  return { root, man, hand };
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
    const { man, hand } = parts;
    man.position.x = 0;
    man.rotation.set(0, 0, 0);
    hand.rotation.set(0, 0, 0);
    const base = man.position.y;
    if (act === "die") {
      // It topples backward, and stays down.
      const k = Math.min(1, u / 0.5);
      man.rotation.x = -k * Math.PI * 0.48;
      return;
    }
    if (!live) return;
    if (act === "walk") {
      man.rotation.z = Math.sin(clock.current * 10) * 0.08;
      man.rotation.x = 0.06;
    } else if (act === "strike" && u < 0.45) {
      hand.rotation.x = Math.sin((u / 0.45) * Math.PI) * 1.4;
      man.rotation.x = Math.sin((u / 0.45) * Math.PI) * 0.2;
    } else if (act === "hit" && u < 0.35) {
      man.rotation.x = -Math.sin((u / 0.35) * Math.PI) * 0.3;
    } else if (act === "cheer" && u < 0.8) {
      man.rotation.z = Math.sin(u * 20) * 0.1;
      hand.rotation.x = -1.2;
    }
    man.position.y = base;
  });
  return <primitive object={parts.root} />;
});
