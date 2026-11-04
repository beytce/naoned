import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import models from "../src/empire/map3d/models.json";

/**
 * The models served, checked at each run of the tests (audit of 4 November 2026, Blender M10):
 * a model the code names that the pack lost no longer becomes a crate in silence, a budget passed
 * is said, and nothing loads a texture (the CSP refuses the blob a .glb's image is read from).
 */
const MODELS = join(__dirname, "..", "public", "models");
const SRC = join(__dirname, "..", "src");

interface Gltf {
  nodes: { name?: string; mesh?: number }[];
  meshes: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number }[];
  animations?: { name?: string }[];
  images?: unknown[];
  textures?: unknown[];
  extensionsRequired?: string[];
}

function read(file: string): Gltf {
  const b = readFileSync(join(MODELS, file));
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8")) as Gltf;
}

/** The triangles under a node and its children, from the accessors' counts. */
function trianglesOf(g: Gltf, mesh: number): number {
  return (g.meshes[mesh]?.primitives ?? []).reduce((sum, p) => {
    const n =
      p.indices !== undefined
        ? g.accessors[p.indices]?.count
        : g.accessors[p.attributes.POSITION ?? -1]?.count;
    return sum + Math.floor((n ?? 0) / 3);
  }, 0);
}

describe("the models served (public/models)", () => {
  const kit = read("kaykit.glb");
  const minis = read("minis.glb");
  const donkey = read("quaternius/donkey.glb");

  it("hold every model the board names (models.json)", () => {
    const names = new Set(kit.nodes.map((n) => n.name));
    expect(Object.keys(models).filter((k) => !names.has(k))).toEqual([]);
  });

  it("hold every animation the figurines play (roster.ts, figure.tsx)", () => {
    const code = readFileSync(join(SRC, "empire", "map3d", "roster.ts"), "utf8");
    const clips = new Set((minis.animations ?? []).map((a) => a.name));
    const asked = [...code.matchAll(/(?:idle|move): "([\w-]+)"/g)].map((m) => m[1]);
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.filter((c) => !clips.has(c))).toEqual([]);
  });

  it("load no texture", () => {
    for (const g of [kit, minis, donkey]) {
      expect(g.images ?? []).toEqual([]);
      expect(g.textures ?? []).toEqual([]);
    }
  });

  it("keep each board model under its budget of triangles", () => {
    const over = kit.nodes
      .filter((n) => n.mesh !== undefined)
      .map((n) => ({ name: n.name, tris: trianglesOf(kit, n.mesh as number) }))
      .filter((x) => x.tris > 4_000);
    expect(over).toEqual([]);
  });

  it("are packed with the extensions three.js decodes", () => {
    const known = new Set(["KHR_mesh_quantization", "EXT_meshopt_compression"]);
    for (const g of [kit, minis, donkey])
      expect((g.extensionsRequired ?? []).filter((e) => !known.has(e))).toEqual([]);
  });
});
