/**
 * The figurines' lab (?lab=minis): every role of the lands of Rome in a row, the house's and
 * Rome's, standing, then walking, striking, cheering in turn — to see them before the battle.
 */
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { C } from "../../art/plateau/props.js";
import { Figure, type FigureHandle } from "./figure.js";
import { claySolid, hexSlab } from "./kit.js";
import { ROLES } from "./roster.js";

const ACTS = ["stand", "walk", "strike", "cheer"] as const;

function Row() {
  const names = Object.keys(ROLES);
  const refs = useRef<(FigureHandle | null)[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("act");
    let i = 0;
    const set = () => {
      const a = (q as (typeof ACTS)[number] | null) ?? ACTS[i++ % ACTS.length] ?? "stand";
      for (const f of refs.current) f?.act(a);
    };
    set();
    if (q) return;
    const id = window.setInterval(set, 2_500);
    return () => window.clearInterval(id);
  }, []);
  const tile = hexSlab(4.4, 1, 0.4);
  return (
    <>
      {names.map((n, i) => {
        const x = (i % 5) * 8 - 16;
        const z = Math.floor(i / 5) * 9 - 4;
        const role = ROLES[n];
        if (!role) return null;
        return (
          <group key={n} position={[x, 0, z]}>
            <mesh geometry={tile} material={claySolid(C.land)} position-y={-1} receiveShadow />
            <Figure
              ref={(f) => {
                refs.current[i] = f;
              }}
              role={role}
              live
            />
          </group>
        );
      })}
    </>
  );
}

export default function MinisLab() {
  // ?focus=<n>: up close on the n-th figurine.
  const q = new URLSearchParams(window.location.search);
  const focus = q.get("focus");
  const i = focus === null ? -1 : Number(focus);
  const at: [number, number, number] =
    i < 0 ? [0, 0, 0] : [(i % 5) * 8 - 16, 1, Math.floor(i / 5) * 9 - 4];
  return (
    <div className="fixed inset-0 bg-[#16263E]" data-minis-lab>
      <Canvas
        orthographic
        camera={{ position: [at[0], 40, at[2] + 40], zoom: i < 0 ? 14 : 70 }}
        onCreated={({ camera }) => camera.lookAt(...at)}
        shadows
      >
        <hemisphereLight args={["#CFE0F5", "#B89A62", 1.2]} />
        <directionalLight position={[-30, 60, 20]} intensity={2.2} castShadow />
        <Suspense fallback={null}>
          <Row />
        </Suspense>
      </Canvas>
    </div>
  );
}
