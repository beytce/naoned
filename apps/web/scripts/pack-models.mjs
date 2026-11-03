// The 3D map's KayKit models packed into one file (docs/plateau-reprise.md § 7, step 6): the files
// of art-src/models/kaykit, copied as KayKit made them, each put under a node named by its key
// (src/empire/map3d/models.json), without their atlas, in public/models/kaykit.glb. One request
// instead of forty, the same shapes and UVs (the game recolours them, recolor.ts), welded and
// quantized (KHR_mesh_quantization, read by three.js as it is).
//   node apps/web/scripts/pack-models.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import {
  dedup,
  mergeDocuments,
  prune,
  quantize,
  unpartition,
  weld,
} from "@gltf-transform/functions";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");
const src = join(web, "art-src", "models", "kaykit");
const models = JSON.parse(readFileSync(join(web, "src", "empire", "map3d", "models.json"), "utf8"));
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const out = new Document();
const scene = out.createScene("kaykit");
for (const [key, file] of Object.entries(models)) {
  const doc = await io.read(join(src, `${file}.gltf`));
  const map = mergeDocuments(out, doc);
  const holder = out.createNode(key);
  for (const s of doc.getRoot().listScenes()) {
    const merged = map.get(s);
    for (const n of merged.listChildren()) holder.addChild(n);
    merged.dispose();
  }
  scene.addChild(holder);
}
out.getRoot().setDefaultScene(scene);
// No atlas: the game paints each vertex from its UV (recolor.ts) and never reads the image (nor
// could it: the game's CSP refuses the blob: a texture inside a .glb is loaded from).
for (const m of out.getRoot().listMaterials()) m.setBaseColorTexture(null);
for (const t of out.getRoot().listTextures()) t.dispose();
// Welded and quantized (positions to 14 bits, UVs to 16: the atlas's swatches stay exact); these
// models stand still, no skin to break (the donkey keeps its floats, public/models/README.md).
await out.transform(
  unpartition(),
  dedup(),
  weld(),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 16 }),
  // The UVs stay, though no texture reads them: they say each vertex's colour.
  prune({ keepAttributes: true }),
);
await io.write(join(web, "public", "models", "kaykit.glb"), out);
console.log(`packed ${Object.keys(models).length} models`);
