// The figurines' file made lighter without changing what is seen (audit of 4 November, Blender M1
// and M3, 3D M5): the animation channels that only hold a bone at its rest are dropped (Blender's
// export keeps one for every bone of every clip), the normals, colours and skin weights stored on
// 8 bits (KHR_mesh_quantization, read by three.js without WebAssembly), the rest deduplicated.
// The positions stay in floats: quantized, they broke the skinning (public/models/README.md).
//   node apps/web/scripts/slim-minis.mjs            (public/models/minis.glb, in place)
// Also run at the end of pack-minis.mjs.
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, prune, quantize } from "@gltf-transform/functions";

const EPS = 1e-5;

const same = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= EPS);

/** The rest value of a node's path (translation, rotation, scale). */
function restOf(node, path) {
  if (path === "translation") return node.getTranslation();
  if (path === "rotation") return node.getRotation();
  if (path === "scale") return node.getScale();
  return null;
}

/** Drops the channels whose every key is the node's rest: they move nothing. */
export function dropRestChannels(doc) {
  let dropped = 0;
  for (const anim of doc.getRoot().listAnimations()) {
    for (const channel of anim.listChannels()) {
      const node = channel.getTargetNode();
      const path = channel.getTargetPath();
      const sampler = channel.getSampler();
      const out = sampler?.getOutput();
      const rest = node && path ? restOf(node, path) : null;
      if (!out || !rest || sampler.getInterpolation() === "CUBICSPLINE") continue;
      const n = out.getCount();
      const el = [];
      let still = true;
      for (let i = 0; i < n && still; i++) still = same(out.getElement(i, el), rest);
      if (!still) continue;
      channel.dispose();
      dropped++;
    }
    for (const sampler of anim.listSamplers())
      if (sampler.listParents().every((p) => p === anim)) sampler.dispose();
  }
  return dropped;
}

/** All of it, on a document. */
export async function slimMinis(doc) {
  const dropped = dropRestChannels(doc);
  await doc.transform(
    quantize({
      pattern: /^(NORMAL|COLOR_0|WEIGHTS_0)$/,
      quantizeNormal: 8,
      quantizeColor: 8,
      quantizeWeight: 8,
    }),
    dedup(),
    prune({ keepAttributes: true }),
  );
  // Normals on 8 bits are only valid glTF with the extension declared (three.js reads it natively).
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  return dropped;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models", "minis.glb");
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const before = statSync(file).size;
  const doc = await io.read(file);
  const dropped = await slimMinis(doc);
  await io.write(file, doc);
  const after = statSync(file).size;
  console.log(
    `minis.glb: ${dropped} still channels dropped, ${(before / 1048576).toFixed(2)} → ${(after / 1048576).toFixed(2)} MB`,
  );
}
