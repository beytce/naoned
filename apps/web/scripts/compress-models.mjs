// The models served compressed with meshopt (EXT_meshopt_compression: audit of 4 November 2026,
// 3D M5, the owner's decision): three to five times lighter to fetch, decoded in the browser by
// three.js's MeshoptDecoder (a WebAssembly module: the CSP allows 'wasm-unsafe-eval' for it).
// Run after each pack (pack-models.mjs, pack-minis.mjs):
//   node apps/web/scripts/compress-models.mjs
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const models = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models");
const FILES = ["kaykit.glb", "minis.glb", "quaternius/donkey.glb"];

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

for (const name of FILES) {
  const file = join(models, name);
  const before = statSync(file).size;
  const doc = await io.read(file);
  // The positions of a skinned figure stay as they are (only the buffers are packed, losslessly).
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(file, doc);
  const after = statSync(file).size;
  console.log(`${name}: ${(before / 1024).toFixed(0)} → ${(after / 1024).toFixed(0)} KB`);
}
