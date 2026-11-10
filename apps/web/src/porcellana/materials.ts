/**
 * Porcellana's materials: one cache by tone, the accent shared (changing it updates a material,
 * never rebuilds a scene), the ink, the glow of a working kiln. A `Palette` per scene: the lands
 * of Rome take theirs in biscuit (D5).
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ACCENTS, BISCUIT, COL, ROUGH, type Tone } from "./tokens.js";

export interface Palette {
  /** The material of a tone (flat-shaded for the facetted: hip roofs, spires, octagons). */
  m(tone: Tone, flat?: boolean): MeshStandardMaterial;
  accent: MeshStandardMaterial;
  /** The accent on thin, two-sided things: a flag, a sail. */
  accentCloth: MeshStandardMaterial;
  ink: MeshStandardMaterial;
  /** What glows (a kiln's mouth): the accent, unlit, outside the tone mapping. */
  glow: MeshBasicMaterial;
  /** The accent's colour now. */
  accentColour: Color;
  setAccent(hex: string): void;
  /** The materials of the world's own tones (not the accent, the ink, the ground or the water). */
  tones(): MeshStandardMaterial[];
}

/**
 * The water lives (docs/plan-carte-vivante.md, lot 4): slow ripples cross the lagoon, two swells at
 * an angle that lighten and darken it a touch and tilt its glaze. The scene gives the time
 * (`material.userData.time.value`, seconds); left at 0, the water lies still as before.
 */
export function ripple(mat: MeshStandardMaterial): void {
  const time = { value: 0 };
  mat.userData.time = time;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRipple;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRipple = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nvarying vec3 vRipple;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float swellA = sin(vRipple.x * 0.9 + vRipple.z * 0.35 + uTime * 0.55);
        float swellB = sin(vRipple.x * -0.4 + vRipple.z * 1.15 + uTime * 0.4 + 1.7);
        float crest = smoothstep(0.55, 1.0, swellA * 0.6 + swellB * 0.6);
        diffuseColor.rgb += vec3(0.05) * crest - vec3(0.018) * (1.0 - swellA * swellB);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = normalize(normal + vec3(swellA, 0.0, swellB) * 0.045);`,
      );
  };
  // One program for every water material so made.
  mat.customProgramCacheKey = () => "porcellana-ripple";
}

export function createPalette(opts: { biscuit?: boolean; accent?: string } = {}): Palette {
  const tone = (t: Tone) => (opts.biscuit ? (BISCUIT[t] ?? COL[t]) : COL[t]);
  const cache = new Map<string, MeshStandardMaterial>();
  const accentColour = new Color(opts.accent ?? ACCENTS.rosso);
  const accent = new MeshStandardMaterial({ color: accentColour, roughness: ROUGH.accent });
  const accentCloth = new MeshStandardMaterial({
    color: accentColour,
    roughness: ROUGH.accent,
    side: DoubleSide,
  });
  const ink = new MeshStandardMaterial({ color: COL.ink, roughness: ROUGH.ink });
  const glow = new MeshBasicMaterial({ color: accentColour, toneMapped: false });
  const m = (t: Tone, flat = false) => {
    const k = `${t}${flat ? ":f" : ""}`;
    let mat = cache.get(k);
    if (!mat) {
      mat = new MeshStandardMaterial({
        color: tone(t),
        roughness: t === "water" ? ROUGH.water : ROUGH.matt,
        metalness: t === "metal" ? 0.25 : 0,
        flatShading: flat,
      });
      mat.name = `porcellana:${k}`;
      if (t === "water") ripple(mat);
      cache.set(k, mat);
    }
    return mat;
  };
  return {
    m,
    accent,
    accentCloth,
    ink,
    glow,
    accentColour,
    setAccent(hex) {
      accentColour.set(hex);
      accent.color.set(hex);
      accentCloth.color.set(hex);
      glow.color.set(hex);
    },
    tones: () =>
      [...cache.entries()]
        .filter(([k]) => !k.startsWith("ground") && !k.startsWith("water"))
        .map(([, v]) => v),
  };
}
