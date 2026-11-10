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
import { ball, box, cached, cyl, dyn, seeded } from "../shapes.js";
import { BOARD } from "../tokens.js";
import type { ModelOpts } from "./model.js";
import { reeds } from "./terrain.js";

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

/** A phone or a tablet: the scene spares what weighs on every pixel. */
const LOW_POWER =
  typeof window !== "undefined" &&
  (window.innerWidth < 900 || window.matchMedia?.("(pointer: coarse)").matches === true);

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
  // On a phone, the mouth glows alone: each light weighs on every pixel of the scene. Elsewhere
  // the light stays in the scene, dimmed at rest, never hidden: a light that comes and goes
  // makes the device rebuild all its shaders, a hitch each time a kiln starts or stops (the
  // owner's report of 8 November 2026, an iPhone).
  const light = LOW_POWER ? null : dyn(new PointLight(P.accentColour, 0, 4.5, 1.6));
  if (light) {
    light.position.set(x, y, z);
    p.add(light);
  }
  dyn(mouth);
  mouth.castShadow = false;
  const idle = P.m("open");
  return (t) => {
    mouth.material = o.running ? P.glow : idle;
    if (!light) return;
    if (!o.running) {
      light.intensity = 0;
      return;
    }
    const k = 0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.3) * 0.05;
    light.intensity = 4 * k;
    light.color.copy(P.accentColour);
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
 * The house's banner on a town it held at the last close of the Terraferma (link ⑤, 9 November
 * 2026): a tall pole at the tile's north-east corner, a great cloth of accent, seen from afar.
 */
export function heldBanner(P: Palette, p: Object3D): void {
  cyl(p, 0.06, 0.07, 3.4, 2.1, 0.18, -2.1, P.ink, 10);
  ball(p, 0.13, 2.1, 3.62, -2.1, P.m("trim"));
  const cloth = dyn(new Mesh(cached("held", () => new BoxGeometry(1.1, 1.5, 0.03))));
  cloth.material = P.accentCloth;
  cloth.position.set(2.1 + 0.58, 2.75, -2.1);
  cloth.castShadow = true;
  p.add(cloth);
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

/**
 * A town that knows the house grows a market at its gate (the towns' loyalty, lot 5 of the living
 * map): a stall a tier along its quay, the side the board shows, its awning of accent at the last
 * tier under a line of pennants. What the house's deliveries made is seen from afar.
 */
export function townMarket(P: Palette, p: Object3D, tier: number): void {
  const n = Math.min(3, tier);
  for (let k = 0; k < n; k++) {
    const x = -0.55 + k * 0.82;
    const z = 2.52;
    box(p, 0.62, 0.34, 0.32, x, 0.08, z, P.m("wood"), 0.02);
    for (const dx of [-0.28, 0.28])
      box(p, 0.035, 0.78, 0.035, x + dx, 0.08, z - 0.14, P.m("wood"), 0.01);
    const awning = box(p, 0.72, 0.035, 0.42, x, 0.84, z, tier >= 4 ? P.accent : P.m("trim"), 0.01);
    awning.rotation.x = 0.26;
    awning.castShadow = false;
    box(p, 0.16, 0.14, 0.16, x - 0.14, 0.42, z + 0.02, P.m("trim"), 0.02);
    box(p, 0.16, 0.14, 0.16, x + 0.12, 0.42, z + 0.03, k % 2 ? P.m("roof") : P.accent, 0.02);
  }
  if (tier >= 4) {
    // The fair's line of pennants, from a pole to the other over the stalls.
    for (const x of [-1.05, 1.6]) cyl(p, 0.025, 0.03, 1.5, x, 0.08, 2.52, P.m("wood"), 8);
    for (let k = 0; k < 7; k++) {
      const u = k / 6;
      const flag = dyn(new Mesh(cached("pennant", () => new BoxGeometry(0.16, 0.2, 0.015))));
      flag.material = P.accentCloth;
      flag.position.set(-1.05 + u * 2.65, 1.5 - Math.sin(u * Math.PI) * 0.22, 2.52);
      flag.castShadow = false;
      p.add(flag);
    }
  }
}

/**
 * A shore (lot 4 of the living map): along each side of a tile of water that touches the land, a
 * line of foam at the water's level; by some, mooring posts (the lagoon's bricole) or a tuft of
 * reeds, from the tile's seed. Still: it is baked with its tile.
 */
export function shore(
  P: Palette,
  p: Object3D,
  sides: readonly [boolean, boolean, boolean, boolean],
  seed: number,
): void {
  const rnd = seeded(seed * 11 + 5);
  const half = (BOARD.tile + BOARD.gap) / 2;
  // North, east, south, west: the side's middle and whether it runs along x.
  const at: [number, number, boolean][] = [
    [0, -half, true],
    [half, 0, false],
    [0, half, true],
    [-half, 0, false],
  ];
  sides.forEach((touches, k) => {
    if (!touches) return;
    const [x, z, alongX] = at[k] as [number, number, boolean];
    const inX = x === 0 ? 0 : -Math.sign(x);
    const inZ = z === 0 ? 0 : -Math.sign(z);
    const len = BOARD.tile + BOARD.gap;
    const foam = box(
      p,
      alongX ? len : 0.16,
      0.03,
      alongX ? 0.16 : len,
      x + inX * 0.1,
      BOARD.waterY - 0.012,
      z + inZ * 0.1,
      P.m("trim"),
      0.012,
    );
    foam.castShadow = false;
    const what = Math.floor(rnd() * 4);
    const along = (rnd() - 0.5) * 3.6;
    const px = alongX ? along : x + inX * 0.55;
    const pz = alongX ? z + inZ * 0.55 : along;
    if (what === 0) {
      // Bricole: three posts leaning together, a cap of trim on the tallest.
      for (const [dx, dz, h] of [
        [0, 0, 1.0],
        [0.14, 0.06, 0.8],
        [-0.05, 0.15, 0.72],
      ] as const)
        cyl(p, 0.05, 0.06, h, px + dx, BOARD.waterY - 0.3, pz + dz, P.m("wood"), 8);
      cyl(p, 0.065, 0.065, 0.06, px, BOARD.waterY + 0.7, pz, P.m("trim"), 8);
    } else if (what === 1) {
      const sx = alongX ? along : x + inX * 0.3;
      const sz = alongX ? z + inZ * 0.3 : along;
      reeds(P, p as Group, sx, sz, rnd, BOARD.waterY);
      reeds(P, p as Group, sx + (alongX ? 0.4 : 0), sz + (alongX ? 0 : 0.4), rnd, BOARD.waterY);
    }
  });
}
