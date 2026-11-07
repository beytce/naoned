import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "../src/i18n.en.js";
import { fr } from "../src/i18n.js";

// Every refusal of the empire's engine says something on the screen (the players' audit of 7
// November 2026, P0-11): never the « unknown error » of a code without its words.
const root = fileURLToPath(new URL("../../../packages/engine/src/", import.meta.url));
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : [],
  );
const sources = [...files(join(root, "empire")), join(root, "tx.ts"), join(root, "commands.ts")];
const codes = [
  ...new Set(
    sources.flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/fail\(\s*"([a-z_]+)"/g)].map((m) => m[1] as string),
    ),
  ),
];

describe("the refusals' words", () => {
  it("has a French and an English sentence for every refusal of the empire", () => {
    expect(codes.length).toBeGreaterThan(50);
    const said = (d: typeof fr) => (c: string) => c in d.empire.errors || c in d.game.errors;
    expect(codes.filter((c) => !said(fr)(c))).toEqual([]);
    expect(codes.filter((c) => !said(en)(c))).toEqual([]);
  });
});
