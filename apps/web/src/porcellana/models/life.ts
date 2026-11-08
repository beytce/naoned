/**
 * What lives in the models: the smoke of a chimney, the glow of a kiln. Each shows only while the
 * game says the place works.
 */
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PointLight,
  SphereGeometry,
} from "three";
import type { Palette } from "../materials.js";
import { ball, box, cached, cyl, dyn } from "../shapes.js";
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

/**
 * Passers-by round a place (the players' audit, P3-03: no one lived in the city): small porcelain
 * figures walking a loop along the tile's edge, more of them as the Fondaco grows (`n`), one in
 * three with a crate of accent. They walk only while the scene is live; still, they stand.
 */
export function walkers(P: Palette, p: Object3D, n: number, seed = 0): (t: number) => void {
  const people: { g: Group; phase: number; speed: number; lane: number }[] = [];
  for (let i = 0; i < Math.min(n, 8); i++) {
    const g = new Group();
    cyl(g, 0.07, 0.11, 0.32, 0, 0, 0, P.m(i % 2 ? "trim" : "wood"), 12);
    ball(g, 0.075, 0, 0.42, 0, P.m("trim"), 12);
    if (i % 3 === 0) {
      const crate = dyn(new Mesh(cached("walker-crate", () => new BoxGeometry(0.16, 0.12, 0.12))));
      crate.material = P.accent;
      crate.position.set(0, 0.42, 0.12);
      g.add(crate);
    }
    dyn(g);
    p.add(g);
    people.push({
      g,
      phase: ((i * 0.37 + seed * 0.11) % 1) as number,
      speed: 0.018 + ((i * 7 + seed) % 5) * 0.004,
      lane: 2.05 + (i % 2) * 0.25,
    });
  }
  // A square loop round the place, walked at an even pace.
  const at = (u: number, r: number): [number, number] => {
    const k = (((u % 1) + 1) % 1) * 4;
    const side = Math.floor(k);
    const f = k - side;
    const a = -r + f * 2 * r;
    return side === 0 ? [a, r] : side === 1 ? [r, -a] : side === 2 ? [-a, -r] : [-r, a];
  };
  return (t) => {
    for (const w of people) {
      const u = w.phase + t * w.speed;
      const [x, z] = at(u, w.lane);
      const [nx, nz] = at(u + 0.01, w.lane);
      w.g.position.set(x, 0.02 + Math.abs(Math.sin(t * 9 + w.phase * 20)) * 0.03, z);
      w.g.rotation.y = Math.atan2(nx - x, nz - z);
    }
  };
}

/**
 * The embellishments bought with Seals round the Fondaco (I5 of the publication plan): a well, two
 * banners of accent, a gondola at the quay, a statue on its plinth. Seen, nothing else.
 */
export function adornments(P: Palette, p: Object3D, codes: readonly string[]): void {
  const has = (c: string) => codes.includes(c);
  if (has("well")) {
    cyl(p, 0.28, 0.3, 0.32, 1.75, 0.18, 1.75, P.m("trim"), 24);
    cyl(p, 0.2, 0.2, 0.02, 1.75, 0.5, 1.75, P.ink, 24);
    cyl(p, 0.02, 0.02, 0.5, 1.55, 0.5, 1.75, P.m("wood"), 8);
    cyl(p, 0.02, 0.02, 0.5, 1.95, 0.5, 1.75, P.m("wood"), 8);
  }
  if (has("banners"))
    for (const x of [-1.9, 1.9]) {
      cyl(p, 0.025, 0.025, 1.4, x, 0.18, 2.05, P.m("wood"), 8);
      const cloth = dyn(new Mesh(cached("banner", () => new BoxGeometry(0.02, 0.5, 0.32))));
      cloth.material = P.accentCloth;
      cloth.position.set(x, 1.3, 1.88);
      p.add(cloth);
    }
  if (has("gondola")) {
    const hull = dyn(new Mesh(cached("gondola", () => new BoxGeometry(1.5, 0.12, 0.26))));
    hull.material = P.ink;
    hull.position.set(-0.3, 0.06, 2.55);
    p.add(hull);
    ball(p, 0.06, 0.45, 0.2, 2.55, P.m("trim"), 10);
  }
  if (has("statue")) {
    cyl(p, 0.26, 0.3, 0.28, -1.75, 0.18, 1.75, P.m("trim"), 4);
    cyl(p, 0.09, 0.12, 0.42, -1.75, 0.46, 1.75, P.m("trim"), 16);
    ball(p, 0.09, -1.75, 0.98, 1.75, P.m("trim"), 16);
  }
}

/**
 * A boat on the lagoon (the players' audit, P3-04: the water was still): a low hull rowed slowly
 * round its tile, rocking on the swell. Still in « moins d'animations ».
 */
export function barque(P: Palette, seed: number): { group: Group; tick: (t: number) => void } {
  const group = new Group();
  const boat = new Group();
  const hull = dyn(new Mesh(cached("barque", () => new BoxGeometry(1.1, 0.14, 0.32))));
  hull.material = P.m("wood");
  hull.position.y = 0.08;
  boat.add(hull);
  const prow = dyn(new Mesh(cached("barque-prow", () => new BoxGeometry(0.14, 0.2, 0.2))));
  prow.material = P.ink;
  prow.position.set(0.55, 0.14, 0);
  boat.add(prow);
  ball(boat, 0.07, -0.25, 0.3, 0, P.m("trim"), 10);
  if (seed % 2 === 0) {
    const crate = dyn(new Mesh(cached("barque-crate", () => new BoxGeometry(0.22, 0.16, 0.2))));
    crate.material = P.accent;
    crate.position.set(0.15, 0.23, 0);
    boat.add(crate);
  }
  dyn(boat);
  group.add(boat);
  const phase = (seed % 97) / 97;
  return {
    group,
    tick: (t) => {
      const a = phase * Math.PI * 2 + t * 0.08;
      boat.position.set(Math.cos(a) * 1.2, Math.sin(t * 1.3 + phase * 9) * 0.03, Math.sin(a) * 1.2);
      boat.rotation.y = -a - Math.PI / 2;
      boat.rotation.z = Math.sin(t * 1.1 + phase * 5) * 0.04;
    },
  };
}

/**
 * A town that knows the house (P3-07 of the players' audit: the towns did not react): one banner of
 * accent at 3 deliveries, two at 10, three at 25, along its tile's north edge.
 */
export function loyaltyBanners(P: Palette, p: Object3D, tier: number): void {
  const at = [-1.6, 0, 1.6].slice(0, Math.min(3, tier));
  for (const x of at) {
    cyl(p, 0.03, 0.03, 1.7, x, 0.18, -2.05, P.m("wood"), 8);
    const cloth = dyn(new Mesh(cached("loyalty", () => new BoxGeometry(0.4, 0.55, 0.02))));
    cloth.material = P.accentCloth;
    cloth.position.set(x + 0.22, 1.6, -2.05);
    p.add(cloth);
  }
}

/**
 * The Market in scene (P3-08 of the players' audit: the Market was a table of prices): on San
 * Marco's square, a stall for each good the house holds and the Market trades, one to three crates
 * by its stock, its awning in accent when the price stands above its rate (a good hour to sell).
 */
export function marketStalls(
  P: Palette,
  p: Object3D,
  list: readonly { n: number; hot: boolean }[],
): void {
  const spots: [number, number][] = [
    [-2.2, 0.55],
    [-1.15, 0.55],
    [-2.2, 1.65],
    [-1.15, 1.65],
  ];
  list.slice(0, 4).forEach((s, k) => {
    const [x, z] = spots[k] as [number, number];
    box(p, 0.8, 0.42, 0.5, x, 0.08, z, P.m("wood"), 0.02);
    for (const dx of [-0.36, 0.36])
      box(p, 0.04, 0.95, 0.04, x + dx, 0.08, z - 0.2, P.m("wood"), 0.01);
    const awning = box(p, 0.92, 0.04, 0.5, x, 1.0, z, s.hot ? P.accent : P.m("wall2"), 0.01);
    awning.rotation.x = 0.25;
    for (let c = 0; c < Math.max(1, Math.min(3, s.n)); c++)
      box(p, 0.2, 0.18, 0.2, x - 0.24 + c * 0.24, 0.5, z + 0.04, P.m("trim"), 0.02);
  });
}
