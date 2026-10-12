import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mat } from "./materials.js";

/**
 * The workshops in volume, modelled from rounded boxes, cylinders, cones and roofs, each on its
 * plot (centred on the origin, the plot spanning ±1). The level shows in the building: a banner at
 * II, a stone plinth and a storey at III, a corner tower at IV, gold roofs and a storey at V.
 */

export interface Model {
  group: THREE.Group;
  /** Parts that turn while the workshop works (sails, saw blades), around a local axis. */
  spin: { obj: THREE.Object3D; axis: "x" | "y" | "z"; speed: number }[];
  /** Parts that sway in the wind (wheat, banners). */
  sway: THREE.Object3D[];
  /** Where smoke rises from while it works (local). */
  smoke: THREE.Vector3[];
  /** Openings that glow while it works (ovens, kilns). */
  fire: THREE.Mesh[];
  /** Windows, lit at night. */
  windows: THREE.Mesh[];
  /** Height of the roof top, for the bubble above it. */
  top: number;
}

const geos = new Map<string, THREE.BufferGeometry>();
function geo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const found = geos.get(key);
  if (found) return found;
  const g = make();
  geos.set(key, g);
  return g;
}

export function disposeGeometries(): void {
  for (const g of geos.values()) g.dispose();
  geos.clear();
}

function place(m: THREE.Mesh, parent: THREE.Object3D, x: number, y: number, z: number) {
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** A rounded box standing on y (its base), centred on x, z. */
export function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: string,
  x = 0,
  y = 0,
  z = 0,
  r = 0.03,
): THREE.Mesh {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const g = geo(`b${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${rr.toFixed(3)}`, () =>
    rr > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d),
  );
  return place(new THREE.Mesh(g, mat(material)), parent, x, y + h / 2, z);
}

export function cyl(
  parent: THREE.Object3D,
  rTop: number,
  rBottom: number,
  h: number,
  material: string,
  x = 0,
  y = 0,
  z = 0,
  seg = 18,
): THREE.Mesh {
  const g = geo(
    `c${rTop}|${rBottom}|${h}|${seg}`,
    () => new THREE.CylinderGeometry(rTop, rBottom, h, seg),
  );
  return place(new THREE.Mesh(g, mat(material)), parent, x, y + h / 2, z);
}

export function cone(
  parent: THREE.Object3D,
  r: number,
  h: number,
  material: string,
  x = 0,
  y = 0,
  z = 0,
  seg = 18,
): THREE.Mesh {
  const g = geo(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
  return place(new THREE.Mesh(g, mat(material)), parent, x, y + h / 2, z);
}

export function sphere(
  parent: THREE.Object3D,
  r: number,
  material: string,
  x = 0,
  y = 0,
  z = 0,
  sy = 1,
): THREE.Mesh {
  const g = geo(`s${r}`, () => new THREE.SphereGeometry(r, 18, 12));
  const m = place(new THREE.Mesh(g, mat(material)), parent, x, y, z);
  m.scale.y = sy;
  return m;
}

/**
 * A gable roof over a w × d footprint at height y: the ridge along x (`along: "x"`) or z, tiles
 * on the slopes, the wall's colour on the gable ends.
 */
export function gable(
  parent: THREE.Object3D,
  w: number,
  d: number,
  rise: number,
  tiles: string,
  wall: string,
  x: number,
  y: number,
  z: number,
  along: "x" | "z" = "x",
  overhang = 0.1,
): THREE.Mesh {
  const span = (along === "x" ? d : w) / 2 + overhang;
  const length = (along === "x" ? w : d) + overhang * 2;
  const g = geo(`g${span}|${length}|${rise}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-span, 0);
    s.lineTo(span, 0);
    s.lineTo(0, rise);
    s.closePath();
    const e = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    e.translate(0, 0, -length / 2);
    return e;
  });
  const m = new THREE.Mesh(g, [mat(wall), mat(tiles)]);
  if (along === "x") m.rotation.y = Math.PI / 2;
  return place(m, parent, x, y, z);
}

/** A window on the +z face (or +x), with its frame and sill. */
function windowOn(
  model: Model,
  parent: THREE.Object3D,
  face: "x" | "z",
  x: number,
  y: number,
  z: number,
  w = 0.16,
  h = 0.2,
) {
  const frameW = face === "z" ? w + 0.05 : 0.03;
  const frameD = face === "z" ? 0.03 : w + 0.05;
  box(parent, frameW, h + 0.05, frameD, "#F7EEDC", x, y - 0.025, z, 0.008);
  const pane = box(
    parent,
    face === "z" ? w : 0.035,
    h,
    face === "z" ? 0.035 : w,
    "window",
    x + (face === "x" ? 0.006 : 0),
    y,
    z + (face === "z" ? 0.006 : 0),
    0.004,
  );
  model.windows.push(pane);
  box(
    parent,
    face === "z" ? w + 0.08 : 0.06,
    0.03,
    face === "z" ? 0.06 : w + 0.08,
    "stone",
    x,
    y - 0.05,
    z,
    0.006,
  );
}

/** A door on the +z face (or +x). */
function doorOn(parent: THREE.Object3D, face: "x" | "z", x: number, z: number, h = 0.32) {
  box(parent, face === "z" ? 0.2 : 0.04, h, face === "z" ? 0.04 : 0.2, "wood", x, 0, z, 0.01);
}

/** A walled house: plaster or planks, windows on its two seen faces, a gable roof. */
function house(
  model: Model,
  parent: THREE.Object3D,
  o: {
    w: number;
    d: number;
    h: number;
    wall: string;
    roof: string;
    x: number;
    z: number;
    along?: "x" | "z";
    rise?: number;
    y?: number;
  },
): number {
  const y0 = o.y ?? 0;
  box(parent, o.w, o.h, o.d, o.wall, o.x, y0, o.z, 0.04);
  // Timber corners and a band: the look of a merchant's house.
  for (const [cx, cz] of [
    [o.w / 2, o.d / 2],
    [-o.w / 2, o.d / 2],
    [o.w / 2, -o.d / 2],
  ] as const) {
    box(parent, 0.06, o.h, 0.06, "wood", o.x + cx, y0, o.z + cz, 0.015);
  }
  const rows = Math.max(1, Math.round(o.h / 0.45));
  for (let r = 0; r < rows; r++) {
    const wy = y0 + 0.2 + r * 0.42;
    if (wy + 0.2 > y0 + o.h) break;
    const nz = Math.max(1, Math.floor(o.w / 0.4));
    for (let i = 0; i < nz; i++) {
      const wx = o.x - o.w / 2 + (o.w / (nz + 1)) * (i + 1);
      if (r === 0 && i === Math.floor(nz / 2) && nz > 1) continue;
      windowOn(model, parent, "z", wx, wy, o.z + o.d / 2 + 0.005);
    }
    const nx = Math.max(1, Math.floor(o.d / 0.45));
    for (let i = 0; i < nx; i++) {
      const wz = o.z - o.d / 2 + (o.d / (nx + 1)) * (i + 1);
      windowOn(model, parent, "x", o.x + o.w / 2 + 0.005, wy, wz);
    }
  }
  const nz = Math.max(1, Math.floor(o.w / 0.4));
  doorOn(
    parent,
    "z",
    o.x - o.w / 2 + (o.w / (nz + 1)) * (Math.floor(nz / 2) + 1),
    o.z + o.d / 2 + 0.01,
  );
  const rise = o.rise ?? 0.42;
  gable(parent, o.w, o.d, rise, o.roof, o.wall, o.x, y0 + o.h, o.z, o.along ?? "x");
  return y0 + o.h + rise;
}

/** An evergreen of three tiers. */
export function tree(parent: THREE.Object3D, x: number, z: number, s = 1, tone = "#3F7A4A") {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.scale.setScalar(s);
  cyl(t, 0.06, 0.08, 0.3, "#6B4426", 0, 0, 0, 8);
  cone(t, 0.42, 0.55, tone, 0, 0.22, 0, 10);
  cone(t, 0.34, 0.5, shadeName(tone, 0.08), 0, 0.5, 0, 10);
  cone(t, 0.24, 0.42, shadeName(tone, 0.16), 0, 0.78, 0, 10);
  shadowBlob(t, 0.9, 0.9);
  parent.add(t);
  return t;
}

function shadeName(hex: string, k: number): string {
  const c = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), k);
  return `#${c.getHexString()}`;
}

/** A soft contact shadow on the ground. */
export function shadowBlob(parent: THREE.Object3D, sx: number, sz: number, x = 0, z = 0) {
  const g = geo("blob", () => new THREE.PlaneGeometry(1, 1));
  const m = new THREE.Mesh(g, mat("shadow"));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(sx, sz, 1);
  m.position.set(x, 0.012, z);
  m.renderOrder = -1;
  parent.add(m);
  return m;
}

function banner(model: Model, parent: THREE.Object3D, x: number, z: number, gold: boolean) {
  cyl(parent, 0.025, 0.03, 1.15, "#C98E52", x, 0, z, 8);
  const flag = new THREE.Group();
  flag.position.set(x, 1.0, z);
  box(flag, 0.32, 0.18, 0.02, gold ? "#E0AD4B" : "#6DB3A2", 0.17, 0, 0, 0.01);
  parent.add(flag);
  model.sway.push(flag);
}

/** One workshop on its plot, with what its level adds. */
export function workshopModel(type: string, level: number): Model {
  const group = new THREE.Group();
  const model: Model = { group, spin: [], sway: [], smoke: [], fire: [], windows: [], top: 1 };
  const storey = (level >= 3 ? 0.28 : 0) + (level >= 5 ? 0.24 : 0);
  const lift = level >= 3 ? 0.1 : 0;
  const roof = level >= 5 ? "roof-gold" : "roof";
  const body = new THREE.Group();
  body.position.y = lift;
  group.add(body);
  shadowBlob(group, 2.1, 2.1);
  if (level >= 3) box(group, 1.86, 0.1, 1.86, "stone", 0, 0, 0, 0.04);

  let top = 1;
  switch (type) {
    case "farm": {
      // The field: furrowed earth and swaying wheat; the barn beside it.
      box(body, 0.95, 0.05, 1.6, "dirt", 0.42, 0, 0.05, 0.02);
      for (let r = 0; r < 4; r++) {
        const row = new THREE.Group();
        row.position.set(0.1 + r * 0.22, 0.05, 0.05);
        for (let i = 0; i < 6; i++) cone(row, 0.06, 0.26, "#E3B95A", 0, 0, -0.62 + i * 0.25, 6);
        body.add(row);
        model.sway.push(row);
      }
      top = house(model, body, {
        w: 0.8,
        d: 1.0,
        h: 0.62 + storey,
        wall: "barn",
        roof: level >= 5 ? "roof-gold" : "roof-dark",
        x: -0.48,
        z: -0.15,
        along: "z",
        rise: 0.38,
      });
      const bale = cyl(body, 0.14, 0.14, 0.22, "#E8C766", -0.55, 0.14, 0.7, 14);
      bale.rotation.z = Math.PI / 2;
      break;
    }
    case "clay_pit": {
      cyl(body, 0.72, 0.62, 0.05, "dirt", 0.1, 0, 0.15, 24);
      for (const [x, z, s] of [
        [0.25, 0.0, 1],
        [-0.15, 0.4, 0.8],
        [0.5, 0.45, 0.7],
      ] as const) {
        sphere(body, 0.22 * s, "#C8693F", x, 0.06, z, 0.55);
      }
      top = house(model, body, {
        w: 0.6,
        d: 0.55,
        h: 0.45 + storey,
        wall: "wood",
        roof,
        x: -0.5,
        z: -0.5,
        rise: 0.3,
      });
      box(body, 0.3, 0.1, 0.18, "wood-light", 0.55, 0.06, -0.35, 0.02);
      model.smoke.push(new THREE.Vector3(0.2, 0.3, 0.2));
      break;
    }
    case "lumber_camp": {
      tree(body, 0.55, -0.55, 0.95);
      tree(body, -0.65, 0.6, 0.8, "#356B44");
      top = house(model, body, {
        w: 0.75,
        d: 0.7,
        h: 0.5 + storey,
        wall: "wood-light",
        roof,
        x: -0.3,
        z: -0.35,
        rise: 0.34,
      });
      for (let i = 0; i < 3; i++) {
        const log = cyl(
          body,
          0.08,
          0.08,
          0.8,
          "#8A5A34",
          0.35,
          0.08 + (i === 2 ? 0.14 : 0),
          0.35 + (i === 2 ? 0.08 : i * 0.17),
          12,
        );
        log.rotation.z = Math.PI / 2;
      }
      cyl(body, 0.12, 0.13, 0.12, "#8A5A34", -0.2, 0, 0.55, 12);
      break;
    }
    case "mill": {
      const h = 1.25 + storey;
      cyl(body, 0.36, 0.48, h, "plaster", 0, 0, 0, 24);
      box(body, 0.08, 0.04, 0.08, "stone", 0, 0, 0);
      doorOn(body, "z", 0, 0.47, 0.3);
      windowOn(model, body, "z", 0, h * 0.62, 0.4);
      windowOn(model, body, "x", 0.4, h * 0.4, 0);
      cone(body, 0.52, 0.55, level >= 5 ? "gold" : "#8A5A34", 0, h, 0, 24);
      const hub = new THREE.Group();
      hub.position.set(0.3, h * 0.82, 0.3);
      hub.rotation.y = Math.PI / 4;
      const sails = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.z = (i * Math.PI) / 2;
        box(arm, 0.04, 0.85, 0.03, "#6B4426", 0, 0, 0, 0.01);
        box(arm, 0.2, 0.62, 0.015, "#F3E6CA", 0.1, 0.22, 0.012, 0.005);
        sails.add(arm);
      }
      sphere(sails, 0.07, "#6B4426");
      hub.add(sails);
      body.add(hub);
      model.spin.push({ obj: sails, axis: "z", speed: 1.4 });
      top = h + 0.55;
      break;
    }
    case "bakery": {
      top = house(model, body, {
        w: 1.05,
        d: 0.8,
        h: 0.62 + storey,
        wall: "plaster-warm",
        roof,
        x: -0.18,
        z: -0.25,
      });
      box(body, 0.2, 1.3 + storey, 0.2, "brick", -0.55, 0, -0.5, 0.02);
      model.smoke.push(new THREE.Vector3(-0.55, 1.35 + storey + lift, -0.5));
      // The oven, a brick dome by the door, its mouth glowing while it bakes.
      sphere(body, 0.3, "brick", 0.55, 0, 0.45, 0.85);
      const mouth = box(body, 0.16, 0.12, 0.05, "#2A1A14", 0.62, 0.05, 0.74, 0.02);
      model.fire.push(mouth);
      box(body, 0.32, 0.18, 0.03, "#C98E52", -0.18, 0.66 + storey, 0.17, 0.01);
      break;
    }
    case "brickworks": {
      box(body, 0.95, 0.55 + storey, 0.9, "brick", -0.15, 0, -0.1, 0.04);
      box(body, 1.02, 0.08, 0.97, "stone", -0.15, 0.55 + storey, -0.1, 0.03);
      const mouth = box(body, 0.3, 0.2, 0.05, "#2A1A14", -0.15, 0.04, 0.37, 0.03);
      model.fire.push(mouth);
      cyl(body, 0.13, 0.17, 1.9 + storey, "brick", -0.5, 0, -0.45, 16);
      for (const y of [0.6, 1.2]) cyl(body, 0.19, 0.19, 0.05, "stone", -0.5, y + storey, -0.45, 16);
      model.smoke.push(new THREE.Vector3(-0.5, 1.95 + storey + lift, -0.45));
      for (let i = 0; i < 3; i++) box(body, 0.32, 0.12, 0.2, "#C8693F", 0.55, i * 0.12, 0.45, 0.01);
      box(body, 0.32, 0.12, 0.2, "#B5523A", 0.55, 0, 0.18, 0.01);
      top = 1.9 + storey;
      break;
    }
    case "sawmill": {
      const h = 0.62 + storey;
      for (const [x, z] of [
        [-0.6, -0.4],
        [0.6, -0.4],
        [-0.6, 0.4],
        [0.6, 0.4],
      ] as const) {
        box(body, 0.08, h, 0.08, "wood", x, 0, z, 0.015);
      }
      box(body, 1.3, 0.12, 0.92, "wood-light", 0, 0, -0.05, 0.02);
      box(body, 1.1, 0.25, 0.3, "wood", -0.05, 0.12, 0.05, 0.02);
      const log = cyl(body, 0.1, 0.1, 0.9, "#8A5A34", -0.1, 0.42, 0.05, 12);
      log.rotation.z = Math.PI / 2;
      const blade = new THREE.Group();
      blade.position.set(0.32, 0.42, 0.22);
      const disc = cyl(blade, 0.2, 0.2, 0.02, "#D9D9D2", 0, -0.01, 0, 24);
      disc.rotation.x = Math.PI / 2;
      (disc.material as THREE.MeshStandardMaterial).metalness = 0.6;
      body.add(blade);
      model.spin.push({ obj: blade, axis: "z", speed: 9 });
      gable(body, 1.3, 0.92, 0.36, roof, "wood", 0, h, -0.05, "x", 0.14);
      for (let i = 0; i < 2; i++) box(body, 0.9, 0.05, 0.2, "wood-light", 0, i * 0.05, 0.72, 0.01);
      top = h + 0.36;
      break;
    }
    case "palazzo": {
      const h = 1.0 + storey;
      box(body, 1.75, h, 1.1, "plaster", 0, 0, -0.2, 0.04);
      // The loggia: a row of arches on the ground floor, windows above, a gold cornice.
      for (let i = 0; i < 5; i++) {
        const x = -0.7 + i * 0.35;
        box(body, 0.2, 0.32, 0.04, "window", x, 0.02, 0.36, 0.06);
        windowOn(model, body, "z", x, 0.62, 0.36, 0.14, 0.24);
        if (h > 1.2) windowOn(model, body, "z", x, 0.98, 0.36, 0.12, 0.2);
      }
      for (let i = 0; i < 3; i++)
        windowOn(model, body, "x", 0.88, 0.62, -0.55 + i * 0.35, 0.14, 0.24);
      box(body, 1.83, 0.07, 1.18, "gold", 0, h, -0.2, 0.02);
      for (let i = 0; i < 7; i++)
        box(
          body,
          0.13,
          0.13,
          0.13,
          level >= 5 ? "gold" : "stone",
          -0.82 + i * 0.273,
          h + 0.07,
          0.33,
          0.02,
        );
      for (let i = 0; i < 4; i++)
        box(
          body,
          0.13,
          0.13,
          0.13,
          level >= 5 ? "gold" : "stone",
          0.82,
          h + 0.07,
          -0.7 + i * 0.33,
          0.02,
        );
      banner(model, body, -0.75, -0.7, true);
      top = h + 0.25;
      break;
    }
    default:
      top = house(model, body, {
        w: 1.1,
        d: 0.9,
        h: 0.6 + storey,
        wall: "plaster",
        roof,
        x: 0,
        z: 0,
      });
  }
  top += lift;

  // Level IV: a corner tower with its pennant.
  if (level >= 4) {
    const th = top + 0.2;
    cyl(group, 0.15, 0.17, th, "stone", -0.82, 0, -0.82, 14);
    cone(group, 0.22, 0.32, level >= 5 ? "gold" : "#C8462A", -0.82, th, -0.82, 14);
    windowOn(model, group, "z", -0.82, th * 0.6, -0.66, 0.08, 0.14);
  }
  // Level II: a banner at the front corner.
  if (level >= 2 && type !== "palazzo") banner(model, group, 0.86, 0.86, level >= 4);
  model.top = top;
  return model;
}

/** An empty plot: a dashed frame of stakes and string, ready for the builders. */
export function emptyPlotModel(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [
    [-0.85, -0.85],
    [0.85, -0.85],
    [-0.85, 0.85],
    [0.85, 0.85],
  ] as const) {
    box(g, 0.06, 0.22, 0.06, "#C98E52", x, 0, z, 0.01);
  }
  for (const [x, z, w, d] of [
    [0, -0.85, 1.7, 0.015],
    [0, 0.85, 1.7, 0.015],
    [-0.85, 0, 0.015, 1.7],
    [0.85, 0, 0.015, 1.7],
  ] as const) {
    box(g, w, 0.015, d, "#F1E4C6", x, 0.16, z, 0);
  }
  box(g, 1.6, 0.02, 1.6, "#9C8E70", 0, 0, 0, 0);
  return g;
}
