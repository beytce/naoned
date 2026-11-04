// The Porta's figurines packed into one file (docs/plan-porta-3d.md, step 0): KayKit's
// « Adventurers » characters (CC0) and Quaternius's horse (CC0), from art-src/models (not kept in
// the repository, too heavy: fetched as public/models/README.md says), into public/models/minis.glb.
//   node apps/web/scripts/pack-minis.mjs
// The characters' texture becomes their vertices' colours (the game's CSP refuses the blob: a
// texture inside a .glb is loaded from), each character under a node of its name; a dozen of
// their animations kept, once (they share one rig), the horse's renamed « Horse_… ».
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { Document, NodeIO } from "@gltf-transform/core";
import { dedup, mergeDocuments, prune, resample } from "@gltf-transform/functions";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");
const SRC = join(web, "art-src", "models");
const CHARACTERS = ["Knight", "Barbarian", "Mage", "Rogue", "Rogue_Hooded"];
/** The animations the battle plays (the rig's own names). */
const KEEP = new Set([
  "Idle",
  "Walking_A",
  "Running_A",
  "1H_Melee_Attack_Chop",
  "2H_Melee_Attack_Chop",
  "1H_Ranged_Shoot",
  "2H_Ranged_Shoot",
  "Spellcast_Shoot",
  "Block",
  "Hit_A",
  "Death_A",
  "Death_A_Pose",
  "Cheer",
  "Sit_Chair_Idle",
]);
const HORSE_KEEP = new Set(["Idle", "Walk", "Gallop", "Death"]);

/** A PNG decoded (8 bits, RGB or RGBA, not interlaced): its width, height, RGBA bytes. */
function decodePng(bytes) {
  const b = Buffer.from(bytes);
  let i = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    const tag = b.toString("ascii", i + 4, i + 8);
    const data = b.subarray(i + 8, i + 8 + len);
    if (tag === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("png: 8 bits, not interlaced only");
      type = data[9];
    } else if (tag === "IDAT") idat.push(data);
    i += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`png: colour type ${type}`);
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4);
  const stride = w * bpp;
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const up = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      line[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      out[(y * w + x) * 4] = line[x * bpp];
      out[(y * w + x) * 4 + 1] = line[x * bpp + 1];
      out[(y * w + x) * 4 + 2] = line[x * bpp + 2];
      out[(y * w + x) * 4 + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    line.copy(prev);
  }
  return { w, h, rgba: out };
}

/** sRGB (0–255) to linear, as three.js wants a vertex's colour. */
const linear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Each textured primitive's texture baked into its vertices' colours, the texture gone. */
function bake(doc) {
  // Each material's texture decoded first (a material is shared by many primitives).
  const images = new Map();
  for (const mat of doc.getRoot().listMaterials()) {
    const tex = mat.getBaseColorTexture();
    if (tex) images.set(mat, decodePng(tex.getImage()));
  }
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const img = mat ? images.get(mat) : undefined;
      const uv = prim.getAttribute("TEXCOORD_0");
      if (!mat || !img || !uv) continue;
      const n = uv.getCount();
      const col = new Float32Array(n * 3);
      const t = [0, 0];
      for (let k = 0; k < n; k++) {
        uv.getElement(k, t);
        const x = Math.min(img.w - 1, Math.max(0, Math.floor((t[0] - Math.floor(t[0])) * img.w)));
        const y = Math.min(img.h - 1, Math.max(0, Math.floor((t[1] - Math.floor(t[1])) * img.h)));
        const p = (y * img.w + x) * 4;
        col[k * 3] = linear(img.rgba[p]);
        col[k * 3 + 1] = linear(img.rgba[p + 1]);
        col[k * 3 + 2] = linear(img.rgba[p + 2]);
      }
      prim.setAttribute(
        "COLOR_0",
        doc.createAccessor().setType("VEC3").setArray(col).setBuffer(uv.getBuffer()),
      );
      prim.setAttribute("TEXCOORD_0", null);
    }
  for (const mat of images.keys()) mat.setBaseColorTexture(null);
  for (const t of doc.getRoot().listTextures()) t.dispose();
}

/** An animation gone with its channels and samplers (else they stay, orphans, in the file). */
function drop(a) {
  for (const c of a.listChannels()) c.dispose();
  for (const s of a.listSamplers()) s.dispose();
  a.dispose();
}

const io = new NodeIO();
const out = new Document();
out.createBuffer();
const scene = out.createScene("minis");
for (const [i, name] of CHARACTERS.entries()) {
  const doc = await io.read(join(SRC, "kaykit-adventurers", `${name}.glb`));
  bake(doc);
  // The rig's animations kept once (with the first), the others' dropped.
  for (const a of doc.getRoot().listAnimations()) if (i > 0 || !KEEP.has(a.getName())) drop(a);
  await doc.transform(prune({ keepAttributes: true }));
  for (const b of doc.getRoot().listBuffers().slice(0)) b.dispose();
  doc.createBuffer();
  for (const acc of doc.getRoot().listAccessors()) acc.setBuffer(doc.getRoot().listBuffers()[0]);
  const map = mergeDocuments(out, doc);
  const holder = out.createNode(name);
  for (const s of doc.getRoot().listScenes()) {
    const merged = map.get(s);
    for (const n of merged.listChildren()) holder.addChild(n);
    merged.dispose();
  }
  scene.addChild(holder);
}
// The horse: its own animations, renamed (« Idle » is the riders' too).
{
  const doc = await io.read(join(SRC, "quaternius", "Horse.gltf"));
  for (const a of doc.getRoot().listAnimations()) {
    const short = a.getName().split("|").pop() ?? a.getName();
    if (!HORSE_KEEP.has(short)) drop(a);
    else a.setName(`Horse_${short}`);
  }
  await doc.transform(prune({ keepAttributes: true }));
  for (const b of doc.getRoot().listBuffers().slice(1)) b.dispose();
  for (const acc of doc.getRoot().listAccessors()) acc.setBuffer(doc.getRoot().listBuffers()[0]);
  const map = mergeDocuments(out, doc);
  const holder = out.createNode("Horse");
  for (const s of doc.getRoot().listScenes()) {
    const merged = map.get(s);
    for (const n of merged.listChildren()) holder.addChild(n);
    merged.dispose();
  }
  scene.addChild(holder);
}
// One buffer for the file.
const [first, ...rest] = out.getRoot().listBuffers();
for (const acc of out.getRoot().listAccessors()) acc.setBuffer(first);
for (const b of rest) b.dispose();
out.getRoot().setDefaultScene(scene);
await out.transform(resample(), dedup(), prune({ keepAttributes: true }));
await io.write(join(web, "public", "models", "minis.glb"), out);
const anims = out
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
console.log(
  `packed ${CHARACTERS.length} characters and the horse; animations: ${anims.join(", ")}`,
);
void readFileSync;
