/**
 * What lives in the Porta's scenes: the smoke of a burnt town, the lagoon's ripples, a flag (the
 * bought donkey gone with the map of before, Porcellana lot 8).
 * Each moves only while `live` (the device does not ask for less motion); the map's loop asks for
 * frames meanwhile.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  Box3,
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
import { C } from "../../art/plateau/props.js";
import { claySolid } from "./kit.js";

/** A soft round shadow under what moves (its shadow is not in the board's still shadow map). */
export function Blob({ r }: { r: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.06} renderOrder={1}>
      <circleGeometry args={[r, 20]} />
      <meshBasicMaterial color="#0E1A2B" transparent opacity={0.28} depthWrite={false} />
    </mesh>
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
