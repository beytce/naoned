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
