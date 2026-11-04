/**
 * The Porta's figurines (docs/plan-porta-3d.md, step 0): KayKit's « Adventurers » characters and
 * Quaternius's horse (CC0, public/models/README.md), in one file (scripts/pack-minis.mjs), their
 * colours in their vertices. Each figurine is a clone of its character (its own skeleton), tinted
 * for its side — the house's lapis and gold, Rome's cinnabar and white — with only the props of
 * its role shown, scaled to a height, and its animations played by a mixer of its own.
 */
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import {
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  Box3,
  BufferAttribute,
  type BufferGeometry,
  Color,
  LoopOnce,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
  Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { C } from "../../art/plateau/props.js";
import { claySolid } from "./kit.js";

const MINIS = "/models/minis.glb";
/**
 * The figurines' file (2 MB), fetched by the Porta's scenes when their module loads, not by the
 * map's (audit of 4 November, 3D B1): the modules sharing one chunk, a preload here would go with it.
 */
export const preloadMinis = () => useGLTF.preload(MINIS, false, false);

export type Character = "Knight" | "Barbarian" | "Mage" | "Rogue" | "Rogue_Hooded";
export type Side = "house" | "rome";
/** The rig's animations kept in the pack. */
export type Anim =
  | "Idle"
  | "Walking_A"
  | "Running_A"
  | "1H_Melee_Attack_Chop"
  | "2H_Melee_Attack_Chop"
  | "1H_Ranged_Shoot"
  | "2H_Ranged_Shoot"
  | "Spellcast_Shoot"
  | "Block"
  | "Hit_A"
  | "Death_A"
  | "Death_A_Pose"
  | "Cheer"
  | "Sit_Chair_Idle";

/** Each side's accent hue (0–1) and how its colours are told apart. */
const ACCENT: Record<Side, { hue: number; sat: number }> = {
  // The house: lapis (the board's roofs).
  house: { hue: 0.6, sat: 0.55 },
  // Rome: cinnabar, the papal red.
  rome: { hue: 0.015, sat: 0.72 },
};

/**
 * A colour of a figurine, for its side: skin, metal and whites as they are; every coloured cloth
 * and leather in the side's accent (its lightness kept); for Rome, the dark leathers turned white.
 */
export function tint(rgb: [number, number, number], side: Side): [number, number, number] {
  const c = new Color(rgb[0], rgb[1], rgb[2]);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const skin = hsl.h > 0.03 && hsl.h < 0.11 && hsl.l > 0.62 && hsl.s > 0.3;
  if (skin || hsl.s < 0.18) return rgb;
  const a = ACCENT[side];
  // Rome's leathers (warm, dark) turned to the white of its tunics.
  if (side === "rome" && hsl.h > 0.02 && hsl.h < 0.12 && hsl.l < 0.42)
    c.setHSL(0.08, 0.12, 0.82 - hsl.l * 0.3);
  else c.setHSL(a.hue, Math.max(a.sat, hsl.s * 0.9), hsl.l);
  return [c.r, c.g, c.b];
}

/** The geometries of a character for a side, tinted once and shared by its figurines. */
const tinted = new Map<string, BufferGeometry>();
function tintedGeometry(geo: BufferGeometry, side: Side, key: string): BufferGeometry {
  const k = `${key}:${side}`;
  const hit = tinted.get(k);
  if (hit) return hit;
  const g = geo.clone();
  const col = g.getAttribute("color") as BufferAttribute | undefined;
  if (col) {
    const out = new Float32Array(col.count * 3);
    for (let i = 0; i < col.count; i++) {
      const [r, gg, b] = tint([col.getX(i), col.getY(i), col.getZ(i)], side);
      out[i * 3] = r;
      out[i * 3 + 1] = gg;
      out[i * 3 + 2] = b;
    }
    g.setAttribute("color", new BufferAttribute(out, 3));
  }
  tinted.set(k, g);
  return g;
}

/** The names the rig's animations target (the tracks' nodes), once for the pack. */
const rigs = new WeakMap<Object3D, Set<string>>();
function rigNames(scene: Object3D): Set<string> {
  const hit = rigs.get(scene);
  if (hit) return hit;
  const names = new Set<string>();
  scene.getObjectByName("Knight")?.traverse((o) => names.add(o.name));
  rigs.set(scene, names);
  return names;
}

/** The figurines' clay: their vertices' colours, matte (the board's light). */
const clayMini = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });

export interface Mini {
  root: Object3D;
  mixer: AnimationMixer;
  /** Plays an animation, blended from the one before (once, then holds, when asked). */
  play(anim: Anim, options?: { once?: boolean; fade?: number }): void;
  /** Its height, in chart units. */
  height: number;
}

interface Pack {
  scene: Object3D;
  animations: AnimationClip[];
}

/**
 * A figurine of a character, for a side, its props `show` (by their node names in the pack: «
 * 2H_Crossbow », « Round_Shield »…; the others hidden), `height` chart units tall.
 */
export function useMini(character: Character, side: Side, show: string[], height: number): Mini {
  const gltf = useGLTF(MINIS, false, false) as unknown as Pack;
  const key = show.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the props by their key
  return useMemo(() => {
    const source = gltf.scene.getObjectByName(character);
    if (!source) throw new Error(`no figurine ${character}`);
    const root = cloneSkinned(source);
    root.position.set(0, 0, 0);
    // The loader made the bones' names unique across the pack (« hips_1 »…): back to the rig's
    // own, which the animations (taken with the first character) name.
    const rig = rigNames(gltf.scene);
    root.traverse((o) => {
      if (rig.has(o.name)) return;
      const bare = o.name.replace(/_\d+$/, "");
      if (rig.has(bare)) o.name = bare;
    });
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const skinned = (m as SkinnedMesh).isSkinnedMesh;
      // A prop (a weapon, a shield, a hat): shown only when its role asks for it.
      // (Its name maybe made unique by the loader too: « 2H_Crossbow_1 ».)
      const bare = (n?: string) => (n ?? "").replace(/_\d+$/, "");
      const named = (s: string) =>
        m.name === s || bare(m.name) === s || m.parent?.name === s || bare(m.parent?.name) === s;
      if (!skinned && !show.some(named)) m.visible = false;
      m.geometry = tintedGeometry(m.geometry, side, `${character}/${m.name}`);
      m.material = clayMini;
      m.castShadow = false;
      m.frustumCulled = false;
    });
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const k = height / Math.max(0.001, size.y);
    root.scale.multiplyScalar(k);
    const mixer = new AnimationMixer(root);
    const actions = new Map<string, AnimationAction>();
    let current: AnimationAction | null = null;
    const play: Mini["play"] = (anim, options = {}) => {
      let a = actions.get(anim);
      if (!a) {
        const clip = gltf.animations.find((c) => c.name === anim);
        if (!clip) return;
        a = mixer.clipAction(clip);
        actions.set(anim, a);
      }
      if (a === current && !options.once) return;
      a.reset();
      if (options.once) {
        a.setLoop(LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      a.play();
      if (current && current !== a) current.crossFadeTo(a, options.fade ?? 0.2, false);
      current = a;
    };
    play("Idle");
    return { root, mixer, play, height };
  }, [gltf, character, side, key, height]);
}

/** The horse's own colours, by its materials' names: a bay for the house, a white for Rome. */
const HORSE: Record<Side, Record<string, string>> = {
  house: {
    Main: "#8A5A3A",
    Main_Dark: "#4A2F22",
    Main_Light: "#B88A62",
    Hair: "#2A1C16",
    Hooves: "#2A1C16",
    Muzzle: "#4A2F22",
    Eye_White: C.wall,
    Eye_Black: "#0E1A2B",
  },
  rome: {
    Main: "#EDE6DA",
    Main_Dark: "#B9AE9E",
    Main_Light: "#FFFFFF",
    Hair: "#C9BCA8",
    Hooves: "#4A3A30",
    Muzzle: "#D8CDBE",
    Eye_White: C.wall,
    Eye_Black: "#0E1A2B",
  },
};

export interface Horse {
  root: Object3D;
  mixer: AnimationMixer;
  play(anim: "Horse_Idle" | "Horse_Walk" | "Horse_Gallop" | "Horse_Death", once?: boolean): void;
  /** Where a rider sits, above its back (chart units). */
  saddle: number;
}

/** A horse of its own, `length` chart units long, for a side. */
export function useHorse(side: Side, length: number): Horse {
  const gltf = useGLTF(MINIS, false, false) as unknown as Pack;
  return useMemo(() => {
    const source = gltf.scene.getObjectByName("Horse");
    if (!source) throw new Error("no horse");
    const root = cloneSkinned(source);
    root.position.set(0, 0, 0);
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const swap = (mat: Material) =>
        claySolid(HORSE[side][mat.name] ?? HORSE[side].Main ?? C.rock2);
      m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
      m.castShadow = false;
      m.frustumCulled = false;
    });
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const k = length / Math.max(size.x, size.z);
    root.scale.multiplyScalar(k);
    const mixer = new AnimationMixer(root);
    const actions = new Map<string, AnimationAction>();
    let current: AnimationAction | null = null;
    const play: Horse["play"] = (anim, once = false) => {
      let a = actions.get(anim);
      if (!a) {
        const clip = gltf.animations.find((c) => c.name === anim);
        if (!clip) return;
        a = mixer.clipAction(clip);
        actions.set(anim, a);
      }
      if (a === current) return;
      a.reset();
      if (once) {
        a.setLoop(LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      a.play();
      if (current) current.crossFadeTo(a, 0.25, false);
      current = a;
    };
    play("Horse_Idle");
    return { root, mixer, play, saddle: size.y * k * 0.62 };
  }, [gltf, side, length]);
}
