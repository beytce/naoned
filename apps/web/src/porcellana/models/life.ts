/**
 * What lives in the models: the smoke of a chimney, the glow of a kiln. Each shows only while the
 * game says the place works.
 */
import { Mesh, MeshStandardMaterial, type Object3D, PointLight, SphereGeometry } from "three";
import type { Palette } from "../materials.js";
import { cached, dyn } from "../shapes.js";
import type { ModelOpts } from "./model.js";

/** Puffs rising from a chimney's top, drifting east; none while the place is idle. */
export function smoke(
  p: Object3D,
  x: number,
  y: number,
  z: number,
  o: ModelOpts,
  n = 7,
): (t: number) => void {
  const geo = cached("smoke", () => new SphereGeometry(0.28, 20, 14));
  const puffs: Mesh<SphereGeometry, MeshStandardMaterial>[] = [];
  for (let i = 0; i < n; i++) {
    const mat = new MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      transparent: true,
      depthWrite: false,
    });
    const s = dyn(new Mesh(geo, mat));
    s.visible = false;
    s.position.set(x, y, z);
    p.add(s);
    puffs.push(s);
  }
  return (t) => {
    puffs.forEach((s, i) => {
      s.visible = o.running;
      if (!o.running) return;
      const ph = (t * 0.22 + i / puffs.length) % 1;
      s.position.set(x + ph * 0.9 + Math.sin(ph * 6 + i) * 0.08, y + ph * 2.6, z - ph * 0.35);
      s.scale.setScalar(0.45 + ph * 1.4);
      s.material.opacity = 0.75 * Math.sin(Math.PI * Math.min(1, ph * 1.15));
    });
  };
}

/** A kiln's glow: the mouth in accent and a small light that breathes; dark while idle. */
export function kilnGlow(
  P: Palette,
  p: Object3D,
  mouth: Mesh,
  x: number,
  y: number,
  z: number,
  o: ModelOpts,
): (t: number) => void {
  const light = dyn(new PointLight(P.accentColour, 4, 4.5, 1.6));
  light.position.set(x, y, z);
  p.add(light);
  dyn(mouth);
  mouth.castShadow = false;
  const idle = P.m("open");
  return (t) => {
    light.visible = o.running;
    mouth.material = o.running ? P.glow : idle;
    if (!o.running) return;
    const k = 0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.3) * 0.05;
    light.intensity = 4 * k;
    light.color.copy(P.accentColour);
  };
}
