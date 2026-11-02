/**
 * What moves on the 3D map: the mule on its round (Quaternius's donkey, its walk played by an
 * AnimationMixer, two crates on its back), the cart (a crate on two wheels that turn, drawn by a
 * donkey), the smoke of a chimney, the lagoon's ripples, the fondaco's flag. Each moves only while
 * `live` (the device does not ask for less motion); the map's loop asks for frames meanwhile.
 */
import { RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  Box3,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  type SkinnedMesh,
  Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { C } from "../../art/plateau/props.js";
import { claySolid, useKit } from "./kit.js";

const DONKEY = "/models/quaternius/donkey.glb";
useGLTF.preload(DONKEY, false, false);

/** The donkey's own colours, swapped for the board's (by its materials' names). */
const DONKEY_COLOURS: Record<string, string> = {
  Main: C.rock2,
  Main_Light: C.wall,
  Main_Dark: C.door,
  Hair: C.door,
  Hooves: C.door,
  Muzzle: C.wall,
  Eye_Dark: "#0E1A2B",
  Eye_White: C.wall,
};

/** A donkey of its own (its skeleton cloned), `length` chart units long, and its mixer. */
function useDonkey(length: number) {
  const gltf = useGLTF(DONKEY, false, false) as unknown as {
    scene: Object3D;
    animations: import("three").AnimationClip[];
  };
  return useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      const m = o as SkinnedMesh;
      if (!m.isMesh) return;
      const swap = (mat: Material) => {
        const name = mat.name;
        return claySolid(DONKEY_COLOURS[name] ?? C.rock2);
      };
      m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
      m.castShadow = false;
      m.frustumCulled = false;
    });
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const k = length / Math.max(size.x, size.z);
    root.scale.multiplyScalar(k);
    const mixer = new AnimationMixer(root);
    const walk = gltf.animations.find((a) => a.name === "Walk");
    const idle = gltf.animations.find((a) => a.name === "Idle");
    const walking = walk ? mixer.clipAction(walk) : null;
    const resting = idle ? mixer.clipAction(idle) : null;
    walking?.play();
    return { root, mixer, walking, resting, height: size.y * k };
  }, [gltf, length]);
}

/** A soft round shadow under what moves (its shadow is not in the board's still shadow map). */
function Blob({ r }: { r: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.06} renderOrder={1}>
      <circleGeometry args={[r, 20]} />
      <meshBasicMaterial color="#0E1A2B" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

/** A round on a path there and back: where on it (0..1), which way, and resting at each end. */
function roundAt(t: number, legSeconds: number, restSeconds: number) {
  const cycle = 2 * (legSeconds + restSeconds);
  const u = ((t % cycle) + cycle) % cycle;
  if (u < legSeconds) return { at: ease(u / legSeconds), back: false, resting: false };
  if (u < legSeconds + restSeconds) return { at: 1, back: false, resting: true };
  const w = u - legSeconds - restSeconds;
  if (w < legSeconds) return { at: 1 - ease(w / legSeconds), back: true, resting: false };
  return { at: 0, back: true, resting: true };
}
const ease = (x: number) => x * x * (3 - 2 * x) * 0.25 + x * 0.75;

function curveOf(path: [number, number, number][]) {
  return new CatmullRomCurve3(path.map(([x, y, z]) => new Vector3(x, y, z)));
}

/** The mule: from the fondaco to a town and back, its two crates on its back. */
export function Mule({
  path,
  live,
  leg = 9,
  follow,
}: {
  path: [number, number, number][];
  live: boolean;
  leg?: number;
  /** The camera following it (?suivre=mule): told where it is at each frame. */
  follow?: (at: Vector3) => void;
}) {
  const kit = useKit();
  const donkey = useDonkey(3.6);
  const group = useRef<Group>(null);
  const curve = useMemo(() => curveOf(path), [path]);
  const crate = kit("crate");
  const t0 = useRef(0);
  useEffect(() => () => void donkey.mixer.stopAllAction(), [donkey]);
  const place = (time: number) => {
    const g = group.current;
    if (!g) return;
    const r = roundAt(time, leg, 2.5);
    const p = curve.getPointAt(Math.min(1, Math.max(0, r.at)));
    const ahead = curve.getPointAt(Math.min(1, Math.max(0, r.at + (r.back ? -0.02 : 0.02))));
    g.position.copy(p);
    follow?.(p);
    if (!r.resting && ahead.distanceToSquared(p) > 1e-6) g.lookAt(ahead.x, p.y, ahead.z);
    if (donkey.walking && donkey.resting) {
      donkey.walking.weight = r.resting ? 0 : 1;
      donkey.resting.weight = r.resting ? 1 : 0;
      if (r.resting && !donkey.resting.isRunning()) donkey.resting.play();
    }
  };
  useFrame((_, dt) => {
    if (!live) return;
    t0.current += Math.min(dt, 0.1);
    donkey.mixer.update(Math.min(dt, 0.1));
    place(t0.current);
  });
  useEffect(() => {
    // At rest (less motion asked): halfway, still.
    place(live ? t0.current : leg * 0.45);
    donkey.mixer.update(0);
  });
  const h = donkey.height;
  return (
    <group ref={group} name="mule">
      <primitive object={donkey.root} />
      {/* The pack: two crates, one on each flank. */}
      <mesh
        geometry={crate.geo}
        material={claySolid(C.wood)}
        position={[0.62, h * 0.62, 0.15]}
        scale={0.95}
      />
      <mesh
        geometry={crate.geo}
        material={claySolid(C.wood)}
        position={[-0.62, h * 0.62, 0.15]}
        scale={0.95}
      />
      <RoundedBox args={[1.6, 0.25, 1.3]} radius={0.1} position={[0, h * 0.78, 0.15]}>
        <meshStandardMaterial color={C.roof} roughness={0.95} />
      </RoundedBox>
      <Blob r={1.5} />
    </group>
  );
}

const wheelGeo = new CylinderGeometry(0.85, 0.85, 0.32, 14);
wheelGeo.rotateZ(Math.PI / 2);

/** The cart: a crate on two wheels that turn, drawn by a donkey, on another round. */
export function Cart({
  path,
  live,
  leg = 11,
}: {
  path: [number, number, number][];
  live: boolean;
  leg?: number;
}) {
  const kit = useKit();
  const donkey = useDonkey(3.2);
  const group = useRef<Group>(null);
  const wheels = useRef<Group>(null);
  const curve = useMemo(() => curveOf(path), [path]);
  const length = useMemo(() => curve.getLength(), [curve]);
  const t0 = useRef(1.7);
  const last = useRef(0);
  useEffect(() => () => void donkey.mixer.stopAllAction(), [donkey]);
  const place = (time: number) => {
    const g = group.current;
    if (!g) return;
    const r = roundAt(time, leg, 3);
    const p = curve.getPointAt(r.at);
    const ahead = curve.getPointAt(Math.min(1, Math.max(0, r.at + (r.back ? -0.02 : 0.02))));
    g.position.copy(p);
    if (!r.resting && ahead.distanceToSquared(p) > 1e-6) g.lookAt(ahead.x, p.y, ahead.z);
    // The wheels turn as far as the cart goes.
    const moved = Math.abs(r.at - last.current) * length;
    last.current = r.at;
    if (wheels.current)
      for (const w of wheels.current.children) (w as Mesh).rotation.x += moved / 0.85;
    if (donkey.walking && donkey.resting) {
      donkey.walking.weight = r.resting ? 0 : 1;
      donkey.resting.weight = r.resting ? 1 : 0;
      if (r.resting && !donkey.resting.isRunning()) donkey.resting.play();
    }
  };
  useFrame((_, dt) => {
    if (!live) return;
    t0.current += Math.min(dt, 0.1);
    donkey.mixer.update(Math.min(dt, 0.1));
    place(t0.current);
  });
  useEffect(() => {
    place(live ? t0.current : leg * 0.3);
    donkey.mixer.update(0);
  });
  const wood = claySolid(C.wood);
  const trunk = claySolid(C.trunk);
  return (
    <group ref={group} name="cart">
      {/* The donkey ahead, the cart behind it. */}
      <group position={[0, 0, 1.6]}>
        <primitive object={donkey.root} />
      </group>
      <group position={[0, 0, -1.6]}>
        <RoundedBox args={[2.2, 0.9, 2.4]} radius={0.18} position={[0, 1.25, 0]} castShadow>
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
          <mesh geometry={wheelGeo} material={trunk} position={[1.25, 0.85, 0]} />
          <mesh geometry={wheelGeo} material={trunk} position={[-1.25, 0.85, 0]} />
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
}

/** Soft smoke out of a chimney: a few puffs that rise, swell and fade. */
export function Smoke({ at, live }: { at: [number, number, number]; live: boolean }) {
  const puffs = useRef<Group>(null);
  const t0 = useRef(0);
  const mats = useMemo(
    () =>
      Array.from(
        { length: 5 },
        () =>
          new MeshStandardMaterial({
            color: C.wall,
            emissive: C.wall,
            emissiveIntensity: 0.6,
            roughness: 1,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
      ),
    [],
  );
  const set = (t: number) => {
    const g = puffs.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const u = (t * 0.22 + i / 5) % 1;
      c.position.set(Math.sin(u * 5 + i) * 0.5 + u * 1.2, u * 6, Math.cos(u * 4 + i) * 0.3);
      c.scale.setScalar(0.45 + u * 1.1);
      (mats[i] as MeshStandardMaterial).opacity = 0.8 * (1 - u) * Math.min(1, u * 6);
    });
  };
  useFrame((_, dt) => {
    if (!live) return;
    t0.current += Math.min(dt, 0.1);
    set(t0.current);
  });
  useEffect(() => set(live ? t0.current : 0.4));
  return (
    <group ref={puffs} position={at} name="smoke">
      {mats.map((m, i) => (
        <mesh key={String(i)} material={m}>
          <icosahedronGeometry args={[0.7, 1]} />
        </mesh>
      ))}
    </group>
  );
}

/** The fondaco's flag, in gold: its cloth waves from the pole. */
export function Flag({
  at,
  live,
  s = 1,
}: { at: [number, number, number]; live: boolean; s?: number }) {
  const cloth = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const g = new PlaneGeometry(2.6, 1.6, 10, 4);
    g.translate(1.3, 0, 0);
    return g;
  }, []);
  const rest = useMemo(() => Float32Array.from(geo.getAttribute("position").array), [geo]);
  const t0 = useRef(0);
  const wave = (t: number) => {
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = rest[3 * i] as number;
      pos.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.22 * (x / 2.6));
      pos.setY(i, (rest[3 * i + 1] as number) - (x / 2.6) * 0.15);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  useFrame((_, dt) => {
    if (!live) return;
    t0.current += Math.min(dt, 0.1);
    wave(t0.current);
  });
  useEffect(() => wave(live ? t0.current : 0.6));
  return (
    <group position={at} scale={s} name="flag">
      <mesh material={claySolid(C.trunk)} position={[0, 2.3, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 4.6, 8]} />
      </mesh>
      <mesh ref={cloth} geometry={geo} position={[0.05, 3.8, 0]} castShadow>
        <meshStandardMaterial
          color={C.gold}
          emissive={C.gold}
          emissiveIntensity={0.25}
          roughness={0.85}
          side={DoubleSide}
        />
      </mesh>
      <mesh material={claySolid(C.gold)} position={[0, 4.7, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
      </mesh>
    </group>
  );
}

/**
 * The lagoon's material: lapis, translucent, its surface raised in soft ripples by the clock (the
 * geometry is laid in world units, so the ripples run on from tile to tile).
 */
export function useWater(live: boolean) {
  const shader = useRef<{ uniforms: { uTime: { value: number } } } | null>(null);
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: C.water,
      roughness: 0.85,
      metalness: 0,
      transparent: true,
      opacity: 0.78,
    });
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = { value: 0 };
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <beginnormal_vertex>",
          `float wA = position.x * 0.35 + uTime * 1.4;
           float wB = position.z * 0.45 - uTime * 1.1;
           vec3 objectNormal = normalize(vec3(-cos(wA) * 0.35 * 0.22, 1.0, -cos(wB) * 0.45 * 0.16));
           #ifdef USE_TANGENT
           vec3 objectTangent = vec3(tangent.xyz);
           #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          "vec3 transformed = vec3(position);\ntransformed.y += sin(wA) * 0.22 + sin(wB) * 0.16;",
        );
      shader.current = s as unknown as { uniforms: { uTime: { value: number } } };
    };
    return m;
  }, []);
  useFrame((_, dt) => {
    if (live && shader.current) shader.current.uniforms.uTime.value += Math.min(dt, 0.1);
  });
  return mat;
}
