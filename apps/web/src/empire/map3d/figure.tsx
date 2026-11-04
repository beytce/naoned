/**
 * A unit of the lands of Rome as a figurine (docs/plan-porta-3d.md): its character for its role
 * (roster.ts), on its mount — a horse, a cart drawn by the donkey with its crew, a bombard on its
 * wheels — with its banner or its torch. The caller tells it what it does (`stand`, `walk`,
 * `strike`, `hit`, `die`, `cheer`); it plays the animations of its role, its mount's too.
 */
import { useFrame } from "@react-three/fiber";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { CylinderGeometry, type Group, PlaneGeometry } from "three";
import { C } from "../../art/plateau/props.js";
import { claySolid } from "./kit.js";
import { useDonkey } from "./life.js";
import { type Mini, useHorse, useMini } from "./minis.js";
import type { Role } from "./roster.js";

export type Act = "stand" | "walk" | "strike" | "hit" | "die" | "cheer";

export interface FigureHandle {
  group: Group | null;
  act(a: Act): void;
}

const wheel = new CylinderGeometry(0.55, 0.55, 0.22, 12).rotateZ(Math.PI / 2);
const pole = new CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0);
const banner = new PlaneGeometry(1, 1.3).translate(0.5, -0.65, 0);
const barrel = new CylinderGeometry(0.32, 0.4, 2, 10).rotateX(Math.PI / 2 - 0.25);

/**
 * A figurine of a role, its mixers stepped while `live`: its crew made only when it has one (a
 * figurine of the battle is drawn by the dozen).
 */
export const Figure = forwardRef<FigureHandle, { role: Role; live: boolean }>(
  function Figure(props, ref) {
    const n = props.role.crew?.length ?? 0;
    return n >= 2 ? (
      <CrewOf2 {...props} ref={ref} />
    ) : n === 1 ? (
      <CrewOf1 {...props} ref={ref} />
    ) : (
      <FigureBody {...props} crew={NONE} ref={ref} />
    );
  },
);
const NONE: Mini[] = [];

const CrewOf1 = forwardRef<FigureHandle, { role: Role; live: boolean }>(
  function CrewOf1(props, ref) {
    const c = props.role.crew?.[0];
    const a = useMini(c?.character ?? "Rogue", props.role.side, c?.show ?? [], props.role.height);
    const crew = useMemo(() => [a], [a]);
    return <FigureBody {...props} crew={crew} ref={ref} />;
  },
);

const CrewOf2 = forwardRef<FigureHandle, { role: Role; live: boolean }>(
  function CrewOf2(props, ref) {
    const [c0, c1] = props.role.crew ?? [];
    const a = useMini(c0?.character ?? "Rogue", props.role.side, c0?.show ?? [], props.role.height);
    const b = useMini(c1?.character ?? "Rogue", props.role.side, c1?.show ?? [], props.role.height);
    const crew = useMemo(() => [a, b], [a, b]);
    return <FigureBody {...props} crew={crew} ref={ref} />;
  },
);

const FigureBody = forwardRef<FigureHandle, { role: Role; live: boolean; crew: Mini[] }>(
  function FigureBody({ role, live, crew }, ref) {
    const group = useRef<Group>(null);
    const hero = useMini(role.character, role.side, role.show, role.height);
    const last = useRef<Act>("stand");
    const act = (a: Act) => {
      const once = a === "strike" || a === "hit" || a === "die" || a === "cheer";
      if (a === last.current && !once) return;
      last.current = a;
      const anim =
        a === "walk"
          ? role.move
          : a === "strike"
            ? role.attack
            : a === "hit"
              ? "Hit_A"
              : a === "die"
                ? "Death_A"
                : a === "cheer"
                  ? "Cheer"
                  : role.idle;
      hero.play(anim, { once });
      for (const m of crew) m.play(a === "walk" || a === "stand" ? "Idle" : anim, { once });
      mountAct.current?.(a);
    };
    const mountAct = useRef<((a: Act) => void) | null>(null);
    // Its mount tells how it acts (a stable callback: its effect runs once).
    const setMountAct = useCallback((f: (a: Act) => void) => {
      mountAct.current = f;
    }, []);
    useImperativeHandle(ref, () => ({ group: group.current, act }));
    useFrame((_, dt) => {
      if (!live) return;
      const d = Math.min(dt, 0.1);
      hero.mixer.update(d);
      for (const m of crew) m.mixer.update(d);
    });
    return (
      <group ref={group}>
        {role.mount === "horse" ? (
          <MountedHorse role={role} hero={hero} live={live} onAct={setMountAct} />
        ) : role.mount === "cart" ? (
          <Cart hero={hero} crew={crew} live={live} onAct={setMountAct} />
        ) : role.mount === "bombard" ? (
          <Bombard hero={hero} />
        ) : (
          <primitive object={hero.root} />
        )}
        {role.banner && <Banner height={role.height} />}
        {role.torch && <Torch height={role.height} live={live} />}
      </group>
    );
  },
);

/** A rider on its horse: the horse walks, gallops, falls; the rider sits, strikes. */
function MountedHorse({
  role,
  hero,
  live,
  onAct,
}: {
  role: Role;
  hero: Mini;
  live: boolean;
  onAct: (f: (a: Act) => void) => void;
}) {
  const horse = useHorse(role.side, role.height * 1.5);
  useEffect(() => {
    onAct((a) =>
      horse.play(
        a === "walk" ? "Horse_Gallop" : a === "die" ? "Horse_Death" : "Horse_Idle",
        a === "die",
      ),
    );
  }, [horse, onAct]);
  useFrame((_, dt) => {
    if (live) horse.mixer.update(Math.min(dt, 0.1));
  });
  return (
    <group>
      <primitive object={horse.root} />
      <group position={[0, horse.saddle - role.height * 0.32, -0.1]}>
        <primitive object={hero.root} />
      </group>
    </group>
  );
}

/** A war cart: the donkey in front, the box on two wheels, its crew standing in it. */
function Cart({
  hero,
  crew,
  live,
  onAct,
}: {
  hero: Mini;
  crew: Mini[];
  live: boolean;
  onAct: (f: (a: Act) => void) => void;
}) {
  const donkey = useDonkey(2.6);
  const wheels = useRef<Group>(null);
  const moving = useRef(false);
  useEffect(() => {
    donkey.resting?.play();
    onAct((a) => {
      moving.current = a === "walk";
    });
  }, [donkey, onAct]);
  useFrame((_, dt) => {
    if (!live) return;
    const d = Math.min(dt, 0.1);
    if (donkey.walking && donkey.resting) {
      donkey.walking.weight = moving.current ? 1 : 0;
      donkey.resting.weight = moving.current ? 0 : 1;
    }
    donkey.mixer.update(d);
    if (moving.current && wheels.current)
      for (const w of wheels.current.children) w.rotation.x += d * 6;
  });
  const wood = claySolid(C.wood);
  const trunk = claySolid(C.trunk);
  return (
    <group>
      <group position={[0, 0, 1.9]}>
        <primitive object={donkey.root} />
      </group>
      <mesh material={wood} position={[0, 0.85, -0.4]} castShadow>
        <boxGeometry args={[1.9, 0.5, 2.2]} />
      </mesh>
      <group ref={wheels}>
        <mesh geometry={wheel} material={trunk} position={[1.05, 0.55, -0.4]} />
        <mesh geometry={wheel} material={trunk} position={[-1.05, 0.55, -0.4]} />
      </group>
      <group position={[0.35, 1.1, -0.1]}>
        <primitive object={hero.root} />
      </group>
      {crew.map((m, i) => (
        <group key={m.root.uuid} position={[i === 0 ? -0.45 : 0, 1.1, i === 0 ? -0.8 : -1.2]}>
          <primitive object={m.root} />
        </group>
      ))}
    </group>
  );
}

/** A bombard on its two wheels, its gunner beside it. */
function Bombard({ hero }: { hero: Mini }) {
  const iron = claySolid(C.rock2);
  const trunk = claySolid(C.trunk);
  return (
    <group>
      <mesh geometry={barrel} material={iron} position={[0, 0.85, 0.3]} castShadow />
      <mesh geometry={wheel} material={trunk} position={[0.55, 0.55, 0]} />
      <mesh geometry={wheel} material={trunk} position={[-0.55, 0.55, 0]} />
      <group position={[1.2, 0, -0.6]}>
        <primitive object={hero.root} />
      </group>
    </group>
  );
}

/** The Gonfalonier's banner: a pole on its back, the papal keys' red and gold. */
function Banner({ height }: { height: number }) {
  return (
    <group position={[-0.3, height * 0.55, -0.35]}>
      <mesh geometry={pole} material={claySolid(C.trunk)} scale={[1, height * 1.1, 1]} />
      <mesh
        geometry={banner}
        material={claySolid("#C8322A")}
        position={[0.05, height * 1.08, 0]}
        scale={height * 0.42}
      />
      <mesh position={[0.6 * height * 0.42, height * 0.86, 0.01]}>
        <circleGeometry args={[0.18 * height * 0.42 + 0.1, 12]} />
        <meshStandardMaterial color={C.gold} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** The incendiary's torch: a stick in its hand, its flame flickering. */
function Torch({ height, live }: { height: number; live: boolean }) {
  const flame = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!live || !flame.current) return;
    const t = clock.elapsedTime * 9;
    flame.current.scale.setScalar(1 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.06);
  });
  return (
    <group position={[0.42, height * 0.45, 0.25]}>
      <mesh geometry={pole} material={claySolid(C.trunk)} scale={[1, height * 0.38, 1]} />
      <group ref={flame} position={[0, height * 0.42, 0]}>
        <mesh>
          <coneGeometry args={[0.18, 0.5, 8]} />
          <meshBasicMaterial color="#FFB347" />
        </mesh>
        <pointLight color="#FF8A3D" intensity={2} distance={5} />
      </group>
    </group>
  );
}
