import * as THREE from "three";

/**
 * The domain's materials: the palette, warmed, on soft procedural textures (grass, plaster, roof
 * tiles, planks, bricks, paving) drawn once on canvases. One material per look, shared by all.
 */

type Painter = (g: CanvasRenderingContext2D, s: number, rnd: () => number) => void;

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function texture(paint: Painter, repeat: number, size = 256, seed = 7): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  paint(g, size, seeded(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

const shadeHex = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  if (k >= 0) c.lerp(new THREE.Color("#ffffff"), k);
  else c.multiplyScalar(1 + k);
  return `#${c.getHexString()}`;
};

/** Speckles of lighter and darker tone over a base: grass, plaster, dirt. */
const speckled =
  (base: string, spread: number, blades = false): Painter =>
  (g, s, rnd) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < s * 6; i++) {
      const k = (rnd() - 0.5) * spread;
      g.fillStyle = shadeHex(base, k);
      g.globalAlpha = 0.35 + rnd() * 0.4;
      const x = rnd() * s;
      const y = rnd() * s;
      if (blades) {
        g.fillRect(x, y, 1.2, 3 + rnd() * 4);
      } else {
        g.beginPath();
        g.arc(x, y, 1 + rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  };

/** Rows of rounded roof tiles, each row a little shaded at its lower edge. */
const tiles =
  (base: string): Painter =>
  (g, s, rnd) => {
    g.fillStyle = shadeHex(base, -0.25);
    g.fillRect(0, 0, s, s);
    const rows = 8;
    const cols = 8;
    const h = s / rows;
    const w = s / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c <= cols; c++) {
        const x = c * w + (r % 2 ? w / 2 : 0);
        const y = r * h;
        const grad = g.createLinearGradient(0, y, 0, y + h);
        const tone = shadeHex(base, (rnd() - 0.5) * 0.18);
        grad.addColorStop(0, shadeHex(tone, 0.12));
        grad.addColorStop(1, shadeHex(tone, -0.18));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x + 2, y);
        g.lineTo(x + w - 2, y);
        g.lineTo(x + w - 2, y + h * 0.75);
        g.quadraticCurveTo(x + w / 2, y + h * 1.05, x + 2, y + h * 0.75);
        g.closePath();
        g.fill();
      }
    }
  };

/** Boards with their grain and joints. */
const planks =
  (base: string): Painter =>
  (g, s, rnd) => {
    const n = 6;
    const h = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = shadeHex(base, (rnd() - 0.5) * 0.2);
      g.fillRect(0, i * h, s, h);
      g.strokeStyle = shadeHex(base, -0.3);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, i * h + 1);
      g.lineTo(s, i * h + 1);
      g.stroke();
      g.globalAlpha = 0.25;
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        const y = i * h + rnd() * h;
        g.moveTo(0, y);
        g.bezierCurveTo(s * 0.3, y + 2, s * 0.6, y - 2, s, y + 1);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  };

/** Bricks in running bond, with mortar. */
const bricks =
  (base: string): Painter =>
  (g, s, rnd) => {
    g.fillStyle = "#D8CBB5";
    g.fillRect(0, 0, s, s);
    const rows = 10;
    const h = s / rows;
    const w = s / 5;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c <= 5; c++) {
        g.fillStyle = shadeHex(base, (rnd() - 0.5) * 0.25);
        g.fillRect(c * w + (r % 2 ? w / 2 : 0) + 1.5, r * h + 1.5, w - 3, h - 3);
      }
    }
  };

/** Paving stones, irregular, in grey-beige. */
const paving =
  (base: string): Painter =>
  (g, s, rnd) => {
    g.fillStyle = shadeHex(base, -0.3);
    g.fillRect(0, 0, s, s);
    const n = 6;
    const w = s / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        g.fillStyle = shadeHex(base, (rnd() - 0.5) * 0.18);
        const x = c * w + (r % 2 ? w / 3 : 0);
        g.beginPath();
        g.roundRect(x + 2, r * w + 2, w - 4, w - 4, 5);
        g.fill();
      }
    }
  };

export interface Materials {
  [name: string]: THREE.Material;
}

const cache = new Map<string, THREE.Material>();

function std(name: string, make: () => THREE.MeshStandardMaterialParameters): THREE.Material {
  const found = cache.get(name);
  if (found) return found;
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...make() });
  cache.set(name, m);
  return m;
}

/** A material by name: textured looks, or a plain colour (`#rrggbb`). */
export function mat(name: string): THREE.Material {
  switch (name) {
    case "grass":
      return std(name, () => ({ map: texture(speckled("#86A04E", 0.35, true), 14, 256, 3) }));
    case "grass-lagoon":
      return std(name, () => ({ map: texture(speckled("#8EA66A", 0.3, true), 14, 256, 5) }));
    case "grass-alps":
      return std(name, () => ({ map: texture(speckled("#6E9C5E", 0.35, true), 14, 256, 9) }));
    case "path":
      return std(name, () => ({ map: texture(speckled("#D9C49B", 0.2), 3, 128, 11) }));
    case "paving":
      return std(name, () => ({ map: texture(paving("#C9BB9E"), 2, 256, 13) }));
    case "plaster":
      return std(name, () => ({ map: texture(speckled("#F2E6CC", 0.08), 1, 128, 17) }));
    case "plaster-warm":
      return std(name, () => ({ map: texture(speckled("#EBD3A8", 0.08), 1, 128, 19) }));
    case "barn":
      return std(name, () => ({ map: texture(planks("#B4473A"), 1, 256, 23) }));
    case "wood":
      return std(name, () => ({ map: texture(planks("#9A6234"), 1, 256, 29) }));
    case "wood-light":
      return std(name, () => ({ map: texture(planks("#C98E52"), 1, 256, 31) }));
    case "brick":
      return std(name, () => ({ map: texture(bricks("#B5523A"), 1, 256, 37) }));
    case "roof":
      return std(name, () => ({ map: texture(tiles("#C8693F"), 1, 256, 41) }));
    case "roof-dark":
      return std(name, () => ({ map: texture(tiles("#6B3A2E"), 1, 256, 43) }));
    case "roof-gold":
      return std(name, () => ({
        map: texture(tiles("#E0AD4B"), 1, 256, 47),
        metalness: 0.35,
        roughness: 0.45,
      }));
    case "roof-slate":
      return std(name, () => ({ map: texture(tiles("#5B6B73"), 1, 256, 53) }));
    case "stone":
      return std(name, () => ({ map: texture(speckled("#CFC6B0", 0.14), 1, 128, 59) }));
    case "dirt":
      return std(name, () => ({ map: texture(speckled("#8A5A38", 0.25), 2, 128, 61) }));
    case "water":
      return std(name, () => ({ color: "#4F9C93", roughness: 0.2, metalness: 0.1 }));
    case "window":
      return std(name, () => ({ color: "#3B2C24", roughness: 0.5 }));
    case "window-lit":
      return std(name, () => ({ color: "#FFD27A", emissive: "#FFB84D", emissiveIntensity: 1.4 }));
    case "glow":
      return std(name, () => ({ color: "#FFB24A", emissive: "#FF8A2A", emissiveIntensity: 2 }));
    case "gold":
      return std(name, () => ({ color: "#E0AD4B", metalness: 0.5, roughness: 0.35 }));
    case "shadow":
      return (
        cache.get(name) ??
        (() => {
          const m = new THREE.MeshBasicMaterial({
            color: "#000000",
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            map: blobTexture(),
          });
          cache.set(name, m);
          return m;
        })()
      );
    default:
      return std(name, () => ({ color: name }));
  }
}

let blob: THREE.CanvasTexture | null = null;

/** A soft round shadow: contact shadows under every object. */
function blobTexture(): THREE.CanvasTexture {
  if (blob) return blob;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blob = new THREE.CanvasTexture(c);
  return blob;
}

/** Releases every material and texture (when the scene goes). */
export function disposeMaterials(): void {
  for (const m of cache.values()) {
    const map = (m as THREE.MeshStandardMaterial).map;
    map?.dispose();
    m.dispose();
  }
  cache.clear();
  blob?.dispose();
  blob = null;
}
