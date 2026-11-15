/**
 * The scene at the head of a place's sheet (docs/plan-celadon.md § 7, S2): a small picture of the
 * place's object, drawn once for a state and kept, with the board's light and camera. It is drawn
 * off the screen and its context given back at once: a phone keeps one canvas, the board's.
 */
import {
  Color,
  DirectionalLight,
  type Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "three";
import { disposeBuilt } from "../shapes.js";
import { CAMERA, CELADON, LIGHT } from "../tokens.js";

export interface VignetteScene {
  root: Group;
  /** Where the camera looks, and how much of the world it shows from top to bottom. */
  target: [number, number, number];
  span: number;
  /** The water's level, when the place stands on the lagoon. */
  water?: number;
}

const W = 780;
const H = 440;
const kept = new Map<string, string>();
let failed = false;

/** The picture of a scene, as a data URL (empty where it cannot be drawn: no WebGL, a test). */
export function vignette(key: string, build: () => VignetteScene): string {
  const had = kept.get(key);
  if (had !== undefined) return had;
  let url = "";
  if (!failed && typeof document !== "undefined") {
    let renderer: WebGLRenderer | null = null;
    let built: VignetteScene | null = null;
    try {
      renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      renderer.toneMapping = NeutralToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;
      built = build();
      const [tx, ty, tz] = built.target;
      const scene = new Scene();
      scene.background = new Color(CELADON.sky);
      scene.add(built.root);
      if (built.water !== undefined) {
        const sea = new Mesh(
          new PlaneGeometry(300, 300),
          new MeshStandardMaterial({ color: CELADON.water, roughness: 0.38 }),
        );
        sea.rotation.x = -Math.PI / 2;
        sea.position.y = built.water;
        sea.receiveShadow = true;
        built.root.add(sea);
      }
      scene.add(new HemisphereLight(LIGHT.hemi.sky, LIGHT.hemi.ground, LIGHT.hemi.intensity));
      const sun = new DirectionalLight(LIGHT.sun.colour, LIGHT.sun.intensity);
      const [ox, oy, oz] = LIGHT.sun.offset;
      sun.position.set(tx + ox, oy, tz + oz);
      sun.target.position.set(tx, ty, tz);
      scene.add(sun.target);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const e = built.span * 1.4;
      Object.assign(sun.shadow.camera, {
        left: -e,
        right: e,
        top: e,
        bottom: -e,
        near: 1,
        far: 140,
      });
      sun.shadow.bias = LIGHT.shadow.bias;
      sun.shadow.normalBias = LIGHT.shadow.normalBias;
      sun.shadow.radius = LIGHT.shadow.radius;
      scene.add(sun);
      const fill = new DirectionalLight(LIGHT.fill.colour, LIGHT.fill.intensity);
      fill.position.set(...LIGHT.fill.position);
      scene.add(fill);
      const vh = built.span;
      const asp = W / H;
      const cam = new OrthographicCamera(
        (-vh * asp) / 2,
        (vh * asp) / 2,
        vh / 2,
        -vh / 2,
        0.1,
        400,
      );
      const d = 120;
      const el = 0.6;
      cam.position.set(
        tx + Math.sin(CAMERA.azimuth) * Math.cos(el) * d,
        ty + Math.sin(el) * d,
        tz + Math.cos(CAMERA.azimuth) * Math.cos(el) * d,
      );
      cam.lookAt(tx, ty, tz);
      renderer.render(scene, cam);
      url = renderer.domElement.toDataURL("image/jpeg", 0.86);
    } catch {
      failed = true;
    } finally {
      if (built) disposeBuilt(built.root);
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }
  if (kept.size > 16) kept.delete(kept.keys().next().value ?? "");
  kept.set(key, url);
  return url;
}
