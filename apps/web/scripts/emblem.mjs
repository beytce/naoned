// Draws Fondaco's emblem, the winged lion of Saint Mark rearing with a ducat struck with a galley,
// and writes it where the game uses it:
//   public/icons/icon.svg and public/favicon.svg (the app icon, on its walnut tile),
//   src/art/emblemArt.tsx (the same drawing for React, in colour or as a one-colour seal).
// Run: node apps/web/scripts/emblem.mjs, then the icons (scripts/icons.mjs) and `pnpm format`.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");

const f = (n) => +n.toFixed(2);

/** One row of a wing (local: root at 0,0, opening to the left), as a path. */
const ROW =
  "M0 0 C-6 -20 -20 -36 -34 -42 Q-44 -42 -47 -36 L-34 -28 Q-46 -27 -50 -23 L-36 -17 Q-46 -15 -48 -11 L-33 -7 Q-40 -4 -42 0 L-26 2 Q-30 6 -31 10 L-14 9 Q-6 9 0 6 Z";
const LINES = "M-34 -28 L-22 -24 M-36 -17 L-22 -14 M-33 -7 L-20 -6 M-26 2 L-14 1";

/** A raised wing: three rows of feathers, the longest behind; dir -1 opens to the left. */
function wing(x, y, dir, scale, rot, fills) {
  const rows = [1, 0.72, 0.46];
  return rows
    .map((k, i) => {
      const s = scale * k;
      const tf = `translate(${x} ${y}) rotate(${rot}) scale(${f(-dir * s)} ${f(s)})`;
      const w = f(1.8 / s);
      const lines = i < 2 ? `<path d="${LINES}" fill="none" stroke-width="${f(1 / s)}"/>` : "";
      return `<g transform="${tf}" stroke-width="${w}"><path d="${ROW}" fill="${fills[i]}"/>${lines}</g>`;
    })
    .join("\n");
}

function lobes(cx, cy, r, amp, n, sweep) {
  const step = (Math.PI * 2) / n;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = i * step;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) {
      d += `M${f(x)} ${f(y)}`;
      continue;
    }
    const am = a - step / 2 + sweep;
    const tx = cx + Math.cos(am) * (r + amp);
    const ty = cy + Math.sin(am) * (r + amp);
    const pa = a - step;
    d += ` Q${f(cx + Math.cos(pa + step * 0.1) * (r + amp * 0.75))} ${f(cy + Math.sin(pa + step * 0.1) * (r + amp * 0.75))} ${f(tx)} ${f(ty)}`;
    d += ` Q${f(cx + Math.cos(a - step * 0.15) * (r + amp * 0.3))} ${f(cy + Math.sin(a - step * 0.15) * (r + amp * 0.3))} ${f(x)} ${f(y)}`;
  }
  return `${d} Z`;
}

function art(C) {
  return `
<g transform="translate(6 8) scale(0.9)" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
  ${wing(70, 46, 1, 0.84, -22, [C.far1, C.far2, C.far3])}
  <path d="M42 86 C32 94 20 94 17 84 C15 77 18 71 23 70" fill="none" stroke-width="5.6"/>
  <path d="M42 86 C32 94 20 94 17 84 C15 77 18 71 23 70" fill="none" stroke="${C.fur}" stroke-width="2.2"/>
  <path d="${lobes(23, 67, 2.6, 3, 7, 0.6)}" fill="${C.mane}"/>
  <path d="M46 92 C42 96 38 99 35 101 C32 102 30 105 31 107 H42 C43 104 45 101 50 97 Z" fill="${C.furShade}"/>
  <path d="M60 50 C70 47 79 51 82 58 C85 66 81 74 74 79 C68 83 64 84 60 86 C62 92 66 98 68 102 L70 104 C72 106 70 108 67 108 L56 108 C54 106 55 103 57 101 C52 98 46 96 43 92 C38 86 38 78 42 72 C46 62 52 53 60 50 Z" fill="${C.fur}"/>
  <path d="M82 60 C85 68 81 74 74 79 C68 83 64 84 60 86 C62 81 67 77 72 74 C77 70 80 66 82 60 Z" fill="${C.furShade}" stroke="none" opacity="0.55"/>
  <path d="M57 101 C52 94 50 86 56 80" fill="none" stroke-width="1.3"/>
  ${wing(58, 53, -1, 1.0, 20, [C.near1, C.near2, C.near3])}
  <g transform="translate(-1 -3)">
  <circle cx="64" cy="91" r="15" fill="${C.glow}" stroke="none"/>
  <circle cx="64" cy="91" r="11" fill="${C.coin}"/>
  <circle cx="64" cy="91" r="8.3" fill="none" stroke="${C.goldDeep}" stroke-width="1.1"/>
  <g stroke="none" fill="${C.ink}">
    <path d="M58 92.3 H70 L68.2 95.6 H59.8 Z"/>
    <rect x="63.4" y="84" width="1.2" height="8.6"/>
    <path d="M64.6 85 L69 91.6 H64.6 Z"/>
    <path d="M63.4 86 L59.4 91.6 H63.4 Z"/>
    <path d="M64 84 V81.6 L66.6 82.7 Z"/>
  </g>
  <path d="M57.6 97.4 Q60.8 96.2 64 97.4 T70.4 97.4" fill="none" stroke="${C.sea}" stroke-width="1.2"/>
  </g>
  <path d="M76 66 C79 72 80 80 76 86 C78 89 83 88 84 83 C86 77 84 69 80 63 Z" fill="${C.fur}"/>
  <path d="M76 58 C84 56 92 52 98 49 C102 47 106 49 105 53 C104 57 100 58 96 59 C90 61 84 64 80 66 Z" fill="${C.fur}"/>
  <path d="M100.5 50 L101 54 M103 50.6 L102.6 54.6" fill="none" stroke-width="0.9"/>
  <path d="${lobes(73, 38, 12.5, 6, 13, 0.4)}" fill="${C.mane}"/>
  <path d="M71 29 C77 25 84 28 87 33 C88.5 36 90.5 38.5 92 40.5 C93 43.5 91 46.5 88 47.2 C84 48.6 80 49.4 76.5 47.6 C71 45.4 68 40 68 35 C68 32.6 69.2 30.4 71 29 Z" fill="${C.fur}"/>
  <path d="M71.5 30 C70.5 25.5 73 22.5 76 23.4 C77 25.4 76 28.4 74 30.4 Z" fill="${C.fur}"/>
  <path d="M92.2 40.8 C93.2 42.4 92.2 44 90.2 44 C89.2 43.4 88.8 42 89.6 41 Z" fill="${C.ink}" stroke-width="0.9"/>
  <path d="M88.4 46.3 C86.4 47.3 84.4 47.3 82.9 46.4" fill="none" stroke-width="1.1"/>
  <path d="M79.6 35.2 C81.3 33.9 83.6 33.9 85 35.3 C83.6 36.3 81.3 36.5 79.6 35.2 Z" fill="${C.ink}" stroke-width="0.7"/>
  <path d="M78.8 32.4 C81 31 84 31.2 85.8 32.8" fill="none" stroke-width="1"/>
</g>`;
}

/** The emblem's colours: the walnut and ducat of the default palette. */
const COLOURS = {
  ink: "#1E1611",
  fur: "#F2DDB0",
  furShade: "#D2A86C",
  mane: "#5C3521",
  far1: "#CDAE78",
  far2: "#D9BC86",
  far3: "#E3CA98",
  near1: "#E9D3A4",
  near2: "#F2DFB6",
  near3: "#F8EBCD",
  goldDeep: "#BA8830",
  sea: "#7DB596",
  glow: "url(#glow)",
  coin: "url(#coin)",
};

const DEFS = `<radialGradient id="bg" cx="0.5" cy="0.38" r="0.78"><stop offset="0" stop-color="#6A4B32"/><stop offset="0.55" stop-color="#3A2A1E"/><stop offset="1" stop-color="#1E1611"/></radialGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#F6D896" stop-opacity="0.7"/><stop offset="1" stop-color="#F6D896" stop-opacity="0"/></radialGradient>
<linearGradient id="coin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6CE6E"/><stop offset="1" stop-color="#D99A32"/></linearGradient>`;

const tile = (rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">\n<defs>${DEFS}</defs>\n<rect width="120" height="120"${rx ? ` rx="${rx}"` : ""} fill="url(#bg)"/>${art(COLOURS)}\n</svg>\n`;
writeFileSync(join(web, "public/icons/icon.svg"), tile(0));
writeFileSync(join(web, "public/favicon.svg"), tile(26));

// React: every colour is a prop, so the same drawing serves the coloured emblem and the seal.
const keys = Object.fromEntries(Object.keys(COLOURS).map((k) => [k, `@@${k}@@`]));
const jsx = art(keys)
  .replace(/ ([a-z]+)-([a-z]+)=/g, (_, a, b) => ` ${a}${b[0].toUpperCase()}${b.slice(1)}=`)
  .replace(/="@@(\w+)@@"/g, "={c.$1}")
  .replace(/\\n/g, "\n");
writeFileSync(
  join(web, "src/art/emblemArt.tsx"),
  `// Generated by scripts/emblem.mjs: change the drawing there.

/** The colours of the emblem's parts (a seal gives white parts and black lines, for a mask). */
export type EmblemColours = Record<${Object.keys(COLOURS)
    .map((k) => `"${k}"`)
    .join(" | ")}, string>;

export const EMBLEM_COLOURS: EmblemColours = ${JSON.stringify(COLOURS, null, 2)};

/** The winged lion on a 120 grid, without its tile. */
export function EmblemArt({ c }: { c: EmblemColours }) {
  return (${jsx}
  );
}
`,
);
console.log("emblem written");
