/**
 * The house's vehicles on the 3D board (docs/plateau-reprise.md § 7, step 4): each one an animal
 * standing where the map's medal stands (`fleetSpots`, logic.ts, the same reckoning as Fleet's), on
 * its hop under way or in orbit around its place, turned to its heading. A mule bears two crates, a
 * cart is drawn by a donkey on two wheels that turn as far as it goes, a fighter rides a donkey under
 * a cinnabar cloth. It walks only while its hop is under way, at the server's time; nothing is
 * invented: no round of its own, no animation that the game's state does not say.
 */
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type AnimationAction, type AnimationMixer, CylinderGeometry, type Group } from "three";
import { C } from "../../art/plateau/props.js";
import { damp, dampAngle } from "../../motion.js";
import { fleetSpots } from "../map/logic.js";
import type { EmpirePayload } from "../types.js";
import { claySolid, useKit } from "./kit.js";
import { Blob, useDonkey } from "./life.js";

/** How each kind of vehicle looks: a pack mule, a cart, a rider. */
export type Body = "mule" | "cart" | "rider";
export function bodyOf(type: string): Body {
  if (type === "mule") return "mule";
  if (type.startsWith("carro")) return "cart";
  return "rider";
}

interface Actor {
  group: Group;
  mixer: AnimationMixer;
  walking: AnimationAction | null;
  resting: AnimationAction | null;
  wheels?: Group | null;
  /** Where it stood at the last frame, for its wheels. */
  last?: [number, number];
}

const WHEEL_R = 0.85;
const wheelGeo = new CylinderGeometry(WHEEL_R, WHEEL_R, 0.32, 14);
wheelGeo.rotateZ(Math.PI / 2);

/** Every vehicle of the house, placed at each frame by the server's clock. */
export function Fleet3D({
  p,
  live,
  actors: shared,
}: {
  p: EmpirePayload;
  live: boolean;
  /** The animals by vehicle, for the board's touches (a ray finds the one under a finger). */
  actors?: React.MutableRefObject<Map<string, Group>>;
}) {
  const mine = p.view?.vehicles.mine ?? [];
  const actors = useRef(new Map<string, Actor>());
  // The server's clock, smooth between its answers (as Fleet's).
  const skew = useMemo(() => p.now - Date.now(), [p.now]);
  useFrame((_, dt) => {
    const clock = Date.now() + skew;
    // In orbit to the south of its place, out of a town's houses (as its medal stands).
    for (const { v, pose, x, y } of fleetSpots(p, clock, true)) {
      const a = actors.current.get(v.id);
      if (!a) continue;
      const [gx, gy] = [x, y];
      a.group.position.set(gx, 0, gy);
      // The model looks along +z; the chart's heading (x east, y south) turned to it.
      // It turns toward it by the shortest way, never in one frame (audit of 4 November, motion
      // M6); asking for less motion, at once.
      const heading = Math.atan2(Math.cos(pose.angle), Math.sin(pose.angle));
      a.group.rotation.y = live
        ? dampAngle(a.group.rotation.y, heading, 12, Math.min(dt, 0.1))
        : heading;
      const moving = pose.hop !== null;
      // Touched on the board only on its way (at rest, its place takes the touch).
      a.group.userData.moving = moving;
      if (a.walking && a.resting) {
        // From its walk to its rest and back in a quarter of a second, not a jump between poses.
        const w = live
          ? damp(a.walking.weight, moving ? 1 : 0, 10, Math.min(dt, 0.1))
          : moving
            ? 1
            : 0;
        a.walking.weight = w;
        a.resting.weight = 1 - w;
      }
      if (a.wheels && a.last) {
        const d = Math.hypot(gx - a.last[0], gy - a.last[1]);
        for (const w of a.wheels.children) w.rotation.x += d / WHEEL_R;
      }
      a.last = [gx, gy];
      if (live) a.mixer.update(Math.min(dt, 0.1));
    }
  });
  return (
    <group>
      {mine.map((v) => (
        <Vehicle3D
          key={v.id}
          body={bodyOf(v.type)}
          big={v.type === "carro_grande"}
          onReady={(a) => {
            if (a) actors.current.set(v.id, a);
            else actors.current.delete(v.id);
            if (a) shared?.current.set(v.id, a.group);
            else shared?.current.delete(v.id);
          }}
        />
      ))}
    </group>
  );
}

/** One vehicle's animal and what it bears; it tells the fleet its parts once built. */
function Vehicle3D({
  body,
  big,
  onReady,
}: {
  body: Body;
  big: boolean;
  onReady: (a: Actor | null) => void;
}) {
  const kit = useKit();
  // A mule smaller than a house (the board's scale, 3 November).
  const donkey = useDonkey(body === "cart" ? 2.2 : 2.4);
  const group = useRef<Group>(null);
  const wheels = useRef<Group>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once, its parts kept
  useEffect(() => {
    if (!group.current) return;
    donkey.walking?.play();
    donkey.resting?.play();
    onReady({
      group: group.current,
      mixer: donkey.mixer,
      walking: donkey.walking,
      resting: donkey.resting,
      wheels: wheels.current,
    });
    return () => {
      donkey.mixer.stopAllAction();
      onReady(null);
    };
  }, [donkey]);
  const h = donkey.height;
  const wood = claySolid(C.wood);
  const trunk = claySolid(C.trunk);
  if (body === "cart")
    return (
      <group ref={group} scale={big ? 1.2 : 1}>
        <group position={[0, 0, 1.6]}>
          <primitive object={donkey.root} />
        </group>
        <group position={[0, 0, -1.6]}>
          <RoundedBox args={[2.2, 0.9, 2.4]} radius={0.18} position={[0, 1.25, 0]}>
            <primitive object={wood} attach="material" />
          </RoundedBox>
          <mesh geometry={kit("crate").geo} material={wood} position={[0, 1.7, -0.2]} scale={1.2} />
          <mesh
            geometry={kit("crateB").geo}
            material={claySolid(C.plot)}
            position={[0.3, 1.7, 0.75]}
            scale={0.8}
          />
          <group ref={wheels}>
            <mesh geometry={wheelGeo} material={trunk} position={[1.25, WHEEL_R, 0]} />
            <mesh geometry={wheelGeo} material={trunk} position={[-1.25, WHEEL_R, 0]} />
          </group>
          {/* The shafts, to the donkey's flanks. */}
          <mesh material={trunk} position={[0.7, 1.15, 1.7]} rotation-x={0.12}>
            <boxGeometry args={[0.12, 0.12, 2.6]} />
          </mesh>
          <mesh material={trunk} position={[-0.7, 1.15, 1.7]} rotation-x={0.12}>
            <boxGeometry args={[0.12, 0.12, 2.6]} />
          </mesh>
        </group>
        <Blob r={2.4} />
      </group>
    );
  return (
    <group ref={group}>
      <primitive object={donkey.root} />
      {body === "mule" ? (
        <>
          {/* The pack: two crates, one on each flank, under a blue cloth. */}
          <mesh
            geometry={kit("crate").geo}
            material={wood}
            position={[0.62, h * 0.62, 0.15]}
            scale={0.95}
          />
          <mesh
            geometry={kit("crate").geo}
            material={wood}
            position={[-0.62, h * 0.62, 0.15]}
            scale={0.95}
          />
          <RoundedBox args={[1.6, 0.25, 1.3]} radius={0.1} position={[0, h * 0.78, 0.15]}>
            <meshStandardMaterial color={C.roof} roughness={0.95} />
          </RoundedBox>
        </>
      ) : (
        // A fighter (the Porta): a cinnabar cloth, a lance upright.
        <>
          <RoundedBox args={[1.5, 0.3, 1.8]} radius={0.1} position={[0, h * 0.8, 0.1]}>
            <meshStandardMaterial color="#E06A4A" roughness={0.95} />
          </RoundedBox>
          <mesh material={trunk} position={[0.5, h * 0.8 + 1.6, 0.3]}>
            <cylinderGeometry args={[0.07, 0.07, 3.4, 6]} />
          </mesh>
        </>
      )}
      <Blob r={1.5} />
    </group>
  );
}
